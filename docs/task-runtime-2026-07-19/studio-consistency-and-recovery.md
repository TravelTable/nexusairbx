# Studio command, consistency, and recovery contract

This document extends the existing Studio bridge and protocol. It does not authorize a second transport. The generated `roblox-plugin/NexusRBXStudioBridge.plugin.lua` is the installable artifact; `roblox-plugin/src` is source, not an install target.

## Command authority and envelope

The backend creates the authoritative command. Each envelope binds:

- command, operation, idempotency, task, and step IDs;
- tenant/user, project, universe, place, and Studio session IDs;
- required capability and a stable semantic payload hash;
- expected manifest revision and expected source/file hashes;
- creation/expiry time, delivery count, attempt limit, and lease fence;
- safe payload, approval/snapshot requirements, result, verifier evidence, and typed error.

The plugin rejects expired, malformed, wrong-session, wrong-place, unsupported, tampered, stale-fence, and already-terminal commands before side effects. Duplicate delivery of the same command returns the cached durable receipt/result. Reusing an ID with a different payload hash is a conflict.

## Command lifecycle

| State | Meaning | Permitted next states |
|---|---|---|
| `created` | durable envelope exists | `queued`, `expired`, `cancelled` |
| `queued` | eligible for delivery | `leased`, `failed`, `reconcile_required`, `expired`, `cancelled` |
| `leased` | one delivery worker/plugin owns a fenced lease | `queued`, `accepted`, `reconcile_required`, `expired`, `cancelled` |
| `accepted` | plugin validated envelope and session | `executing`, `acknowledged`, `failed`, `reconcile_required` |
| `executing` | side effect may have begun | `acknowledged`, `failed`, `reconcile_required` |
| `acknowledged` | result receipt exists; not yet verified | `verifying`, `failed`, `reconcile_required` |
| `verifying` | backend evaluates trusted readback | `succeeded`, `failed`, `reconcile_required` |
| `reconcile_required` | outcome/session is ambiguous | `queued`, `verifying`, `failed`, `cancelled` |
| `succeeded`, `failed`, `expired`, `cancelled` | terminal | none |

Receipt stages are `received`, `started`, `result`, and `verified`. A transport ACK only proves receipt. A `result` ACK only reports plugin execution. Neither is success without backend verification.

Leases are short and fenced. Only the current fence may accept or complete a command. Lease expiry after possible execution enters `reconcile_required`; it must not silently return to `queued`. Delivery is bounded to three attempts by default.

## Session and reconnect behavior

Pairing establishes a user-owned, project/universe/place-bound session with protocol version and advertised capabilities. Pairing codes are single-use, short lived, stored hashed where practical, and invalidated on successful exchange. Reconnect rotates session credentials and cannot adopt another task merely because the place ID matches.

On disconnect:

1. append the disconnect event and checkpoint the task;
2. stop leasing new Studio-required commands;
3. move affected task work to `blocked_studio`, while dependency-safe backend work may continue;
4. preserve nonterminal commands and local plugin receipts;
5. on reconnect, reauthenticate and compare user, project, universe, place, session generation, protocol, and advertised capabilities;
6. upload/reconcile cached receipts before delivering new writes;
7. refresh the complete manifest and recheck hashes;
8. append resume events and schedule only safe incomplete work.

A reconnect with a different session ID requires explicit backend rebinding. An old session cannot submit a new receipt after its generation is superseded.

## Manifest-first context and write preconditions

For Studio work, NexusRBX requests `get_project_manifest` first, waits for a complete revision/content hash, searches metadata, then reads only relevant scripts/resources. Incomplete manifests may support diagnostics but are not write baselines.

Every known script edit includes `expectedSourceHash`. Writes also bind the expected manifest revision where available. The plugin compares the command baseline immediately before mutation. A mismatch prevents the write and returns a structured conflict.

Three-way consistency uses `baseline`, `current`, and `desired`:

| Classification | Condition | Action |
|---|---|---|
| `no_conflict` | unchanged or current already equals desired | no-op / reuse existing result |
| `one_sided_safe` | only desired changed | apply desired after remaining checks |
| `one_sided_safe` | only current changed | preserve current; do not overwrite |
| `two_sided_conflict` | current and desired independently diverged | retain both and manually reconcile |
| `hash_mismatch` | supplied integrity hash is false | reject evidence/input |

A conflict record should contain the safe identifiers, paths, baseline/current/desired hashes and versions, structured diff metadata, originating task/step/command, and resolution state. Source content remains access-controlled and is not copied into general logs.

## Verification

Read commands can complete from a valid Studio result. Mutation commands require a trusted source (`studio_readback`, `studio_manifest`, `studio_inspection`, or `studio_test`) and concrete evidence such as a readback hash, manifest revision, or affected paths.

For source writes, the backend verifies:

- Studio observed the expected baseline hash;
- the authoritative intended source determines the expected post-write hash;
- trusted readback equals that post-write hash;
- manifest evidence is consistent and safe to apply.

For destructive commands, a snapshot or snapshot-receipt ID is mandatory before success. A textual explanation that a snapshot was unavailable is not rollback evidence.

## Ambiguous failures and rollback

If execution and side effects are both proven not to have started, a failure may be terminal. Otherwise failure is `reconcile_required` until exact readback establishes one of:

- intended state exists: record success and reuse it;
- baseline state remains: mark retryable under the same command/operation identity;
- a different state exists: create a conflict and require intervention;
- rollback restored the recorded baseline: record verified compensation.

Rollback is allowed only for reversible NexusRBX/Studio changes with a recorded prior version or snapshot. Rollback is itself a durable idempotent operation and must verify the restored hash against the recorded baseline. Roblox creations that cannot be safely deleted are not described as rolled back; NexusRBX records the created object and reports the partial outcome.

## Manual Studio protocol verification

Before enabling durable command flags:

1. build the generated plugin artifact with `node roblox-plugin/build/bundle-plugin.js`;
2. parse/syntax-check the generated Lua bundle and install that generated file in Studio;
3. pair to a dedicated nonproduction experience and confirm user/project/universe/place binding;
4. run manifest read, targeted script read, hash-guarded write, duplicate delivery, disconnect/reconnect, expired lease, conflict, destructive snapshot, and verified rollback probes;
5. inspect backend records and ensure each command has one semantic identity and ordered receipt stages;
6. verify no token, private source, or pairing credential appears in logs/model context;
7. keep all write flags off if any receipt, hash, lease-fence, reconnect, or readback assertion fails.

Passing backend unit tests or parsing the bundle is not evidence that these live Studio steps passed.
