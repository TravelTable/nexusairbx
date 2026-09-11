# NexusRBX production-polish programme

Implementation date: 11 September 2026

Root baseline revision: `e157c7a` (`TravelTable/nexusairbx`)

Backend baseline revision: `d936230f` (`TravelTable/nexusrbx-backend`)

## Current gate

Phases 0–15 are implemented and validated to the limit of the repository and local runtime. The root application, public export, backend, Studio protocol, Plugin bundle, Connector, pricing catalogue guards, routing guards, and design guards are green.

The repository is ready for integrated staging and QA. Broad production rollout is **conditional**, not yet an unconditional go: Billing Operations must reconcile the deployed Stripe objects, Identity QA must run live Roblox/Firebase callbacks, Plugin QA must execute the documented matrix inside Roblox Studio, and Accessibility QA must complete screen-reader/forced-colours checks on authenticated fixtures. These gates require credentials or host applications not present in this workspace; no production value or successful result has been invented to bypass them.

The implementation record and release decision are here:

- [Phase 1 — product vocabulary and information architecture](./phase-1-product-model.md)
- [Phase 2 — design-system foundation](./phase-2-design-system.md)
- [Phases 3–14 — cross-surface implementation](./phases-3-14-implementation.md)
- [Phase 15 — validation and release readiness](./phase-15-release-readiness.md)
- [Implementation ledger](./implementation-ledger.md)

## Delivered product model

The user-facing hierarchy is now:

1. **Nexus Workspace** — describe, plan, generate, review, and manage work.
2. **NexusRBX Studio Plugin** — the recommended Studio companion.
3. **NexusRBX Connector** — advanced local connection and diagnostics.
4. **Studio MCP** — technical protocol terminology shown only where useful.

The shared lifecycle is **Describe → Plan → Generate → Review → Apply → Verify → Improve/Recover**. A proposed write is a **Change set**, a recovery point is a **Snapshot**, and execution proof is **Verification**. Backend identifiers, stored records, and Studio protocol names were left intact.

## Protected homepage boundary

The protected body remains the output of `src/components/homepage/HomepageV2Content.jsx` and its imported homepage modules. It includes the hero, all marketing sections, homepage pricing content, typography, effects, cards, backgrounds, animation, narrative, and section order.

Only the shared header was changed. The body now has a testable `data-nexus-protected-homepage-body` boundary and scoped compatibility variables in `HomepageCinematic.module.css`. Before/after body captures exist at 320, 375, 430, 768, 1024, and 1440 pixels. Review classified the shared-header difference as expected and found no body layout, copy, hierarchy, or visual-identity migration.

The protected body retains its pre-existing 320px minimum. A desktop browser that reserves a non-overlay vertical scrollbar can therefore expose the existing 10px overflow at an exactly 320px outer viewport. Real mobile overlay-scrollbar viewports and all wider required widths pass. This is recorded as an existing protected-body issue rather than silently changing the homepage.

## Validation headline

| Gate | Result |
| --- | --- |
| Root React suite | 242 suites, 1,406 tests passed |
| Root production build | Pass; CRA plus 188-page Next static export and merge |
| Public-render suite | 22/22 passed |
| Production routing | 25/25 passed |
| Backend full suite | 2,283 passed, 0 failed, 6 skipped |
| Studio protocol | 42/42 passed |
| Plugin build/tests | 77 passed, 0 failed, 2 environment skips; artifact verified |
| Connector check | TypeScript, 42 Node tests, 7 Vitest tests, renderer/main builds passed |
| Pricing catalogue parity | Pass |
| Design guard | 30 tokens and 5 component-contract groups passed |
| Root/backend diff checks | Pass |
| Required responsive widths | Public matrix complete; Workspace/settings inspected; 320px defects corrected |
| Homepage body protection | Pass, with the documented inherited non-overlay-scrollbar edge case |

See [Phase 15](./phase-15-release-readiness.md) for commands, evidence, release order, rollback, monitoring, and the conditional gates.

## Audit archive

- [Application and runtime inventory](./phase-0-application-inventory.md)
- [Route and surface map](./phase-0-route-surface-map.md)
- [Styling and component inventory](./phase-0-components-and-styling.md)
- [Architecture risk register](./phase-0-risk-register.md)
- [Baseline screenshots and test inventory](./phase-0-baseline-and-tests.md)
- [Baseline evidence manifest](./phase-0-baseline-manifest.md)

Phase 0 records the inherited state. Later records supersede its original implementation gate while retaining its evidence and risk history.

## Traceability convention

Implementation work uses the supplied backlog identifier plus a repository work ID such as `NX-P0.4-01`. Each phase record names current and intended behaviour, affected surfaces, homepage impact, validation, files, limitations, migration, and rollback. No phase is marked complete merely because it compiles; the Phase 15 record distinguishes deterministic completion from required external release checks.
