# Nexus animation systems: research and requirements

Research date: 2026-09-24. This document is the implementation gate and ongoing acceptance ledger. Research precedes production implementation. Individual reports retain sources actually inspected and limitations of source access.

## Research record

- `animation-api-research-2026-09-24.md`: current Creator Hub/API and platform changes, replication, performance, publishing/access and unresolved API questions.
- `animation-workflow-research-2026-09-24.md`: creator workflows, DevForum pain points, tutorials and gameplay-animation design.
- `animation-system-audit-2026-09-24.md`: existing backend, generation, asset/resource library and integration points.
- `animation-frontend-studio-audit-2026-09-24.md`: existing frontend, plugin, connector and Studio verification path.
- `animation-set-contract.md`: implementation contract derived from the findings.

Gate status: passed 2026-09-24 after all five companion reports/contracts were written and reviewed, before production implementation. Tutorial descriptions/chapters were inspected, but playable YouTube footage/transcripts were unavailable; artistic demonstration claims remain unverified. Do not treat planned features or requirements below as implementation evidence.

## What can Nexus do materially better than Roblox's Animation Editor alone?

The opportunity is a coherent implementation and iteration workflow across resources, game rules and Studio, rather than a replacement pose editor. Roblox already provides events, retargeting, layered animation and released Animation Graphs. Nexus can add an explicit animation-set plan with reusable resource selection, target-experience readiness checks, gameplay windows and interruption semantics, deterministic validation, sound/VFX bindings, human-editable runtime output and repeatable deployment/readback/playback evidence. Whether a motion feels good still requires visual review on the intended rig; a passing schema or an AI critique cannot establish that.

## Decisions derived from research and audit

| Finding | Nexus requirement | Acceptance evidence |
| --- | --- | --- |
| Existing single-clip authoring and Three.js preview already work as a product path | Extend Animate with persistent sets and resources; retain clip authoring | Editor save/reload, variant/resource replacement and preview tests |
| Animation Graphs are released, with native layering/additive operations | Represent runtime backend explicitly; start with a readable track compiler; graph plans must report unsupported compilation until an actual adapter exists | No invented graph API or silent fallback |
| Animator loading creates tracks and repeated subscriptions can accumulate | Cache bounded tracks and marker connections; clean up on exit, replacement, disposal, destruction and failed load | Repeated actions and replacement on real Animator, counts before/after |
| Marker callbacks synchronize presentation but do not authorize game actions | Semantic events/windows with server gameplay callback gates; close windows on interruption/stop/error | Combat HitStart/Impact/HitEnd trace and interrupted hitbox cleanup |
| Non-looping actions can still lock a state through missing exit or stuck loading | Explicit transition and recovery policies, watchdogs and deterministic dead-end/conflict checks | Failed loading, canceled action, recovery and nonterminating state tests |
| Asset creator, sharing grant, moderation and playable availability are different facts | Preserve provenance and target-universe access evidence; reject placeholder/temp IDs for production | Missing, pending, denied and unknown access cases remain distinct |
| AnimationConstraint, Motor6D, Bone and mapped adaptive rigs coexist | Bounded rig inspection based on actual joints and mapping; do not assert that custom means incompatible | Real R15 and NPC/custom inspection, explicit unsupported rig cases |
| Published asset IDs and Studio temporary registrations have different lifetimes | Support editable Studio previews but label them as unpublished; publishing must use existing assets services and actual completion evidence | Temporary IDs never marked production-ready |
| Existing pose construction orders children before torso parents and drops markers | Fix topology; preserve marker names/values/timing and include markers in hashes/readback | Real KeyframeSequence inspection and conflict-protected replacement |
| Existing resources are broader than animation name matching | Filter by semantic role, rig/joints, scope, state and intended use before ranking text/style | Private → project → shared selection, incompatible candidate rejection |
| Responsive animation relies on timing, pose readability and gameplay semantics | Store anticipation/action/recovery and hit/combo/cancel windows; distinguish locomotion, action and reaction roles | Locomotion/combat/interaction/NPC scenarios with meaningful timing |
| Current bridges already offer snapshots, source hashes and target fencing | Deploy through those paths, with exact readback and structured unsupported errors | Command receipts and source/sequence comparisons |

## Scope and constraints

Canonical flow: natural-language brief → structured AnimationSet plan → resource resolution → deterministic validation → editable runtime/data compilation → target-fenced Studio deployment → rig/track/event inspection and iterative edits.

Use milliseconds in serialized plans. Use stable resource/state/event identifiers. Do not put credentials, logs, Studio backups, temporary captures or unrelated local files in source commits. Work in the root frontend/plugin repository and the nested backend selected by `scripts/local-ai-dev.js`. Commit and push coherent changes to the existing repositories; no pull request.

The initial compiler uses authored animation tracks, not procedural replacements for missing locomotion/combat assets. Procedural aim/recoil/IK needs explicit supported rig and frame-phase contracts. Root-motion API availability requires a current Studio probe before emitting it. Browser preview is an approximation, not Roblox runtime or multiplayer evidence.

## Acceptance ledger

Evidence and limits are detailed in [the verification report](animation-verification-2026-09-24.md). Update only against concrete tests or inspected outputs.

- Research and current API verification: documented; current Creator Hub/API sources inspected, tutorial footage limitation retained.
- Structured representation, serialization and deterministic validation: implemented and covered by backend regression tests.
- Semantic reusable resources, asset state/access handling: private/project/shared filtering, actual saved-resource reuse in the browser, import/publication lifecycle and resource-bound inspection/probe validation tested.
- Editor hierarchy, preview/scrub/loop/speed, blend/markers/windows/resources: implemented; real authenticated persistence/reload/resource-swap workflow and desktop/mobile layout verified.
- Runtime transitions, interruption, recovery, looping, cleanup and replacement: actual Luau tests and real Animator checks passed; twenty-five live repeated attacks kept allocations/cache/connections stable.
- Actual pipeline Studio deployment and readback: fresh staged service run completed all 38 steps, exact source readbacks and real preview attachment/control.
- A: idle → walk → run → jump → fall → land with blending: passed on a real R15 rig in Edit and Play Server.
- B: equip, attack, second attack, hit reaction, dodge/block with markers: passed, including buffered combo and interrupted windows.
- C: interaction state, sound and VFX synchronization: real server callback, Sound and ParticleEmitter passed on Contact.
- D: NPC/creature case: separate AnimationController NPC passed layered movement/action and marker checks in Edit and Play Server.
- Published asset access and player replication evidence: explicitly unverified in the unpublished proof place. The real published-experience Play probe is implemented; no temporary preview evidence is promoted to production access.
- Relevant tests/builds/plugin verification: relevant suites, full frontend build, source parity, plugin artifact build and live snapshot recovery passed; pre-existing unrelated registry fixture failures documented.
- Source delivery: the final task handoff records the verified pushed frontend/plugin and backend revision IDs.

## Genuine unresolved questions

- Current Studio availability/security of root-motion APIs and exact movement support.
- Programmatic native graph authoring surface; referenced classes do not all have complete public documentation.
- Availability of publishing credentials and target-universe grants; local source authoring cannot establish either.
- Browser preview fidelity for Roblox easing, skeleton retargeting and layered blending.
- Multiplayer evidence must exercise actual client/server Animator rules; a server-only harness is insufficient.
