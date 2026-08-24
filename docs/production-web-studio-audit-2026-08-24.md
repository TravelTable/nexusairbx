# NexusRBX production website and Studio audit

Date: 2026-08-24  
Environment: `https://www.nexusrbx.com` and the production API  
Audit mode: signed-in production smoke testing with retained, clearly prefixed audit chats; read-only account/billing checks; safe Studio preflight against `artifacts/NexusLivePipelineTest.rbxl`

## Executive summary

The production website, authenticated workspace, chat lifecycle, account surfaces, responsive layouts, and connected Roblox Studio bridge were audited end to end. Seven production fixes were shipped: six frontend fixes and one backend Studio-envelope fix. The final frontend and backend deployments were verified independently in production.

The ordinary no-Studio chat path now succeeds, persists after reload, supports cancellation, and honors explicit Studio opt-out even while the plugin is connected. Projectless build prompts are stopped at an actionable place-selection gate instead of failing downstream. The mobile homepage no longer has intrinsic horizontal overflow.

The Roblox Studio plugin connected successfully to the website, but the audit place is an unpublished local `.rbxl` file and therefore has no attested Roblox place identity. The backend correctly blocks commands with `STUDIO_TARGET_UNATTESTED`. The audit did not bypass this guard or publish the place, so no Studio mutation, snapshot, rollback, save, or playtest was performed. A real backend defect discovered before that guard—the background manifest refresh omitted the required `applyMode`—was fixed and deployed. Post-deploy evidence confirms that the malformed-envelope error is gone and the remaining failure is only target attestation.

No purchases, publishing, destructive account actions, production data deletion, or unsafe Studio mutations were performed.

## Production fixes shipped

| Commit | Repository | Fix | Production verification |
| --- | --- | --- | --- |
| `2581879` | frontend | Removed mobile homepage intrinsic overflow; added a search label and regression coverage | Vercel production `READY`; 390 px viewport no longer overflows |
| `ea4b2b4` | frontend | Correctly classified negated Studio instructions such as “do not use Studio” | Vercel production `READY`; targeted classifier tests passed |
| `6b0d045` | frontend | Restored projectless Agent conversations through `/api/ai/chat`; retained a clear gate for implementation requests | Vercel production `READY`; production chat and build-gate checks passed |
| `45978d4` | frontend | Made Studio place resolution intent-aware in the execution path | Vercel production `READY`; conversational prompt no longer opened the picker |
| `8e5dcad` | frontend | Skipped the duplicate Studio preflight for conversation-only requests | Vercel production `READY`; exact-response smoke prompt passed |
| `56206b2` | frontend | Honored explicit Studio opt-out while a compatible plugin session is live | Vercel production `READY`; no “Reading Studio project…” stage appeared |
| `6032bd40` | backend | Added the required `applyMode` to background manifest refresh commands and asserted it in tests | Production API deployment header reported the full `6032bd40…` revision |

## Coverage and results

### Public routes

The following routes loaded without console errors during the sweep:

- `/`
- `/pricing`
- `/downloads`
- `/docs`
- `/legal`
- `/legal/privacy`
- `/roblox-script-generator`
- `/signin`
- `/signup`
- `/forgot-password`
- `/contact`
- an unknown route, which correctly rendered the 404 page

The global search dialog opened from the header, filtered correctly for “studio,” exposed an accessible search textbox, and closed with Escape.

### Authenticated workspace and account surfaces

- `/ai`, `/settings`, and `/billing` had no horizontal overflow at a 390 px viewport.
- Settings sections reviewed read-only: Interface, AI, Roblox + Studio, Billing, Team, Account/Data, Help, and Admin.
- Billing plan and usage content rendered. Monthly/yearly switching updated the displayed yearly prices. No purchase or top-up action was invoked.
- Destructive account actions required typed confirmation. None was invoked.
- The Admin “Chaos Monkey” control was not run against production.

### Chat lifecycle

| Flow | Result | Evidence |
| --- | --- | --- |
| Conversation with explicit no-Studio constraint | Pass after fixes | `AUDIT-2026-08-24 CHAT-STUDIO-OPTOUT` returned exactly `AUDIT CHAT OK` and did not enter a Studio-reading stage |
| Persistence | Pass | Reload created a new request, the audit chat remained at the top of General chats, and reopening it restored the prompt and response |
| Cancellation | Pass | Escape stopped an active run; the UI reconciled from Running back to the normal terminal state |
| Retry | Pass mechanically | Retry created a new run and reached a terminal response; the Studio-specific response quality issue remains below |
| Projectless build request | Pass as safety gate | `AUDIT-2026-08-24 BUILD-GATE` preserved its prompt and opened the publish/choose-place gate without running a build |
| Connected-Studio read request | Blocked safely | Plugin was live, but the local place had no attested place identity; no command was dispatched |
| Quick Script | Partial | Produced a valid pure addition module, but the strict directive and placement UX findings below remain |
| Asset mode | Blocked by product availability | The workspace offered asset review, then routed to an unavailable production generator |

Audit chats were retained as requested. The final sidebar count increased consistently as the isolated chat records were created and retried.

### Roblox Studio bridge

Verified:

- The website displayed “Connected via NexusRBX Studio Plugin,” “Plugin connected,” and the plugin’s manifest capability.
- The production backend reported one compatible live plugin session among historical session records.
- The Files evidence lens exposed the Studio Manifest panel and rescan action.
- Before the backend fix, manifest refresh failed after three attempts with `A valid applyMode is required for Studio command envelope v2`.
- After deploying `6032bd40`, the same state advanced to four attempts and reported `Studio target attestation is incomplete`.
- A direct rescan preflight returned HTTP 409 with `STUDIO_TARGET_UNATTESTED` and an instruction to wait for Studio to identify the open place.
- The manifest remained incomplete with no identified place and zero indexed items, as expected for the unattested local file.

Not performed:

- Studio write, create, or delete commands
- snapshot or rollback
- save or publish
- playtest

These were intentionally not attempted because the prerequisite read/attestation stage did not succeed. Publishing the local file solely to expand an audit would have crossed the user’s no-publish boundary and weakened the purpose of the attestation control.

## Findings

### Resolved during the audit

#### AUDIT-R01 — High — Negated Studio intent was treated as Studio intent

Prompts containing “Do not use Studio” were routed toward Studio because keyword detection ignored negation. This opened the place picker or a Studio-reading stage for an explicitly conversational request. The classifier and dispatch path now preserve explicit opt-out, with regression tests and a production exact-response proof.

Status: fixed and deployed in `ea4b2b4`, `45978d4`, `8e5dcad`, and `56206b2`.

#### AUDIT-R02 — High — Projectless conversational Agent requests hit the artifact endpoint

A conversation-only request without a workspace project reached `/api/generate/artifact` and failed with a required-project error. Non-implementation prompts now use the authoritative chat endpoint. Implementation prompts still stop at the project/place gate.

Status: fixed and deployed in `6b0d045`.

#### AUDIT-R03 — High — Background Studio manifest refresh emitted an invalid v2 envelope

`StudioManifestCoordinator` queued `get_project_manifest` without the mandatory `applyMode`, so refresh failed before target attestation or plugin dispatch. The coordinator now sends `applyMode: "unrestricted_dev"`, and its harness asserts that field on every refresh queue attempt.

Status: fixed and deployed in backend `6032bd40`. Production post-deploy state no longer contains the apply-mode error.

#### AUDIT-R04 — Medium — Mobile homepage had intrinsic horizontal overflow

At 390 px, the homepage content exceeded the viewport. The hero layout was corrected and covered by a regression test.

Status: fixed and deployed in `2581879`.

### Open product defects

#### AUDIT-O01 — High — Structured Studio blockers degrade into a false AI capability denial

When manifest preparation ends with `STUDIO_TARGET_UNATTESTED`, the model still receives or produces a generic response claiming it cannot connect to Roblox Studio. This contradicts the visible connected-plugin state and hides the actionable reason.

Recommended fix: stop before model generation when Studio context preparation returns a structured blocker. Render a deterministic assistant/system card containing the backend code, the affected place, and the allowed recovery action. Never ask the model to improvise the failure explanation.

Acceptance criteria:

- An unattested local file produces a single consistent “Publish or select an attested test place” message.
- The response does not claim Studio access is unsupported.
- Retry remains available only when the prerequisite can have changed.
- Telemetry records the typed blocker without prompts, source, identifiers, or tokens.

#### AUDIT-O02 — Medium — Manifest rescan fails silently in the evidence panel

The rescan button remained enabled and the panel continued to say “No persisted Studio manifest yet” after its queue call returned HTTP 409. The structured error was visible only in the network response.

Recommended fix: show an inline error state tied to the manifest panel, disable rescan while the target is unattested, and provide the same recovery action as the chat blocker.

#### AUDIT-O03 — High — Production advertises an unavailable Asset generator

Asset mode offered “Review in asset generator,” then navigated to “Icon generator unavailable / Asset generation is not enabled in this environment yet.” This is a broken promise in a primary workspace mode.

Recommended fix: drive mode availability from one backend capability response. Hide or mark the mode “Coming soon” before prompt entry when generation is disabled, and prevent navigation to a dead-end workflow.

#### AUDIT-O04 — Medium — Prompt state leaks between Agent, Script, and Asset modes

Switching modes retained the prior mode’s prompt, including a Script prompt in Asset mode. This can send an unintended request to the wrong workflow.

Recommended fix: store drafts per mode and show an explicit “Move this draft to Asset/Script/Agent” action. Add a three-mode round-trip test.

#### AUDIT-O05 — Medium — Project navigation contains unnamed controls and duplicate legacy chats

Several nested project treeitems and their action buttons had no accessible name, while nearby records were labelled correctly. The same projects contained many blank or duplicate “New chat” entries. This is both an accessibility defect and a data-quality problem.

Recommended fix: enforce a non-empty derived label at the final render boundary, label every overflow action with its effective chat name, reject empty titles on write, and run an idempotent migration that deduplicates only records proven equivalent. Preview and back up the migration before applying it.

#### AUDIT-O06 — Medium — Metadata and canonical coverage is inconsistent

- `/legal` had no canonical URL.
- `/contact` used a generic title and description and had no canonical URL.
- signed-in auth redirects displayed stale generic metadata.
- `/ai`, `/settings`, and `/billing` all used the generic title `NexusRBX`.

Recommended fix: add a route-owned metadata contract with canonical, title, description, robots policy, and an automated route-matrix assertion.

#### AUDIT-O07 — Low/Medium — Important text controls miss a comfortable touch target

Examples included the pricing “View plan” affordance, the Docs breadcrumb/link, and Legal breadcrumb text, all substantially shorter than a 44 px touch target.

Recommended fix: increase the clickable box with padding or a pseudo-element while preserving the visual density; add a mobile target-size check for primary interactive text.

#### AUDIT-O08 — Low — Quick Script output and placement affordances are inconsistent

The generated “Simple Math Module” was functionally valid, but `--!strict` appeared after executable content rather than as the first directive. Selecting Module still produced “Location required” and disabled Studio without a clear next action.

Recommended fix: normalize directives to the first line before presentation and provide a labelled target-location picker or explain why placement is unavailable.

#### AUDIT-O09 — Low — Settings and operations contain stale or opaque status copy

The Team surface contained hidden/state copy reading “Creating team…” while the accessible control was an idle disabled “Create team.” The Roblox operations table used opaque identifiers and showed “Updated Unavailable” for many otherwise successful records.

Recommended fix: ensure async status copy is mounted only while active; add friendly operation labels, relative/absolute timestamps, and a defined fallback for missing update metadata.

### Expected safety behavior, not defects

- A local unpublished `.rbxl` file is not accepted as an attested production Studio target.
- Agent Build requires a selected/published place identity before mutation.
- Destructive account controls require explicit typed confirmation.
- Chaos testing is not appropriate against production data.

## Improvement plan

### Phase 1 — Make Studio failures truthful and actionable (0–2 days)

1. Map Studio context-preparation errors to deterministic UI cards before model invocation.
2. Give chat, picker, and manifest rescan one shared recovery message for each typed Studio error.
3. Disable or relabel rescan when target attestation is incomplete.
4. Add production-safe telemetry for manifest refresh outcome, error code, attempt count, and deployment revision.
5. Add integration coverage proving that an unattested target never reaches the model or command queue.

Exit gate: a connected plugin plus unpublished local file produces no false “I cannot access Studio” answer and no malformed command.

### Phase 2 — Remove broken workspace promises (next week)

1. Gate Asset mode and asset CTAs from a single capability source.
2. Introduce per-mode drafts and a deliberate cross-mode transfer action.
3. Fix Quick Script directive ordering and placement guidance.
4. Add accessible fallback labels to every project/chat item and action.
5. Design and dry-run a backup-first legacy chat cleanup migration.

Exit gate: every visible primary mode has a working destination, switching modes cannot silently repurpose a prompt, and the navigation tree has no unnamed interactive elements.

### Phase 3 — Finish route quality and continuous verification (1–2 weeks)

1. Centralize route metadata and canonical assertions.
2. Raise small touch targets while preserving the current visual language.
3. Add production-safe browser smoke coverage for public routes, authenticated chat, persistence, cancel/retry, explicit Studio opt-out, and the projectless build gate.
4. Provision a private, published, non-user-facing Roblox test place dedicated to bridge verification.
5. Against that test place, automate the complete safe Studio story: manifest → targeted read → snapshot → bounded mutation → verification → rollback → bounded playtest. Keep public publishing outside the suite.

Exit gate: the same audit can run continuously without using a customer place or relaxing attestation.

## Validation performed

Frontend:

- `CI=true npm test -- --watchAll=false` for `intentClassifier`, `useUnifiedChat`, and AI workspace layout: 3 suites, 44 tests passed.
- `npm run build`: React production build and Next export completed successfully (188 pages).
- Known non-blocking warning: the existing `rehype-harden` source-map warning remained.
- Latest frontend deployment was confirmed `READY` in Vercel production.

Backend:

- `StudioManifestCoordinator.test.js`: 6 passed.
- `AskStudioContextService.test.js`: 19 passed.
- `studioToolProtocol.test.js`: 29 passed.
- Total targeted backend regression coverage: 54 passed.
- `node --check src/services/StudioManifestCoordinator.js`: passed.
- `git diff --check`: passed.
- Production `/health` returned HTTP 200 with deployment revision `6032bd40…`.

Production browser proofs:

- exact no-Studio chat response and persistence
- cancellation and terminal-state reconciliation
- retry mechanics
- projectless build gate and prompt preservation
- 390 px authenticated responsive checks
- global search filtering, keyboard dismissal, and accessible naming
- plugin connection, manifest status, rescan HTTP status, and structured backend error code

## Residual limitations

- Studio mutation, rollback, and playtest coverage remains pending until a private published audit place is available. This is an environment prerequisite, not permission to publish the current local file.
- No payment, top-up, destructive account, team-creation, or production chaos action was exercised.
- Existing user worktree changes were preserved. Production fixes were released from clean deployment worktrees, and audit chats/data were retained.

