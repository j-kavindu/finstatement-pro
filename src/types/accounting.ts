/**
 * FinStatement Pro - Accounting & Financial Reporting Types
 */

export type AccountClassification =
  | 'current_asset'
  | 'non_current_asset'
  | 'current_liability'
  | 'non_current_liability'
  | 'equity'
  | 'revenue'
  | 'cogs'
  | 'operating_expense'
  | 'depreciation_expense'
  | 'interest_expense'
  | 'tax_expense'
  | 'other_income'
  | 'other_expense';

export type NormalBalance = 'debit' | 'credit';

export interface AccountDefinition {
  id: string;
  code: string;
  name: string;
  classification: AccountClassification;
  normalBalance: NormalBalance;
  isContra: boolean;
  description?: string;
}

export interface TrialBalanceRow {
  id: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  classification: AccountClassification;
  isContra: boolean;
  unadjustedDebit: number;
  unadjustedCredit: number;
  adjustedDebit: number;
  adjustedCredit: number;
  netDebitCredit: number; // positive for debit normal, negative for credit
}

export interface JournalLine {
  id: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  memo?: string;
}

export interface AdjustingJournalEntry {
  id: string;
  periodId: string;
  entryNumber: string;
  date: string;
  description: string;
  lines: JournalLine[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  status: 'draft' | 'posted';
  createdAt: string;
  createdBy?: string;
}

export interface Company {
  id: string;
  ownerId: string;
  name: string;
  industry: string;
  currency: string;
  reportingFramework: 'IFRS-aligned' | 'US-GAAP-aligned' | 'SME-Standard';
  createdAt: string;
  updatedAt: string;
}

export interface ReportingPeriod {
  id: string;
  companyId: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'open' | 'closed' | 'draft';
  comparativePeriodId?: string; // ID of prior period for comparative statements & indirect cash flow
}

export interface SupplementaryCashFlowData {
  periodId: string;
  depreciationAmortization: number;
  gainLossOnDisposal: number; // positive for loss, negative for gain
  interestExpense: number;
  incomeTaxPaid: number;
  interestPaid: number;
  capexAdditions: number; // cash spent on property/plant/equipment
  proceedsFromDisposal: number; // cash received from asset sale
  debtIssued: number;
  debtRepaid: number;
  sharesIssued: number;
  dividendsPaid: number;
  notes?: string;
}

export interface EquityMovementData {
  periodId: string;
  openingShareCapital: number;
  openingRetainedEarnings: number;
  openingOtherReserves: number;
  shareIssuance: number;
  dividendsDeclared: number;
  otherComprehensiveIncome: number;
}

export interface AuditLogEntry {
  id: string;
  companyId: string;
  periodId?: string;
  timestamp: string;
  actorEmail: string;
  action: string;
  details: string;
}

export interface ReportVersionSnapshot {
  id: string;
  periodId: string;
  version: number;
  name: string;
  createdAt: string;
  createdBy: string;
  netProfit: number;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  isReconciled: boolean;
}

export interface StatementRow {
  label: string;
  accountCode?: string;
  amount: number;
  priorAmount?: number;
  isSubtotal?: boolean;
  isTotal?: boolean;
  indent?: number;
  notes?: string;
}

export interface ProfitAndLossStatement {
  revenueRows: StatementRow[];
  totalRevenue: number;
  cogsRows: StatementRow[];
  totalCogs: number;
  grossProfit: number;
  operatingExpenseRows: StatementRow[];
  totalOperatingExpenses: number;
  operatingProfit: number; // EBIT
  depreciationExpenses: number;
  interestExpense: number;
  taxExpense: number;
  netProfit: number;
  otherIncomeRows?: StatementRow[];
  totalOtherIncome?: number;
  priorRevenue?: number;
  priorGrossProfit?: number;
  priorNetProfit?: number;
}

export interface BalanceSheetStatement {
  currentAssets: StatementRow[];
  totalCurrentAssets: number;
  nonCurrentAssets: StatementRow[];
  totalNonCurrentAssets: number;
  totalAssets: number;

  currentLiabilities: StatementRow[];
  totalCurrentLiabilities: number;
  nonCurrentLiabilities: StatementRow[];
  totalNonCurrentLiabilities: number;
  totalLiabilities: number;

  equityItems: StatementRow[];
  openingRetainedEarnings: number;
  currentYearProfit: number;
  totalEquity: number;

  totalLiabilitiesAndEquity: number;
  reconciliationDifference: number;
  isReconciled: boolean;
}

export interface ChangesInEquityStatement {
  openingOtherReserves?: number;
  otherComprehensiveIncome?: number;
  openingShareCapital: number;
  openingRetainedEarnings: number;
  openingTotal: number;
  netProfitForPeriod: number;
  shareCapitalMovements: number;
  dividendsPaid: number;
  closingShareCapital: number;
  closingRetainedEarnings: number;
  closingTotalEquity: number;
}

export interface CashFlowStatement {
  isAvailable: boolean;
  unavailableReason?: string;
  operatingActivities: StatementRow[];
  netCashFromOperating: number;
  investingActivities: StatementRow[];
  netCashFromInvesting: number;
  financingActivities: StatementRow[];
  netCashFromFinancing: number;
  netChangeInCash: number;
  openingCash: number;
  closingCashCalculated: number;
  closingCashBalanceSheet: number;
  cashReconciliationDifference: number;
  isCashReconciled: boolean;
}

export interface RatioItem {
  id: string;
  category: 'Liquidity' | 'Solvency' | 'Profitability' | 'Efficiency';
  name: string;
  formula: string;
  value: number | null;
  formattedValue: string;
  benchmark: string;
  status: 'good' | 'warning' | 'critical' | 'unavailable';
  explanation: string;
  missingDataWarning?: string;
}
