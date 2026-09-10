# Desktop feature parity and acceptance evidence

10 September 2026. **Not approved for public cutover.** Component reuse is implemented; not every website workflow has a desktop adapter yet. No 30-day transition has started.

“Fixture verified” means the production Electron renderer was exercised with simulated data. It does not establish live billing, provider, migration, or Studio correctness.

## Customer screen inventory

| Website surface / source | Desktop implementation | Evidence / remaining acceptance |
| --- | --- | --- |
| `pages/ai/WorkspaceRibbon`, `components/sidebar/ProjectTreeSidebar` | Same components, project/chat creation, rename/delete, project selection, model selection and local Studio discovery | Electron fixture; website sidebar tests. Search currently covers loaded history; full-account search and project pagination remain. |
| `components/ai/ChatView`, `chat/ChatComposer`, Markdown/code rendering | Same components; SQLite messages and local streaming; Ask/Plan/Agent/Debug/Quick Script/Studio Agent routing | Six-mode worker tests; Electron rich-content fixture. Complete attachment chips, message actions and specialist interactions still need parity. |
| `components/ai/workspace/WorkspaceShell` | Same dock and resizable drawer for Files/Editor/Run/Assets/Report | Electron navigation; existing drawer keyboard/focus tests. Matched viewport/state comparison with website remains. |
| `CodeFileTree`, `CodeWorkspace`, Monaco diffs, `ExportActions` | Same components; targeted local reads; original-place and source-hash guarded writes; snapshots; native exports; local push; static readiness service | Worker tests for target changes and approval; Electron Monaco and five worker startup checks; web export transport test. Actual stale-source, snapshot/undo, native-dialog and disposable-place tests remain. |
| `WorkspaceDetailsPanel`, build reports | Same report component with local run/artifact input | Rich run evidence, full task events and playtest result presentation are incomplete. A rendered report is not full report parity. |
| `PlanWorkspace`, canonical plan lifecycle | Local Markdown plans, atomic revision retention, new approval after edits/conflicts | Canonical structured sections, regeneration, full version browser, readiness lifecycle and exact-once approved revision execution semantics remain. The website's full PlanWorkspace is not yet wired. |
| `QuickScriptWorkspace` | General local `quick_script` mode executes | Dedicated website Quick Script UI, target controls, validation and continuation flows still need their adapter. |
| `pages/ai/ui/UiCreatorWorkspace` | Not enabled in desktop | Requires local design/checkpoint/history persistence, durable authenticated specialist generation, local Studio application and preview/capture adapters. |
| Assets / `WorkspaceAssetsPanel`, marketplace and upload controls | Local saved scripts/files and native downloads available | Full library browsing, generation, previews, upload and local apply workflows remain. The Assets dock is currently a saved-artifact list. |
| `pages/ai/AnimateWorkspace` | Not enabled in desktop | Preserve actual account/admin feature gates; implement durable generation/refinement adapters, bundled R15 preview, local animation apply and history recovery. |
| `pages/SettingsPage` | Same page, SQLite preferences, account identity, connector settings/diagnostics access | Electron route fixture. Guided launch, advanced Roblox account actions, preference-to-workspace defaults and all settings sub-tabs need end-to-end checks/adapters. |
| `pages/BillingPage` | Same page; authenticated account/catalog/checkout/portal/cancel adapters; system browser links | Website billing tests and Electron fixture. Live free/paid/team entitlements, checkout return destinations, cancellation and usage refresh remain staging gates. |
| `pages/SupportPage`, `SupportTicketPage`, `ContactPage` | Same pages; allowlisted authenticated support service operations | Electron support route fixture. Real create/reply/close/reopen/attachment operations need staging acceptance. No messages were sent during development. |
| Onboarding, sign-in and Roblox authorization | Existing connector browser sign-in and encrypted session retained | Complete website onboarding and deep-link return to the originating screen remain. Sign-out closes the embedded workspace. |
| Saved creations and history | Local artifacts, native export, indexed entity paging, bounded snapshots, conflict comparison and three resolution choices | Automated pagination/conflict/restart tests. Full library/version pagination, virtualization and account-wide search remain. |
| Connector updates, diagnostics and connection settings | Existing identity and controls preserved | Existing tests; packaged startup smoke. New signed upgrade/update and recovery tests on Windows/macOS remain. |
| Marketing and staff administration | Stay on website | Outside desktop parity scope. |

## Persistence, migration and operational gates

| Gate | Current evidence | Required before release |
| --- | --- | --- |
| Local durability | SQLite WAL/FULL, transactional outbox/revisions, exact inference checkpoints, durable command receipts, unknown-outcome write replay refusal | Crash/upgrade testing of full shared flows and unsaved editor/draft recovery |
| Device sync | PG CAS/deduplication and two simulated device file-transfer tests; visible retry and conflict review | Two real devices, account switching, offline concurrent edits, quotas and large histories |
| Legacy migration | Account-scoped dependency-ordered projects/chats, versions/run history, source hashes, resumable checkpoints; ownership mismatch rejection | Attachment transfer, oversized records, content/count reconciliation, fresh restore checks, server-enforced migration states and a single authoritative writer |
| Maintenance | Explicit DB migration and billing reconciliation commands exist | Deployed schedule, monitored failures, backups, verified restore and retention policy preserving deduplication receipts |
| Firebase reduction | Desktop build fails if Firebase SDK/source enters its module graph; renderer fixture rejects external network; LocalStudio has no cloud client | Record baseline and compare real canary Firestore/SKU traffic. Auth, billing and some account/support operations still use backend Firebase. No dollar savings have been measured. |
| Staging | Gateway feature flag and per-account allowlist implemented; empty allowlist denies access | Railway environment/PostgreSQL provisioning and configuration, authenticated inference/settlement, revoked sessions and entitlement limits |
| Distribution | Preview packaging retains `com.nexusrbx.companion`; CI now requires Windows signing and existing Apple notarization | New coordinated version in both repositories; signed Windows and signed/notarized macOS artifacts; install/upgrade/update tests; publish only after gates pass |
| Website transition | Legacy services and source data preserved | Begin the agreed 30 days only after acceptance, then read-only web history and retirement of legacy execution/polling with data-preserving rollback |

## Repeatable evidence

- `npm run check --prefix desktop-connector`: types, runtime/SQLite tests, renderer tests and build with Firebase module firewall.
- `npm run preview:capture --prefix desktop-connector`: shared workspace, actual Monaco editor, five local worker types, billing/settings/support; fails on external HTTP requests or renderer console errors.
- Website tests: billing and sidebar suites plus `ExportActions.test.jsx` and `CodeWorkspace.theme.test.jsx`.
- `npm run build`: website and public frontend production builds.
- Local connector suite and backend Studio protocol/desktop suites.
- `21st review`: no findings in new desktop components; shared Monaco's existing explicit isolated editor theme colors are informational findings and intentionally retained.

Logs and fixture screenshots are under `artifacts/`. Fixture screenshots are not a substitute for matched website/package screenshots or live customer workflow acceptance.
