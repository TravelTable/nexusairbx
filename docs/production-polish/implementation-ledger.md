# NexusRBX phased implementation ledger

Updated: 11 September 2026

Status meanings:

- **Complete** — implementation and repository/local validation are complete.
- **Complete / external gate** — implementation is complete, but the named live or host-application check remains mandatory before that surface is released.
- **Deferred** — explicitly outside the P0/P1 production-readiness scope, with an owner and priority.

## Phase ledger

| Phase | Work IDs and backlog relationship | Status | Acceptance evidence | Structural migration / rollback |
| --- | --- | --- | --- | --- |
| 0. Discovery/baseline | `NX-P0.1-01..06` | Complete | Six audit records, risk register, screenshot manifest, test inventory | Documentation/evidence only |
| 1. Vocabulary/IA | `NX-P1.1-01..04`; P1.1, P1.5, P1.6 | Complete | Canonical vocabulary module/test, conflict matrix, navigation proposal, journey map | User-facing adapters only; backend identifiers unchanged |
| 2. Design system | `NX-P0.2-01`, `NX-P0.4-01..04`, `NX-P0.5-01..04`, `NX-P0.9-01` | Complete | Semantic token/primitive contracts, full tests/build, homepage compatibility boundary | Aliases/wrappers permit per-consumer rollback |
| 3. Header/navigation | `NX-P1.2-01..04`, P0.2/P1.2 | Complete / external auth smoke | Desktop/mobile browser review; command/account keyboard tests; public SSR tests | Revert shared route data and consumers together; body boundary remains |
| 4. Workspace core | `NX-P0.6-01..04` | Complete | Workspace/component tests, browser empty state, six-width matrix, full suite | Presentation adapters; persistence/transports unchanged |
| 5. Composer/models | `NX-P0.6-05`, `NX-P2.4-01..03` | Complete / live model-loss smoke | Composer keyboard/state tests, fallback catalogue tests, 320px live geometry | Component-local rollback; preserve drafts and selected model |
| 6. AI lifecycle/change trust | `NX-P0.7-01..04`, `NX-P2.5-01` | Complete / external Studio receipt gate | Canonical lifecycle tests, run/plan/tool/change tests, backend protocol suite | Remove presentation adapter only; server events unchanged |
| 7. Error/loading/empty/recovery | `NX-P0.8-01..04` | Complete / fixture expansion deferred | Typed error, mutation-safe retry, lifecycle, loading and empty-state tests | Revert shells/copy independently; keep safe server errors |
| 8. Settings/billing/pricing | `NX-P1.5-01..03`, `NX-P0.3-01..04` | Complete / Stripe reconciliation gate | Catalogue parity, checkout/credit tests, settings/billing tests, public pricing tests | Deploy backend catalogue/checkout together; never restore frontend Price IDs |
| 9. Onboarding/Roblox | `NX-P1.3-01..03`, `NX-P1.4-01..03` | Complete / live OAuth gate | Client/server onboarding, saved progress, gate and connection tests | Pair frontend prerequisite change with backend workspace route; schema unchanged |
| 10. Studio hierarchy | `NX-P1.6-01..03` | Complete | Cross-surface vocabulary/search, downloads tests, Connector/Plugin tests | Compatibility workspace remains opt-in; protocols/deep links unchanged |
| 11. Studio Plugin | `NX-P1.7-01..04` | Complete / Roblox Studio gate | 77 passing tests, 2 environment skips, artifact/checksum verification, protocol suite | Publish prior verified artifact and matching `latest.json` together |
| 12. Connector | `NX-P1.8-01..04` | Complete / packaged-host gate | TypeScript, 42 Node tests, 7 renderer tests and builds | Preserve session/local data; revert startup preference, not storage |
| 13. Responsive web | `NX-P0.10-01..03`, `NX-P1.9-01` | Complete, protected-body exception recorded | 320/375/430/768/1024/1440 captures; DOM geometry; no public-route document overflow outside protected baseline | Component-scoped CSS; retain target and overflow safety |
| 14. Accessibility | `NX-P0.9-01..04` | Complete / screen-reader gate | Semantic tests, keyboard/focus browser pass, accessible snapshots, contrast/reduced-motion contracts | Accessibility improvements remain during visual rollback |
| 15. Validation/release | `NX-P15-01..06` | Complete; release decision conditional | [Release record](./phase-15-release-readiness.md) | Ordered web/backend/Plugin/Connector rollback plan |

## P0/P1 backlog disposition

| Work ID | Backlog item | Disposition |
| --- | --- | --- |
| `NX-P0.1-01..06` | Repository and surface audit | Complete |
| `NX-P0.2-01..03` | Homepage protection | Boundary, scoped compatibility tokens, tests, and six-width comparison complete |
| `NX-P0.3-01..04` | Pricing source of truth | Repository source consolidated and guarded; deployed Stripe reconciliation remains Billing Operations P0 |
| `NX-P0.4-01..04` | Shared tokens | Complete; 30-token guard green |
| `NX-P0.5-01..04` | Core primitives | Shared states/accessibility migration complete; usage documented |
| `NX-P0.6-01..05` | Workspace/composer/model core | Complete; persistence and API contracts preserved |
| `NX-P0.7-01..04` | AI lifecycle/change visibility | Complete; external Studio receipt smoke remains P0 for Plugin release |
| `NX-P0.8-01..04` | Errors/loading/empty/recovery | Complete for implemented domains; expanded visual fixture catalogue is Product QA P1 |
| `NX-P0.9-01..04` | Accessibility baseline | Repository/browser pass complete; screen-reader and forced-colours pass remains Accessibility QA P0/P1 |
| `NX-P0.10-01..03` | Responsive coverage | Required width matrix complete; two discovered 320px app defects fixed and remeasured |
| `NX-P1.1-*` | Vocabulary migration | Complete across app, public docs/downloads, Plugin, Connector, settings and onboarding |
| `NX-P1.2-*` | Header/navigation | Complete |
| `NX-P1.3-*` | Onboarding simplification | Complete |
| `NX-P1.4-*` | Roblox connection | Complete / live OAuth gate |
| `NX-P1.5-*` | Settings IA | Complete |
| `NX-P1.6-*` | Studio hierarchy | Complete |
| `NX-P1.7-*` | Plugin polish | Complete / Studio host gate |
| `NX-P1.8-*` | Connector polish | Complete / packaged-host gate |
| `NX-P1.9-*` | Narrow-layout refinement | Complete |

## Remaining release gates

| Gate | Owner | Priority | Why it cannot be closed locally | Required result |
| --- | --- | --- | --- | --- |
| Production Stripe catalogue reconciliation | Billing Operations | P0 | Deployed products/secrets are not in the repository | Every Price ID maps to the displayed plan, currency, amount and interval; checkout/portal smoke succeeds |
| Live Firebase/Roblox OAuth matrix | Identity QA | P0 | Requires staging credentials and provider callbacks | Sign-in, denial, expired auth, changed scopes, mismatch, reconnect and disconnect pass without unrelated data loss |
| Interactive Studio Plugin matrix | Plugin QA | P0 for Plugin release | Roblox Studio is not installed in this automation environment | Dock/floating/themes/place switching/apply/partial/verify/restore cases pass per protocol doc |
| Authenticated assistive-technology pass | Accessibility QA | P0 critical flows / P1 remaining | Requires NVDA/VoiceOver/forced-colours and signed-in fixtures | Critical keyboard/screen-reader/zoom announcements are accurate and non-noisy |
| Signed packaged Connector smoke | Desktop Release QA | P0 for Connector release | Local checks do not exercise signing, installer/update feeds, firewall or multiple real Studio processes | Install/update/auth/reconnect/port/firewall/multi-session matrix passes |

## Deferred quality/scale work

| Item | Owner | Priority | Reason |
| --- | --- | --- | --- |
| Virtualise very long conversations/activity histories after measurement | Frontend Performance | P2 | Current behaviour is functional; speculative rewrite risks scroll/persistence contracts |
| Split existing Connector Editor/Mermaid/worker chunks and measure startup/memory | Connector Performance | P2 | Builds pass; bundle warnings identify a real optimisation target |
| Add CI-managed deterministic screenshot fixtures for every partial-write/auth/entitlement state | Product QA + Frontend | P1 | Component/protocol tests exist; exhaustive state screenshots need fixture infrastructure |
| Add lint/codemod enforcement beyond current token/design guard | Design Systems | P2 | Current guard covers shared contracts; automatic migration is scale work |
| Remove legacy Desktop Workspace after usage telemetry and compatibility window | Product + Connector | P2 | It is safely demoted, but deletion requires customer-dependency evidence |
| Expand activity/history and command surfaces only from measured demand | Product | P3 | Optional enhancement, not a readiness requirement |

## Deployment and rollback order

1. Deploy backend catalogue/onboarding/error changes and verify backward-compatible old-client reads.
2. Deploy the web application/public export and monitor auth, checkout, generation, Studio connection and error rates.
3. Publish the verified Plugin artifact with its matching `latest.json` only after Studio QA.
4. Publish signed Connector builds only after packaged-host QA.

Rollback is the reverse order. Plugin binary and metadata roll back as one unit; Connector rollback preserves encrypted sessions and local settings; frontend onboarding and backend workspace prerequisites roll back as a pair; backend catalogue/checkout code rolls back together. No data migration is required by this programme.
