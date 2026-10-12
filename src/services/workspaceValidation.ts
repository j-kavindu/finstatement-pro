import type { EquityMovementData } from '../types/accounting';
import { validMoney } from './money';
export function validateEquityMovement(data: EquityMovementData, periodId: string): string[] {
  const errors: string[] = [];
  if (data.periodId !== periodId) errors.push('Equity data belongs to a different period');
  for (const key of ['openingShareCapital', 'openingRetainedEarnings', 'openingOtherReserves', 'shareIssuance', 'dividendsDeclared', 'otherComprehensiveIncome'] as const) {
    if (!validMoney(data[key])) errors.push(`${key}: enter an amount with up to two decimal places within the supported range`);
  }
  if (data.shareIssuance < 0 || data.dividendsDeclared < 0 || data.openingShareCapital < 0) errors.push('Share capital, issuance and dividends must be non-negative');
  return errors;
}

import type { LedgerWorkspace, ReportingPeriod, WorkspacePayload } from '../types/accounting';
import { calculateAdjustedTrialBalance, generateProfitAndLoss, generateBalanceSheet, generateChangesInEquity } from './accountingEngine';

export function validateLedger(ledger: LedgerWorkspace, period: ReportingPeriod) {
  if (!Array.isArray(ledger.tbRows) || !Array.isArray(ledger.adjustments) || !Array.isArray(ledger.comparativeTbRows)) throw new Error('Invalid ledger arrays');
  const adjusted = calculateAdjustedTrialBalance(ledger.tbRows, ledger.adjustments, period);
  const pnl = generateProfitAndLoss(adjusted.adjustedRows);
  const bs = generateBalanceSheet(adjusted.adjustedRows, pnl.netProfit);
  if (ledger.equityMovement) {
    const errors = validateEquityMovement(ledger.equityMovement, period.id);
    if (errors.length) throw new Error(errors.join('; '));
  }
  generateChangesInEquity(ledger.equityMovement, pnl.netProfit, bs.equityItems);
  if (ledger.comparativeTbRows.length) {
    const comparative = calculateAdjustedTrialBalance(ledger.comparativeTbRows, []);
    generateBalanceSheet(comparative.adjustedRows, generateProfitAndLoss(comparative.adjustedRows).netProfit);
  }
  if (ledger.supplementary) {
    if (ledger.supplementary.periodId !== period.id) throw new Error('Cash movement data belongs to another period');
    for (const key of ['depreciationAmortization','gainLossOnDisposal','interestExpense','incomeTaxPaid','interestPaid','capexAdditions','proceedsFromDisposal','debtIssued','debtRepaid','sharesIssued','dividendsPaid'] as const) {
      if (!validMoney(ledger.supplementary[key]) || (key !== 'gainLossOnDisposal' && ledger.supplementary[key] < 0)) throw new Error('Invalid supplementary movement');
    }
  }
}
export function validateWorkspace(data: WorkspacePayload) {
  if (data.schemaVersion !== undefined && data.schemaVersion !== 1) throw new Error('Unsupported workspace version');
  if (!Array.isArray(data.companies) || !Array.isArray(data.periods) || !data.selectedCompany || !data.selectedPeriod) throw new Error('Invalid workspace structure');
  for (const company of data.companies) {
    if (!company.id || !company.name || !/^[A-Z]{3}$/.test(company.currency)) throw new Error('Invalid company settings');
  }
  for (const period of data.periods) {
    if (!period.id || !data.companies.some(company => company.id === period.companyId) || !Number.isFinite(Date.parse(period.startDate)) || !Number.isFinite(Date.parse(period.endDate)) || period.startDate > period.endDate) throw new Error('Invalid reporting period');
    if (period.comparativePeriodId && !data.periods.some(prior => prior.id === period.comparativePeriodId && prior.companyId === period.companyId && prior.endDate < period.startDate)) throw new Error('Comparative period must precede the current period in the same company');
  }
  if (!data.companies.some(company => company.id === data.selectedCompany.id) || !data.periods.some(period => period.id === data.selectedPeriod.id && period.companyId === data.selectedCompany.id)) throw new Error('Invalid selected workspace');
  validateLedger(data,data.selectedPeriod);
  for (const [key, ledger] of Object.entries(data.ledgers ?? {})) {
    const period = data.periods.find(period => key === `${period.companyId}:${period.id}`);
    if (!period) throw new Error('Unrecognized stored ledger');
    validateLedger(ledger,period);
  }
}
