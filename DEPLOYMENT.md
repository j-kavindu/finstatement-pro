# P01 deployment guide

The existing target is **GitHub Pages**: https://j-kavindu.github.io/finstatement-pro/ . It serves the synthetic in-memory app. Firebase is an optional separately configured backend; no production Firebase credentials are included.

## GitHub Pages

1. In the existing repository, Settings → Pages → Build source: **GitHub Actions**.
2. Install dependencies and verify locally:
   ```bash
   npm ci
   npm run typecheck
   npm test
   npm run build
   ```
3. Push the reviewed source to `main`. `.github/workflows/pages.yml` repeats type checks/tests, builds with `VITE_BASE_PATH=/finstatement-pro/`, uploads `dist` and deploys Pages.
4. Check the workflow concludes successfully. Open the live URL and confirm the **P01 / Reporting controls** panel and the USD 35,000 demo profit.
5. Import `examples/trial-balance.csv`, confirm existing journals remain, inspect Equity and export an XLSX/PDF packet. At 390px width, use **Workspace Menu**.

Manual builds must use the correct asset base:

```bash
VITE_BASE_PATH=/finstatement-pro/ npm run build
```

PowerShell:

```powershell
$env:VITE_BASE_PATH='/finstatement-pro/'
npm run build
```

For another repository slug, update that base path in the Pages workflow. The UI uses state-based tabs and does not require SPA route rewrites on Pages.

## Firebase Authentication and Firestore

1. Create/select your own Firebase project, register a web app and create the default Firestore database.
2. Enable Google and Email/Password sign-in; authorize localhost and the deployment domain (for this Pages site, `j-kavindu.github.io`).
3. Copy `.env.example` to `.env.local` and supply your Firebase web configuration. Web config is public client configuration; privileged service-account keys must never be put in Vite variables, source or GitHub.
4. Copy `.firebaserc.example` to a local `.firebaserc`; set your project ID.
5. With Node 22.12+/24 and **Java 21+**, verify the rules:
   ```bash
   npm run test:rules
   ```
6. Authenticate the Firebase CLI in your own environment:
   ```bash
   npx firebase login
   ```
7. Deploy only rules if keeping Pages as frontend:
   ```bash
   npx firebase deploy --only firestore:rules --project YOUR_PROJECT_ID
   ```
8. Rebuild the frontend with the Firebase web config. To use Pages, provide those `VITE_FIREBASE_*` values in its build environment; the supplied workflow intentionally does not configure a real account.

### Firebase Hosting alternative

Build with `VITE_BASE_PATH=/` (or unset it). The included `firebase.json` serves `dist`, rewrites app routes and supplies basic response headers.

```bash
npm run build
npx firebase deploy --only hosting,firestore:rules --project YOUR_PROJECT_ID
```

Review the destination project ID before deploying. There is no Firebase production deployment claim in this deliverable.

## Required acceptance for a real Firebase project

Use synthetic data and two test users. A saves a workspace, signs out and signs back in; data must restore. B and anonymous clients must not read/write A's workspace or logs. Attempts to modify/delete an existing audit event must fail. Two sessions saving at the same starting revision must not silently overwrite; the stale save must report a conflict. Exercise both Google and email sign-in, sign-out, company/period switching and the explicit save button.

Emulator results do not replace these production checks. Save is manual, and refresh/logout discards unsaved edits. Make external exports before destructive local changes.

## Rollback

Revert the P01 commit with a normal Git revert and push to main to rerun Pages deployment. Do not force-push over later work. This change keeps the existing Firebase paths and numeric field representation. A workspace written with `schemaVersion: 1` is otherwise compatible with the old payload shape; retain a backup before rolling application versions back.

## Test environment notes

Standard browser setup is `npx playwright install chromium`. If your environment already provides Chromium, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to its absolute executable path and run `npm run test:ui`. The tests serve the built assets through Playwright request routing and do not need an additional development server.

Firestore tools require Java 21+. With older Java, install a supported JDK and set `JAVA_HOME` to it before `npm run test:rules`. Do not report skipped/emulator-startup failures as passed tests.
