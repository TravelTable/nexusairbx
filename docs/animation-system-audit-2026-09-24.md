# Nexus animation backend audit — 24 September 2026

This audit inspected the current source before production changes. It describes implemented behavior, not Roblox API claims. Current API research is recorded separately.

## Repository and execution target

- Frontend/Studio repository: `C:/Users/jackt/Documents/Codex/2026-08-09/can/nexusairbx`.
- Active backend is its nested Git repository, `backend`, HEAD `362fef3863b4660ded22db0e383267c7bc6af943` on `main`. Its only initial untracked item was `patchverify/`; it had no tracked changes.
- Sibling `../nexusrbx-backend` is a different checkout at `8ee0d9b7a48b4e43ecc7311a6c4aead8700e583a`. It has untracked library data and `docs/vfx-lab.md`. Its animation service differs. It must not receive blind duplicate edits.
- `scripts/local-ai-dev.js:9` chooses `path.join(root, "backend")` and starts that working directory at line 98. Root package verification also targets the nested backend.
- Root contains numerous pre-existing untracked artifacts and modified presentation logs; none are animation source and none should be staged as part of this work. Environment values were not needed for this audit.

## Existing implemented animation path

`server.js:232` mounts authenticated `/api/animations`. `src/routes/animations.js:createAnimationRoutes` exposes list, library search, generation, individual read, refinement, and `send-to-studio`.

`src/services/animation/AnimationService.js:generate` searches the animation reference catalog, requests one MotionPlan, compiles three variants, and writes an independent animation record. `refine` repeats planning/compilation and appends history. Both already preserve model routing and use provider-usage billing; these should remain the single-clip authoring path.

`AnimationPlannerService.js:heuristicPlan`, `sanitizePlan`, `validatePlanQuality`, and `plan` implement bounded R15 pose planning, a deterministic fallback, loop closure, requested-body-part checks, model routing, repair attempts, and billing attribution. The planner reads its own `src/skills/roblox-r15-animation/` prompt/schema/authoring files. It recognizes idle, walk, run, crawl, jump, wave, dance, attack, emote, and custom. Fall/land/combat variants are not distinct structured gameplay concepts. “Creature” requests are currently R15 crawling, not arbitrary creature rig support.

`AnimationMotionCompiler.js:compileVariant` compiles sampled quaternion keyframes and hashes the document. It emits R15-only rotation channels, an in-place root, 500–10,000ms clips, automatic priority, loop closure, and three variants. It emits no markers, windows, transition rules, resource references, playback controller, or event bindings. Quality flags do not prove visual quality or live playback. Every joint is keyed, so future upper-body layers must deliberately omit untouched joints rather than fill them with identity rotations.

`AnimationRepository.js` stores full records in the top-level Firestore `animations` collection; memory storage is available for tests. Reads enforce owner identity. Updates are read-modify-write without a Firestore transaction or expected-version comparison. List queries apply Firestore limits before client sorting. The set editor needs transactional optimistic concurrency, explicit project scope, and bounded payloads.

`AnimationService.js:sendToStudio` queues `create_animation_sequence` through the current studio transport router with a content hash, expected sequence hash, idempotency key, selected variant, and manual-review default. It only returns a command receipt; it does not publish animation assets, record moderation/access evidence, wait for playback, deploy runtime code, or resolve a usable `AnimationId`.

## Resource architecture and reuse

1. `AnimationLibraryService.js:getCatalog/search` reads nine reviewed project-owned procedural archetype references from `data/animation-library/seed.catalog.json`. The lookup scores names/archetypes/tags. It does not select persisted private/project animations, inspect rig joints, validate markers, or resolve Roblox permissions.
2. `scripts/syncCc0AnimationLibrary.js` and `scripts/exportAnimationClipsToNexusLibrary.js` already pin source archives, bound extraction, check file/license hashes, derive semantic motion roles and pair hints, and export CC0 clips into the Nexus library. These clips remain **candidates awaiting retargeting**, correctly excluded from agent-ready animation search. Reuse provenance and candidate promotion rules; do not mark them runtime-ready merely because they are CC0.
3. `src/services/library/NexusLibraryService.js` handles immutable catalog revisions, source/license eligibility, semantic categories, rig/platform filters, and bounded safe JSON blueprints. `src/lib/nexusLibraryTools.js` exposes `search_nexus_library` and revision-bound `read_nexus_library_entry`; `StudioAgentService.js` and `AgentContextAssembler.js` already attach this context to general generation.
4. `data/nexus-library/seed/motion-and-feel.v1.json` already includes `animation.locomotion-intent-blending`, `animation.contact-aligned-interaction`, `animation.idle-context-layering`, and `animation.enemy-telegraph-commit-recover`. These contain useful explicit guidance for hysteresis, marker-driven contact, server-authoritative danger windows, cancellation, cleanup, crowd budgets, and separate action layers. They are design records, not executable runtime state machines.
5. Canonical asset registry and file publishing live in `src/services/assetPlatform/`. `AssetRegistryService.js:createAsset/getAsset/listSearchCandidates/recordUsage/recordStudioImplementation` already provide ownership, project/universe associations, versions, receipts, and external relationships. `AssetSearchService.js:structuredMatch/scopePriority/rankAssets` already ranks scoped assets and verifies reusable shared lifecycle. These are integration points rather than reasons to create a separate global asset store.
6. `src/lib/assetPlatform/contracts.js:ASSET_KINDS` currently excludes animation. `RobloxAssetPublishingService.js:ROBLOX_ASSET_TYPES` likewise excludes Animation, and `AssetValidationService.js` is file-type-specific. No claim of automatic animation publishing is supported by this pipeline today. Publishing lifecycle, creator authorization, idempotent operation reservation, outcome-unknown reconciliation, moderation tracking, and existing OAuth client are reusable, but a valid current upload format/API and proof must precede animation upload enablement.

## Gameplay, sound, VFX, and Studio

General generation uses `StudioAgentService`, the versioned Studio command contract, task runtime ownership/leases, and the Nexus design library. No executable animation-specific state machine or marker dispatcher was found in the inspected backend sources. Task-runtime state machines orchestrate backend jobs, not Roblox gameplay animations.

The Nexus library has audio-cue, VFX, feel, and gameplay pattern categories. Their blueprints already describe synchronization and cleanup. Existing UI asset generation explicitly warns when requested audio lacks a verified usable Roblox asset. There is no common implemented character animation timing system binding `GetMarkerReachedSignal` to sound/VFX/hitboxes.

`StudioAssetReferenceService.js:implementAsset/verifyAssetInStudio` and `src/lib/studioToolProtocol.js:ASSET_REFERENCE_TARGETS` already support exact `Animation.AnimationId` and `Sound.SoundId` property application and verification. Reuse these receipts for actual resource linkage. Do not mistake a successful property write for playback permission verification.

`studioToolProtocol.js:sanitizeAnimationSequencePayload` currently restricts sequence authoring to R15, ordered keyframes, normalized quaternions, 500–10,000ms duration, and known priorities. It ignores markers because no marker contract exists yet. Root audit owns plugin and local-connector findings, including pose-parent creation order and inspection gaps.

## Concrete integration plan

- Introduce a bounded, versioned `AnimationSet` alongside existing clips. Separate authored metadata from trusted Studio/backend observations. Keep time units in milliseconds until Luau emission.
- Resolve resources by scope, semantic role, rig/joints, expected duration/loop behavior, marker requirements, access and asset state; only then rank style/name. Existing clips remain reusable sources. Keep permission/moderation unknown until observed.
- Preserve source clips and human-editable set JSON. Compile sets into human-editable configuration plus one reusable Animator runtime. Cache tracks, route transitions through layers, guard interruptions/windows, and release every connection/track on actor removal.
- Give sound/VFX/gameplay bindings one semantic event path. Server gameplay callbacks must be explicit integration points, not arbitrary script text or a client marker authorization mechanism.
- Extend the current Studio command/protocol and receipt path for markers, rig inspection, preview, deployment, runtime evidence, and expected hashes. Distinguish Studio-only sequence preview from a published runtime asset.
- Add transaction-based expected-version updates for set editing. Add deterministic checks for references, marker availability, windows, graph exits, loop termination, transition conflicts, layer budgets, and resource compatibility.
- Reuse current model authoring/billing only after private/project/shared candidate resolution has failed; offer structured set templates without invoking paid generation just to create a state graph.

## Verification already present and gaps

Existing meaningful suites: `src/services/animation/AnimationService.test.js`, `AnimationMotionCompiler.test.js`, `AnimationLibraryService.test.js`, `src/services/library/AnimationLibraryIngestion.test.js`, `src/lib/studioToolProtocol.test.js`, canonical asset registry/search/publishing tests, and Studio reference service tests. They cover clip compilation, planner guards, persistence, queuing, provenance, and protocol sanitization. They do not prove live asset permissions, humanoid/NPC replication, gameplay marker timing, runtime cleanup, or actual Studio sequence construction. Those require new targeted deterministic tests plus real Studio evidence.

Audit baseline run: `node --test src/services/animation/AnimationService.test.js src/services/animation/AnimationMotionCompiler.test.js src/services/animation/AnimationLibraryService.test.js src/services/library/AnimationLibraryIngestion.test.js` passed 20 tests, failed none, and explicitly skipped the opt-in live Gateway smoke test. No live model generation was invoked.
