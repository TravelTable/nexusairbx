# Phase 1 — product vocabulary and information architecture

Date: 11 September 2026

Work items: `NX-P1.1-01..04`, `P1.1`, `P1.2`, `P1.5`, `P1.6`

## Decision

NexusRBX is one product with four cooperating surfaces. The browser product is **Nexus Workspace**; **NexusRBX Studio Plugin** is the recommended Studio companion; **NexusRBX Connector** is the advanced local connection and diagnostics layer; **Roblox Studio** is where proposed work is applied and verified. **Studio MCP** is a protocol name and appears only in advanced configuration or diagnostics.

Backend field names, event types, persisted identifiers, URL compatibility aliases, and protocol command names are not renamed by this migration.

## Canonical vocabulary

| Concept | User-facing term | Terms removed or demoted | Advanced exception |
| --- | --- | --- | --- |
| Product | NexusRBX | Nexus AI, Nexus AirBX | None |
| Browser product | Nexus Workspace | Desktop Workspace, AI page | Internal route remains `/ai` |
| Ordinary Studio integration | NexusRBX Studio Plugin | Bridge, companion bridge | Protocol/debug output may say plugin bridge |
| Advanced local integration | NexusRBX Connector | Desktop Workspace, local app | “Formerly called Desktop Workspace” appears once in compatibility settings |
| Local protocol | Studio MCP | MCP as primary setup language | Endpoint, port, and protocol details remain in advanced diagnostics |
| Proposed modification | Change set | patch, proposed write, build output | Raw operation names remain expandable |
| Recovery point | Snapshot | checkpoint | Persisted/API `checkpoint` identifiers remain unchanged |
| Proof of execution | Verification | success when no readback ran | Raw verification receipts remain expandable |
| Commercial consumption | Usage | credits/tokens used interchangeably | Exact credit units remain visible in billing |

The canonical values live in `src/content/productVocabulary.js` and have a contract test. Surface-specific sentences may vary, but these nouns do not.

## Information architecture

### Global navigation

1. Workspace — the primary product action and signed-in destination.
2. Assets — project materials that support a build.
3. Studio — installation and connection entry point, with Plugin first and Connector second.
4. Docs — learning, recovery, and advanced reference.
5. Pricing — public commercial information.

The header has at most one emphasized action: **Open Nexus Workspace**. Authentication, settings, and billing live in the account menu. Support and legal destinations live in the site index/footer. Internal diagnostics and Studio MCP configuration never occupy primary navigation.

### Workspace navigation

Project and conversation selection live in the workspace sidebar. The current project/task owns the top-level context. Content-local actions stay beside plans, tool activity, generated files, change sets, and verification rather than accumulating in the top bar.

### Settings

| Group | Destinations | Exclusions |
| --- | --- | --- |
| Nexus Workspace | Overview; Models and generation | Billing and low-level connection configuration |
| Connections | Roblox and Studio | Raw MCP fields unless advanced controls are opened |
| Account | Billing and usage; Team access; Privacy and data | Workspace generation preferences |
| Help | Support & diagnostics | Primary product actions |
| Interface | Appearance (available signed out) | Account state |
| Administration | Admin tools (role-gated) | Customer settings |

Billing and settings preserve a direct return to Workspace through the shared header. After authentication, an explicit return path wins; otherwise a returning user goes to Workspace. Onboarding saves the idea first and proceeds to Workspace Plan mode. Roblox or Studio connection is requested when a write-dependent action needs it.

## Journey map

| Stage | Goal and primary interface | Primary action and feedback | Failure and recovery | Infrastructure knowledge |
| --- | --- | --- | --- | --- |
| Describe | State an outcome in Workspace | Submit a prompt; draft and send state remain visible | Preserve draft, retry connection/attachment | None |
| Plan | Understand sequence and scope in conversation | Review, modify, approve, or start build | Return to editable plan; explain unavailable capability | None |
| Generate | Produce code/assets/change proposal in Workspace | Observe named lifecycle and cancel safely | Retry only where idempotent; retain partial output | None |
| Review | Inspect files, tool summaries, and proposed change set | Expand scope/details and approve | Resolve mismatch or cancel before writes | Studio concepts, not MCP |
| Apply | Apply approved change in Studio through Plugin | Show target, snapshot, progress, and confirmed result | Reconnect, review changed context, or restore | Plugin; Connector only for advanced paths |
| Verify | Confirm Studio readback/test result | Present Verification separately from application | Re-run safe checks; never relabel unverified work as verified | None by default |
| Improve or recover | Iterate or restore a known state | Continue conversation or restore Snapshot | Explain restoration scope and consequences | Technical details optional |

## Acceptance and evidence

- One canonical source and contract test cover the requested product terms.
- Global navigation and account labels consume the vocabulary.
- Settings, onboarding, downloads, Plugin, Connector, lifecycle, tool-call, and recovery copy were migrated without changing stored or protocol identifiers.
- The Plugin is visually and verbally the recommended path; Connector/Studio MCP are advanced.
- The journey now begins in Plan-capable Workspace before a Roblox requirement.

Validation: `src/content/productVocabulary.test.js`, header tests, onboarding route/page tests, public route tests, Connector checks, and Plugin bundle tests. Final command results are recorded in [Phase 15](./phase-15-release-readiness.md).

## Changed files and rollback

Primary files: `src/content/productVocabulary.js`, `src/content/universalNavigation.js`, `src/components/site/SiteHeader.jsx`, `src/components/universal/*`, `src/pages/SettingsPage.jsx`, `src/pages/OnboardingPage.jsx`, `src/pages/ConnectRobloxPage.jsx`, `src/components/downloads/*`, `roblox-plugin/src/ui/BridgePanel.lua`, and `desktop-connector/src/{main,renderer/App}.tsx`.

Rollback is presentation-only: revert vocabulary consumers and navigation data while retaining backend field names and routes. The value-first onboarding server change is independently reversible by restoring the prior `/workspace` prerequisite, but doing so requires restoring the matching client gate in the same deployment.

## Deferred work and risks

- Repository-owned documentation and download prose now use the canonical product model. The protected homepage mock-up retains its existing legacy “Nexus AI Agent Workspace” label because changing it would alter protected body content.
- Support macros and externally hosted material are outside this repository (`Support`, P1).
- Any legacy deep links that display “Desktop Workspace” outside this repository require product analytics before removal (`Connector`, P2).
