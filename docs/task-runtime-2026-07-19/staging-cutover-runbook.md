# Staging → production cutover runbook (Prompt 3)

Date: 2026-07-19

This runbook is the executable companion to
[operations-migration-and-flags.md](operations-migration-and-flags.md). It does
**not** flip production flags by itself. Each stage requires a signed evidence
block attached to a specific commit, backend deployment, Firestore
rules/index version, prompt/model version, and generated plugin checksum.

## Preconditions

1. Stage 0 gate passes locally and in CI:

```bash
cd backend && node scripts/gateTaskRuntimeStage0.js
GATE_RUN_TESTS=1 node scripts/gateTaskRuntimeStage0.js
npm run plugin:verify
node roblox-plugin/build/write-plugin-checksum.js
```

2. Deploy Firestore packaging to the **staging** Firebase project only:

```bash
cd backend && firebase deploy --only firestore:rules,firestore:indexes --project "$STAGING_FIREBASE_PROJECT"
```

3. Confirm `backend/.env.example` and root `.env.example` still default every
   Prompt 3 write path to off.

4. Use the env recipes in [staging-env-matrix.env](staging-env-matrix.env).

## Evidence block template

Copy into the stage evidence log (or ticket) after each stage:

```text
Stage: <0-6>
Commit SHA:
Backend deployment ID / image:
Frontend deployment ID:
Firestore project:
Firestore rules release:
Firestore indexes release:
Plugin build ID:
Plugin sha256:
Model / prompt version:
Operator:
Date (UTC):
Pass / Fail:
Rollback notes:
Metrics snapshot:
  unverifiedReportedCompleteCount=
  duplicateExternalActionRate=
  incorrectProjectOrUniverseRate=
```

## Stage checklist

### Stage 0 — repository and environment

- [ ] `gateTaskRuntimeStage0.js` passes
- [ ] Focused backend + eval corpus tests pass (`GATE_RUN_TESTS=1`)
- [ ] Frontend task suites / build green for the release candidate
- [ ] Plugin verify + sha256 recorded
- [ ] Staging Firestore rules + indexes deployed
- [ ] Migration dry-run against a staging-shaped export (`npm run audit:task-runtime`)

Exit: all boxes checked; flags remain Stage 0.

### Stage 1 — dual write / observe

- Apply Stage 1 env from `staging-env-matrix.env` on staging worker + API.
- [ ] Legacy remains the sole executor (no dual side effects)
- [ ] Sampled task projections match legacy job status
- [ ] `OPERATION_LEDGER_MODE=observe` records without blocking
- [ ] Capability compare drift dashboard reviewed
- [ ] `unverifiedReportedCompleteCount == 0`

Exit: shadow parity acceptable; rollback by returning Stage 0 env.

### Stage 2 — canonical reads / internal cohort

- Apply Stage 2 env; enable `REACT_APP_NEW_TASK_RUNTIME=true` for the cohort.
- [ ] Browser refresh restores task progress cursor
- [ ] Clarify / waiting_user / priceRobux flows work without fake jobs
- [ ] No ownership leakage across users/projects
- [ ] Immediate rollback of read mode if UI/terminal disagreement appears

### Stage 3 — canonical execution (bounded)

- Choose **exactly one** transport: legacy adapter **or** outbox.
- [ ] Backend restart mid-task recovers from checkpoint
- [ ] Cancel fencing prevents new leases
- [ ] Lost-response / outcome_unknown reconciliation drill passes
- [ ] Duplicate semantic identity does not create a second external effect

### Stage 4 — durable Studio

- Install only the checksummed generated `.plugin.lua`.
- [ ] Duplicate delivery returns cached receipt
- [ ] Disconnect / reconnect resumes leased commands
- [ ] Source-hash conflict fails closed
- [ ] Snapshot + rollback receipt verified
- [ ] False-ACK / readback mismatch fails verification

### Stage 5 — Prompt 2 asset tools

- Enable reads/tools before writes; Roblox upload and Studio apply last.
- [ ] Consent + OAuth scope + exact destination enforced
- [ ] Provider false-success reconciled
- [ ] Game-pass price requires exact `priceRobux` confirmation
- [ ] Duplicate-spend drill fails safely

### Stage 6 — expand / retire legacy

- [ ] Observation window meets release thresholds in
      `verification-and-evaluations.md`
- [ ] Support runbook exercised
- [ ] Backup/restore drill preserves operation identity ordering
- [ ] Legacy dispatch retired only after restore drill

## Production cohort cutover

Only after Stages 0–5 pass on staging with attached evidence:

1. Deploy the same commit + plugin checksum to production.
2. Deploy Firestore rules/indexes to production.
3. Start production at Stage 1 (dual/observe), not Stage 3+.
4. Promote stages with the same checklist; never skip Studio or spend drills.
5. Keep external-write flags off until Stage 5 evidence exists for that env.

## Rollback order (any stage)

1. Disable Prompt 2 write / Roblox / Studio apply flags and outbox dispatch.
2. Preserve tasks, operations, commands, receipts, checkpoints.
3. Stop new leases/attempts; do not rewrite ambiguous operations as failed.
4. Reconcile `executing` / `outcome_unknown` / leased records against readback.
5. Return reads to the last known-good projection.
6. Return execution ownership to legacy only after fencing canonical workers.
7. Record the incident before re-enabling any stage.

## Controlled readiness decision

Flip `prompt-3-handoff.md` §20 to **Yes** only when:

- Stages 0–4 (minimum) have evidence for the target environment; and
- Release thresholds (`unverifiedReportedCompleteCount == 0`,
  `duplicateExternalActionRate == 0`,
  `incorrectProjectOrUniverseRate == 0`) hold; and
- Rollback + restore drills passed on that same commit/plugin/rules version.

Until then the decision remains **No**, even if repository packaging is complete.
