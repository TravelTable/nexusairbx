# Animation frontend and Studio audit

Inspected 2026-09-24 before production implementation. Backend details are in `animation-system-audit-2026-09-24.md`.

## Existing product

- `src/pages/ai/AnimateWorkspace.jsx` is an admin/settings-gated Animate workspace mounted by `AgentWorkspaceLayout.jsx`. It generates/refines one R15 motion with three variants, presents motion phases, supports playback/scrubbing and custom R15 GLB preview, and queues an individual sequence for Studio review. It has no persistent animation-set hierarchy, editable semantic events, state machine, resource swap, speed/blend editing or playback receipt.
- `src/pages/ai/animation/R15Preview.jsx` already uses Three.js, quaternion interpolation, orbit controls and a bundled rig. Reuse this preview for authored R15 resources. It is not a Roblox evaluator and does not prove Roblox blending, event delivery or permissions. Imported asset IDs alone cannot be previewed here.
- `src/lib/animationApi.js` already provides authenticated animation generation/refinement/list/get/library/Studio calls. Extend this API surface rather than making a parallel application.
- `AssetLibraryModal.jsx` and `robloxAssetLibraryApi.js` expose Roblox animation asset types, but their animation preview can be unavailable. Library listing does not prove playback access in the target universe.

## Existing deployment and defects

- `roblox-plugin/src/commands/animation.lua` implements `create_animation_sequence`, requires a complete R15 body, writes an editable KeyframeSequence under rig/AnimSaves, snapshots replacements, and requires `expectedSequenceHash` for replacement. Preserve those conflict and rollback protections.
- Its `R15_ANIMATION_PARTS` iteration starts Head, UpperTorso, LowerTorso while pose construction requires parents first. `buildKeyframe` therefore encounters a missing torso parent. Fix ordering and verify on a real rig.
- Sequence creation does not create KeyframeMarker objects. `animationSequenceHash` ignores markers. Any marker-aware pipeline must preserve marker names/values/timing through serialization, protocol sanitization, Studio construction, hash/readback and replacement.
- Read commands are generic; there is no complete rig/sequence/track inspection contract. Add bounded, source-free inspection reporting rig joints/bones, Animator/controller, sequences, markers and active tracks. Include Motor6D, AnimationConstraint and Bone support.
- Registry attestation derives capabilities from actual handlers. New operations must be advertised only when implemented. Existing unsupported play commands correctly return structured errors.
- The existing `local-connector` supplies exact Studio targeting, source hashes, snapshots, readback and playtest adapters. Its catalog/executor currently omit animation sequence creation. Extend the current command path instead of deploying an unrelated test-only runtime.

## Verification infrastructure

- Root `backend/` is a nested repository used by `scripts/local-ai-dev.js`. The sibling backend is a different checkout and must not be silently edited or treated as the running target.
- Root contains unrelated pre-existing logs/backups/captures; leave them out of source commits.
- An open Studio initially reported `studio-ddad0448`, with process title Place1. Discovery is not animation proof. No existing user scripts or place contents were modified during this audit.
- Current official [Studio CLI](https://create.roblox.com/docs/studio/command-line-interface) supports `RunScript`, local files, output files and quit-after-execution. [StudioTestService](https://create.roblox.com/docs/reference/engine/classes/StudioTestService) exposes play/run/multiplayer test orchestration and test return values. Use an isolated fixture with bounded assertions and preserve the actual result; process exit alone is not acceptance.
- Official [animation events](https://create.roblox.com/docs/animation/events) documents named markers, string parameters and `GetMarkerReachedSignal`. A marker is an event within animation time, not a hard-coded wall-clock delay. Gameplay authority remains a separate concern.

## Requirements

1. Keep clip authoring and add set organization using existing workspace components and tokens.
2. Make draft, locally previewable, published/access-ready, queued, applied and runtime-verified states distinct.
3. Compile reviewable human-editable Luau and set data; inspect/read back actual Studio outputs.
4. Exercise locomotion, combat, interaction and NPC controllers through production compiler/deployment handlers, with event counts, transition traces, blending and repeated-play cleanup assertions.
5. Document unavailable published-access or client-replication evidence explicitly; do not replace it with synthetic successes.
