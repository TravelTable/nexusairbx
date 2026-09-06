# Coordinated Roblox builds

The first release is disabled by default. Set `GAME_TEAM_ENABLED=true` on a staging backend to opt newly approved full-game requests into the adaptive team. Keep the existing Task Runtime and Studio bridge flags configured for canonical execution. Small changes and unapproved requests use the existing single agent. The v2 run records its execution mode at creation; replaying or disabling the intake flag does not convert existing runs.

The lead creates a versioned specification before dispatch. Gameplay, UI, world/assets and QA assignments are durable Task Runtime steps. Only dependency-ready assignments run. Workers produce staged files and declarative changes; they have no Studio mutation or delegation tools. Selected models pass through the existing router, including Auto. The lead's Studio decisions and specialist calls share transactional account leases with a maximum of four calls per build. Idle parents hold no model lease. Workers renew their execution leases, and the scheduler rotates through builds before filling another slot for the same build.

`_gameTeams/{taskId}` owns the active step IDs, specification, revision identity, usage receipts, required artwork and wakeup state. `_gameTeamArtifacts` stores immutable, versioned output. `_modelExecutionSlots` coordinates provider calls across backend processes. These are server-owned collections; clients use the existing authenticated task/run projections. Existing v2 creation, read, event and cancellation routes remain in place. The originating chat displays **Team activity**, output references, handoffs, failures and aggregate model tokens.

The Studio lead is the single integration queue. It retrieves individual complete files through `team_read_artifact`, applies them through existing bridge commands, then reads them back. Ownership checks cover nested batch operations. Script writes must match accepted source and its observed baseline hash. A fresh read of a human edit does not authorize applying an older staged script: the lead sends that read to `team_repair_assignment`. Existing exact-target attestation, command idempotency, snapshot and cancellation rules still apply.

`team_revise_spec` checks the current specification hash. Revisions fence unfinished old work. Completed assignments are reused only when their instructions, consumed interface keys, relevant art direction and accepted dependencies remain compatible. `interfaceRefs` names the top-level specification interfaces an assignment consumes. Repairing an output invalidates its dependent assignments while preserving unrelated artifacts. Each deliverable allows two targeted repair cycles; provider/restart attempts retain the runtime's bounded retry policy. A failed worker cannot terminalize the parent through a job projection receipt.

Required artwork generation runs with the world/assets assignment when its calls are independent `generate_asset` operations. Gameplay can use temporary visuals while it proceeds. Existing publication and sensitive-action rules still govern other asset operations. Asset request resolution must reference an actual successful provider receipt. Artwork, asset requests, failed workers and missing integration evidence prevent overall completion.

Playtest reservations in `_studioPlaytestReservations` span the session, including gaps between commands. Reads and background generation may continue; scene mutations wait. Ambiguous or disconnected tests retain the reservation until a verified stop reconciles the target. Do not delete a reservation to unlock Studio. Stop/reconcile on the exact target using the existing connector flow.

Parent completion requires all current assignments, asset receipts, matching post-write readbacks and the approved plan checks. `run_play_test` only starts a session. The connector's `testservice_run` profile now calls `TestService:RunAsync()` and returns `testCount`/`errorCount`; zero checks cannot pass. Runnable QA scripts may live under `TestService`. Static validation, unsupported profiles and model assertions are not behavioral evidence. Checks needing devices, multiple clients or human judgment stay explicitly pending manual verification. Public game publishing remains outside this workflow.

## Staging verification

Run backend Task Runtime, team, worker, Studio protocol, command lifecycle and v2 tests; syntax-check changed backend files. Run frontend tests and production build, `npm run check` in `local-connector`, and the plugin build checks. Follow the exact-target, disconnect/reconnect, source-hash and snapshot procedures in [Studio protocol verification](studio-tool-protocol.md).

Use disposable copies of the same initial place for each paired build. Follow [Roblox testing modes](https://create.roblox.com/docs/studio/testing-modes). Retain actual command/test receipts and manual observations. Use identical approved features, selected model, starting project, capacity and acceptance criteria; alternate single/team order across repeated trials. Time from approval to verified playable, then separately record whole-plan acceptance and total usage.

| Scenario | Required behavior | Manual/device checks |
| --- | --- | --- |
| Obby | Traverse checkpoints; death respawns at the last checkpoint; finish triggers once; reset works | Keyboard and touch movement; HUD safe areas; two clients have independent checkpoint state |
| Collecting simulator | Collect valid items; enforce server ownership; update inventory/currency; buy one upgrade; respawn collectibles | Two clients cannot claim the same item twice; mobile HUD and controls; persistence if approved |
| Multiplayer arena | Two clients spawn, enter a round, deal server-validated damage, score, end and restart a round | Respawn and spectator behavior; disconnect during a round; keyboard/touch layouts |

Exercise worker death before/after artifact storage, duplicate completion delivery, a failed specialist, cancellation during provider work and during a Studio command, stale script hashes, a shared-interface revision, and a playtest disconnect. Confirm successful sibling outputs remain available and no partial milestone completes the game.

Record an array of `{pairId, scenario, model, acceptanceHash, executionMode, acceptancePassed, verifiedPlayableMs, playtestReceiptId, usage:{inputTokens,outputTokens,assetOperations}}`. Scenario IDs are `obby`, `collecting_simulator`, and `multiplayer_arena`. Use `null` for an unverified playable time; never substitute source inspection. Asset operation counts are separate from model tokens; retain provider billing receipts for monetary cost comparisons.

Run `node backend/scripts/compareGameTeamBuilds.js recorded-builds.json`. The report includes paired medians, pass rates and usage. The rollout target is at least 30% lower median time to verified playable with no lower acceptance pass rate. Missing timing evidence or mismatched pairs cannot pass the gate. All three scenarios and repeated real trials require review before wider rollout.

## Validation status for this implementation

Automated runtime/bridge/connector checks have been exercised locally. A read-only Studio probe confirmed the connected unpublished place exposes `TestService.TestCount` and `ErrorCount`, with zero installed tests. No gameplay playtest, device/multiplayer acceptance run, or paid paired build benchmark has been claimed. Keep the flag off until those staging checks establish behavior and the measured speed/usage tradeoff.
