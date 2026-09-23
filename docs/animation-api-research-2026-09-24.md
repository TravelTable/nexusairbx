# Roblox animation API research — 24 September 2026

This is the API and platform part of the research-first animation work. Findings below come from pages actually opened on 24 September 2026, including the official Markdown endpoints where the rendered API pages omitted descriptive prose. Several current API Markdown pages report `last_updated: 2026-09-22`. Product requirements are explicitly identified as deductions, not promises made by Roblox. No Studio execution or asset publishing was performed as part of this research.

## Architecture-changing findings

1. **Native Animation Graphs are available in live games.** The [official full-release announcement](https://devforum.roblox.com/t/full-release-animation-graphs-create-complex-character-motion-visually/4739840), dated 15 July 2026, supersedes the April Studio-only beta. Graphs support interactive debugging, parameters, blending, masks, sequencing, and custom rigs. Existing clip loading remains compatible. Nexus should orchestrate gameplay and resources while accommodating native graphs; claiming that Roblox only offers disconnected clips would be incorrect.
2. **R15 joints are no longer reliably Motor6Ds.** Current [AnimationConstraint documentation](https://create.roblox.com/docs/reference/engine/classes/AnimationConstraint) describes Avatar Joint Upgrade as default for new experiences. Rig inspection must recognize AnimationConstraint, Motor6D, and Bone, including mixed or custom hierarchies.
3. **Cross-owner animation reuse is supported.** The current [animation-sharing guide](https://create.roblox.com/docs/education/build-it-play-it-island-of-move/sharing-animations) explicitly supports sharing with friends, groups, and games without re-uploading. A creator mismatch alone cannot establish an access failure.
4. **Custom humanoids can reuse a common animation library.** [Adaptive Animation](https://create.roblox.com/docs/characters/adaptive-animation) maps joints through HumanoidRigDescription and DigitsRigDescription and a reference T-pose. A custom rig must not automatically be rejected merely because the source clip is R15.

## Playback and replication

| Verified behavior | Nexus implication |
| --- | --- |
| Animator performs playback and replication; it must exist in Workspace before LoadAnimation. | Resolve the real rig and controller before loading. |
| Replicating Animator instances must originate on the server. The owning player's client can start its character animations; non-player rigs must load/start on the server. | Explicit player-client and server-NPC execution policies; local preview is a distinct mode. |
| LoadAnimation creates a new track every call. GetTrackByAnimationId retrieves an existing match, returning the first if duplicates exist. | Cache by Animator, resource revision, and layer; do not reload every action. |
| GetPlayingAnimationTracks includes fading tracks. | Track budgets and diagnostics must count fades, not only IsPlaying. |
| PreferLodEnabled controls per-Animator distance/budget throttling; EvaluationThrottled reports skipped evaluation. | Preserve LOD by default and avoid accumulating procedural offsets on reused poses. |
| StepAnimations is plugin/command-bar only and previews require joint restoration. | Studio bridge owns edit-mode playback and cleanup. |

Source: [Animator](https://create.roblox.com/docs/reference/engine/classes/Animator), also inspected through its [official Markdown representation](https://create.roblox.com/docs/en-us/reference/engine/classes/Animator.md).

[Humanoid](https://create.roblox.com/docs/reference/engine/classes/Humanoid) still distinguishes R6 and R15, exposes movement/state events, and deprecates its LoadAnimation/GetPlayingAnimationTracks proxies. Use its state and movement information as input to animation policy, not as a replacement for that policy. R6 and R15 have different joints and should remain explicit compatibility categories.

[AnimationController](https://create.roblox.com/docs/reference/engine/classes/AnimationController) supports rigs without a Humanoid through a child Animator; its LoadAnimation proxy is deprecated. A chest, creature, or mechanical rig does not need a player-specific runtime. [Using animations](https://create.roblox.com/docs/animation/using) documents both Humanoid and non-Humanoid setup and replacement of default character animation IDs. A generated controller must make ownership of default Animate behavior explicit to prevent two controllers competing.

### Track semantics

- `Animation` stores the asset reference; loaded `AnimationTrack` owns playback state. `Length` remains zero until loading completes. Loading therefore needs a bounded readiness check, distinct from invalid or zero-duration content.
- `Play(fadeTime, weight, speed)`, `AdjustWeight`, `AdjustSpeed`, `Stop(fadeTime)`, and `Looped` support runtime control. `TimePosition` scrubbing requires playback; pause with speed zero. Many observation properties are marked NotReplicated and are not a network protocol.
- `Stopped` identifies playback stopping; `Ended` includes fade completion. Use playback cancellation to close gameplay windows immediately, then visual completion for cleanup.
- `DidLoop` is reliable for loop completion, not as a non-loop completion event. `KeyframeReached` is deprecated; markers use `GetMarkerReachedSignal`.
- Zero-time stopping can freeze joints with zero Motor.MaxVelocity. Avoid universal instant-stop assumptions.
- Graph tracks additionally expose `GetParameter`, `SetParameter`, and `GetParameterDefaults`; ordinary clips return an empty defaults dictionary.

Sources: [Animation](https://create.roblox.com/docs/reference/engine/classes/Animation), [AnimationTrack](https://create.roblox.com/docs/reference/engine/classes/AnimationTrack).

### Priorities and layering

Priority order is `Action4 > Action3 > Action2 > Action > Movement > Idle > Core`. Core has enum value **1000** despite being lowest; numerical sorting is incorrect. Evaluation is per joint: higher priorities consume weight first; equal priorities blend by relative weights. Roblox defaults use Core. A high-priority partial-body clip can coexist with lower-body locomotion if it does not key those joints. This is override blending, not automatically additive motion. Store named priorities and authored joint coverage. Source: [AnimationPriority](https://create.roblox.com/docs/reference/engine/enums/AnimationPriority).

## Current native graph system

[Graph Editor](https://create.roblox.com/docs/animation/graph-editor) publishes an AnimationGraphDefinition as a normal animation asset ID and loads it through Animator. Parameters drive behavior. Its generated Animate module selects client/server runners based on character type and Workspace.AuthorityMode. Automatic mode uses the owning client for players and server for NPCs; parameter changes replicate, coalescing multiple writes per frame. Server Authority drives graph state on the server, with player-client prediction; both sides need corresponding parameter inputs. Unpublished Studio preview is not supported in Server Authority mode. Markers propagate through graph nodes, can be attenuated/silenced, and reach the track's marker signals. Transition durations and per-input overrides are native features.

The [node reference](https://create.roblox.com/docs/reference/engine/enums/AnimationNodeType) documents Clip, Select, PrioritySelect, Sequence, RandomSequence, Over, Add, Subtract, Blend1D, Blend2D, Mask, Speed, and GraphOutput. Blend nodes offer normalized phase synchronization and forward events only from the highest-weight input. Add/Subtract pass events from both inputs; therefore zero visual contribution must not be assumed to suppress every additive marker. Masks control per-joint influence; Over plus Mask supports an upper-body overlay. Subtract can derive an additive pose relative to a reference. These distinctions matter for footsteps, weapon events, and duplicate effects.

**Product deduction:** represent an animation system independently of its runtime backend. Allow conventional track states now and graph-resource/parameter bindings without corrupting their semantics. Store event provenance, layer, authority, and replay policy. Never generate unverified graph instance/property names merely because the editor supports the feature. The standalone AnimationGraphDefinition documentation endpoint returned 404 during inspection; programmable graph construction requires a Studio/API capability probe.

## Rig compatibility, procedural motion, and root movement

| Mechanism | Verified capability and implementation boundary |
| --- | --- |
| Motor6D | Transform is the documented custom animation offset. Animator updates it after PreAnimation and before PreSimulation; deferred transforms are batched. Joint channel names must match authored hierarchy. [API](https://create.roblox.com/docs/reference/engine/classes/Motor6D) |
| AnimationConstraint | Uses attachments; supports kinematic animation or force/torque simulation. C0/C1/Part0/Part1 compatibility aliases are read-only. Do not write RigAttachment.CFrame: it disrupts retargeting. Apply procedural Transform overlays in PreSimulation, respecting evaluation throttling. [API](https://create.roblox.com/docs/reference/engine/classes/AnimationConstraint), [constraint overview](https://create.roblox.com/docs/physics/constraints/animation) |
| Bone | Drives skinned rigs, with hierarchy-relative transforms. Transform is not replicated. CFrame/WorldCFrame describe the reference pose; TransformedWorldCFrame exposes the animated pose. [API](https://create.roblox.com/docs/reference/engine/classes/Bone) |
| IKControl | Requires Humanoid or AnimationController with Animator plus valid ChainRoot, EndEffector, Target, and Type. Supports position, rotation, transform, or look-at solving. Weight blends its influence; Weight zero does not fully disable it—use Enabled=false. Supports bones and articulated parts. Useful for foot placement, aim, hands on weapons/handles, and head tracking. [API](https://create.roblox.com/docs/reference/engine/classes/IKControl) |
| Adaptive Animation | Inspect mapped rig-description joints and reference pose, not only R6/R15 labels. The documented humanoid mapping requires at least the standardized 15 joints; hands/fingers are optional additional mapping. Arbitrary quadrupeds are not proven automatically compatible. [Guide](https://create.roblox.com/docs/characters/adaptive-animation) |

**Procedural policy deduction:** keep authored clips for readable locomotion/actions; use IK or procedural offsets for environment/weapon adaptation, aim, recoil, breathing, and camera response. Tweening an unrigged lid/UI property is appropriate; replacing an articulated locomotion system with independent part tweens is not justified by these APIs. Procedural network state must be synchronized explicitly rather than assuming Transform property replication.

**Root-motion uncertainty:** search-cached official API results expose Animator.RootMotion and RootMotionWeight, but the current canonical Animator page and its Markdown omit them; direct member URLs redirect to the canonical page. No inspected official source establishes a supported gameplay root-motion extraction/consumption workflow. Nexus must expose explicit `inPlace` versus gameplay-controlled movement intent and reject unsupported root-motion claims. A later Studio probe may establish additional support. Animating a root joint is not evidence that collisions, navigation, or the world-space character root move correctly.

## Markers, clips, preview, and deterministic inspection

[Animation events](https://create.roblox.com/docs/animation/events) store named events at frames with optional string payloads. A name may repeat, such as left/right footsteps; identity cannot be only the marker name. [KeyframeMarker](https://create.roblox.com/docs/reference/engine/classes/KeyframeMarker) is distinct from the Keyframe name. Preserve name, value, time, order, and repeated occurrences. Marker absence should be a validation error when gameplay requires it, rather than a silent fallback to arbitrary delay.

[AnimationClipProvider](https://create.roblox.com/docs/reference/engine/classes/AnimationClipProvider) replaces deprecated [KeyframeSequenceProvider](https://create.roblox.com/docs/reference/engine/classes/KeyframeSequenceProvider). GetAnimationClipAsync yields and should be protected with pcall; it returns either KeyframeSequence or CurveAnimation. RegisterAnimationClip and RegisterActiveAnimationClip provide temporary Studio-only IDs. They do not publish usable online assets. GetClipEvaluatorAsync is now documented for sampling poses, but its linked ClipEvaluator page returned 404; treat sampling details as unverified until probed.

[CurveAnimation](https://create.roblox.com/docs/reference/engine/classes/CurveAnimation) stores per-channel curves in joint-shaped folder hierarchies and permits partial hierarchy matching. It is a supported source format, not malformed KeyframeSequence content. The resource model therefore needs `clipFormat`, evidence source, joint requirements, and marker inspection status. Failure to inspect an asset means unknown markers, not an empty verified marker list.

## Publishing, permissions, and reusable assets

[Open Cloud Assets](https://create.roblox.com/docs/cloud/guides/usage-assets) supports Animation uploads in .rbxm/.rbxmx, one asset per request, with asynchronous operation polling. OAuth uses asset:read/write scopes; creation includes user or group identity. Uploaded Studio files are the supported basis; externally edited model files may fail. Operation success returns an asset ID and may include moderation state. Distinguish local draft, uploading, pending moderation, rejected, published, access-unverified, and runtime-verified states. A numeric ID alone proves none of these.

[Asset privacy](https://create.roblox.com/docs/projects/assets/privacy) separates collaborator access and game access. A collaborator being able to inspect a clip does not prove the target game can load it. The Asset Privacy creation toggle only changes images/decals/meshes; animation defaults are separate. Restricted assets can be granted to friends, groups, and games. Game grants are permanent, and Open Use conversion is irreversible. Nexus should show exact creator and target universe, record observed grants, and never relabel a permission mutation as a reversible local setting.

The July [graph release](https://devforum.roblox.com/t/full-release-animation-graphs-create-complex-character-motion-visually/4739840) says choosing clips now grants permissions automatically. The April [beta post](https://devforum.roblox.com/t/studio-beta-introducing-the-animation-graph-system/4554788) warned about graph/clip permissions separately. Treat the former as current workflow evidence, while still validating every dependency on the destination game; do not perpetuate the beta limitation as current fact.

[Marketplace animation packs](https://create.roblox.com/docs/avatar/animation-packs) are a separate publishing product, with R15, CurveAnimation, original-content, duration, looping, and complete locomotion-set rules. These restrictions should not be indiscriminately applied to private gameplay attack or creature clips. Nexus's reusable AnimationSet is not automatically a Marketplace pack.

## Concrete Nexus requirements from the evidence

These are implementation requirements inferred from the verified platform capabilities:

1. **Structured plan:** stable set/state/resource IDs; actor and rig evidence; roles; named priority; loop/speed/fades; layer/joint coverage; transition guards and interruption policy; finite exit/recovery behavior; semantic markers and gameplay windows; runtime backend and authority policy.
2. **Resolver:** prefer suitable private, project, and shared resources before generation. Rank semantic role, rig mapping, style, weapon, joint coverage, duration, locomotion speed, and required markers. Keep suitability independent from access/readiness. Return rejection reasons and unresolved requirements.
3. **Validation:** enforce bounded numeric fields; legal priorities; missing resources; known rig incompatibilities; access/moderation failures; required-marker evidence; marker/window ordering and duration; unresolved sound/VFX references; conflicting transitions; looped one-shot actions; state exits and permanent locks; duplicate track ownership and overlap budget.
4. **Runtime:** cache tracks per rig and revision; connect handlers once; clear hit/cancel windows on interruption, error, death, replacement, and destroy; invalidate stale callbacks using playback identity; disconnect and destroy cleanly. Animation priority must not become gameplay permission.
5. **Event integration:** marker dispatch routes to explicit gameplay, sound, VFX, and local camera bindings. Cosmetic prediction is separable from server-authoritative damage/rewards. Client claims alone must not authorize hits. Missing required hit markers fail closed.
6. **Studio bridge:** report controller/Animator, concrete joint classes, hierarchy/mapping, loaded track state, durations, observed markers, authority, asset-loading errors, and cleanup counts. Preview/scrub must restore original transforms and distinguish local temporary clips from published proof.
7. **Editor:** edit sets, states, transitions, events, resource swaps, speed and fades; reveal validation and publishing/access status. Delegate pose authoring and native graph debugging to Studio when suitable. Do not present a web timeline as proof of rig playback.
8. **Performance:** use measured per-rig track budgets, reuse resources, preload selected imminent clips, observe LOD, and instrument repeated actions for stable connections/tracks. No unverified hard-coded engine track-limit claim is needed.

## Proof requirements and unresolved questions

- Test the same authored data through idle/walk/run/jump/fall/land, equip/attack/combo/hit/dodge, an interaction with sound/VFX, and a non-player rig. Include cancellation, speed changes, clip replacement, death/respawn, looping, and at least repeated actions with no growing track/connection count.
- Verify two-client observation and server-NPC playback in the actual destination authority mode. A local edit-mode demonstration does not establish network replication or published asset access.
- Capture actual marker occurrences and window closures; test missing markers, unreadable clips, rejected permissions, and failed loads. Measure runtime state as well as visual quality.
- Probe graph construction/introspection and actual graph parameter support in the installed Studio. Preserve native graph resources even if first implementation only compiles track-based states.
- Verify curve marker extraction, evaluator API details, root-motion availability, and custom skeletal rig retargeting against actual assets. Current documentation does not settle these implementation details.

## What Nexus can do materially better than Animation Editor alone

The evidence supports **connecting animation decisions to the whole game**: plan coherent sets, resolve existing compatible resources, retain creator/access/moderation provenance, compile readable state/event wiring, bind gameplay/VFX/sound to semantic events, identify invalid or untested assumptions, and prove the result on real player and non-player rigs. Native Roblox tools already author clips, provide a graph editor, support masks/additive blending, and debug graph behavior. Nexus's useful distinction is coordinated game integration, reusable resource selection, deterministic validation, and repeatable Studio evidence across those tools—not recreating their keyframe or node editors.
