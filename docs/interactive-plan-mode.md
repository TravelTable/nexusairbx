# Interactive Plan Mode

## Current flow audit

Before this upgrade, `/ai` planning was split across two systems:

1. `useUnifiedChat` sent the request to `/api/ai/orchestrate`.
2. The workflow route either returned up to three string questions or persisted a
   flat v2 plan containing Markdown, string steps, and assumptions.
3. `ClarifyCard` accepted any single answer, even when other material questions
   were unanswered. `PlanCard` rendered the whole plan read-only; editing copied
   the original request back into the composer.
4. Approval protected the selected plan version with a server-calculated hash.
   Execution then loaded that approved version on the server.
5. The canonical task runtime generated a second, generic checklist instead of
   executing the approved plan's steps.

The existing integrity boundary is valuable: workflow-plan versions are immutable,
approval is server verified, and the browser passes only a plan reference. The
canonical task runtime also already owns durable events, retries, Studio waits,
verification, and recovery. The upgrade keeps both boundaries and removes the gap
between them.

## Ownership after the upgrade

| Concern | Source of truth |
| --- | --- |
| Request, clarification answers, editable plan sections, locks, and version history | Versioned workflow plan |
| Project, universe, place, Studio session, permissions, and available capabilities | Server-resolved task context and capability snapshot |
| Approved execution input | Immutable workflow-plan version and hash loaded by the server |
| Step status, retries, waits, failures, verification, and rollback | Canonical task runtime ledger |
| Unsaved editor recovery | Per-user browser draft cache; never authoritative for execution |

The client must not duplicate task state or supply authoritative Roblox target or
capability metadata. Plan edits create new versions. Restore creates a new head
version rather than rewriting history. Execution always performs a fresh readiness
check and compiles the approved plan's stable step IDs into canonical runtime steps.

## Readiness policy

Execution is blocked only when it would predictably fail or could affect the wrong
project: a missing or unauthorized required project, a mismatched required Studio
target, an unavailable required capability or permission, or an unresolved
instruction conflict with destructive or target-sensitive impact.

Optional assets, manual verification, low-risk ambiguity, and Studio access that is
not yet required are warnings. Every issue identifies affected plan steps and a
specific recovery action. Browser-provided targeting remains advisory; the server
re-resolves and authorizes the target before accepting a task.

## Incremental migration

The structured v3 plan surface is gated by `newPlanningMode`. Existing v2 plans stay
loadable and executable through the trusted approval loader. Legacy orchestration
and approval routes remain compatibility adapters until the v3 editor, readiness
check, execution handoff, and task checklist have passing coverage. Only then may
the old read-only plan card and its generic lifecycle steps be removed.

No Studio protocol behavior changes as part of this UI migration. Studio writes
continue to require protocol-supported commands, expected source hashes for known
scripts, snapshots before destructive changes, and structured unsupported-operation
errors.
