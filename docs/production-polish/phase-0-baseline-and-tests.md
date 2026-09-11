# Phase 0 baseline screenshots and test inventory

## Baseline capture protocol

Captures were made from the pinned revisions recorded in the programme README. Web surfaces used the local development/static builds and deterministic local development authentication where needed. Connector states used its built-in preview fixture. The Studio Plugin image is a read-only capture of the already-open local Studio session; no place content, setting, connection, command, snapshot, or recovery action was changed.

Requested viewport names are embedded in filenames. Full-page browser screenshots can be a few pixels narrower than the requested viewport because the browser reserves scrollbar width, and can be taller than the viewport because the complete document is captured.

The preferred browser-verification CLI was unavailable in the environment, so browser captures used the computer-use fallback. Pages were checked for visible layout and sampled console errors. The evidence is local and intentionally ignored by Git; the tracked [manifest](./phase-0-baseline-manifest.md) records file names, dimensions, sizes, and SHA-256 hashes.

## Coverage achieved

| Surface/state | Desktop evidence | Narrow/responsive evidence | Notes |
| --- | --- | --- | --- |
| Protected homepage header | `home-header-1440x900.png` | Header appears in all homepage width captures; mobile Tools drawer captured open | Header is isolated as a separate crop for future permitted changes. |
| Protected homepage body | `home-body-and-header-1440x900.png`, CRA/Next comparison capture | 320, 375, 430, 768, 1024 widths | Body is a full-page baseline. The future comparator must crop/exclude the permitted header. |
| Authentication | Sign in and sign up | Sign in at 375 | Forgot-password, verification and callback failure are not yet separately captured. |
| Onboarding | Saved/resume state | Saved/resume at 375 | Idea/Roblox/Studio failures and completed handoff need deterministic state fixtures. |
| Workspace | Empty first conversation, model picker, Studio disconnected | Empty at 320, 375, 430, 768, 1024; disconnected at 375 | Long conversation, streaming, cancellation, tool calls, plans, change review and recovery remain gaps. |
| Settings | Overview | Overview at 375 | Authenticated deep sections, save failures, destructive confirmations and admin states remain gaps. |
| Billing/pricing | Billing account baseline; monthly and annual pricing | Billing at 375; pricing at all required widths | Failed payment, expired subscription, delayed usage, Team and checkout return states need fixtures. |
| Downloads/docs | Index pages | Both at 375 | Release-missing, stale compatibility and docs search empty/error states need fixtures. |
| Error route | 404 | 404 at 375 | Route-level data failures are not covered by the generic 404. |
| Connector | Sign in, connecting, connected, MCP unavailable, degraded, settings, diagnostics | Fixed 960×700 product window fixture | Real packaged startup, multiple Studio sessions, auth expiry, update failure and port/firewall conditions need acceptance. |
| Embedded Desktop Workspace | Workspace, Monaco editor, Billing, Settings, Support fixtures | Fixed 1180×800 renderer fixture | Fixture explicitly does not establish live parity, provider, billing, migration or Studio correctness. |
| Studio Plugin | Current connected Settings state in actual Studio | Current dock/floating window only | Tools, Activity, Recovery, unpaired, narrow minimum size, approval, partial apply, verification failure and restore conflicts remain gaps. |

## Responsive observations

- Empty Workspace remained task-usable at 320, 375, 430, 768, 1024 and 1440 widths; the composer stayed visible and no global horizontal overflow was observed in that fixture.
- Authentication, onboarding resume, settings overview, billing, docs, downloads and 404 surfaces remained readable in the captured narrow state.
- Mobile primary navigation collapses into the Tools/site-index drawer; the open 375px capture records the discoverability baseline.
- At 320px the homepage root showed a 10px client/scroll-width discrepancy in the browser measurement. Because the body is protected, treat this as a baseline issue for classification rather than permission to restyle it.
- The pricing comparison region is intentionally horizontally scrollable at narrow widths. Future checks must identify the overflowing element and must not fail solely because contained tabular content scrolls.
- Captures do not substitute for keyboard, screen-reader, zoom, reduced-motion or forced-colour validation.

## Test and validation results

All outcomes below are inherited baseline results, not regressions introduced in Phase 0.

| Command | Outcome | Detail |
| --- | --- | --- |
| `npm run test:production-routing` | Pass | 25/25 tests. Hybrid route classification, canonical/noindex and status behaviour passed. |
| `npm run test:public-frontend` | Fail | 21/22 tests passed. One test expects `/favicon-transparent.png`; the shared header currently renders `/favicon.png`. |
| `npm run test:billing-catalog` | Pass | 1/1. Frontend/backend JSON catalogue copies are deeply equal and pinned Pro values match assertions. This does not validate deployed Stripe objects. |
| `npm run design:guard` | Fail | Seven existing unapproved radii in `src/pages/ai/WorkspaceRibbon.css`: `9px`, `2px`, and `12px` occurrences. |
| `CI=true npm test -- --watchAll=false` | Fail | 236 suites passed, 4 failed; 1,384 tests passed, 5 failed, 1,389 total; zero snapshots. Failures are detailed below. |
| `npm run build` | Pass | Plugin download verified; sitemap/public generation crawled 102 production API pages, considered 7,457 qualified icons, published 150 and excluded 2,684; CRA and Next builds completed, producing 188 static Next pages. |
| `npm run plugin:test` | Pass with skips | 75 passed, 0 failed, 2 skipped, 77 total. Executable Luau lifecycle checks skip because `LUAU_BIN` is not configured. |
| `node --test backend/src/lib/studioToolProtocol.test.js` | Pass | 42/42 versioned Studio protocol tests. |
| `node --check backend/server.js` | Pass | Backend entry-point syntax check. |
| `npm run check --prefix local-connector` | Pass | Typecheck, 219 tests and TypeScript build passed. |
| `npm run check --prefix desktop-connector` | Pass | Typecheck, 42 Node tests, 7 Vitest tests and production build passed. |
| `npm run preview:capture --prefix desktop-connector` | Pass | Workspace/editor/Billing/Settings/Support fixture captures; no external requests or renderer console errors. |
| `npm run validate:firestore-indexes --prefix backend` | Pass | Index configuration validation passed. |
| `npm run gate:task-runtime-stage0 --prefix backend` | Pass with focused tests skipped | Packaging/flag gate passed and reported default-off/no staging cutover; focused suites were not enabled. |
| `npm run test:unit --prefix backend` | Fail | 1,943 passed, 23 failed, 3 skipped, 1,969 total. Failures are grouped below. |
| `npm run test:integration --prefix backend` | Fail | 1,024 passed, 3 failed, 2 skipped, 1,029 total. The three shared failures are grouped below. |

### Root web test failures

| Test file | Failure |
| --- | --- |
| `src/pages/ai/ui/UiImplementationDrawer.test.jsx` | Changing the selected file expected a second read but observed only one. |
| `src/components/assets/ModelFilePipelinePanel.test.jsx` | Expected display value `Roblox balanced` is absent. |
| `src/components/ai/workspace/StudioControls.test.jsx` | Read-only MCP fixture cannot find `Automatic — unavailable`; target-registry fixture cannot find the Playtest option despite advertised MCP playtest/write capabilities. |
| `src/styles/aiTheme.test.js` | Assertion expects `box-shadow: var(--nx-shadow-card)` while current CSS declares `none`. |

Additional warnings include unwrapped asynchronous PlanCard updates, duplicate keys in the Universal Header command menu, and React Router future-flag notices.

### Backend unit/integration failures

Three failures appear in both the unit and broad integration commands:

- `backend/src/services/ProjectAssetService.test.js`: project automatic upload should reject when the master upload setting is disabled;
- `backend/src/services/RobloxOAuthService.test.js`: disconnect should complete local revocation when provider revocation is unavailable;
- `backend/src/services/WorkflowAssetContextService.test.js`: expected exactly 17 canonical asset tools and credential-shaped metadata stripping.

The remaining unit failures include:

- `backend/src/lib/nexusCredits.test.js`: strict checkout rejection of monetary overrides, legacy plans and invalid Team seats;
- a concentrated set in `backend/src/services/agentV2/ChatAgentService.test.js` covering shared project slot/FIFO scheduling, terminal-job reconciliation, deletion fences, executable/Studio/token gates, agent deletion, cancellation and promotion, missing/terminal queue heads, deferred launch, informal and concurrent continuation, old live-build handling, direct full-game team mode, cross-chat/project continuation, unresolved-goal recovery, terminal failed goals, and reviewed-success projection;
- related task/outbox cancellation compensation in the task-runtime service tests.

The concentration may indicate shared harness or contract drift, but it has not been diagnosed and must not be collapsed into one assumed cause.

## Existing automated-test inventory

| Area | Existing coverage | Important gap |
| --- | --- | --- |
| Root React components/hooks/libs | 240 test files, Testing Library/Jest, extensive Workspace, Studio, billing, header and content tests | No real-browser critical-flow suite; five current failures; zero image snapshots. |
| Production routing/public HTML | Node tests for classifier and exported HTML | Public HTML suite is red; no deployed-preview navigation crawl. |
| Pricing catalogue | Root/backend JSON deep parity and selected pinned values; backend billing tests | No read-only verification of live Stripe IDs/products, taxes/currency, flags or webhook compatibility. |
| Backend | 302 test files across lib/services/routes/runtime plus Firestore-specific tests | Unit/integration baselines are red; provider/staging flows and some focused gates depend on external config. |
| Studio protocol | Dedicated 42-test protocol suite plus broad Studio service coverage | Manual protocol checklist not executed in this audit; live Plugin state matrix incomplete. |
| Studio Plugin | JavaScript bundle/contract tests and optional Luau lifecycle execution | Two executable lifecycle tests skipped without Luau CLI; no automated visual/theme/narrow-dock suite. |
| Local connector | Typecheck, 219 tests and build | Real official MCP/Studio/version combinations and terminal accessibility/manual usability. |
| Desktop Connector | Node/Vitest/type/build, fixture render firewall, CI packaging/signing flows | Local audit did not sign/package/install; real backend/Studio/multiple-session/update/port/firewall acceptance remains. |
| Accessibility | Some semantic roles, labels, focus tests and reduced-motion CSS in component code | No first-party axe/jest-axe suite, browser keyboard journey, screen-reader pass, zoom, forced-colours or contrast gate. |
| Responsive | Component CSS/tests and this manual screenshot sample | No automated element-level overflow/action-visibility matrix across all required widths. |
| Visual regression | Local Phase 0 screenshots | No configured screenshot matcher, approved baseline store or CI diff. |
| Performance | CRA/Next/Vite build size output and some virtualization dependencies | No budgets for route load, layout shift, stream rendering, long histories, Connector startup or memory. |

CI currently runs full root Jest plus web build, task-runtime packaging checks, and independent Connector release workflows. The nested backend repository runs index validation, task-runtime gate, unit/integration tests and syntax checking in its own CI. There is no visual-regression or accessibility CI workflow.

## Critical flows without sufficient automated coverage

1. Full auth lifecycle: provider/email sign-up, verification, return-path restoration, expiry and re-authentication.
2. Idea-first onboarding through a useful plan, deferred Roblox connection, Plugin setup, failure/resume and final Workspace handoff.
3. Long streaming conversation with stop, reconnect, retry, preserved draft and model disappearance.
4. Plan approval/change/cancel into build with immediate feedback and no duplicate execution.
5. Studio read → change review → expected-hash write → snapshot → partial acknowledgement → verification → safe recovery.
6. Wrong-place/stale-context handling across Workspace and Plugin without an accidental write.
7. Snapshot restore with user edits, partial restore, irreversible consequences and verified outcome.
8. Live pricing/checkout/portal/webhook/entitlement reconciliation for every active plan, interval and Team gate.
9. Usage delay/reset and feature/model restriction explanations.
10. Connector browser auth, packaged startup, Studio/MCP discovery, multiple sessions, degraded recovery, update and local-service failure.
11. Plugin theme and minimum-size behaviour across Tools, Activity, Recovery, Settings and every lifecycle state.
12. Keyboard-only, screen-reader, zoom, reduced-motion and forced-colour journeys through menus, dialogs, composer, stream, change review and recovery.

## Baseline limitations and safe next step

This evidence is suitable for understanding the current static layout and identifying architecture risks. It is not sufficient to approve a production redesign because many dynamic states cannot yet be reproduced safely.

The next baseline task is a test-only state fixture system that imports the same typed state adapters as production, makes no network calls or writes, is excluded from production routing/build output, and can render every lifecycle/error/entitlement/connection combination at the required viewports. The homepage body should instead use direct before/after visual comparison against the current protected captures.
