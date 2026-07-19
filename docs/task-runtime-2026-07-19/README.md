# Prompt 3 task-runtime implementation record

Date: 2026-07-19

This package records the Prompt 3 contract reconciliation, implementation,
rollout boundaries, verification evidence, and remaining production gates.

The implementation is an additive convergence layer. It does not introduce a
third executor, replace the Studio protocol registry, replace the manifest or
asset registries, or enable external writes by default. The Prompt 1 contracts
remain canonical and the Prompt 2 asset platform remains an adapter owned by
its existing services.

## Documents

- [Contract reconciliation and deviations](contract-reconciliation.md)
- [Runtime architecture and lifecycle](runtime-contract.md)
- [Studio transport, manifest, conflict, and recovery contract](studio-consistency-and-recovery.md)
- [Agent identity, context, capabilities, and planning contract](agent-orchestration-contract.md)
- [Migration, feature flags, rollback, and operations](operations-migration-and-flags.md)
- [Staging cutover runbook](staging-cutover-runbook.md)
- [Staging environment matrix](staging-env-matrix.env)
- [Observability dashboard definitions](observability-dashboards.md)
- [Security and threat model](security-and-threat-model.md)
- [Verification, evaluations, and known limitations](verification-and-evaluations.md)
- [Prompt 3 handoff](prompt-3-handoff.md)
- [Deterministic evaluation corpus](eval-scenarios.json)
- [Evaluation-corpus contract test](eval-scenarios.test.js)

## Safety boundary

All new runtime routing, Studio envelope behavior, canonical API exposure, and
Prompt 2 write-tool integration start disabled. Repository tests can exercise
the contracts with fakes, but external provider, Roblox, and Studio mutations
remain blocked until the staged gates documented in this package pass.

In-repo ops packaging for cutover (Stage 0 gate, env matrix, runbook, plugin
checksum, Firestore explicit rules/indexes, dashboard definitions, CI) is
present. That packaging is **not** a production-readiness claim. Controlled
rollout still requires live evidence attached per
[staging-cutover-runbook.md](staging-cutover-runbook.md).
