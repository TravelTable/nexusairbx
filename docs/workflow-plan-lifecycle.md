# Workflow Plan Lifecycle

This document defines the canonical server-owned lifecycle for Interactive Plan
Mode. The browser edits plan content, but the backend owns revision identity,
approval, execution identity, state transitions, and event ordering.

## Persistence model

All records are scoped to the authenticated user:

```text
users/{uid}/workflow_plans/{planId}
  versions/{version}
  approvals/{approvalId}
  runs/{runId}
    events/{sequence}
```

| Record | Mutability | Purpose |
| --- | --- | --- |
| Plan root | Mutable projection | Current revision, approval, active run, and compatibility fields |
| Plan revision | Immutable | Exact structured content used for review and execution |
| Plan approval | Immutable | User approval of one revision number and content hash |
| Plan run | Mutable with compare-and-set | Durable execution state, target binding, and runtime references |
| Plan event | Append-only | Ordered audit and UI timeline for a run |

Revision IDs use `v{version}`. Approval IDs are derived from the revision and
content hash. The execution request ID is also the run ID, so retrying the same
request cannot create duplicate work.

## Identity and execution fences

Approval requires the current plan `version` and `expectedHash`. The backend
recalculates the stored immutable revision hash before it creates or reuses an
approval.

Execution requires:

- the current revision number and content hash;
- an immutable approval matching that exact revision;
- server-recomputed readiness;
- a target binding derived from trusted server and Studio context;
- an execution request ID used as the durable run ID.

A retry with the same run identity returns the existing run. A different run
identity is rejected while another non-terminal run is active. Runtime launch
results are attached to the durable run so reloads do not depend on browser
memory.

Run control requests include `expectedStatusVersion`. Each accepted transition
increments the version and appends one event in the same transaction. A stale
control request receives `PLAN_RUN_STATE_CONFLICT` and must refresh.

## States

Plan projections may use:

```text
draft
awaiting_approval
approved
queued
running
blocked
paused
completed
failed
cancelled
superseded
```

Runs start at `queued` and may transition through `running`, `blocked`, or
`paused`. `completed`, `failed`, and `cancelled` are terminal.

Pause is currently a durable control-plane pause. It freezes lifecycle
reconciliation and prevents plan mutation in the UI. Runtimes that support a
native pause can adopt the same endpoint later; cancellation is propagated to
the task or agent runtime when a runtime reference exists.

## HTTP contract

All routes require Firebase authentication and a verified email.

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/ai/plans/:planId` | Hydrate the current plan and lifecycle |
| `POST` | `/api/ai/plans/:planId/approve` | Approve an exact revision |
| `POST` | `/api/ai/plans/:planId/execute` | Create or replay a deterministic run |
| `GET` | `/api/ai/plans/:planId/runs/:runId` | Read and reconcile a run |
| `GET` | `/api/ai/plans/:planId/runs/:runId/events` | Read ordered events or a finite SSE catch-up |
| `POST` | `/api/ai/plans/:planId/runs/:runId/pause` | Pause with a status-version fence |
| `POST` | `/api/ai/plans/:planId/runs/:runId/resume` | Recheck readiness and resume |
| `POST` | `/api/ai/plans/:planId/runs/:runId/cancel` | Cancel the runtime and lifecycle run |

The singular `/api/ai/plan/...` aliases remain available during rollout.

The events endpoint accepts `after`, `afterSequence`, or `Last-Event-ID`.
Clients can request JSON or `text/event-stream`. The stream is a finite catch-up
snapshot; clients reconnect or poll for later events.

## Reload and reconciliation

The plan response includes a `lifecycle` projection containing:

- current lifecycle status and revision ID;
- the matching immutable approval when present;
- the active run and its runtime references;
- recent ordered events.

The Plan workspace polls this server projection while a run is active. Run reads
best-effort reconcile task, iterative-agent, or Studio-agent status into the
canonical run. A reload therefore restores the same run card, status, controls,
and timeline without launching another execution.

## Compatibility and rollout

No destructive Firestore backfill is required.

- Existing version documents remain readable.
- Legacy approvals stored as `approvedVersion` and `approvedHash` are projected
  as legacy approval objects.
- Legacy approved revisions are still accepted by the trusted-plan loader.
- New approvals write immutable approval records and retain compatibility
  fields on the plan root.
- New executions always write canonical runs and events.
- Existing singular routes remain aliases for the canonical plural routes.

Rollout can therefore be performed as an application deployment. Operators
should monitor typed lifecycle conflicts, launch failures, and runs that remain
non-terminal longer than the underlying runtime.

## Verification

The lifecycle service tests cover:

- immutable approval and exact hash binding;
- deterministic run creation and event idempotency;
- compare-and-set transitions and ordered events;
- rejection of a competing active run;
- legacy approval projection.

Protocol changes are not part of this lifecycle rebuild. The existing Studio
tool protocol tests remain the regression boundary for Studio commands.
