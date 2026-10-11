/**
 * FinStatement Pro - Accounting Calculation Engine
 * High-precision, decimal-safe monetary arithmetic and double-entry validations.
 */

import {
  TrialBalanceRow,
  AdjustingJournalEntry,
  ProfitAndLossStatement,
  BalanceSheetStatement,
  ChangesInEquityStatement,
  CashFlowStatement,
  SupplementaryCashFlowData,
  EquityMovementData,
  RatioItem,
  StatementRow,
} from '../types/accounting';

// Parse decimal strings before rounding; financial inputs are bounded to safe cents.
export function roundMoney(amount: number): number {
  if (!Number.isFinite(amount)) throw new Error('Amount must be finite');
  const sign = amount < 0 ? -1 : 1;
  const cents = Math.round((Math.abs(amount) + Number.EPSILON * Math.abs(amount)) * 100);
  if (!Number.isSafeInteger(cents)) throw new Error('Amount exceeds safe monetary range');
  return sign * cents / 100;
}
export function sumMoney(amounts: number[]): number {
  const cents = amounts.reduce((s, n) => s + Math.round(roundMoney(n) * 100), 0);
  if (!Number.isSafeInteger(cents)) throw new Error('Total exceeds safe monetary range');
  return cents / 100;
}
export function validateTrialBalance(rows: TrialBalanceRow[]): string[] {
  const errors: string[] = []; const codes = new Set<string>(); const ids = new Set<string>();
  const classifications = ['current_asset','non_current_asset','current_liability','non_current_liability','equity','revenue','cogs','operating_expense','depreciation_expense','interest_expense','tax_expense','other_income','other_expense'];
  for (const row of rows) {
    if (!classifications.includes(row.classification)) errors.push('Unknown account classification');
    const code = String(row.accountCode).trim().toLowerCase();
    if (!code || codes.has(code) || ids.has(row.accountId)) errors.push('Missing or duplicate account code / ID');
    codes.add(code); ids.add(row.accountId);
    if (![row.unadjustedDebit,row.unadjustedCredit].every(value=>Number.isFinite(value) && value >= 0) || (row.unadjustedDebit > 0 && row.unadjustedCredit > 0)) errors.push('Invalid trial balance amount');
  }
  return errors;
}

export function validateJournal(entry: AdjustingJournalEntry, rows: TrialBalanceRow[]): string[] {
  const errors: string[] = [];
  if (entry.lines.length < 2) errors.push('At least two journal lines are required');
  for (const line of entry.lines) {
    if (!rows.some(r => r.accountId === line.accountId)) errors.push('Unknown journal account');
    if (!Number.isFinite(line.debit) || !Number.isFinite(line.credit) || line.debit < 0 || line.credit < 0 || (line.debit > 0 && line.credit > 0)) errors.push('Invalid debit or credit');
  }
  if (!errors.length) {
    const dr = sumMoney(entry.lines.map(l => l.debit));
    const cr = sumMoney(entry.lines.map(l => l.credit));
    if (dr <= 0 || dr !== cr) errors.push('Journal must balance with positive totals');
    if (dr !== entry.totalDebit || cr !== entry.totalCredit) errors.push('Journal totals disagree with lines');
  }
  return errors;
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  const rounded = roundMoney(amount);
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(rounded));

  if (rounded < 0) {
    return `(${formatted})`;
  }
  return formatted;
}

export function formatPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return 'N/A';
  return `${(value * 100).toFixed(2)}%`;
}

export function formatRatio(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return 'N/A';
  return `${value.toFixed(2)}x`;
}

/**
 * Apply adjusting journal entries onto unadjusted trial balance rows.
 */
export function calculateAdjustedTrialBalance(
  rows: TrialBalanceRow[],
  adjustments: AdjustingJournalEntry[]
): {
  adjustedRows: TrialBalanceRow[];
  totalUnadjustedDebit: number;
  totalUnadjustedCredit: number;
  totalAdjustmentsDebit: number;
  totalAdjustmentsCredit: number;
  totalAdjustedDebit: number;
  totalAdjustedCredit: number;
  isUnadjustedBalanced: boolean;
  isAdjustedBalanced: boolean;
  unadjustedDifference: number;
  adjustedDifference: number;
} {
  const inputErrors = validateTrialBalance(rows);
  if (inputErrors.length) throw new Error(inputErrors.join('; '));
  const adjustmentsMap = new Map<string, { debit: number; credit: number }>();

  // Only take posted adjustments
  const postedAdjustments = adjustments.filter((a) => a.status === 'posted');

  postedAdjustments.forEach((adj) => {
    const errors = validateJournal(adj, rows);
    if (errors.length) throw new Error(`${adj.entryNumber}: ${errors.join("; ")}`);
    adj.lines.forEach((line) => {
      const current = adjustmentsMap.get(line.accountId) || { debit: 0, credit: 0 };
      current.debit = roundMoney(current.debit + (line.debit || 0));
      current.credit = roundMoney(current.credit + (line.credit || 0));
      adjustmentsMap.set(line.accountId, current);
    });
  });

  const adjustedRows: TrialBalanceRow[] = rows.map((row) => {
    const adj = adjustmentsMap.get(row.accountId) || { debit: 0, credit: 0 };
    const netAdjDebit = adj.debit;
    const netAdjCredit = adj.credit;

    // Calculate adjusted balances according to standard trial balance accumulation
    let adjustedDebit = 0;
    let adjustedCredit = 0;

    const baseDebit = roundMoney(row.unadjustedDebit || 0);
    const baseCredit = roundMoney(row.unadjustedCredit || 0);

    // If account normally has debit balance or unadjusted has debit
    const totalDebitAccum = roundMoney(baseDebit + netAdjDebit);
    const totalCreditAccum = roundMoney(baseCredit + netAdjCredit);

    if (totalDebitAccum >= totalCreditAccum) {
      adjustedDebit = roundMoney(totalDebitAccum - totalCreditAccum);
      adjustedCredit = 0;
    } else {
      adjustedDebit = 0;
      adjustedCredit = roundMoney(totalCreditAccum - totalDebitAccum);
    }

    const netDebitCredit = roundMoney(adjustedDebit - adjustedCredit);

    return {
      ...row,
      adjustedDebit,
      adjustedCredit,
      netDebitCredit,
    };
  });

  const totalUnadjustedDebit = sumMoney(rows.map(r => (r.unadjustedDebit || 0)));
  const totalUnadjustedCredit = sumMoney(rows.map(r => (r.unadjustedCredit || 0)));

  const totalAdjustmentsDebit = sumMoney(postedAdjustments.flatMap(a => a.lines.map(l => l.debit)));
  const totalAdjustmentsCredit = sumMoney(postedAdjustments.flatMap(a => a.lines.map(l => l.credit)));

  const totalAdjustedDebit = sumMoney(adjustedRows.map(r => r.adjustedDebit));
  const totalAdjustedCredit = sumMoney(adjustedRows.map(r => r.adjustedCredit));

  const unadjustedDifference = roundMoney(totalUnadjustedDebit - totalUnadjustedCredit);
  const adjustedDifference = roundMoney(totalAdjustedDebit - totalAdjustedCredit);

  return {
    adjustedRows,
    totalUnadjustedDebit,
    totalUnadjustedCredit,
    totalAdjustmentsDebit,
    totalAdjustmentsCredit,
    totalAdjustedDebit,
    totalAdjustedCredit,
    isUnadjustedBalanced: Math.abs(unadjustedDifference) < 0.01,
    isAdjustedBalanced: Math.abs(adjustedDifference) < 0.01,
    unadjustedDifference,
    adjustedDifference,
  };
}

/**
 * Generates the Statement of Profit or Loss (Income Statement)
 */
export function generateProfitAndLoss(
  rows: TrialBalanceRow[],
  priorPeriodStatement?: ProfitAndLossStatement
): ProfitAndLossStatement {
  const revenueRows: StatementRow[] = [];
  const otherIncomeRows: StatementRow[] = [];
  const cogsRows: StatementRow[] = [];
  const operatingExpenseRows: StatementRow[] = [];
  let depreciationExpenses = 0;
  let interestExpense = 0;
  let taxExpense = 0;

  rows.forEach((r) => {
    // Normal balance for Revenue is Credit. If contra (sales returns), it has Debit balance and reduces revenue.
    if (r.classification === 'revenue') {
      const netAmount = r.isContra
        ? -roundMoney(r.adjustedDebit - r.adjustedCredit)
        : roundMoney(r.adjustedCredit - r.adjustedDebit);

      revenueRows.push({
        label: r.accountName,
        accountCode: r.accountCode,
        amount: netAmount,
      });
    } else if (r.classification === 'cogs') {
      const netAmount = r.isContra
        ? -roundMoney(r.adjustedCredit - r.adjustedDebit)
        : roundMoney(r.adjustedDebit - r.adjustedCredit);

      cogsRows.push({
        label: r.accountName,
        accountCode: r.accountCode,
        amount: netAmount,
      });
    } else if (
      r.classification === 'operating_expense' ||
      r.classification === 'depreciation_expense' ||
      r.classification === 'interest_expense' ||
      r.classification === 'tax_expense' ||
      r.classification === 'other_expense'
    ) {
      const netAmount = roundMoney(r.adjustedDebit - r.adjustedCredit);

      if (r.classification === 'depreciation_expense') {
        depreciationExpenses = roundMoney(depreciationExpenses + netAmount);
      }
      if (r.classification === 'interest_expense') {
        interestExpense = roundMoney(interestExpense + netAmount);
      }
      if (r.classification === 'tax_expense') {
        taxExpense = roundMoney(taxExpense + netAmount);
      }

      operatingExpenseRows.push({
        label: r.accountName,
        accountCode: r.accountCode,
        amount: netAmount,
      });
    } else if (r.classification === 'other_income') {
      const netAmount = roundMoney(r.adjustedCredit - r.adjustedDebit);
      // Other income is separate from revenue for meaningful gross margins.
      otherIncomeRows.push({
        label: r.accountName,
        accountCode: r.accountCode,
        amount: netAmount,
      });
    }
  });

  const totalRevenue = sumMoney(revenueRows.map(r => r.amount));
  const totalCogs = sumMoney(cogsRows.map(r => r.amount));
  const grossProfit = roundMoney(totalRevenue - totalCogs);
  const totalOperatingExpenses = sumMoney(operatingExpenseRows.map(r => r.amount));
  const totalOtherIncome = sumMoney(otherIncomeRows.map(r => r.amount));
  const operatingProfit = roundMoney(grossProfit + totalOtherIncome - (totalOperatingExpenses - interestExpense - taxExpense));
  const netProfit = roundMoney(grossProfit + totalOtherIncome - totalOperatingExpenses);

  return {
    revenueRows,
    otherIncomeRows,
    totalOtherIncome,
    totalRevenue,
    cogsRows,
    totalCogs,
    grossProfit,
    operatingExpenseRows,
    totalOperatingExpenses,
    operatingProfit,
    depreciationExpenses,
    interestExpense,
    taxExpense,
    netProfit,
    priorRevenue: priorPeriodStatement?.totalRevenue,
    priorGrossProfit: priorPeriodStatement?.grossProfit,
    priorNetProfit: priorPeriodStatement?.netProfit,
  };
}

/**
 * Generates the Statement of Financial Position (Balance Sheet)
 * Performs full accounting reconciliation: Total Assets = Total Liabilities + Total Equity
 */
export function generateBalanceSheet(
  rows: TrialBalanceRow[],
  currentYearNetProfit: number,
  equityMovement?: EquityMovementData
): BalanceSheetStatement {
  const currentAssets: StatementRow[] = [];
  const nonCurrentAssets: StatementRow[] = [];
  const currentLiabilities: StatementRow[] = [];
  const nonCurrentLiabilities: StatementRow[] = [];
  const equityItems: StatementRow[] = [];

  rows.forEach((r) => {
    if (r.classification === 'current_asset') {
      // Normal balance: Debit. Contra asset (e.g. Allowance for Doubtful Accounts): Credit, reduces asset.
      const amount = r.isContra
        ? -roundMoney(r.adjustedCredit - r.adjustedDebit)
        : roundMoney(r.adjustedDebit - r.adjustedCredit);

      currentAssets.push({
        label: r.accountName,
        accountCode: r.accountCode,
        amount,
        notes: r.isContra ? 'Contra-Asset Account' : undefined,
      });
    } else if (r.classification === 'non_current_asset') {
      // Contra asset (e.g. Accumulated Depreciation)
      const amount = r.isContra
        ? -roundMoney(r.adjustedCredit - r.adjustedDebit)
        : roundMoney(r.adjustedDebit - r.adjustedCredit);

      nonCurrentAssets.push({
        label: r.accountName,
        accountCode: r.accountCode,
        amount,
        notes: r.isContra ? 'Contra-Asset (Accumulated Depreciation)' : undefined,
      });
    } else if (r.classification === 'current_liability') {
      const amount = r.isContra
        ? -roundMoney(r.adjustedDebit - r.adjustedCredit)
        : roundMoney(r.adjustedCredit - r.adjustedDebit);

      currentLiabilities.push({
        label: r.accountName,
        accountCode: r.accountCode,
        amount,
      });
    } else if (r.classification === 'non_current_liability') {
      const amount = r.isContra
        ? -roundMoney(r.adjustedDebit - r.adjustedCredit)
        : roundMoney(r.adjustedCredit - r.adjustedDebit);

      nonCurrentLiabilities.push({
        label: r.accountName,
        accountCode: r.accountCode,
        amount,
      });
    } else if (r.classification === 'equity') {
      // If the row is explicit Retained Earnings, we separate opening from current year profit
      const amount = r.isContra
        ? -roundMoney(r.adjustedDebit - r.adjustedCredit)
        : roundMoney(r.adjustedCredit - r.adjustedDebit);

      equityItems.push({
        label: r.accountName,
        accountCode: r.accountCode,
        amount,
        notes: r.isContra ? 'Contra-Equity' : undefined,
      });
    }
  });

  const totalCurrentAssets = sumMoney(currentAssets.map(r => r.amount));
  const totalNonCurrentAssets = sumMoney(nonCurrentAssets.map(r => r.amount));
  const totalAssets = roundMoney(totalCurrentAssets + totalNonCurrentAssets);

  const totalCurrentLiabilities = sumMoney(currentLiabilities.map(r => r.amount));
  const totalNonCurrentLiabilities = roundMoney(
    nonCurrentLiabilities.reduce((sum, r) => sum + r.amount, 0)
  );
  const totalLiabilities = roundMoney(totalCurrentLiabilities + totalNonCurrentLiabilities);

  // In standard accounting, Trial Balance includes opening equity accounts.
  // The current year profit comes from the Income Statement.
  const openingEquityFromTB = sumMoney(equityItems.map(r => r.amount));

  // If equity movement data is explicitly provided, verify compatibility
  const openingRetainedEarnings = equityMovement?.openingRetainedEarnings ?? sumMoney(equityItems.filter(r => r.label.toLowerCase().includes('retained')).map(r => r.amount));

  const totalEquity = roundMoney(openingEquityFromTB + currentYearNetProfit);

  const totalLiabilitiesAndEquity = roundMoney(totalLiabilities + totalEquity);
  const reconciliationDifference = roundMoney(totalAssets - totalLiabilitiesAndEquity);
  const isReconciled = Math.abs(reconciliationDifference) < 0.01;

  return {
    currentAssets,
    totalCurrentAssets,
    nonCurrentAssets,
    totalNonCurrentAssets,
    totalAssets,
    currentLiabilities,
    totalCurrentLiabilities,
    nonCurrentLiabilities,
    totalNonCurrentLiabilities,
    totalLiabilities,
    equityItems,
    openingRetainedEarnings,
    currentYearProfit: currentYearNetProfit,
    totalEquity,
    totalLiabilitiesAndEquity,
    reconciliationDifference,
    isReconciled,
  };
}

/**
 * Generates the Statement of Changes in Equity
 */
export function generateChangesInEquity(
  equityMovement: EquityMovementData | undefined,
  netProfit: number,
  balanceSheetEquityRows: StatementRow[]
): ChangesInEquityStatement {
  const openingShareCapital = equityMovement?.openingShareCapital ?? 
    balanceSheetEquityRows
      .filter((r) => r.label.toLowerCase().includes('share') || r.label.toLowerCase().includes('capital'))
      .reduce((s, r) => s + r.amount, 0);

  const openingRetainedEarnings = equityMovement?.openingRetainedEarnings ??
    balanceSheetEquityRows
      .filter((r) => r.label.toLowerCase().includes('retained'))
      .reduce((s, r) => s + r.amount, 0);

  const shareCapitalMovements = equityMovement?.shareIssuance ?? 0;
  const dividendsPaid = equityMovement?.dividendsDeclared ?? 0;

  const closingShareCapital = roundMoney(openingShareCapital + shareCapitalMovements);
  const closingRetainedEarnings = roundMoney(openingRetainedEarnings + netProfit - dividendsPaid);
  const closingTotalEquity = sumMoney([closingShareCapital, closingRetainedEarnings, equityMovement?.openingOtherReserves ?? 0, equityMovement?.otherComprehensiveIncome ?? 0]);
  const openingTotal = sumMoney([openingShareCapital, openingRetainedEarnings, equityMovement?.openingOtherReserves ?? 0]);

  return {
    openingOtherReserves: equityMovement?.openingOtherReserves ?? 0,
    otherComprehensiveIncome: equityMovement?.otherComprehensiveIncome ?? 0,
    openingShareCapital: roundMoney(openingShareCapital),
    openingRetainedEarnings: roundMoney(openingRetainedEarnings),
    openingTotal: roundMoney(openingTotal),
    netProfitForPeriod: roundMoney(netProfit),
    shareCapitalMovements: roundMoney(shareCapitalMovements),
    dividendsPaid: roundMoney(dividendsPaid),
    closingShareCapital,
    closingRetainedEarnings,
    closingTotalEquity,
  };
}

/**
 * Generates the Indirect Cash Flow Statement
 * RIGID REQUIREMENT: Never infer cash flows from a single closing trial balance.
 * Requires comparative balance sheet data AND supplementary movement data.
 */
export function generateIndirectCashFlow(
  currentBalanceSheet: BalanceSheetStatement,
  priorBalanceSheet: BalanceSheetStatement | undefined,
  currentPnL: ProfitAndLossStatement,
  supplementary: SupplementaryCashFlowData | undefined
): CashFlowStatement {
  // If no prior comparative balance sheet exists, cash flow cannot be inferred
  if (!priorBalanceSheet || !supplementary || !currentBalanceSheet.isReconciled || !priorBalanceSheet.isReconciled || ['depreciationAmortization','gainLossOnDisposal','interestExpense','incomeTaxPaid','interestPaid','capexAdditions','proceedsFromDisposal','debtIssued','debtRepaid','sharesIssued','dividendsPaid'].some(key => !Number.isFinite((supplementary as any)[key]) || (key !== 'gainLossOnDisposal' && (supplementary as any)[key] < 0))) {
    return {
      isAvailable: false,
      unavailableReason:
        'Comparative Balance Sheet and complete supplementary cash movement data are required. Under professional accounting standards (IAS 7 / ASC 230), indirect cash flows cannot be deduced from a single closing trial balance.',
      operatingActivities: [],
      netCashFromOperating: 0,
      investingActivities: [],
      netCashFromInvesting: 0,
      financingActivities: [],
      netCashFromFinancing: 0,
      netChangeInCash: 0,
      openingCash: 0,
      closingCashCalculated: 0,
      closingCashBalanceSheet: 0,
      cashReconciliationDifference: 0,
      isCashReconciled: false,
    };
  }

  // 1. Operating Activities (Indirect Method)
  const operatingActivities: StatementRow[] = [];

  // Start with Net Profit
  operatingActivities.push({
    label: 'Profit for the period (Net Income)',
    amount: currentPnL.netProfit,
  });

  // Non-cash adjustment: Depreciation & Amortization
  const deprAmount = supplementary?.depreciationAmortization ?? currentPnL.depreciationExpenses;
  operatingActivities.push({
    label: 'Adjustments for: Depreciation & Amortization',
    amount: deprAmount,
  });

  if (supplementary && supplementary.gainLossOnDisposal !== 0) {
    operatingActivities.push({
      label: 'Adjustments for: Loss / (Gain) on disposal of assets',
      amount: supplementary.gainLossOnDisposal,
    });
  }

  // Tax and interest cash payments are explicitly provided; both are operating here.
  operatingActivities.push({ label: 'Tax expense added back', amount: currentPnL.taxExpense });
  operatingActivities.push({ label: 'Income tax paid', amount: -supplementary.incomeTaxPaid });
  operatingActivities.push({ label: 'Interest expense added back', amount: currentPnL.interestExpense });
  operatingActivities.push({ label: 'Interest paid (operating policy)', amount: -supplementary.interestPaid });

  // Working Capital Adjustments
  // Accounts Receivable: Change = Prior - Current (increase in AR is cash outflow)
  const currentAR = currentBalanceSheet.currentAssets
    .filter((a) => a.label.toLowerCase().includes('receivable'))
    .reduce((s, a) => s + a.amount, 0);
  const priorAR = priorBalanceSheet.currentAssets
    .filter((a) => a.label.toLowerCase().includes('receivable'))
    .reduce((s, a) => s + a.amount, 0);
  const changeAR = roundMoney(priorAR - currentAR);
  operatingActivities.push({
    label: '(Increase) / decrease in Accounts Receivable',
    amount: changeAR,
  });

  // Inventories: Change = Prior - Current (increase in Inventory is cash outflow)
  const currentInv = currentBalanceSheet.currentAssets
    .filter((a) => a.label.toLowerCase().includes('inventor') || a.label.toLowerCase().includes('stock'))
    .reduce((s, a) => s + a.amount, 0);
  const priorInv = priorBalanceSheet.currentAssets
    .filter((a) => a.label.toLowerCase().includes('inventor') || a.label.toLowerCase().includes('stock'))
    .reduce((s, a) => s + a.amount, 0);
  const changeInv = roundMoney(priorInv - currentInv);
  operatingActivities.push({
    label: '(Increase) / decrease in Inventories',
    amount: changeInv,
  });

  // Prepayments and other current assets:
  const currentPrepay = currentBalanceSheet.currentAssets
    .filter((a) => a.label.toLowerCase().includes('prepaid') || a.label.toLowerCase().includes('prepayment'))
    .reduce((s, a) => s + a.amount, 0);
  const priorPrepay = priorBalanceSheet.currentAssets
    .filter((a) => a.label.toLowerCase().includes('prepaid') || a.label.toLowerCase().includes('prepayment'))
    .reduce((s, a) => s + a.amount, 0);
  const changePrepay = roundMoney(priorPrepay - currentPrepay);
  if (currentPrepay > 0 || priorPrepay > 0) {
    operatingActivities.push({
      label: '(Increase) / decrease in Prepayments and other assets',
      amount: changePrepay,
    });
  }

  // Accounts Payable: Change = Current - Prior (increase in AP is cash inflow / deferred cash outflow)
  const currentAP = currentBalanceSheet.currentLiabilities
    .filter((l) => l.label.toLowerCase().includes('payable') && !/tax|interest|accru/i.test(l.label))
    .reduce((s, l) => s + l.amount, 0);
  const priorAP = priorBalanceSheet.currentLiabilities
    .filter((l) => l.label.toLowerCase().includes('payable') && !/tax|interest|accru/i.test(l.label))
    .reduce((s, l) => s + l.amount, 0);
  const changeAP = roundMoney(currentAP - priorAP);
  operatingActivities.push({
    label: 'Increase / (decrease) in Accounts Payable & Trade Payables',
    amount: changeAP,
  });

  // Accrued Liabilities:
  const currentAccrued = currentBalanceSheet.currentLiabilities
    .filter((l) => l.label.toLowerCase().includes('accrued') || l.label.toLowerCase().includes('accrual'))
    .reduce((s, l) => s + l.amount, 0);
  const priorAccrued = priorBalanceSheet.currentLiabilities
    .filter((l) => l.label.toLowerCase().includes('accrued') || l.label.toLowerCase().includes('accrual'))
    .reduce((s, l) => s + l.amount, 0);
  const changeAccrued = roundMoney(currentAccrued - priorAccrued);
  if (currentAccrued > 0 || priorAccrued > 0) {
    operatingActivities.push({
      label: 'Increase / (decrease) in Accrued expenses',
      amount: changeAccrued,
    });
  }

  const netCashFromOperating = sumMoney(operatingActivities.map(r => r.amount));

  // 2. Investing Activities
  const investingActivities: StatementRow[] = [];
  const capex = supplementary ? supplementary.capexAdditions : 0;
  if (capex > 0) {
    investingActivities.push({
      label: 'Purchase of Property, Plant & Equipment (CapEx)',
      amount: -roundMoney(capex),
    });
  }
  const disposalProceeds = supplementary ? supplementary.proceedsFromDisposal : 0;
  if (disposalProceeds > 0) {
    investingActivities.push({
      label: 'Proceeds from disposal of Equipment & Non-Current Assets',
      amount: roundMoney(disposalProceeds),
    });
  }
  const netCashFromInvesting = sumMoney(investingActivities.map(r => r.amount));

  // 3. Financing Activities
  const financingActivities: StatementRow[] = [];
  if (supplementary?.sharesIssued) {
    financingActivities.push({
      label: 'Proceeds from issuance of share capital',
      amount: roundMoney(supplementary.sharesIssued),
    });
  }
  if (supplementary?.debtIssued) {
    financingActivities.push({
      label: 'Proceeds from bank borrowings & debt issued',
      amount: roundMoney(supplementary.debtIssued),
    });
  }
  if (supplementary?.debtRepaid) {
    financingActivities.push({
      label: 'Repayment of long-term borrowings & debt',
      amount: -roundMoney(supplementary.debtRepaid),
    });
  }
  if (supplementary?.dividendsPaid) {
    financingActivities.push({
      label: 'Dividends paid to shareholders',
      amount: -roundMoney(supplementary.dividendsPaid),
    });
  }
  const netCashFromFinancing = sumMoney(financingActivities.map(r => r.amount));

  const netChangeInCash = roundMoney(
    netCashFromOperating + netCashFromInvesting + netCashFromFinancing
  );

  // Cash balances from Balance Sheet Cash accounts
  const openingCash = roundMoney(
    priorBalanceSheet.currentAssets
      .filter((a) => a.label.toLowerCase().includes('cash') || a.label.toLowerCase().includes('bank'))
      .reduce((s, a) => s + a.amount, 0)
  );

  const closingCashBalanceSheet = roundMoney(
    currentBalanceSheet.currentAssets
      .filter((a) => a.label.toLowerCase().includes('cash') || a.label.toLowerCase().includes('bank'))
      .reduce((s, a) => s + a.amount, 0)
  );

  const closingCashCalculated = roundMoney(openingCash + netChangeInCash);
  const cashReconciliationDifference = roundMoney(closingCashCalculated - closingCashBalanceSheet);
  const isCashReconciled = Math.abs(cashReconciliationDifference) < 0.01;

  return {
    isAvailable: true,
    operatingActivities,
    netCashFromOperating,
    investingActivities,
    netCashFromInvesting,
    financingActivities,
    netCashFromFinancing,
    netChangeInCash,
    openingCash,
    closingCashCalculated,
    closingCashBalanceSheet,
    cashReconciliationDifference,
    isCashReconciled,
  };
}

/**
 * Calculates financial ratios with full mathematical definitions, benchmarks,
 * and missing data warning guards.
 */
export function calculateFinancialRatios(
  bs: BalanceSheetStatement,
  pnl: ProfitAndLossStatement
): RatioItem[] {
  const ratios: RatioItem[] = [];

  // 1. LIQUIDITY
  // Current Ratio = Current Assets / Current Liabilities
  if (bs.totalCurrentLiabilities > 0) {
    const val = (bs.totalCurrentAssets / bs.totalCurrentLiabilities);
    ratios.push({
      id: 'current-ratio',
      category: 'Liquidity',
      name: 'Current Ratio',
      formula: 'Current Assets / Current Liabilities',
      value: val,
      formattedValue: `${val.toFixed(2)}x`,
      benchmark: '> 1.50x',
      status: val >= 1.5 ? 'good' : val >= 1.0 ? 'warning' : 'critical',
      explanation:
        'Measures ability to cover short-term obligations with short-term assets.',
    });
  } else {
    ratios.push({
      id: 'current-ratio',
      category: 'Liquidity',
      name: 'Current Ratio',
      formula: 'Current Assets / Current Liabilities',
      value: null,
      formattedValue: 'N/A',
      benchmark: '> 1.50x',
      status: 'unavailable',
      explanation: 'Cannot calculate: Current liabilities are zero or not classified.',
      missingDataWarning: 'Requires classified Current Liabilities > 0',
    });
  }

  // Quick Ratio = (Cash + Marketable Securities + Receivables) / Current Liabilities
  const quickAssets = roundMoney(
    bs.currentAssets
      .filter(
        (a) =>
          a.label.toLowerCase().includes('cash') ||
          a.label.toLowerCase().includes('receivable') ||
          a.label.toLowerCase().includes('bank')
      )
      .reduce((s, a) => s + a.amount, 0)
  );

  if (bs.totalCurrentLiabilities > 0) {
    const val = (quickAssets / bs.totalCurrentLiabilities);
    ratios.push({
      id: 'quick-ratio',
      category: 'Liquidity',
      name: 'Quick Ratio (Acid-Test)',
      formula: '(Cash + Trade Receivables) / Current Liabilities',
      value: val,
      formattedValue: `${val.toFixed(2)}x`,
      benchmark: '> 1.00x',
      status: val >= 1.0 ? 'good' : val >= 0.8 ? 'warning' : 'critical',
      explanation:
        'Excludes illiquid inventory to test immediate liquidity capacity.',
    });
  } else {
    ratios.push({
      id: 'quick-ratio',
      category: 'Liquidity',
      name: 'Quick Ratio (Acid-Test)',
      formula: '(Cash + Trade Receivables) / Current Liabilities',
      value: null,
      formattedValue: 'N/A',
      benchmark: '> 1.00x',
      status: 'unavailable',
      explanation: 'Cannot calculate: Current liabilities are zero or not classified.',
      missingDataWarning: 'Requires classified Current Liabilities > 0',
    });
  }

  // 2. SOLVENCY
  // Debt to Equity = Total Liabilities / Total Equity
  if (bs.totalEquity > 0) {
    const val = (bs.totalLiabilities / bs.totalEquity);
    ratios.push({
      id: 'debt-equity',
      category: 'Solvency',
      name: 'Debt-to-Equity Ratio',
      formula: 'Total Liabilities / Total Equity',
      value: val,
      formattedValue: `${val.toFixed(2)}x`,
      benchmark: '< 1.50x',
      status: val <= 1.5 ? 'good' : val <= 2.5 ? 'warning' : 'critical',
      explanation: 'Indicates the proportion of debt used relative to equity cushion.',
    });
  } else {
    ratios.push({
      id: 'debt-equity',
      category: 'Solvency',
      name: 'Debt-to-Equity Ratio',
      formula: 'Total Liabilities / Total Equity',
      value: null,
      formattedValue: 'N/A',
      benchmark: '< 1.50x',
      status: 'unavailable',
      explanation: 'Cannot calculate: Total equity is zero or negative.',
      missingDataWarning: 'Requires positive Total Equity',
    });
  }

  // Debt-to-Assets = Total Liabilities / Total Assets
  if (bs.totalAssets > 0) {
    const val = (bs.totalLiabilities / bs.totalAssets);
    ratios.push({
      id: 'debt-assets',
      category: 'Solvency',
      name: 'Debt-to-Assets Ratio',
      formula: 'Total Liabilities / Total Assets',
      value: val,
      formattedValue: `${(val * 100).toFixed(1)}%`,
      benchmark: '< 50.0%',
      status: val <= 0.5 ? 'good' : val <= 0.7 ? 'warning' : 'critical',
      explanation: 'Percentage of company assets financed through creditors.',
    });
  }

  // Interest Coverage = Operating Profit / Interest Expense
  if (pnl.interestExpense > 0) {
    const val = (pnl.operatingProfit / pnl.interestExpense);
    ratios.push({
      id: 'interest-coverage',
      category: 'Solvency',
      name: 'Interest Coverage Ratio',
      formula: 'Operating Profit (EBIT) / Interest Expense',
      value: val,
      formattedValue: `${val.toFixed(2)}x`,
      benchmark: '> 3.00x',
      status: val >= 3.0 ? 'good' : val >= 1.5 ? 'warning' : 'critical',
      explanation: 'How many times operating earnings cover debt interest commitments.',
    });
  } else {
    ratios.push({
      id: 'interest-coverage',
      category: 'Solvency',
      name: 'Interest Coverage Ratio',
      formula: 'Operating Profit (EBIT) / Interest Expense',
      value: null,
      formattedValue: 'N/A',
      benchmark: '> 3.00x',
      status: 'unavailable',
      explanation: 'Interest expense is zero or not identified as separate classification.',
      missingDataWarning: 'Requires classified Interest Expense > 0',
    });
  }

  // 3. PROFITABILITY
  // Gross Profit Margin = Gross Profit / Total Revenue
  if (pnl.totalRevenue > 0) {
    const val = (pnl.grossProfit / pnl.totalRevenue);
    ratios.push({
      id: 'gross-margin',
      category: 'Profitability',
      name: 'Gross Profit Margin',
      formula: 'Gross Profit / Total Revenue',
      value: val,
      formattedValue: `${(val * 100).toFixed(2)}%`,
      benchmark: '> 35.0%',
      status: val >= 0.35 ? 'good' : val >= 0.2 ? 'warning' : 'critical',
      explanation: 'Percentage of revenue retained after direct production costs.',
    });
  } else {
    ratios.push({
      id: 'gross-margin',
      category: 'Profitability',
      name: 'Gross Profit Margin',
      formula: 'Gross Profit / Total Revenue',
      value: null,
      formattedValue: 'N/A',
      benchmark: '> 35.0%',
      status: 'unavailable',
      explanation: 'Revenue is zero or negative.',
      missingDataWarning: 'Requires positive Total Revenue',
    });
  }

  // Net Profit Margin = Net Profit / Total Revenue
  if (pnl.totalRevenue > 0) {
    const val = (pnl.netProfit / pnl.totalRevenue);
    ratios.push({
      id: 'net-margin',
      category: 'Profitability',
      name: 'Net Profit Margin',
      formula: 'Net Profit / Total Revenue',
      value: val,
      formattedValue: `${(val * 100).toFixed(2)}%`,
      benchmark: '> 10.0%',
      status: val >= 0.1 ? 'good' : val >= 0.03 ? 'warning' : 'critical',
      explanation: 'Bottom-line percentage profit remaining from top-line revenue.',
    });
  }

  // Return on Assets (ROA) = Net Profit / Total Assets
  if (bs.totalAssets > 0) {
    const val = (pnl.netProfit / bs.totalAssets);
    ratios.push({
      id: 'roa',
      category: 'Profitability',
      name: 'Return on Assets (ROA)',
      formula: 'Net Profit / Total Assets',
      value: val,
      formattedValue: `${(val * 100).toFixed(2)}%`,
      benchmark: '> 8.0%',
      status: val >= 0.08 ? 'good' : val >= 0.03 ? 'warning' : 'critical',
      explanation: 'Efficiency of utilizing asset base to generate net income.',
    });
  }

  // Return on Equity (ROE) = Net Profit / Total Equity
  if (bs.totalEquity > 0) {
    const val = (pnl.netProfit / bs.totalEquity);
    ratios.push({
      id: 'roe',
      category: 'Profitability',
      name: 'Return on Equity (ROE)',
      formula: 'Net Profit / Total Equity',
      value: val,
      formattedValue: `${(val * 100).toFixed(2)}%`,
      benchmark: '> 12.0%',
      status: val >= 0.12 ? 'good' : val >= 0.05 ? 'warning' : 'critical',
      explanation: 'Net earnings generated on shareholders’ invested capital.',
    });
  }

  // 4. EFFICIENCY
  // Asset Turnover = Total Revenue / Total Assets
  if (bs.totalAssets > 0 && pnl.totalRevenue > 0) {
    const val = (pnl.totalRevenue / bs.totalAssets);
    ratios.push({
      id: 'asset-turnover',
      category: 'Efficiency',
      name: 'Total Asset Turnover',
      formula: 'Total Revenue / Total Assets',
      value: val,
      formattedValue: `${val.toFixed(2)}x`,
      benchmark: '> 1.00x',
      status: val >= 1.0 ? 'good' : 'warning',
      explanation: 'Revenue generated per dollar of asset deployment.',
    });
  }

  return ratios;
}
