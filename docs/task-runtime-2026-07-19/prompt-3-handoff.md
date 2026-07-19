# Prompt 3 handoff

Date: 2026-07-19

## Decision

The complete NexusRBX system is **not ready for a controlled production
rollout**. Prompt 3 closes the durable task-runtime implementation seam and the
in-repo cutover packaging (Stage 0 gate, env matrix, runbook, plugin checksum,
Firestore packaging, dashboard definitions, CI) behind default-off flags. Live
Studio, Roblox OAuth/provider, Firestore deploy proof, generated-plugin
install drills, and multi-worker soak evidence remain required before any
cutover. Follow [staging-cutover-runbook.md](staging-cutover-runbook.md).

## 1. Concise implementation summary

Prompt 3 adds an additive durable task runtime: ledger, steps, events,
checkpoints, operation identity, outbox, intake API, artifact facade, Studio
lifecycle hardening, agent identity/context/capability assembly, Prompt 2 asset
tool adapters, workspace progress UI, migration audit, and evaluation corpus.
Execution still defaults to the legacy artifact/job path. Canonical ownership
is available only when explicitly flagged, and external writes stay gated.

## 2. Prompt 1 contracts used

- Canonical task/step/operation/Studio vocabularies from the architecture audit
- One runtime owner; dual mode mirrors records and never dual-executes
- ACK is not success; trusted verification evidence is required
- Fail-closed feature flags and ownership checks at privileged boundaries
- Documented deviations in `contract-reconciliation.md`

## 3. Prompt 2 asset tools integrated

`TaskAssetToolAdapter` publishes the nine Prompt 2 tools with typed schemas,
owner scoping, consent awareness, and write refusal unless the operation ledger
is enforced and the canonical runtime owns side effects. Live provider/Roblox
writes remain disabled by Prompt 2 and Prompt 3 flags.

## 4. Major root causes fixed (component level)

- Duplicate/ambiguous runtime ownership through deterministic `runtimeOwner`
- Transport-versus-verification confusion via Studio leases/receipts/evidence
- Lost browser progress via durable tasks + reconnectable event cursor
- Prompt/context drift via one identity assembler and capability snapshots
- Blind retries via operation ledger and outbox fencing

## 5. Task-runtime changes

- `_tasks`, events, steps, attempts, checkpoints, amendments
- Shared `_operations` ledger and `_taskOutbox`
- `/api/tasks` authenticated intake/read/action routes
- `ArtifactTaskRuntimeFacade` with legacy adapter and outbox transports
- Thin outbox dispatcher that reuses `launchArtifactRun` as the sole executor
- Approve/retry redispatches through the task’s selected transport

## 6. Studio transport changes

- Envelope v2 fields, leases, fencing, staged receipts
- Manifest three-way conflict helpers and verification service
- Plugin registry updates for receipt/fence behavior
- Default-off until generated plugin + live drills pass

## 7. Manifest and conflict handling

- Hash/version preconditions and structured conflict records
- One-sided safe apply remains contract-level; live two-writer drills remain

## 8. Retry and recovery

- Typed errors, bounded attempts, ambiguous-outcome reconciliation
- Job projection worker and outbox dispatch worker (default-off)
- Backend restart / Studio disconnect live drills remain

## 9. Agent identity and prompt assembly

- `NexusAgentPromptService` + `AgentContextAssembler`
- Trusted system identity preserved above untrusted file/tool content

## 10. Capability loading

- `TaskCapabilitySnapshotService` intersects OAuth, Studio, asset, and feature
  gates; unavailable tools are not exposed as available

## 11. Context loading

- Bounded, redacted, ownership-checked assembly with truncation logging hooks

## 12. Planning and conversational behaviour

- `taskIntent` planning toggle, clarification policy, amendment classification
- Game-pass exact-price confirmation remains the safer intentional deviation

## 13. Chat and progress UI

- `TaskProgressPanel`, `useTaskRuntime`, `/ai` wiring
- Non-job intake outcomes (clarify/plan/waiting_user) handled without fake jobs
- Exact `priceRobux` confirmation UI for waiting-user monetisation gates

## 14. Migrations

- `auditTaskRuntimeMigration.js` dry-run audit only; no active-task importer

## 15. Feature flags

Defaults remain fail-closed (`legacy` write/read, outbox/adapter off,
`REACT_APP_NEW_TASK_RUNTIME=false`). Staged recipes live in
`staging-env-matrix.env`. See `operations-migration-and-flags.md`.

## 16. Tests and evaluations

- Deterministic runtime, facade, outbox dispatcher, intake, Studio, intent,
  capability, context, frontend task UI, and eval-corpus contract tests
- Stage 0 packaging gate + Task Runtime CI workflow
- 17 E2E fixtures are contract-locked, not live-executed

## 17. Security findings resolved (code-level)

- Explicit Firestore deny matches for Prompt 3 namespaces including
  `_studioCommands`, `_migrationControl`, and `_agentContextSnapshots`
- Server-derived ownership; browser claims non-authoritative
- Credential redaction in context/observability contracts
- Ledger events emit allowlisted ops telemetry after commit

## 18. Known limitations

- No controlled production readiness claim
- Game-pass auto-price not implemented (exact confirmation required)
- No live 17-scenario Studio/Roblox/OAuth/provider matrix recorded
- No live model-eval runner connected to the corpus
- Migration audit does not import active tasks
- Dashboards-as-code are definitions only until wired to a production sink

## 19. Remaining unresolved issues

- Staged single-executor proof under flag changes (Stages 1–3)
- Generated plugin live reconnect/resume drills (Stage 4)
- Deployed Firestore rules/index verification on staging/prod projects
- Provider false-success and Studio false-ACK end-to-end drills
- Production cohort promotion (Stage 6)

## 20. Controlled production readiness

**No.** Enablement requires evidence attached to a specific commit, backend
deployment, Firestore rules/index version, prompt/model version, and generated
plugin checksum as described in `verification-and-evaluations.md` and executed
via `staging-cutover-runbook.md`. Repository packaging for that cutover is in
place; live stage evidence is not.
