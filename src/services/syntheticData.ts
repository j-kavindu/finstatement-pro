/**
 * FinStatement Pro - Synthetic Demo Dataset
 * Realistic financial dataset with two comparative periods, contra accounts,
 * adjusting journal entries, and cash flow movements.
 */

import {
  Company,
  ReportingPeriod,
  TrialBalanceRow,
  AdjustingJournalEntry,
  SupplementaryCashFlowData,
  EquityMovementData,
} from '../types/accounting';

export const SAMPLE_COMPANY: Company = {
  id: 'comp-apex-tech',
  ownerId: 'demo-user',
  name: 'Apex Horizon Technologies Inc.',
  industry: 'Enterprise Software & Cloud Systems',
  currency: 'USD',
  reportingFramework: 'General-purpose draft',
  createdAt: '2025-01-01T08:00:00Z',
  updatedAt: '2025-12-31T20:00:00Z',
};

export const SAMPLE_PERIODS: ReportingPeriod[] = [
  {
    id: 'period-fy2025',
    companyId: 'comp-apex-tech',
    name: 'FY 2025 (Annual Ended Dec 31)',
    startDate: '2025-01-01',
    endDate: '2025-12-31',
    status: 'open',
    comparativePeriodId: 'period-fy2024',
  },
  {
    id: 'period-fy2024',
    companyId: 'comp-apex-tech',
    name: 'FY 2024 (Comparative Prior Year)',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    status: 'closed',
  },
];


// Synthetic FY2024 closed ledger and explicit FY2025 transactions. No balancing plug.
const definitions: [string, string, TrialBalanceRow['classification'], boolean, number][] = [
 ['1010','Cash and Cash Equivalents','current_asset',false,100000],
 ['1020','Accounts Receivable (Trade)','current_asset',false,20000],
 ['1030','Inventory','current_asset',false,30000],
 ['1040','Prepaid Insurance','current_asset',false,12000],
 ['1510','Property, Plant & Equipment','non_current_asset',false,100000],
 ['1520','Accumulated Depreciation - Equipment','non_current_asset',true,-20000],
 ['2010','Trade Accounts Payable','current_liability',false,-15000],
 ['2020','Accrued Payroll','current_liability',false,-5000],
 ['2030','Income Taxes Payable','current_liability',false,0],
 ['2510','Long-Term Bank Loan','non_current_liability',false,-40000],
 ['3010','Share Capital','equity',false,-100000],
 ['3020','Retained Earnings (Opening Balance)','equity',false,-82000],
 ['3030','Dividends Declared','equity',true,0],
 ['4010','Sales Revenue','revenue',false,0],
 ['5010','Cost of Sales','cogs',false,0],
 ['6010','Salaries Expense','operating_expense',false,0],
 ['6040','Insurance Expense','operating_expense',false,0],
 ['6050','Depreciation Expense','depreciation_expense',false,0],
 ['7010','Interest Expense','interest_expense',false,0],
 ['8010','Income Tax Expense','tax_expense',false,0],
];
function makeRows(balances: Map<string, number>): TrialBalanceRow[] {
 return definitions.map(([code,name,classification,isContra]) => {
  const net=balances.get(code) ?? 0;
  return { id:`tb-${code}`, accountId:`acc-${code}`,accountCode:code,accountName:name,classification,isContra,
   unadjustedDebit:Math.max(net,0),unadjustedCredit:Math.max(-net,0),adjustedDebit:Math.max(net,0),adjustedCredit:Math.max(-net,0),netDebitCredit:net };
 });
}
const opening = new Map(definitions.map(d=>[d[0],d[4]]));
export const SAMPLE_TB_FY2024 = makeRows(opening);
// Each transaction has debit/credit signed amounts whose sum is zero.
export const SAMPLE_TRANSACTIONS: [string, [string, number][]][] = [
 ['Sales: cash and credit', [['1010',180000],['1020',20000],['4010',-200000]]],
 ['Inventory purchases', [['1030',90000],['1010',-85000],['2010',-5000]]],
 ['Cost of inventory sold', [['5010',80000],['1030',-80000]]],
 ['Payroll paid', [['6010',48000],['1010',-48000]]],
 ['Interest paid', [['7010',4000],['1010',-4000]]],
 ['Tax expense paid', [['8010',8000],['1010',-8000]]],
 ['Equipment purchased for cash', [['1510',20000],['1010',-20000]]],
 ['Loan principal repayment', [['2510',10000],['1010',-10000]]],
 ['Dividends declared and paid', [['3030',5000],['1010',-5000]]],
];
const closing = new Map(opening);
for (const [description, lines] of SAMPLE_TRANSACTIONS) {
 if (lines.reduce((s,l)=>s+l[1],0)!==0) throw new Error(`Synthetic transaction unbalanced: ${description}`);
 for (const [code,amount] of lines) closing.set(code,(closing.get(code)??0)+amount);
}
export const SAMPLE_TB_FY2025=makeRows(closing);
function adjustment(id:string,description:string,dr:string,cr:string,amount:number): AdjustingJournalEntry {
 return { id, periodId:'period-fy2025',entryNumber:id,date:'2025-12-31',description,totalDebit:amount,totalCredit:amount,isBalanced:true,status:'posted',createdAt:'2025-12-31T18:00:00Z',
 lines:[dr,cr].map((code,i)=>({id:`${id}-${i}`,accountId:`acc-${code}`,accountCode:code,accountName:definitions.find(d=>d[0]===code)![1],debit:i===0?amount:0,credit:i===1?amount:0})) };
}
export const SAMPLE_ADJUSTMENTS_FY2025 = [
 adjustment('AJE-001','Annual depreciation per approved asset schedule','6050','1520',18500),
 adjustment('AJE-002','Unpaid December payroll accrual','6010','2020',2000),
 adjustment('AJE-003','Insurance consumed during the year','6040','1040',4500),
];
export const SAMPLE_SUPPLEMENTARY_FY2025: SupplementaryCashFlowData = {
 periodId:'period-fy2025',depreciationAmortization:18500,gainLossOnDisposal:0,interestExpense:4000,incomeTaxPaid:8000,interestPaid:4000,capexAdditions:20000,proceedsFromDisposal:0,debtIssued:0,debtRepaid:10000,sharesIssued:0,dividendsPaid:5000,
 notes:'Cash paid for capex, loan principal and dividends verified against synthetic transaction register. Interest and tax classified as operating.'
};
export const SAMPLE_EQUITY_FY2025: EquityMovementData = {
 periodId:'period-fy2025',openingShareCapital:100000,openingRetainedEarnings:82000,openingOtherReserves:0,shareIssuance:0,dividendsDeclared:5000,otherComprehensiveIncome:0
};
