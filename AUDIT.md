# Audit and remediation — 12 October 2026

Input: uploaded finstatement-pro-audited(1).zip. Existing application retained and edited; no public deployment or repository overwrite.

| Confirmed finding | Implemented remediation |
|---|---|
| Vite 8 / direct esbuild 0.25 dependency conflict | Removed incompatible pin; installed compatible dependency tree and npm lock |
| Unused Express, dotenv, Gemini SDK and obsolete AI Studio database blueprint | Removed unused packages, metadata capability, blueprint and stale Bun lock |
| TypeScript strict checks disabled, legacy Vite dirname | Enable strict compiler; use import.meta.dirname and configurable base path |
| Original FY2025 dataset unbalanced by USD 40,000; equity difference USD 25,000; cash difference USD 5,800 | Rebuild synthetic dataset from explicit balanced transactions and reviewed year-end journals, without balancing plugs |
| Engine trusted posted journal flags/totals and ignored missing accounts | Validate actual lines, recompute totals, reject unknown accounts, negatives, dual lines and unbalanced/forged entries |
| Posted journals could be unposted/deleted | Lock posted UI entries; require reversal journals; validate journal dates against period |
| Duplicate manual account codes/IDs and invalid balances | Engine/UI trial balance validation and unique new-code selection; protect posted account references |
| Nonfinite amounts silently zeroed, negative rounding flaws | Reject nonfinite/unsafe values; symmetric cent rounding and integer-cent sums; retain dimensionless ratio precision |
| Other income inflated sales/gross margins | Separate other income, include it after gross profit, show/export explicitly |
| Equity ignored reserves/OCI; opening retained fallback included capital | Include reserves/OCI totals, correct retained fallback, add real equity movement editor and mismatch warning |
| Missing supplementary cash movements defaulted to zero | Require reconciled comparative data and complete supplementary values; explicit tax/interest operating payments; prevent payable/accrual double counting |
| Supplementary editor inferred tax/interest cash payments from expenses | No such cash-payment defaults; require user confirmation of all movements including zero values |
| Import accepted junk, clipped negatives, defaulted unknown classes to expense, never populated errors | Strict parser/classification/duplicate errors; block invalid import; 5 MB limit; case-insensitive extensions |
| Account-name mapping selected Account Code | Remove ambiguous account header fallback; prioritize description/name |
| CSV quoting/formula injection and blob URL leak | Escape/neutralize cells, revoke URLs, include currency/draft metadata |
| Exported TB adjusted values stale; PDF omitted cash flow and most ratios | Pass calculated rows; add dedicated cash flow PDF page and all ratios; correct operating expense display |
| Firebase auth existed but financial data was only localStorage | Remove financial localStorage; UID-private cloud workspace reads/manual saves, server timestamps and revision conflicts |
| Company/period selection only changed labels | Separate ledger map, filter periods, initialize new entities, reuse actual stored comparative ledger; block closed TB/journal edits |
| Supplementary form retained prior ledger values; equity update prop unused | Remount per ledger, edit every movement field, implement equity form |
| Firestore rules described unused collections | Rules match actual UID workspace and saved immutable audit collection; deny all other paths |
| Error logs exposed auth metadata; audit UI overclaimed immutability | Redacted errors, append-only saved records with server timestamps, accurate activity UI label |
| Narrow-screen header overflow and missing chart interaction | Responsive clusters, mobile labels/menu controls and real-number performance/position chart toggle |
| No executable automated suite; original journal assertion merely checked a fabricated flag | Node test runner, negative cases and import/export tests; actual journal rejection assertion |
| Vulnerable older SheetJS and gRPC | Vendor official SheetJS 0.20.3, patched gRPC override; production dependency audit zero known advisories |
| Incomplete deployment/portfolio documentation | README, deployment guide, examples, test evidence, Hosting headers and verification-only CI workflow |

## Verification

Strict types and production build pass. Twelve new automated tests and twelve assertions in the existing in-app suite pass. Actual PDF/XLSX exports generated; workbook reopened with six sheets. Three-page PDF rendered and visually inspected. React server render passes. See TEST-RESULTS.md and raw evidence.

## Remaining limitations / unfinished work

- Live Google/email authentication and logout/login persistence are not verified: no user Firebase project configured.
- Emulator tests could not start: installed Firebase CLI requires Java 21+, environment has Java 17. Tests included, not passed.
- Browser UI tests blocked: Chromium unavailable; installation repeatedly returned an invalid/truncated ZIP. No actual UI screenshots. Server rendering does not verify mobile layout, click behavior or accessibility.
- Private workspace is one aggregate with a 900 KB client cap. Ownership/revision rules do not recursively recompute accounting entries. Users can edit their own aggregate outside UI. Production needs normalized collections and trusted posting validation.
- Saved audit documents are append-only; UI activity copy is owner-editable. Unsaved events are not durable; latest 100 active-period events copied per save. Report versions are KPI milestone summaries, not immutable full report snapshots.
- Cash/working capital identified through account names. No complete noncash/FX/acquisition/lease/restricted cash treatment. Interest/tax use a draft operating policy. Mathematical reconciliation alone cannot prove completeness. IFRS 18 changes unimplemented.
- Opening equity fallback is name-based and warned; OCI/reserve totals supported but full statutory multi-column equity presentation and disclosures unimplemented. Capital/dividend/OCI movements must already be posted in ledger.
- Bounded two-decimal money MVP, not arbitrary precision or support for all currency scales. Contract-based revenue recognition, asset schedule automation and statutory disclosures need specialist implementation.
- Manual saving; unsaved changes can be lost on reload/logout. No automatic queue, offline merge or unsaved-change dialog.
- Full development audit: 11 advisories (7 high, 4 moderate), all Firebase CLI/development toolchain. Production-only audit: zero. Suggested forced major downgrade was not applied without compatibility validation.
- Large initial bundle warning remains. No light theme, modal focus trap, multiuser roles or complete period closing workflow.
- GitHub repository and hosting only prepared. No external publication performed.

## Conclusion

Improved, locally tested accounting portfolio MVP. Not a production-approved general ledger, audit opinion or fully IFRS/SLFRS-compliant reporting package. Missing source information is exposed rather than fabricated.
