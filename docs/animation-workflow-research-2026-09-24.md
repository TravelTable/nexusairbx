# Roblox animation workflow and gameplay design research

Research date: 2026-09-24. This is the workflow/design companion to the Roblox API research and current-system audit. It records research conducted before production implementation. Recommendations below are Nexus design judgments, not claims that Roblox supplies those abstractions automatically.

## Evidence and access limits

Creator Hub pages and the GDC slide text were opened and read. DevForum frequently returned a JavaScript verification page when opened directly; where noted, the search service returned substantive indexed original post/reply text, which was read instead. Those posts are first-person evidence of workflow problems, not authoritative engine contracts or measured prevalence. Older tutorials inform authoring workflow only; their legacy playback examples are not current API guidance.

YouTube research inspected creator-authored descriptions and chapter lists for two practical Roblox tutorials, plus discovery metadata for a third. Direct video pages returned only a footer or throttling, and a browser attempt timed out. No playable video or transcript was obtained. Consequently this document does **not** claim to have watched the footage, verified demonstrations, or evaluated the visual quality of those animations. Visual/tutorial verification remains an explicit research limitation.

### Sources actually inspected

| ID | Source | Inspected material and use |
| --- | --- | --- |
| R1 | [Roblox Animation Editor](https://create.roblox.com/docs/animation/editor) | Current Creator Hub text: poses, easing, keyframe optimization, loop seam behavior. |
| R2 | [Roblox Curve Editor](https://create.roblox.com/docs/animation/curve-editor) | Current Creator Hub text: independent channels, tangents, rotation conversion caveats. |
| R3 | [Roblox Animation events](https://create.roblox.com/docs/animation/events) | Current Creator Hub text and example: named markers, string parameters, repeated markers. |
| R4 | [Roblox Animation Graph Editor](https://create.roblox.com/docs/animation/graph-editor) | Current Creator Hub full text: graph assets, parameters, event propagation, transitions, authority modes, preview. |
| R5 | [Roblox Use animations](https://create.roblox.com/docs/animation/using) | Current Creator Hub text: Animator loading, non-humanoid rigs, default Animate replacements and variation weights. |
| R6 | [Roblox IKControl](https://create.roblox.com/docs/reference/engine/classes/IKControl) | Substantive indexed API text: chain/target setup, authored-pose override, use cases, weight versus Enabled. Direct open timed out. |
| R7 | [Roblox Blender workflow](https://create.roblox.com/docs/art/blender) | Indexed official text: import/export scale and orientation; external resources require validation. |
| W1 | [Jespone's guide to animations](https://devforum.roblox.com/t/jespones-guide-to-animations/225752) | Indexed original Jan 2019 tutorial: pose-first construction, timing/easing, arcs, asymmetry, practice and polish. Embedded videos were not watched. |
| W2 | [Jespone guide replies](https://devforum.roblox.com/t/jespones-guide-to-animations/225752?page=2) | Indexed creator replies: root displacement confusion and later reports of broken tutorial media. Historical workflow evidence only. |
| W3 | [H_mzah: animate a tool/object with a dummy](https://devforum.roblox.com/t/how-to-animate-a-toolobject-with-a-dummy-in-the-animation-editor/232317) | Indexed Jan/Feb 2019 author tutorial, including weapon handle and magazine rigging. |
| W4 | [Tool tutorial follow-up](https://devforum.roblox.com/t/how-to-animate-a-toolobject-with-a-dummy-in-the-animation-editor/232317?page=2) | Indexed author correction: an extra Weld prevented magazine animation. Legacy playback code deliberately not reused. |
| W5 | [Movement Animation Tips](https://devforum.roblox.com/t/movement-animation-tips/2499323) | Indexed Aug 2023 author question and replies: heavy/slow-looking motion and learning friction. Tool preference opinions are not comparative evidence. |
| V1 | [six: Moon Animator 2 Basics — Official Tutorial](https://www.youtube.com/watch?v=q8tGNMo_jHg) | Creator/channel and chapter list, published 2021-12-21. Tool author's workflow covers R6, easing, props, camera, export/import, markers. No footage/transcript. |
| V2 | [Nisky: Roblox ANIMATION Guide #1 — Moon Animator (2026)](https://www.youtube.com/watch?v=267aFypaeWU) | Description/chapter list, actually published 2025-10-28 despite title. Chapters cover onion skinning, anticipation, camera, smoothing, export and rig transfer. No footage/transcript. |
| V3 | [doc7090: Roblox Animation for Beginners, part 1](https://www.youtube.com/watch?v=e6ra2xGYx1o) | Discovery metadata only, published 2025-08-04. No technique claims are based on this source. |
| P1 | [Mariel Cartwright, Lab Zero: Fluid and Powerful Animation within Frame Restrictions](https://media.gdcvault.com/GDC2014/Presentations/Cartwright_Muriel_Animation_Bootcamp_Fluid.pdf) | All extracted slide text, especially slides 6–10, 13, 19–25 and 29–35 (one-based). PDF screenshots requested; no readable image payload was available. |
| P2 | [GDC: Just Cause 3 responsive character movement](https://www.gdcvault.com/play/1021981/Finding-Balance-Realizing-Responsive-High) | Session abstract by Jeet Shroff/Alex Crowhurst. Not the talk recording. |
| P3 | [GDC: Physics Animation in Uncharted 4](https://gdcvault.com/play/1024087/Physics-Animation-in-Uncharted-4) | Session abstract: simulation layered onto gameplay animation; responsiveness tradeoff. Not the talk recording. |
| P4 | [Animation Mentor: Tips and Tricks Every Animator Should Know](https://content.animationmentor.com/pdfs/AnimationMentor_TipsTricks_EveryAnimator.pdf) | Indexed p.16 by curriculum director Justin Owens: timing, spacing, arcs, weight and interactive responsiveness. |
| S1 | [Epic: State Machines](https://dev.epicgames.com/documentation/unreal-engine/state-machines-in-unreal-engine) | Official indexed conceptual documentation; states, movement variables, finite action states and ambiguity. Not Roblox API guidance. |
| S2 | [Epic: Transition Rules](https://dev.epicgames.com/documentation/unreal-engine/transition-rules-in-unreal-engine) | Official indexed conceptual documentation; directional rules and interruption notifications. |
| S3 | [Unity 6: Animation transitions](https://docs.unity3d.com/6000.0/Documentation/Manual/class-Transition.html) | Opened current English HTML text: time units, conditions, interruption ordering and preview. Not Roblox API guidance. |
| C1 | [Custom synced footsteps cause network lag](https://devforum.roblox.com/t/custom-synced-footsteps-causes-network-lag-after-a-while/3848374) | Indexed July 2025 original code and accepted author follow-up: accumulating marker connections. |
| C2 | [Track limit troubleshooting](https://devforum.roblox.com/t/help-troubleshooting-animationtrack-limit-of-256-tracks-for-one-animator-exceeded-new-animations-will-not-be-played/2577096) | Indexed Sep 2023 posts: duplicate/default Animate interactions and weak diagnostic attribution. |
| C3 | [Track limit report, December 2025](https://devforum.roblox.com/t/animationtrack-limit-of-256-tracks-for-one-animator-exceeded/4127179) | Indexed original question, reuse advice and author's later identification of default Animate interaction. |
| C4 | [Battlegrounds animation movement question](https://devforum.roblox.com/t/can-you-use-cframe-from-moon-animator-on-rigs-or-tween-the-movement-in-the-script-when-trying-to-do-skills-similar-to-most-battlegrounds-games/3310698) | Indexed Dec 2024/Jan 2025 creator question/reply about root snapback. Outdated physics/playback advice is not adopted. |
| C5 | [Improving Animation Asset Permissions](https://devforum.roblox.com/t/improving-animation-asset-permissions/3852101) | Indexed official July 31, 2025 Roblox announcement: Restricted assets and experience grants. |
| C6 | [Sharing Animation Assets with Connections and Groups](https://devforum.roblox.com/t/sharing-animation-assets-with-connections-and-groups/3892540) | Indexed official Aug 21, 2025 announcement and [page 2](https://devforum.roblox.com/t/sharing-animation-assets-with-connections-and-groups/3892540?page=2) staff reply of Apr 6, 2026 about bulk sharing beta. |
| C7 | [Partial-body/additive runtime layering request](https://devforum.roblox.com/t/better-runtime-support-for-partial-body-and-additive-animation-layering/4663688) | Indexed June 2026 feature request. Its example CreateAnimationLayer API is a proposal, not a shipped API. |
| C8 | [Graph multi-Animator crash report](https://devforum.roblox.com/t/animationgraphdefinitionanimationtrack-heap-crash-when-the-same-graph-asset-is-loaded-by-multiple-humanoid-animators/4660950) | Indexed May–June 2026 report, staff acknowledgment and author's local-definition/GraphName narrowing. No local reproduction. |

## What the existing tools already do

The Animation Editor authors rig poses, timing, easing, priority, loops and optimized keyframes. A loop does not automatically interpolate its last pose back to its first. The Curve Editor already supplies detailed channel/tangent editing and has meaningful Euler/quaternion conversion consequences. Rebuilding those editing functions would consume effort without addressing the main integration gap. [R1, R2]

Markers already carry names and string parameters; the same name may occur more than once in a clip. They are suitable for semantically named foot contacts, releases and other events. A marker's name is not a guarantee that its payload is valid or that a gameplay operation should execute. [R3]

Roblox now documents an Animation Graph Editor with published graph assets, additive composition, transitions and parameter-driven playback through Animator/AnimationTrack. Graph event weights can suppress events from zero-weight/non-primary inputs. Parameters and graph state have documented replication behavior that depends on Workspace authority mode. Its generated Animate hierarchy distinguishes NPCs from players; local unpublished preview is documented as unsupported in Server authority mode. Nexus should preserve a backend/capability distinction rather than assume that every track is a plain clip. [R4]

This makes “AI writes Play calls” and “visual animation state graph” insufficient product differentiation by themselves.

## Creator workflow findings

Jespone's authored tutorial starts with important poses, then adds the paths and timing between them, asymmetry and secondary motion, followed by polish. It describes animation as communicating character intent, not simply interpolation. Treat this as experienced practitioner guidance, not a universal claim that linear easing is wrong or that every action needs a long windup. [W1]

The Moon Animator author's chapter map spans rig setup, easing, prop attachment, camera work, import/export and markers. Nisky's chapter map adds onion skinning and anticipation. These establish relevant workflow coverage, but the footage was unavailable, so they do not establish measured quality or support reproducing uninspected techniques. [V1, V2]

Weapon animation needs a rig contract, not just a character rig label. H_mzah's example adds a Motor6D-linked handle and a separately articulated magazine; an accidentally retained Weld stopped the magazine from moving. Nexus should inspect actual joints, endpoints and rigid constraints, and retain required weapon attachments in resource metadata. [W3, W4]

The durable workflow should be: identify gameplay purpose and camera → inspect target rig/props → block key poses → establish contact/release windows → test rough motion in the actual controller → refine arcs, spacing and settle → check transitions and interruptions → publish/resolve permissions → test the published resource. This is a proposed Nexus workflow, informed by the sources rather than a claim that all professionals use identical stages.

## Why valid animation can feel weak

Cartwright's Skullgirls production slides emphasize clear key silhouettes, short player anticipation versus readable enemy tells, selective holds, overshoot/follow-through and early gameplay implementation. Their examples remove redundant frames to improve impact. This supports testing rough animation against game timing before polishing it. It does not establish a fixed frame count for Roblox actions. [P1]

The Just Cause 3 abstract describes the tension between responsiveness and time needed to convey momentum. The Uncharted 4 abstract describes a simulation layer over authored gameplay animation. Animation Mentor distinguishes interactive timing from film timing: a plausible anticipation can still feel unresponsive after input. [P2–P4]

Nexus critique should inspect these questions, with artistic feedback kept separate from deterministic validation:

| Principle | Practical review question | Useful product aid |
| --- | --- | --- |
| Anticipation → action | Does the first visible response acknowledge input? Does an enemy tell permit the intended response? | Display startup and first meaningful movement separately. |
| Timing versus spacing | Are important beats held long enough while the strike moves decisively? | Show source-time phases; compare variants without changing authority windows silently. |
| Posing/silhouette | Can the action, direction and weapon be read from the gameplay camera? | Rig preview from gameplay and side views; key-pose snapshots. |
| Arcs | Do hands, feet, head and weapon tips take plausible or intentionally stylized paths? | Optional motion trails in a verified preview surface. |
| Weight/momentum | Do support shifts and torso movement support the effort and direction? | Compare contact markers with body travel and foot slide. |
| Follow-through, overshoot, settle | Does motion continue after impact and return deliberately without excessive recovery? | Label impact and recovery separately; preview interruption during settle. |
| Exaggeration | Is intent legible at gameplay distance without losing the game's style? | Compare reference pose and variant at the real camera scale. |
| Asymmetry | Are limbs/body sections unnaturally synchronized? Is symmetry intentional? | Suggest overlap/offset; do not apply randomness to every joint. |
| Readability | Do animation, VFX, sound and camera agree about contact/release? | One semantic event trace across all participating systems. |
| Transitions | Does the next pose preserve stance, support foot and weapon alignment? | Preview state pairs, including interruption mid-blend. |

An AI should not label a clip “production ready” because its JSON is valid. Conversely, a style critique must not block valid intentionally robotic or minimal motion.

## Gameplay categories and distinct semantics

The following is a proposed design taxonomy. These are not engine-reserved marker names or universal balance values.

| Category | Playback and transition requirements | Semantic events and failure cases |
| --- | --- | --- |
| Idle | Loop/weighted variants; interrupt readily; coherent stance with locomotion. | Breathing/gesture are presentation; prevent variation changes from restarting every frame. |
| Walk, run, sprint | Loops driven by actual movement and stance; speed scaling, hysteresis around thresholds, phase-aware changes when available. | Footstep with side/material context; avoid duplicate contacts during blends and sliding from speed mismatch. |
| Jump | Finite takeoff; acknowledge input quickly; movement controller controls launch. | Takeoff presentation; not an unconditional authority impulse on every client marker. |
| Fall | Sustained airborne loop/state; distinguish walking off an edge from jumping. | No duration-based “land”; exit on actual landing evidence. |
| Land | Finite response chosen by impact/context; permit movement or cancellation according to design. | Land/Impact; do not impose a long universal movement lock. |
| Crouch | Enter, hold/locomotion and exit semantics; stance changes must match collision/controller behavior. | Clearance check belongs to movement logic; pose alone does not shrink collision. |
| Climb | Direction/speed-aware loop; pause when movement stops; exits reflect actual attachment/state. | Hand/foot contacts; avoid restarting on tiny velocity changes. |
| Swim | Separate moving and idle loops plus water entry/exit. | Splash/Stroke; water state, not arbitrary elapsed time, selects transitions. |
| Attack | Startup, active hit window, recovery; explicit interruption and movement policy. | HitStart, Impact, HitEnd; cleanup closes hitbox even if HitEnd is never reached. |
| Combo | Buffered intent, bounded ComboOpen/ComboClose window, ordered next state and reset policy. | Prevent stale input/old-track callbacks from advancing a later attack. |
| Block | Enter/hold/exit; sustained loop ends on release, depletion or interruption. | BlockRaise/Lower; server owns defense state. |
| Dodge | Finite movement/action state; distinct movement, defensive and recovery windows. | Invulnerability is a separate server rule, never inferred from how far the pose moved. |
| Parry | Narrow eligible window followed by success/failure recovery. | ParryOpen/Close; distinguish presentation from authoritative incoming-hit resolution. |
| Hit reaction | Direction/severity variants; selective interruption; restore prior locomotion/action policy. | Prevent repeated light flinch from creating a permanent lock. |
| Recoil | Short authored/procedural offset, often partial body and local camera. | Shot presentation; do not use visual recoil completion as the fire-rate authority. |
| Reload | Finite or staged; weapon-specific handling, attachment and cancellation policy. | ReloadInsert/Chamber; apply inventory/ammo mutation exactly once under authority. |
| Equip/unequip | Finite transitions with attachment/handoff points and cancellation paths. | EquipReady/Detach; swap models and restore grip consistently. |
| Interaction/pickup | Reach/contact/release; target identity and reservation; cancellation and disappearance handling. | Interact/Grip/Release; mutate chest/item once, sound/VFX tied to same accepted event. |
| Emote | Finite or looping, social/cosmetic; explicit movement/damage interruption. | Do not inherit combat locks simply because it uses Action priority. |
| NPC locomotion | Same resource/runtime contracts; driven by NPC movement and server lifecycle. | No dependency on LocalPlayer or player-only input scripts. |
| Creature | Custom bone/joint graph, support pattern and contacts; not an R15 joint-name assumption. | Per-limb contacts and body scale; unknown rig compatibility is not success. |
| Boss attack | Longer readable tell, committed active phase, interrupt/stagger rules, deliberate recovery. | Attack telegraph, HitStart/End, phase events; VFX radius/timing must match gameplay. |

## State-machine and event requirements

Epic's documentation separates state pose output from directional transition conditions. Unity's transition controls make time units, destination offset and interruption order explicit. These concepts transfer to Nexus; their APIs do not. [S1–S3]

Recommended Nexus contract:

1. Separate locomotion, action and presentation concerns. A locomotion change need not cancel an upper-body reload; a full-body stagger may suspend both. Model body/joint coverage explicitly and reject unsupported masking/additive requests instead of silently approximating them.
2. Give transitions a source, target, trigger/guard, deterministic precedence, blend duration and interruption policy. Report equally eligible conflicting transitions. Specify whether a same-state request restarts, queues, is ignored or changes parameters.
3. Keep gameplay action priority distinct from Roblox pose priority. `Action4` does not by itself mean “cannot be interrupted.” A state lock needs named release conditions and a bounded failure path.
4. Define marker instances as name, source-time position, value and stable identity. Repeated Footstep names are valid; matching only names loses which contact occurred. Imported markers must be distinguished from merely requested markers.
5. Define windows using named endpoints plus validated source times when known. Preserve source seconds and display effective time under playback speed. State explicitly whether cooldowns are wall-clock or animation-time based.
6. On exit, interruption, death, replacement, unloaded asset or destroyed rig: close gameplay windows, release reservations/locks, cancel obsolete action tokens and remove listeners. Missing end markers must never leave a hitbox or lock active.
7. Route marker events through a single dispatcher with state/action identity and authority policy. Animation-driven presentation can be local; damage, item transfer, ammunition and defensive outcomes require the gameplay authority's validation. A client marker is evidence of presentation progress, not permission to mutate game state.
8. Compile human-editable data plus a bounded runtime. Reuse cached tracks per Animator and resource revision, bind once, guard inactive tokens and clean up on replacement. Never build a new track on each frame or every attack.

Marker-based synchronization improves retiming and readability, but it is not sufficient alone: blends may suppress graph events, clips can fail to load, and interruption can prevent endpoint markers. Required windows need deterministic cleanup and observable missing-event diagnostics. Native graph and legacy track backends should report their capabilities separately.

## Authored versus procedural decisions

IKControl documentation explicitly supports environment-dependent reaches, aiming, hand placement and feet on terrain, with a chain that overrides underlying animation. Set `Enabled=false` to disable solving; `Weight=0` is not equivalent because smoothing/pole behavior may still affect the pose. [R6]

| Need | Preferred starting point | Nexus guardrail |
| --- | --- | --- |
| Expressive attacks, locomotion, emotes, reload choreography | Authored animation asset, reused when compatible. | Preserve silhouette/timing and marker provenance; do not replace with generic per-joint sine waves. |
| Door/panel/simple mechanical motion | TweenService or constrained mechanism as appropriate to the object. | Keep object motion, interaction authority and sound/VFX events in one action contract. |
| Variable hand target, head look, aim, feet on terrain | Authored base plus IK with bounded chain and blend. | Validate chain/target; avoid affecting the whole root unintentionally. |
| Recoil, breathing, small secondary offsets | Authored clip or carefully bounded procedural layer. | Declare which joints/camera are owned; avoid fighting Animator every frame. |
| Weapon alignment | Correct rig/attachments first, then authored handling and optional IK correction. | Verify weapon-specific joint requirements and rigid constraints. |
| Camera response | Separate local presentation channel coordinated by semantic event. | Do not weld camera timing to authoritative cooldowns; expose intensity/disable settings. |
| Dash, leap, attack displacement | Movement controller plus compatible animation; capability-gated native root-motion path only when verified. | Do not infer world movement from animated torso translation or apply it twice. |

Older DevForum dash questions show the gap between visible rig displacement and actual gameplay displacement. They are evidence for a clear movement policy, not proof that today's engine can never support root motion. Import settings also matter: Roblox warns that older external resources may use inconsistent scale/orientation. [W2, C4, R7]

## Pain points and product implications

| Evidence | Nexus response | Testable result |
| --- | --- | --- |
| C1: marker listeners connected repeatedly inside Running accumulated network work; author reported disconnection fixed it. | Bind once per track lifecycle and retain owned connection registry. | Repeated start/stop/speed changes keep listener/event counts bounded. |
| C2–C3: developers lacked attribution for accumulating/default Animate tracks. Reports disagree on exact loaded/playing limits. | Record resource/state that loaded each owned track; show owned versus external playing tracks. Avoid asserting an undocumented universal “256 loaded tracks” rule. | Soak test shows bounded own tracks and identifies external conflicts without stopping all tracks blindly. |
| W3–W4: animated props differ between authoring rig and game rig; extra weld blocks motion. | Joint/bone/prop contract and target inspection before deployment. | Validation names the missing joint or conflicting rigid connection. |
| C5–C6: historical re-upload/ownership friction; platform sharing now improved. | Store creator, provenance, experience grant, publishing/moderation and observed load state separately. | A shared, authorized resource is accepted even when owner differs from experience owner. |
| C7: runtime-selected partial-body composition remains cumbersome. | Preserve explicit body coverage and backend capabilities; use native graphs where verified. | Unsupported combinations receive a specific diagnostic, not invented APIs. |
| C8: graph preview definitions affected multi-rig loading in a creator report. | Test published playback and local preview separately on multiple rigs. | A capability/test report states which path was actually proved. |
| W5/P1/P4: smooth or technically valid movement may be slow, overanimated or visually weak. | Short feedback loop from gameplay preview to pose/timing revision. | Compare variants with the same controller/input semantics, not only standalone autoplay. |

Roblox's July 2025 announcement moved animations into Restricted asset permission handling: experience grants can permit other creators' animations and eliminate mandatory re-upload after ownership transfer. August added collaborator/group sharing; an April 2026 staff reply announced bulk sharing in the revamped Asset Manager beta. Nexus should integrate permission readiness and provenance rather than assume same-owner-only playback or claim bulk sharing does not exist. [C5, C6]

## What can Nexus do materially better than Animation Editor alone?

The strongest opportunity is a coherent path from gameplay intent to reusable, verified behavior:

- **Plan a complete set:** identify missing locomotion/action/interaction states, rig/weapon needs, intended style and transition relationships before creating assets.
- **Resolve resources semantically:** prioritize suitable private/project/shared assets; compare rig requirements, semantic role, movement speed, markers, source and access evidence rather than names alone.
- **Compile gameplay behavior:** produce understandable transitions, combo/cancel/recovery rules and authority-aware event dispatch from a structured plan.
- **Coordinate systems:** synchronize hit windows, prop handoffs, VFX, sound and camera using the same named event contracts, with interruption cleanup.
- **Validate before and after deployment:** distinguish declared metadata, inspected asset data and Studio observations; diagnose permissions, missing markers, incompatible rigs and lifecycle leaks.
- **Iterate in context:** preview state pairs and gameplay windows, swap compatible resources, compare timing variants and rerun a repeatable Studio scenario.

AI pose/timing critique is useful as an advisory layer when it can see actual motion. It is weaker value than these deterministic integration improvements if it only reads a title or AnimationId. A new general-purpose keyframe editor, unverified automatic rig retargeting, or unrestricted procedural replacement of authored motion is not justified by this evidence.

## Acceptance scenarios and unresolved questions

Proof must distinguish a generated definition from a published playable asset, and an isolated clip preview from a functioning gameplay system.

| Scenario | Required evidence |
| --- | --- |
| Locomotion | Idle/walk/run thresholds and speed, jump/fall/land from actual movement, blending trace, foot contacts, no per-frame restart. |
| Combat | Equip → attack → buffered second attack; hit reaction and dodge/block; HitStart/End, combo windows, interruption cleanup and repeated use. |
| Interaction | Targeted reach/contact; single accepted state mutation; matching sound/VFX; cancellation/disappearing target cleanup. |
| NPC/creature | Server-driven Animator under Humanoid or AnimationController as appropriate; custom rig requirements; no LocalPlayer dependency. |
| Resource replacement | Same-role compatible clip swap preserves semantic contract or reports missing markers; old listeners/tracks are retired. |
| Soak/multiplayer | Multiple rigs/players, many repeated actions, external Animate coexistence policy, bounded owned tracks/listeners, client presentation versus server result. |

Outstanding research/verification:

1. Watch the official Moon Animator tutorial and a gameplay-animation breakdown, or obtain transcripts through an available public route; descriptions alone cannot verify demonstrated technique.
2. Confirm graph/root-motion/authority capabilities on the installed Studio build and project settings; documentation does not prove local availability.
3. Measure marker delivery under blend, speed change, early stop, streaming/load failure and NPC replication. Do not assume identical event behavior across graph and plain-clip backends.
4. Inspect current imported/published clip metadata, especially marker preservation and rig mapping, through the actual pipeline.
5. Establish permission/moderation/load status with real assets. An ID's syntax and a cached owner field cannot prove access.
6. Measure performance on representative rigs and populations. Community reports establish failure modes but not a safe universal track count or IK budget.
7. Artistic quality still requires motion inspection from the gameplay camera; deterministic checks can validate structure, not appeal.
