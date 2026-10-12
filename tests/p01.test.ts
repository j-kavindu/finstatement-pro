import { test } from 'node:test';
import assert from 'node:assert/strict';
import { roundMoney, sumMoney, validMoney } from '../src/services/money';
import { calculateAdjustedTrialBalance as adjust, generateProfitAndLoss as profit, generateBalanceSheet as position, generateChangesInEquity as equity, generateIndirectCashFlow as cash, validateJournal } from '../src/services/accountingEngine';
import * as sample from '../src/services/syntheticData';
import { validateReportReadiness, assertReportReady } from '../src/services/reportValidation';
import { assertStatementsReconcile } from '../src/services/exportService';
import { validateEquityMovement } from '../src/services/workspaceValidation';
import { mapRawRowsToTrialBalance as map, autoDetectColumnMapping, parseFileToRawData } from '../src/services/importService';

const rows = adjust(sample.SAMPLE_TB_FY2025, sample.SAMPLE_ADJUSTMENTS_FY2025, sample.SAMPLE_PERIODS[0]).adjustedRows;
const pnl = profit(rows), bs = position(rows, pnl.netProfit), eq = equity(sample.SAMPLE_EQUITY_FY2025, pnl.netProfit, bs.equityItems);
const prior = position(adjust(sample.SAMPLE_TB_FY2024, []).adjustedRows, 0);
const cf = cash(bs, prior, pnl, sample.SAMPLE_SUPPLEMENTARY_FY2025);
const checks = (movement = sample.SAMPLE_EQUITY_FY2025, previous: typeof prior | undefined = prior) => validateReportReadiness(rows, bs, equity(movement,pnl.netProfit,bs.equityItems), movement, previous, cf);
const mapping = autoDetectColumnMapping(['code','name','classification','contra','debit','credit']);
const raw = [{code:'1010',name:'Cash',classification:'current_asset',contra:'FALSE',debit:'100.10',credit:0},{code:'3010',name:'Capital',classification:'equity',contra:'FALSE',debit:0,credit:'100.10'}];

test('decimal strings, negative ties, cancellation and order are exact', () => {
 assert.equal(roundMoney('123.455'),123.46); assert.equal(roundMoney('-123.455'),-123.46);
 assert.equal(sumMoney([999999999999.99, .01, -1000000000000]),0);
 assert.equal(sumMoney(Array(1000).fill(.01)),10);
 assert.throws(()=>roundMoney('1000000000000.01')); assert.equal(validMoney(.001),false);
});
test('demo reconciles against independently specified accounting totals', () => {
 assert.equal(pnl.netProfit,35000); assert.equal(bs.totalAssets,269000); assert.equal(bs.totalLiabilities,57000); assert.equal(eq.openingTotal,182000); assert.equal(eq.closingTotalEquity,212000); assert.equal(cf.closingCashCalculated,100000);
 assert.ok(checks().every(check=>check.status==='pass')); assert.doesNotThrow(()=>assertReportReady(checks()));
});
test('opening equity mismatch blocks even when final equity happens to agree', () => {
 const changed = {...sample.SAMPLE_EQUITY_FY2025, openingRetainedEarnings:sample.SAMPLE_EQUITY_FY2025.openingRetainedEarnings+1, dividendsDeclared:sample.SAMPLE_EQUITY_FY2025.dividendsDeclared+1};
 const result=checks(changed); assert.equal(result.find(c=>c.id==='equity-rollforward')?.status,'pass'); assert.equal(result.find(c=>c.id==='opening-equity')?.status,'blocked'); assert.throws(()=>assertReportReady(result),/Opening equity/);
});
test('equity rollforward detects missing posted capital movements',()=>{
 const result=checks({...sample.SAMPLE_EQUITY_FY2025,shareIssuance:100}); assert.equal(result.find(c=>c.id==='equity-rollforward')?.status,'blocked');
});
test('missing opening equity blocks export and empty ledgers are not ready',()=>{
 assert.throws(()=>assertReportReady(validateReportReadiness(rows,bs,eq,undefined,prior,cf)));
 const result=validateReportReadiness([],position([],0),equity(undefined,0,[]),undefined,undefined,cash(bs,undefined,pnl,undefined));
 assert.equal(result.find(c=>c.id==='trial-balance')?.status,'blocked');
});
test('manual opening amounts without prior data are review warnings',()=>{
 const result=validateReportReadiness(rows,bs,eq,sample.SAMPLE_EQUITY_FY2025,undefined,cf);
 assert.equal(result.find(c=>c.id==='opening-equity')?.status,'warning'); assert.doesNotThrow(()=>assertReportReady(result));
});
test('cash flow never inferred without comparative or supplementary data',()=>{
 assert.equal(cash(bs,undefined,pnl,sample.SAMPLE_SUPPLEMENTARY_FY2025).isAvailable,false);
 assert.equal(cash(bs,prior,pnl,undefined).isAvailable,false);
 assert.equal(cash(bs,{...prior,isReconciled:false},pnl,sample.SAMPLE_SUPPLEMENTARY_FY2025).isAvailable,false);
});
test('signed losses reduce retained earnings without flipping contra accounts',()=>{
 const e=equity({...sample.SAMPLE_EQUITY_FY2025,openingShareCapital:100,openingRetainedEarnings:-20,openingOtherReserves:10,shareIssuance:0,dividendsDeclared:5,otherComprehensiveIncome:-2},-30,[]);
 assert.equal(e.closingRetainedEarnings,-55);assert.equal(e.closingTotalEquity,53);
});
test('contra liability and expense keep economic debit/credit sign',()=>{
 const a={...rows[0],classification:'current_liability' as const,isContra:true,adjustedDebit:20,adjustedCredit:0};
 assert.equal(position([a],0).totalLiabilities,-20);
 assert.equal(profit([{...a,classification:'operating_expense',adjustedDebit:0,adjustedCredit:20}]).netProfit,20);
});
test('unusual account sign is a review warning, not an automatic sign correction',()=>{
 const custom=[{...rows[0],isContra:true}];
 assert.equal(validateReportReadiness(custom,bs,eq,sample.SAMPLE_EQUITY_FY2025,prior,cf).find(c=>c.id==='contra')?.status,'warning');
});
test('journals reject duplicate posting IDs and invalid dates/periods',()=>{
 const journal=structuredClone(sample.SAMPLE_ADJUSTMENTS_FY2025[0]);
 assert.throws(()=>adjust(sample.SAMPLE_TB_FY2025,[journal,journal]));
 for (const date of ['2025-02-30','2026-01-01','']) assert.ok(validateJournal({...journal,date},rows,sample.SAMPLE_PERIODS[0]).length);
 assert.ok(validateJournal({...journal,periodId:'wrong'},rows,sample.SAMPLE_PERIODS[0]).length);
});
test('draft journals do not change trial balance',()=>{
 const journal={...sample.SAMPLE_ADJUSTMENTS_FY2025[0],status:'draft' as const};
 assert.deepEqual(adjust(sample.SAMPLE_TB_FY2025,[journal]).adjustedRows,adjust(sample.SAMPLE_TB_FY2025,[]).adjustedRows);
});
test('journal subcent amounts are rejected before posting',()=>{
 const journal=structuredClone(sample.SAMPLE_ADJUSTMENTS_FY2025[0]);journal.lines[0].debit=.001;
 assert.ok(validateJournal(journal,rows).length);
});
test('known chart codes preserve IDs on import and resolve missing classification',()=>{
 const chart=[{...rows[0],accountId:'custom-cash-id'}];
 const result=map([{...raw[0],classification:''},raw[1]],mapping,chart);
 assert.equal(result.rows[0].accountId,'custom-cash-id');assert.equal(result.rows[0].classification,'current_asset');assert.equal(result.isBalanced,true);
});
test('unmapped chart codes require a user-selected classification',()=>{
 const data=[{...raw[0],classification:''},raw[1]];
 assert.equal(map(data,mapping).errors.length,1);assert.equal(map(data,mapping,[],{'1010':'current_asset'}).isBalanced,true);
});
test('explicit FALSE contra flag overrides a name and existing flag',()=>{
 const result=map([{...raw[0],name:'Discount expense',contra:'FALSE'},raw[1]],mapping,[{...rows[0],isContra:true}]);
 assert.equal(result.rows[0].isContra,false);
 assert.ok(map([{...raw[0],contra:'maybe'},raw[1]],mapping).errors.length);
});
test('missing columns, duplicate mapping, malformed grouping and orphan amounts fail',()=>{
 assert.ok(map(raw,{...mapping,credit:''}).errors.length);
 assert.ok(map(raw,{...mapping,credit:'debit'}).errors.length);
 assert.ok(map([{...raw[0],debit:'1,00'},raw[1]],mapping).errors.length);
 assert.ok(map([{...raw[0],code:'',name:''}],mapping).errors.length);
});
test('invalid rows never contribute to preview totals',()=>{
 const result=map([{...raw[0],classification:'invalid'},raw[1]],mapping);assert.equal(result.totalDebit,0);assert.equal(result.isBalanced,false);
});
test('CSV codes retain leading zeroes and missing-code rows are reported',async()=>{
 const file=new File(['code,name,classification,debit,credit\n001,Cash,current_asset,1,0\n002,Capital,equity,0,1\n,Bad,current_asset,3,0'],'tb.csv');
 const parsed=await parseFileToRawData(file);assert.equal(parsed.rawRows[0].code,'001');assert.equal(parsed.rawRows.length,3);assert.ok(map(parsed.rawRows,autoDetectColumnMapping(parsed.headers)).errors.length);
});
test('empty files, duplicate headers, excessive sizes and unsupported formats fail',async()=>{
 await assert.rejects(()=>parseFileToRawData(new File(['code,name,name,debit,credit\n1,Cash,X,1,0'],'bad.csv')));
 await assert.rejects(()=>parseFileToRawData(new File([''],'empty.csv')));
 await assert.rejects(()=>parseFileToRawData(new File(['{}'],'data.json')));
 await assert.rejects(()=>parseFileToRawData(new File([new Uint8Array(5*1024*1024+1)],'large.csv')));
});
test('equity form validates subcent, period and negative movement data',()=>{
 assert.deepEqual(validateEquityMovement(sample.SAMPLE_EQUITY_FY2025,sample.SAMPLE_PERIODS[0].id),[]);
 for (const data of [{...sample.SAMPLE_EQUITY_FY2025,shareIssuance:-1},{...sample.SAMPLE_EQUITY_FY2025,openingRetainedEarnings:.001}]) assert.ok(validateEquityMovement(data,sample.SAMPLE_PERIODS[0].id).length);
});
test('export services reject forged reconciliation flags and equity mismatch',()=>{
 assert.throws(()=>assertStatementsReconcile({...bs,totalAssets:bs.totalAssets+1,isReconciled:true},eq));
 assert.throws(()=>assertStatementsReconcile(bs,{...eq,closingTotalEquity:eq.closingTotalEquity+1}));
});

test('loaded workspace validates all ledgers before entering React state',async()=>{
 const {validateWorkspace}=await import('../src/services/workspaceValidation');
 const data={schemaVersion:1 as const,companies:[sample.SAMPLE_COMPANY],selectedCompany:sample.SAMPLE_COMPANY,periods:sample.SAMPLE_PERIODS,selectedPeriod:sample.SAMPLE_PERIODS[0],tbRows:sample.SAMPLE_TB_FY2025,adjustments:sample.SAMPLE_ADJUSTMENTS_FY2025,comparativeTbRows:sample.SAMPLE_TB_FY2024,equityMovement:sample.SAMPLE_EQUITY_FY2025,supplementary:sample.SAMPLE_SUPPLEMENTARY_FY2025,auditLogs:[],versionSnapshots:[],ledgers:{}};
 assert.doesNotThrow(()=>validateWorkspace(data));
 assert.throws(()=>validateWorkspace({...data,ledgers:{'unknown':data}}));
 assert.throws(()=>validateWorkspace({...data,equityMovement:{...sample.SAMPLE_EQUITY_FY2025,openingRetainedEarnings:NaN}}));
});

test('shipped demo CSV is importable and keeps comma-containing account names',async()=>{
 const fs=await import('node:fs');const parsed=await parseFileToRawData(new File([fs.readFileSync('examples/trial-balance.csv')],'demo.csv'));
 const result=map(parsed.rawRows,autoDetectColumnMapping(parsed.headers),sample.SAMPLE_TB_FY2025);
 assert.deepEqual(result.errors,[]);assert.equal(result.isBalanced,true);assert.equal(result.rows.find(row=>row.accountCode==='1510')?.accountName,'Property, Plant & Equipment');
 assert.equal(profit(adjust(result.rows,sample.SAMPLE_ADJUSTMENTS_FY2025).adjustedRows).netProfit,35000);
});
