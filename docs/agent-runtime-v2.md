# NexusRBX agent runtime v2

Status: implementation contract. This document freezes the public projection and
cross-process invariants for the coordinated v2 cutover. The existing Task Runtime
remains the backend's durable execution authority; v2 adds chat-agent identity,
fair scheduling, user-wide events, and immutable Studio targeting around it.

## Ownership

- The backend owns chat agents, runs, context snapshots, scheduling, approvals,
  idempotency, reconciliation, and final completion truth.
- The browser owns presentation and user intent. It may optimistically display a
  submitted prompt, but it cannot advance a run or infer Studio readiness.
- The Studio plugin owns only live Studio observation and execution. It must
  attest and revalidate the exact target immediately before every mutation.
- MCP and the website are authenticated clients of the same backend runtime.
  Neither has a privileged `latest session` or `only connected place` fallback.

## Durable identities and isolation

Every visible chat has a durable `agentId` and `chatId`. Selecting **New chat**
reserves both immediately; it never uses a shared placeholder identity and never
interrupts another chat. Empty agents expire after 24 hours.

Every submission has a caller-generated `clientMessageId` and
`runIdempotencyKey`. The backend creates one durable `runId`. A retry with the same
keys returns the same run; the same keys with different input is a conflict.

Each run binds an immutable `contextSnapshotId`. Later messages, another run's
partial output, a changed project selection, or a changed Studio target cannot
mutate that snapshot. Completed run output becomes chat context only after it is
committed as a durable message. Concurrent runs in one chat are therefore allowed
without seeing one another's partial output.

## Public projection states

Agent projections use:

`idle | running | queued | waiting_user | waiting_studio | verifying | completed | failed | cancelled`

Run projections use:

`queued | planning | running | waiting_user | waiting_studio | waiting_external | verifying | completed | failed | cancelled`

These are UI projections over the more detailed Task Runtime states. Terminal
projection state is derived from durable acceptance evidence, never from an SSE
disconnect, model text, command delivery, or an optimistic plugin acknowledgement.

## Concurrency and cancellation

- Runs consume per-user execution slots derived from server-owned entitlement and
  configuration. Admission is transactional and queued work is ordered fairly
  across agents; one busy chat cannot starve the user's other chats.
- More than one run may execute inside the same chat. Each result card remains
  attached to its originating prompt and `runId`.
- Writes to the same immutable Studio target are serialized. Work for different
  exact targets may proceed concurrently when user slots permit it.
- Cancellation fences future attempts and writes. A potentially executed external
  operation is reconciled under its original operation identity before its final
  outcome is recorded.

## User-wide event stream

The v2 API exposes a user-scoped stream in addition to per-run detail. Every event
has `eventId`, monotonically increasing `sequence`, `occurredAt`, `agentId`, and
optional `runId`. Clients reconnect with a cursor, deduplicate by `eventId`, and
upsert by durable identity. A full active-agent snapshot repairs missed events.

Minimum event families are `agent.created`, `agent.updated`, `run.created`,
`run.updated`, `run.delta`, `run.completed`, `run.failed`, and `run.cancelled`.
Token deltas are run-scoped and are never inserted into a different chat merely
because that chat is currently selected.

## Studio connection and immutable target contract

The product reports independent facts:

1. connector presence (`plugin`, `mcp`, or both);
2. transport health and last heartbeat;
3. exact selected target;
4. target freshness/attestation generation;
5. capability readiness for the requested operation.

`connected` alone never means command-ready. Read-only Ask/Plan work may continue
while Studio is offline. A Studio-dependent run moves to `waiting_studio` and can
resume only after the same exact target is re-attested or the user explicitly
chooses a replacement and starts/replans the affected work.

Every mutation command contains this server-signed envelope:

```json
{
  "targetId": "opaque immutable target binding",
  "sessionId": "attested Studio session",
  "expectedPlaceId": "Roblox place ID",
  "expectedUniverseId": "Roblox universe ID",
  "expectedPlaceSignature": "hash of authoritative target facts",
  "targetGeneration": 7,
  "operationId": "stable side-effect identity",
  "idempotencyKey": "stable delivery/retry identity"
}
```

For known script writes the payload also requires `expectedSourceHash`. Destructive
commands require a recoverable snapshot before mutation. The plugin verifies the
signature-bound fields and current place again at approval and immediately before
the write. A mismatch returns `TARGET_CHANGED`; an obsolete generation returns
`TARGET_STALE`. Neither is retryable by silently selecting another target.

Changing the selected target invalidates prepared approvals and commands. The
backend cancels or replans commands that have not executed; ambiguous commands enter
reconciliation. The plugin keeps a bounded receipt cache so reconnect can prove
whether the original `operationId` executed.

## API surface

The authoritative cutover surface is mounted below `/api/v2`:

- `POST /agents` reserves a durable empty chat agent.
- `GET /agents` lists agents and their latest/active run projections.
- `DELETE /agents/:agentId` rejects deletion while nonterminal runs exist unless
  the caller explicitly cancels those runs first.
- `POST /agents/:agentId/runs` creates an idempotent run and freezes its context.
- `GET /agents/:agentId/runs` and `GET /runs/:runId` repair client projections.
- `POST /runs/:runId/cancel` creates a cancellation fence idempotently.
- `GET /events` streams user-wide resumable events.
- target-selection and mutation endpoints accept only an explicit exact target;
  v2 never resolves `latest`, `sole`, or implicit sessions for writes.

Legacy endpoints may act as compatibility adapters during deployment, but new
clients use v2 and the v2 records are authoritative. Adapters must preserve the same
identities and cannot maintain a competing lifecycle.

## UX acceptance rules

- The sidebar shows each agent's active state and run count without requiring the
  user to open it.
- The Active Agents tray lists all nonterminal runs, their originating chat, current
  stage, target when relevant, and a run-scoped cancel/open action.
- Creating or switching chats never stops background work.
- Disconnect and target-change notices describe what is actually blocked; they do
  not claim that backend-only work stopped.
- The target control always displays place, universe, Studio session/generation,
  connector, and freshness. Selection is explicit even when only one place exists.
- Prepared writes show their bound target and are visibly invalidated after a
  target change.

## Release gate

The v2 cutover is blocked unless tests cover duplicate submission, concurrent runs
in one chat, parallel chats, fair slot admission, cancellation races, SSE replay,
plugin and MCP disconnects, same-place multi-window ambiguity, target switching
between approval and execution, stale generation rejection, source-hash conflicts,
ambiguous acknowledgements, and reconnect reconciliation. The generated
`roblox-plugin/NexusRBXStudioBridge.plugin.lua` is the Studio installation artifact
and must be rebuilt and parsed after plugin source changes.
