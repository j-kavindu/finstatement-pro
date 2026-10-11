import React, { useState } from 'react';
import {
  FileText,
  Download,
  Printer,
  Scale,
  TrendingUp,
  PieChart,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Edit3,
} from 'lucide-react';
import {
  Company,
  ReportingPeriod,
  ProfitAndLossStatement,
  BalanceSheetStatement,
  ChangesInEquityStatement,
  CashFlowStatement,
  SupplementaryCashFlowData,
  EquityMovementData,
} from '../../types/accounting';
import { formatCurrency, formatPercent } from '../../services/accountingEngine';

interface StatementsContainerProps {
  company: Company;
  period: ReportingPeriod;
  comparativePeriod?: ReportingPeriod;
  pnl: ProfitAndLossStatement;
  bs: BalanceSheetStatement;
  eq: ChangesInEquityStatement;
  cf: CashFlowStatement;
  supplementary: SupplementaryCashFlowData | undefined;
  onUpdateSupplementary: (data: SupplementaryCashFlowData) => void;
  equityMovement: EquityMovementData | undefined;
  onUpdateEquityMovement: (data: EquityMovementData) => void;
  onExportPDF: () => void;
  onExportXLSX: () => void;
  onAuditAction: (action: string, details: string) => void;
}

export const StatementsContainer: React.FC<StatementsContainerProps> = ({
  company,
  period,
  comparativePeriod,
  pnl,
  bs,
  eq,
  cf,
  supplementary,
  onUpdateSupplementary,
  equityMovement,
  onUpdateEquityMovement,
  onExportPDF,
  onExportXLSX,
  onAuditAction,
}) => {
  const [activeStatement, setActiveStatement] = useState<
    'pnl' | 'balance-sheet' | 'equity' | 'cash-flow'
  >('pnl');

  const [isEditingSupplementary, setIsEditingSupplementary] = useState(false);
  const [suppForm, setSuppForm] = useState<SupplementaryCashFlowData>(
    supplementary || {
      periodId: period.id,
      depreciationAmortization: pnl.depreciationExpenses,
      gainLossOnDisposal: 0,
      interestExpense: pnl.interestExpense,
      incomeTaxPaid: 0,
      interestPaid: 0,
      capexAdditions: 0,
      proceedsFromDisposal: 0,
      debtIssued: 0,
      debtRepaid: 0,
      sharesIssued: 0,
      dividendsPaid: 0,
    }
  );

  const [editingEquity, setEditingEquity] = useState(false);
  const [equityForm, setEquityForm] = useState<EquityMovementData>(equityMovement ?? {periodId:period.id,openingShareCapital:0,openingRetainedEarnings:0,openingOtherReserves:0,shareIssuance:0,dividendsDeclared:0,otherComprehensiveIncome:0});
  const curr = company.currency;

  const handleSaveSupplementary = (e: React.FormEvent) => {
    e.preventDefault();
    if (period.status === 'closed') { alert('Closed periods cannot be edited'); return; }
    if (Object.entries(suppForm).some(([key,value]) => key !== 'periodId' && key !== 'notes' && (!Number.isFinite(value) || (key !== 'gainLossOnDisposal' && Number(value) < 0)))) { alert('Enter valid non-negative movements (disposal loss/gain may be signed).'); return; }
    onUpdateSupplementary({...suppForm, periodId:period.id});
    setIsEditingSupplementary(false);
    onAuditAction('Supplementary Data Saved', `Updated cash flow movement inputs for ${period.name}`);
  };

  return (
    <div className="space-y-6">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">
            Financial Statements Suite
          </h2>
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
            <span>Entity: {company.name}</span>
            <span aria-hidden="true">·</span>
            <span>Period: {period.name}</span>
            <span aria-hidden="true">·</span>
            <span>Framework: {company.reportingFramework}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap no-print">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-md border border-slate-700 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>

          <button
            onClick={onExportXLSX}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-md border border-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export XLSX</span>
          </button>

          <button
            onClick={onExportPDF}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-md shadow-xs transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Download PDF Packet</span>
          </button>
        </div>
      </div>

      {/* Segmented Tab Controls */}
      <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg overflow-x-auto text-xs no-print">
        <button
          onClick={() => setActiveStatement('pnl')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-md font-medium whitespace-nowrap transition-colors ${
            activeStatement === 'pnl'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Statement of Profit or Loss</span>
        </button>

        <button
          onClick={() => setActiveStatement('balance-sheet')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-md font-medium whitespace-nowrap transition-colors ${
            activeStatement === 'balance-sheet'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Scale className="w-3.5 h-3.5" />
          <span>Statement of Financial Position</span>
        </button>

        <button
          onClick={() => setActiveStatement('equity')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-md font-medium whitespace-nowrap transition-colors ${
            activeStatement === 'equity'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <PieChart className="w-3.5 h-3.5" />
          <span>Draft Statement of Changes in Equity</span>
        </button>

        <button
          onClick={() => setActiveStatement('cash-flow')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-md font-medium whitespace-nowrap transition-colors ${
            activeStatement === 'cash-flow'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Indirect Cash Flow Statement</span>
        </button>
      </div>

      {/* Print Statement Heading */}
      <div className="hidden print-only mb-6 border-b border-slate-300 pb-3">
        <h1 className="text-xl font-bold text-slate-900">{company.name}</h1>
        <div className="text-xs text-slate-600">
          Financial Statement Packet · Period: {period.name} · Currency: {curr}
        </div>
      </div>

      {/* 1. STATEMENT OF PROFIT OR LOSS */}
      {activeStatement === 'pnl' && (
        <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-6 space-y-6 print-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white">
                Statement of Profit or Loss (Income Statement)
              </h3>
              <p className="text-xs text-slate-400">
                For the period ended {period.endDate} (Expressed in {curr})
              </p>
            </div>
            <div className="text-xs text-slate-400">
              Gross Margin:{' '}
              <span className="font-mono text-emerald-400 font-semibold">
                {formatPercent(pnl.totalRevenue > 0 ? pnl.grossProfit / pnl.totalRevenue : null)}
              </span>
            </div>
          </div>

          <div className="space-y-4 text-xs font-sans">
            {/* Revenue Section */}
            <div>
              <div className="font-semibold text-slate-300 uppercase tracking-wider text-[11px] mb-2 text-blue-400">
                Revenue and other income (draft)
              </div>
              <div className="divide-y divide-slate-800/60">
                {pnl.revenueRows.map((r, i) => (
                  <div key={i} className="flex justify-between py-1.5 pl-3 text-slate-300">
                    <span>{r.label}</span>
                    <span className="font-mono tabular-nums">{formatCurrency(r.amount, curr)}</span>
                  </div>
                ))}
                <div className="flex justify-between py-2 font-bold text-white border-t border-slate-700">
                  <span>Total Net Revenue</span>
                  <span className="font-mono tabular-nums text-blue-300">
                    {formatCurrency(pnl.totalRevenue, curr)}
                  </span>
                </div>
              </div>
            </div>

            {(pnl.totalOtherIncome ?? 0) !== 0 && <div className="flex justify-between py-2"><span>Other income (included after gross profit)</span><span>{formatCurrency(pnl.totalOtherIncome ?? 0,curr)}</span></div>}
            {/* Cost of Sales Section */}
            <div>
              <div className="font-semibold text-slate-300 uppercase tracking-wider text-[11px] mb-2 text-blue-400">
                Cost of Goods Sold (COGS)
              </div>
              <div className="divide-y divide-slate-800/60">
                {pnl.cogsRows.map((r, i) => (
                  <div key={i} className="flex justify-between py-1.5 pl-3 text-slate-300">
                    <span>{r.label}</span>
                    <span className="font-mono tabular-nums">{formatCurrency(r.amount, curr)}</span>
                  </div>
                ))}
                <div className="flex justify-between py-2 font-semibold text-slate-200 border-t border-slate-700">
                  <span>Total Cost of Sales</span>
                  <span className="font-mono tabular-nums">
                    {formatCurrency(pnl.totalCogs, curr)}
                  </span>
                </div>
              </div>
            </div>

            {/* Gross Profit Subtotal */}
            <div className="p-3 bg-slate-900/90 rounded-md border border-slate-800 flex justify-between font-bold text-sm text-emerald-400">
              <span>Gross Profit</span>
              <span className="font-mono tabular-nums">{formatCurrency(pnl.grossProfit, curr)}</span>
            </div>

            {/* Operating Expenses */}
            <div>
              <div className="font-semibold text-slate-300 uppercase tracking-wider text-[11px] mb-2 text-blue-400">
                Operating & Administrative Expenses
              </div>
              <div className="divide-y divide-slate-800/60">
                {pnl.operatingExpenseRows.map((r, i) => (
                  <div key={i} className="flex justify-between py-1.5 pl-3 text-slate-300">
                    <span>{r.label}</span>
                    <span className="font-mono tabular-nums">{formatCurrency(r.amount, curr)}</span>
                  </div>
                ))}
                <div className="flex justify-between py-2 font-semibold text-slate-200 border-t border-slate-700">
                  <span>Total Operating Expenses</span>
                  <span className="font-mono tabular-nums">
                    {formatCurrency(pnl.totalOperatingExpenses, curr)}
                  </span>
                </div>
              </div>
            </div>

            {/* Operating Profit */}
            <div className="flex justify-between py-2 text-xs font-semibold text-slate-200 border-t border-slate-700">
              <span>Operating Profit / EBIT</span>
              <span className="font-mono tabular-nums text-slate-100">
                {formatCurrency(pnl.operatingProfit, curr)}
              </span>
            </div>

            {/* Finance and Taxes */}
            <div className="space-y-1.5 pl-3 text-slate-400 border-t border-slate-800/60 pt-2">
              <div className="flex justify-between">
                <span>Finance & Interest Costs</span>
                <span className="font-mono tabular-nums">
                  {formatCurrency(pnl.interestExpense, curr)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Corporate Income Tax Provision</span>
                <span className="font-mono tabular-nums">{formatCurrency(pnl.taxExpense, curr)}</span>
              </div>
            </div>

            {/* Net Profit Final Total */}
            <div className="p-3.5 bg-blue-950/40 border border-blue-800/60 rounded-md flex justify-between text-sm font-bold text-white">
              <span>Net Profit / (Loss) for the Period</span>
              <span className="font-mono tabular-nums text-blue-300">
                {formatCurrency(pnl.netProfit, curr)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 2. STATEMENT OF FINANCIAL POSITION (BALANCE SHEET) */}
      {activeStatement === 'balance-sheet' && (
        <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-6 space-y-6 print-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white">
                Statement of Financial Position (Balance Sheet)
              </h3>
              <p className="text-xs text-slate-400">
                As of {period.endDate} (Expressed in {curr})
              </p>
            </div>

            {/* Reconciliation Check Badge */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold ${
                bs.isReconciled
                  ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50'
                  : 'bg-amber-950/60 text-amber-400 border border-amber-800/50'
              }`}
            >
              {bs.isReconciled ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Reconciled: Assets = Liabilities + Equity</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4" />
                  <span>
                    Unreconciled Difference: {formatCurrency(bs.reconciliationDifference, curr)}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs">
            {/* Left Column: ASSETS */}
            <div className="space-y-4">
              <div className="text-sm font-bold text-blue-400 border-b border-slate-800 pb-1">
                ASSETS
              </div>

              {/* Current Assets */}
              <div>
                <div className="font-semibold text-slate-300 uppercase tracking-wider text-[11px] mb-2">
                  Current Assets
                </div>
                <div className="divide-y divide-slate-800/60">
                  {bs.currentAssets.map((r, i) => (
                    <div key={i} className="flex justify-between py-1.5 pl-3 text-slate-300">
                      <span>
                        {r.label}{' '}
                        {r.notes && <span className="text-[10px] text-slate-500">({r.notes})</span>}
                      </span>
                      <span className="font-mono tabular-nums">{formatCurrency(r.amount, curr)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2 font-semibold text-slate-200 border-t border-slate-700">
                    <span>Total Current Assets</span>
                    <span className="font-mono tabular-nums">
                      {formatCurrency(bs.totalCurrentAssets, curr)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Non-Current Assets */}
              <div>
                <div className="font-semibold text-slate-300 uppercase tracking-wider text-[11px] mb-2">
                  Non-Current Assets
                </div>
                <div className="divide-y divide-slate-800/60">
                  {bs.nonCurrentAssets.map((r, i) => (
                    <div key={i} className="flex justify-between py-1.5 pl-3 text-slate-300">
                      <span>
                        {r.label}{' '}
                        {r.notes && <span className="text-[10px] text-slate-500">({r.notes})</span>}
                      </span>
                      <span className="font-mono tabular-nums">{formatCurrency(r.amount, curr)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2 font-semibold text-slate-200 border-t border-slate-700">
                    <span>Total Non-Current Assets</span>
                    <span className="font-mono tabular-nums">
                      {formatCurrency(bs.totalNonCurrentAssets, curr)}
                    </span>
                  </div>
                </div>
              </div>

              {/* TOTAL ASSETS */}
              <div className="p-3 bg-slate-900 border border-slate-700 rounded-md flex justify-between font-bold text-sm text-white">
                <span>TOTAL ASSETS</span>
                <span className="font-mono tabular-nums text-blue-300">
                  {formatCurrency(bs.totalAssets, curr)}
                </span>
              </div>
            </div>

            {/* Right Column: LIABILITIES & EQUITY */}
            <div className="space-y-4">
              <div className="text-sm font-bold text-blue-400 border-b border-slate-800 pb-1">
                LIABILITIES & SHAREHOLDERS' EQUITY
              </div>

              {/* Current Liabilities */}
              <div>
                <div className="font-semibold text-slate-300 uppercase tracking-wider text-[11px] mb-2">
                  Current Liabilities
                </div>
                <div className="divide-y divide-slate-800/60">
                  {bs.currentLiabilities.map((r, i) => (
                    <div key={i} className="flex justify-between py-1.5 pl-3 text-slate-300">
                      <span>{r.label}</span>
                      <span className="font-mono tabular-nums">{formatCurrency(r.amount, curr)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2 font-semibold text-slate-200 border-t border-slate-700">
                    <span>Total Current Liabilities</span>
                    <span className="font-mono tabular-nums">
                      {formatCurrency(bs.totalCurrentLiabilities, curr)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Non-Current Liabilities */}
              <div>
                <div className="font-semibold text-slate-300 uppercase tracking-wider text-[11px] mb-2">
                  Non-Current Liabilities
                </div>
                <div className="divide-y divide-slate-800/60">
                  {bs.nonCurrentLiabilities.map((r, i) => (
                    <div key={i} className="flex justify-between py-1.5 pl-3 text-slate-300">
                      <span>{r.label}</span>
                      <span className="font-mono tabular-nums">{formatCurrency(r.amount, curr)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2 font-semibold text-slate-200 border-t border-slate-700">
                    <span>Total Non-Current Liabilities</span>
                    <span className="font-mono tabular-nums">
                      {formatCurrency(bs.totalNonCurrentLiabilities, curr)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Shareholders Equity */}
              <div>
                <div className="font-semibold text-slate-300 uppercase tracking-wider text-[11px] mb-2">
                  Shareholders' Equity
                </div>
                <div className="divide-y divide-slate-800/60">
                  {bs.equityItems.map((r, i) => (
                    <div key={i} className="flex justify-between py-1.5 pl-3 text-slate-300">
                      <span>{r.label}</span>
                      <span className="font-mono tabular-nums">{formatCurrency(r.amount, curr)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-1.5 pl-3 text-emerald-400 font-medium">
                    <span>Profit for the Current Reporting Period</span>
                    <span className="font-mono tabular-nums">
                      {formatCurrency(bs.currentYearProfit, curr)}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 font-semibold text-slate-200 border-t border-slate-700">
                    <span>Total Shareholders' Equity</span>
                    <span className="font-mono tabular-nums">
                      {formatCurrency(bs.totalEquity, curr)}
                    </span>
                  </div>
                </div>
              </div>

              {/* TOTAL LIABILITIES & EQUITY */}
              <div className="p-3 bg-slate-900 border border-slate-700 rounded-md flex justify-between font-bold text-sm text-white">
                <span>TOTAL LIABILITIES & EQUITY</span>
                <span className="font-mono tabular-nums text-blue-300">
                  {formatCurrency(bs.totalLiabilitiesAndEquity, curr)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. STATEMENT OF CHANGES IN EQUITY */}
      {activeStatement === 'equity' && (
        <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-6 space-y-6 print-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white">
                Draft Statement of Changes in Equity
              </h3>
              <button onClick={()=>setEditingEquity(!editingEquity)} className="px-3 py-2 bg-slate-800 rounded text-xs">Edit equity movements</button>
              <p className="text-xs text-slate-400">
                Opening balances, comprehensive income rollforward, and capital movements for {period.name}.
              </p>
            </div>
            <div className="text-xs text-slate-400">
              Ending Total Equity:{' '}
              <span className="font-mono text-blue-300 font-semibold">
                {formatCurrency(eq.closingTotalEquity, curr)}
              </span>
            </div>
          </div>

          {!equityMovement && <p className="text-amber-300 text-xs">Opening equity movements are missing. The displayed fallback uses account names and must be reviewed; enter actual opening balances.</p>}
          {eq.closingTotalEquity !== bs.totalEquity && <p role="alert" className="text-amber-300 text-xs">Equity rollforward does not reconcile to the balance sheet.</p>}
          {editingEquity && <form className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs" onSubmit={event=>{event.preventDefault();if(period.status === 'closed') {alert('Closed periods cannot be edited');return;}onUpdateEquityMovement({...equityForm,periodId:period.id});setEditingEquity(false);}}>
            {Object.entries(equityForm).filter(([key])=>key !== 'periodId').map(([key,value])=><label key={key}>{key.replace(/([A-Z])/g,' $1')}<input required aria-label={key} type="number" step="0.01" value={Number(value)} onChange={event=>setEquityForm({...equityForm,[key]:Number(event.target.value)})} className="block w-full p-2 bg-slate-900 border border-slate-700 rounded" /></label>)}
            <label><input type="checkbox" required /> Opening amounts and movements are verified; movements are already posted to the ledger.</label><button type="submit" className="bg-blue-600 p-2 rounded">Apply equity movements</button>
          </form>}
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-3">Equity Movement Component<br/><span className="normal-case">Opening reserves: {formatCurrency(eq.openingOtherReserves ?? 0,curr)}; OCI: {formatCurrency(eq.otherComprehensiveIncome ?? 0,curr)}</span></th>
                  <th className="py-2.5 px-3 text-right">Share Capital</th>
                  <th className="py-2.5 px-3 text-right">Retained Earnings</th>
                  <th className="py-2.5 px-3 text-right font-bold text-white">Total Equity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                <tr className="hover:bg-slate-800/30">
                  <td className="py-2.5 px-3 font-medium text-slate-200">
                    Balance at Beginning of Period ({period.startDate})
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono">
                    {formatCurrency(eq.openingShareCapital, curr)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono">
                    {formatCurrency(eq.openingRetainedEarnings, curr)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-100">
                    {formatCurrency(eq.openingTotal, curr)}
                  </td>
                </tr>

                <tr className="hover:bg-slate-800/30 text-emerald-400">
                  <td className="py-2.5 px-3 font-medium pl-6">
                    + Net Profit for the Reporting Period
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono">—</td>
                  <td className="py-2.5 px-3 text-right font-mono">
                    {formatCurrency(eq.netProfitForPeriod, curr)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold">
                    {formatCurrency(eq.netProfitForPeriod, curr)}
                  </td>
                </tr>

                <tr className="hover:bg-slate-800/30 text-slate-300">
                  <td className="py-2.5 px-3 font-medium pl-6">
                    + Shares Issued / Capital Raised
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono">
                    {eq.shareCapitalMovements > 0 ? formatCurrency(eq.shareCapitalMovements, curr) : '—'}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono">—</td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold">
                    {eq.shareCapitalMovements > 0 ? formatCurrency(eq.shareCapitalMovements, curr) : '—'}
                  </td>
                </tr>

                <tr className="hover:bg-slate-800/30 text-amber-400">
                  <td className="py-2.5 px-3 font-medium pl-6">
                    - Dividends Declared / Distributed to Shareholders
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono">—</td>
                  <td className="py-2.5 px-3 text-right font-mono">
                    {eq.dividendsPaid > 0 ? `(${formatCurrency(eq.dividendsPaid, curr)})` : '—'}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold">
                    {eq.dividendsPaid > 0 ? `(${formatCurrency(eq.dividendsPaid, curr)})` : '—'}
                  </td>
                </tr>
              </tbody>
              <tfoot className="bg-slate-900 border-t-2 border-slate-700 font-bold text-xs">
                <tr>
                  <td className="py-3 px-3 uppercase text-slate-200">
                    Balance at End of Period ({period.endDate})
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-white">
                    {formatCurrency(eq.closingShareCapital, curr)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-white">
                    {formatCurrency(eq.closingRetainedEarnings, curr)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-blue-300">
                    {formatCurrency(eq.closingTotalEquity, curr)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* 4. STATEMENT OF CASH FLOWS (INDIRECT METHOD) */}
      {activeStatement === 'cash-flow' && (
        <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-6 space-y-6 print-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Statement of Cash Flows (Indirect Method)
              </h3>
              <p className="text-xs text-slate-400">
                Governed by IAS 7 / ASC 230 guidelines. Derived exclusively with comparative periods and verified supplementary non-cash/movement disclosures.
              </p>
            </div>

            <div className="flex items-center gap-2 no-print">
              <button
                onClick={() => setIsEditingSupplementary(!isEditingSupplementary)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-md border border-slate-700 transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5 text-blue-400" />
                <span>Supplementary Data</span>
              </button>
            </div>
          </div>

          {/* If cash flow is unavailable because of lack of comparative statements */}
          {!cf.isAvailable ? (
            <div className="p-6 bg-slate-900 border border-amber-900/40 rounded-lg text-center space-y-3">
              <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
              <div className="text-sm font-semibold text-white">
                Indirect Cash Flow Statement Unavailable
              </div>
              <p className="max-w-lg mx-auto text-xs text-slate-400 leading-relaxed">
                {cf.unavailableReason}
              </p>
              <div className="text-[11px] text-slate-500 max-w-md mx-auto">
                To generate this statement, please select a reporting period with a comparative prior period (e.g. FY2025 with FY2024 comparative in our demo dataset).
              </div>
            </div>
          ) : (
            <div className="space-y-5 text-xs font-sans">
              {/* Cash Reconciliation Status */}
              <div
                className={`flex items-center justify-between p-3 rounded-md border ${
                  cf.isCashReconciled
                    ? 'bg-slate-900/60 border-emerald-800/50 text-emerald-400'
                    : 'bg-amber-950/30 border-amber-800/50 text-amber-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    Cash Flow Reconciliation: Calculated closing cash matches Balance Sheet Cash balance.
                  </span>
                </div>
                <div className="font-mono font-semibold">
                  Diff: {formatCurrency(cf.cashReconciliationDifference, curr)}
                </div>
              </div>

              {/* 1. Operating Activities */}
              <div>
                <div className="font-semibold text-slate-300 uppercase tracking-wider text-[11px] mb-2 text-blue-400">
                  1. Cash Flows from Operating Activities
                </div>
                <div className="divide-y divide-slate-800/60">
                  {cf.operatingActivities.map((r, i) => (
                    <div key={i} className="flex justify-between py-1.5 pl-3 text-slate-300">
                      <span>{r.label}</span>
                      <span className="font-mono tabular-nums">{formatCurrency(r.amount, curr)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2 font-bold text-white border-t border-slate-700">
                    <span>Net Cash Provided by Operating Activities</span>
                    <span className="font-mono tabular-nums text-emerald-400">
                      {formatCurrency(cf.netCashFromOperating, curr)}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Investing Activities */}
              <div>
                <div className="font-semibold text-slate-300 uppercase tracking-wider text-[11px] mb-2 text-blue-400">
                  2. Cash Flows from Investing Activities
                </div>
                <div className="divide-y divide-slate-800/60">
                  {cf.investingActivities.length === 0 ? (
                    <div className="py-1.5 pl-3 text-slate-500 italic">No capital investments reported in supplementary disclosures</div>
                  ) : (
                    cf.investingActivities.map((r, i) => (
                      <div key={i} className="flex justify-between py-1.5 pl-3 text-slate-300">
                        <span>{r.label}</span>
                        <span className="font-mono tabular-nums">{formatCurrency(r.amount, curr)}</span>
                      </div>
                    ))
                  )}
                  <div className="flex justify-between py-2 font-bold text-white border-t border-slate-700">
                    <span>Net Cash Used in Investing Activities</span>
                    <span className="font-mono tabular-nums text-slate-200">
                      {formatCurrency(cf.netCashFromInvesting, curr)}
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. Financing Activities */}
              <div>
                <div className="font-semibold text-slate-300 uppercase tracking-wider text-[11px] mb-2 text-blue-400">
                  3. Cash Flows from Financing Activities
                </div>
                <div className="divide-y divide-slate-800/60">
                  {cf.financingActivities.length === 0 ? (
                    <div className="py-1.5 pl-3 text-slate-500 italic">No financing debt or equity movements in period</div>
                  ) : (
                    cf.financingActivities.map((r, i) => (
                      <div key={i} className="flex justify-between py-1.5 pl-3 text-slate-300">
                        <span>{r.label}</span>
                        <span className="font-mono tabular-nums">{formatCurrency(r.amount, curr)}</span>
                      </div>
                    ))
                  )}
                  <div className="flex justify-between py-2 font-bold text-white border-t border-slate-700">
                    <span>Net Cash Used in Financing Activities</span>
                    <span className="font-mono tabular-nums text-slate-200">
                      {formatCurrency(cf.netCashFromFinancing, curr)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Net Cash Change and Reconciled Closing Cash */}
              <div className="p-4 bg-slate-900 border border-slate-700 rounded-lg space-y-2 font-semibold">
                <div className="flex justify-between text-white">
                  <span>Net Increase / (Decrease) in Cash & Cash Equivalents</span>
                  <span className="font-mono tabular-nums text-blue-300">
                    {formatCurrency(cf.netChangeInCash, curr)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400 text-xs">
                  <span>Cash & Cash Equivalents at Beginning of Period</span>
                  <span className="font-mono tabular-nums">
                    {formatCurrency(cf.openingCash, curr)}
                  </span>
                </div>
                <div className="flex justify-between text-white pt-2 border-t border-slate-800 text-sm">
                  <span>Cash & Cash Equivalents at End of Period (Calculated)</span>
                  <span className="font-mono tabular-nums text-emerald-400">
                    {formatCurrency(cf.closingCashCalculated, curr)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400 text-xs">
                  <span>Cash on Statement of Financial Position (Balance Sheet Verification)</span>
                  <span className="font-mono tabular-nums">
                    {formatCurrency(cf.closingCashBalanceSheet, curr)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Supplementary movement inputs modal / drawer */}
          {isEditingSupplementary && (
            <div className="p-4 bg-slate-900 border border-slate-700 rounded-lg space-y-4 text-xs no-print">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="font-bold text-white">
                  Supplementary Non-Cash & Movement Disclosures ({period.name})
                </div>
                <button
                  onClick={() => setIsEditingSupplementary(false)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveSupplementary} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.entries(suppForm).filter(([key])=>key !== 'periodId' && key !== 'notes').map(([key,value])=><label key={key} className="text-slate-400 text-xs">{key.replace(/([A-Z])/g,' $1')}<input aria-label={key} required type="number" step="0.01" min={key === 'gainLossOnDisposal' ? undefined : 0} value={Number(value)} onChange={event=>setSuppForm({...suppForm,[key]:Number(event.target.value)})} className="block w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono" /></label>)}
                <label className="sm:col-span-2 text-xs text-amber-300"><input type="checkbox" required /> I verified every movement against source records, including amounts entered as zero. Interest and tax are operating cash flows under this draft policy.</label>
                <div className="sm:col-span-2 flex justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsEditingSupplementary(false)}
                    className="px-3 py-1.5 text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-md"
                  >
                    Save Disclosures
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
