import React from 'react';
import { Download, ShieldCheck, User as UserIcon, LogOut, CheckCircle2 } from 'lucide-react';
import { User } from 'firebase/auth';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  currentUser: User | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  onExportWorkbook: () => void;
  isReconciled: boolean;
  onOpenTests: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  currentUser,
  onOpenAuth,
  onLogout,
  onExportWorkbook,
  isReconciled,
  onOpenTests,
}) => {
  const navItems = [
    { id: 'overview', label: 'Overview' },
    { id: 'trial-balance', label: 'Trial Balance' },
    { id: 'adjustments', label: 'Adjustments' },
    { id: 'statements', label: 'Statements' },
    { id: 'ratios', label: 'Ratios' },
    { id: 'audit-log', label: 'Audit Trail' },
  ];

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-2 sm:gap-4 px-3 sm:px-6 py-3.5 bg-[#0b1329] border-b border-slate-800/80 backdrop-blur-md">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            onSelectTab('overview');
          }}
          className="flex items-center gap-2.5 text-base font-bold tracking-tight text-white hover:text-blue-400 transition-colors whitespace-nowrap shrink-0"
        >
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-sm shadow-blue-500/20">
            FP
          </div>
          <span className="hidden sm:inline text-slate-100 font-semibold tracking-normal">FinStatement <span className="text-blue-400 font-medium">Pro</span></span>
        </a>

        {/* Quiet reconciliation status text without pill enclosure */}
        <div className="hidden lg:flex items-center gap-1.5 pl-4 border-l border-slate-800 text-xs text-slate-400">
          {isReconciled ? (
            <span className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Draft checks passed</span>
            </span>
          ) : (
            <span className="text-amber-400 font-medium">
              Review reporting checks
            </span>
          )}
        </div>
      </div>

      {/* Zone 2: 4-5 clean single-line navigation links */}
      <nav className="hidden 2xl:flex items-center gap-6 text-sm font-medium text-slate-400">
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 text-xs uppercase tracking-wider ${
                isActive
                  ? 'text-white border-blue-500 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Zone 3: 1 primary action cluster */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onOpenTests}
          title="Run Accounting Unit Tests"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700 hover:text-white rounded-md border border-slate-700/60 transition-colors whitespace-nowrap shrink-0"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
          <span>Tests & Verification</span>
        </button>

        <button
          aria-label="Export Excel"
          onClick={onExportWorkbook}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-md shadow-sm transition-colors whitespace-nowrap shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Export Excel</span>
        </button>

        {currentUser ? (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <span className="hidden xl:inline text-xs text-slate-300 max-w-[120px] truncate">
              {currentUser.email || 'User'}
            </span>
            <button
              onClick={onLogout}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-md border border-slate-700/60 transition-colors whitespace-nowrap shrink-0"
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
};
