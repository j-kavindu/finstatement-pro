/**
 * FinStatement Pro - Trial Balance Import Service
 * Robust CSV and XLSX parsing with column mapping, decimal preservation, and strict double-entry validation.
 */

import * as XLSX from 'xlsx';
import { TrialBalanceRow, AccountClassification } from '../types/accounting';
import { roundMoney, sumMoney } from './accountingEngine';

export interface ColumnMapping {
  accountCode: string;
  accountName: string;
  classification: string;
  debit: string;
  credit: string;
  isContra?: string;
}

export interface ParseResult {
  rows: TrialBalanceRow[];
  headers: string[];
  rawRows: Record<string, string | number>[];
  totalDebit: number;
  totalCredit: number;
  difference: number;
  isBalanced: boolean;
  warnings: string[];
  errors: string[];
}

const CLASSIFICATION_ALIASES: Record<string, AccountClassification> = {
  asset: 'current_asset',
  current_asset: 'current_asset',
  ca: 'current_asset',
  cash: 'current_asset',
  non_current_asset: 'non_current_asset',
  fixed_asset: 'non_current_asset',
  nca: 'non_current_asset',
  ppe: 'non_current_asset',
  liability: 'current_liability',
  current_liability: 'current_liability',
  cl: 'current_liability',
  non_current_liability: 'non_current_liability',
  ncl: 'non_current_liability',
  long_term_liability: 'non_current_liability',
  equity: 'equity',
  capital: 'equity',
  stockholders_equity: 'equity',
  revenue: 'revenue',
  sales: 'revenue',
  income: 'revenue',
  cogs: 'cogs',
  cost_of_sales: 'cogs',
  cost_of_goods_sold: 'cogs',
  expense: 'operating_expense',
  operating_expense: 'operating_expense',
  opex: 'operating_expense',
  depreciation: 'depreciation_expense',
  depreciation_expense: 'depreciation_expense',
  interest: 'interest_expense',
  interest_expense: 'interest_expense',
  tax: 'tax_expense',
  tax_expense: 'tax_expense',
  other_income: 'other_income',
  other_expense: 'other_expense',
};

export function normalizeClassification(val: string | undefined): AccountClassification {
  if (!val) throw new Error('Classification is required');
  const clean = String(val).trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (!CLASSIFICATION_ALIASES[clean]) throw new Error(`Unknown classification: ${val}`);
  return CLASSIFICATION_ALIASES[clean];
}

export async function parseFileToRawData(file: File): Promise<{
  headers: string[];
  rawRows: Record<string, string | number>[];
}> {
  if (file.size > 5 * 1024 * 1024) throw new Error('Maximum import size is 5 MB');
  if (!/\.(csv|xlsx|xls)$/i.test(file.name)) throw new Error('Choose CSV or Excel');
  const workbook = /\.xlsx?$/i.test(file.name)
    ? XLSX.read(await file.arrayBuffer(), { type: 'array' })
    : XLSX.read(await file.text(), { type: 'string', raw: true });
  if (!workbook.SheetNames.length) throw new Error('File contains no worksheets');
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const grid = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, { header: 1, defval: '' });
  const headerIndex = Math.max(0, grid.findIndex(row => row.some(cell => /debit|^dr$/i.test(String(cell))) && row.some(cell => /credit|^cr$/i.test(String(cell)))));
  const headers = (grid[headerIndex] ?? []).map(String).map(value => value.trim());
  if (headers.filter(Boolean).length !== new Set(headers.filter(Boolean)).size) throw new Error('Duplicate column headings');
  const rawRows = grid.slice(headerIndex + 1).filter(row => row.some(value => String(value).trim())).map(row => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ''])));
  const codeHeader = headers.find(key => /account.?code|^code$/i.test(key));
  // Only remove the known total footer; malformed rows must reach validation.
  const filtered = rawRows.filter(row => !codeHeader || String(row[codeHeader]).trim().toUpperCase() !== 'TOTAL');
  if (!filtered.length) throw new Error('File contains no data rows');
  if (filtered.length > 5000) throw new Error('Maximum 5,000 account rows per import');
  return { headers, rawRows: filtered };
}

export function autoDetectColumnMapping(headers: string[]): ColumnMapping {
  const lowerHeaders = headers.map((h) => h.toLowerCase().trim());

  const findHeader = (candidates: string[]): string => {
    for (const cand of candidates) {
      const idx = lowerHeaders.findIndex((h) => h === cand || h.includes(cand));
      if (idx !== -1) return headers[idx];
    }
    return '';
  };

  return {
    accountCode: findHeader(['account_code', 'account code', 'code', 'account number', 'acc_code', 'account_id', 'id']),
    accountName: findHeader(['account_name', 'account name', 'description', 'title', 'name']),
    classification: findHeader(['classification', 'category', 'type', 'account type', 'class']),
    debit: findHeader(['unadjusted debit', 'unadj debit', 'debit', 'dr', 'debit balance']),
    credit: findHeader(['unadjusted credit', 'unadj credit', 'credit', 'cr', 'credit balance']),
    isContra: findHeader(['contra', 'is_contra', 'iscontra', 'contra_flag']),
  };
}

export function mapRawRowsToTrialBalance(
  rawRows: Record<string, string | number>[],
  mapping: ColumnMapping,
  chart: TrialBalanceRow[] = [],
  overrides: Record<string, AccountClassification> = {}
): ParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const rows: TrialBalanceRow[] = [];
  const required = [mapping.accountCode, mapping.accountName, mapping.debit, mapping.credit];
  if (required.some(key => !key || !Object.hasOwn(rawRows[0] ?? {}, key))) errors.push('Map account code, name, debit and credit columns before importing');
  if (new Set(required).size !== required.length) errors.push('Each required column must be distinct');
  const seen = new Set<string>();
  const parseNum = (value: string | number | undefined): number => {
    if (value === undefined || String(value).trim() === '') return 0;
    const text = String(value).trim().replace(/^\$/, '');
    if (!/^[+]?(?:(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d*)?|\.\d+)$/.test(text)) throw new Error('Invalid amount: use non-negative decimal values with optional thousands commas');
    const result = roundMoney(text.replace(/,/g, ''));
    if (/\.\d{3,}$/.test(text)) warnings.push('Amounts with more than two decimals were rounded half up. Review the preview.');
    return result;
  };
  if (!errors.length) rawRows.forEach((raw, index) => {
    try {
      if (Object.values(raw).every(value => !String(value).trim())) return;
      const accountCode = String(raw[mapping.accountCode] ?? '').trim();
      const accountName = String(raw[mapping.accountName] ?? '').trim();
      if (!accountCode || !accountName) throw new Error('Account code and name are required');
      const key = accountCode.toLowerCase();
      if (seen.has(key)) throw new Error('Duplicate account code');
      seen.add(key);
      const existing = chart.find(account => account.accountCode.trim().toLowerCase() === key);
      const sourceClass = String(raw[mapping.classification] ?? '').trim();
      const classification = overrides[key] ?? (sourceClass ? normalizeClassification(sourceClass) : existing?.classification);
      if (!classification) throw new Error(`Map account ${accountCode} to a statement classification`);
      const debit = parseNum(raw[mapping.debit]);
      const credit = parseNum(raw[mapping.credit]);
      if (debit > 0 && credit > 0) throw new Error('An account cannot have both debit and credit balances');
      const flag = String(raw[mapping.isContra || ''] ?? '').trim().toLowerCase();
      if (flag && !['true','yes','1','false','no','0'].includes(flag)) throw new Error('Contra flag must be TRUE or FALSE');
      const isContra = flag ? ['true','yes','1'].includes(flag) : existing?.isContra ?? false;
      rows.push({ id: existing?.id ?? `import-${index}-${accountCode}`, accountId: existing?.accountId ?? `acc-${accountCode}`, accountCode, accountName, classification, isContra,
        unadjustedDebit: debit, unadjustedCredit: credit, adjustedDebit: debit, adjustedCredit: credit, netDebitCredit: sumMoney([debit, -credit]) });
    } catch (error) { errors.push(`Row ${index + 2}: ${error instanceof Error ? error.message : String(error)}`); }
  });
  let totalDebit = 0, totalCredit = 0, difference = 0;
  try {
    totalDebit = sumMoney(rows.map(row => row.unadjustedDebit));
    totalCredit = sumMoney(rows.map(row => row.unadjustedCredit));
    difference = sumMoney([totalDebit, -totalCredit]);
  } catch (error) { errors.push(String(error)); }
  const isBalanced = difference === 0 && !errors.length && rows.length > 0;
  if (difference) warnings.push(`Trial balance differs by ${Math.abs(difference).toFixed(2)}. Debits must equal credits.`);
  if (!mapping.isContra) warnings.push('No contra column selected. Existing flags are reused; new accounts default to normal. Review flags after import.');
  return { rows, headers: Object.keys(rawRows[0] ?? {}), rawRows, totalDebit, totalCredit, difference, isBalanced, warnings: [...new Set(warnings)], errors };
}
