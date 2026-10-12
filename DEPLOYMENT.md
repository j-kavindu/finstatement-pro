# Firebase Hosting and public-demo deployment

Status: the GitHub Pages **synthetic demo** was deployed by GitHub Actions on 11 October 2026. Firebase Authentication/Firestore are not configured here, and no Firebase production deployment or live authentication verification is claimed.

## Local verification

1. Install Node 22.12+ or 24 LTS. Run `npm ci`.
2. Configure `.env.local` from `.env.example` for your Firebase project.
3. Enable Google and Email/Password authentication, authorize the target domain, and create default Firestore.
4. Run `npm run typecheck`, `npm test`, `npm run test:browser-suite`, and `npm run build`.
5. Install Java 21+ and run `npm run test:rules`.
6. Run `npx playwright install chromium` and `npm run test:ui`. Inspect generated screenshots at desktop and 390px mobile width.

## Firebase

Set the correct project ID in a local `.firebaserc`, using `.firebaserc.example`. Authenticate with `npx firebase login` on your own machine.

After reviewing the app and approving public publication:

```bash
npx firebase deploy --only firestore:rules,hosting --project YOUR_PROJECT_ID
```

This publishes both rules and site; review the project ID carefully. The Hosting configuration serves `dist` and rewrites application routes to `index.html`. Header policies include nosniff, frame denial and a restrictive referrer policy. No server secrets are needed in the web app.

## Acceptance test against your project

Use two test accounts. Account A saves a synthetic company and another period, then logs out and back in; verify balances and journals return. Account B must not access A's workspace or audit documents. Anonymous reads must fail. Attempt a stale revision write and audit modification; both must fail. Test Google popup, registration, email sign-in and sign-out on the deployed domain. Test two browser sessions modifying the same workspace; the stale save must produce an error.

These live checks were not executed in the audit environment. Do not enter confidential financial data before completing them. Unsaved changes are in memory; Save is explicit.

## GitHub repository preparation

Create a new public repository named `finstatement-pro` under `j-kavindu` only after reviewing source and approving publication. Upload source files, package-lock, documentation, tests, sample synthetic datasets and vendored SheetJS package. Do not upload `.env.local`, node_modules, logs containing user data or service-account keys. The package includes only placeholder Firebase web configuration.

The included GitHub Actions workflow checks types, accounting tests and build, and attempts emulator checks with Java 21. It does not deploy automatically.

## GitHub Pages demo

Static hosting can serve this Vite app; tab navigation is state-based and has no external SPA routes. Build with the correct base:

PowerShell:

```powershell
$env:VITE_BASE_PATH='/finstatement-pro/'
npm run build
```

Bash:

```bash
VITE_BASE_PATH=/finstatement-pro/ npm run build
```

Publish the resulting `dist` directory with a Pages workflow or deployment branch. The unconfigured version uses synthetic in-memory data. For cloud mode authorize `j-kavindu.github.io` in Firebase and rebuild with your own configuration. HTTPS is provided by Pages; Firebase rules must still be deployed separately.

## Operational limits

The primary workspace aggregate is limited to 900 KB in this client and Firestore has a document size limit. Large businesses need a normalized backend, server posting validation, backup/restore and operational monitoring. This is a portfolio MVP; Hosting preparation does not imply production approval or IFRS/SLFRS certification.

## GitHub Pages public demo

In this repository, open Settings → Pages and choose **GitHub Actions** as the build source. Then rerun the Deploy GitHub Pages demo workflow, or push a commit to main. The workflow builds with `/finstatement-pro/` as the Vite asset base and publishes `dist`. Expected address: https://j-kavindu.github.io/finstatement-pro/ . This is a synthetic in-memory demonstration until Firebase is configured; do not upload private accounting records to the public repository. Firebase Hosting remains the recommended full application deployment.
