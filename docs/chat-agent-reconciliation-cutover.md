# Chat-agent reconciliation cutover

The `_chatAgentUsersV2` worker is safe to enable only after this order has completed:

1. Deploy the additive Firestore composite index and wait until its state is **READY**.
2. Deploy API writers that maintain `needsReconciliation` and `reconciliationSortAt`, while leaving the reconciliation worker disabled.
3. Run the full-collection read-only assertion below and decide whether a backfill is required.
4. If the assertion passes, enable the reconciliation loop on exactly one worker instance with its separate default-off cutover flag.

The worker query is:

```text
_chatAgentUsersV2
  where needsReconciliation == true
  order by reconciliationSortAt ascending
```

Its required collection-scoped index is:

```text
needsReconciliation ASC, reconciliationSortAt ASC
```

From `backend/`, deploy only the indexes to the explicit environment:

```sh
firebase deploy --only firestore:indexes --project <firebase-project-id>
```

Confirm the `_chatAgentUsersV2` composite index reports **READY** in that project's Firestore index view before deploying marker-aware writers.

Firestore excludes a document from an `orderBy` query when the ordered field is absent. A user document with active, queued, or cancellation-pending run IDs can therefore be permanently invisible to the worker if its marker fields were not populated first.

## Read-only assertion

Run from `backend/` with credentials for the explicit target project:

```sh
npm run audit:chat-agent-reconciliation -- --project-id=<firebase-project-id>
```

The service-account `project_id` must exactly match `--project-id`. The command scans the entire collection in document-ID order; it never uses the worker's marker query and has no write or apply mode.

Exit codes:

- `0`: the full scan completed and no hidden-work blocker was found.
- `2`: the scan completed, but the worker must remain disabled until the reported documents are repaired.
- `1`: configuration or scan failure; readiness is unknown and the worker must remain disabled.

The JSON result separates:

- `greenfield_waiver`: the collection is empty, so no backfill exists to perform.
- `no_backfill_required`: existing documents were scanned and none can hide required work.
- `backfill_required`: at least one document has work without `needsReconciliation === true`, has an invalid work-list shape, or has `needsReconciliation === true` without a valid `reconciliationSortAt` timestamp.

Absent and explicit `null` sort markers are reported separately. Stale-but-visible marker states are warnings; hidden required work is a blocker.

## Backfill decision and worker enablement

If `backfill_required` is returned, do not enable the worker. Use a separately reviewed one-time migration to scan the same full collection and derive the marker from `activeRunIds`, `queuedRunIds`, and `pendingCancellationRunIds`. Work-bearing documents need `needsReconciliation: true` and a valid timestamp marker; inactive documents need `needsReconciliation: false` and `reconciliationSortAt: null`. Rerun the read-only assertion after that migration and retain its output as cutover evidence.

Only after a zero exit should the designated worker process run with both `RUN_JOB_WORKER=true` and `RUN_CHAT_AGENT_RECONCILIATION_WORKER=true`. Keep `RUN_CHAT_AGENT_RECONCILIATION_WORKER=false` before that point. Keep `RUN_JOB_WORKER=false` on API replicas and every other process so there is one reconciliation owner during cutover.
