import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
const browser = await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,args:['--no-sandbox']});
const page=await browser.newPage();
const errors=[];page.on('pageerror',error=>errors.push(error.message));
await page.route('http://finstatement.test/**', async route=> {
 const relative=new URL(route.request().url()).pathname;
 const target=path.resolve('dist',relative==='/'?'index.html':'.'+relative);
 if (!target.startsWith(path.resolve('dist')+path.sep)) return route.abort();
 const ext=path.extname(target); const contentType=ext==='.js'?'application/javascript':ext==='.css'?'text/css':'text/html';
 await route.fulfill({body:fs.readFileSync(target),contentType});
});
await page.goto('http://finstatement.test/');
await page.getByText('Demo: in-memory synthetic data. Sign in for cloud persistence.').waitFor();
await page.screenshot({path:'docs/dashboard.png',fullPage:true});
for (const label of ['Trial Balance','Adjustments','Statements','Ratios','Audit Trail']) {
 const button=page.getByRole('button',{name:label,exact:true}).first();
 await button.click(); await page.waitForTimeout(100);
}
await page.setViewportSize({width:390,height:844});
await page.getByRole('button',{name:'Workspace Menu',exact:true}).click();
await page.screenshot({path:'docs/mobile.png',fullPage:true});
if(errors.length) throw new Error(errors.join('\n'));
console.log('PASS: desktop render, tab navigation, mobile menu; zero uncaught browser errors');
await browser.close();
