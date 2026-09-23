# Animation system Studio verification

The animation commands use the existing Studio transport, target identity checks, command receipts and mutation snapshots. Build the plugin with `npm run plugin:build` and the local connector with `npm run build --prefix local-connector`. The connector's `prebuild` verifies that its embedded animation implementation matches the plugin sources; regenerate it with `npm run sync:animation --prefix local-connector` after editing those sources.

## Commands

- `create_animation_sequence` accepts the bounded R15 quaternion format plus `markers: [{name,timeMs,value}]`. Marker-only keyframes preserve exact timing. Sparse upper-body channels leave other joints available to lower-priority tracks. Replacing an existing sequence requires the current `expectedSequenceHash` from inspection. The acknowledgment includes sequence identity, marker count and recovery snapshots.
- `inspect_animation_rig` returns bounded actual joints, controller/Animator identity, local sequences, live tracks and capability observations. A truncated response must not be treated as a complete list. A missing/restricted capability reports unknown.
- `inspect_animation_asset` accepts exactly one local `sequencePath` or published numeric `assetId`. It observes clip markers; reading a clip does not establish experience playback permission.
- `preview_animation` registers a local clip or attaches a compiled set in Studio Edit mode. Attach requires the compiled `ReplicatedStorage/NexusAnimations/<revision>` folder, Workspace rig and exact resource references. Its registry owns temporary tracks, subscriptions and saved joint transforms. Controls request an event, select a state, adjust layer speed, pause/resume, inspect or stop. Preview expires after a bounded lifetime and stops when the context changes.
- `probe_animation_asset` is a distinct Play Server observation for a published asset. It must not accept temporary IDs or report Edit-mode inspection as experience access. Its receipt must identify the actual experience, rig, asset and loaded track before the backend can record access evidence.

Published assets, temporary Studio registrations, deployed scripts, live previews and verified gameplay are separate states. A successful deployment receipt alone does not prove all of them.

## Reproducible live acceptance

Open an **unpublished isolated place**. The verification script refuses a published target. It creates only `Workspace/NexusAnimationProof` fixtures and compiled modules in `ReplicatedStorage/NexusAnimations`. It neither saves nor publishes the place. Use the installed official Studio MCP executable:

```powershell
$env:NEXUS_STUDIO_MCP = 'C:\Users\<you>\AppData\Local\Roblox\Versions\<current-version>\StudioMCP.exe'
$env:NEXUS_ANIMATION_PLAY = '1'
node scripts/verify-animation-studio.mjs
```

The default run uses the real planner/compiler, staged deployment service, protocol sanitizer, local connector and shared plugin implementation. Only acceptance-record persistence is in memory. It verifies:

1. Duplicate-named keyframes and markers survive plugin snapshot restoration. Later creator marker edits and folder additions prevent destructive restoration.
2. Exact markers survive sequence creation, inspection and temporary registration.
3. Staged deployment creates missing folders before scripts and starts an owned preview only after acknowledgments. Preview control and disposal return actual runtime snapshots.
4. A real R15 Humanoid rig performs idle, walk, run, jump, fall and land. Actual joint transforms and simultaneous outgoing/incoming blend tracks are observed.
5. Equip, attack, buffered combo, hit reaction and dodge exercise semantic markers, windows, recovery and interruption.
6. Interaction Contact synchronizes a server callback, a real Sound and a ParticleEmitter; effects clean up on exit.
7. Speed changes and resource replacement affect the real runtime. Twenty-five repeated actions keep track allocations, cached tracks and connection counts stable.
8. A separate NPC uses an AnimationController and Animator for layered movement/action playback and real marker callbacks.
9. Disposal removes owned resources. The optional Play run repeats the gameplay cases with the engine advancing time in the real Play Server.

Evidence goes to ignored `tmp/animation-proof/latest.json`; it is not source and must not be committed. `NEXUS_ANIMATION_REUSE_SEQUENCES=1` is a faster development rerun using the previous observed local clips; use a fresh default run for release evidence. `NEXUS_ANIMATION_SNAPSHOT_ONLY=1` restricts a run to snapshot checks. `NEXUS_ANIMATION_PREVIEW_ONLY=1` exercises attach/control/inspect/stop after deploying the current modules. `NEXUS_ANIMATION_FRESH_FIXTURE=1` preserves the old owned fixture under ServerStorage and creates clean rigs for a fresh full run.

## Product and manual checks

In Animate, open Animation sets, plan a set, save/reload, change a state's resource/speed/fades and edit markers/windows/transitions. Validate before compiling. Resolve referenced Sound/VFX paths to actual objects on the intended target. Deploy to the selected rig, inspect the returned tracks, request actions, pause/resume and stop. Confirm that stopping restores the edit pose and releases preview subscriptions.

For published assets, import the creator's animation file through the canonical resource pipeline, complete publishing/moderation, inspect actual markers and run a Play Server access probe in the intended published experience. Validate production again after changing any motion identity. Verify the generated player adapter in the game's actual client/server authority configuration before shipping it. The isolated local acceptance does not establish published permissions or multiplayer replication.
