/**
 * FinStatement Pro - Trial Balance Import Service
 * Robust CSV and XLSX parsing with column mapping, decimal preservation, and strict double-entry validation.
 */

import * as XLSX from 'xlsx';
import { TrialBalanceRow, AccountClassification } from '../types/accounting';
import { roundMoney } from './accountingEngine';

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
  const isXLSX = /\.xlsx?$/i.test(file.name);

  if (isXLSX) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const grid = XLSX.utils.sheet_to_json<(string | number)[]>(worksheet, { header: 1, defval: '' });
    const headerIndex = grid.findIndex(row => row.some(cell => /debit|^dr$/i.test(String(cell))) && row.some(cell => /credit|^cr$/i.test(String(cell))));
    const json: Record<string, string | number>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '', range: Math.max(0, headerIndex) });
    const codeHeader = Object.keys(json[0] ?? {}).find(key => /account.?code|^code$/i.test(key));
    const filtered = codeHeader ? json.filter(row => row[codeHeader] && String(row[codeHeader]).toUpperCase() !== 'TOTAL') : json;
    json.splice(0, json.length, ...filtered);

    if (json.length === 0) {
      throw new Error('Spreadsheet contains no data rows.');
    }
    const headers = Object.keys(json[0]);
    return { headers, rawRows: json };
  } else {
    // CSV parsing
    const text = await file.text();
    const workbook = XLSX.read(text, { type: 'string' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const grid = XLSX.utils.sheet_to_json<(string | number)[]>(worksheet, { header: 1, defval: '' });
    const headerIndex = grid.findIndex(row => row.some(cell => /debit|^dr$/i.test(String(cell))) && row.some(cell => /credit|^cr$/i.test(String(cell))));
    const json: Record<string, string | number>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '', range: Math.max(0, headerIndex) });
    const codeHeader = Object.keys(json[0] ?? {}).find(key => /account.?code|^code$/i.test(key));
    const filtered = codeHeader ? json.filter(row => row[codeHeader] && String(row[codeHeader]).toUpperCase() !== 'TOTAL') : json;
    json.splice(0, json.length, ...filtered);

    if (json.length === 0) {
      throw new Error('CSV file contains no data rows or invalid header structure.');
    }
    const headers = Object.keys(json[0]);
    return { headers, rawRows: json };
  }
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
    debit: findHeader(['debit', 'dr', 'unadjusted debit', 'debit balance']),
    credit: findHeader(['credit', 'cr', 'unadjusted credit', 'credit balance']),
    isContra: findHeader(['contra', 'is_contra', 'iscontra', 'contra_flag']),
  };
}

export function mapRawRowsToTrialBalance(
  rawRows: Record<string, string | number>[],
  mapping: ColumnMapping
): ParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const rows: TrialBalanceRow[] = [];

  let totalDebit = 0;
  let totalCredit = 0;

  const seen = new Set<string>();
  rawRows.forEach((raw, index) => {
    try {
    const rowNum = index + 2; // +1 for 0-index, +1 for header row
    const rawCode = String(raw[mapping.accountCode] || '').trim();
    const rawName = String(raw[mapping.accountName] || '').trim();

    // Skip empty lines
    if (!rawCode && !rawName) return;

    if (!rawCode || !rawName) throw new Error("Account code and name are required");
    if (seen.has(rawCode.toLowerCase())) throw new Error("Duplicate account code");
    seen.add(rawCode.toLowerCase());
    const accountCode = rawCode;
    const accountName = rawName || `Account ${accountCode}`;

    const rawDebit = raw[mapping.debit];
    const rawCredit = raw[mapping.credit];

    const parseNum = (v: string | number | undefined): number => {
      if (v === undefined || v === null || v === '') return 0;
      if (typeof v === 'number') return roundMoney(v);
      const cleaned = String(v).replace(/[$,\s]/g, '');
      if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(cleaned)) throw new Error("Invalid monetary value");
      const num = Number(cleaned);
      return roundMoney(num);
    };

    const debit = parseNum(rawDebit);
    const credit = parseNum(rawCredit);

    if (debit < 0 || credit < 0) {
      throw new Error("Negative balances must be moved to the opposite debit/credit column");
    }

    if (debit > 0 && credit > 0) throw new Error("A trial balance account cannot have both debit and credit balances");
    const cleanDebit = Math.max(0, debit);
    const cleanCredit = Math.max(0, credit);

    totalDebit = roundMoney(totalDebit + cleanDebit);
    totalCredit = roundMoney(totalCredit + cleanCredit);

    const classification = normalizeClassification(String(raw[mapping.classification] || ''));

    // Check contra flag or auto-detect by name
    const rawContra = String(raw[mapping.isContra || ''] || '').toLowerCase();
    const isContraDetected =
      rawContra === 'true' ||
      rawContra === 'yes' ||
      rawContra === '1' ||
      accountName.toLowerCase().includes('accumulated') ||
      accountName.toLowerCase().includes('allowance for') ||
      accountName.toLowerCase().includes('discount') ||
      accountName.toLowerCase().includes('sales return');

    rows.push({
      id: `imported-${index}-${Date.now()}`,
      accountId: `acc-${accountCode}`,
      accountCode,
      accountName,
      classification,
      isContra: isContraDetected,
      unadjustedDebit: cleanDebit,
      unadjustedCredit: cleanCredit,
      adjustedDebit: cleanDebit,
      adjustedCredit: cleanCredit,
      netDebitCredit: cleanDebit - cleanCredit,
    });
    } catch (error) { errors.push(`Row ${index + 2}: ${error instanceof Error ? error.message : String(error)}`); }
  });

  const difference = roundMoney(totalDebit - totalCredit);
  const isBalanced = difference === 0 && errors.length === 0 && rows.length > 0;

  if (!isBalanced) {
    warnings.push(`Trial balance is unbalance by ${Math.abs(difference).toFixed(2)}. Total debits must equal total credits.`);
  }

  return {
    rows,
    headers: Object.keys(rawRows[0] || {}),
    rawRows,
    totalDebit,
    totalCredit,
    difference,
    isBalanced,
    warnings,
    errors,
  };
}
