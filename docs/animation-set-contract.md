# AnimationSet v1 contract

Status: coordinated implementation contract after the 24 September 2026 audit. All durations and timestamps within animation playback use milliseconds. Server record timestamps use ISO-8601 strings. This is additive to existing single-clip MotionPlan/variant v1 records.

## Document

```json
{
  "schemaVersion": 1,
  "kind": "animation_set",
  "name": "Sword adventurer",
  "projectId": null,
  "actor": "player",
  "runtimeBackend": "tracks",
  "rig": { "type": "R15", "requiredJoints": [] },
  "resources": [],
  "layers": [{ "id": "locomotion", "initialState": "idle", "maxTracks": 2 }],
  "states": [],
  "transitions": [],
  "bindings": { "sounds": [], "vfx": [], "gameplay": [], "camera": [] }
}
```

Server record adds `id`, `ownerId`, `version`, `createdAt`, `updatedAt`, `validation`, and deployment receipts. Clients cannot replace these fields. Updates require `expectedVersion`; stale updates fail with `ANIMATION_VERSION_CONFLICT` and HTTP 409. Persistence checks and updates the version atomically. `actor` is `player`, `npc`, or `custom`. `runtimeBackend` is `tracks` or `graph`; graph is accepted for planning and fails compilation explicitly until supported.

## Resources

```json
{
  "id": "attack_one",
  "name": "First sword attack",
  "semanticRole": "attack",
  "scope": "private",
  "rigType": "R15",
  "requiredJoints": ["UpperTorso", "RightUpperArm"],
  "durationMs": 900,
  "loop": false,
  "priority": "Action",
  "style": "grounded",
  "weapon": "sword",
  "movementSpeed": null,
  "source": { "kind": "generated", "animationId": "anim_example", "variantId": "v1-example" },
  "robloxAssetId": null,
  "assetState": "draft",
  "ownership": { "creatorType": null, "creatorId": null, "universeId": null },
  "access": { "status": "unknown", "universeId": null, "checkedAt": null, "evidenceSource": null },
  "markers": [
    { "name": "HitStart", "timeMs": 300, "value": "sword" },
    { "name": "Impact", "timeMs": 380, "value": "" },
    { "name": "HitEnd", "timeMs": 460, "value": "" }
  ],
  "markerEvidence": { "status": "authored", "verifiedNames": [], "checkedAt": null, "evidenceSource": null }
}
```

`scope`: private/project/shared. `rigType`: R15/R6/custom. `source.kind`: generated/roblox_asset/library/imported/procedural. A `library` source uses `libraryRef`; a canonical resource may use `assetRecordId`. `assetState`: draft/studio_preview/ready/permission_required/moderation_pending/rejected. Valid priorities are Core, Idle, Movement, Action, Action2, Action3, Action4.

Inline `keyframes` may reuse the existing quaternion sequence format for local authoring/preview. It does not imply publication. An animation ID, declared creator, or user-supplied ready flag is not permission proof. Client-authored mutations normalize `access` back to unknown and `markerEvidence` to authored; trusted evidence is obtained and stored only by backend/Studio observation paths, bound to resource content hash, asset ID, and target universe.

Semantic roles are extensible bounded strings: idle, walk, run, sprint, jump, fall, land, crouch, climb, swim, equip, attack, combo, hit_reaction, block, dodge, parry, recoil, reload, unequip, interaction, pickup, emote, creature. Suitability uses structured fields first. Lookup order is suitable private, project, shared; only then a deliberate procedural/generation/import proposal.

## States and transitions

```json
{
  "id": "attack",
  "layerId": "action",
  "resourceId": "attack_one",
  "fadeInMs": 80,
  "fadeOutMs": 120,
  "speed": 1,
  "interruptible": true,
  "maxDurationMs": 1200,
  "windows": [{ "id": "sword_hit", "kind": "hit", "startMarker": "HitStart", "endMarker": "HitEnd" }],
  "events": [{ "marker": "Impact", "kind": "sound", "resourceId": "sword_impact" }]
}
```

Each layer has an initial state and bounded simultaneous-track budget. States may use `resourceId: null` for an explicit empty/rest state. Window kinds are hit/combo/cancel/invulnerable; endpoints must name authored markers in correct time order. An active non-looping action must have an ended transition or a bounded timeout exit. Looped actions need an explicit exit. Resource duration/speed informs runtime watchdogs.

```json
{ "id": "attack_to_ready", "from": "attack", "to": "ready", "trigger": "ended", "priority": 0, "blendMs": 120 }
```

Trigger is event/marker/ended. Event triggers require `event`; marker triggers require `marker`. Optional `windowId` identifies a window in the source state, and `bufferMs` (0–1000, default 250) bounds early input buffering. Transitions remain within their layer, unless future schema explicitly defines cross-layer semantics. Equal-priority duplicate trigger choices from one state are conflicts. Runtime requests use named events; window and interrupt policy decide whether a request is permitted. Safety cleanup and explicit forced cancellation must remain possible even if a state disallows ordinary interruption.

## Semantic bindings

`bindings.sounds`: `{id, assetRecordId?, robloxAssetId?, studioPath?}`.

`bindings.vfx`: `{id, assetRecordId?, studioPath?}`.

`bindings.gameplay`: `{id}` identifies an explicitly supplied server callback. `bindings.camera`: `{id}` identifies an explicitly supplied client presentation callback. State events reference these IDs through `resourceId`; `action` may be a bounded semantic payload string. No user-provided executable text enters bindings.

Paths and canonical asset references remain unresolved until inspected/resolved. The runtime emits semantic callbacks; gameplay authority is supplied by the server adapter. A client marker is presentation evidence and never sufficient authorization for damage, ammo, rewards, or interaction state.

## Bounds and deployment modes

V1 limits: 64 resources, 8 layers, 128 states, 512 transitions, 128 markers/resource, 32 windows/state, 64 events/state, 128 bindings/category, 120-character IDs, 120-second clips, 0.1–4 playback speed, 0–5000ms fades, at most 8 simultaneous tracks/layer and 16 total active tracks. Documents cap at 900KB before persistence. R15 authored keyframe deployment retains the existing sequence protocol limits unless explicitly extended.

Validation reports `{valid, errors:[{code,path,message}], warnings:[{code,path,message}]}`. Save allows an incomplete draft, but invalid structure/over-limit input is rejected. Validate separates authoring checks from deployment resource checks. Compilation/deployment refuses invalid structure, unsupported graph backend, incompatible rigs, unresolved runtime resources, denied permissions, unverified marker requirements, missing binding destinations, and unbounded action locks. Studio preview can use local KeyframeSequences, but must be labelled preview-only and cannot generate a production-ready receipt.

## Implemented API

All routes are under authenticated `/api/animations` and enforce set ownership and existing project access checks. Set-specific routes precede `/:animationId`.

| Route | Request / response |
| --- | --- |
| `GET /sets` | `projectId?` → `{sets}` summaries |
| `POST /sets`, `GET /sets/:setId` | `{set}` |
| `PUT /sets/:setId` | `{set,expectedVersion}` → `{set}`; atomic stale-write 409 |
| `POST /sets/plan` | `{prompt,projectId?,actor?,rigType?}` → persisted `{set}` |
| `POST /sets/:setId/validate` | `{mode:'authoring'|'preview'|'production',universeId?}` → `{validation}` |
| `POST /sets/:setId/compile` | `{mode:'preview'|'production',universeId?}` → `{artifact}` |
| `POST /sets/:setId/send-to-studio` | compile options + `{rigPath,sessionId?,applyMode?}` → `{deployment}` |
| `GET /sets/:setId/deployments/:id` | Advances receipt-dependent stages → `{deployment}` |
| `POST /sets/:setId/deployments/:id/preview` | `{action:'inspect'|'stop'|'restart'}` or `{operation:'request'|'state'|'speed'|'pause'|'resume',event?,stateId?,layerId?,speed?}` → queued `{preview}` |
| `GET /sets/:setId/deployments/:id/preview/:commandId` | Authenticated, exact deployment/rig command receipt → `{preview}` with current observed snapshot |
| `GET /resources/search` | `projectId?,q?,rigType?,semanticRole?` → `{resources,omissions}` |
| `POST /resources` | `{projectId,resource}` → canonical `{resource}` |
| `POST /resources/import` | multipart `file`, `projectId`, optional `name`, `semanticRole`, `rigType` → full animation `{resource}` |
| `POST /sets/:setId/inspect-resource` | `{resourceId,sessionId?}` → `{inspection:{commandId,resourceId,expectedVersion,status}}` |
| `POST /sets/:setId/apply-inspection` | `{resourceId,commandId,expectedVersion}` → observed-marker `{set}` |
| `POST /sets/:setId/probe-access` | `{resourceId,rigPath,sessionId?}` → `{probe:{commandId,resourceId,expectedVersion,status}}` |
| `POST /sets/:setId/apply-access-probe` | `{resourceId,commandId,expectedVersion}` → playback-evidence `{set}` |

The planner uses explicit semantic templates plus suitable accessible resources. Unfilled slots receive editable procedural motion; the response identifies `planning.method: semantic_template` and warns that poses require Studio review. It does not claim model-produced choreography.

## Receipts and evidence

Deployment namespaces include saved set revision, content and runtime source hashes. A durable deployment record queues one command at a time using stable idempotency keys. It inspects missing parent folders before creation, resolves the selected rig once, creates and locally registers sequences, writes each module with `createOnly`, reads exact source and write hash back, then attaches the preview registry. Returned sequence paths come from actual Studio receipts under the rig's `AnimSaves`. Failures stop dependent stages and preserve partial receipts; repeating the same request cannot overwrite its deployment history or duplicate scripts.

`applied` means the deployment stages succeeded. `previewAttached` and its timestamp/expiry record the historical attachment receipt, while preview inspect returns current `snapshot.running`, diagnostics, tracks, windows and connection counts. Preview expires after 120 seconds; explicit restart reattaches the recorded verified files and resources without rewriting scripts. Attachment and local registration never imply publication, production playback, or multiplayer replication.

Marker inspection and Play access probes are distinct. The backend persists an immutable server-issued observation with owner, set, version, resource fingerprint, asset ID, session and command ID. Applying evidence rechecks every binding and performs a version CAS. Changing the resource invalidates prior evidence. `GetAnimationClipAsync` observes marker metadata but leaves access unknown. Required remote markers must be observed before preview or production compilation; authored inline markers suffice only for local preview.

`probe_animation_asset` is an audited fixed operation in **Play Server**. It accepts a numeric published ID, requires a positive current `game.GameId`, loads and briefly plays an owned track on the chosen Animator, then cleans up. Only a successful receipt with actual server/running context, target universe, positive loaded length, matching ID and rig, played state and cleanup can set `access.allowed`. Edit previews, blank Place1, local temporary sequence IDs, claimed ownership and browser-supplied status fields cannot grant production access. A successful marker inspection should precede the access probe, because changed marker content changes the fingerprint.

## Import and rollout limits

Studio animation imports accept one `.rbxm` or `.rbxmx` KeyframeSequence and its animation hierarchy, at most 20MiB, with bounded instances and marker metadata. Scripts and unrelated model content are rejected. Private storage retains actual format/content type and canonical publication uses the existing asset publisher with Roblox type `Animation`; allocated IDs with pending/rejected moderation are not ready. Import creates `ready_to_publish`, then requires the existing publish workflow and observed markers/access before production use. CurveAnimation import and automatic adaptive retargeting are explicitly unsupported; rig labels alone do not prove joint compatibility. Graph metadata is accepted for planning, with graph compilation explicitly unsupported.

Deploy the two `animationSets` composite indexes from backend `firestore.indexes.json`. Until available, a missing-index error falls back to at most 100 owner-scoped records, filtered to the requested project and sorted in memory. This keeps authoring available during rollout but does not promise full recency coverage for owners with more than 100 sets; the indexed query provides that guarantee.
