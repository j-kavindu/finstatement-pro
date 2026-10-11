import React from 'react';
import {
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  HelpCircle,
} from 'lucide-react';
import { RatioItem, Company, ReportingPeriod } from '../../types/accounting';

interface RatiosViewProps {
  company: Company;
  period: ReportingPeriod;
  ratios: RatioItem[];
}

export const RatiosView: React.FC<RatiosViewProps> = ({ company, period, ratios }) => {
  const categories: Array<'Liquidity' | 'Solvency' | 'Profitability' | 'Efficiency'> = [
    'Liquidity',
    'Solvency',
    'Profitability',
    'Efficiency',
  ];

  const getStatusBadge = (status: RatioItem['status']) => {
    switch (status) {
      case 'good':
        return (
          <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded">
            <CheckCircle2 className="w-3 h-3" />
            <span>Optimal</span>
          </span>
        );
      case 'warning':
        return (
          <span className="flex items-center gap-1 text-[11px] font-medium text-amber-400 bg-amber-950/60 border border-amber-800/40 px-2 py-0.5 rounded">
            <AlertTriangle className="w-3 h-3" />
            <span>Caution</span>
          </span>
        );
      case 'critical':
        return (
          <span className="flex items-center gap-1 text-[11px] font-medium text-red-400 bg-red-950/60 border border-red-800/40 px-2 py-0.5 rounded">
            <AlertOctagon className="w-3 h-3" />
            <span>High Risk</span>
          </span>
        );
      case 'unavailable':
      default:
        return (
          <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400 bg-slate-800/80 border border-slate-700/60 px-2 py-0.5 rounded">
            <HelpCircle className="w-3 h-3" />
            <span>Incomplete Inputs</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">
            Financial Ratio Analysis & Diagnostics
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Indicators from draft financial statements of {company.name}. Benchmarks are illustrative; ROA/ROE use closing balances, not period averages.
          </p>
        </div>
      </div>

      {/* Ratios by Category */}
      <div className="space-y-6">
        {categories.map((category) => {
          const categoryRatios = ratios.filter((r) => r.category === category);
          if (categoryRatios.length === 0) return null;

          return (
            <div key={category} className="space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-800/80 pb-1.5">
                <BarChart3 className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold text-slate-200 tracking-wide uppercase">
                  {category} Ratios
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {categoryRatios.map((item) => (
                  <div
                    key={item.id}
                    className="bg-[#0f172a] border border-slate-800 rounded-lg p-4 space-y-3 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="font-semibold text-slate-200 text-sm">{item.name}</div>
                        {getStatusBadge(item.status)}
                      </div>

                      <div className="font-mono text-xs text-slate-400 bg-slate-900/80 px-2 py-1 rounded border border-slate-800">
                        {item.formula}
                      </div>
                    </div>

                    <div className="py-2 border-y border-slate-800/60 flex items-baseline justify-between">
                      <div className="text-2xl font-bold text-white font-mono" data-tabular>
                        {item.formattedValue}
                      </div>
                      <div className="text-xs text-slate-400">
                        Benchmark: <span className="font-mono text-slate-300 font-medium">{item.benchmark}</span>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {item.explanation}
                      </p>

                      {item.missingDataWarning && (
                        <div className="mt-2 text-[11px] text-amber-400 bg-amber-950/40 p-2 rounded border border-amber-900/40">
                          {item.missingDataWarning}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
