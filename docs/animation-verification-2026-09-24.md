# Animation systems verification — 2026-09-24

## Research and implementation basis

The research gate preceded production implementation. See [research and requirements](animation-research-and-requirements.md), its linked API/workflow/audit reports, the [set contract](animation-set-contract.md), [runtime guide](animation-runtime.md) and [Studio verification procedure](studio-tool-protocol.md). The work extends the existing animation planner/compiler, resource registry, React preview, Studio transport and snapshot system.

The result is a persistent, versioned AnimationSet with rig/resource metadata, semantic states and layers, transitions, marker events, gameplay windows, reuse/import resolution, deterministic validation, readable Luau compilation and staged Studio deployment. Browser rendering remains an authored R15 clip preview. Roblox evaluates the compiled blends and state system in Studio.

## Actual Studio evidence

An unpublished Place1 was used through the installed official Studio MCP executable and the production local connector. Test fixture creation was isolated under `Workspace/NexusAnimationProof`. No experience or animation was published. Detailed ephemeral receipts remain under ignored `tmp/animation-proof`; source-controlled evidence is this account and the reproducible harness.

The first complete Edit and Play Server run passed:

- Twelve generated resources plus a separate marker-preservation clip were applied through the real compiler, protocol sanitizer and shared plugin/connector code. Marker names, payloads and exact milliseconds matched Studio readback.
- A real R15 Humanoid rig showed ten changing joint transforms. Idle → walk → run → jump → fall → land worked, with overlapping outgoing/incoming tracks and observed blend weights.
- Equip, attack, buffered second attack, hit reaction and dodge worked. Real AnimationTrack marker signals opened/closed hit, combo and dodge windows. Interruption closed the active window.
- Interaction Contact triggered the server callback, Sound playback and a ParticleEmitter. Completion restored the effect's prior enabled state.
- Speed adjustment changed the real AnimationTrack speed. Resource replacement discarded its previous owned tracks/connections and resumed through the runtime.
- Twenty-five repeated attacks kept `loadedTotal` at 14, the settled cache at 11 and connection count at 64. Disposal reduced owned cached tracks and connections to zero. After the engine completed disposal/fades, both rigs had zero actual playing tracks.
- A separate NPC rig used AnimationController + Animator and played movement/action layers together, with actual marker callbacks.
- Play Server repeated locomotion/combat/interaction/NPC under engine time, observing both attack impacts and the interaction contact. It stopped back to Edit mode afterward.
- The plugin's actual serialization/path/snapshot helpers ran inside Studio. Two identically named keyframes and their identically named markers restored exactly. A later creator marker edit and a new child under a created AnimSaves folder prevented destructive restore.

Live testing found and fixed delayed state completion, repeated sound retriggering, unnecessary allocation after nearly completed fades, and delayed engine signals during cached-track reuse. The test harness drains engine frames before asserting disposal; it does not confuse a pending fade with a permanent leak.

The fresh staged deployment completed **38/38 steps** through `AnimationSetDeploymentService` and the real local connector, including folder inspection/creation, twelve sequence registrations, four module writes with exact source readback, and actual preview attachment. Requesting walk, inspecting the persistent preview and stopping it worked. The complete Edit and Play scenarios then passed again. Play returned to Edit mode; its final diagnostics contained only the explicit notice that the existing Animate controller was preserved.

The staged run additionally exposed and fixed two boundary issues: an already completed queue admission must still have its receipt consumed, and official StudioMCP's exact missing-instance text must be recognized only when it names the requested destination. Unknown/permission read errors remain failures. Snapshot review also fixed enum-looking literal marker payloads and deferred folder-tree verification until children are restored.

A final targeted run deployed the current modules, attached the persistent preview, requested walk, inspected it and stopped it. The stop receipt reported zero actual Animator tracks, zero cached tracks, zero runtime connections and zero preview connections. Bounded frame draining now completes before the saved edit pose is restored. Marker-only keyframe renames also invalidate the guarded replacement fingerprint.

## Automated checks

- Backend protocol, animation and routes: 96 tests passed in the combined root run. These include executable Lua runtime/preview tests, invalid-resource/window/transition cases, immutable evidence, serialized sets, CAS saves and ordered deployment.
- Backend animation/import/asset validation/publisher/search suite: 89 passed, one credential-dependent live Gateway test skipped, no failures. This overlaps the animation suite above; the counts are not additive.
- Frontend: 20 focused tests and ESLint passed. The full React + 188-page Next build and public merge passed; the final React rebuild includes preview restart.
- Connector: 227 tests passed, including the actual missing-instance response regression; TypeScript, generated-source parity and build passed.
- Plugin: 87 passed and two environment-dependent tests skipped. Executable snapshot/fingerprint regressions and generated artifact checks passed.

## Browser evidence

An authenticated browser used the real local frontend and backend. It planned and persisted a combat set, changed state speed to 1.3, saved and validated it, compiled Luau, reloaded the app and reopened the same saved value. Semantic resource search returned the saved attack; resource replacement retained the set's gameplay windows and validated. Desktop at 1440px and phone at 390px had no horizontal overflow. R15 preview and marker seeking were exercised. The browser review did not substitute mocked API results for persistence.

This exposed two setup issues: an incompatible local nested native dependency left by dependency installation, and Firestore indexes not yet deployed. The compatible installed dependency resolution was restored without committing node_modules. The new indexes are declared, with a bounded owner-filtered query fallback during rollout.

## Limits retained explicitly

- Local temporary registrations prove actual animation behavior in this Studio session; they do not prove published asset ownership, moderation, grants or multiplayer replication. Production access uses a separate authenticated Play Server probe bound to the real published experience and exact resource identity. Unknown evidence remains unknown.
- The generated player adapter targets Automatic authority. Games using Server Authority or custom authoritative combat need their own server integration. Gameplay callbacks are explicit; client marker events do not authorize damage or rewards.
- Native Animation Graph compilation, root-motion automation and browser preview of arbitrary published/R6/bone/creature assets remain unsupported. They are not silently simulated as equivalent R15 output.
- Generated timing/pose drafts are editable starting points. Artistic polish, contact, silhouette and final game feel still require review on the intended rig. Accessible tutorial descriptions/chapters were researched; unavailable tutorial footage/transcripts were not claimed as watched.
- Seven existing asset-registry tests fail because their database fixtures expect users while current team billing queries project_team_links. The same failures were reproduced with Git HEAD's registry and test; they predate these changes.
