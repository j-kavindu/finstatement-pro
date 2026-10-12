import React, { useState } from 'react';
import {
  TrendingUp,
  Scale,
  DollarSign,
  PieChart,
  ArrowRight,
  Upload,
  FileText,
  SlidersHorizontal,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import {
  Company,
  ReportingPeriod,
  ProfitAndLossStatement,
  BalanceSheetStatement,
  CashFlowStatement,
} from '../../types/accounting';
import { formatCurrency, formatPercent } from '../../services/accountingEngine';

interface OverviewDashboardProps {
  company: Company;
  period: ReportingPeriod;
  pnl: ProfitAndLossStatement;
  bs: BalanceSheetStatement;
  cf: CashFlowStatement;
  isAdjustedBalanced: boolean;
  adjustedDifference: number;
  adjustmentsCount: number;
  onNavigateTab: (tab: string) => void;
  onOpenImport: () => void;
  onExportPDF: () => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  company,
  period,
  pnl,
  bs,
  cf,
  isAdjustedBalanced,
  adjustedDifference,
  adjustmentsCount,
  onNavigateTab,
  onOpenImport,
  onExportPDF,
}) => {
  const curr = company.currency;
  const [chartMode, setChartMode] = useState<'performance' | 'position'>('performance');
  const chartRows = chartMode === 'performance' ? [['Revenue',pnl.totalRevenue],['Gross profit',pnl.grossProfit],['Net profit',pnl.netProfit]] as const : [['Assets',bs.totalAssets],['Liabilities',bs.totalLiabilities],['Equity',bs.totalEquity]] as const;
  const chartMax = Math.max(1, ...chartRows.map(row=>Math.abs(row[1])));

  const grossMargin = pnl.totalRevenue > 0 ? pnl.grossProfit / pnl.totalRevenue : null;
  const netMargin = pnl.totalRevenue > 0 ? pnl.netProfit / pnl.totalRevenue : null;
  const currentRatio = bs.totalCurrentLiabilities > 0 ? bs.totalCurrentAssets / bs.totalCurrentLiabilities : null;

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="text-xs font-semibold text-blue-400 tracking-wider uppercase mb-1">
            Financial Reporting Workspace
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {company.name}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-1">
            <span>Period: {period.name}</span>
            <span aria-hidden="true">·</span>
            <span>Dates: {period.startDate} to {period.endDate}</span>
            <span aria-hidden="true">·</span>
            <span>Currency: {curr}</span>
            <span aria-hidden="true">·</span>
            <span>Presentation preference: {company.reportingFramework}</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={onOpenImport}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-md border border-slate-700 transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-blue-400" />
            <span>Import TB (CSV / XLSX)</span>
          </button>
          <button
            onClick={onExportPDF}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-md shadow-sm transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Executive PDF Report</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Revenue */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span>Total Net Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-white font-mono" data-tabular>
            {formatCurrency(pnl.totalRevenue, curr)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1.5">
            After sales returns & trade discounts
          </div>
        </div>

        {/* Metric 2: Gross Profit */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span>Gross Profit</span>
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl font-bold text-white font-mono" data-tabular>
            {formatCurrency(pnl.grossProfit, curr)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1.5">
            Gross Margin: <span className="text-slate-200 font-medium font-mono">{formatPercent(grossMargin)}</span>
          </div>
        </div>

        {/* Metric 3: Net Profit */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span>Net Profit / (Loss)</span>
            <PieChart className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl font-bold text-white font-mono" data-tabular>
            {formatCurrency(pnl.netProfit, curr)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1.5">
            Net Margin: <span className="text-slate-200 font-medium font-mono">{formatPercent(netMargin)}</span>
          </div>
        </div>

        {/* Metric 4: Balance Sheet Total Assets */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span>Total Assets</span>
            <Scale className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-bold text-white font-mono" data-tabular>
            {formatCurrency(bs.totalAssets, curr)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1.5">
            Current Ratio: <span className="text-slate-200 font-medium font-mono">{currentRatio ? `${currentRatio.toFixed(2)}x` : 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* Accounting Equation Health Banner */}
      <div
        className={`rounded-lg p-4 border ${
          bs.isReconciled && isAdjustedBalanced
            ? 'bg-slate-900/80 border-slate-700/80'
            : 'bg-amber-950/30 border-amber-800/80'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              {bs.isReconciled && isAdjustedBalanced ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              )}
            </div>
            <div>
              <div className="text-sm font-semibold text-white">
                Fundamental Accounting Equation:{' '}
                <span className="font-mono text-blue-300">Assets = Liabilities + Equity</span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                Total Assets{' '}
                <span className="font-mono font-medium text-slate-200">{formatCurrency(bs.totalAssets, curr)}</span>
                {' '}— Total Liabilities & Equity{' '}
                <span className="font-mono font-medium text-slate-200">{formatCurrency(bs.totalLiabilitiesAndEquity, curr)}</span>
                {' · '}
                Reconciliation Difference:{' '}
                <span
                  className={`font-mono font-medium ${
                    bs.isReconciled ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {formatCurrency(bs.reconciliationDifference, curr)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto text-xs">
            <span
              className={`px-2.5 py-1 rounded-md font-medium text-xs ${
                bs.isReconciled
                  ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50'
                  : 'bg-amber-950/60 text-amber-400 border border-amber-800/50'
              }`}
            >
              {bs.isReconciled ? '100% Balanced' : 'Unreconciled Difference'}
            </span>
            <button
              onClick={() => onNavigateTab('statements')}
              className="px-2.5 py-1 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-md border border-slate-700 flex items-center gap-1 transition-colors"
            >
              <span>View Balance Sheet</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      <section aria-label="Financial chart" className="bg-[#0f172a] border border-slate-800 rounded-lg p-5 space-y-4">
        <div className="flex flex-wrap gap-3 items-center"><h2 className="font-semibold">Financial snapshot</h2>
          <button aria-pressed={chartMode === 'performance'} onClick={()=>setChartMode('performance')} className="px-3 py-2 rounded bg-slate-800">Performance</button>
          <button aria-pressed={chartMode === 'position'} onClick={()=>setChartMode('position')} className="px-3 py-2 rounded bg-slate-800">Financial position</button>
        </div>
        {chartRows.map(([label,value])=><div key={label} className="space-y-1 text-sm"><div className="flex justify-between gap-3"><span>{label}</span><span>{formatCurrency(value,curr)}</span></div><div className="h-3 bg-slate-800 rounded"><div title={`${label}: ${formatCurrency(value,curr)}`} className={`h-3 rounded ${value < 0 ? 'bg-amber-500' : 'bg-blue-500'}`} style={{width:`${Math.abs(value)/chartMax*100}%`}} /></div></div>)}
      </section>
      {/* Grid of Accounting Subsystem Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel 1: Statement Readiness & Status */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-semibold text-white">Financial Statements Status</h2>
            <button
              onClick={() => onNavigateTab('statements')}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              <span>Open All Statements</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3 text-xs">
            {/* Statement of Profit or Loss */}
            <div className="flex items-center justify-between p-2.5 rounded-md bg-slate-900/60 border border-slate-800/80">
              <div>
                <div className="font-medium text-slate-200">1. Statement of Profit or Loss</div>
                <div className="text-slate-400 text-[11px]">Revenue, Cost of Sales & Operating Expenses</div>
              </div>
              <div className="text-right">
                <span className="font-mono font-semibold text-emerald-400">
                  {formatCurrency(pnl.netProfit, curr)}
                </span>
                <div className="text-[10px] text-slate-400">Net Profit</div>
              </div>
            </div>

            {/* Statement of Financial Position */}
            <div className="flex items-center justify-between p-2.5 rounded-md bg-slate-900/60 border border-slate-800/80">
              <div>
                <div className="font-medium text-slate-200">2. Statement of Financial Position</div>
                <div className="text-slate-400 text-[11px]">Assets, Liabilities and Equity Breakdown</div>
              </div>
              <div className="text-right">
                <span className="font-mono font-semibold text-blue-400">
                  {formatCurrency(bs.totalAssets, curr)}
                </span>
                <div className="text-[10px] text-slate-400">Balanced Net Assets</div>
              </div>
            </div>

            {/* Statement of Changes in Equity */}
            <div className="flex items-center justify-between p-2.5 rounded-md bg-slate-900/60 border border-slate-800/80">
              <div>
                <div className="font-medium text-slate-200">3. Statement of Changes in Equity</div>
                <div className="text-slate-400 text-[11px]">Opening Capital, Net Income Rollforward & Dividends</div>
              </div>
              <div className="text-right">
                <span className="font-mono font-semibold text-indigo-400">
                  {formatCurrency(bs.totalEquity, curr)}
                </span>
                <div className="text-[10px] text-slate-400">Ending Equity</div>
              </div>
            </div>

            {/* Statement of Cash Flows */}
            <div className="flex items-center justify-between p-2.5 rounded-md bg-slate-900/60 border border-slate-800/80">
              <div>
                <div className="font-medium text-slate-200">4. Statement of Cash Flows (Indirect Method)</div>
                <div className="text-slate-400 text-[11px]">
                  {cf.isAvailable ? 'Comparative operating, investing & financing flows' : 'Requires comparative period'}
                </div>
              </div>
              <div className="text-right">
                {cf.isAvailable ? (
                  <>
                    <span className="font-mono font-semibold text-emerald-400">
                      {formatCurrency(cf.netCashFromOperating, curr)}
                    </span>
                    <div className="text-[10px] text-slate-400">Operating Cash Flow</div>
                  </>
                ) : (
                  <span className="text-[11px] text-amber-400 font-medium">Comparative Required</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Panel 2: Double-Entry Audit & Adjustment Workflow */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-semibold text-white">Adjustments & General Ledger Health</h2>
            <button
              onClick={() => onNavigateTab('adjustments')}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              <span>Manage Journals</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between py-2 border-b border-slate-800/60">
              <span className="text-slate-400">Trial Balance Net Equilibrium</span>
              <span
                className={`font-mono font-semibold ${
                  isAdjustedBalanced ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {isAdjustedBalanced ? 'Balanced ($0.00 Diff)' : `Diff: ${formatCurrency(adjustedDifference, curr)}`}
              </span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-800/60">
              <span className="text-slate-400">Active Adjusting Entries</span>
              <span className="font-mono text-slate-200 font-semibold">{adjustmentsCount} Posted</span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-800/60">
              <span className="text-slate-400">Contra Account Deductions</span>
              <span className="text-slate-200">Preserved as negative asset/revenue reductions</span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-slate-400">Regulatory & Accounting Standard Note</span>
              <span className="text-slate-400 text-right max-w-xs">
                Accrual basis financial reporting engine. User review required prior to statutory filing.
              </span>
            </div>
          </div>

          <div className="pt-2 flex gap-2">
            <button
              onClick={() => onNavigateTab('adjustments')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-md border border-slate-700 transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
              <span>Review Adjusting Journals</span>
            </button>
            <button
              onClick={() => onNavigateTab('ratios')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-md border border-slate-700 transition-colors"
            >
              <PieChart className="w-3.5 h-3.5 text-blue-400" />
              <span>Explore Ratio Analysis</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
