import { validateJournal } from '../../services/accountingEngine';
import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Lock,
  Unlock,
} from 'lucide-react';
import {
  AdjustingJournalEntry,
  JournalLine,
  TrialBalanceRow,
  Company,
  ReportingPeriod,
} from '../../types/accounting';
import { formatCurrency, roundMoney, sumMoney } from '../../services/accountingEngine';

interface AdjustmentsViewProps {
  company: Company;
  period: ReportingPeriod;
  accounts: TrialBalanceRow[];
  adjustments: AdjustingJournalEntry[];
  onUpdateAdjustments: (adjustments: AdjustingJournalEntry[]) => void;
  onAuditAction: (action: string, details: string) => void;
}

export const AdjustmentsView: React.FC<AdjustmentsViewProps> = ({
  company,
  period,
  accounts,
  adjustments,
  onUpdateAdjustments,
  onAuditAction,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<AdjustingJournalEntry | null>(null);

  // Form State
  const [entryNumber, setEntryNumber] = useState('');
  const [date, setDate] = useState(period.endDate || new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<JournalLine[]>([]);

  const curr = company.currency;

  const openNewEntryModal = () => {
    const nextNumber = `AJE-${period.name.slice(0, 4)}-0${adjustments.length + 1}`;
    setEntryNumber(nextNumber);
    setDate(period.endDate || '2025-12-31');
    setDescription('');
    setLines([
      {
        id: `line-${Date.now()}-1`,
        accountId: accounts[0]?.accountId || '',
        accountCode: accounts[0]?.accountCode || '',
        accountName: accounts[0]?.accountName || '',
        debit: 0,
        credit: 0,
        memo: '',
      },
      {
        id: `line-${Date.now()}-2`,
        accountId: accounts[1]?.accountId || '',
        accountCode: accounts[1]?.accountCode || '',
        accountName: accounts[1]?.accountName || '',
        debit: 0,
        credit: 0,
        memo: '',
      },
    ]);
    setEditingEntry(null);
    setIsModalOpen(true);
  };

  const handleLineChange = (index: number, field: keyof JournalLine, value: any) => {
    const updated = [...lines];
    if (field === 'accountId') {
      const selectedAcc = accounts.find((a) => a.accountId === value);
      updated[index] = {
        ...updated[index],
        accountId: value,
        accountCode: selectedAcc?.accountCode || '',
        accountName: selectedAcc?.accountName || '',
      };
    } else if (field === 'debit') {
      const dr = Math.max(0, roundMoney(Number(value) || 0));
      updated[index] = { ...updated[index], debit: dr, credit: dr > 0 ? 0 : updated[index].credit };
    } else if (field === 'credit') {
      const cr = Math.max(0, roundMoney(Number(value) || 0));
      updated[index] = { ...updated[index], credit: cr, debit: cr > 0 ? 0 : updated[index].debit };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setLines(updated);
  };

  const addLine = () => {
    setLines([
      ...lines,
      {
        id: `line-${Date.now()}`,
        accountId: accounts[0]?.accountId || '',
        accountCode: accounts[0]?.accountCode || '',
        accountName: accounts[0]?.accountName || '',
        debit: 0,
        credit: 0,
        memo: '',
      },
    ]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 2) {
      alert('A double-entry adjusting journal must have at least 2 lines (debit and credit).');
      return;
    }
    setLines(lines.filter((_, i) => i !== index));
  };

  const totalDr = sumMoney(lines.map(line => line.debit));
  const totalCr = sumMoney(lines.map(line => line.credit));
  const difference = roundMoney(totalDr - totalCr);
  const isBalanced = Math.abs(difference) < 0.01 && totalDr > 0;

  const handleSaveEntry = (status: 'draft' | 'posted') => {
    if (date < period.startDate || date > period.endDate) { alert('Journal date must fall within the reporting period.'); return; }
    if (status === 'posted' && !isBalanced) {
      alert(`Cannot post unbalanced entry. Debits (${totalDr}) must equal Credits (${totalCr}). Difference: ${difference}`);
      return;
    }
    if (!description.trim()) {
      alert('Please enter an adjusting journal entry description.');
      return;
    }

    const newAdjustment: AdjustingJournalEntry = {
      id: editingEntry?.id || `adj-${Date.now()}`,
      periodId: period.id,
      entryNumber: entryNumber || `AJE-${Date.now()}`,
      date,
      description,
      lines,
      totalDebit: totalDr,
      totalCredit: totalCr,
      isBalanced,
      status,
      createdAt: editingEntry?.createdAt || new Date().toISOString(),
    };

    if (status === "posted") { const errors = validateJournal(newAdjustment, accounts, period); if (errors.length) { alert(errors.join("\n")); return; } }
    if (editingEntry) {
      onUpdateAdjustments(adjustments.map((a) => (a.id === editingEntry.id ? newAdjustment : a)));
      onAuditAction('Adjustment Updated', `Updated entry ${newAdjustment.entryNumber} (${status})`);
    } else {
      onUpdateAdjustments([...adjustments, newAdjustment]);
      onAuditAction('Adjustment Created', `Created entry ${newAdjustment.entryNumber} (${status})`);
    }

    setIsModalOpen(false);
  };

  const toggleStatus = (id: string) => {
    const target = adjustments.find((a) => a.id === id);
    if (!target) return;

    if (target.status === 'posted') { alert('Posted entries are immutable. Create a reversing journal instead.'); return; }
    const newStatus = 'posted';
    if (newStatus === 'posted' && validateJournal(target, accounts, period).length) {
      alert('Cannot post unbalanced entry.');
      return;
    }

    onUpdateAdjustments(
      adjustments.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
    );
    onAuditAction('Adjustment Status Changed', `${target.entryNumber} status changed to ${newStatus}`);
  };

  const deleteEntry = (id: string, num: string) => {
    if (adjustments.find(a => a.id === id)?.status === 'posted') { alert('Posted entries are immutable. Create a reversing journal instead.'); return; }
    if (confirm(`Delete adjusting entry ${num}?`)) {
      onUpdateAdjustments(adjustments.filter((a) => a.id !== id));
      onAuditAction('Adjustment Deleted', `Deleted adjusting entry ${num}`);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">
            Adjusting Journal Entries
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Post accruals, prepayments, depreciation, and period-end corrections with strict double-entry balance enforcement.
          </p>
        </div>

        <button
          onClick={openNewEntryModal}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-md shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Adjusting Entry</span>
        </button>
      </div>

      {/* Adjustments Cards / Table */}
      {adjustments.length === 0 ? (
        <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-8 text-center text-xs text-slate-400 space-y-3">
          <FileText className="w-8 h-8 text-slate-600 mx-auto" />
          <div className="text-sm font-semibold text-slate-300">No Adjusting Entries Recorded</div>
          <p className="max-w-md mx-auto text-slate-500">
            Adjusting journals enable recognition of accrued expenses, deferred revenues, depreciation, and bad debt provisions before financial statement closing.
          </p>
          <button
            onClick={openNewEntryModal}
            className="px-3 py-1.5 text-xs font-medium text-blue-400 bg-blue-950/40 hover:bg-blue-900/60 border border-blue-800 rounded-md"
          >
            Create First Journal Entry
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {adjustments.map((adj) => (
            <div
              key={adj.id}
              className="bg-[#0f172a] border border-slate-800 rounded-lg overflow-hidden"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-900/80 border-b border-slate-800/80">
                <div className="flex items-center gap-3">
                  <div className="font-mono text-sm font-bold text-blue-400">
                    {adj.entryNumber}
                  </div>
                  <span className="text-xs text-slate-400">Date: {adj.date}</span>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <div className="text-xs text-slate-200 font-medium">
                    {adj.description}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded ${
                      adj.status === 'posted'
                        ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50'
                        : 'bg-amber-950/60 text-amber-400 border border-amber-800/50'
                    }`}
                  >
                    {adj.status === 'posted' ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                    <span>{adj.status.toUpperCase()}</span>
                  </span>

                  <button
                    disabled={adj.status === "posted"}
                    onClick={() => toggleStatus(adj.id)}
                    className="text-xs text-slate-300 hover:text-white px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 transition-colors"
                  >
                    {adj.status === 'posted' ? 'Posted (locked)' : 'Post to Ledger'}
                  </button>

                  <button
                    disabled={adj.status === "posted"}
                    onClick={() => deleteEntry(adj.id, adj.entryNumber)}
                    className="p-1 text-slate-500 hover:text-red-400 rounded transition-colors"
                    title="Delete Entry"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Lines Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-800/60 text-[11px] uppercase tracking-wider bg-slate-900/30">
                      <th className="py-2 px-4 w-28">Account Code</th>
                      <th className="py-2 px-4">Account Title</th>
                      <th className="py-2 px-4 text-slate-400">Memo / Line Note</th>
                      <th className="py-2 px-4 text-right w-32">Debit ({curr})</th>
                      <th className="py-2 px-4 text-right w-32">Credit ({curr})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {adj.lines.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-800/20">
                        <td className="py-2 px-4 font-mono text-blue-300">{l.accountCode}</td>
                        <td className="py-2 px-4 text-slate-200">{l.accountName}</td>
                        <td className="py-2 px-4 text-slate-400 italic text-[11px]">{l.memo || '—'}</td>
                        <td className="py-2 px-4 text-right font-mono tabular-nums text-slate-100">
                          {l.debit > 0 ? formatCurrency(l.debit, curr) : '—'}
                        </td>
                        <td className="py-2 px-4 text-right font-mono tabular-nums text-slate-100">
                          {l.credit > 0 ? formatCurrency(l.credit, curr) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-900/60 font-semibold border-t border-slate-800 text-xs">
                    <tr>
                      <td colSpan={3} className="py-2 px-4 text-slate-400 text-right uppercase text-[10px] tracking-wider">
                        Entry Total
                      </td>
                      <td className="py-2 px-4 text-right font-mono tabular-nums text-white">
                        {formatCurrency(adj.totalDebit, curr)}
                      </td>
                      <td className="py-2 px-4 text-right font-mono tabular-nums text-white">
                        {formatCurrency(adj.totalCredit, curr)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Adjusting Entry Modal */}
      {isModalOpen && (
        <div role="dialog" aria-modal="true" aria-label="Adjusting journal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-[#0f172a] border border-slate-700 rounded-xl max-w-3xl w-full max-h-[90dvh] overflow-y-auto p-4 sm:p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">
                  Create Adjusting Journal Entry
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Double-entry validation: Total Debits must strictly equal Total Credits.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Entry Meta Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Journal Reference #</label>
                <input
                  type="text"
                  value={entryNumber}
                  onChange={(e) => setEntryNumber(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white font-mono"
                  placeholder="AJE-2025-01"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Effective Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white font-mono"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-slate-400 font-medium mb-1">Description / Memo</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
                  placeholder="e.g., Year-end depreciation on server hardware"
                />
              </div>
            </div>

            {/* Line items editor */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">Journal Lines</span>
                <button
                  type="button"
                  onClick={addLine}
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Line
                </button>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-slate-400 border-b border-slate-800 text-[11px] uppercase">
                      <th className="py-2 px-3">Account</th>
                      <th className="py-2 px-3">Line Memo</th>
                      <th className="py-2 px-3 text-right w-28">Debit</th>
                      <th className="py-2 px-3 text-right w-28">Credit</th>
                      <th className="py-2 px-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {lines.map((line, idx) => (
                      <tr key={line.id}>
                        <td className="p-2">
                          <select
                            value={line.accountId}
                            onChange={(e) => handleLineChange(idx, 'accountId', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs"
                          >
                            {accounts.map((a) => (
                              <option key={a.accountId} value={a.accountId}>
                                {a.accountCode} - {a.accountName}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={line.memo}
                            onChange={(e) => handleLineChange(idx, 'memo', e.target.value)}
                            placeholder="Line description"
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={line.debit || ''}
                            onChange={(e) => handleLineChange(idx, 'debit', e.target.value)}
                            placeholder="0.00"
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-right text-slate-200 font-mono text-xs"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={line.credit || ''}
                            onChange={(e) => handleLineChange(idx, 'credit', e.target.value)}
                            placeholder="0.00"
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-right text-slate-200 font-mono text-xs"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeLine(idx)}
                            className="text-slate-500 hover:text-red-400"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-900 border-t border-slate-800 font-semibold text-xs">
                    <tr>
                      <td colSpan={2} className="py-2.5 px-3 text-right text-slate-400">Total</td>
                      <td className="py-2.5 px-3 text-right font-mono text-white">{formatCurrency(totalDr, curr)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-white">{formatCurrency(totalCr, curr)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Balance check bar */}
            <div className="flex items-center justify-between p-3 rounded-md bg-slate-900 border border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                {isBalanced ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                )}
                <span className={isBalanced ? 'text-emerald-300' : 'text-amber-300'}>
                  {isBalanced
                    ? 'Balanced double-entry journal (Debits = Credits)'
                    : `Unbalanced difference: ${formatCurrency(Math.abs(difference), curr)}`}
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-300 bg-slate-800 rounded-md"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSaveEntry('draft')}
                className="px-4 py-2 text-xs font-medium text-slate-200 bg-slate-700 hover:bg-slate-600 rounded-md"
              >
                Save as Draft
              </button>
              <button
                type="button"
                onClick={() => handleSaveEntry('posted')}
                disabled={!isBalanced}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-md disabled:opacity-50"
              >
                Post to Ledger
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
