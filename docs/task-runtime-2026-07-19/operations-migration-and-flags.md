# Migration, feature flags, rollback, and operations

Date: 2026-07-19

This runbook keeps the legacy and canonical runtimes observable during an
additive migration while guaranteeing that exactly one runtime owns external
side effects. “Dual” means mirrored records, never two executors.

## Durable storage map

The canonical runtime uses these namespaces:

| Namespace | Purpose | Write authority |
| --- | --- | --- |
| `_tasks` | task projection and immutable identity/binding | canonical repository |
| `_tasks/{taskId}/events` | append-only sequenced state changes | task transition transaction |
| `_tasks/{taskId}/steps` | current step projections | task transition transaction |
| `_tasks/{taskId}/steps/{stepId}/attempts` | immutable attempt history | canonical worker |
| `_tasks/{taskId}/checkpoints` | resumable snapshots tied to event sequence | canonical worker |
| `_tasks/{taskId}/amendments` | idempotent user amendments | canonical task API |
| `_taskReservations` | root request/idempotency reservations | task-creation transaction |
| `_operations` and operation attempts | unique external side-effect authority | operation ledger |
| `_studioCommands` | authoritative Studio envelope, lease, receipts, and verification | Studio bridge service |
| `_capabilitySnapshots` | hashed capability decision used for a task call | context/capability repository |
| `_taskOutbox` | durable dispatch intent, when enabled | canonical transition transaction |
| `_migrationControl` | redacted audit candidates, revisions, issues, and checkpoints | migration audit only |

The exact deployed indexes and Firestore rules are a release artifact. The
presence of source-controlled definitions is not proof that they were deployed
or that tenant isolation was validated.

## Existing migration audit

`backend/scripts/auditTaskRuntimeMigration.js` is intentionally not a task
backfill. It scans legacy `_jobs` records and produces a redacted, checksummed
review plan. Dry-run is the default and never writes `_jobs`, `_tasks`, provider
state, Roblox, or Studio. Apply mode writes only `_migrationControl` audit
records and checkpoints and requires both:

- `TASK_RUNTIME_MIGRATION_APPLY_ENABLED=true`; and
- `--confirm=task-runtime-v1-legacy-jobs-audit`.

The audit is cursor-based, bounded, restartable, and idempotent. It blocks
records with missing or ambiguous owner, tenant, project, chat, status,
capability/context pointers, terminal evidence, event history, or external
operation state. It never treats a legacy “completed” string as verified
canonical success and never resumes a possibly in-flight side effect.

Recommended sequence:

1. run the deterministic script tests and inspect `--help`;
2. dry-run one bounded page in a nonproduction project;
3. compare record count, classification distribution, checksum, cursor, and
   zero-write assertions;
4. approve the exact environment and enable only the migration-control
   interlock;
5. apply one page, rerun it, and confirm no duplicate candidate/revision;
6. inspect every blocker and reconcile external operations manually;
7. import canonical tasks only through a separately reviewed importer that
   preserves immutable identity and verified evidence; and
8. retain legacy records until parity, rollback, and retention gates pass.

No destructive legacy cleanup is authorized by this Prompt 3 migration.

## Implemented runtime flags and safe defaults

`backend/src/lib/runtimeFeatureFlags.js` parses the server flags below. Unknown
or malformed values fall back safely and emit diagnostics.

| Flag | Values / default | Meaning |
| --- | --- | --- |
| `TASK_RUNTIME_WRITE_MODE` | `legacy`, `dual`, `canonical`; default `legacy` | task record write mode and execution owner input |
| `TASK_RUNTIME_READ_MODE` | `legacy`, `compare`, `canonical`; default `legacy` | client/read projection source |
| `OPERATION_LEDGER_MODE` | `off`, `observe`, `enforce`; default `off` | external operation observation/enforcement |
| `CAPABILITY_SNAPSHOT_MODE` | `live`, `compare`, `snapshot`; default `live` | capability decision source/comparison |
| `ASSET_REGISTRY_WRITE_MODE` | `legacy`, `dual`, `canonical`; default `legacy` | Prompt 2 registry write migration |
| `ASSET_REGISTRY_READ_MODE` | `legacy`, `compare`, `canonical`; default `legacy` | Prompt 2 registry read migration |
| `TASK_CANONICAL_LEGACY_ADAPTER_ENABLED` | boolean; default `false` | allow the canonical owner to use exactly one legacy execution adapter |
| `TASK_OUTBOX_DISPATCH_ENABLED` | boolean; default `false` | allow canonical outbox dispatch |
| `STUDIO_COMMAND_ENVELOPE_V2_ENABLED` | boolean; default `false` | allow durable Studio envelope v2 |
| `STUDIO_COMMAND_LEASES_ENABLED` | boolean; default `false` | allow fenced Studio delivery leases |
| `PROJECT_RESOURCE_NAMESPACE_ENABLED` | boolean; default `false` | enable canonical project-resource namespace |
| `ASSET_PLATFORM_READS_ENABLED` | boolean; default `false` | expose canonical asset reads |
| `ASSET_PLATFORM_WRITES_ENABLED` | boolean; default `false` | permit canonical asset writes |
| `ASSET_PLATFORM_AGENT_TOOLS_ENABLED` | boolean; default `false` | expose Prompt 2 tools to the agent |
| `ASSET_PLATFORM_SEMANTIC_SEARCH_ENABLED` | boolean; default `false` | enable semantic asset retrieval |
| `ASSET_PLATFORM_UNIVERSE_SHARING_ENABLED` | boolean; default `false` | enable same-universe sharing policy |
| `ASSET_PLATFORM_USER_GLOBAL_ENABLED` | boolean; default `false` | enable user-global asset visibility |
| `ASSET_PLATFORM_ROBLOX_UPLOAD_ENABLED` | boolean; default `false` | permit Roblox asset/badge/pass writes |
| `ASSET_PLATFORM_STUDIO_APPLY_ENABLED` | boolean; default `false` | permit Studio asset-reference writes |

The frontend gate is `newTaskRuntime`, sourced from
`REACT_APP_NEW_TASK_RUNTIME=true`, and defaults off. It controls exposure, not
server authority.

Requested conceptual gates map onto the existing flags rather than introducing
a competing flag registry:

| Prompt 3 concept | Existing control |
| --- | --- |
| `newTaskRuntime` | frontend `newTaskRuntime` plus canonical read mode |
| `durableStudioCommands` | envelope v2 + leases + canonical owner |
| `agentContextAssembler` | canonical runtime route; no independent write authorization |
| `dynamicCapabilityLoading` | capability snapshot mode and canonical context route |
| `newPlanningMode` | canonical task route plus `showPlan`/explicit plan request |
| `conversationalTaskFeed` | canonical task event API and frontend gate |
| `taskRecovery` | canonical owner + outbox + operation ledger + Studio leases |
| `verifiedCompletion` | invariant; deliberately not disableable |
| `legacyAgentFallback` | selected whenever write mode is not `canonical` |

`selectRuntimeOwner` chooses `canonical_task_runtime` only when write mode is
`canonical`; otherwise `legacy_agent_adapter` owns execution. Dual/compare modes
mirror and compare but do not execute twice. Canonical outbox dispatch requires
both canonical ownership and the outbox flag. The canonical legacy adapter and
canonical outbox are mutually exclusive; canonical launch intake fails closed
unless exactly one is enabled. Canonical Prompt 2 writes also require
operation-ledger enforcement.

The `_taskJobProjectionInbox` consumer is not an executor. It only projects
transactionally recorded legacy-job lifecycle receipts into linked canonical
tasks. It starts on the one `RUN_JOB_WORKER=true` instance when task write mode
is `dual` or `canonical`, remains off in `legacy`, prevents overlapping polls,
and drains its active bounded batch on SIGTERM/SIGINT. Polling can be tuned with
`TASK_JOB_PROJECTION_POLL_MS` (default 5000, bounded 1000-300000) and
`TASK_JOB_PROJECTION_BATCH_LIMIT` (default 25, bounded 1-100). The whole worker
process has a bounded graceful drain controlled by `WORKER_SHUTDOWN_TIMEOUT_MS`
(default 10000, bounded 1000-60000).

## Staged rollout

Each stage is independently reversible and must use a nonproduction tenant
first.

### Stage 0 — repository and environment gate

- Run task, Studio protocol, prompt/context/capability, asset-adapter, migration,
  frontend, and deterministic evaluation tests.
- Validate changed backend files with `node --check` and build the frontend.
- Build and parse the generated plugin artifact.
- Confirm all new boolean flags are false and enum flags have safe defaults in
  the target environment.
- Review Firestore rules, indexes, TTL/retention, secrets, and telemetry sinks.

### Stage 1 — shadow records and comparisons

- Use `TASK_RUNTIME_WRITE_MODE=dual` while legacy remains the sole executor.
- Use compare reads and `OPERATION_LEDGER_MODE=observe` only after proving the
  mirror cannot dispatch.
- Use capability `compare` mode to quantify drift.
- Alert on owner/binding mismatch, state drift, duplicate semantic identity,
  missing verification, and redaction failures.

Exit only when sampled projections, ordered events, and capability decisions
match and `unverifiedReportedCompleteCount` is zero.

### Stage 2 — canonical reads for an internal cohort

- Keep legacy execution owner.
- Enable canonical reads and the frontend gate for a bounded internal cohort.
- Exercise refresh/browser-close replay, amendments, typed blockers, and task
  event cursors.
- Roll back reads immediately on missing events, ownership leakage, or UI
  terminal-state disagreement.

### Stage 3 — canonical backend-only execution

- Select canonical owner for a bounded cohort and enforce the operation ledger.
- Enable outbox dispatch only after duplicate/outcome-unknown probes pass.
- Keep Studio v2 and all Prompt 2 external-write flags off.
- Verify backend restart, checkpoint restore, cancellation fencing, OAuth refresh,
  and lost-response reconciliation.

### Stage 4 — durable Studio transport

- Enable envelope v2 and leases only for a dedicated test experience.
- Install the generated `.plugin.lua` artifact and run the manual protocol
  matrix in `studio-consistency-and-recovery.md`.
- Expand only after duplicate delivery, disconnect/reconnect, session rotation,
  source-hash conflict, snapshot, rollback, and trusted readback pass.

### Stage 5 — Prompt 2 asset tools

- Enable asset reads and agent-tool discovery before writes.
- Enable local asset writes before Roblox or Studio writes.
- Enable Roblox writes only with OAuth scope, consent, exact destination,
  operation-ledger, provider reconciliation, moderation, and readback evidence.
- Enable Studio apply last, after the durable Studio stage passes.
- Keep badge/game-pass spend actions restricted to explicit confirmation. Game
  pass creation must also have an exact confirmed price.

### Stage 6 — cohort expansion and legacy retirement

- Increase cohort size gradually and compare every required metric to the
  legacy baseline.
- Stop expansion on any duplicate external action, incorrect binding, sensitive
  log field, unverified completion, unreconciled command, or rollback failure.
- Retire legacy dispatch only after the observation window, restore drill,
  support runbook, and data-retention approval pass.

## Rollback and incident runbook

Roll back exposure and dispatch separately. The safe order is:

1. freeze new external dispatch by disabling Prompt 2 write/Roblox/Studio flags
   and canonical outbox dispatch;
2. preserve all tasks, operations, commands, receipts, checkpoints, and
   migration-control records;
3. stop new leases/attempts but do not rewrite ambiguous operations as failed;
4. reconcile each `executing`, `outcome_unknown`, leased, acknowledged, or
   `reconcile_required` record against provider/Studio readback;
5. return frontend reads to the last known-good projection;
6. return execution ownership to legacy only after fencing the canonical worker
   and proving no canonical lease can still run;
7. compensate only reversible work with a recorded baseline/snapshot and verify
   the restored state; and
8. record an incident event and root cause before re-enabling any stage.

Never delete the operation ledger to “retry cleanly,” change an idempotency key
for an ambiguous create, replay a Studio command under a new command ID, or
describe an irreversible Roblox creation as rolled back.

For a stuck task, operators should inspect task binding, event sequence,
current step/attempt, checkpoint sequence, operation state, Studio command
lease/receipt, capability snapshot, manifest revision/hash, typed error, and
last verifier evidence. Logs should be searched using safe task/request/
operation/command correlation IDs, not user email, tokens, prompts, or source.

## Required observability events

The versioned catalog contains exactly these 29 names:

`chat.request_received`, `context.assembly_started`,
`context.assembly_completed`, `capability.snapshot_loaded`,
`agent.plan_created`, `task.created`, `task.started`, `task.amended`,
`task.paused`, `task.resumed`, `step.started`, `step.completed`, `step.failed`,
`step.retrying`, `checkpoint.created`, `checkpoint.restored`,
`studio.command_created`, `studio.command_delivered`,
`studio.command_acknowledged`, `studio.command_completed`,
`studio.command_failed`, `manifest.conflict_detected`,
`auth.refresh_started`, `auth.refresh_completed`, `verification.started`,
`verification.completed`, `verification.failed`, `task.completed`, and
`task.failed`.

Event fields are bounded to safe scalar values or short scalar arrays. Keys
matching authorization, cookie, password, secret, token, credential, private,
prompt, source, body, or email are removed. Unknown event names are rejected.

Required dashboards and alerts calculate these 17 measures:

1. task completion rate;
2. verified completion rate;
3. Studio write success rate;
4. command delivery success rate;
5. command acknowledgement rate;
6. average retries;
7. automatic recovery rate;
8. user/operator intervention rate;
9. Studio disconnect recovery rate;
10. checkpoint resume rate;
11. duplicate external action rate;
12. manifest conflict rate;
13. unsupported capability rate;
14. incorrect project/universe/place rate;
15. typed failure distribution;
16. request-to-verified-completion latency; and
17. unverified-reported-complete count, whose release invariant is zero.

The source catalog and field scrubber are automated evidence, not proof that
all call sites emit every event or that a production exporter, dashboard, and
alert exists. Before rollout, trace one correlation ID through chat, context,
task, step, command, verification, and terminal events and validate aggregation
against raw redacted records. Dashboard panel definitions live in
`observability-dashboards.md`; Stage 0 packaging is gated by
`backend/scripts/gateTaskRuntimeStage0.js` and the cutover procedure by
`staging-cutover-runbook.md`.

## Retention, backup, and readiness gates

- Events, attempts, receipts, verification evidence, conflicts, and migration
  revisions require an approved retention schedule long enough for incident and
  duplicate-side-effect investigation.
- Raw source, prompts, OAuth payloads, provider bodies, credentials, and pairing
  secrets do not belong in general runtime telemetry.
- Checkpoints and projections may be compacted only when append-only evidence
  and operation identity remain auditable.
- Backup/restore must preserve transactionally related IDs and ordering; run a
  restore drill before legacy retirement.
- Firestore security rules must be emulator-tested for owner, project, nested
  subcollection, IDOR, and client-write denial cases.
- Required composite indexes must be exercised against a deployed staging
  project, not inferred from local files.

The rollout is not production-ready until the live gates and limitations in
`verification-and-evaluations.md` are closed.
