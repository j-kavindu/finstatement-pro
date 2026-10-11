import React from 'react';
import {
  LayoutDashboard,
  FileSpreadsheet,
  SlidersHorizontal,
  FileText,
  BarChart3,
  History,
  Building2,
  Calendar,
  Plus,
  RefreshCw,
  X,
} from 'lucide-react';
import { Company, ReportingPeriod } from '../../types/accounting';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  companies: Company[];
  selectedCompany: Company;
  onSelectCompany: (company: Company) => void;
  onNewCompany: () => void;
  periods: ReportingPeriod[];
  selectedPeriod: ReportingPeriod;
  onSelectPeriod: (period: ReportingPeriod) => void;
  onNewPeriod: () => void;
  onResetSampleData: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  companies,
  selectedCompany,
  onSelectCompany,
  onNewCompany,
  periods,
  selectedPeriod,
  onSelectPeriod,
  onNewPeriod,
  onResetSampleData,
  isMobileOpen,
  onCloseMobile,
}) => {
  const navItems = [
    { id: 'overview', label: 'Executive Overview', icon: LayoutDashboard },
    { id: 'trial-balance', label: 'Trial Balance & TB Import', icon: FileSpreadsheet },
    { id: 'adjustments', label: 'Adjusting Journal Entries', icon: SlidersHorizontal },
    { id: 'statements', label: 'Financial Statements (4 Primary)', icon: FileText },
    { id: 'ratios', label: 'Financial Ratio Analysis', icon: BarChart3 },
    { id: 'audit-log', label: 'Audit Activity & Snapshots', icon: History },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-xs"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 lg:top-[57px] left-0 h-screen lg:h-[calc(100vh-57px)] w-72 bg-[#0a1124] border-r border-slate-800/80 flex flex-col z-50 transition-transform duration-200 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Mobile Header */}
        <div className="flex items-center justify-between p-4 lg:hidden border-b border-slate-800">
          <span className="font-semibold text-white text-sm">FinStatement Pro</span>
          <button
            aria-label="Close workspace menu"
            onClick={onCloseMobile}
            className="p-1 text-slate-400 hover:text-white rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Company & Reporting Period Selector Section */}
        <div className="p-4 space-y-3.5 border-b border-slate-800/80">
          {/* Company Picker */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-400" />
                Company Entity
              </span>
              <button
                onClick={onNewCompany}
                title="Add Company"
                className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-0.5"
              >
                <Plus className="w-3 h-3" /> New
              </button>
            </div>
            <select
              aria-label="Company"
              value={selectedCompany.id}
              onChange={(e) => {
                const found = companies.find((c) => c.id === e.target.value);
                if (found) onSelectCompany(found);
              }}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-md px-2.5 py-1.5 text-xs text-white font-medium focus:outline-hidden focus:border-blue-500 truncate"
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.currency})
                </option>
              ))}
            </select>
          </div>

          {/* Period Picker */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                Reporting Period
              </span>
              <button
                onClick={onNewPeriod}
                title="New Accounting Period"
                className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-0.5"
              >
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>
            <select
              aria-label="Reporting period"
              value={selectedPeriod.id}
              onChange={(e) => {
                const found = periods.find((p) => p.id === e.target.value);
                if (found) onSelectPeriod(found);
              }}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-md px-2.5 py-1.5 text-xs text-white font-medium focus:outline-hidden focus:border-blue-500 truncate"
            >
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <div className="px-3 pt-2 pb-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            Accounting Workspace
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-colors text-left ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-300 border-l-2 border-blue-500'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border-l-2 border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-500'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer info & demo helper */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/40 space-y-2.5">
          <button
            onClick={onResetSampleData}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700/80 rounded-md border border-slate-700/60 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
            <span>Reload Demo Dataset</span>
          </button>

          <div className="text-[11px] text-slate-400 leading-relaxed">
            <div>Accounting & Finance Portfolio</div>
            <div className="text-slate-400">Decimal-safe & double-entry verified</div>
          </div>
        </div>
      </aside>
    </>
  );
};
