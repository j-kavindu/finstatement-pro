import React, { useState } from 'react';
import {
  Upload,
  Download,
  Plus,
  Trash2,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import {
  TrialBalanceRow,
  AccountClassification,
  Company,
  ReportingPeriod,
} from '../../types/accounting';
import { formatCurrency, roundMoney } from '../../services/accountingEngine';
import {
  parseFileToRawData,
  autoDetectColumnMapping,
  mapRawRowsToTrialBalance,
  ColumnMapping,
} from '../../services/importService';
import { exportTrialBalanceCSV, downloadCSV } from '../../services/exportService';

interface TrialBalanceViewProps {
  company: Company;
  period: ReportingPeriod;
  rows: TrialBalanceRow[];
  onUpdateRows: (rows: TrialBalanceRow[]) => void;
  totalUnadjustedDebit: number;
  totalUnadjustedCredit: number;
  totalAdjustedDebit: number;
  totalAdjustedCredit: number;
  isAdjustedBalanced: boolean;
  adjustedDifference: number;
  onAuditAction: (action: string, details: string) => void;
}

const CLASSIFICATION_OPTIONS: { value: AccountClassification; label: string }[] = [
  { value: 'current_asset', label: 'Current Asset' },
  { value: 'non_current_asset', label: 'Non-Current Asset (PP&E / Intangible)' },
  { value: 'current_liability', label: 'Current Liability' },
  { value: 'non_current_liability', label: 'Non-Current Liability (Long-Term Debt)' },
  { value: 'equity', label: 'Shareholders Equity' },
  { value: 'revenue', label: 'Operating Revenue' },
  { value: 'cogs', label: 'Cost of Goods Sold (COGS)' },
  { value: 'operating_expense', label: 'Operating Expense (OPEX)' },
  { value: 'depreciation_expense', label: 'Depreciation & Amortization Expense' },
  { value: 'interest_expense', label: 'Interest / Finance Expense' },
  { value: 'tax_expense', label: 'Income Tax Provision' },
  { value: 'other_income', label: 'Other Income' },
  { value: 'other_expense', label: 'Other Expense' },
];

export const TrialBalanceView: React.FC<TrialBalanceViewProps> = ({
  company,
  period,
  rows,
  onUpdateRows,
  totalUnadjustedDebit,
  totalUnadjustedCredit,
  totalAdjustedDebit,
  totalAdjustedCredit,
  isAdjustedBalanced,
  adjustedDifference,
  onAuditAction,
}) => {
  const [filterClassification, setFilterClassification] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [rawImportData, setRawImportData] = useState<Record<string, string | number>[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    accountCode: '',
    accountName: '',
    classification: '',
    debit: '',
    credit: '',
    isContra: '',
  });
  const [importValidationResult, setImportValidationResult] = useState<any | null>(null);
  const [importFileError, setImportFileError] = useState<string | null>(null);

  const curr = company.currency;

  const handleRowChange = (index: number, field: keyof TrialBalanceRow, value: any) => {
    const updated = [...rows];
    const target = { ...updated[index], [field]: value };

    // Recompute net balance if debits or credits change
    if (field === 'unadjustedDebit' || field === 'unadjustedCredit') {
      const dr = Math.max(0, roundMoney(Number(target.unadjustedDebit) || 0));
      const cr = Math.max(0, roundMoney(Number(target.unadjustedCredit) || 0));
      target.unadjustedDebit = dr;
      target.unadjustedCredit = cr;
      target.adjustedDebit = dr;
      target.adjustedCredit = cr;
      target.netDebitCredit = roundMoney(dr - cr);
    }

    updated[index] = target;
    onUpdateRows(updated);
  };

  const handleAddAccount = () => {
    let sequence = rows.length + 1;
    while (rows.some(row=>row.accountCode === `${sequence}000`)) sequence++;
    const newCode = `${sequence}000`;
    const newRow: TrialBalanceRow = {
      id: `tb-new-${Date.now()}`,
      accountId: `acc-${newCode}`,
      accountCode: newCode,
      accountName: 'New Financial Account',
      classification: 'operating_expense',
      isContra: false,
      unadjustedDebit: 0,
      unadjustedCredit: 0,
      adjustedDebit: 0,
      adjustedCredit: 0,
      netDebitCredit: 0,
    };
    onUpdateRows([...rows, newRow]);
    onAuditAction('Account Created', `Created account ${newCode} - New Financial Account`);
  };

  const handleDeleteRow = (id: string, name: string) => {
    if (confirm(`Remove account "${name}" from the trial balance?`)) {
      onUpdateRows(rows.filter((r) => r.id !== id));
      onAuditAction('Account Deleted', `Removed account ${name}`);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFileError(null);

    try {
      const { headers, rawRows } = await parseFileToRawData(file);
      setImportHeaders(headers);
      setRawImportData(rawRows);

      const detected = autoDetectColumnMapping(headers);
      setColumnMapping(detected);

      // Run mapping preview
      const preview = mapRawRowsToTrialBalance(rawRows, detected);
      setImportValidationResult(preview);
      setIsImportModalOpen(true);
    } catch (err: any) {
      setImportFileError(err?.message || 'Failed to parse file.');
    } finally {
      e.target.value = '';
    }
  };

  const handleMappingChange = (field: keyof ColumnMapping, value: string) => {
    const updated = { ...columnMapping, [field]: value };
    setColumnMapping(updated);
    if (rawImportData.length > 0) {
      const preview = mapRawRowsToTrialBalance(rawImportData, updated);
      setImportValidationResult(preview);
    }
  };

  const handleConfirmImport = () => {
    if (!importValidationResult || importValidationResult.rows.length === 0) return;
    if (importValidationResult.errors.length) { alert(importValidationResult.errors.join("\n")); return; }
    onUpdateRows(importValidationResult.rows);
    onAuditAction(
      'Trial Balance Imported',
      `Imported ${importValidationResult.rows.length} accounts. Balanced: ${importValidationResult.isBalanced}`
    );
    setIsImportModalOpen(false);
  };

  const handleDownloadTemplate = () => {
    const templateContent = [
      'account_code,account_name,classification,is_contra,debit,credit',
      '1010,Cash & Bank,current_asset,FALSE,50000,0',
      '1020,Trade Receivables,current_asset,FALSE,30000,0',
      '1025,Allowance for Doubtful Accounts,current_asset,TRUE,0,2000',
      '1510,Equipment,non_current_asset,FALSE,80000,0',
      '1520,Accumulated Depreciation,non_current_asset,TRUE,0,15000',
      '2010,Trade Accounts Payable,current_liability,FALSE,0,25000',
      '3010,Common Share Capital,equity,FALSE,0,70000',
      '3020,Retained Earnings (Opening),equity,FALSE,0,20000',
      '4010,Sales Revenue,revenue,FALSE,0,120000',
      '5010,Cost of Goods Sold,cogs,FALSE,60000,0',
      '6010,Salaries and Admin Expense,operating_expense,FALSE,32000,0',
    ].join('\r\n');
    downloadCSV('finstatement_tb_template.csv', templateContent);
  };

  // Filtered rows
  const filteredRows = rows.filter((r) => {
    const matchesFilter =
      filterClassification === 'all' ||
      (filterClassification === 'asset' && (r.classification === 'current_asset' || r.classification === 'non_current_asset')) ||
      (filterClassification === 'liability' && (r.classification === 'current_liability' || r.classification === 'non_current_liability')) ||
      (filterClassification === 'equity' && r.classification === 'equity') ||
      (filterClassification === 'revenue' && (r.classification === 'revenue' || r.classification === 'other_income')) ||
      (filterClassification === 'expense' &&
        (r.classification === 'cogs' ||
          r.classification === 'operating_expense' ||
          r.classification === 'depreciation_expense' ||
          r.classification === 'interest_expense' ||
          r.classification === 'tax_expense'));

    const matchesSearch =
      r.accountCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.accountName.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-5">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">
            Trial Balance Workspace
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Preserves debit and credit sides, contra accounts, and double-entry adjustments for {period.name}.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-md border border-slate-700 cursor-pointer transition-colors">
            <Upload className="w-3.5 h-3.5 text-blue-400" />
            <span>Upload CSV/XLSX</span>
            <input
              type="file"
              accept=".csv, .xlsx, .xls"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-md border border-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV Template</span>
          </button>

          <button
            onClick={() => exportTrialBalanceCSV(company, period, rows)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-md border border-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export TB CSV</span>
          </button>

          <button
            onClick={handleAddAccount}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-md shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Account</span>
          </button>
        </div>
      </div>

      {importFileError && (
        <div className="p-3 bg-red-950/40 border border-red-800 text-red-300 text-xs rounded-md flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{importFileError}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg overflow-x-auto text-xs">
          {[
            { id: 'all', label: 'All Accounts' },
            { id: 'asset', label: 'Assets' },
            { id: 'liability', label: 'Liabilities' },
            { id: 'equity', label: 'Equity' },
            { id: 'revenue', label: 'Revenue' },
            { id: 'expense', label: 'Expenses' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterClassification(tab.id)}
              className={`px-3 py-1.5 rounded-md font-medium whitespace-nowrap transition-colors ${
                filterClassification === tab.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-64">
          <input
            type="text"
            placeholder="Search code or account..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700/80 rounded-md px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
          />
        </div>
      </div>

      {/* Trial Balance Table */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold text-[11px]">
                <th className="py-2.5 px-3 w-20">Code</th>
                <th className="py-2.5 px-3 min-w-[200px]">Account Name</th>
                <th className="py-2.5 px-3 min-w-[180px]">Classification</th>
                <th className="py-2.5 px-3 text-center w-16" title="Contra Account (e.g. Accumulated Depreciation)">
                  Contra?
                </th>
                <th className="py-2.5 px-3 text-right w-28">Unadj Debit</th>
                <th className="py-2.5 px-3 text-right w-28">Unadj Credit</th>
                <th className="py-2.5 px-3 text-right w-28 bg-slate-900/50">Adj Debit</th>
                <th className="py-2.5 px-3 text-right w-28 bg-slate-900/50">Adj Credit</th>
                <th className="py-2.5 px-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredRows.map((row) => {
                const index = rows.findIndex((r) => r.id === row.id);
                return (
                  <tr key={row.id} className="hover:bg-slate-800/40 transition-colors">
                    {/* Code */}
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={row.accountCode}
                        onChange={(e) => handleRowChange(index, 'accountCode', e.target.value)}
                        className="w-full bg-transparent border-0 font-mono text-blue-300 font-medium focus:ring-1 focus:ring-blue-500 rounded-xs px-1 py-0.5"
                      />
                    </td>

                    {/* Name */}
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={row.accountName}
                        onChange={(e) => handleRowChange(index, 'accountName', e.target.value)}
                        className="w-full bg-transparent border-0 text-slate-100 font-medium focus:ring-1 focus:ring-blue-500 rounded-xs px-1 py-0.5"
                      />
                    </td>

                    {/* Classification */}
                    <td className="py-2 px-3">
                      <select
                        value={row.classification}
                        onChange={(e) => handleRowChange(index, 'classification', e.target.value as AccountClassification)}
                        className="w-full bg-slate-900/80 border border-slate-700/60 rounded px-2 py-1 text-slate-300 focus:outline-hidden focus:border-blue-500 text-xs"
                      >
                        {CLASSIFICATION_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Contra Checkbox */}
                    <td className="py-2 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={row.isContra}
                        onChange={(e) => handleRowChange(index, 'isContra', e.target.checked)}
                        className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0 w-3.5 h-3.5"
                      />
                    </td>

                    {/* Unadjusted Debit */}
                    <td className="py-2 px-3 text-right">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={row.unadjustedDebit || ''}
                        onChange={(e) => handleRowChange(index, 'unadjustedDebit', parseFloat(e.target.value) || 0)}
                        className="w-full bg-transparent text-right font-mono tabular-nums text-slate-200 focus:ring-1 focus:ring-blue-500 rounded-xs px-1 py-0.5"
                        placeholder="0.00"
                      />
                    </td>

                    {/* Unadjusted Credit */}
                    <td className="py-2 px-3 text-right">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={row.unadjustedCredit || ''}
                        onChange={(e) => handleRowChange(index, 'unadjustedCredit', parseFloat(e.target.value) || 0)}
                        className="w-full bg-transparent text-right font-mono tabular-nums text-slate-200 focus:ring-1 focus:ring-blue-500 rounded-xs px-1 py-0.5"
                        placeholder="0.00"
                      />
                    </td>

                    {/* Adjusted Debit */}
                    <td className="py-2 px-3 text-right font-mono tabular-nums font-medium text-slate-300 bg-slate-900/30">
                      {row.adjustedDebit > 0 ? formatCurrency(row.adjustedDebit, curr) : '—'}
                    </td>

                    {/* Adjusted Credit */}
                    <td className="py-2 px-3 text-right font-mono tabular-nums font-medium text-slate-300 bg-slate-900/30">
                      {row.adjustedCredit > 0 ? formatCurrency(row.adjustedCredit, curr) : '—'}
                    </td>

                    {/* Actions */}
                    <td className="py-2 px-3 text-right">
                      <button
                        onClick={() => handleDeleteRow(row.id, row.accountName)}
                        title="Delete account"
                        className="p-1 text-slate-500 hover:text-red-400 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Totals Footer */}
            <tfoot className="bg-slate-900 text-slate-200 font-semibold border-t-2 border-slate-700">
              <tr>
                <td colSpan={4} className="py-3 px-3 uppercase text-[11px] tracking-wider text-slate-400">
                  Total Trial Balance Equilibrium
                </td>
                <td className="py-3 px-3 text-right font-mono tabular-nums text-white">
                  {formatCurrency(totalUnadjustedDebit, curr)}
                </td>
                <td className="py-3 px-3 text-right font-mono tabular-nums text-white">
                  {formatCurrency(totalUnadjustedCredit, curr)}
                </td>
                <td className="py-3 px-3 text-right font-mono tabular-nums text-blue-300 bg-slate-900/60">
                  {formatCurrency(totalAdjustedDebit, curr)}
                </td>
                <td className="py-3 px-3 text-right font-mono tabular-nums text-blue-300 bg-slate-900/60">
                  {formatCurrency(totalAdjustedCredit, curr)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Trial Balance Health Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-900/60 border border-slate-800 rounded-lg text-xs">
        <div className="flex items-center gap-2">
          {isAdjustedBalanced ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          )}
          <span className="text-slate-300">
            {isAdjustedBalanced
              ? 'Adjusted Trial Balance is balanced. All debits equal credits.'
              : `Adjusted Trial Balance is out of balance by ${formatCurrency(Math.abs(adjustedDifference), curr)}. Debits must equal credits.`}
          </span>
        </div>

        <div className="flex items-center gap-3 text-slate-400">
          <span>{rows.length} total accounts</span>
          <span aria-hidden="true">·</span>
          <span>Contra accounts flagged: {rows.filter((r) => r.isContra).length}</span>
        </div>
      </div>

      {/* CSV / XLSX Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-[#0f172a] border border-slate-700 rounded-xl max-w-2xl w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-blue-400" />
                  Trial Balance Column Mapping
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Match columns from your uploaded file to accounting fields.
                </p>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {/* Mapping Pickers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Account Code</label>
                <select
                  value={columnMapping.accountCode}
                  onChange={(e) => handleMappingChange('accountCode', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
                >
                  <option value="">-- Choose Column --</option>
                  {importHeaders.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Account Name</label>
                <select
                  value={columnMapping.accountName}
                  onChange={(e) => handleMappingChange('accountName', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
                >
                  <option value="">-- Choose Column --</option>
                  {importHeaders.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Category / Classification</label>
                <select
                  value={columnMapping.classification}
                  onChange={(e) => handleMappingChange('classification', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
                >
                  <option value="">-- Choose Column --</option>
                  {importHeaders.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Debit Column</label>
                <select
                  value={columnMapping.debit}
                  onChange={(e) => handleMappingChange('debit', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
                >
                  <option value="">-- Choose Column --</option>
                  {importHeaders.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Credit Column</label>
                <select
                  value={columnMapping.credit}
                  onChange={(e) => handleMappingChange('credit', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
                >
                  <option value="">-- Choose Column --</option>
                  {importHeaders.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Contra Account Flag (Optional)</label>
                <select
                  value={columnMapping.isContra}
                  onChange={(e) => handleMappingChange('isContra', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
                >
                  <option value="">-- Auto-detect by name --</option>
                  {importHeaders.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Import Validation Preview */}
            {importValidationResult && (
              <div className="p-3.5 bg-slate-900 rounded-lg border border-slate-800 text-xs space-y-2">
                <div className="flex items-center justify-between font-medium">
                  <span className="text-slate-300">
                    Parsed {importValidationResult.rows.length} Accounts
                  </span>
                  <span
                    className={
                      importValidationResult.isBalanced ? 'text-emerald-400' : 'text-amber-400'
                    }
                  >
                    {importValidationResult.isBalanced
                      ? '✓ Debits Equal Credits'
                      : `⚠ Difference: ${formatCurrency(importValidationResult.difference, curr)}`}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-slate-400 text-[11px] font-mono">
                  <div>Total Debit: {formatCurrency(importValidationResult.totalDebit, curr)}</div>
                  <div>Total Credit: {formatCurrency(importValidationResult.totalCredit, curr)}</div>
                </div>

                {importValidationResult.warnings.length > 0 && (
                  <div className="text-[11px] text-amber-400 bg-amber-950/30 p-2 rounded border border-amber-900/50">
                    {importValidationResult.warnings[0]}
                  </div>
                )}
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={!importValidationResult || importValidationResult.rows.length === 0}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-md disabled:opacity-50"
              >
                Apply Imported Trial Balance
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
