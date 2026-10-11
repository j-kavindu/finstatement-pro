/**
 * FinStatement Pro - Accounting Engine & Rules Unit Tests
 * Can be run in browser test runner or Node/Vitest test environments.
 */

import {
  roundMoney,
  calculateAdjustedTrialBalance,
  generateProfitAndLoss,
  generateBalanceSheet,
  generateChangesInEquity,
  generateIndirectCashFlow,
  calculateFinancialRatios,
} from '../services/accountingEngine';
import {
  SAMPLE_TB_FY2025,
  SAMPLE_ADJUSTMENTS_FY2025,
  SAMPLE_TB_FY2024,
  SAMPLE_SUPPLEMENTARY_FY2025,
  SAMPLE_EQUITY_FY2025,
} from '../services/syntheticData';
import { autoDetectColumnMapping, mapRawRowsToTrialBalance } from '../services/importService';

export interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

export function runAccountingTestSuite(): TestResult[] {
  const results: TestResult[] = [];

  const assert = (name: string, condition: boolean, message: string) => {
    results.push({
      name,
      passed: condition,
      message: condition ? 'PASSED: ' + message : 'FAILED: ' + message,
    });
  };

  // Test 1: Decimal precision arithmetic
  const decimalSum = roundMoney(0.1 + 0.2);
  assert(
    'Decimal Precision Guard',
    decimalSum === 0.3,
    `roundMoney(0.1 + 0.2) equals exactly 0.30 (got ${decimalSum})`
  );

  // Test 2: Unadjusted Trial Balance Balance
  const tbCalculations = calculateAdjustedTrialBalance(SAMPLE_TB_FY2025, SAMPLE_ADJUSTMENTS_FY2025);
  assert(
    'Unadjusted Trial Balance Equality',
    tbCalculations.isUnadjustedBalanced,
    `Unadjusted Debits (${tbCalculations.totalUnadjustedDebit}) equal Credits (${tbCalculations.totalUnadjustedCredit})`
  );

  // Test 3: Adjusted Trial Balance Balance with posted Adjusting Entries
  assert(
    'Adjusted Trial Balance Equality',
    tbCalculations.isAdjustedBalanced,
    `Adjusted Debits (${tbCalculations.totalAdjustedDebit}) equal Credits (${tbCalculations.totalAdjustedCredit}) with difference: ${tbCalculations.adjustedDifference}`
  );

  // Test 4: Adjusting Journal Entries Balanced Invariant
  const unbalancedAdjustment = {
    id: 'test-bad-adj',
    periodId: 'test-p',
    entryNumber: 'AJE-BAD',
    date: '2025-12-31',
    description: 'Bad entry',
    totalDebit: 100,
    totalCredit: 80,
    isBalanced: false,
    status: 'draft' as const,
    createdAt: new Date().toISOString(),
    lines: [],
  };
  const forged = structuredClone(SAMPLE_ADJUSTMENTS_FY2025[0]);
  forged.lines[0].debit += 1;
  let rejected = false;
  try { calculateAdjustedTrialBalance(SAMPLE_TB_FY2025, [forged]); } catch { rejected = true; }
  assert('Journal Equality Rule', rejected, 'Engine rejects an unbalanced posted journal despite forged cached totals');

  // Test 5: Contra Account Reduction
  const pnl = generateProfitAndLoss(tbCalculations.adjustedRows);
  const bs = generateBalanceSheet(tbCalculations.adjustedRows, pnl.netProfit, SAMPLE_EQUITY_FY2025);

  const accumDeprRow = bs.nonCurrentAssets.find((r) => r.label.includes('Accumulated Depreciation'));
  assert(
    'Contra Asset Negative Contribution',
    accumDeprRow !== undefined && accumDeprRow.amount < 0,
    `Accumulated Depreciation has negative balance (${accumDeprRow?.amount}) offsetting gross PP&E`
  );

  // Test 6: Fundamental Accounting Equation (Assets = Liabilities + Equity)
  assert(
    'Fundamental Accounting Equation (A = L + E)',
    bs.isReconciled,
    `Total Assets (${bs.totalAssets}) equal Total Liabilities (${bs.totalLiabilities}) + Total Equity (${bs.totalEquity}). Difference: ${bs.reconciliationDifference}`
  );

  // Test 7: Statement of Changes in Equity Rollforward
  const eq = generateChangesInEquity(SAMPLE_EQUITY_FY2025, pnl.netProfit, bs.equityItems);
  assert(
    'Equity Statement Rollforward',
    eq.closingTotalEquity === bs.totalEquity,
    `Closing Total Equity from Statement of Changes in Equity (${eq.closingTotalEquity}) matches Balance Sheet Total Equity (${bs.totalEquity})`
  );

  // Test 8: Indirect Cash Flow Statement Warning When Comparative Period is Missing
  const singleTBCashFlow = generateIndirectCashFlow(bs, undefined, pnl, undefined);
  assert(
    'Cash Flow Invariant - Single TB Rejection',
    !singleTBCashFlow.isAvailable && typeof singleTBCashFlow.unavailableReason === 'string',
    'Indirect Cash Flow correctly refuses generation from a single closing TB without comparative data'
  );

  // Test 9: Indirect Cash Flow Statement Reconciliation with Comparative Data
  const tb2024 = calculateAdjustedTrialBalance(SAMPLE_TB_FY2024, []);
  const pnl2024 = generateProfitAndLoss(tb2024.adjustedRows);
  const bs2024 = generateBalanceSheet(tb2024.adjustedRows, pnl2024.netProfit);

  const cf = generateIndirectCashFlow(bs, bs2024, pnl, SAMPLE_SUPPLEMENTARY_FY2025);
  assert(
    'Indirect Cash Flow Reconciliation',
    cf.isAvailable && cf.isCashReconciled,
    `Calculated closing cash (${cf.closingCashCalculated}) reconciles with Balance Sheet Cash (${cf.closingCashBalanceSheet}) within tolerance (diff: ${cf.cashReconciliationDifference})`
  );

  // Test 10: Import Auto Column Detection
  const mockHeaders = ['Account Code', 'Description of Account', 'Classification Type', 'Debit Amount', 'Credit Amount'];
  const mapping = autoDetectColumnMapping(mockHeaders);
  assert(
    'Smart Column Header Detection',
    Boolean(mapping.accountCode && mapping.accountName && mapping.classification && mapping.debit && mapping.credit),
    `Auto-detected headers: Code='${mapping.accountCode}', Name='${mapping.accountName}', Dr='${mapping.debit}', Cr='${mapping.credit}'`
  );

  // Test 11: Import Rows Validation & Balance Checking
  const mockRawData = [
    { 'Account Code': '1010', 'Description of Account': 'Cash', 'Classification Type': 'current_asset', 'Debit Amount': '$10,000.00', 'Credit Amount': '0' },
    { 'Account Code': '2010', 'Description of Account': 'Accounts Payable', 'Classification Type': 'current_liability', 'Debit Amount': '0', 'Credit Amount': '$10,000.00' },
  ];
  const importResult = mapRawRowsToTrialBalance(mockRawData, mapping);
  assert(
    'Import Currency Parsing & Balance Check',
    importResult.isBalanced && importResult.rows.length === 2 && importResult.totalDebit === 10000,
    `Parsed 2 rows successfully with cleaned dollar signs, balanced total: ${importResult.totalDebit}`
  );

  // Test 12: Financial Ratios Calculation & Warnings
  const ratios = calculateFinancialRatios(bs, pnl);
  const currentRatio = ratios.find((r) => r.id === 'current-ratio');
  assert(
    'Financial Ratio Engine Validation',
    currentRatio !== undefined && currentRatio.value !== null && currentRatio.value > 0,
    `Current Ratio computed at ${currentRatio?.formattedValue} with benchmark ${currentRatio?.benchmark}`
  );

  return results;
}
