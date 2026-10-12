/**
 * FinStatement Pro - Financial Statement Export Service
 * Multi-format export: CSV, Excel (XLSX), and Executive PDF Reports.
 */

import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  TrialBalanceRow,
  ProfitAndLossStatement,
  BalanceSheetStatement,
  ChangesInEquityStatement,
  CashFlowStatement,
  RatioItem,
  Company,
  ReportingPeriod,
} from '../types/accounting';
import { ReportCheck, assertReportReady } from './reportValidation';
import { formatCurrency, formatPercent, sumMoney } from './accountingEngine';

export function csvCell(value: string): string {
  const safe = /^[=+@-]/.test(value) ? "'" + value : value;
  return '"' + safe.replace(/"/g, '""') + '"';
}

export function downloadCSV(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportTrialBalanceCSV(
  company: Company,
  period: ReportingPeriod,
  rows: TrialBalanceRow[]
) {
  const headers = [
    'Account Code',
    'Account Name',
    'Classification',
    'Is Contra',
    'Unadjusted Debit',
    'Unadjusted Credit',
    'Adjusted Debit',
    'Adjusted Credit',
  ];

  const lines = [
    csvCell(`${company.name} - Trial Balance`),
    csvCell(`Period: ${period.name} (${period.startDate} to ${period.endDate})`),
    csvCell(`Currency: ${company.currency} | DRAFT — not independently reviewed`),
    '',
    headers.join(','),
  ];

  rows.forEach((r) => {
    lines.push(
      [
        csvCell(r.accountCode),
        csvCell(r.accountName),
        csvCell(r.classification),
        r.isContra ? 'TRUE' : 'FALSE',
        r.unadjustedDebit.toFixed(2),
        r.unadjustedCredit.toFixed(2),
        r.adjustedDebit.toFixed(2),
        r.adjustedCredit.toFixed(2),
      ].join(',')
    );
  });

  const totalUnadjDr = sumMoney(rows.map(r => r.unadjustedDebit));
  const totalUnadjCr = sumMoney(rows.map(r => r.unadjustedCredit));
  const totalAdjDr = sumMoney(rows.map(r => r.adjustedDebit));
  const totalAdjCr = sumMoney(rows.map(r => r.adjustedCredit));

  lines.push('');
  lines.push(
    [
      '"TOTAL"',
      '""',
      '""',
      '""',
      totalUnadjDr.toFixed(2),
      totalUnadjCr.toFixed(2),
      totalAdjDr.toFixed(2),
      totalAdjCr.toFixed(2),
    ].join(',')
  );

  downloadCSV(`${company.name.replace(/\s+/g, '_')}_TB_${period.name}.csv`, lines.join('\r\n'));
}

export function exportFullFinancialWorkbookXLSX(
  company: Company,
  period: ReportingPeriod,
  rows: TrialBalanceRow[],
  pnl: ProfitAndLossStatement,
  bs: BalanceSheetStatement,
  eq: ChangesInEquityStatement,
  cf: CashFlowStatement,
  ratios: RatioItem[],
  checks: ReportCheck[] = []
) {
  assertReportReady(checks);
  if (!rows.length || sumMoney(rows.flatMap(row => [row.adjustedDebit, -row.adjustedCredit])) !== 0) throw new Error('Trial balance must balance before statement export');
  assertStatementsReconcile(bs, eq);
  const wb = XLSX.utils.book_new();
  if (checks.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['Status', 'DRAFT - mathematical checks only; no compliance certification'],
    ['Control', 'Result', 'Difference', 'Explanation'],
    ...checks.map(check => [check.title, check.status, check.difference ?? '', check.detail])
  ]), 'Validation');

  // Sheet 1: Trial Balance
  const tbData = [
    ['Company', company.name],
    ['Period', period.name],
    ['Currency', company.currency],
    ['Status', 'DRAFT - not independently reviewed'],
    [],
    ['Code', 'Account Name', 'Classification', 'Contra?', 'Unadj Debit', 'Unadj Credit', 'Adj Debit', 'Adj Credit'],
    ...rows.map((r) => [
      r.accountCode,
      r.accountName,
      r.classification,
      r.isContra ? 'Yes' : 'No',
      r.unadjustedDebit,
      r.unadjustedCredit,
      r.adjustedDebit,
      r.adjustedCredit,
    ]),
  ];
  const wsTB = XLSX.utils.aoa_to_sheet(tbData);
  XLSX.utils.book_append_sheet(wb, wsTB, 'Trial Balance');

  // Sheet 2: Statement of Profit or Loss
  const pnlData = [
    ['Company', company.name],
    ['Statement of Profit or Loss', period.name],
    ['Currency', company.currency],
    ['Status', 'DRAFT - not independently reviewed'],
    [],
    ['Item / Account', 'Amount'],
    ['--- REVENUE ---', ''],
    ...pnl.revenueRows.map((r) => [r.label, r.amount]),
    ['Total Revenue', pnl.totalRevenue],
    [],
    ['--- COST OF GOODS SOLD ---', ''],
    ...pnl.cogsRows.map((r) => [r.label, r.amount]),
    ['Total Cost of Goods Sold', pnl.totalCogs],
    ['GROSS PROFIT', pnl.grossProfit],
    [],
    ['--- OPERATING EXPENSES ---', ''],
    ...pnl.operatingExpenseRows.map((r) => [r.label, r.amount]),
    ['Total Operating Expenses', pnl.totalOperatingExpenses],
    ['OPERATING PROFIT (EBIT)', pnl.operatingProfit],
    ['Interest Expense', pnl.interestExpense],
    ['Tax Expense', pnl.taxExpense],
    ['NET PROFIT / (LOSS) FOR PERIOD', pnl.netProfit],
  ];
  const wsPnL = XLSX.utils.aoa_to_sheet(pnlData);
  XLSX.utils.book_append_sheet(wb, wsPnL, 'Profit and Loss');

  // Sheet 3: Statement of Financial Position
  const bsData = [
    ['Company', company.name],
    ['Statement of Financial Position', period.name],
    ['Currency', company.currency],
    ['Status', 'DRAFT - not independently reviewed'],
    [],
    ['Item / Account', 'Amount'],
    ['--- CURRENT ASSETS ---', ''],
    ...bs.currentAssets.map((r) => [r.label + (r.notes ? ` (${r.notes})` : ''), r.amount]),
    ['Total Current Assets', bs.totalCurrentAssets],
    [],
    ['--- NON-CURRENT ASSETS ---', ''],
    ...bs.nonCurrentAssets.map((r) => [r.label + (r.notes ? ` (${r.notes})` : ''), r.amount]),
    ['Total Non-Current Assets', bs.totalNonCurrentAssets],
    ['TOTAL ASSETS', bs.totalAssets],
    [],
    ['--- CURRENT LIABILITIES ---', ''],
    ...bs.currentLiabilities.map((r) => [r.label, r.amount]),
    ['Total Current Liabilities', bs.totalCurrentLiabilities],
    [],
    ['--- NON-CURRENT LIABILITIES ---', ''],
    ...bs.nonCurrentLiabilities.map((r) => [r.label, r.amount]),
    ['Total Non-Current Liabilities', bs.totalNonCurrentLiabilities],
    ['TOTAL LIABILITIES', bs.totalLiabilities],
    [],
    ['--- EQUITY ---', ''],
    ...bs.equityItems.map((r) => [r.label, r.amount]),
    ['Net Profit for Current Period', bs.currentYearProfit],
    ['TOTAL EQUITY', bs.totalEquity],
    [],
    ['TOTAL LIABILITIES AND EQUITY', bs.totalLiabilitiesAndEquity],
    ['Reconciliation Difference', bs.reconciliationDifference],
    ['Balanced Status', bs.isReconciled ? 'Reconciled (OK)' : 'UNRECONCILED WARNING'],
  ];
  const wsBS = XLSX.utils.aoa_to_sheet(bsData);
  XLSX.utils.book_append_sheet(wb, wsBS, 'Financial Position');

  // Sheet 4: Statement of Changes in Equity
  const eqData = [
    ['Company', company.name],
    ['Statement of Changes in Equity', period.name],
    [],
    ['Line Item', 'Share Capital', 'Retained Earnings', 'Other Reserves', 'Total Equity'],
    ['Opening Balance', eq.openingShareCapital, eq.openingRetainedEarnings, eq.openingOtherReserves ?? 0, eq.openingTotal],
    ['Net Profit for Period', 0, eq.netProfitForPeriod, 0, eq.netProfitForPeriod],
    ['Shares Issued / Capital Raised', eq.shareCapitalMovements, 0, 0, eq.shareCapitalMovements],
    ['Dividends Declared', 0, -eq.dividendsPaid, 0, -eq.dividendsPaid],
    ['Other comprehensive income', 0, 0, eq.otherComprehensiveIncome ?? 0, eq.otherComprehensiveIncome ?? 0],
    ['Closing Balance', eq.closingShareCapital, eq.closingRetainedEarnings, sumMoney([eq.openingOtherReserves ?? 0, eq.otherComprehensiveIncome ?? 0]), eq.closingTotalEquity],
  ];
  const wsEQ = XLSX.utils.aoa_to_sheet(eqData);
  XLSX.utils.book_append_sheet(wb, wsEQ, 'Changes in Equity');

  // Sheet 5: Indirect Cash Flow
  if (cf.isAvailable) {
    const cfData = [
      ['Company', company.name],
      ['Currency', company.currency],
      ['Status', 'DRAFT - not independently reviewed'],
      ['Statement of Cash Flows (Indirect Method)', period.name],
      [],
      ['Cash Flow Category / Item', 'Amount'],
      ['--- CASH FROM OPERATING ACTIVITIES ---', ''],
      ...cf.operatingActivities.map((r) => [r.label, r.amount]),
      ['Net Cash from Operating Activities', cf.netCashFromOperating],
      [],
      ['--- CASH FROM INVESTING ACTIVITIES ---', ''],
      ...cf.investingActivities.map((r) => [r.label, r.amount]),
      ['Net Cash from Investing Activities', cf.netCashFromInvesting],
      [],
      ['--- CASH FROM FINANCING ACTIVITIES ---', ''],
      ...cf.financingActivities.map((r) => [r.label, r.amount]),
      ['Net Cash from Financing Activities', cf.netCashFromFinancing],
      [],
      ['Net Increase / (Decrease) in Cash', cf.netChangeInCash],
      ['Cash at Beginning of Period', cf.openingCash],
      ['Cash at End of Period (Calculated)', cf.closingCashCalculated],
      ['Cash at End of Period (Balance Sheet)', cf.closingCashBalanceSheet],
      ['Cash Reconciliation Difference', cf.cashReconciliationDifference],
    ];
    const wsCF = XLSX.utils.aoa_to_sheet(cfData);
    XLSX.utils.book_append_sheet(wb, wsCF, 'Cash Flows');
  }

  // Sheet 6: Ratios
  const ratioData = [
    ['Company', company.name],
    ['Financial Ratio Analysis', period.name],
    [],
    ['Category', 'Ratio Name', 'Formula', 'Value', 'Benchmark', 'Status', 'Explanation'],
    ...ratios.map((r) => [
      r.category,
      r.name,
      r.formula,
      r.formattedValue,
      r.benchmark,
      r.status,
      r.explanation,
    ]),
  ];
  const wsRatios = XLSX.utils.aoa_to_sheet(ratioData);
  XLSX.utils.book_append_sheet(wb, wsRatios, 'Ratios');

  XLSX.writeFile(wb, `${company.name.replace(/\s+/g, '_')}_Financial_Statements_${period.name}.xlsx`);
}

export function exportExecutivePDF(
  company: Company,
  period: ReportingPeriod,
  pnl: ProfitAndLossStatement,
  bs: BalanceSheetStatement,
  eq: ChangesInEquityStatement,
  cf: CashFlowStatement,
  ratios: RatioItem[],
  checks: ReportCheck[] = []
) {
  assertReportReady(checks);
  assertStatementsReconcile(bs, eq);
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const curr = company.currency;

  // Header
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('FinStatement Pro | Executive Financial Report Packet', 14, 15);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 160, 15);

  // Entity Details
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(doc.splitTextToSize(company.name.slice(0, 80), 180)[0], 14, 34);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Period: ${period.startDate} to ${period.endDate} | Currency: ${curr} | DRAFT - not reviewed`,
    14,
    40
  );

  doc.setDrawColor(226, 232, 240);
  doc.line(14, 44, 196, 44);

  // Table 1: Statement of Profit or Loss Summary
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('1. DRAFT Statement of Profit or Loss', 14, 52);

  const pnlRows = [
    ['Total Revenue', formatCurrency(pnl.totalRevenue, curr)],
    ['Cost of Goods Sold', formatCurrency(pnl.totalCogs, curr)],
    ['Gross Profit', formatCurrency(pnl.grossProfit, curr)],
    ['Other income', formatCurrency(pnl.totalOtherIncome ?? 0, curr)],
    ['Operating Expenses (excluding interest and tax)', formatCurrency(pnl.totalOperatingExpenses - pnl.interestExpense - pnl.taxExpense, curr)],
    ['Operating Profit (EBIT)', formatCurrency(pnl.operatingProfit, curr)],
    ['Interest & Tax Expense', formatCurrency(pnl.interestExpense + pnl.taxExpense, curr)],
    ['Net Profit / (Loss)', formatCurrency(pnl.netProfit, curr)],
  ];

  autoTable(doc, {
    startY: 55,
    margin: { left: 14, right: 14 },
    head: [['Line Item', 'Amount']],
    body: pnlRows,
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 8.5, cellPadding: 2 },
    columnStyles: { 1: { halign: 'right' } },
  });

  // Table 2: Statement of Financial Position Summary
  const lastY1 = (doc as any).lastAutoTable.finalY + 8;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('2. Statement of Financial Position', 14, lastY1);

  const bsRows = [
    ['Current Assets', formatCurrency(bs.totalCurrentAssets, curr)],
    ['Non-Current Assets (Net)', formatCurrency(bs.totalNonCurrentAssets, curr)],
    ['TOTAL ASSETS', formatCurrency(bs.totalAssets, curr)],
    ['Current Liabilities', formatCurrency(bs.totalCurrentLiabilities, curr)],
    ['Non-Current Liabilities', formatCurrency(bs.totalNonCurrentLiabilities, curr)],
    ['TOTAL LIABILITIES', formatCurrency(bs.totalLiabilities, curr)],
    ['Total Shareholders Equity', formatCurrency(bs.totalEquity, curr)],
    ['TOTAL LIABILITIES & EQUITY', formatCurrency(bs.totalLiabilitiesAndEquity, curr)],
    ['Reconciliation Status', bs.isReconciled ? 'RECONCILED (Assets = Liab + Eq)' : 'UNRECONCILED DIFFERENCE!'],
  ];

  autoTable(doc, {
    startY: lastY1 + 3,
    margin: { left: 14, right: 14 },
    head: [['Balance Sheet Category', 'Amount']],
    body: bsRows,
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 8.5, cellPadding: 2 },
    columnStyles: { 1: { halign: 'right' } },
  });

  // Page 2: Cash Flow, Equity & Ratios
  doc.addPage();

  // Header on Page 2
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 16, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('FinStatement Pro | Supplementary Statements & Financial Ratio Analysis', 14, 11);

  // Table 3: Statement of Changes in Equity
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('3. Statement of Changes in Equity', 14, 25);

  const eqRows = [
    ['Opening Total Equity', formatCurrency(eq.openingTotal, curr)],
    ['Net Profit for Current Period', formatCurrency(eq.netProfitForPeriod, curr)],
    ['Share Capital Issuances', formatCurrency(eq.shareCapitalMovements, curr)],
    ['Dividends declared', `(${formatCurrency(eq.dividendsPaid, curr)})`],
    ['Opening other reserves (included in opening total)', formatCurrency(eq.openingOtherReserves ?? 0, curr)],
    ['Other comprehensive income', formatCurrency(eq.otherComprehensiveIncome ?? 0, curr)],
    ['Closing Total Equity', formatCurrency(eq.closingTotalEquity, curr)],
  ];

  autoTable(doc, {
    startY: 28,
    margin: { left: 14, right: 14 },
    head: [['Equity Movement Item', 'Amount']],
    body: eqRows,
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
    styles: { fontSize: 8.5, cellPadding: 2 },
    columnStyles: { 1: { halign: 'right' } },
  });

  // Table 4: Key Ratios
  const lastY2 = (doc as any).lastAutoTable.finalY + 8;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('4. Financial Ratio Analysis', 14, lastY2);

  const ratioRows = ratios.map((r) => [
    r.name,
    r.formula,
    r.formattedValue,
    r.benchmark,
    r.status.toUpperCase(),
  ]);

  autoTable(doc, {
    startY: lastY2 + 3,
    margin: { left: 14, right: 14 },
    head: [['Ratio', 'Formula', 'Result', 'Benchmark', 'Evaluation']],
    body: ratioRows,
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: { 2: { halign: 'right' }, 4: { halign: 'center' } },
  });

  // Dedicated cash flow page; missing movements are reported, never fabricated.
  doc.addPage();
  doc.setFontSize(12); doc.setTextColor(15, 23, 42);
  doc.text('5. DRAFT Statement of Cash Flows - Indirect Method', 14, 20);
  doc.setFontSize(9);
  doc.text(`${company.name.slice(0,70)} | ${period.startDate} to ${period.endDate} | ${curr}`, 14, 28);
  const cashRows = cf.isAvailable ? [
    ['OPERATING ACTIVITIES',''],
    ...cf.operatingActivities.map(row=>[row.label,formatCurrency(row.amount,curr)]),
    ['Net operating cash flow',formatCurrency(cf.netCashFromOperating,curr)],
    ['INVESTING ACTIVITIES',''],
    ...cf.investingActivities.map(row=>[row.label,formatCurrency(row.amount,curr)]),
    ['Net investing cash flow',formatCurrency(cf.netCashFromInvesting,curr)],
    ['FINANCING ACTIVITIES',''],
    ...cf.financingActivities.map(row=>[row.label,formatCurrency(row.amount,curr)]),
    ['Net financing cash flow',formatCurrency(cf.netCashFromFinancing,curr)],
    ['Net change in cash',formatCurrency(cf.netChangeInCash,curr)],
    ['Opening cash',formatCurrency(cf.openingCash,curr)],
    ['Calculated closing cash',formatCurrency(cf.closingCashCalculated,curr)],
    ['Balance sheet cash',formatCurrency(cf.closingCashBalanceSheet,curr)],
    ['Reconciliation difference',formatCurrency(cf.cashReconciliationDifference,curr)],
    ['Status',cf.isCashReconciled ? 'Mathematically reconciled - DRAFT' : 'UNRECONCILED - review source movements']
  ] : [['Unavailable',cf.unavailableReason ?? 'Additional verified source data required']];
  autoTable(doc,{startY:34,head:[['Cash flow item','Amount / status']],body:cashRows,theme:'grid',headStyles:{fillColor:[30,41,59]},styles:{fontSize:8,cellPadding:2},columnStyles:{1:{halign:'right'}}});

  // Footer Disclaimer
  const lastY3 = (doc as any).lastAutoTable.finalY + 12;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(
    'Disclaimer: FinStatement Pro is an accounting calculation and financial reporting engine designed for financial analysis. The figures presented reflect input trial balance balances and journal adjustments. This document does not constitute an audit opinion or automatic IFRS/GAAP regulatory certification without statutory CPA review.',
    14,
    lastY3,
    { maxWidth: 182 }
  );

  if (checks.length) {
    doc.addPage();
    doc.setFontSize(14); doc.text('DRAFT - Reporting controls', 14, 20);
    autoTable(doc, { startY: 28, head: [['Control', 'Status', 'Difference', 'Review note']], body: checks.map(check => [check.title, check.status, check.difference === undefined ? 'N/A' : formatCurrency(check.difference, curr), check.detail]), styles: { fontSize: 8 }, columnStyles: { 3: { cellWidth: 90 } } });
  }
  doc.save(`${company.name.replace(/\s+/g, '_')}_Financial_Report_${period.name}.pdf`);
}

export function assertStatementsReconcile(bs: BalanceSheetStatement, eq: ChangesInEquityStatement) {
  if (sumMoney([bs.totalAssets, -bs.totalLiabilities, -bs.totalEquity]) !== 0) throw new Error('Financial position does not reconcile');
  if (sumMoney([eq.closingTotalEquity, -bs.totalEquity]) !== 0) throw new Error('Equity movement does not reconcile');
}
