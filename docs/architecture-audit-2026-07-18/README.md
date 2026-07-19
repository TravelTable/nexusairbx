# NexusRBX architecture and reliability audit

Date: 2026-07-18  
Scope: repository-wide, documentation-only audit before the asset-platform and autonomous-runtime rebuilds

## Evidence convention

- **Confirmed** means the behavior is directly implemented or encoded by a test in this repository.
- **Strong inference** means multiple implementation facts support the conclusion, but the runtime condition was not reproduced end to end.
- **Unknown** means the repository does not contain enough evidence; it must be verified externally or in a deployed environment.

Line numbers are included where they identify a narrow defect. Symbol names are used where a file is large and likely to move.

## Executive conclusion

NexusRBX has substantial reusable foundations, but it does not currently have one reliable task system. The AI workspace presents one experience while routing work through conversational chat, legacy artifact generation, or an iterative Studio agent with different context, persistence, retry, and completion rules. This split is confirmed in **src/hooks/useUnifiedChat.js:440-566** and **backend/src/services/artifactRunLauncher.js:95-246**.

The most serious lifecycle defect is a false terminal success. The legacy worker marks a job succeeded and publishes done before a background Studio apply is acknowledged in **backend/src/workers/generateArtifactWorker.js:1424-1463**. Later success or failure is sent to **AgentRunService.handleCommandAck**, but **JobService.updateJob** ignores all updates once the job is terminal in **backend/src/services/JobService.js:283-327**. A generated artifact can therefore be presented as a resolved user goal even though Studio never applied it.

The asset subsystem also has immediate security and integrity blockers:

- Any authenticated, verified user can review global catalog promotions because neither **backend/src/routes/uiBuilder.js:2106** nor **AssetOntologyService.reviewCatalogPromotion** at **backend/src/services/AssetOntologyService.js:928** checks reviewer authority.
- Any authenticated user can request aggregate usage across tenants because **AssetOntologyService.assetUsageSummary** at **backend/src/services/AssetOntologyService.js:996** does not filter by owner.
- A failed upload can be reused as success: **AssetOntologyService.uploadApprovedAssets** creates an uploading binding, leaves it unresolved on failure, and treats any later matching binding as successful at **backend/src/services/AssetOntologyService.js:1281-1288**.

These findings make the repository **not ready for full Prompt 2 production implementation**. It is ready for a contract-freeze and compatibility-scaffolding milestone. The shared task, operation-idempotency, tenant-ownership, capability-snapshot, asset-lifecycle, and verification contracts in this package must land first. Prompt 3 should own that shared runtime foundation; Prompt 2 can then build the asset domain and UI against it.

## Highest-risk confirmed root causes

| Priority | Root cause | Consequence | Evidence | Owner |
| --- | --- | --- | --- | --- |
| P0 | Generation success and user-goal completion are conflated | Studio can fail or never run after the UI receives done | **backend/src/workers/generateArtifactWorker.js:1424-1463**; **backend/src/services/JobService.js:94-119,283-327**; **backend/src/services/AgentRunService.js:460-520** | Prompt 3 |
| P0 | Asset review and usage endpoints lack tenant/admin authorization | Cross-tenant modification and data disclosure | **backend/src/routes/uiBuilder.js:2106-2115**; **backend/src/services/AssetOntologyService.js:928-1009** | Prompt 2, before exposure |
| P0 | Upload reuse does not validate binding state or Roblox ID | A failed upload can become permanent false success | **backend/src/services/AssetOntologyService.js:1281-1288** | Prompt 2 on Prompt 3 operation ledger |
| P1 | One UI routes to three incompatible execution models | Identity, tools, context, retries, and recovery vary by mode | **src/hooks/useUnifiedChat.js:440-566**; **backend/src/services/artifactRunLauncher.js:95-246** | Prompt 3 |
| P1 | Approved plans and rich job context are dropped before execution | Agent forgetfulness and generic behavior | **src/hooks/useUnifiedChat.js:298-341**; **backend/src/routes/workflow.js:372-389**; **backend/src/services/artifactRunLauncher.js:144-225**; **backend/src/services/StudioAgentService.js:1004-1162,1691-1819** | Prompt 3 |
| P1 | Idempotency reservation is read-then-write rather than atomic | Concurrent retries can create duplicate jobs or Roblox assets | **backend/src/routes/ai.js:812-878**; **backend/src/services/JobService.js:474-487**; **backend/src/services/RobloxOperationReceiptService.js:49-98** | Prompt 3 contract/runtime; Prompt 2 operation keys |
| P1 | Asset truth is split across three incompatible stores | Context omissions, lost IDs, migration ambiguity | **backend/src/lib/projectState.js:8**; **backend/src/services/ProjectAssetService.js:190-692**; **backend/src/services/AssetOntologyService.js:494-557** | Prompt 2 |
| P1 | Detailed progress is transient and recovery is chat-local | Browser/deploy interruption can lose actionable task state | **backend/src/services/JobService.js:14-43,343-375**; **src/hooks/useAiChat.js:561-1405** | Prompt 3 |

The detailed failure records, reproduction steps, corrections, and security findings are in [findings-and-capabilities.md](./findings-and-capabilities.md).

## What can be reused

- The versioned Studio tool validator, target-integrity rules, expected source hashes, destructive-operation safeguards, and structured acknowledgements in **backend/src/lib/studioToolProtocol.js**.
- The transport abstraction and capability filtering in **backend/src/services/StudioToolRouter.js** and **backend/src/services/StudioAgentService.js:119-290**.
- The iterative agent decision lease, persisted steps, manifest reads, bounded loop, and validation hooks in **backend/src/services/StudioAgentService.js:1004-2670**, after moving them behind the canonical task ledger.
- Firebase authentication and verified-user middleware mounted in **backend/server.js:155-187**.
- OAuth state, PKCE, encrypted token storage, and transactional state consumption in **backend/src/services/RobloxOAuthService.js:169-383** and **backend/src/services/RobloxTokenStore.js:35-107**.
- The current Roblox capability metadata as migration input in **backend/src/services/RobloxCapabilityRegistry.js**, not as the final universal registry.
- SSE reconnect and result polling behavior in **src/hooks/useAiChat.js**, after it consumes task projections instead of job-specific terminal semantics.
- Existing project manifests, snapshots, and asset pipelines as compatibility readers while canonical records are backfilled.

## What requires replacement or a compatibility facade

- Replace terminal job semantics with a task projection that distinguishes generated, delivered, executed, and verified.
- Replace the three frontend execution branches with one task-submission facade; retain specialized executors behind it.
- Replace non-atomic idempotency maps and query-based upload reuse with transactional operation reservations.
- Replace global and chat-local asset truth with one owner-scoped canonical asset aggregate and compatibility adapters.
- Replace hand-assembled/stale prompt tool knowledge with a server-generated capability snapshot.
- Replace fail-soft context loading with typed unavailable reasons and explicit blocked/degraded task states.
- Replace static health endpoints with dependency and worker readiness checks; **backend/server.js:97-108** currently returns static success.

This is an incremental migration, not a full rewrite. Existing routes and job records remain readable until shadow comparison and end-to-end gates pass.

## Recommended order

1. Immediately gate the vulnerable catalog review and cross-tenant usage endpoints; do not wait for the rebuild.
2. Freeze the contracts in [target-architecture-and-contracts.md](./target-architecture-and-contracts.md).
3. Prompt 3 adds the task/event/checkpoint/operation collections, transactional claims, typed errors, correlation IDs, and compatibility adapters.
4. Prompt 3 routes current artifact and Studio execution through the task facade in shadow mode, without removing legacy reads.
5. Prompt 2 backfills the canonical asset domain, private storage metadata, moderation states, and safe idempotent upload tools.
6. Prompt 3 adds dynamic context/capability loading, disconnect/resume, manifest conflict handling, and goal-specific verification.
7. Prompt 2 ships the icon-pack, badge, and game-pass experiences only for externally verified Roblox API operations.
8. Run the required unit, integration, 22 end-to-end, and deterministic agent-evaluation gates.
9. Make the task projection authoritative, retain dual-read compatibility for one release, then deprecate old execution paths.

The exact dependency graph, feature flags, ownership map, and rollback points are in [migration-and-ownership.md](./migration-and-ownership.md).

## Architecture package

- [current-architecture-and-lifecycle.md](./current-architecture-and-lifecycle.md) — repository map, sources of truth, request sequence, agent/OAuth/Studio/manifest/persistence analysis.
- [findings-and-capabilities.md](./findings-and-capabilities.md) — root-cause records, complete capability inventory, security and observability findings.
- [target-architecture-and-contracts.md](./target-architecture-and-contracts.md) — target architecture and concrete TypeScript-style shared schemas/state machines.
- [migration-and-ownership.md](./migration-and-ownership.md) — Firestore schema, indexes, backfill, rollback, Prompt 2/3 boundaries, flags, and merge order.
- [acceptance-tests-and-risks.md](./acceptance-tests-and-risks.md) — measurable acceptance criteria, current coverage, future tests/evals, risk register, unresolved questions.

## External Roblox API boundary

The repository proves image/decal and model upload implementations. It does not prove operational badge creation, game-pass creation, developer-product creation, or pricing updates. Current Roblox documentation describes OAuth as beta and asset creation as an asynchronous operation; implementation must revalidate exact scopes, endpoints, quotas, moderation behavior, and idempotency immediately before Prompt 2:

- [Roblox OAuth 2.0 reference](https://create.roblox.com/docs/cloud/auth/oauth2-reference)
- [Roblox Open Cloud scopes](https://create.roblox.com/docs/cloud/reference/scopes)
- [Roblox asset API](https://create.roblox.com/docs/cloud/reference/features/assets)
- [Roblox game-pass API](https://create.roblox.com/docs/cloud/reference/features/game-passes)
- [Roblox universe API](https://create.roblox.com/docs/cloud/reference/features/universes)
- [Roblox developer products](https://create.roblox.com/docs/production/monetization/developer-products)

## Readiness decision

**No for full Prompt 2 implementation. Yes for the shared-contract and migration-scaffolding prerequisite.**

Prompt 2 must not enable production auto-create/upload behavior until:

1. the P0 tenant authorization issues are fixed and regression-tested;
2. operation IDs are transactionally reserved and replay-safe;
3. an upload cannot be successful without a Roblox asset ID plus an explicit moderation state;
4. the canonical owner/project/universe asset identity is live;
5. the task runtime can pause, resume, and distinguish external submission from verified completion;
6. current official Roblox support for each badge/game-pass/product/pricing operation has been verified.
