# NexusAirBX Security Audit

Date: 13 July 2026

## Executive summary

The frontend and backend were reviewed for authentication and authorization boundaries, browser injection, request forgery, remote fetches, secrets, dependency exposure, abuse controls, Studio bridge safeguards, payment webhooks, storage rules, and release configuration.

Two directly exploitable application paths were found and remediated during this audit: DOM-based cross-site scripting in the code search drawer and server-side request forgery/unbounded response buffering in the authenticated download proxy. Several defense-in-depth improvements were also applied to CORS, security headers, structured data rendering, verified-email enforcement, and route rate limits.

The application should not be released from the current repository state until the historical backend credentials described below are revoked or rotated. The repository history contains live-looking values for six credential types. Values are intentionally omitted from this report.

## Findings

| Severity | Status | Finding | Required action |
| --- | --- | --- | --- |
| Critical | Open — release blocker | Backend Git history contains non-placeholder values for `AI_GATEWAY_API_KEY`, `COMET_API_KEY`, `OPENAI_API_KEY`, `ROBLOX_OAUTH_CLIENT_SECRET`, `ROBLOX_OAUTH_TOKEN_ENCRYPTION_KEY`, and `STRIPE_WEBHOOK_SECRET`. | Revoke or rotate every affected credential, review provider access logs, then coordinate a history rewrite across branches, tags, clones, caches, and deployment systems. Do not treat history rewriting as a substitute for rotation. |
| High | Fixed | The frontend code drawer constructed HTML from generated or server-supplied code and rendered it with `dangerouslySetInnerHTML`, allowing active markup injection. | Replaced HTML construction with literal matching and React text nodes; added regression tests. |
| High | Fixed | The authenticated download proxy used substring host checks, followed redirects without revalidation, and buffered the entire response. This permitted SSRF bypasses and memory exhaustion. | Enforced HTTPS and exact trusted hosts, rejected credentials and custom ports, validated each redirect, capped redirects and response size, added a timeout and safe response headers, and added regression tests. |
| High | Conditional / open | Workspace runner routes permit authenticated users to request commands. The local adapter executes through the host shell. Production code rejects local mode, but safety depends on production configuration. | Confirm `NODE_ENV=production` and require a sandboxed runner in every deployed environment. Add an explicit capability or entitlement gate before enabling command execution for users. |
| High | Open | Production dependency scans report 62 frontend advisories (2 critical, 28 high, 22 moderate, 10 low) and 23 backend advisories (2 critical, 7 high, 13 moderate, 1 low). Counts include transitive packages and do not by themselves establish exploitability. | Triage reachability and upgrade in controlled batches. Priority packages include frontend `react-router-dom` and `react-scripts`, and backend `express-rate-limit` and `ws`; retest all affected flows. |
| Medium | Fixed | CORS allowed broader origin variants than intended, including permissive matching of Vercel preview hostnames. | Restricted production access to exact configured origins; allowed loopback origins only outside production. |
| Medium | Fixed | Baseline browser security headers were incomplete. | Added content-type sniffing, framing, referrer, and permissions protections at the backend and Vercel edge. A CSP remains a separate rollout item. |
| Medium | Fixed | Public frontend JSON-LD was serialized directly into script elements. | Escaped `<` during serialization to prevent script termination and markup injection. |
| Medium | Fixed | Tool routes did not consistently use verified-email and generation-specific abuse controls. | Required verified email for `/api/tools` and added appropriate read, generation, and user rate limits. |
| Medium | Open | App Check defaults to monitor-only and production enforcement was not demonstrated in this local audit. | Verify production enforcement and monitor rejection telemetry before relying on it as an abuse boundary. |
| Medium | Open | Stream session tokens can be returned in JSON and accepted from query parameters, where infrastructure and browser history may record them. | Prefer an HttpOnly-cookie-only transport; remove query-token fallback after client migration. |
| Medium | Open | No Content Security Policy is currently enforced. | Inventory required script, style, worker, frame, and connection sources; deploy a report-only policy, resolve violations, then enforce it. |
| Medium | Open | CI covers frontend tests and builds but does not provide backend security gates, secret scanning, static analysis, or dependency policy. | Add backend tests and syntax checks, secret scanning, dependency review, and static analysis as required checks. |
| Medium | Open | The backend repository tracks `.env` and a large `node_modules` tree. A new ignore file prevents new accidental additions but does not remove tracked files or history. | After credential rotation, remove generated dependencies and secret-bearing environment files from the index and history, preserving a placeholder-only `.env.example`. |

## Controls verified

- Firestore rules use owner-scoped or server-owned access patterns, with unmatched paths denied by default.
- Storage rules deny direct browser access, keeping object access server-owned.
- Stripe webhooks verify signatures from the raw request body. Unsigned handling is explicit and unavailable in production; replay claims are transactional.
- Studio routes require authentication and verified email and use rate limits. The tool protocol rejects non-authoritative browser fields, requires expected source hashes for known script edits, and snapshots destructive operations.
- Stream session tokens use cryptographic randomness, a short lifetime, and secure HttpOnly cookies in production, although the query fallback remains open as noted above.
- The workspace runner explicitly rejects local execution in production; deployed environment configuration still needs independent confirmation.

## Changes made during the audit

- Removed unsafe HTML rendering from the code drawer and added literal-search tests.
- Added a bounded, redirect-aware trusted remote-download policy and tests.
- Tightened production CORS to exact origins and added tests.
- Added backend and edge browser security headers and tests.
- Escaped structured-data script content.
- Added verified-email and rate-limit protections to tool routes.
- Added a backend ignore policy for environment files, dependencies, logs, and build artifacts.

## Verification

| Check | Result |
| --- | --- |
| Frontend security regression tests | Passed: 3/3 |
| Backend security regression tests | Passed: 12/12 |
| Full backend test suite | Passed: 507 passed, 1 skipped, 0 failed (508 total) |
| Public frontend checks | Passed: 15/15 |
| Public frontend production build | Passed: 186 static pages generated |
| Frontend full test suite | One unrelated failure: 72 suites passed, 1 failed; 291 tests passed, 1 billing-copy expectation failed |
| Changed backend file syntax checks | Passed |
| Vercel configuration parse | Passed |
| Patch whitespace checks | Passed |
| Main frontend production build | Passed, including the embedded public frontend build |

The skipped backend test requires the Firestore and Storage emulators. Dynamic testing against production, browser penetration testing, provider access-log review, deployed-header inspection, and Roblox Studio manual verification were not performed.

## Release order

1. Revoke or rotate all six exposed credential types and review their access logs.
2. Coordinate the repository history rewrite and invalidate old clones, cached artifacts, tags, and deployment inputs.
3. Remove tracked `.env` and `node_modules` content; retain only placeholder examples and lockfiles.
4. Verify production uses `NODE_ENV=production`, a sandboxed workspace runner, exact CORS origins, and enforced App Check.
5. Triage and upgrade reachable vulnerable dependencies, then repeat the full test and build matrix.
6. Add CI security gates and complete manual deployed-environment and Studio checks.
7. Roll out CSP in report-only mode before enforcement.
