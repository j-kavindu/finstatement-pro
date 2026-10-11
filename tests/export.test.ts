import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import { csvCell, exportFullFinancialWorkbookXLSX, exportExecutivePDF } from '../src/services/exportService';
import { parseFileToRawData, mapRawRowsToTrialBalance, autoDetectColumnMapping } from '../src/services/importService';
import { SAMPLE_COMPANY, SAMPLE_PERIODS, SAMPLE_TB_FY2025, SAMPLE_TB_FY2024, SAMPLE_ADJUSTMENTS_FY2025, SAMPLE_EQUITY_FY2025, SAMPLE_SUPPLEMENTARY_FY2025 } from '../src/services/syntheticData';
import { calculateAdjustedTrialBalance, generateProfitAndLoss, generateBalanceSheet, generateChangesInEquity, generateIndirectCashFlow, calculateFinancialRatios } from '../src/services/accountingEngine';
test('CSV formula neutralization and quoted cell escaping',()=>{assert.equal(csvCell('=SUM(A1)'),`"'=SUM(A1)"`);assert.equal(csvCell('A "quote"'), '"A ""quote"""');});
test('CSV and XLSX parse and preserve monetary balances',async()=>{
 const raw=[{code:'101',name:'Cash',classification:'current_asset',debit:123.45,credit:0},{code:'301',name:'Capital',classification:'equity',debit:0,credit:123.45}];
 const workbook=XLSX.utils.book_new();XLSX.utils.book_append_sheet(workbook,XLSX.utils.json_to_sheet(raw),'TB');
 const xlsx=XLSX.write(workbook,{type:'buffer',bookType:'xlsx'});
 for(const file of [new File([xlsx],'trial.XLSX'),new File([XLSX.utils.sheet_to_csv(workbook.Sheets.TB)],'trial.csv')]){
 const parsed=await parseFileToRawData(file);const mapped=mapRawRowsToTrialBalance(parsed.rawRows,autoDetectColumnMapping(parsed.headers));assert.equal(mapped.errors.length,0);assert.equal(mapped.totalDebit,123.45);assert.equal(mapped.isBalanced,true);
 }
});
