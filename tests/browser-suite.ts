import { runAccountingTestSuite } from '../src/tests/accountingEngine.test';
const results = runAccountingTestSuite();
console.log(JSON.stringify(results, null, 2));
if (results.some(r => !r.passed)) process.exitCode = 1;
