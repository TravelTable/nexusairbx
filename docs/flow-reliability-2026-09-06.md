# Plan and Studio flow verification — 6 September 2026

## Failures reproduced on production

- Plan execution showed no immediate response and remained at Planning after its durable task had stopped. Planning could start canonical tasks while their progress reader was disabled by a different feature flag.
- Clarification answers surfaced internal option identifiers rather than their labels.
- The Google structured-output request accepted a status-only object, leaving the user without an executable plan.
- The Studio agent received tool names without argument contracts. Its flight build stopped on `INVALID_STUDIO_PATH` before any write.
- A fallback could create an empty generated script and describe the request as successful.
- An approved plan lost its executable targets when transferred to a Studio run, allowing completion checks to cover only the first change.
- A blocked Studio job was always described as disconnected, even when the actual failure was an invalid action or incomplete verification.
- Play-mode plugin copies shared the edit plugin's persisted connector identity. Live receipts alternated between `Game` and `Place1`, advancing the target generation and rejecting queued writes.
- `read_instance` and `read_properties` ignored the requested property list. Live Part creation succeeded, but readback omitted `Anchored` and the completion gate correctly refused success.
- A target rejection before approval was incorrectly treated as an uncertain write outcome.
- Revising a terminal failed plan produced a new draft, but execution returned `PLAN_RUN_ACTIVE`: the old plan run still said running while its linked canonical task had already failed. Normal chat progress did not reconcile the separate plan lifecycle record.
- Plan runtime launch omitted saved apply settings and explicitly defaulted to manual review. The Studio run then waited for approval while canonical task progress showed Running without the existing per-step approval controls.
- Legacy prompt selection discarded the trusted full plan contract. The artifact launch boundary separately discarded full implementation and verification arrays, and recovery rejected a valid already-admitted plan after its root status changed to running.

## Changes

The frontend acknowledges a build immediately, prevents duplicate admission, supports cancellation during admission and execution, scopes late responses to their originating chat, and reads canonical progress whenever planning can create canonical tasks. Plans use normal chat presentation, readable clarification labels, and a bottom build action. Stopped plans can be revised into a new unapproved version through the existing versioned plan API.

The backend requests complete structured planner/agent output, supplies concrete Studio argument contracts, removes the empty-script fallback, retains exact approved implementation targets, and requires acknowledged changes followed by fresh readback. Existing saved runs rehydrate only their exact owned plan/version/hash. Manual gameplay checks remain separate from automated completion evidence. Failure projection distinguishes execution, verification, and connection problems.

Plugin build `.13-edit-isolation` prevents play/runtime copies from claiming the edit connector and reads explicitly requested properties. The backend recognizes a target rejection before approval as a known non-executed command; errors from unknown or later phases remain uncertain.

Optional admission context no longer waits up to 30 seconds for manifest polling: it uses cached context or queues a refresh immediately. Required fresh context before writes remains enforced. Required automated plan checks must have the exact method and target, with successful observations after the latest mutation; unsupported methods remain visible manual checks. Batched script writes require individual matching source-hash readback, and acknowledged batch rewrites reset their readback attempt window.

Plan admission and lifecycle reads now reconcile terminal canonical tasks using exact owner, plan version, and hash checks. Active tasks retain their lock. Reconciliation of an old run cannot overwrite a newer plan revision's status. Production backend deployment: `0cc5afce-56e2-4a82-85e9-e5bd9af2d578`; frontend deployment: `nexusairbx-on2uv4g3z-traveltables-projects.vercel.app` (aliased to `www.nexusrbx.com`).

Subsequent backend deployment `ae4014f7-b1e7-426d-9578-940ec8391d4d` additionally retains executable plan fields across artifact launch, allows exact approved-record recovery for already admitted running plans, and verifies the execution contract before mutations. It includes saved apply settings, trusted plan prompt preservation, approval projection, and cancelled-task approval guards. Latest frontend is `nexusairbx-3t1u47rcb-traveltables-projects.vercel.app`.

## Live evidence so far

- The full flight plan was generated and rendered as normal chat: six implementation steps and two manual gameplay checks.
- Start build immediately displayed Starting build and Stop; readiness returned ready and execution was accepted. Its pre-fix attempt stopped on invalid Studio action arguments.
- Canonical progress now shows that stopped build instead of indefinite Planning.
- In Edit mode, `Workspace/FlightFlowTest/FlowProbeVerified` was created with the requested blue color, position `(12, 8, 0)`, and size `(8, 1, 8)`. The old plugin omitted Anchored in readback, so this attempt was not marked complete.
- Production tests were submitted through Edge using the Browser plugin. Roblox Studio Play was stopped using the Computer plugin. Native screenshot capture returned `SetIsBorderRequired ... 0x80004002`; keyboard menu attempts were subsequently suspended at the user's request to keep ChatGPT open.
- After the user reopened Studio, its live heartbeat confirmed `.13-edit-isolation`, compatible and current. A read-only Computer capture retry on the reopened window still returned the Windows interface error.
- The production Agent request for `Workspace/FlightFlowTest/FlowProbeFinal` completed successfully: create, exact readback (including `Anchored: true` and preserved false boolean properties), and targeted validation. The object was blue at `(24, 8, 0)`, size `(8, 1, 8)`. Job `artifact_job_90bd6116100985fd573a5681c4d009e868ae9e416b9097dd`, Studio run `studio_run_1d15612b4a1cc9580071d9eb391ede91de05728373707807`; all completed/succeeded. Evidence: `.local-logs/flow-final-live-object.json`.
- The stopped flight plan's new Revise plan button successfully produced a new draft with Start build and Discuss changes. It did not automatically execute or restore Studio content.
- Revision 2 remained retryable after a rejected execute request and page reload. Its first admission was blocked by the stale revision-1 lifecycle lock; no new Studio writes occurred from that rejection.
- After lifecycle reconciliation shipped, version 2 was admitted and reached an approval gate. Stop cancelled its canonical task through the production website. No pending batch was applied in that attempt.
- Version 3 confirmed saved `after_validation` + `developer_mode` now reached Studio as `unrestricted_dev`. It applied a create-only batch but was blocked because the artifact boundary dropped executable plan fields; no flight scripts were completed. Its new test-only objects include `ReplicatedStorage/FlightFlowTest/FireEvent`, `Workspace/FlightFlowTest/Projectiles`, and `Workspace/FlightFlowTest/SpawnPad`.
- Approval UI deployment `nexusairbx-3t1u47rcb-traveltables-projects.vercel.app` passed its isolated full build and is aliased to production. It exposes exact Studio step approval through the existing endpoint and suppresses generic task redispatch for Studio runs.

## Remaining live checks

Version 4 retained all six implementation steps and both verification steps. It exposed two further live failures: `list_children` receipts lost their names/classes during compaction, and a created Part's rounded Color3 readback caused `apply_unverified`. Backend deployment `fe13ce87-30f3-4069-ac92-ec93fcad4b85` is successful and preserves bounded child names, paths, classes, and pagination through both persistence stages (209 regression tests passed). The shooter is not yet verified complete.

Production read-only reconciliation `studio_run_7c3c414d61bf6876536d9fd953e5fd06fbdcde24b1809ba5` completed successfully through Edge and the Studio plugin. The persisted child names/classes now reach the model and its final response. Only `FireEvent` exists in `ReplicatedStorage/FlightFlowTest`; the failed batch's `ProjectileTemplate` and `MoveEvent` were cancelled with the Studio recording. Pre-cancellation receipt values must not be promoted to current successful writes. Evidence: `.local-logs/flow-reconciliation-live.json`.

The realistic version-4 prompt also exceeded its trusted-plan budget because it repeated rendered Markdown and structured content. The prompt correction retains full structured implementation and verification instructions and exact targets while omitting duplicate display content. Canonical, legacy and shadow prompt tests pass within the existing budget (196 tests).

Backend deployment `afef06b3-7dec-4c81-b5dc-b1ab45ae3592` successfully ships that prompt correction and `.14-color-readback` release metadata. Plugin `.14` fixes only BasePart.Color verification to accept the exact stored 8-bit channel values, retaining strict comparisons for other properties. Plugin build: 64 passed, zero failed, two optional Luau-runtime tests skipped; all 52 handlers validated. The installed and public `.rbxmx` SHA256 both equal `06969b1e25c4320182d78e22fd46dbbefe4a34a296171f4ebc081c3357f40605`. The previous installed artifact is backed up locally. User reload is pending; `.14` gameplay and a fresh shooter build are not yet tested.

- Approve the revised flight plan and verify every planned object and script.
- Exercise keyboard flight, projectile shooting, and multiplayer damage in Studio Play mode. Static source readback does not prove these behaviors.

## Validation

- 228 integrated backend tests passed for approved-plan execution, Studio agent, protocol, and task projection.
- 81 release compatibility, protocol, and command-verification tests passed after the final backend release update.
- Frontend focused recovery tests and full production build passed. Plugin artifact validation and final live checks are recorded as they finish.
- Frontend recovery: 99 tests across five focused suites passed. Plugin: 62 tests passed, one optional Luau CLI check skipped; bundled artifact validated all 52 handlers.
- Required automated plan checks and batched script readback/attempt ordering: 229 combined backend tests passed, with syntax checks on changed modules.
- Final combined backend suite including optional admission context: 249 tests passed, zero failed (`.local-logs/flow-shipping-backend-tests.log`).
- Lifecycle follow-up: 232 combined lifecycle, execution, route, Studio agent, coverage, and protocol tests passed (`.local-logs/flow-lifecycle-shipping-tests.log`).
- Execution retention, running-plan recovery, and pre-mutation contract checks: 315 combined tests passed (`.local-logs/flow-plan-contract-combined-tests.log`). Approval visibility: 186 backend and 32 frontend tests passed, plus terminal-identity regression. Latest isolated Vercel production build passed.

Avoid restoring a whole-place checkpoint to clean up isolated test artifacts. Preserve unrelated content and inspect the exact test object before any cleanup.
