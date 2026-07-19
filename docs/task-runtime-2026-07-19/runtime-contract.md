# NexusRBX durable task runtime contract

Status: implementation and rollout contract for Prompt 3. The canonical vocabulary is inherited from Prompt 1; the longer state list suggested by Prompt 3 is represented through typed blockers, events, and metadata instead of a second state machine.

## Authority and invariants

The backend task runtime is authoritative for task and step state, retries, ownership, idempotency, checkpoints, cancellation, and completion. The model may propose a plan or tool call, but it cannot advance durable state directly. The browser and Studio plugin are projections and transport clients.

The following invariants are release-blocking:

1. A queued, delivered, accepted, executing, or acknowledged action is not complete.
2. `succeeded` requires a resolved user goal and passing durable evidence for every required acceptance check.
3. Every external write uses one stable operation ID and idempotency key across delivery and retry.
4. An ambiguous external outcome enters reconciliation; it is never retried under a new identity.
5. Every privileged read, resume, and write revalidates tenant, user, project, universe, place, and Studio-session ownership.
6. Append-only events are the audit record. Mutable task and step documents are efficient projections, not an alternate history.
7. A checkpoint is a recovery optimization. It cannot override later durable events or provider/Studio readback.
8. Backend-safe steps may continue while Studio-required steps are blocked, provided their dependency graph permits it.

## Durable records

The canonical repository stores task projections in `_tasks`. Each task owns `events`, `steps`, `checkpoints`, and `amendments` subcollections; each step owns immutable `attempts`. `_taskReservations` protects task creation and `_operations` plus per-operation `attempts` owns external side-effect identity.

A task record must bind:

- `taskId`, task type/mode, tenant and user identity;
- `projectId`, `chatId`, Roblox universe/place IDs, and Studio session ID where applicable;
- original instruction, normalized requested outcome, latest amendment, plan, and current step;
- creation/start/update/terminal timestamps;
- latest verified checkpoint and unresolved blocker;
- acceptance policy, verification status, and final evidence.

A step must bind its capability/tool, dependencies, input hash, expected output, verifier, retry policy, idempotency key, operation ID, Studio requirement, reversibility, result/error, attempt count, and timestamps. Secret values and raw OAuth tokens are prohibited.

Each event has a monotonically assigned task sequence, stable event ID, actor, safe payload, correlation identifiers, and occurrence time. Consumers must deduplicate by event ID and order by sequence.

## Canonical state machines

### Task

| State | Permitted next states |
|---|---|
| `accepted` | `planning`, `running`, `failed`, `cancelled` |
| `planning` | `running`, `waiting_user`, `failed`, `cancelled` |
| `running` | `waiting_user`, `blocked_studio`, `waiting_external`, `retry_scheduled`, `verifying`, `compensating`, `failed`, `cancelled` |
| `waiting_user` | `running`, `failed`, `cancelled` |
| `blocked_studio` | `running`, `failed`, `cancelled` |
| `waiting_external` | `running`, `retry_scheduled`, `failed`, `cancelled` |
| `retry_scheduled` | `running`, `failed`, `cancelled` |
| `verifying` | `succeeded`, `running`, `compensating`, `failed`, `cancelled` |
| `compensating` | `failed`, `cancelled` |
| `succeeded`, `failed`, `cancelled` | terminal |

Prompt 3 concepts map as follows: capability/approval waits use `waiting_user` plus a typed blocker; Roblox/moderation waits use `waiting_external`; Studio waits use `blocked_studio`; recovery is an event and checkpoint restore followed by `running`; completion with pending moderation is not `succeeded` unless the acceptance policy explicitly treats the durable pending state as the requested outcome.

### Step

| State | Permitted next states |
|---|---|
| `pending` | `ready`, `cancelled`, `skipped` |
| `ready` | `running`, `cancelled`, `skipped` |
| `running` | `waiting`, `verifying`, `succeeded`, `failed`, `cancelled` |
| `waiting` | `running`, `failed`, `cancelled` |
| `verifying` | `succeeded`, `running`, `failed` |
| `succeeded`, `failed`, `cancelled`, `skipped` | terminal |

A side-effecting step should normally pass through `verifying`. Direct `running -> succeeded` is reserved for work whose acceptance policy defines an immediately durable local result.

### Operation

| State | Permitted next states |
|---|---|
| `reserved` | `executing`, `failed_terminal` |
| `executing` | `outcome_unknown`, `succeeded`, `failed_retryable`, `failed_terminal` |
| `outcome_unknown` | `succeeded`, `failed_retryable`, `failed_terminal` |
| `failed_retryable` | `executing`, `failed_terminal` |
| `succeeded`, `failed_terminal` | terminal |

The unique operation record is the side-effect authority. A duplicate request with the same semantic input returns the existing record/result. The same idempotency key with a different semantic input hash is a conflict, not a replay.

## Checkpoint and resume contract

A checkpoint is immutable and includes, at minimum:

- task/plan version, completed/current/pending steps, dependencies, and amendments;
- sanitized tool inputs/outputs, attempt state, operation IDs, and idempotency keys;
- generated/local/Roblox asset IDs, badge/game-pass IDs, and moderation state;
- file paths, baseline/current/desired hashes, manifest ID/revision, and Studio command receipts;
- provider results, retry decisions, reversible snapshots/rollback receipts;
- last passing acceptance evidence and unresolved blockers.

On resume, the backend:

1. authenticates the caller or worker and rechecks task ownership;
2. loads events after the checkpoint sequence and rebuilds the current projection;
3. revalidates current capability, entitlement, consent, OAuth binding, project/universe/place, and Studio session;
4. reconciles every `executing` or `outcome_unknown` operation and every nonterminal Studio command;
5. rechecks manifest/file hashes before any write;
6. schedules only dependency-ready incomplete steps with their existing operation identities;
7. appends `checkpoint.restored` and `task.resumed` before execution.

The plugin may retain a bounded local receipt cache during network loss, but it must submit receipts to the backend and reconcile command ID, lease fence, payload hash, and session before execution resumes.

## Retry, idempotency, and recovery

The default policy is bounded exponential retry: at most three total attempts, 1 second initial delay, multiplier 2, 30 second cap, and full jitter. A stricter operation policy may reduce attempts. Every retry records the original and typed errors, attempt number, delay, ambiguity flag, duplicate/reconciliation result, recovery action, and final outcome.

| Failure | Required behavior |
|---|---|
| Network/transient provider error | Reconcile if the request may have reached the provider, then retry with the same operation identity if proven safe. |
| Timeout/lost response | Mark `outcome_unknown`, query provider/receipt state, reuse a discovered success, and never blind-create again. |
| Expired OAuth token | Perform one controlled server-side refresh, retry the affected attempt only, and stop on refresh failure. |
| Permission, ownership, entitlement | Do not retry; block/fail the affected step with a safe resolution. |
| Validation failure | Repair the affected input within the step budget; preserve unrelated successful work. |
| Studio disconnect | Checkpoint, block Studio-dependent steps, continue independent backend work, then revalidate the new session before resuming. |
| Manifest/file conflict | Prevent overwrite, retain versions, emit a structured conflict, and require resolution. |
| Duplicate operation | Return the existing verified outcome or current reconciliation state. |
| Unsupported capability | Stop that action immediately and retain unaffected completed work. |

Cancellation creates a fence: no new attempt, lease, or external write may begin after cancellation. An in-flight ambiguous write is reconciled and recorded even though the task remains cancelled.

## Final verification

The task may enter `succeeded` only from `verifying`. `assertSuccessEvidence` requires:

- `userGoalResolved === true`;
- a valid acceptance policy and result for every required check;
- every required result is passing;
- nonempty durable final evidence, including passing evidence keyed to each required check.

Provider submission receipts, model statements, transport ACKs, and client-side optimistic state do not satisfy this contract. Studio mutation evidence must come from trusted readback; external resources require durable provider IDs and an authoritative query/readback; manifest/file checks require expected and observed hashes.

If verification fails, return to `running` for a safe repair, enter `compensating` for a verified reversible rollback, or fail with the unresolved state. Never produce a user-facing “done” message.

## Error taxonomy

Canonical API errors use the existing codes below and a category, retryable flag, safe resolution, correlation IDs, and redacted details.

| Code | Typical category | Retry rule / resolution |
|---|---|---|
| `NETWORK_FAILURE` | `network` | bounded retry after ambiguity check |
| `TIMEOUT` | `timeout` or `outcome_unknown` | reconcile before retry |
| `AUTHENTICATION_FAILED` | `authentication` | reauthenticate; no blind retry |
| `TOKEN_REFRESH_FAILED` | `token_refresh` | reauthorize |
| `PERMISSION_DENIED` | `authorization` | terminal for affected action |
| `OWNERSHIP_MISMATCH` | `ownership` | terminal; disclose no foreign record |
| `ENTITLEMENT_DENIED` | `entitlement` | contact support/change entitlement |
| `VALIDATION_FAILED` | `validation` | change/repair input within policy |
| `CAPABILITY_UNSUPPORTED` | `unsupported_capability` | explain reason and resolution |
| `STUDIO_DISCONNECTED` | `studio_disconnected` | checkpoint and reconnect |
| `STUDIO_COMMAND_EXPIRED` | `command_expired` | reconcile, then redeliver if safe |
| `DUPLICATE_OPERATION` | `duplicate_operation` | return/reconcile existing operation |
| `FILE_CONFLICT` | `file_conflict` | preserve versions and resolve conflict |
| `MANIFEST_MISMATCH` | `manifest_mismatch` | refresh manifest and resolve |
| `IMAGE_GENERATION_FAILED` | `image_generation` | bounded operation retry |
| `ASSET_UPLOAD_FAILED` | `asset_upload` | query upload state before retry |
| `MODERATION_PENDING` / `MODERATION_REJECTED` | `moderation` | wait/poll or terminal rejection |
| `EXTERNAL_API_FAILED` | `external_api` | classify provider result before retry |
| `INTERNAL_CONSISTENCY_FAILED` | `internal` | terminal and alert |
| `UNKNOWN_FAILURE` | `unknown` | fail closed; no automatic side effect |

Finer transport reasons such as `studio_session_mismatch`, `studio_capability_missing`, `feature_flag_disabled`, and `consent_required` live in redacted `details.reasonCode`; they do not introduce a competing top-level taxonomy.
