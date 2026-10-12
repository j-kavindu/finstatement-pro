import { chromium, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
const browser = await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,args:['--no-sandbox']});
const page=await browser.newPage({ viewport:{width:1440,height:1000}, reducedMotion:'reduce' });
const errors=[];page.on('pageerror',error=>errors.push(error.message));
page.on('dialog',dialog=>dialog.accept());
fs.mkdirSync('docs',{recursive:true});
await page.route('https://finstatement.test/**', async route=> {
 const relative=new URL(route.request().url()).pathname;
 const target=path.resolve('dist',relative==='/'?'index.html':'.'+relative);
 if (!target.startsWith(path.resolve('dist')+path.sep)) return route.abort();
 const ext=path.extname(target); const contentType=ext==='.js'?'application/javascript':ext==='.css'?'text/css':'text/html';
 await route.fulfill({body:fs.readFileSync(target),contentType});
});
await page.goto('https://finstatement.test/');
await expect(page.getByRole('heading',{name:'Ready for draft review'})).toBeVisible();
await expect(page.getByText('$35,000.00',{exact:true}).first()).toBeVisible();
await page.screenshot({path:'docs/dashboard.png',fullPage:true});
for (const width of [1440,1280,1024,768,390]) {
 await page.setViewportSize({width,height:900});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
}
await expect.poll(async()=>page.locator('aside').evaluate(element=>element.getBoundingClientRect().right)).toBeLessThanOrEqual(0);
await page.screenshot({path:'docs/mobile.png',fullPage:true});
await page.getByRole('button',{name:'Workspace Menu',exact:true}).click();
await expect(page.getByRole('button',{name:'Trial Balance & TB Import'})).toBeVisible();
await page.getByRole('button',{name:'Trial Balance & TB Import'}).click();
await expect(page.getByRole('button',{name:'Apply Imported Trial Balance'})).not.toBeVisible();
expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
await page.setViewportSize({width:1440,height:1000});
// Re-import the synthetic TB: links to all existing journals must survive.
await page.locator('input[type=file]').setInputFiles('examples/trial-balance.csv');
await expect(page.getByRole('button',{name:'Apply Imported Trial Balance'})).toBeEnabled();
await page.screenshot({path:'docs/import-mapping.png',fullPage:true});
await page.getByRole('button',{name:'Apply Imported Trial Balance'}).click();
await expect(page.getByRole('heading',{name:'Ready for draft review'})).toBeVisible();
// Invalid file remains in preview and cannot replace the ledger.
await page.locator('input[type=file]').setInputFiles({name:'invalid.csv',mimeType:'text/csv',buffer:Buffer.from('code,name,classification,debit,credit\nNEW,Cash,current_asset,1,0')});
await expect(page.getByRole('button',{name:'Apply Imported Trial Balance'})).toBeDisabled();
await page.getByRole('button',{name:'Cancel',exact:true}).click();
// Existing synthetic journals remain available after import.
await page.getByRole('button',{name:'Adjusting Journal Entries',exact:true}).click();
await expect(page.getByText('Posted (locked)',{exact:true})).toHaveCount(3);
await page.screenshot({path:'docs/journals.png',fullPage:true});
await page.getByRole('button',{name:'Financial Statements (4 Primary)',exact:true}).click();
await page.getByRole('button',{name:'Draft Statement of Changes in Equity',exact:true}).click();
await expect(page.getByRole('columnheader',{name:'Other reserves',exact:true})).toBeVisible();
await page.screenshot({path:'docs/equity.png',fullPage:true});
// Opening total is reconciled independently from closing equity.
await page.getByRole('button',{name:'Edit equity movements'}).click();
await page.getByRole('spinbutton',{name:'openingRetainedEarnings',exact:true}).fill('82001');
await page.getByRole('checkbox').check();
await page.getByRole('button',{name:'Apply equity movements'}).click();
await expect(page.getByRole('heading',{name:'2 checks need attention'})).toBeVisible();
await page.getByRole('button',{name:'Export XLSX',exact:true}).click();
await expect(page.getByRole('status')).toContainText('Resolve validation checks');
await page.getByRole('button',{name:'Edit equity movements'}).click();
await page.getByRole('spinbutton',{name:'openingRetainedEarnings',exact:true}).fill('82000');
await page.getByRole('checkbox').check();
await page.getByRole('button',{name:'Apply equity movements'}).click();
await expect(page.getByRole('heading',{name:'Ready for draft review'})).toBeVisible();
for (const [label,ext] of [['Export XLSX','.xlsx'],['Download PDF Packet','.pdf']]) {
 const downloadPromise=page.waitForEvent('download');
 await page.getByRole('button',{name:label,exact:true}).click();
 const download=await downloadPromise;
 expect(download.suggestedFilename()).toContain(ext);
 const output=`docs/ui-export${ext}`;await download.saveAs(output);expect(fs.statSync(output).size).toBeGreaterThan(1000);
}
// Company period switching restores its ledger and three posted journals.
await page.getByLabel('Reporting period').selectOption('period-fy2024');
await page.getByLabel('Reporting period').selectOption('period-fy2025');
await expect(page.getByRole('heading',{name:'Ready for draft review'})).toBeVisible();
await page.getByRole('button',{name:'Financial Ratio Analysis'}).click();
await page.getByRole('button',{name:'Audit Activity & Snapshots'}).click();
await page.getByRole('button',{name:'Adjusting Journal Entries',exact:true}).click();
await page.getByRole('button',{name:'New Adjusting Entry',exact:true}).click();
const journal=page.getByRole('dialog',{name:'Adjusting journal'});
await journal.getByPlaceholder('e.g., Year-end depreciation on server hardware').fill('Synthetic payroll correction');
await journal.locator('select').nth(0).selectOption('acc-6010');
await journal.locator('select').nth(1).selectOption('acc-1010');
await journal.getByRole('spinbutton').nth(0).fill('100');
await expect(journal.getByRole('button',{name:'Post to Ledger',exact:true})).toBeDisabled();
await journal.getByRole('spinbutton').nth(3).fill('100');
await journal.getByRole('button',{name:'Post to Ledger',exact:true}).click();
await expect(page.getByText('Posted (locked)',{exact:true})).toHaveCount(4);
await page.getByRole('button',{name:'Executive Overview',exact:true}).click();
await expect(page.getByText('$34,900.00',{exact:true}).first()).toBeVisible();
if(errors.length) throw new Error(errors.join('\n'));
console.log('PASS: 5 responsive widths; navigation; CSV import and rejection; journal preservation; opening equity gate; actual XLSX/PDF downloads; period restoration; new balanced journal posting; zero uncaught browser errors');
await browser.close();
