# Findings and capability inventory

## Scope and evidence

This document records the root causes, static capabilities, authorization boundaries, and operational gaps found in the repository on 2026-07-18. It is an audit, not an implementation plan. **Confirmed**, **Strong inference**, and **Unknown** have the meanings defined in [README.md](./README.md). Source references are repository-relative; symbol references are used when a file is large and likely to move.

The Studio protocol contains **exactly 49 static actions**. The authoritative set is `TOOL_COMMANDS` in **backend/src/lib/studioToolProtocol.js:11-61**. The plugin has a handler-table entry for all 49 at **roblox-plugin/src/commands/registry.lua:31-96,175**, but four entries deliberately return `unsupported`; deriving attestation from function presence therefore overstates executable support.

## Root-cause register

| ID | Severity | Finding | Evidence status | Primary owner |
| --- | --- | --- | --- | --- |
| RC-01 | P0 | Generation becomes terminal before Studio application, and a late acknowledgement cannot correct it | Confirmed | Prompt 3 runtime |
| RC-02 | P0 | Studio delivery and acknowledgement are not lease-, replay-, or verification-safe | Confirmed | Prompt 3 Studio transport |
| RC-03 | P1 | One UI routes requests through three execution models with different context and tools | Confirmed | Prompt 3 runtime |
| RC-04 | P1 | There is no durable task/event ledger or user-wide interruption recovery | Confirmed | Prompt 3 persistence |
| RC-05 | P1 | Request and external-operation idempotency reservations are non-atomic | Confirmed | Prompt 3 contract; Prompt 2 operation keys |
| RC-06 | P1 | Manifest identity, freshness, conflict handling, and post-write verification are incomplete | Confirmed, with inferred failure conditions | Prompt 3 context and verification |
| RC-07 | P0/P1 | Asset truth, review authorization, upload lifecycle, moderation, and provider semantics are inconsistent | Confirmed | Prompt 2, using Prompt 3 ledger |
| RC-08 | P1 | OAuth capabilities and backend tools do not become a complete, fresh agent capability snapshot | Confirmed | Prompt 3 context; Prompt 2 Roblox tools |
| RC-09 | P0/P1 | Tenant, pairing, token, and replay controls have concrete gaps | Confirmed, with inferred distributed races | Shared security ownership |
| RC-10 | P1 | Health, worker topology, tracing, reconciliation, and failure-injection coverage are insufficient | Confirmed/Unknown | Platform and both prompts |

## Detailed failure records

### RC-01 — terminal success precedes Studio application

**Confirmed symptom.** The legacy artifact worker sets the job to `succeeded` and publishes `done` before it queues background Studio application at **backend/src/workers/generateArtifactWorker.js:1424-1463**. `JobService` projects `succeeded` as `userGoalResolved: true` at **backend/src/services/JobService.js:94-119**. A later Studio acknowledgement reaches `AgentRunService.handleCommandAck` at **backend/src/services/AgentRunService.js:460-520**, but `JobService.updateJob` refuses updates to terminal jobs at **backend/src/services/JobService.js:283-327**.

**Root cause.** “Files generated,” “command delivered,” “command executed,” and “goal verified” are represented by one terminal job state. The late Studio branch is a side effect after terminalization rather than a required stage of the same task.

**Reproduction trace.** Submit an artifact request with Studio application enabled; let generation finish; observe `done`/`succeeded`; then disconnect the plugin, reject the apply, or return a failed acknowledgement. The job remains succeeded because its terminal guard rejects the correction. This is a source-confirmed failure path; it was not executed against a deployed environment during this documentation audit.

**Required correction.** A canonical task must remain non-terminal across `generated → delivery_pending → executing → verifying`. Generation success may produce an artifact event, not user-goal completion. Terminal outcome must be derived only after required effects and goal-specific verification, with a compensating failure allowed until finalization. Prompt 3 owns the state machine and projection compatibility; Prompt 2 must use it for Roblox operations.

### RC-02 — Studio delivery and acknowledgement ambiguity

**Confirmed symptom.** `StudioBridgeService.claimNextCommand` moves one document from `queued` to `delivered` at **backend/src/services/StudioBridgeService.js:1073-1133** without a delivery lease, attempt counter, acknowledgement deadline, redelivery rule, or expiry check. `expiresAt` is written at **backend/src/services/StudioBridgeService.js:943-1019** but is not enforced in claim or acknowledgement. The plugin queue is process-memory only, removes work before execution, and can exit through an outer protected call without sending an acknowledgement at **roblox-plugin/src/commands/registry.lua:527-655**.

**Confirmed acknowledgement split.** `StudioBridgeService.ackCommand` commits a terminal command state first at **backend/src/services/StudioBridgeService.js:1136-1221**. Routes then update runs, manifests, receipts, and validation records as best-effort projections at **backend/src/routes/studio.js:1743-2069**. A duplicate terminal acknowledgement returns early at **backend/src/routes/studio.js:1695-1697**, so it cannot replay a failed projection.

**Confirmed permissive success paths.** The bridge treats every acknowledgement status except literal `failed` as success at **backend/src/services/StudioBridgeService.js:1169**. The plugin converts a non-table handler return into a result and considers it successful unless `result.ok == false` at **roblox-plugin/src/commands/registry.lua:313-387**. Its acknowledgement HTTP response is ignored at **roblox-plugin/src/commands/registry.lua:177-187**. Verification exceptions fail open at **roblox-plugin/src/commands/registry.lua:428-432**. Atomic batch rollback reports `rolledBack` from the restore attempt without checking restore success at **roblox-plugin/src/commands/registry.lua:128-175**.

**Reproduction traces.** (1) Claim a command and terminate the plugin before its acknowledgement; the command remains delivered indefinitely. (2) Allow the command terminal write but fail a downstream run/manifest projection; resend the acknowledgement; the early return prevents projection recovery. (3) Return an unexpected status or nil-shaped plugin result; success normalization can accept it. These are source-confirmed paths; exact production incidence is Unknown.

**Required correction.** Use an operation ID independent of session, a fenced delivery lease, bounded redelivery, explicit cancellation/expiry, strict acknowledgement schema, result hash, and a transactional outbox/reconciler for every downstream projection. Verification failure must fail or explicitly degrade the task. A duplicate acknowledgement must replay the outbox safely rather than return before reconciliation.

### RC-03 — split agent paths drop identity, plans, and context

**Confirmed topology.** `useUnifiedChat` can use conversational Ask, artifact generation, or agent routing at **src/hooks/useUnifiedChat.js:440-566**. `artifactRunLauncher` chooses the iterative Studio agent only when a feature flag, action mode, Studio connection, and supported routing mode all align at **backend/src/services/artifactRunLauncher.js:95-100**; otherwise it chooses `AgentRunService` or the legacy worker at **backend/src/services/artifactRunLauncher.js:211-246**.

**Confirmed context loss.** The launcher builds rich project, asset, OAuth, history, and Studio context at **backend/src/services/artifactRunLauncher.js:144-188**, but the iterative `createRun` call receives only a smaller goal/chat/session/routing subset at **backend/src/services/artifactRunLauncher.js:211-225**. Approved workflow plans are reduced to a generated prompt or response rather than a durable executable plan at **src/hooks/useUnifiedChat.js:298-341** and **backend/src/routes/workflow.js:372-389**. `StudioAgentService` assembles a separate system prompt and history at **backend/src/services/StudioAgentService.js:1004-1162,1691-1819**.

**Root cause.** Branch selection occurs before one versioned task envelope exists. Persona, plan, attachments, project identity, consent, asset context, OAuth capability state, and completion policy are not required fields shared by every executor.

**Reproduction trace.** Submit the same Studio goal with the iterative flag/mode enabled and disabled. Inspect stored run/job inputs and offered tools; the two paths receive different context and persist different recovery data. The resulting quality difference is a Strong inference; the input divergence is Confirmed.

**Required correction.** Route all work through one task-submission facade and immutable context snapshot. Specialized executors may remain, but they must consume the same task, plan, identity, policy, capability, and verification contracts. Persona should be versioned configuration, not branch-specific prompt prose.

### RC-04 — no canonical task/event ledger or interruption recovery

**Confirmed persistence split.** Jobs, legacy runs, iterative Studio runs, Studio commands, chats, and Redis streams are independent authorities. `JobService` durably stores only selected event categories at **backend/src/services/JobService.js:14-43,343-375**; detailed stream information can remain in Redis for approximately one hour. Frontend recovery is tied to chat-local pending assistant state at **src/hooks/useAiChat.js:561-1405**, not a user-wide query for active tasks.

**Confirmed orphan windows.** The UI can persist a user message before job creation and then handle failure as local UI state at **src/hooks/useAiChat.js:648-799,1394-1405**. Transient model/provider errors can terminate the iterative run immediately at **backend/src/services/StudioAgentService.js:2133-2153** rather than become retryable task events/checkpoints.

**Strong inference.** A browser close, deploy, Redis loss, or worker restart can remove actionable progress while leaving partial durable records because no one append-only ledger owns sequence, checkpoint, retry, and user-visible projection. The repository contains several readers/continuation entry points but no dedicated reconciler proving all non-terminal work is resumed.

**Required correction.** Persist an append-only, monotonically sequenced task event ledger, current task projection, executor checkpoint, operation records, and user/project indexes. Browser recovery must query tasks independently of a chat tab. Every accepted request must create a task before optional chat projections; transient errors need retry policy and durable next-attempt state.

### RC-05 — non-atomic idempotency and lost-response duplicates

**Confirmed request race.** The artifact route reads an idempotency mapping, launches work, then writes the mapping at **backend/src/routes/ai.js:812-878**. `JobService.getIdempotencyRecord` and `setIdempotencyRecord` are separate operations at **backend/src/services/JobService.js:474-487**. Two concurrent requests can both observe absence and launch separate jobs.

**Confirmed external-operation race.** `RobloxOperationReceiptService` creates receipts and queries idempotency keys in separate calls at **backend/src/services/RobloxOperationReceiptService.js:17-65**. `RobloxOpenCloudClient.uploadAsset` can start the external creation before the receipt is safely reconciled at **backend/src/services/RobloxOpenCloudClient.js:79-118**. The decal path does pass a stable request ID at **backend/src/services/RobloxDecalUploadService.js:249-290**, but no universal operation policy exists.

**Root cause.** An idempotency key is stored as a lookup hint, not reserved transactionally as an operation with owner, input hash, attempt, provider reference, and terminal receipt. External “submitted but response lost” is not a first-class state.

**Reproduction trace.** Race two identical artifact requests before the map write, or interrupt an asset-upload response after provider submission but before local receipt completion. Retrying can launch a second local job or external asset. The race follows directly from source ordering; provider duplicate behavior remains Unknown without an integration test.

**Required correction.** Transactionally create-or-read an operation keyed by tenant, capability, canonical target, idempotency key, and input hash before side effects. Reject key reuse with a different hash. Persist `reserved/submitting/submitted/reconciling/succeeded/failed/unknown`, provider operation IDs, and replayable receipts. Only the operation owner may execute or recover it.

### RC-06 — manifests are robust snapshots but weak live preconditions

**Confirmed strengths.** `StudioManifestService` supports paged snapshots, item/source/property hashes, page-chain continuity, revision checksums, conflict detection, and promotion of a last-complete revision at **backend/src/services/StudioManifestService.js:202-229,562-834,1396-1573**.

**Confirmed gaps.** Backend context defaults to the last complete manifest at **backend/src/services/StudioProjectContextService.js:32-53**. Freshness is derived from TTL/signature metadata at **backend/src/services/StudioManifestService.js:463-491**, not guaranteed live readback. Identity is chiefly user/session/place/revision at **backend/src/services/StudioManifestService.js:909-1003**, not a stable owner/project/universe/place tuple. `expectedSourceHash` is supported but optional across script and instance mutations at **backend/src/lib/studioToolProtocol.js:744-857**. Final validation is inferred from stored succeeded validation, diagnostic, or smoke-step records rather than universally requiring a fresh post-write Studio read at **backend/src/services/StudioAgentService.js:627-648,1857-1894**; legacy preflight can continue after a manifest timeout at **backend/src/services/AgentRunService.js:573-588**.

**Root cause.** A strong snapshot format is being used as advisory context, not as a required optimistic-concurrency and postcondition contract.

**Reproduction trace.** Load context from the last complete revision, change the place in Studio, then issue a mutation without `expectedSourceHash`; the backend can act on stale assumptions. A timeout can degrade to execution rather than a typed blocked state. Exact collision behavior depends on the action and is a Strong inference.

**Required correction.** Bind manifests and operations to stable tenant/project/universe/place identity; record observed revision and freshness; require expected hashes/revisions for edits to known objects; refresh targeted paths when stale; and perform post-write readback for goal-specific invariants. Conflicts must block/replan, not silently overwrite.

### RC-07 — asset truth, authorization, and lifecycle defects

**Confirmed fragmented truth.** Asset data is split between project state, user/chat `ProjectAssetService` records at **backend/src/services/ProjectAssetService.js:190-204**, and global ontology collections plus nested project references at **backend/src/services/AssetOntologyService.js:494-507**. Applying asset IDs can update project state without establishing one canonical asset aggregate at **backend/src/services/AssetOntologyService.js:1447-1511**.

**Confirmed authorization defects.** Any authenticated verified user can review a global catalog promotion because **backend/src/routes/uiBuilder.js:2106** and `AssetOntologyService.reviewCatalogPromotion` at **backend/src/services/AssetOntologyService.js:928-982** do not require an admin/reviewer role. Usage aggregation at **backend/src/services/AssetOntologyService.js:996-1013** and **backend/src/routes/uiBuilder.js:2115-2120** has no owner filter. Global style profile IDs omit owner identity and arbitrary profile reads do not enforce ownership at **backend/src/services/AssetOntologyService.js:495,556,748-766**. `approveAssets` trusts a generation ID without proving owner/project association at **backend/src/services/AssetOntologyService.js:1171-1190**.

**Confirmed lifecycle defects.** `uploadApprovedAssets` can select unapproved assets when `requireApproval` is false at **backend/src/services/AssetOntologyService.js:1244-1266**, and the route explicitly passes false at **backend/src/routes/uiBuilder.js:2157-2167**. It creates an `uploading` binding at **backend/src/services/AssetOntologyService.js:1300-1319**, but a later retry reuses any matching binding without checking status or Roblox ID at **backend/src/services/AssetOntologyService.js:1281-1296**. Moderation `unknown/submitted` can still be treated as an available ID at **backend/src/services/AssetOntologyService.js:1355-1387** and **backend/src/services/RobloxModelUploadService.js:298-324**.

**Confirmed provider/storage concerns.** Generated objects receive public Storage URLs at **backend/src/services/AssetPipelineService.js:86-97**. Image-provider selection can silently fall back at **backend/src/lib/imageProviders/index.js:47-73,88-112**; DALL-E retries broad errors and lacks a durable provider-operation ID at **backend/src/lib/imageProviders/dalle.js:27-69**; background removal can pass the input through as success at **backend/src/lib/bgRemoval.js:102-124**.

**Non-destructive reproduction trace.** In a local emulator or isolated test account, create a failed `robloxBindings` record for an approved generation, then invoke the same upload lookup again: the status-blind branch at **backend/src/services/AssetOntologyService.js:1281-1296** selects the failed binding before proving a Roblox asset ID. Separately, call the catalog-review and usage-summary handlers as two different verified test users; static route/service inspection predicts that neither path applies reviewer authority or an owner filter. Do not use production data for either probe.

**Required correction.** Prompt 2 must define one tenant-scoped asset aggregate with immutable source/provenance, version, approval, moderation, upload operation, target creator, Roblox ID, and project attachment records. Review endpoints require explicit reviewer authority; all reads/writes require owner checks. Provider fallback and pass-through must be explicit degraded outcomes. No upload is successful without a valid Roblox ID and explicit moderation state.

### RC-08 — OAuth and Roblox capabilities are not agent-ready

**Confirmed reusable controls.** OAuth uses state, PKCE, a ten-minute state record, and transactional state consumption at **backend/src/services/RobloxOAuthService.js:169-383**. Refresh tokens are AES-256-GCM encrypted under `users/{uid}/integrations/roblox` at **backend/src/services/RobloxTokenStore.js:35-107**. Current registry metadata covers connection, resources, target creator, upload/read/version/quota, and Creator Store search at **backend/src/services/RobloxCapabilityRegistry.js:52-176**.

**Confirmed context mismatch.** `RobloxOAuthService` stores a richer connection/resources snapshot but its agent context omits complete resources, freshness, policy/consent, and structured unavailable reasons at **backend/src/services/RobloxOAuthService.js:536-574**. `artifactRunLauncher` catches context-load errors and substitutes disconnected/empty context at **backend/src/services/artifactRunLauncher.js:135-142**. Availability summarization is primarily missing-scope based at **backend/src/services/RobloxCapabilityRegistry.js:311-334**, not proof of route implementation, resource compatibility, project target, or user consent.

**Confirmed tool exposure mismatch.** `RobloxAgentToolService` wraps connection, resources, creator target, asset read/version, and upload at **backend/src/services/RobloxAgentToolService.js:18-68**. `AssetAgentToolService` wraps generation, approval, upload, refresh, attach, promotion, usage, and packs at **backend/src/services/AssetAgentToolService.js:30-203**. Tests exist, but no production model-tool registration for these wrappers was found. Registry metadata also includes quota and Creator Store search, which the Roblox wrapper does not expose.

**Non-destructive reproduction trace.** Build the current agent context for a connected test user, compare it with the persisted connection/resources record, then enumerate the production model tool definitions. The context projection omits the complete resource/freshness/policy facts, and the two wrapper services are not found in a production model registration. Repeat after forcing the context loader to throw: the launcher substitutes a disconnected snapshot at **backend/src/services/artifactRunLauncher.js:135-142** instead of retaining a typed capability-load failure.

**Required correction.** Build a server-generated, versioned capability snapshot containing implementation status, granted scopes, eligible resources/creator, project target, policy/consent, freshness, quota, and typed unavailable reason. Register only server-executable tools; never expose tokens. Refresh or block before a write when capability evidence is stale.

### RC-09 — tenant, pairing, token, and replay controls

**Confirmed tenant defects.** The asset cross-tenant review, usage, profile, and approval defects are listed in RC-07. They are release blockers, not future hardening.

**Confirmed Studio controls.** Browser queue/pairing routes use Firebase authentication, verified-email checks, and rate limits at **backend/src/routes/studio.js:408-424,1384-1425**. Plugin tokens are stored hashed and compared timing-safely at **backend/src/services/StudioBridgeService.js:428-498,575-593**. The plugin stores its bearer token in local plugin settings at **roblox-plugin/src/net/httpClient.lua:245-249**.

**Confirmed Studio gaps.** Pair codes are six characters from a 32-symbol alphabet and last ten minutes at **backend/src/services/StudioBridgeService.js:67-108** (approximately 30 bits is a Strong inference). Command envelopes are not independently signed/fenced. The plugin acknowledgement route authenticates the plugin but has no explicit acknowledgement mutation limiter comparable with the MCP route at **backend/src/routes/studio.js:1669-1688,2087-2088**. Plugin acknowledgement status is not validated as strictly as MCP at **backend/src/routes/studio.js:1678-1686**.

**Confirmed OAuth token gaps.** `RobloxTokenStore` derives one encryption key from an arbitrary configured secret without persisting a key ID/rotation version at **backend/src/services/RobloxTokenStore.js:4-33**. OAuth generates a nonce but does not validate returned identity-token claims at **backend/src/services/RobloxOAuthService.js:169,383**. Access-token caching and refresh deduplication are process-local at **backend/src/services/RobloxOAuthService.js:129,461**; a multi-instance rotating-refresh-token race is a Strong inference.

**Non-destructive reproduction trace.** Against local fixtures/emulators, invoke catalog review, usage aggregation, style-profile read, and generation approval as a different authenticated test user and assert denial; current source predicts the first two will not enforce the required domain authority and the latter two lack complete ownership binding. For pairing/replay, inspect two identical acknowledgements and a reconnect-created session in a mocked bridge: the terminal duplicate returns early and the session-bound dedupe does not constitute a cross-session replay receipt. Do not guess live pairing codes or target another user's records.

**Required correction.** Establish owner/project authorization middleware and role policy before domain handlers. Fence commands to a session generation and task operation. Validate strict status/result schemas and rate-limit mutations. Add managed-key versions and rotation, nonce validation when identity tokens are used, and a distributed refresh lease/CAS update. Security-store failure policy must be explicit: production requires Redis, disables reconnect, and ignores client error events at **backend/src/lib/securityStore.js:168-197**.

### RC-10 — observability, deployment, recovery, and test blind spots

**Confirmed observability gaps.** `/health` returns static success at **backend/server.js:97-108** rather than dependency/worker readiness. There is no universal correlation ID spanning HTTP request, task, executor run, Studio command, provider operation, and user projection. Durable job events are selective (RC-04), and acknowledgement projections can fail after the command is terminal (RC-02).

**Confirmed/Unknown deployment state.** The in-process job worker is opt-in via `RUN_JOB_WORKER` at **backend/server.js:241-255**. The repository does not prove deployed worker count, lease ownership, Redis/Firestore/Storage reachability, plugin version adoption, OAuth key deployment, or scheduled reconciliation. These are **Unknown** until deployment manifests and live telemetry are inspected. Process-level uncaught errors are logged but do not prove controlled termination/restart at **backend/server.js:68-74**.

**Confirmed test imbalance.** Protocol sanitizer/classification/build-compatibility tests exist, but the repository does not provide one deterministic end-to-end suite covering browser interruption, concurrent idempotency, worker death, plugin claim death, duplicate acknowledgements, projection replay, stale manifests, OAuth refresh races, provider lost responses, cross-tenant denial, moderation polling, and verified user-goal completion.

**Non-destructive reproduction trace.** Run the API with the job worker disabled or with a mocked unavailable dependency, then call `/health`: the static handler still reports success. In an isolated datastore, stop a worker or plugin after a job/command claim and inspect the records after their nominal deadline; no universal lease sweeper or command redelivery transition is present. Finally, compare emitted log fields across request, job, run, command, and upload paths; no required correlation chain joins all five.

**Required correction.** Add dependency-aware liveness/readiness, worker heartbeat/lag, task/operation age, command lease age, projection-outbox lag, OAuth refresh contention, moderation age, and provider reconciliation metrics. Structured logs and traces must carry one correlation chain. A durable sweeper must resume/reconcile non-terminal records; chaos/failure-injection gates must run before either production rebuild is declared ready.

## Studio protocol inventory — exactly 49 actions

### Classification and common controls

- **R** — observational/read-only against the place or plugin state.
- **W** — mutates the place or starts/stops an execution-affecting Studio operation.
- **D** — destructive subset of W as encoded in `DESTRUCTIVE_TOOL_COMMANDS` at **backend/src/lib/studioToolProtocol.js:136-144**.
- **S** — stateful support/verification action that does not belong to the protocol mutating set.
- **U** — advertised through a function-valued plugin handler but deliberately returns structured `unsupported`.

All 49 are payload-size bounded and sanitized by `sanitizeToolPayload` at **backend/src/lib/studioToolProtocol.js:593-939**. Most receive a generated payload idempotency key at **backend/src/lib/studioToolProtocol.js:601-604**; this is deterministic input labeling, not a universal exactly-once execution receipt. The server queue transaction deduplicates a command within its current user/session/type/key identity at **backend/src/services/StudioBridgeService.js:943-1031**, but a reconnect changes session identity and the plugin has no general persistent replay ledger. Destructive actions require `destructiveConfirmed` in the top-level sanitized envelope; deletes force snapshots at **backend/src/lib/studioToolProtocol.js:808-815**. Authentication is transport-level: paired plugin bearer/session or authenticated MCP connector, not per-action authorization.

The expected action set and plugin build contract are tested at **backend/src/lib/studioToolProtocol.test.js:15-43**, **backend/src/lib/studioPluginBuildContract.test.js:72-75**, and **backend/src/lib/studioPluginCompatibility.test.js:37-123**. Those tests prove static contract/compatibility, not end-to-end behavior for every row. Unless a row says otherwise, no action-specific failure-injection or live-Studio behavioral test was found.

| # | Action / class | Implemented semantics and side effect | Reliability, security, verification, errors, and test note |
| ---: | --- | --- | --- |
| 1 | `apply_artifact` / D | Applies a multi-object artifact through `applyArtifact` (**roblox-plugin/src/commands/registry.lua:32**). | Destructive confirmation and artifact schema checks; broad mutation can partially fail. Snapshot/rollback verification is not an atomic transaction. Contract/build coverage; no live crash-recovery test found. |
| 2 | `get_project_manifest` / R | Aliases `inspectPlace` and returns a bounded/paged place manifest (**roblox-plugin/src/commands/registry.lua:39**). | Supports cursor/revision and optional source/properties (**backend/src/lib/studioToolProtocol.js:664-677**). Snapshot can be stale after collection; manifest assembly tests do not prove live freshness. |
| 3 | `list_children` / R | Lists children under one cleaned Studio path (**roblox-plugin/src/commands/registry.lua:40**). | Path, page size, cursor, and property inclusion are bounded (**backend/src/lib/studioToolProtocol.js:680-687**). No per-row authorization beyond paired session; contract/build coverage. |
| 4 | `inspect_place` / R | Uses `inspectPlace` for a bounded place view (**roblox-plugin/src/commands/registry.lua:41**). | Same paging/freshness limits as manifest. Unknown command names silently sanitize to this action at **backend/src/lib/studioToolProtocol.js:597**, masking caller defects. |
| 5 | `inspect_instances` / R | Reads selected instance paths, children, metadata, and source hashes (**roblox-plugin/src/commands/registry.lua:42**). | Requires at least one valid path and bounds path count (**backend/src/lib/studioToolProtocol.js:690-701**). Contract/build coverage; no live permission-boundary test found. |
| 6 | `search_project` / R | Searches names/classes/paths through `searchProject` (**roblox-plugin/src/commands/registry.lua:43**). | Query, paths, classes, contexts, and result count are bounded (**backend/src/lib/studioToolProtocol.js:704-715**). Search is advisory; a subsequent mutation still needs a fresh precondition. |
| 7 | `search_source` / R | Searches script source through `searchSource` (**roblox-plugin/src/commands/registry.lua:44**). | Can include bounded source context; may expose project source to the paired user/session. Contract/build coverage; no content-redaction policy found. |
| 8 | `read_script` / R | Reads one script using `readScript` (**roblox-plugin/src/commands/registry.lua:45**). | Valid path required, max chars bounded, hash returned by default (**backend/src/lib/studioToolProtocol.js:718-726**). Suitable for optimistic precondition acquisition; no freshness guarantee after return. |
| 9 | `read_scripts` / R | Aliases the same reader for up to 100 paths (**roblox-plugin/src/commands/registry.lua:46**). | Same bounds/hashes as `read_script`; alias reduces handler drift but result-shape compatibility is build-tested rather than live-tested. |
| 10 | `read_instance` / R | Reads one or several instance records (**roblox-plugin/src/commands/registry.lua:47**). | Requires path(s), optional children/attributes/tags (**backend/src/lib/studioToolProtocol.js:729-741**). No property allowlist at protocol level; plugin serialization determines readable shape. |
| 11 | `read_properties` / R | Aliases instance reader for selected properties (**roblox-plugin/src/commands/registry.lua:48**). | Bounded property list; same transport authorization and staleness concerns. Static handler contract only. |
| 12 | `get_selection` / R | Returns the current Studio selection through `getSelectionTool` (**roblox-plugin/src/commands/registry.lua:49**). | Selection is ephemeral/user-local and should not be durable identity. No action-specific test found. |
| 13 | `get_studio_context` / R | Returns current Studio/place/editor context (**roblox-plugin/src/commands/registry.lua:50**). | Advisory snapshot; does not itself prove stable project/universe ownership. Static handler contract only. |
| 14 | `get_change_history` / R | Returns plugin-local snapshots and count (**roblox-plugin/src/commands/registry.lua:51-53**). | History is process-memory state, lost on reload, and is not Roblox ChangeHistoryService durability. Naming can overstate guarantees. |
| 15 | `get_output_logs` / R | Aliases `collectOutput` for bounded filtered output (**roblox-plugin/src/commands/registry.lua:54**). | Levels/count/time are sanitized (**backend/src/lib/studioToolProtocol.js:906-918**). Observational only; no durable cursor or completeness proof. |
| 16 | `create_script` / W | Creates a Script/LocalScript/ModuleScript at a cleaned path (**roblox-plugin/src/commands/registry.lua:59**). | Snapshot defaults on; overwrite is explicit; `expectedSourceHash` is optional (**backend/src/lib/studioToolProtocol.js:744-755**). General idempotency is not persistent in plugin. |
| 17 | `write_script` / W | Creates or replaces script source through `writeScript` (**roblox-plugin/src/commands/registry.lua:60**). | Source bounded and snapshot defaults on, but expected hash/revision are optional. Conflict overwrite is therefore possible; protocol sanitizer tests cover shape, not concurrent edit behavior. |
| 18 | `patch_script` / W | Applies find/replace, unified diff, or full-source patch (**roblox-plugin/src/commands/registry.lua:61**). | Patch count/source bounded; snapshot defaults on; expected hash optional (**backend/src/lib/studioToolProtocol.js:758-773**). Requires post-write readback for reliable success; not guaranteed cross-transport. |
| 19 | `rename_script` / W | Aliases instance rename for a script (**roblox-plugin/src/commands/registry.lua:62**). | Snapshot defaults on; optional expected source hash (**backend/src/lib/studioToolProtocol.js:776-783**). Path identity changes and needs manifest reconciliation. |
| 20 | `move_script` / W | Moves a script and can create parents (**roblox-plugin/src/commands/registry.lua:63**). | Snapshot defaults on; expected hash optional (**backend/src/lib/studioToolProtocol.js:786-795**). Retrying after a lost response can encounter source-path absence rather than replay a receipt. |
| 21 | `duplicate_script` / W | Clones a script to a new path (**roblox-plugin/src/commands/registry.lua:64**). | Snapshot defaults on but no source hash precondition (**backend/src/lib/studioToolProtocol.js:798-805**). Duplicate retry semantics depend on handler collision behavior. |
| 22 | `delete_script` / D | Deletes a script through `deleteScript` (**roblox-plugin/src/commands/registry.lua:65**). | Top-level confirmation and forced snapshot; expected hash optional (**backend/src/lib/studioToolProtocol.js:808-815**). Snapshot is plugin-memory scoped, so recovery is not durable across reload. |
| 23 | `format_script` / W/U | Handler always returns structured unsupported (**roblox-plugin/src/commands/registry.lua:66-68**). | **Capability defect:** attestation still advertises it because the handler is a function (**roblox-plugin/src/commands/registry.lua:98-121**). Backend accepts/sanitizes it, so exposed-but-plugin-unsupported. Compatibility tests do not reject this semantic mismatch. |
| 24 | `replace_in_files` / D | Performs bounded multi-file replacement through `replaceInFiles` (**roblox-plugin/src/commands/registry.lua:69**). | Confirmation required; paths/file count bounded; snapshot defaults on (**backend/src/lib/studioToolProtocol.js:822-833**). No per-file expected hash, so stale bulk edits are possible. |
| 25 | `create_instance` / W | Creates one allowlisted class with properties, attributes, and tags (**roblox-plugin/src/commands/registry.lua:70**). | Class allowlist at **backend/src/lib/studioToolProtocol.js:65-103**; snapshot defaults on. Property-level Roblox validity is runtime-checked; no persistent replay receipt. |
| 26 | `update_properties` / W | Updates properties through `updateProperties` (**roblox-plugin/src/commands/registry.lua:71**). | Object size bounded; snapshot defaults on; expected hash optional (**backend/src/lib/studioToolProtocol.js:849-857**). Partial property failures and rollback need strict structured proof. |
| 27 | `update_attributes` / W | Updates attributes through `updateAttributes` (**roblox-plugin/src/commands/registry.lua:72**). | Same sanitized envelope as properties; expected hash optional. Contract/build coverage; no concurrent-change test found. |
| 28 | `update_tags` / W | Adds/removes/replaces CollectionService tags (**roblox-plugin/src/commands/registry.lua:73**). | Tag counts bounded and snapshot defaults on (**backend/src/lib/studioToolProtocol.js:860-868**). No expected revision; retry may be safe for set operations but no formal receipt proves it. |
| 29 | `rename_instance` / W | Renames an instance through `renameInstanceTool` (**roblox-plugin/src/commands/registry.lua:74**). | Snapshot defaults on and expected source hash optional. New-name collision/error semantics are plugin-defined; reconciliation required. |
| 30 | `move_instance` / W | Moves an instance and optionally creates parents (**roblox-plugin/src/commands/registry.lua:75**). | Snapshot defaults on; optional source hash only. Lost response/retry can be ambiguous after path changes. |
| 31 | `duplicate_instance` / W | Clones an instance subtree to a new path (**roblox-plugin/src/commands/registry.lua:76**). | Snapshot defaults on; no expected revision. Large clone and collision behavior lack a live bounded/failure test in the located suite. |
| 32 | `delete_instance` / D | Deletes an instance/subtree through `deleteInstanceTool` (**roblox-plugin/src/commands/registry.lua:77**). | Confirmation and forced snapshot; expected hash optional. Snapshot recovery is volatile and should not be treated as durable rollback. |
| 33 | `batch_operations` / D | Executes up to 240 nested sanitized operations, optionally atomic (**backend/src/lib/studioToolProtocol.js:871-879**; **roblox-plugin/src/commands/registry.lua:128-175**). | Nested destructive confirmation is not the same per-op gate; rollback result is not checked before `rolledBack` reporting. Protocol batch tests exist at **backend/src/lib/studioToolProtocol.test.js:340-351**, but crash atomicity is unproved. |
| 34 | `build_native_model` / W | Compiles and builds a normalized native-model spec (**roblox-plugin/src/commands/registry.lua:56** plus `nativeModel.lua`). | Has spec hash, stable idempotency key, and apply-mode policy (**backend/src/lib/studioToolProtocol.js:611-626**), stronger than generic actions. Still needs task-level operation receipt and live postcondition. |
| 35 | `insert_creator_store_asset` / W | Inserts a server-trusted Creator Store asset through `ImportedAsset` (**roblox-plugin/src/commands/registry.lua:33-35**). | Sanitizer restricts destinations/metadata (**backend/src/lib/studioToolProtocol.js:629-631**, helper at **backend/src/lib/studioToolProtocol.js:339-385**). Trust depends on backend-originated metadata; browser values must remain non-authoritative. |
| 36 | `insert_uploaded_roblox_model` / W | Inserts a server-trusted uploaded Roblox model (**roblox-plugin/src/commands/registry.lua:36-38**). | Sanitizer validates trusted upload payload/target (**backend/src/lib/studioToolProtocol.js:633-635**, helper at **backend/src/lib/studioToolProtocol.js:387-470**). Must bind to owner/project and approved upload receipt; plugin alone cannot establish that authority. |
| 37 | `inspect_native_model` / R | Inspects model structure/revision through `inspectNativeModel` (**roblox-plugin/src/commands/registry.lua:57**). | Model path/ID and traversal are bounded (**backend/src/lib/studioToolProtocol.js:637-645**). Useful pre/postcondition, but not automatically required after writes. |
| 38 | `apply_native_model_patch` / W | Applies a validated native-model patch (**roblox-plugin/src/commands/registry.lua:58**). | Patch hash, model ID, expected revision, and stable key are supported (**backend/src/lib/studioToolProtocol.js:648-661**). Destructive flag is carried but action is not in the protocol destructive set; policy consistency needs resolution. |
| 39 | `parse_luau` / R | Parses source/path through `parseLuau` (**roblox-plugin/src/commands/registry.lua:78**). | Source is bounded (**backend/src/lib/studioToolProtocol.js:882-887**). This is syntax-oriented validation, not execution or semantic correctness. |
| 40 | `run_smoke_check` / S | Runs bounded plugin smoke checks (**roblox-plugin/src/commands/registry.lua:95**). | Validation target/check/limit fields are sanitized (**backend/src/lib/studioToolProtocol.js:890-903**). Result is health evidence, not proof the user goal is resolved. |
| 41 | `run_project_validation` / S | Runs project validation through `runProjectValidation` (**roblox-plugin/src/commands/registry.lua:79**). | Same bounded validation envelope; source scanning optional. Validation rules/version should be persisted with outcome; current task system does not make it a universal terminal gate. |
| 42 | `run_test_service` / W/U | Handler always returns structured unsupported (**roblox-plugin/src/commands/registry.lua:81-83**). | Backend and MCP adapter expose it, and plugin attestation incorrectly advertises it. Payload profile/executable-key restrictions exist at **backend/src/lib/studioToolProtocol.js:560-580,921-923**; no plugin execution occurs. |
| 43 | `run_play_test` / W/U | Handler always returns structured unsupported (**roblox-plugin/src/commands/registry.lua:84-86**). | Same attestation mismatch. MCP adapter tests list it at **backend/src/services/studioTransport/McpLocalAdapter.test.js:79-104**; plugin route cannot perform it. |
| 44 | `stop_play_test` / W/U | Handler always returns structured unsupported (**roblox-plugin/src/commands/registry.lua:87-89**). | Same attestation mismatch and MCP/plugin capability split. Static handler presence is not executable support. |
| 45 | `collect_diagnostics` / S | Collects bounded project diagnostics (**roblox-plugin/src/commands/registry.lua:80**). | Structured target/check limits; observational evidence can be stale and is not durably tied to a completion policy by default. |
| 46 | `collect_output` / R | Aliases `collectOutput` (**roblox-plugin/src/commands/registry.lua:55**). | Same bounded filtering as `get_output_logs`; two protocol names expose one handler. No durable completeness/cursor guarantee. |
| 47 | `create_snapshot` / S | Captures selected paths into plugin-local snapshots (**roblox-plugin/src/commands/registry.lua:90**). | Paths required and recursion sanitized (**backend/src/lib/studioToolProtocol.js:925-932**). Snapshot durability is process-local; no backend blob/hash proves recoverability after reload. |
| 48 | `restore_snapshot` / D | Restores supplied/local snapshot state (**roblox-plugin/src/commands/registry.lua:91**). | Confirmation required and payload cleaned (**backend/src/lib/studioToolProtocol.js:935-936**). Broad destructive action; restoration result must be verified live and tied to snapshot ID/hash. |
| 49 | `undo_last_batch` / D | Restores `lastBatchSnapshots` through `restoreSnapshots` (**roblox-plugin/src/commands/registry.lua:92-94**). | Confirmation required, but state is volatile and “last” is plugin-process scoped. No durable ordering/fencing; not safe as the sole compensation mechanism. |

### Studio capability conclusions

| Category | Confirmed inventory | Consequence |
| --- | --- | --- |
| Backend protocol and plugin implementation agree | 45 actions have non-placeholder plugin handlers | “Handler present” still does not prove end-to-end success, replay safety, or postcondition verification |
| Exposed but plugin-unsupported | `format_script`, `run_test_service`, `run_play_test`, `stop_play_test` | Dynamic attestation incorrectly includes them because unsupported closures are functions at **roblox-plugin/src/commands/registry.lua:98-121** |
| Transport-specific support | MCP adapter includes TestService/play-test actions | Agent must receive a transport-specific capability snapshot, not the 49-action static set |
| Destructive contract | 7 actions are classified destructive; 28 are mutating | `apply_native_model_patch` carries destructive confirmation but is not in the destructive set; classification policy needs one source of truth |
| General idempotency | Sanitized keys and queue-time transaction | Not a durable executor replay ledger; session-bound command identity and lost acknowledgements remain ambiguous |
| Verification | parse/smoke/project validation/diagnostic/output and native-model inspect exist | They are available actions, not automatically required goal-specific completion gates |

## Backend AI, asset, OAuth, and Roblox capability inventory

### Agent/runtime capabilities

| Capability | Repository status | Exposure and reliability finding | Evidence |
| --- | --- | --- | --- |
| Conversational Ask with streaming | Implemented and UI-exposed | Chat-local lifecycle; not a canonical resumable task | **src/hooks/useUnifiedChat.js:344-566**; **src/hooks/useAiChat.js** |
| Legacy artifact generation | Implemented and UI/API-exposed | Terminalizes before optional Studio apply | **backend/src/routes/ai.js:748-888**; **backend/src/workers/generateArtifactWorker.js:1424-1463** |
| Legacy Studio apply run | Implemented | Separate run/job authorities and late-ack projection | **backend/src/services/AgentRunService.js:460-605** |
| Iterative Studio agent | Implemented behind routing/feature conditions | Persists steps/decision lease, but receives reduced context and lacks universal recovery scheduler evidence | **backend/src/services/artifactRunLauncher.js:95-225**; **backend/src/services/StudioAgentService.js:1004-2670** |
| Workflow planning | Implemented and exposed | Approved plan is not a durable executable plan contract | **src/hooks/useUnifiedChat.js:298-341**; **backend/src/routes/workflow.js:372-389** |
| Studio dynamic tool filtering | Implemented on iterative path | Filters protocol against session attestation, but attestation itself overstates four plugin actions | **backend/src/services/StudioAgentService.js:119-290,1742-1760**; **roblox-plugin/src/commands/registry.lua:98-121** |
| Canonical task/event/checkpoint ledger | Not implemented | Future-only prerequisite for Prompt 3 | No single authority found across jobs/runs/commands/streams |
| Durable executor reconciliation/sweeper | Not proved | Unknown deployed behavior; future contract required | Reader/ack continuation exists, dedicated universal scheduler not located |
| Goal-specific verifier/acceptance proof | Partial | Validation actions exist; no universal persisted proof tied to terminal state | **backend/src/services/StudioAgentService.js:627-648,1857-1894**; **backend/src/services/JobService.js:94-119** |
| AI billing and entitlement gate | Implemented and request-exposed as a server precondition, not a model tool | Cached plan resolution, paid/free policy, and free-request reservation are split across routes and workers rather than captured in one immutable task capability snapshot | **backend/src/routes/ai.js:319-332,596-605,748-755,1301-1305**; **backend/src/lib/planTiers.test.js:5-33**; **backend/src/lib/freeUsageService.test.js:45-124** |

### Asset capabilities

| Capability | Repository status | Exposure and defect boundary | Evidence |
| --- | --- | --- | --- |
| Image generation/provider selection | Implemented and exposed through asset flows | Silent fallback and broad retry semantics can hide degraded output | **backend/src/lib/imageProviders/index.js:47-112**; **backend/src/lib/imageProviders/dalle.js:27-69** |
| Background removal | Implemented | Can pass input through as success; quality/operation outcome not explicit | **backend/src/lib/bgRemoval.js:102-124** |
| Project/chat generated assets and attachments | Implemented and exposed | One of three competing stores | **backend/src/services/ProjectAssetService.js:190-204** |
| Ontology master assets, generations, project refs | Implemented and exposed | Global IDs/collections have ownership and consistency defects | **backend/src/services/AssetOntologyService.js:494-766,1125-1190** |
| Approval/review/promotion | Implemented and route-exposed | P0 reviewer/tenant authorization gaps | **backend/src/services/AssetOntologyService.js:880-1013**; **backend/src/routes/uiBuilder.js:2106-2120** |
| Image/decal upload to Roblox | Implemented and exposed | Consent/approval/lifecycle/idempotency inconsistent across paths | **backend/src/services/RobloxDecalUploadService.js:249-290**; **backend/src/services/AssetOntologyService.js:1244-1387** |
| Model upload to Roblox | Implemented and exposed | Asset ID can coexist with submitted/unknown moderation; needs reconciliation | **backend/src/services/RobloxModelUploadService.js:284-324** |
| Upload retry/poll | Partially implemented and exposed | Failed/uploading binding can be reused as false success | **backend/src/services/AssetOntologyService.js:1281-1425** |
| Trusted Studio insertion of Creator Store/uploaded model | Implemented and Studio-exposed | Server-trusted metadata boundary is reusable; must bind to canonical asset/operation | **backend/src/lib/studioToolProtocol.js:339-470**; **roblox-plugin/src/commands/registry.lua:33-38** |
| `AssetAgentToolService` generation/approval/upload/attach/promote/usage/packs | Implemented and tested, but production model exposure not found | **Implemented-but-unexposed** to a production agent tool registry | **backend/src/services/AssetAgentToolService.js:30-203** |
| Canonical private asset aggregate and version graph | Not implemented | Future Prompt 2 domain | Three current authorities require compatibility readers/backfill |
| Badge creation | Not found | Future-only; official endpoint/scope/quota must be revalidated | No operational service/route located |
| Game-pass creation | Not found | Future-only; official endpoint/scope/quota must be revalidated | No operational service/route located |
| Developer-product creation | Not found | Future-only; official endpoint/scope/quota must be revalidated | No operational service/route located |
| Robux pricing update | Not found | Future-only; official endpoint/scope/quota must be revalidated | No operational service/route located |

### OAuth and Roblox Open Cloud capabilities

| Capability | Registry/service status | Production exposure and finding | Evidence |
| --- | --- | --- | --- |
| OAuth connect/callback/status/disconnect | Implemented and route-exposed | State/PKCE strong; nonce, key rotation, and distributed refresh gaps remain | **backend/src/services/RobloxOAuthService.js:169-616**; **backend/src/routes/roblox.js:355-473** |
| Encrypted token storage | Implemented | Server-only AES-GCM; no key ID/rotation model | **backend/src/services/RobloxTokenStore.js:4-190** |
| Get connection/resources | Implemented and wrapper-exposed | Agent context is incomplete/stale-capable | **backend/src/services/RobloxAgentToolService.js:18-33**; **backend/src/services/RobloxOAuthService.js:536-574** |
| Set target creator / ensure capability | Implemented in wrapper | Needs canonical project/owner binding and current policy snapshot | **backend/src/services/RobloxAgentToolService.js:34-46** |
| Upload asset | Implemented in registry/wrapper/routes | Only located operational writes are image/decal/model; receipt reservation is non-atomic | **backend/src/services/RobloxAgentToolService.js:61-65**; **backend/src/services/RobloxOpenCloudClient.js:79-168** |
| Get asset / versions | Implemented in wrapper/routes | Read capability; availability still depends on scope/resource/target | **backend/src/services/RobloxAgentToolService.js:47-60**; **backend/src/routes/roblox.js:480-495** |
| Quota | Present in capability registry | **Implemented metadata but not exposed by `RobloxAgentToolService`**; production executor path not proved | **backend/src/services/RobloxCapabilityRegistry.js:52-176** |
| Creator Store search | Registry metadata and public catalog route exist | Wrapper omission and public-route semantics mean no confirmed production agent tool | **backend/src/services/RobloxCapabilityRegistry.js:52-176**; **backend/src/routes/roblox.js:80-153** |
| `RobloxAgentToolService` operations | Implemented and tested, production model registration not found | **Implemented-but-unexposed** to current production model loop | **backend/src/services/RobloxAgentToolService.js:18-68** |
| Universe metadata update | Registry marks future | Future-only; no operational implementation found | **backend/src/services/RobloxCapabilityRegistry.js:52-176** |
| Messaging/restart servers/user restriction | Registry marks future | Future-only; no operational implementation found | **backend/src/services/RobloxCapabilityRegistry.js:52-176** |
| Group read/membership management | Registry marks future | Future-only; no operational implementation found | **backend/src/services/RobloxCapabilityRegistry.js:52-176** |
| Universe-secret management | Registry marks future | Future-only; no operational implementation found | **backend/src/services/RobloxCapabilityRegistry.js:52-176** |

### Uniform 16-field capability audit

This normalized matrix prevents a route, registry entry, or plugin handler from being mistaken for a production-ready agent capability. The exact-name inventory row above (or exact-number Studio row) supplies fields **1 name, 2 purpose, and 3 implementation**. The profile supplies fields **4 input/output schema, 5 authentication, 6 OAuth scopes, 7 Studio connection, and 8 backend operation**. Each row below supplies fields **9 external side effect, 10 idempotent, 11 result verified, 12 exposed to the model, 13 description accurate, 14 typed errors, 15 safe retry behavior, and 16 tests**. Thus every listed capability has all 16 required fields without repeating long controls 87 times.

`Y` means confirmed yes; `N` means confirmed no; `P` means partial, conditional, or weaker than the target contract; `U` means Unknown/not located; and `NA` means not applicable. `N` is never used merely because evidence is absent. “External side effect” means a Roblox, Studio, provider, or other non-NexusRBX-datastore effect; an internal read or projection write alone is `N`.

| Profile | Input/output schema | Authentication | OAuth scopes | Studio connection | Backend operation |
| --- | --- | --- | --- | --- | --- |
| `ST` | P — action-specific sanitizers and plugin-shaped results, not one strict result envelope | Y — paired bearer/session or verified MCP connector | NA | Y — live, transport-specific session required | Y — protocol sanitizer, transport router, and command queue |
| `CHAT` | P — route/SSE shapes exist; no canonical task result | P — route/user context exists, but anonymous/site variants differ | NA | N | Y — chat/orchestration route and model stream |
| `RUN` | P — job/run/step schemas exist but conflict | Y — Firebase/verified-user and entitlement path | NA | P — branch and mode dependent | Y — launcher plus worker or run service |
| `STAG` | P — iterative run/step/tool records, no canonical task envelope | Y — Firebase plus paired/MCP session | NA | Y | Y — iterative Studio agent service |
| `PLAN` | P — plan response exists; approved executable plan does not | Y — Firebase/verified route | NA | N | Y — workflow route/model request |
| `PARTIAL` | P | Y or route-specific P | NA | P where the capability invokes Studio | P — implemented component without canonical operation contract |
| `FUTURE` | N — no operational schema | U — policy not implemented | U when Roblox authorization may be required; otherwise NA | NA unless specified by the target | N — no operational executor |
| `ASSET-GEN` | P — provider/route-specific request and asset shapes | P — authenticated route, incomplete canonical project policy | NA | N | Y — media/provider service |
| `ASSET-ONTOLOGY` | P — service-specific generation/reference/catalog shapes | P — auth exists; owner/reviewer/project checks are incomplete | NA | N | Y — ontology or project-asset service |
| `ASSET-UPLOAD` | P — upload/binding/receipt shapes are not one lifecycle contract | P — user token/consent/owner policy varies by path | P — registry names scopes; exact current grant is request-specific | N | Y — upload/Open Cloud/receipt services |
| `ASSET-STUDIO` | P — server-sanitized trusted insertion payload and plugin result | P — web owner/upload proof is not fully bound to the Studio command | NA at insertion | Y | Y — trusted payload builder, queue, and plugin insertion |
| `ASSET-TOOLS` | P — wrapper-specific tool shapes | P — authenticated user; ownership varies by operation | P or NA by operation | P | Y — wrapper exists, but production model registration was not found |
| `OAUTH` | P — state/token/status/resource shapes exist | Y — authenticated start; one-time state-bound callback | P — configured/requested scopes exist; live grants vary | N | Y — OAuth, token store, and resource discovery |
| `ROBLOX-READ` | P — wrapper/route response shapes | Y — authenticated user plus stored OAuth connection | P — capability-registry scope mapping | N | Y — Open Cloud read/wrapper operation |
| `ROBLOX-WRITE` | P — operation-specific request/response, not canonical receipt | P — authenticated user; owner/destination binding varies | P — registry asset-write scopes; live grant varies | N | Y — Open Cloud write/upload service |
| `REGISTRY` | P — metadata schema, not an executable tool result | P — user/capability context when resolved | P — declared scopes, not proof of grant | N | P — metadata resolver, not execution |
| `ENTITLEMENT` | P — route-specific entitlement and reservation shapes, not an immutable task capability snapshot | Y — Firebase-authenticated route or trusted worker user | NA | N | Y — billing resolver, access gate, and usage reservation |

#### Studio actions (49)

| # | Capability | Purpose/implementation source | Profile | Side effect | Idempotent | Verified | Model | Accurate | Typed errors | Retry safe | Tests |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `apply_artifact` | Studio row 1 | `ST` | Y | P | P | N | P | P | N | P |
| 2 | `get_project_manifest` | Studio row 2 | `ST` | N | Y | P | P | Y | P | Y | P |
| 3 | `list_children` | Studio row 3 | `ST` | N | Y | P | P | Y | P | Y | P |
| 4 | `inspect_place` | Studio row 4 | `ST` | N | Y | P | P | N | P | Y | P |
| 5 | `inspect_instances` | Studio row 5 | `ST` | N | Y | P | P | Y | P | Y | P |
| 6 | `search_project` | Studio row 6 | `ST` | N | Y | P | P | Y | P | Y | P |
| 7 | `search_source` | Studio row 7 | `ST` | N | Y | P | P | P | P | Y | P |
| 8 | `read_script` | Studio row 8 | `ST` | N | Y | P | P | Y | P | Y | P |
| 9 | `read_scripts` | Studio row 9 | `ST` | N | Y | P | P | Y | P | Y | P |
| 10 | `read_instance` | Studio row 10 | `ST` | N | Y | P | P | P | P | Y | P |
| 11 | `read_properties` | Studio row 11 | `ST` | N | Y | P | P | Y | P | Y | P |
| 12 | `get_selection` | Studio row 12 | `ST` | N | Y | P | P | Y | P | Y | P |
| 13 | `get_studio_context` | Studio row 13 | `ST` | N | Y | P | P | P | P | Y | P |
| 14 | `get_change_history` | Studio row 14 | `ST` | N | Y | P | P | N | P | Y | P |
| 15 | `get_output_logs` | Studio row 15 | `ST` | N | Y | P | P | P | P | Y | P |
| 16 | `create_script` | Studio row 16 | `ST` | Y | P | P | P | P | P | P | P |
| 17 | `write_script` | Studio row 17 | `ST` | Y | P | P | P | P | P | N | P |
| 18 | `patch_script` | Studio row 18 | `ST` | Y | P | P | P | P | P | N | P |
| 19 | `rename_script` | Studio row 19 | `ST` | Y | P | P | P | P | P | N | P |
| 20 | `move_script` | Studio row 20 | `ST` | Y | P | P | P | P | P | N | P |
| 21 | `duplicate_script` | Studio row 21 | `ST` | Y | P | P | P | P | P | N | P |
| 22 | `delete_script` | Studio row 22 | `ST` | Y | P | P | P | P | P | N | P |
| 23 | `format_script` | Studio row 23 | `ST` | N | NA | NA | P | N | Y | Y | P |
| 24 | `replace_in_files` | Studio row 24 | `ST` | Y | P | P | P | P | P | N | P |
| 25 | `create_instance` | Studio row 25 | `ST` | Y | P | P | P | P | P | P | P |
| 26 | `update_properties` | Studio row 26 | `ST` | Y | P | P | P | P | P | N | P |
| 27 | `update_attributes` | Studio row 27 | `ST` | Y | P | P | P | P | P | P | P |
| 28 | `update_tags` | Studio row 28 | `ST` | Y | P | P | P | P | P | P | P |
| 29 | `rename_instance` | Studio row 29 | `ST` | Y | P | P | P | P | P | N | P |
| 30 | `move_instance` | Studio row 30 | `ST` | Y | P | P | P | P | P | N | P |
| 31 | `duplicate_instance` | Studio row 31 | `ST` | Y | P | P | P | P | P | N | P |
| 32 | `delete_instance` | Studio row 32 | `ST` | Y | P | P | P | P | P | N | P |
| 33 | `batch_operations` | Studio row 33 | `ST` | Y | P | N | P | P | P | N | P |
| 34 | `build_native_model` | Studio row 34 | `ST` | Y | P | P | P | P | P | P | P |
| 35 | `insert_creator_store_asset` | Studio row 35 | `ST` | Y | P | P | P | P | Y | P | P |
| 36 | `insert_uploaded_roblox_model` | Studio row 36 | `ST` | Y | P | P | P | P | Y | P | P |
| 37 | `inspect_native_model` | Studio row 37 | `ST` | N | Y | P | P | Y | P | Y | P |
| 38 | `apply_native_model_patch` | Studio row 38 | `ST` | Y | P | P | P | P | P | P | P |
| 39 | `parse_luau` | Studio row 39 | `ST` | N | Y | P | P | Y | P | Y | P |
| 40 | `run_smoke_check` | Studio row 40 | `ST` | N | Y | P | P | P | P | Y | P |
| 41 | `run_project_validation` | Studio row 41 | `ST` | N | Y | P | P | P | P | Y | P |
| 42 | `run_test_service` | Studio row 42 | `ST` | N | NA | NA | P | N | Y | Y | P |
| 43 | `run_play_test` | Studio row 43 | `ST` | N | NA | NA | P | N | Y | Y | P |
| 44 | `stop_play_test` | Studio row 44 | `ST` | N | NA | NA | P | N | Y | Y | P |
| 45 | `collect_diagnostics` | Studio row 45 | `ST` | N | Y | P | P | P | P | Y | P |
| 46 | `collect_output` | Studio row 46 | `ST` | N | Y | P | P | P | P | Y | P |
| 47 | `create_snapshot` | Studio row 47 | `ST` | Y | P | P | P | N | P | P | P |
| 48 | `restore_snapshot` | Studio row 48 | `ST` | Y | N | P | P | P | P | N | P |
| 49 | `undo_last_batch` | Studio row 49 | `ST` | Y | N | N | P | N | P | N | P |

#### Agent/runtime capabilities (10)

| # | Capability | Purpose/implementation source | Profile | Side effect | Idempotent | Verified | Model | Accurate | Typed errors | Retry safe | Tests |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Conversational Ask with streaming | Agent inventory row | `CHAT` | N | P | N | Y | P | P | P | P |
| 2 | Legacy artifact generation | Agent inventory row | `RUN` | P | P | N | Y | N | P | P | P |
| 3 | Legacy Studio apply run | Agent inventory row | `RUN` | Y | P | N | P | P | P | N | P |
| 4 | Iterative Studio agent | Agent inventory row | `STAG` | Y | P | P | Y | P | P | P | P |
| 5 | Workflow planning | Agent inventory row | `PLAN` | N | P | N | Y | N | P | Y | P |
| 6 | Studio dynamic tool filtering | Agent inventory row | `STAG` | N | Y | N | Y | N | P | Y | P |
| 7 | Canonical task/event/checkpoint ledger | Agent inventory row | `FUTURE` | NA | NA | NA | N | Y | N | NA | N |
| 8 | Durable executor reconciliation/sweeper | Agent inventory row | `FUTURE` | NA | NA | NA | N | P | N | NA | N |
| 9 | Goal-specific verifier/acceptance proof | Agent inventory row | `PARTIAL` | N | Y | P | P | P | P | Y | P |
| 10 | AI billing and entitlement gate | Agent inventory row | `ENTITLEMENT` | N | P | P | N | P | Y | P | Y |

#### Asset capabilities (15)

| # | Capability | Purpose/implementation source | Profile | Side effect | Idempotent | Verified | Model | Accurate | Typed errors | Retry safe | Tests |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Image generation/provider selection | Asset inventory row | `ASSET-GEN` | Y | P | P | N | P | P | P | P |
| 2 | Background removal | Asset inventory row | `ASSET-GEN` | Y | P | N | N | N | P | P | P |
| 3 | Project/chat generated assets and attachments | Asset inventory row | `ASSET-ONTOLOGY` | N | P | P | P | P | P | P | P |
| 4 | Ontology master assets, generations, project refs | Asset inventory row | `ASSET-ONTOLOGY` | N | P | P | N | P | P | P | P |
| 5 | Approval/review/promotion | Asset inventory row | `ASSET-ONTOLOGY` | N | P | N | N | N | P | P | P |
| 6 | Image/decal upload to Roblox | Asset inventory row | `ASSET-UPLOAD` | Y | P | P | N | P | P | N | P |
| 7 | Model upload to Roblox | Asset inventory row | `ASSET-UPLOAD` | Y | P | P | N | P | P | N | P |
| 8 | Upload retry/poll | Asset inventory row | `ASSET-UPLOAD` | Y | N | N | N | N | P | N | P |
| 9 | Trusted Studio insertion of Creator Store/uploaded model | Asset inventory row | `ASSET-STUDIO` | Y | P | P | P | P | Y | P | P |
| 10 | `AssetAgentToolService` generation/approval/upload/attach/promote/usage/packs | Asset inventory row | `ASSET-TOOLS` | P | P | P | N | P | P | P | P |
| 11 | Canonical private asset aggregate and version graph | Asset inventory row | `FUTURE` | NA | NA | NA | N | Y | N | NA | N |
| 12 | Badge creation | Asset inventory row | `FUTURE` | NA | NA | NA | N | Y | N | NA | N |
| 13 | Game-pass creation | Asset inventory row | `FUTURE` | NA | NA | NA | N | Y | N | NA | N |
| 14 | Developer-product creation | Asset inventory row | `FUTURE` | NA | NA | NA | N | Y | N | NA | N |
| 15 | Robux pricing update | Asset inventory row | `FUTURE` | NA | NA | NA | N | Y | N | NA | N |

#### OAuth and Roblox Open Cloud capabilities (13)

| # | Capability | Purpose/implementation source | Profile | Side effect | Idempotent | Verified | Model | Accurate | Typed errors | Retry safe | Tests |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | OAuth connect/callback/status/disconnect | OAuth inventory row | `OAUTH` | Y | P | P | N | P | P | P | P |
| 2 | Encrypted token storage | OAuth inventory row | `OAUTH` | N | P | Y | N | P | Y | P | P |
| 3 | Get connection/resources | OAuth inventory row | `ROBLOX-READ` | N | Y | P | P | P | P | Y | P |
| 4 | Set target creator / ensure capability | OAuth inventory row | `REGISTRY` | N | P | P | N | P | P | P | P |
| 5 | Upload asset | OAuth inventory row | `ROBLOX-WRITE` | Y | P | P | N | P | P | N | P |
| 6 | Get asset / versions | OAuth inventory row | `ROBLOX-READ` | N | Y | P | N | P | P | Y | P |
| 7 | Quota | OAuth inventory row | `REGISTRY` | N | Y | N | N | N | P | Y | P |
| 8 | Creator Store search | OAuth inventory row | `REGISTRY` | N | Y | P | N | P | P | Y | P |
| 9 | `RobloxAgentToolService` operations | OAuth inventory row | `ASSET-TOOLS` | P | P | P | N | P | P | P | P |
| 10 | Universe metadata update | OAuth inventory row | `FUTURE` | NA | NA | NA | N | Y | N | NA | N |
| 11 | Messaging/restart servers/user restriction | OAuth inventory row | `FUTURE` | NA | NA | NA | N | Y | N | NA | N |
| 12 | Group read/membership management | OAuth inventory row | `FUTURE` | NA | NA | NA | N | Y | N | NA | N |
| 13 | Universe-secret management | OAuth inventory row | `FUTURE` | NA | NA | NA | N | Y | N | NA | N |

## Authentication, tenant, and security matrix

| Surface/data | Current authentication/control | Tenant/resource authorization | Finding |
| --- | --- | --- | --- |
| Main API routes | Firebase auth and verified-email middleware mounted at **backend/server.js:155-187** | Route/service-specific | **Confirmed:** no universal task/project/owner policy layer; failures before task creation leave no durable event |
| Artifact generation | Auth, entitlement, route normalization/idempotency | User-scoped job creation, branch-specific project context | **Confirmed:** non-atomic idempotency and incomplete canonical project identity |
| Studio web pairing/queue | Firebase auth, verified email, rate limiting at **backend/src/routes/studio.js:408-424,1384-1425** | User/session checks | **Confirmed:** useful boundary; command lacks stable tenant/project/universe/place and delivery fencing |
| Studio plugin fetch/ack | Hashed bearer token/session verification at **backend/src/services/StudioBridgeService.js:428-498,575-593** | Bound to user/session | **Confirmed:** token stored in plugin settings; ack schema/rate limiting weaker than MCP; no signed command envelope |
| Studio MCP | Connector verification and read/mutation limiters at **backend/src/routes/studio.js:1669-1688** | Connector/session capability | **Confirmed:** transport supports actions plugin cannot; snapshot must be transport-specific |
| OAuth token record | Per-user Firestore path, AES-GCM | User-scoped token store | **Confirmed:** no key version/rotation; nonce not validated; process-local refresh dedupe |
| OAuth resources/target creator | Capability/scope/resource records | Service validates selected creator in some paths | **Confirmed:** agent snapshot omits complete resource/target/policy evidence; stale writes possible unless refreshed |
| Project/chat assets | Per-user/project paths in `ProjectAssetService` | User/chat filters | **Confirmed:** does not unify global ontology and project state identity |
| Global ontology catalog review | Authenticated verified-user route | No reviewer/admin check found | **P0 Confirmed:** any authenticated verified user can approve/reject global promotions |
| Asset usage summary | Authenticated route | No owner filter found | **P0 Confirmed:** cross-tenant aggregate disclosure |
| Style profiles | Global collection/IDs | Arbitrary profile read lacks owner check | **Confirmed:** cross-tenant collision/read risk |
| Generation approval | Authenticated route/service | Generation owner/project association not proved | **Confirmed:** caller can supply generation ID without adequate domain authorization |
| Generated object storage | Firebase Storage public URL | URL possession | **Confirmed:** private/provenance lifecycle cannot be guaranteed by metadata alone |
| Security/rate-limit store | Redis-backed production fail-closed behavior | Process/service-dependent | **Confirmed:** reconnect is disabled and swallowed errors can convert dependency loss into inconsistent availability; behavior needs explicit SLO/runbook |

### Exact 24-case security review

The status is limited to checked-in source. **Unknown** means the repository cannot prove deployed configuration, IAM, logs, rules, or runtime behavior; it is not a clean bill of health.

| # | Exact check | Current status | Evidence | Severity | Required remediation |
| ---: | --- | --- | --- | --- | --- |
| 1 | OAuth token exposure | **Mitigated in source; deployment Unknown.** Token fields are encrypted at rest, redacted before logging/serialization, and absent from the status response. Access tokens still exist transiently in server memory; production log sinks and memory controls were not available. | **backend/src/services/RobloxTokenStore.js:15-27,78-101**; **backend/src/services/RobloxOAuthService.js:461-574** | High if exposed | Preserve server-only token handling; add secret-taint/redaction tests, access-log review, short cache TTLs, and production log/memory controls. |
| 2 | token storage weaknesses | **Confirmed.** Per-user AES-GCM records have payload versioning but no key identifier, rotation state, or dual-decrypt migration. The configured secret is hashed directly into one key. | **backend/src/services/RobloxTokenStore.js:4-13,35-75,113-128** | High | Use a managed KMS/envelope key, persist key version, rotate with audited re-encryption, and fail closed on unknown versions. |
| 3 | missing encryption | **Not confirmed in source; deployment Unknown.** AES-256-GCM protects stored OAuth secrets, but repository evidence cannot prove the production key exists, is isolated, or is rotated. | **backend/src/services/RobloxTokenStore.js:4-13,39-75** | High if misconfigured | Add startup/config attestation, KMS-backed keys, rotation tests, and an inventory proving all live token documents are encrypted. |
| 4 | insecure redirects | **Source-mitigated; deployment Unknown.** OAuth return paths are constrained to local paths; callback outcomes redirect through configured frontend origin. Error codes/messages enter the query string, so production origin and log/referrer handling still need proof. | **backend/src/routes/roblox.js:67-75,355-425** | Medium | Allowlist exact frontend origins and return routes, return opaque error codes, set strict referrer policy, and test hostile return-path inputs in the deployed proxy topology. |
| 5 | insufficient state or nonce validation | **Confirmed partial defect.** State is one-time transactionally consumed and PKCE is used, but a nonce is generated and stored without a located callback comparison. | **backend/src/services/RobloxOAuthService.js:169-240,290-323,383-458** | High | Validate the returned identity nonce when the provider flow supplies it, bind issuer/client/redirect, and add replay/mismatch tests. |
| 6 | cross-user project access | **Partially mitigated; confirmed exceptions.** Chat/project asset paths are nested under authenticated `uid`, but global ontology and catalog surfaces do not consistently carry or enforce owner identity. | **backend/src/services/ProjectAssetService.js:190-215**; **backend/src/services/AssetOntologyService.js:489-520,928-1013** | Critical | Centralize owner/project authorization, remove ownerless global writes, and test every read/write with two users and two organizations. |
| 7 | cross-project asset access | **Confirmed gap.** Project-local references exist, but approval accepts a browser-supplied generation ID without proving the generation belongs to that user and project; reuse/binding paths span global collections. | **backend/src/services/AssetOntologyService.js:1171-1195,1237-1319** | Critical | Resolve generation and asset server-side through an owner-scoped project binding; reject mismatched project, owner, universe, or organization. |
| 8 | insecure direct object references | **Confirmed P0.** Promotion review has no reviewer/admin authority check, and global asset-usage summary has no owner filter. | **backend/src/routes/uiBuilder.js:2106-2120**; **backend/src/services/AssetOntologyService.js:928-1013** | Critical | Require explicit reviewer roles and tenant-scoped queries; use opaque owner-bound IDs and add negative IDOR tests for every identifier route. |
| 9 | missing universe ownership validation | **Partial/confirmed gap.** OAuth resources and selected creator checks exist on some calls, but task, project, asset, and Studio command identity do not universally bind a freshly verified owner, universe, and place. | **backend/src/services/RobloxOAuthService.js:536-574**; **backend/src/services/AssetOntologyService.js:1237-1319** | Critical | Create a short-lived server-signed capability snapshot and require its owner, universe, place, scopes, and version on every Roblox write. |
| 10 | pairing-code guessing | **Confirmed exposure.** Codes are six characters with a ten-minute TTL; the pair-start route is limited, but the plugin claim route has no located claim-specific limiter. | **backend/src/services/StudioBridgeService.js:67-108**; **backend/src/routes/studio.js:408-435** | High | Add per-IP/code/account attempt limits, exponential backoff, one-time proof binding, alerting, and a longer high-entropy code or device flow. |
| 11 | pairing-code reuse | **Mitigated in source.** Claim is transactional and rejects expired or already-used records before marking the code used. Production contention behavior remains to be exercised. | **backend/src/services/StudioBridgeService.js:428-498** | Medium | Keep transactional consumption, delete/TTL used codes, bind the resulting session/device, and add concurrent-claim and replay tests. |
| 12 | command replay | **Confirmed partial defect.** Session-bound deterministic IDs exist only when an idempotency key is supplied; delivery has no durable executor operation ledger, lease fence, or universal replay outcome. | **backend/src/services/StudioBridgeService.js:96-98,943-1031** | Critical | Require deterministic operation IDs for every mutation, fence claims/attempts, persist receipts, and reconcile unknown outcomes before retry. |
| 13 | command tampering | **Partially mitigated.** Hashed bearer tokens, session checks, protocol sanitizers, and server-owned queue records constrain input, but there is no versioned signed command envelope binding task, operation, capability snapshot, and input hash. | **backend/src/services/StudioBridgeService.js:575-593**; **backend/src/lib/studioToolProtocol.js:593-939** | High | Sign/version the canonical envelope, verify hashes and session capability at execution, reject stale/future envelopes, and audit the immutable payload checksum. |
| 14 | unrestricted Studio actions | **Partially mitigated; confirmed gaps.** A whitelist, payload sanitizers, and destructive confirmation exist, but expected source hashes are optional and broad/batch actions lack one enforced least-privilege capability policy. | **backend/src/lib/studioToolProtocol.js:136-144,593-939** | Critical | Derive a per-session allowlist, require expected hashes on known-file writes, snapshot destructive targets, limit paths/classes/properties, and verify postconditions. |
| 15 | entitlement bypass | **No direct bypass confirmed; enforcement is fragmented.** AI routes use auth, verified-email/rate-limit middleware, plan gates, and free-use reservation, but policy is duplicated across route and worker paths rather than one immutable authorization decision. | **backend/src/routes/ai.js:319-332,596-605,748-755,1301-1305** | High | Centralize entitlement authorization, snapshot the decision/version on the task, enforce again at execution, and add route/worker downgrade and replay tests. |
| 16 | rate-limit bypass | **Confirmed inconsistency.** Pair start and command queue are limited; plugin fetch/ack and pair claim do not have the same explicit limiter as MCP acknowledgement. | **backend/src/routes/studio.js:408-435,1384-1425,1669-1688,2087-2088** | High | Apply endpoint- and identity-specific distributed limits to every claim/fetch/ack path, with fail-closed production dependency behavior and abuse telemetry. |
| 17 | prompt injection from project files | **Confirmed gap.** Manifest/source/tool results are placed into the agent context and prompt with no located untrusted-content boundary, instruction-neutralization contract, or policy decision record. | **backend/src/services/StudioAgentService.js:1691-1770** | Critical | Mark project content as untrusted data, isolate it structurally, restrict tools independently of model text, detect injection indicators, and require confirmation for privilege expansion. |
| 18 | malicious generated code | **Partially mitigated; residual risk confirmed.** Protocol sanitization and destructive confirmation limit transports, but generated runnable Luau can still be written/executed without a universal static, semantic, and goal-specific verification gate. | **backend/src/lib/studioToolProtocol.js:593-939**; **backend/src/services/StudioAgentService.js:1732-1760** | Critical | Add static policy scans, dependency/source provenance checks, sandboxed validation where possible, explicit write/run approvals, and persisted acceptance evidence. |
| 19 | server secrets exposed to frontend | **No source exposure located; deployment Unknown.** Located OAuth status serialization omits tokens and token-store serialization redacts secrets. Repository scanning cannot prove built artifacts, runtime configuration, source maps, or log sinks. | **backend/src/services/RobloxTokenStore.js:15-27,78-101**; **backend/src/services/RobloxOAuthService.js:536-574** | Critical if exposed | Add build-time secret scanning, response-schema allowlists, environment separation, source-map controls, and deployed artifact/log verification. |
| 20 | unsafe asset URLs | **Confirmed.** Generated PNGs are uploaded as public objects with year-long public caching and permanent provider-style URLs; metadata cannot enforce tenant visibility or revocation. | **backend/src/services/AssetPipelineService.js:83-97** | High | Store private immutable objects, serve short-lived signed URLs through owner authorization, validate content/type/hash, and implement revocation/retention. |
| 21 | webhook or callback validation weaknesses | **Partial.** Stripe webhook source verifies signatures and records replay state; Roblox OAuth uses one-time state and PKCE, but nonce validation is not located and deployed callback/proxy behavior is Unknown. | **backend/src/routes/stripeWebhook.js:326-393**; **backend/src/services/RobloxOAuthService.js:290-323,383-458** | High | Retain raw-body signature checks and replay reservation; complete OAuth nonce/issuer binding and add deployed callback, duplicate, malformed, and timeout tests. |
| 22 | insufficient Firebase rules | **Source-mitigated; deployment Unknown.** Owner checks and catch-all deny exist; direct Storage client access is denied and emulator tests cover that boundary. The active deployed rules/version were not available. | **firestore.rules:345-410,535-547**; **storage.rules:1-8**; **backend/src/firestore.rules.firestore.test.js:238-248** | Critical if stale | Make rules/index deployment versioned and attested, run emulator authorization suites in CI, and compare deployed hashes before release. |
| 23 | overly broad database permissions | **Unknown for deployed IAM; browser rules are narrow.** Firestore/Storage client rules default deny, but server Admin SDK identity, cloud IAM roles, service-account scope, and production operator access are not represented in the repository. | **firestore.rules:545-547**; **storage.rules:1-8** | Critical if broad | Inventory IAM/service accounts, separate runtime/migration identities, grant collection/object-prefix least privilege, rotate credentials, and audit access. |
| 24 | missing audit logs | **Confirmed gap.** OAuth audit writes are best effort and failures are swallowed; process handlers emit generic console errors, and no immutable end-to-end task/operation/command/security audit ledger was found. | **backend/src/services/RobloxOAuthService.js:160-166**; **backend/server.js:68-74** | High | Write security and side-effect decisions to a durable append-only ledger/outbox, alert on audit-write failure, redact secrets, and define retention/export ownership. |

## Observability, deployment, and recovery findings

| Concern | Evidence status | Current evidence | Required production proof |
| --- | --- | --- | --- |
| API liveness/readiness | Confirmed gap | Static `/health` success at **backend/server.js:97-108** | Firestore, Redis, Storage, provider config, worker and queue readiness separated from liveness |
| Worker topology | Unknown | In-process worker opt-in at **backend/server.js:241-255** | Deployment manifest, replica count, leases, heartbeat, queue lag, shutdown behavior |
| Correlation/tracing | Confirmed gap | IDs exist per job/run/command/provider but no enforced end-to-end correlation chain | Request/task/attempt/operation/command/provider/user-projection IDs on logs, events, traces |
| Durable progress | Confirmed gap | Only selected job events persisted; detailed stream can expire | Ordered append-only task events and checkpoint replay |
| Studio delivery recovery | Confirmed gap | No delivered lease/redelivery/expiry enforcement | Lease age, attempts, deadline, fenced reclaim, dead-letter/reconcile dashboards |
| Ack projection recovery | Confirmed gap | Terminal command write precedes best-effort projections | Transactional outbox plus lag/error metric and duplicate replay |
| OAuth refresh operations | Strong inference gap | Cache/deduplication process-local | Distributed lease/CAS, contention telemetry, rotation failure recovery |
| Roblox async operations | Confirmed gap | Service-specific polling/receipts | Operation age, provider ID, reconcile state, quota/moderation metrics, lost-response recovery |
| Asset provenance/moderation | Confirmed gap | State split, public URLs, loose moderation success | Canonical state transitions, owner/project/creator labels, moderation-age alerts |
| Plugin adoption | Unknown | Expected version/build encoded at **backend/src/lib/studioToolProtocol.js:7-9** | Live connected version/build distribution and unsupported-capability mismatch alert |
| Error termination/restart | Confirmed/Unknown | Process handlers log at **backend/server.js:68-74**; deployed supervisor unknown | Controlled drain/exit, restart policy, checkpoint takeover, crash-loop alert |
| Reconciliation schedule | Unknown | No universal task/operation/command sweeper located | Scheduler ownership, interval, cursor, lease, replay safety, alerting |

## Current test evidence and missing gates

### Confirmed reusable tests

- Protocol membership, mutating/destructive classifications, payload sanitization, TestService/play-test restrictions, and batch validation: **backend/src/lib/studioToolProtocol.test.js:15-43,300-316,340-351**.
- Generated plugin action-set/build contract: **backend/src/lib/studioPluginBuildContract.test.js:72-75**.
- Plugin/backend compatibility and handler presence: **backend/src/lib/studioPluginCompatibility.test.js:37-123**.
- MCP action advertisement/dispatch: **backend/src/services/studioTransport/McpLocalAdapter.test.js:79-104** and **backend/src/services/StudioToolRouter.test.js:10-31**.
- Studio manifest page/checksum/conflict code and service tests provide a strong basis for snapshot integrity, though not live freshness.
- Asset/Roblox wrapper unit tests prove callable service APIs, not production model registration or external exactly-once behavior.

### Required gates not proved by the repository

1. Concurrent same-key request reserves exactly one task and rejects mismatched payload hashes.
2. Worker termination at every lifecycle boundary resumes without duplicate provider/Studio effects.
3. Plugin termination after claim causes fenced redelivery or explicit expiry, not an indefinite delivered command.
4. Lost acknowledgement response and duplicate acknowledgement converge command, task, manifest, receipt, and validation projections.
5. Every supported Studio mutation returns strict result/verification data; nil/unknown status cannot become success.
6. Each of the four unsupported plugin actions is absent from plugin attestation while remaining available only on a capable transport.
7. Stale manifest/script hashes block or replan conflicting writes, and success includes targeted live readback.
8. Browser close/reopen enumerates and resumes all active tasks independently of chat-local pending messages.
9. Cross-tenant catalog review, usage, profile, generation approval, asset, operation, and project access all fail closed.
10. OAuth rotating-refresh races across replicas produce one valid token update and no disconnect/data loss.
11. Asset-provider lost responses reconcile by operation ID without duplicate Roblox assets.
12. Moderation pending/unknown never becomes verified usable success and is resumed after deploy.
13. Public/private object policy, provenance, content type, size, malware/content checks, and deletion retention are tested.
14. Static health cannot report ready while the required worker or a critical dependency is unavailable.
15. Goal-specific acceptance distinguishes artifact generated, effect executed, effect verified, and user goal resolved.

## Unknowns that require external or deployed verification

- Exact production topology, active feature flags, worker replica count, scheduled jobs, Redis persistence, and supervisor behavior.
- Whether the generated **roblox-plugin/NexusRBXStudioBridge.plugin.lua** currently installed by users matches the expected build and source handler semantics.
- Current Roblox OAuth beta behavior, exact scopes/resource selectors, async-operation guarantees, idempotency support, quotas, moderation behavior, and availability of badge/game-pass/developer-product/pricing APIs.
- Provider contracts, retry headers, billing behavior, content-policy handling, and request/operation IDs for every configured image/model provider.
- Firebase/Storage security rules, bucket lifecycle/CORS, URL revocation, Firestore indexes, backup/restore, retention, and regional deployment behavior not represented by application code.
- Actual incidence of false terminal success, stranded delivered commands, duplicate uploads, cross-tenant endpoint use, refresh-token races, and stale-manifest conflicts; telemetry needed to quantify them is not currently proved.

## Readiness boundary

The repository has enough reusable protocol, OAuth, manifest, upload, transport, and agent components to freeze shared contracts and build compatibility adapters. It does **not** yet prove safe full Prompt 2 production rollout or a reliable Prompt 3 autonomous runtime. Before either claims production readiness, the P0 tenant controls, canonical task/operation ledger, strict Studio delivery/acknowledgement model, transport-accurate capability snapshots, canonical asset lifecycle, and goal-specific verification gates in this document must be implemented and demonstrated by the missing tests above.
