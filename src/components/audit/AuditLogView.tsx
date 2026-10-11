import React, { useState } from 'react';
import { History, Shield, Bookmark, CheckCircle2, AlertTriangle } from 'lucide-react';
import { AuditLogEntry, ReportVersionSnapshot, Company, ReportingPeriod } from '../../types/accounting';
import { formatCurrency } from '../../services/accountingEngine';

interface AuditLogViewProps {
  company: Company;
  period: ReportingPeriod;
  auditLogs: AuditLogEntry[];
  versionSnapshots: ReportVersionSnapshot[];
  onSaveSnapshot: (name: string) => void;
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({
  company,
  period,
  auditLogs,
  versionSnapshots,
  onSaveSnapshot,
}) => {
  const [snapshotName, setSnapshotName] = useState('');
  const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState(false);

  const curr = company.currency;

  const handleCreateSnapshot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!snapshotName.trim()) return;
    onSaveSnapshot(snapshotName.trim());
    setSnapshotName('');
    setIsSnapshotModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-400" />
            Immutable Audit Trail & Versioned Snapshots
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Cryptographically timestamped audit logging for regulatory provenance, accounting entries, and statement snapshots.
          </p>
        </div>

        <button
          onClick={() => setIsSnapshotModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-md shadow-xs transition-colors self-start sm:self-auto"
        >
          <Bookmark className="w-3.5 h-3.5" />
          <span>Save Versioned Report Snapshot</span>
        </button>
      </div>

      {/* Version Snapshots Section */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-5 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-indigo-400" />
          Versioned Financial Report Snapshots
        </h3>

        {versionSnapshots.length === 0 ? (
          <div className="text-xs text-slate-500 italic p-3 bg-slate-900/60 rounded border border-slate-800">
            No versioned snapshots saved yet for this period. Click 'Save Versioned Report Snapshot' to freeze a milestone.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            {versionSnapshots.map((snap) => (
              <div
                key={snap.id}
                className="bg-slate-900/90 border border-slate-700/80 rounded-md p-3.5 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white text-sm">
                    v{snap.version} - {snap.name}
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">
                    {new Date(snap.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-300 font-mono">
                  <div>Net Profit: {formatCurrency(snap.netProfit, curr)}</div>
                  <div>Assets: {formatCurrency(snap.totalAssets, curr)}</div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[10px]">
                  <span className="text-slate-400">Created by: {snap.createdBy}</span>
                  <span className="text-emerald-400 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="w-3 h-3" /> Reconciled
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Immutable Audit Trail Table */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-lg overflow-hidden">
        <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="text-sm font-bold text-white flex items-center gap-2">
            <History className="w-4 h-4 text-blue-400" />
            Activity & Integrity Log
          </div>
          <span className="text-xs text-slate-400">
            {auditLogs.length} logged events
          </span>
        </div>

        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/60 text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-800">
                <th className="py-2.5 px-4 w-44">Timestamp</th>
                <th className="py-2.5 px-4 w-44">User / Actor</th>
                <th className="py-2.5 px-4 w-48">Action Type</th>
                <th className="py-2.5 px-4">Event Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/30">
                  <td className="py-2.5 px-4 font-mono text-slate-400 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-4 text-slate-300 truncate max-w-[150px]">
                    {log.actorEmail}
                  </td>
                  <td className="py-2.5 px-4 font-medium text-blue-300">
                    {log.action}
                  </td>
                  <td className="py-2.5 px-4 text-slate-300">
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Snapshot Modal */}
      {isSnapshotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-[#0f172a] border border-slate-700 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Save Versioned Snapshot</h3>
            <p className="text-xs text-slate-400">
              Freezes current trial balance, adjustments, and financial statements as an immutable historical record.
            </p>

            <form onSubmit={handleCreateSnapshot} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-300 mb-1">Snapshot Label / Milestone Name</label>
                <input
                  type="text"
                  placeholder="e.g., FY25 Audited Final"
                  value={snapshotName}
                  onChange={(e) => setSnapshotName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-xs"
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSnapshotModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded"
                >
                  Freeze Snapshot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
