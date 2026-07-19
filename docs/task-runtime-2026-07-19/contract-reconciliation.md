# Contract reconciliation and required deviations

Date: 2026-07-19

This document was written before Prompt 3 implementation changes. It reconciles
the approved Prompt 1 architecture, the Prompt 2 handoff, and the repository as
it exists on 2026-07-19. A deviation listed here is a compatibility choice, not
a replacement contract.

## Sources reviewed

Prompt 1:

- `docs/architecture-audit-2026-07-18/README.md`
- `acceptance-tests-and-risks.md`
- `current-architecture-and-lifecycle.md`
- `findings-and-capabilities.md`
- `migration-and-ownership.md`
- `target-architecture-and-contracts.md`

Prompt 2:

- `docs/asset-platform-2026-07-18/README.md`
- `architecture-and-contracts.md`
- `generation-style-and-quality.md`
- `lifecycles-search-and-sharing.md`
- `prompt-2-handoff.md`
- `roblox-resources-and-studio.md`
- `rollout-security-and-validation.md`

The Prompt 3 request, both git worktrees, current runtime routes/services,
frontend recovery code, Firestore rules/indexes, Studio transport/protocol,
generated plugin path, and Prompt 2 services were also inspected.

## Canonical contracts retained

The following Prompt 1 vocabularies are authoritative even where the Prompt 3
request uses shorter or differently named examples:

- Task: `accepted`, `planning`, `running`, `waiting_user`, `blocked_studio`,
  `waiting_external`, `retry_scheduled`, `verifying`, `compensating`,
  `succeeded`, `failed`, `cancelled`.
- Step: `pending`, `ready`, `running`, `waiting`, `verifying`, `succeeded`,
  `failed`, `cancelled`, `skipped`.
- External operation: `reserved`, `executing`, `outcome_unknown`, `succeeded`,
  `failed_retryable`, `failed_terminal`.
- Studio command: `created`, `queued`, `leased`, `accepted`, `executing`,
  `acknowledged`, `verifying`, `succeeded`, `failed`, `reconcile_required`,
  `expired`, `cancelled`.

User-facing labels such as paused, reconnecting, awaiting confirmation, or
retrying are projections derived from canonical status plus typed reason codes;
they are not new durable states.

The task event ledger is append-only and transactionally sequenced. Task and
step documents are projections. A checkpoint is a recovery optimization, not
an alternative source of truth. Every side effect must first obtain a durable
operation reservation; an ambiguous result remains `outcome_unknown` until
reconciliation proves whether a retry is safe. Task success requires the
acceptance policy and goal-specific verification evidence to pass.

## Existing owners that will be extended

| Concern | Existing owner retained | Prompt 3 extension |
| --- | --- | --- |
| Runtime cutover | `artifactRunLauncher`, `JobService`, existing job worker | One immutable runtime-owner decision; canonical task facade and legacy projection adapter |
| Studio tools | `studioToolProtocol`, `StudioToolRouter` | Envelope/lifecycle validators, mandatory operation identity, staged receipts |
| Studio persistence | `StudioBridgeService` and `_studioCommands` | Delivery leases, fencing, redelivery, input-hash replay checks, verification state |
| Manifest | `StudioManifestService`, `StudioProjectContextService` | Baseline/current/desired conflict checks, live freshness requirements, conflict records |
| Capabilities | `RobloxCapabilityRegistry` plus Studio session attestation | Server-computed task capability snapshot; execution-time recheck |
| Assets | Prompt 2 canonical asset services and `AssetAgentToolService` | Typed task adapters only; no new asset schema or provider meaning |
| Conversational execution | `/generate/artifact`, `/ai/orchestrate`, existing run actions | Compatibility responses backed by one task ID when enabled |
| Frontend progress | `useAiChat`, `useUnifiedChat`, existing progress components | Server task projection/event cursor becomes authoritative when enabled |

Firestore remains the durable authority. Redis and SSE remain transient delivery
optimizations. The generated `roblox-plugin/NexusRBXStudioBridge.plugin.lua`
remains the only install target for plugin changes.

## Confirmed drift

1. `_jobs`, `_agentRuns`, `_studioAgentRuns`, `_studioCommands`, browser chat
   messages, and Redis streams can each appear authoritative. No canonical task
   ledger, checkpoint, amendment, or user-wide active-task query exists.
2. Artifact request idempotency is read then written around launch and is not an
   atomic reservation. Prompt 2's `AssetOperationService` has strong lease and
   ambiguous-outcome primitives but stores user-scoped operations rather than
   Prompt 1's shared operation authority.
3. Studio commands currently move from queued to delivered without a delivery
   lease, then directly to succeeded or failed on ACK. They lack received/start,
   fenced redelivery, and a distinct verification phase.
4. A duplicate Studio command key reuses an existing document without first
   comparing a semantic input hash. A key collision can therefore hide changed
   intent.
5. Known-script source writes do not universally require
   `expectedSourceHash`; destructive confirmation and snapshot requirements are
   not enforced at every dispatch point; an invalid apply mode can fall back to
   an unrestricted mode.
6. Persisted manifest freshness is not proof of live Studio state. Existing
   manifest identity is session/place/revision based and is not yet bound to one
   canonical project/universe/place identity for task authorization.
7. The workflow route owns a separate plan record and system prompt. Its
   approval is not durably bound to an executing run, plan version, or amendment.
8. `useAiChat` restores only a pending message in the active conversation;
   `useUnifiedChat` has no task cursor replay. Transcript fields are writable by
   their authenticated owner and cannot authorize execution or completion.
9. `activeMode` and `chatMode` already have different meanings across hooks.
   Prompt 3's plan visibility must use a new `planningEnabled` value rather than
   overload either one.
10. Prompt 2 canonical reads are mounted but writes, provider dispatch, Roblox
    calls, moderation reconciliation, exact Studio application, and agent-tool
    composition are intentionally unwired. Prompt 2 migrations have not been
    applied to production or parity-verified.
11. Prompt 2's game-pass create client currently has an unsafe unresolved price
    policy; it must remain unavailable. Badge/game-pass support is mocked and
    default-off, and experience-artwork execution does not exist.

## Required compatibility deviations

### D1. Additive facade before executor replacement

Prompt 1 describes a canonical task executor. Replacing both active run systems
atomically would be an uncontrolled rewrite. Prompt 3 will first persist the
canonical task/operation truth and adapt existing runs behind one deterministic
`runtimeOwner` and `runtimeVersion` chosen at acceptance. A task is executed by
exactly one owner; dual projection must never mean dual execution.

### D2. One shared operation authority with Prompt 2 adapter

The shared `_operations` ledger is the uniqueness authority. Prompt 2's
`AssetOperationService` API will be preserved through an adapter or observe-mode
projection while flags are off. Existing asset operation records will not be
silently re-keyed, replayed, or treated as proof that a remote side effect ran.

### D3. Extend the current Studio collection and protocol

Envelope v2 fields and staged lifecycle are added to `_studioCommands` and the
existing protocol rather than placed in a parallel command queue. Legacy plugin
poll/ACK behavior remains supported through explicit version negotiation. V2
dispatch stays disabled until backend, generated plugin artifact, and readback
verification pass together.

### D4. Reuse the current worker loop

Prompt 3 recovery and task claims integrate with the existing job worker startup
owner. No second polling executor is introduced. Lease owner, token/fence,
heartbeat, bounded retry, and stale-claim recovery must be deterministic.

### D5. Preserve response and transcript compatibility

Existing job/run IDs and message projections remain during rollout, but they are
derived references once a canonical task owns the request. Chat deletion or SSE
disconnect must not delete, cancel, or fail the task. Browser-provided target,
ownership, status, or verification fields remain non-authoritative.

### D6. Keep Ask conversational until it requests execution

Pure read-only conversation does not need a long-running task. As soon as the
intent requires planning approval, side effects, waiting, retries, or durable
recovery, the same canonical task service must accept it; `/ai/orchestrate`
cannot become a third task authority.

### D7. External writes remain gated

The implementation can prove contracts with fake adapters and local tests, but
does not enable Prompt 2 writes or Studio envelope v2 by default. Live provider,
Roblox, OAuth-scope, moderation, spend, and Studio mutation evidence are separate
release gates. A disabled consent switch, unavailable capability, stale binding,
or missing verifier always fails closed.

## Implementation order

1. Freeze validators, transitions, error/evidence types, retry policies, and
   feature-flag decisions.
2. Add task/event/step/attempt/checkpoint/amendment and shared-operation
   repositories with transactional tests.
3. Add the compatibility facade and observe/shadow modes without changing the
   default executor.
4. Add dynamic capability/context snapshots and one authoritative agent prompt
   assembler.
5. Extend Studio dispatch with hash-checked idempotency, leases, receipts,
   verification, manifest conflict records, and recovery.
6. Adapt routes and frontend projections, including independent planning mode,
   versioned amendment, reconnect, cancel, and server-authorized retry.
7. Run migration dry-runs, cross-layer interruption/security/evaluation suites,
   then controlled provider/Roblox/Studio staging before any production cutover.

## Production statement at reconciliation time

The current repository is not production-ready for Prompt 3 external side
effects. Local tests from Prompt 2 demonstrate a safe scaffold only. Production
enablement requires concurrency and rules-emulator evidence, generated-plugin
verification, controlled live Roblox/provider checks, operational monitoring,
and rollback rehearsal.
