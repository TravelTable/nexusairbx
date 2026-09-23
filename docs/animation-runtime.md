# Animation set runtime

The backend `AnimationSetCompiler` converts a resolved, validated AnimationSet into readable Luau modules and resource operations. It does not treat a declared asset ID, a successful upload request, or an edit-mode preview as proof that a published game can use the asset.

## Compiler interface

```js
const { compileAnimationSet } = require("./AnimationSetCompiler");
const artifact = compileAnimationSet(resolvedSet, {
  mode: "preview", // or production
  universeId: null,
});
```

The artifact contains `config`, `files`, `requiredResources`, `basePath`, `rigTag`, `warnings`, `version`, and `contentHash`. Each file has a `name`, `className`, canonical slash `targetPath`, and source. Namespaces include set identity, version, and content hash; authored sequence names also include a resource fingerprint. Changed revisions do not overwrite a previously deployed module or sequence.

Preview emits four inert ModuleScripts: `AnimationSetConfig`, `AnimationSetRuntime`, `AnimationSetController`, and `AnimationSetPreviewRegistry`. A `studio_sequence` resource operation preserves keyframes and markers for the existing Studio sequence protocol. Register the resulting sequence in the actual Studio session, then pass its temporary ID to the runtime. Published resources use `published_asset` operations. The current local sequence bridge supports R15 clips of 500–10000ms with 2–61 keyframes. Remote published clips may use other validated rigs and durations. The namespace fingerprint includes runtime source revisions, so compiler upgrades also deploy to a fresh folder.

Production additionally emits a server adapter and, for players, a client adapter. Production validation requires resource readiness and access/marker evidence bound to the resource fingerprint and target universe. Native animation graphs can be represented for planning, but this compiler explicitly rejects graph compilation until the graph construction/deployment adapter is implemented.

## Runtime interface

```lua
local Runtime = require(folder.AnimationSetRuntime)
local config = require(folder.AnimationSetConfig)
local runtime = Runtime.new(animator, config, {
    autoUpdate = true,
    isServer = true,
    animationIds = { attack = temporaryStudioId }, -- preview only
    onMarker = function(marker, controller) end,
    onWindow = function(window, controller) end,
    onEvent = function(event, controller) end,
    onState = function(state, controller) end,
    onDiagnostic = function(issue, controller) end,
})
runtime:Start()
runtime:Request("Attack")
```

`resolveAnimationId(resourceId, resource)` may be supplied instead of a map. The Animator must already exist under the correct server-created controller and be in Workspace. The runtime accepts any appropriate Animator rather than assuming a player or Humanoid.

| Method | Behavior |
| --- | --- |
| `Start()` | Enters every layer's initial state once. |
| `Request(event, payload)` | Chooses a named event transition; returns success and `transitioned`, `buffered`, or a rejection reason. |
| `Transition(stateId)` | Explicit state selection that respects interruption locks. |
| `ForceCancel(layerId?, reason?)` / `Cancel(...)` | Closes windows, drops buffered intent, and clears one/all layers even when locked. The caller can subsequently enter a recovery state with `Transition`. |
| `SetSpeed(layerId, speed)` | Adjusts the real track and recalculates its completion watchdog; supports 0.1–4. |
| `ReplaceResource(resourceId, replacement, animationId?)` | Validates required marker/window structure, cancels affected states, destroys old tracks/handlers, and restarts with the new resource. Optional temporary ID is local preview data. Remote readiness/evidence must first be revalidated by the backend. |
| `Update(dt)` | Advances watchdog/buffer time. Heartbeat calls this by default; `autoUpdate=false` allows deterministic Studio stepping. |
| `GetSnapshot()` | Reports state/windows, buffered input, actual track properties, owned cache/active counts, total Animator playing tracks, connection count, creation/destruction counters, marker/event totals, and bounded diagnostics. |
| `Destroy()` | Idempotently closes windows, disconnects listeners, and destroys owned tracks/Animation instances. |

An event transition can specify a source-state `windowId` and `bufferMs` up to 1000. Requests before the window opens are retained only until expiry, then consumed at the authored opening marker. Buffered intent is removed by interruption or resource replacement. An ordinary transition out of a locked state requires an open cancel window; explicit forced cancellation always remains available.

The runtime connects marker handlers once per cached track, uses playback identities to reject stale callbacks, and keeps no separate guessed hit timing chain. Required gameplay windows close on their end marker, loop boundaries, Stop, completion, cancellation, replacement, watchdog, or destruction. If an opening marker never arrives, no hit window opens. State maxDuration is a hard wall-clock safety bound, even when playback slows.

A thrown marker/window/event integration callback emits `CALLBACK_ERROR`, then cancels its layer and closes all windows. Recursive failures during cleanup are bounded. Deferred marker signals whose authored earliest time is still ahead of the new playback position are ignored, preventing an old queued marker from opening a newly reused track's window early.

The runtime limits simultaneous owned tracks to each layer's budget and 16 total, including fades. If a new action needs a slot, it trims a retired fade rather than a live state. The inactive cache is limited to 64 tracks. `Stopped` starts the authored successor while the previous pose fades; `Ended` releases retired fades. Fully stopped tracks at negligible weight settle into the cache even when Studio delays `Ended`. Fades that retain weight beyond their deadline are destroyed. Deferred completion signals cannot finish a reused playing track. External tracks are reported separately and are not blindly stopped.

## Integration controller

`AnimationSetController.Attach(rig, options)` wraps the runtime with optional Humanoid locomotion and concrete sound/VFX bindings. `options.config` can replace the generated default config. `options.start=false` defers initial playback; `options.locomotion=false` lets the game own all movement decisions.

- Slash and dot Studio paths resolve sound/ParticleEmitter/Trail/Beam bindings. Sound events restart the selected Sound from time zero or stop it; VFX bursts call Emit, while `on`/`off` changes are restored when the state exits or the controller is destroyed.
- Gameplay event callbacks are supplied in `options.gameplay[bindingId]` and invoked only in server context. Camera callbacks are supplied in `options.camera[bindingId]` and invoked only on the client. `onWindow` is an integration callback, not authorization for client damage.
- Humanoid adapters recognize semantic roles in `locomotion`/`movement` layers, include walk/run hysteresis, preserve a landing clip until completion, and restore the current locomotion intent afterward. A resource's authored movementSpeed controls playback-rate adaptation.
- Existing Animate behavior is preserved by default and reported. `defaultAnimatePolicy="disable"` is an explicit integration choice that disables only scripts within the rig's Animate controller and restores their previous Disabled values on destruction. Existing external tracks remain visible in diagnostics.
- Death and removal from Workspace dispose the controller. Sound instances created by this controller are destroyed; pre-existing effect Enabled values and script Disabled values are restored.

Generated NPC/custom adapters attach to rigs with the artifact's `rigTag`. Generated player adapters create the Animator on the server and start playback on the owning client in Automatic authority. Gameplay input, server authorization, and Server Authority prediction require the game's explicit adapter; the artifact warns about that boundary.

## Verification

The audited `preview_animation` command supports `register`, `attach_set`, `control`, `inspect`, and `stop`. Attach accepts a compiled `basePath` under `ReplicatedStorage/NexusAnimations`, a Workspace `rigPath`, and 1–64 `{resourceId, sequencePath}` or `{resourceId, assetId}` references. It verifies local marker names/times/values against the compiled config, registers clips, and starts the cached registry. Controls accept `request` (`event`), `state` (`stateId`), `speed` (`layerId`, `speed`), `pause`, and `resume`. Receipts include real runtime snapshots and bounded event history; rejected state/input requests return `accepted:false` with a reason.

The registry allows eight concurrent rigs per set, expires after 120 seconds by default (15–300 bounded override), and owns one Edit heartbeat per rig. It manually calls `Animator:StepAnimations` only in Edit, preserves joint transforms, disconnects and destroys its runtime on stop/expiry/removal or entry into Play, drains final fades, and restores the original pose. Edit cleanup permits up to eight 50ms animation steps with task resumptions so deferred engine destruction settles; it checks only its owned tracks and prevents concurrent reattachment during that drain. A rig ObjectValue references its owning registry so a changed set revision first stops the previous session. These ModuleScripts are inert when merely deployed; the attach command is the explicit playback action.

`probe_animation_asset` is a separate fixed operation: `{rigPath,assetId}` with a numeric published ID. The connector advertises it only when the discovered `execute_luau` schema allows `Server`, and invokes that exact datamodel. The shared handler requires a running server and positive place/universe IDs, waits up to five seconds for a real Animator track to load and advance at minimal pose weight, then stops/destroys its own track and Animation. Successful receipts bind asset, rig, actual universe/place, context, length, advancement, and cleanup. Edit inspection and temporary local IDs cannot satisfy this probe; trusted backend ingestion still checks resource/version/fingerprint/session identity.

`node --test src/services/animation/AnimationSetCompiler.test.js` checks deterministic serialization/compilation, asset-evidence gates, preview boundaries, published player/NPC adapters, graph rejection, and source syntax. It executes the actual runtime and controller in the Fengari Lua VM with deterministic Roblox signal/track doubles. Assertions cover marker-driven hit/effect events, combo buffering, 100 repeated attacks without track/connection growth, interruption, lost completion signals, loop cleanup, replacement, speed changes, fade budgets, client/server event identity, VFX restoration, rig removal, and locomotion hysteresis/landing recovery.

These tests do not simulate Roblox joint evaluation, asset delivery, sound rendering, or network replication. Those require the separate actual Studio connector acceptance run and, for publication/replication claims, a published target with suitable asset access and multiple clients.
