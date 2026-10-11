# Executed checks — 12 October 2026

| Check | Status | Evidence / exact limit |
|---|---|---|
| Dependency installation | PASS after correction | Initial ERESOLVE repaired; npm install completed; package-lock included |
| Strict TypeScript | PASS | TEST-TYPECHECK.txt, no diagnostics |
| Production build | PASS with large-bundle warning | TEST-BUILD.txt |
| Node accounting/import/export tests | PASS 12/12 | TEST-UNIT.txt |
| In-app suite executed under Node | PASS 12/12 | TEST-LEGACY.txt; command name test:browser-suite does not imply browser execution |
| Actual XLSX/PDF generation | PASS | TEST-REPORTS.txt; Excel reopened with six worksheets |
| PDF rendering/visual review | PASS | Three pages rendered with Poppler and inspected; all ratios and cash flow included |
| React server-render smoke | PASS | TEST-RENDER.txt; not interactive/browser verification |
| Playwright UI smoke | BLOCKED, not passed | Executable absent; Chromium downloads invalid/truncated ZIP. TEST-UI.txt, TEST-BROWSER-INSTALL.txt |
| Firestore rules emulator | BLOCKED, not passed | Firebase CLI requires Java 21+, environment Java 17. TEST-RULES.txt |
| Rules without emulator host | SKIPPED, not passed | TEST-RULES-SKIP.txt |
| Production npm audit | PASS, zero known advisories | SECURITY-AUDIT-PRODUCTION.json |
| Full development npm audit | OPEN, 11 advisories | 7 high, 4 moderate in CLI tooling; SECURITY-AUDIT.json |
| Scoped credentials scan | PASS | No real private keys/service accounts/non-placeholder Firebase credentials found in source; env files ignored |
| Live Google/email auth and restoration | NOT RUN | Firebase project/configuration not supplied |
| GitHub/Firebase/Pages publication | NOT RUN | Prepared only; approval/account access needed |

## Independently specified sample expectations (synthetic USD)

Revenue 200,000; COGS 80,000; gross profit 120,000; payroll after accrual 50,000; accrued payroll 7,000; insurance expense 4,500; prepaid insurance 7,500; depreciation 18,500; accumulated depreciation 38,500; net profit 35,000.

Assets 269,000 = liabilities 57,000 + equity 212,000. Opening equity 182,000 + profit 35,000 - dividends 5,000 = closing equity 212,000. Operating cash 35,000; investing -20,000; financing -15,000. Opening cash 100,000 + zero cash change = closing cash 100,000.

Negative tests cover forged journal totals, missing accounts, malformed/negative/duplicate imports, missing cash-flow sources and invalid monetary values. Passing establishes tested behavior, not source-record accuracy or statutory compliance.
