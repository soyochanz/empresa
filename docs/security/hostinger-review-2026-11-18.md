# Hostinger review — 2026-11-18

## Scope and evidence

Read Hostinger dashboard, vulnerability detail and malware history; reviewed public gateway, server entrypoint, API authorization and browser error handling. Ran local tests and read-only production requests. No payment, subscription, secret, database permissions or customer records changed. This is a scoped review, not a guarantee against compromise.

## Findings

- Hostinger flags esbuild 0.25.12 / GHSA-gv7w-rqvm-qjhr as high. The official advisory is withdrawn: the original issue concerned the Deno installer, whereas this deployment uses Node/npm. Upgrading all esbuild consumers to 0.28.1/0.28.2 was tested and rejected: Vite 6 builds fail on the existing browser targets (destructuring transform). Original dependency lock retained; do not force an incompatible upgrade just to clear the dashboard.
  Source: https://github.com/advisories/GHSA-gv7w-rqvm-qjhr
- npm audit reports picomatch and three dependent packages (fdir, tinyglobby, vite), representing one underlying extglob ReDoS advisory. Installed picomatch 4.0.4; official advisory lists <=4.0.7 and no patched version. No application-controlled or user-controlled glob invocation found; dependency is used by build/dev tooling. Vite is now imported only in development, not at production startup. Residual dependency risk remains: avoid untrusted build inputs and revisit when an upstream fix is published.
  Source: https://github.com/advisories/GHSA-fc5q-39xc-vjpf
- Hostinger malware history shows one removed `node_modules/html2pdf.js/dist/html2pdf.bundle.min.js.map` in an old Oct 19 build version. No later detections displayed through Nov 18. The historical file/signature was unavailable; neither compromise nor false positive established. Do not restore that file. Source maps and bundled backend artifacts are blocked by gateway and server.
- Malformed encoded public paths could reach Express's exception handler. Gateway now returns controlled 400/no-store without an exception trace.
- Versioned public assets previously lacked immutable caching. Only fingerprinted frontend assets now receive one-year immutable cache; HTML/service worker remain fresh and private responses remain no-store.
- Actual browser console proves `M_ID` errors originate at `chrome-extension://…/executors/200.js`. Global promise handler wrongly described every rejection as a Supabase save failure. Extension-origin errors no longer overwrite save feedback; unexpected application errors get a neutral message, and operation-specific save failures remain unchanged. Audit upload transport failures retain queued logs and retry instead of generating unhandled rejections.

## Validation

- TypeScript / encoding checks passed.
- Client error classification tests: extension stack excluded; same message from app and Supabase errors still classified as application errors.
- Public gateway tests: offline landing, private routes, auth, cookies, redirects, exact signed webhook bytes; malformed URI 400; versioned-only immutable cache.
- Payment access tests: anonymous/forged/customer/unconfirmed tokens and auth outage blocked without side effects; admin accepted; public methods limited; backend artifacts denied.
- Full production build and finance regression suite passed with original compatible lockfile.
- Production before deployment: root and www valid HTTPS/200; unauthenticated Stripe balance API 401; backend artifact 404.
- Hostinger historic desktop PageSpeed 95 is a baseline only, not a fresh performance measurement.

## Remaining work outside this patch

Monitor upstream picomatch remediation. Hostinger may continue displaying the withdrawn esbuild advisory. A confirmed malware investigation would require the original quarantined sample/detection signature and retained access logs. No evidence from this limited review establishes a breach.
