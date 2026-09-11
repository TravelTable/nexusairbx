# Phase 15 — validation, regression, and release readiness

Date: 11 September 2026

Work items: `NX-P15-01` functional regression, `NX-P15-02` visual regression, `NX-P15-03` accessibility, `NX-P15-04` pricing/entitlements, `NX-P15-05` performance, `NX-P15-06` release operations.

## Release decision

The production-polish implementation is complete at repository level and ready for integrated staging. Broad production release remains **conditional** on the five external gates listed below. This distinction is intentional: compilation, mocks, static analysis, and protocol tests cannot prove that live Stripe objects, OAuth providers, Roblox Studio, signed installers, or screen readers behave correctly.

No backend identifier, persisted schema, Studio command name, OAuth callback contract, Stripe amount, or homepage-body narrative was invented or broadly rewritten. The implementation uses presentation adapters, shared primitives, scoped compatibility tokens, and opt-in compatibility paths so each surface can be rolled back without data loss.

## 15.1 Functional regression evidence

| Surface or gate | Command/evidence | Result |
| --- | --- | --- |
| React application | `CI=true npx react-scripts test --watchAll=false --runInBand` | 242 suites; 1,406 tests; 0 failures |
| Complete web build | `npm run build` | Studio download verified; sitemap generated; CRA compiled; Next generated 188 pages; public export merged |
| Public server rendering | `npm run test:public-frontend` | 22/22 passed |
| Hybrid routing/deep links | `npm run test:production-routing` | 25/25 passed |
| Pricing catalogue parity | `npm run test:billing-catalog` | Passed; frontend Price-ID ownership rejected |
| Design-system enforcement | `npm run design:guard` | 30 semantic tokens and 5 component-contract groups passed |
| Backend | full `node --test` run | 2,283 passed; 0 failed; 6 environment skips |
| Studio protocol | `node --test backend/src/lib/studioToolProtocol.test.js` | 42/42 passed |
| Changed backend syntax | `node --check` on `server.js`, onboarding, Guided Launch, checkout and catalogue files | Passed |
| Studio Plugin | `npm run plugin:build` | 77 passed; 0 failed; 2 environment skips; bundle and download verified |
| Plugin artifacts | bundle/checksum/download verification | Build `nexusrbx-studio-0.15.1-ui-build.18-files-first`; 54 handlers; Luau bundle SHA-256 `28783af4e2564a15b76b8398a8de95cd75fd2f06fa583ab3475444b197ef0835`; downloadable RBXMX/manifest SHA-256 `a54ae3b60723c2729279703c319f588dfc14f4225431222e42433ee0cb803b0d` |
| Connector | `npm run check` in `desktop-connector` | TypeScript passed; 42 Node tests; 7 Vitest tests; main/renderer builds passed |
| Patch hygiene | `git diff --check` in root and backend repositories | Passed |

The backend skips are existing environment-dependent cases, not failures. Root tests still emit inherited React test-harness warnings about Router future flags and a few asynchronous `act(...)` boundaries; the suite is green, but test-noise cleanup remains maintainability work.

### Critical-flow assessment

| Flow | Deterministic evidence | External evidence still required |
| --- | --- | --- |
| Authentication/return paths | auth shell, redirect, verification, signup and route tests | Live Firebase callbacks and provider failure |
| Onboarding | client and server idea-first flow, saved progress, typed failures | Live OAuth denial/scope/account mismatch |
| Workspace/generation/stream/stop | controller, chat, transport, lifecycle, queue and cancellation tests; browser empty-state review | Staging model/provider stream |
| Plans/tool calls/change sets | plan approval, workflow plan, readable tool activity and lifecycle tests | Real Studio partial-write/receipt smoke |
| Studio connection/apply/verify/Snapshot | protocol, capability, expected-hash, snapshot and structured-error tests | Interactive Studio matrix |
| Settings/account | settings schema/navigation/context and browser responsive review | Signed-in provider state matrix |
| Pricing/billing/usage | parity, catalogue, checkout, credit, entitlement and page tests | Deployed Stripe object reconciliation |
| Plugin | static/bundle/protocol/status tests and verified artifact | Roblox Studio dock/floating/theme/runtime matrix |
| Connector | typecheck, unit/renderer tests, build and compatibility-mode checks | Signed installer/update/firewall/multiple-process matrix |

## 15.2 Visual and responsive evidence

The ignored local evidence directory is `artifacts/production-polish-phase-15/after/`; the Phase 0 comparison source is `artifacts/production-polish-phase-0/baseline/`. Captures use consistent 320×900, 375×900, 430×900, 768×1024, 1024×900 and 1440×900 viewports where applicable.

Captured after-state surfaces include:

- homepage full page and protected body at all six widths;
- homepage header and open mobile Tools surface;
- public downloads, pricing and documentation at all six widths;
- Nexus Workspace empty state at all six widths plus a final corrected 320px capture;
- settings at 320 and 1440 pixels.

Browser DOM checks found no document-level overflow on downloads, pricing, documentation, Workspace or settings at the tested widths. Two real 320px application defects were found during inspection and fixed:

1. The compact “Sign in” text was clipped inside a 44px control. It now renders a labelled account icon while retaining the accessible name and title.
2. The eighth Workspace dock action (“Build options”) began outside the viewport. The dock now reduces ornamental gaps below 360px; all eight 30px actions measure fully inside the viewport.

The final 320px Workspace geometry measured actions from `x=26` through `x=294` inside a 320px client viewport, with document `scrollWidth=320`. The final settings capture measured `scrollWidth=310` against a 310px client width after the native vertical scrollbar, so it has no horizontal scroll.

### Protected homepage classification

- Shared-header changes: **expected and permitted**.
- Protected-body copy, layout, hierarchy, sections and identity: **unchanged**.
- Scoped compatibility variables and body marker: **expected protection infrastructure**.
- Full-frame 1440 comparison difference: approximately 4.106%. The Phase 0 static baseline did not resolve the existing hero gameplay image, while the integrated production artifact did. When the permitted header and that unchanged media rectangle are excluded, the thresholded difference is approximately 0.433%, attributable to dynamic media and antialiasing. Source review and manual side-by-side inspection found no body layout, copy, hierarchy, or visual-identity migration.
- 320px non-overlay-scrollbar overflow: **existing baseline issue**. The protected `.page` still has its original 320px minimum, so a desktop browser reserving 10px for a scrollbar can expose 10px horizontal movement at an exactly 320px outer viewport. Changing it would violate the body-protection constraint. Mobile overlay-scrollbar viewports are unaffected; release review must explicitly accept or separately authorise this exception.

## 15.3 Accessibility evidence

Repository and browser checks cover:

- semantic button/link/input roles and accessible names;
- a shared focus treatment that is visible on selected and dark states;
- account-menu focus entry, arrow/Home/End movement, Escape close and trigger focus return;
- command-menu combobox/listbox/option semantics, active descendant, empty state, keyboard movement and focus return;
- mobile Tools dialog open/close and Escape focus return;
- Enter/Shift+Enter/IME composition, Stop, disabled, retry and attachment controls in the composer;
- intentional lifecycle live regions without making every static alert noisy;
- reduced-motion, reduced-transparency, increased-contrast and forced-colours contracts;
- coarse-pointer control sizing and long-content overflow;
- meaningful accessibility snapshots for homepage navigation, Workspace and settings.

The fresh integrated-artifact browser session reported no runtime JavaScript errors or error overlay on the public site or Workspace. The only public-site network misses were the optional local Connector manifest and Vercel Insights script, neither of which exists in the static local harness. Local API/auth fetch failures were expected because the backend and live providers were intentionally not connected; the UI stayed recoverable.

Automated role queries and accessibility trees are not a substitute for assistive technology. NVDA/VoiceOver, Windows forced colours, 200% zoom on authenticated fixtures, and Studio-host keyboard/accessibility behaviour remain the named external gate.

## 15.4 Pricing and entitlement integrity

The backend versioned billing catalogue is the repository source of truth. Frontend `price_*` values were removed. Checkout resolves a requested plan/interval through server configuration and rejects unavailable yearly combinations before calling Stripe. Catalogue parity tests cover plan keys, type, availability, interval support and absence of frontend Price IDs.

No amount was guessed and protected homepage pricing was not redesigned. The remaining P0 check is read-only reconciliation of deployed Stripe Price/Product objects and secrets against plan, currency, amount and interval, followed by checkout/portal webhook smokes.

## 15.5 Performance review

The final CRA report shows:

- main bundle: 322.81 kB gzip;
- largest lazy chunk: 474.54 kB gzip;
- main CSS: 27.58 kB gzip;
- public frontend: 188 statically generated pages.

This programme added small state/vocabulary adapters and CSS rather than a new dashboard framework. The final main-bundle delta reported by CRA was tens of bytes, not a material regression. Long workspace histories retain existing rendering behaviour; measurement-backed virtualization is P2.

The Connector build passes but retains existing large Editor, Mermaid, and worker chunks (roughly 3.48 MB, 2.45 MB and 6 MB uncompressed in the build report). Bundle splitting, packaged startup time and long-session memory measurement are assigned to Connector Performance P2 and must be observed before claiming performance optimisation is complete.

## 15.6 External release gates

| Gate | Owner | Priority/scope | Acceptance |
| --- | --- | --- | --- |
| Stripe production reconciliation | Billing Operations | P0 web release | IDs/products/currency/amount/interval match; checkout, portal, upgrade/downgrade/cancel/payment-failure and webhook smoke pass |
| Firebase/Roblox OAuth | Identity QA | P0 web release | Sign-in, callback, denial, expired auth, missing account, mismatch, changed permissions, reconnect and disconnect pass |
| Roblox Studio Plugin | Plugin QA | P0 Plugin release | Execute `docs/studio-tool-protocol.md` matrix for dock/floating, light/dark, wrong/stale place, permission, apply/partial/verify/restore and update |
| Authenticated assistive technology | Accessibility QA | P0 critical / P1 remaining | NVDA/VoiceOver/forced-colours/200% zoom pass with accurate, non-repeating lifecycle announcements |
| Signed Connector package | Desktop Release QA | P0 Connector release | Installer, signing, update feed, token expiry, reconnect, port conflict, firewall, local-service failure and multiple Studio sessions pass |

## Deployment, monitoring, and support

Deploy in this order:

1. Backend catalogue, checkout, onboarding and typed-error changes.
2. Web application/public export.
3. Verified Plugin artifact and matching `latest.json` after Studio QA.
4. Signed Connector after packaged-host QA.

Monitor after each step:

- auth callback, email-verification and Roblox connection error rates;
- onboarding workspace creation and conflict rates;
- catalogue/version mismatch, checkout creation, payment and entitlement refresh errors;
- model-catalog fallback frequency, generation cancellation/reconnect and unverified-complete outcomes;
- Studio connection layer, expected-source-hash conflict, snapshot, partial application and verification failures;
- Plugin download/update compatibility and Connector crash/reconnect/update metrics;
- client-side route errors, layout shifts and long-session memory.

Support-facing terminology should use the canonical vocabulary. Support must distinguish account connection, Studio Plugin connection, Connector/local-service health and Studio MCP diagnostics; it must never tell a user a change was verified when only generation or application completed.

## Rollback plan

Rollback is data-preserving and performed in reverse release order:

1. Connector: return to the prior signed build/feed; keep encrypted sessions and local preferences. The legacy embedded workspace remains available only as the existing opt-in compatibility path.
2. Plugin: publish the previous verified `.rbxmx`/plugin artifact and its matching `latest.json` as one unit.
3. Web: revert presentation, route data and shared primitives. Keep homepage compatibility isolation. Pair the onboarding client prerequisite rollback with the backend workspace route rollback.
4. Backend: roll back catalogue and checkout logic together. Do not restore frontend Stripe Price IDs or modify persisted progress/project records.

No database migration, API rename or Studio protocol version change was introduced, so rollback does not require destructive data work.

## Definition-of-done assessment

All repository-controlled implementation requirements are met: one product vocabulary, shared primitives/navigation, explicit AI lifecycle, readable tool/change/verification states, actionable errors/recovery, consolidated pricing source, idea-first onboarding, Plugin-first Studio hierarchy, diagnostics-focused Connector, required responsive coverage, and protected homepage body.

The programme may be handed to staging QA, support and operations with the records in this directory. Production sign-off remains conditional on the five external gates; their owners, reasons, acceptance evidence, deploy order and rollback are explicit, so release no longer depends on undocumented manual behaviour.
