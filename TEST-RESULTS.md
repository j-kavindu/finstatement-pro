# P01 verification results

Release 0.2.0. All test data is synthetic. This report replaces the previous baseline's test-status summary; it does not claim financial compliance or live Firebase verification.

| Check | Result |
|---|---|
| TypeScript strict `npm run typecheck` | Passed |
| Node unit/regression suite `npm test` | 36 passed, 0 failed, 0 skipped |
| Existing engine scenario suite `npm run test:browser-suite` | 12 scenarios passed; executed under Node |
| Vite production build | Passed; initial bundle-size warning remains |
| Actual Chromium UI acceptance | Passed at 1440, 1280, 1024, 768 and 390px widths |
| Sample XLSX/PDF generation | Passed; generated workbook reopened with all seven worksheets |
| Downloaded XLSX content | Passed; equity numeric components sum to 212,000 |
| Downloaded PDF content | Passed; four pages, draft controls and expected 35,000 profit / 269,000 assets present |
| Firestore emulator in local environment | Not executed: installed Java 17 is below CLI's Java 21 requirement |
| Production Firebase authentication and Firestore | Not configured or tested; user-owned project acceptance required |

## Unit/regression coverage

Decimal ties and cancellation; large bounded sums; invalid money; independent synthetic expected totals; opening equity mismatch even if final equity agrees; missing equity; rollforward mismatch; absent comparative/supplementary cash flow data; negative retained earnings and OCI; contra assets/revenue/liabilities/expenses; unusual signs; forged cached journal totals; duplicate journal IDs; invalid dates/periods; ignored drafts; invalid journal precision; stable account identity on re-import; explicit mapping and contra flags; missing/duplicate columns; invalid numeric grouping; orphan amount rows; rejected rows excluded from totals; leading zero codes; empty/oversized/unsupported files; duplicate headers; workspace validation; export reconciliation guards; shipped demo CSV round trip including comma-containing account names.

## Browser acceptance

The actual built app was exercised with Chromium 153. A normal Playwright browser download was unavailable in this environment; a temporary Chromium runtime supplied the executable via `PLAYWRIGHT_CHROMIUM_EXECUTABLE`. It is not an application dependency. Test routing uses HTTPS, as required for browser `crypto.randomUUID` support.

Verified navigation, five viewport widths without document overflow, mobile menu, valid CSV re-import, blocked invalid import, preserved posted journal links, reserve columns, opening equity mismatch/export rejection, correcting equity, actual XLSX/PDF downloads, period switching/restoration and a newly posted balanced payroll adjustment that changes profit to 34,900. Unbalanced posting is disabled. Zero uncaught browser errors in the final run.

Actual captures: `docs/dashboard.png`, `docs/mobile.png`, `docs/import-mapping.png`, `docs/journals.png`, `docs/equity.png`.

## Rules and production limits

The rules suite covers workspace ownership, anonymous/cross-user denial, revisions, append-only audit events, forged actors and unsupported workspace IDs. Local startup was blocked by Java 17, so no local emulator pass is claimed. The repository verification workflow provisions Java 21 and runs the emulator/browser suites. Check the workflow's actual result for the deployed commit.

This release does not verify production Firebase OAuth, email sign-in, deployed rule behavior or real confidential financial datasets. Follow DEPLOYMENT.md for those acceptance checks.
