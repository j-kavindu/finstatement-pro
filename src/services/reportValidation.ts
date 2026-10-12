import type { BalanceSheetStatement, CashFlowStatement, ChangesInEquityStatement, EquityMovementData, TrialBalanceRow } from '../types/accounting';
import { sumMoney, validMoney } from './money';

export interface ReportCheck {
  id: string;
  title: string;
  status: 'pass' | 'warning' | 'blocked';
  detail: string;
  difference?: number;
}

export function validateReportReadiness(rows: TrialBalanceRow[], bs: BalanceSheetStatement, eq: ChangesInEquityStatement, movement: EquityMovementData | undefined, prior: BalanceSheetStatement | undefined, cf: CashFlowStatement): ReportCheck[] {
  const difference = sumMoney(rows.flatMap(r => [r.adjustedDebit, -r.adjustedCredit]));
  const openingValid = !!movement && Object.entries(movement).every(([key, value]) => key === 'periodId' || validMoney(value));
  const openingDifference = openingValid && prior ? sumMoney([eq.openingTotal, -prior.totalEquity]) : undefined;
  const closingDifference = sumMoney([eq.closingTotalEquity, -bs.totalEquity]);
  const contraCount = rows.filter(r => r.isContra).length;
  const unusual = rows.filter(r => {
    const debitNormal = ['current_asset', 'non_current_asset', 'cogs', 'operating_expense', 'depreciation_expense', 'interest_expense', 'tax_expense', 'other_expense'].includes(r.classification) !== r.isContra;
    return debitNormal ? r.adjustedCredit > 0 : r.adjustedDebit > 0;
  });
  return [
    { id: 'trial-balance', title: 'Debit = Credit', status: rows.length && difference === 0 ? 'pass' : 'blocked', difference, detail: rows.length ? `${rows.length} mapped accounts. Difference must be exactly zero.` : 'Import a trial balance or add accounts to begin.' },
    { id: 'contra', title: 'Account signs', status: unusual.length ? 'warning' : 'pass', detail: `${contraCount} contra accounts. ${unusual.length ? `Review unusual balances: ${unusual.map(r => r.accountCode).join(', ')}. Signs have been preserved.` : 'Debit and credit signs are preserved; contra accounts are not flipped twice.'}` },
    { id: 'position', title: 'Financial position', status: rows.length && bs.isReconciled ? 'pass' : 'blocked', difference: bs.reconciliationDifference, detail: 'Assets must equal liabilities plus equity, including current-period profit once.' },
    { id: 'opening-equity', title: 'Opening equity', status: !openingValid ? 'blocked' : prior ? (prior.isReconciled && openingDifference === 0 ? 'pass' : 'blocked') : 'warning', difference: openingDifference, detail: !openingValid ? 'Enter explicit opening capital, retained earnings and reserves in Statements → Equity.' : prior ? 'Opening total is compared with prior-period closing equity. Component allocation still needs review.' : 'No comparative ledger. Opening amounts are supplied manually and cannot be independently reconciled.' },
    { id: 'equity-rollforward', title: 'Equity movements', status: openingValid && closingDifference === 0 ? 'pass' : 'blocked', difference: closingDifference, detail: 'Opening equity + profit + capital issued − dividends + OCI must equal closing equity. Movements must already be posted to the ledger.' },
    { id: 'cash-flow', title: 'Cash flow inputs', status: cf.isAvailable && cf.isCashReconciled ? 'pass' : 'warning', difference: cf.isAvailable ? cf.cashReconciliationDifference : undefined, detail: cf.isAvailable ? (cf.isCashReconciled ? 'Comparative data and movements reconcile to closing cash. Review classifications before use.' : 'Cash does not reconcile. Cash flow remains a draft requiring review.') : 'Unavailable without reconciled comparative data and complete supplementary movements. Other statements can still be prepared.' },
  ];
}
export function assertReportReady(checks: ReportCheck[]) {
  const blocked = checks.filter(check => check.status === 'blocked');
  if (blocked.length) throw new Error(`Resolve validation checks before exporting: ${blocked.map(check => check.title).join(', ')}`);
}
