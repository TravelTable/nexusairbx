# Phases 3–14 — implementation record

Date: 11 September 2026

This record ties every cross-surface implementation change to the supplied backlog. “Implemented” means the repository change and deterministic checks are complete. It does not waive the interactive or live-service gates listed under each phase.

## Delivery summary

| Phase | Work items | Implemented outcome | Dependencies | Homepage impact |
| --- | --- | --- | --- | --- |
| 3 Header/navigation | `NX-P1.2-01..04`, `P0.2`, `P1.2` | Shared route data, one Workspace CTA, coherent auth/account states, accessible command menu and focus return | Phases 1–2 | Header only; body has compatibility boundary |
| 4 Workspace core | `NX-P0.6-01..04` | Project/task hierarchy retained while lifecycle, Studio context, messages, plans, files, and tool activity receive distinct presentation | Phases 1–3 | None |
| 5 Composer/models | `NX-P0.6-05`, `NX-P2.4-01..03` | Canonical composer states, explicit stop action, fallback-catalog warning/retry, compact usage metadata | Phases 2, 4 | None |
| 6 AI lifecycle/change trust | `NX-P0.7-01..04`, `NX-P2.5-01` | One lifecycle adapter; plan/build/tool/change/snapshot/verification states no longer collapse into generic activity/success | Phases 4–5 | None |
| 7 Error/loading/empty/recovery | `NX-P0.8-01..04` | Specific action failure defaults, preserved content during refresh, safe lifecycle recovery, technical details progressively disclosed | Phases 2, 4, 6 | None |
| 8 Settings/billing/pricing | `NX-P1.5-01..03`, `NX-P0.3-01..04` | Coherent settings IA; frontend no longer owns Stripe Price IDs; yearly-unavailable checkout is rejected; parity tests cover the catalogue | Phases 1–3 | Dedicated surfaces only; protected homepage pricing unchanged |
| 9 Onboarding/Roblox | `NX-P1.3-01..03`, `NX-P1.4-01..03` | Idea-first Plan-mode Workspace entry, accurate permission/publish copy, saved progress and typed recoverable server errors | Phases 1, 4, 8 | None |
| 10 Studio architecture | `NX-P1.6-01..03` | Plugin recommended; Connector/Studio MCP advanced; Desktop Workspace demoted to opt-in compatibility mode | Phases 1, 6, 9 | None |
| 11 Studio Plugin | `NX-P1.7-01..04` | Human-readable layer/change states, Snapshot recovery wording, narrow/floating-safe existing layout retained, rebuilt distributable | Phases 2, 6, 7, 10 | None |
| 12 Connector | `NX-P1.8-01..04` | Connection/diagnostics-first product, real version injection, no automatic competing workspace, compatibility workspace explicitly advanced | Phases 2, 7, 10 | None |
| 13 Responsive | `NX-P0.10-01..03`, `NX-P1.9-01` | Shared control target and wrapping rules; header/menu/composer/status/change surfaces retain actions at required widths | Phases 3–9 | Body protected at each width |
| 14 Accessibility | `NX-P0.9-01..04` | Visible focus, menu/combobox semantics, focus movement/return, accessible icon actions, intentional live regions, reduced motion/coarse targets | Continuous across UI phases | Header only |

## Phase 3 — shared header and navigation

Current behaviour had shared framing but inconsistent labels, competing CTAs, and a command palette that looked searchable without full combobox/listbox behaviour. The intended behaviour is one route hierarchy across CRA and Next surfaces with predictable account and keyboard states.

Implemented:

- primary order is Workspace, Assets, Studio, Docs, Pricing;
- Icons remains discoverable through Assets/site index rather than competing globally;
- authenticated account destinations use Roblox and Studio, Billing and usage, Settings, and sign out;
- logged-out/header states retain sign in and one **Open Nexus Workspace** action;
- the command menu supports arrow keys, Home/End, Escape, active-descendant semantics, empty results, and focus return;
- header contract tests distinguish the shared header from the protected body.

Acceptance evidence: `SiteHeader.test.jsx`, `siteHeaderIdentity.test.js`, `SiteShell.test.jsx`, `pricingHeader.test.mjs`, `headerVisualContract.test.js`, responsive visual matrix in Phase 15. Auth transitions were tested through deterministic component state; live-provider transition remains an operations smoke test.

Files: `src/components/site/SiteHeader.jsx`, `src/components/universal/UniversalCommandMenu.jsx`, `src/components/universal/UniversalSiteIndex.jsx`, `src/content/universalNavigation.js`, `public-frontend/components/PublicAccountState.jsx` and header tests.

Rollback: revert navigation data and header consumers together. The body boundary stays in place. No route or auth contract changed.

Deferred/risk: live Firebase provider failure and mobile screen-reader combinations require staging credentials (`Frontend QA`, P0 release gate).

## Phase 4 — Workspace core experience

The existing workspace controller, project persistence, streaming transport, Studio bridge, and editor were preserved. Presentation changes concentrate on comprehension: conversation content, system activity, generated files, plans, and Studio state now use lifecycle-aware labels and do not share a generic “working/success” treatment.

Implemented:

- task progress and compact run surfaces consume the same state adapter;
- tool activity exposes a readable action/target/result first, with raw detail expandable;
- messages use **Snapshot**, **Change set**, and **Verification** vocabulary without renaming stored fields;
- a stopped generation has a stop control rather than an indeterminate spinner;
- existing long-message/code overflow, scroll restoration, project context, and reconnect contracts remain covered.

Acceptance evidence: `MessageList.test.jsx`, `ChatComposer.test.jsx`, `LiveWorkStream.test.jsx`, `CompactAgentRunBar.test.jsx`, `AgentWorkspaceLayout.taskRuntime.test.jsx`, `ProjectTreeSidebar.test.jsx`, `CodeEditorTabs.test.jsx`, root full suite and build.

Files: `src/components/ai/{GenerationStatusBar,chat/MessageList,chat/LiveWorkStream,workspace/TaskProgressPanel}.jsx`, `src/pages/ai/ui/UiImplementationDrawer.jsx`, related tests.

Rollback: revert presentation adapters; do not change chat/run persistence or backend events. Lifecycle mapping is additive and can be removed without data migration.

Deferred/risk: very large histories still need measured list virtualization rather than a speculative rewrite (`Frontend performance`, P2).

## Phase 5 — prompt composer and model selection

Implemented:

- the existing canonical `ChatComposer` keeps Enter/Shift+Enter, draft persistence, attachments, send, cancel, disabled, and multiline contracts;
- Stop uses an unambiguous square control while a generation is active;
- decorative border activity occurs only during actual generation;
- model fallback data is labelled as a safe cached/fallback catalogue rather than silently presented as live;
- users can retry model availability, see usage multipliers, and retain the selected model while normal refresh occurs.

Acceptance evidence: `ChatComposer.test.jsx`, `useChatDraftPersistence.test.js`, `useChatAttachmentUpload.test.js`, `ModelSwitcher` consumers, `useUnifiedChat.test.js`, narrow-width visual review.

Files: `src/components/ai/chat/ChatComposer.jsx`, `src/components/ai/ModelSwitcher.jsx`, `src/hooks/useModelCatalog.js`.

Rollback: each component change is independent; cached model data remains valid. Reverting the warning must not revert the underlying stale/error state preservation.

Deferred/risk: the backend remains authoritative for provider availability and entitlements; staging must exercise a model disappearing during an open session (`AI platform`, P1).

## Phase 6 — AI lifecycle, plans, tool calls, and change sets

`src/lib/productLifecycle.js` is the user-facing state adapter. It covers queued, sending, thinking, planning, inspecting, generating, executing a tool, waiting for Studio/user/external service, applying, applied-unverified, testing, verifying, recovering, reconnecting, timed out, paused, cancelled, failed, complete, and unverified-complete.

Implemented:

- labels/descriptions/actions are shared across status bar, task panel, live stream, messages, and UI implementation drawer;
- completion is called verified only when the server completion contract says it can complete;
- applied-but-unverified, timeout, partial/failure, and cancelled outcomes remain distinct;
- plan remains in the conversation and Start Build has immediate queued/running feedback;
- low-level tool calls are grouped into readable action and target with technical detail in `<details>`;
- proposed Studio writes retain target/scope/snapshot/readback metadata supplied by the backend.

Acceptance evidence: `productLifecycle.test.js`, `runPresentation` consumers, lifecycle component tests, `planApproval.test.js`, `workflowPlan.test.js`, backend Studio/tool protocol tests.

Files: `src/lib/productLifecycle.js`, `src/lib/runPresentation.js`, the Phase 4 presentation components and tests.

Rollback: restore prior local mappings; do not alter backend event/status values. Unknown future states intentionally fail to a neutral, non-verified presentation.

Deferred/risk: deterministic screenshots do not replace a real partial Studio write/verification receipt smoke test (`Studio QA`, P0 before Studio release).

## Phase 7 — errors, empty states, loading, and recovery

Implemented:

- generic billing failure copy now says the requested action did not complete and existing work is unchanged where that guarantee exists;
- generic toast error title is **Action not completed**;
- lifecycle states communicate whether work is queued, cancelled, failed, applied but not verified, or complete;
- account/model/loading surfaces preserve useful content during refresh and offer retry where safe;
- technical tool detail is expandable instead of becoming the default error surface;
- Roblox/Studio onboarding failures use typed public messages rather than backend implementation text.

Acceptance evidence: `billingErrors.test.js`, toast/component tests, onboarding route tests, lifecycle tests, stream recovery/cancellation tests, asset empty/loading component tests.

Files: `src/lib/billingErrors.js`, `src/components/ui/toast-1.tsx`, `src/components/ui/index.jsx`, lifecycle consumers, `backend/src/services/GuidedLaunchService.js`.

Rollback: revert individual strings/presentation while retaining typed server errors; typed errors are backward-compatible because their safe `message` remains present.

Deferred/risk: support-required and destructive restore dialogs need live domain fixtures for every backend error code (`Product QA`, P1).

## Phase 8 — settings, account, billing, and pricing integrity

The authoritative versioned commercial display source remains the backend billing catalogue. Frontend `price_*` constants were removed. Checkout maps requested plan/interval through server configuration and now rejects a yearly interval when that plan has no annual Price ID instead of accepting an unusable checkout.

Implemented:

- settings categories match actual capabilities and separate ordinary Roblox/Studio choices from diagnostics;
- the public/app catalogue parity test checks plans, types, availability, and absence of frontend Stripe Price IDs;
- annual-ID classification excludes plans whose annual price is null;
- checkout rejects unavailable intervals before contacting Stripe;
- homepage pricing markup and values are excluded from redesign.

Acceptance evidence: `npm run test:billing-catalog`, billing/checkout/entitlement backend tests, settings tests, public pricing tests, protected body visual diff.

Files: `src/pages/SettingsPage.jsx`, `src/config.js`, `scripts/billing-catalog-parity.test.cjs`, `backend/src/lib/checkoutV2.js`, `backend/src/lib/billingCatalogV2.js` and related tests.

Rollback: server and parity-test changes must move together. Reintroducing frontend Price IDs is prohibited; rollback uses the prior server catalogue mapping. No displayed price was changed.

Deferred/risk: production Stripe objects and deployed secrets cannot be read from this repository. Ops must compare every configured Price ID/product/currency/interval with the versioned catalogue before release (`Billing operations`, P0 release gate).

## Phase 9 — onboarding and Roblox connection

Implemented:

- `/ai` is accessible before Roblox connection; write-dependent assets/actions retain their gates;
- onboarding saves the idea and creates a Plan-mode Workspace before requiring Studio infrastructure;
- setup-first remains a secondary choice;
- permission copy explains account access, optional publishing, Studio modification confirmation, disconnect, Snapshot, and recovery in human terms;
- onboarding progress stays server-backed;
- `GuidedLaunchService` emits typed, safe conflict/input/dependency errors;
- onboarding router auth applies to every route, while only initial enrollment may precede email verification.

Acceptance evidence: `OnboardingPage.test.jsx`, `RobloxConnectionGate.test.jsx`, `ConnectRobloxPage` flows, `signupRobloxOnboarding.test.js`, guided-launch client/server tests, onboarding mount security tests.

Files: `src/App.js`, `src/pages/OnboardingPage.jsx`, `src/pages/ConnectRobloxPage.jsx`, `backend/src/routes/onboarding.js`, `backend/src/services/GuidedLaunchService.js`, and tests.

Rollback: deploy frontend gate and backend workspace prerequisite together. Existing progress documents and OAuth callback contracts are unchanged.

Deferred/risk: live OAuth denial, changed scopes, and account mismatch require staging Roblox accounts (`Identity QA`, P0 release gate).

## Phase 10 — Studio connection architecture

Implemented:

- downloads, onboarding, settings, Plugin, and Connector consistently recommend the Plugin for normal workflows;
- Connector is described as authentication, health, diagnostics, update, and advanced local/Studio MCP support;
- protocol/port/token terminology stays behind advanced settings or technical details;
- Desktop Workspace has a documented compatibility role and is not launched automatically.

Acceptance evidence: downloads tests, Connector checks, Plugin bundle tests, vocabulary contracts and source search.

Files: `src/components/downloads/*`, `desktop-connector/src/{main,renderer/App}.tsx`, `desktop-connector/package.json`, `roblox-plugin/src/ui/BridgePanel.lua`, `roblox-plugin/README.md`.

Rollback: re-enable the compatibility workspace with its existing opt-in; protocol, pairing, deep links, and local data are unchanged.

Deferred/risk: telemetry should confirm that no supported customer depends on automatic legacy workspace launch before eventual removal (`Product/Connector`, P2).

## Phase 11 — Roblox Studio Plugin

Implemented:

- status copy distinguishes Different place open, Studio context changed, waiting, applying, verifying, disconnected, and advanced local-connection failures;
- recovery uses Snapshot/change-set language without altering command identifiers;
- existing responsive Luau constraints and Studio theme values remain intact;
- source is bundled into `.plugin.lua`, `.rbxmx`, and the public download with artifact verification.

Acceptance evidence: `npm run plugin:build`, 77 passing bundle/protocol/static tests with two environment skips, checksum/artifact verification. Manual matrix is defined in `docs/studio-tool-protocol.md`.

Files: `roblox-plugin/src/ui/BridgePanel.lua`, `roblox-plugin/README.md`, generated plugin artifacts, companion status test, `public/studio-plugin/latest.json`.

Rollback: publish the previously signed/verified artifact and matching `latest.json`; backend protocol compatibility is unchanged. Never roll back only the public binary metadata.

Deferred/risk: Roblox Studio is not available to the automated shell. Minimum dock, floating layout, Studio dark/light themes, keyboard support, place switching, partial apply, verification failure, and restoration require the documented interactive matrix (`Plugin QA`, P0 before Plugin release).

## Phase 12 — NexusRBX Connector

Implemented:

- normal startup stays focused on sign-in and Studio/MCP connection health;
- the embedded workspace is an advanced compatibility opt-in rather than an automatic competing product;
- connection copy separates authentication, Studio, MCP, and local-service states where runtime evidence permits;
- Vite injects the actual package version instead of a hard-coded renderer value;
- reconnect/polling behaviour is retained unless compatibility workspace is explicitly enabled.

Acceptance evidence: Connector Node tests, Vitest renderer tests, TypeScript check, and production build (`npm run check`).

Files: `desktop-connector/package.json`, `vite.config.ts`, `src/main.ts`, `src/renderer/App.tsx`, `preview.ts`, `shared.d.ts`, `version.ts`.

Rollback: revert renderer/startup preference while preserving encrypted session/local data. Re-enable compatibility mode through the existing setting; keep version injection because it corrects metadata drift.

Deferred/risk: production bundle contains existing large Editor and Mermaid chunks; startup/memory measurement on packaged Windows/macOS builds is owned by `Connector performance` at P2.

## Phase 13 — responsive web experience

Implemented/validated scope includes shared header collapse, command menu, account menu, Workspace composer, code/tool overflow, settings, public pricing/downloads, modal constraints, and semantic 44px coarse-pointer targets at approximately 320, 375, 430, 768, 1024, and 1440 pixels.

Acceptance evidence is the Phase 15 screenshot matrix plus component layout tests. Intentional horizontal scrolling is restricted to code/table content; primary, destructive, and recovery actions must remain reachable.

Files are the responsive rules within the Phase 2–9 component changes; no route-specific duplicate mobile application was added.

Rollback is component-scoped. Do not roll back the coarse-pointer target or overflow safety when reverting visual spacing.

Deferred/risk: authenticated billing/settings and runtime change-review screenshots depend on deterministic signed-in fixtures; source and component tests cover them, while staging screenshots remain `Frontend QA` P1.

## Phase 14 — accessibility and inclusive interaction

Implemented:

- one visible focus system for shared controls;
- keyboard-operable header account menu and command search with arrow/Home/End/Escape and focus return;
- accessible names for icon actions and an explicit stop-generation glyph;
- proper combobox/listbox/option state for command search;
- static alerts avoid noisy live regions; meaningful lifecycle status is announced deliberately;
- loading/disabled controls prevent repeat activation;
- reduced motion and coarse pointer rules are shared;
- long content and narrow layouts preserve readable names/actions.

Acceptance evidence: keyboard-oriented component tests, semantic role queries, style contracts, reduced-motion source guard, full root suite and manual browser keyboard pass in Phase 15.

Files: `src/components/site/SiteHeader.jsx`, `src/components/universal/UniversalCommandMenu.jsx`, `src/components/ui/index.jsx`, `src/design/nexus-primitives.css`, composer/lifecycle components.

Rollback: accessibility fixes are non-destructive and should remain even if surrounding visual work is reverted.

Deferred/risk: a manual screen-reader pass (NVDA/VoiceOver), Windows forced-colours pass, 200% zoom on authenticated runtime fixtures, and Studio platform accessibility remain `Accessibility QA` P0/P1 gates according to surface criticality.
