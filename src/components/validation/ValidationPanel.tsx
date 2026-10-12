import { CheckCircle2, AlertTriangle, CircleX, ArrowRight } from 'lucide-react';
import type { ReportCheck } from '../../services/reportValidation';
import { formatCurrency } from '../../services/accountingEngine';

export function ValidationPanel({ checks, currency, onReview }: { checks: ReportCheck[]; currency: string; onReview: () => void }) {
  const blocked = checks.filter(check => check.status === 'blocked').length;
  return <section className="mb-6 rounded-xl border border-slate-700/70 bg-gradient-to-br from-slate-900 to-[#0d1930] p-4 sm:p-5" aria-label="Reporting controls">
    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
      <div><p className="text-[10px] text-blue-400 font-bold tracking-[0.18em] uppercase mb-1">P01 / Reporting controls</p><h2 className="font-semibold text-sm text-slate-100">{blocked ? `${blocked} checks need attention` : 'Ready for draft review'}</h2></div>
      <button className="text-xs flex items-center gap-2 text-blue-300 hover:text-white" onClick={onReview}>Review statements <ArrowRight size={14}/></button>
    </div>
    <div className="grid grid-cols-2 xl:grid-cols-6 gap-2">
      {checks.map(check => <details key={check.id} className="rounded-lg bg-slate-950/40 border border-slate-800 p-3 group">
        <summary className="cursor-pointer list-none text-xs font-medium flex items-start gap-2">
          {check.status === 'pass' ? <CheckCircle2 size={15} className="text-emerald-400 shrink-0"/> : check.status === 'blocked' ? <CircleX size={15} className="text-rose-400 shrink-0"/> : <AlertTriangle size={15} className="text-amber-400 shrink-0"/>}
          <span>{check.title}<span className="block mt-1 text-[10px] text-slate-400 font-normal">{check.status === 'pass' ? 'Checked' : check.status === 'blocked' ? 'Action required' : 'Review needed'}</span></span>
        </summary>
        <p className="text-xs text-slate-400 mt-3 leading-relaxed">{check.detail}</p>
        {check.difference !== undefined && <p className="font-mono text-xs mt-2 break-all">Δ {formatCurrency(check.difference, currency)}</p>}
      </details>)}
    </div>
    <p className="text-[10px] text-slate-500 mt-3">Mathematical checks do not establish financial compliance. All reports remain drafts.</p>
  </section>;
}
