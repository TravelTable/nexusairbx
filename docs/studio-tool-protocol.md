# Studio Tool Protocol

Active protocol version: `2026-08-27-r15-animation`

Current plugin build: `nexusrbx-studio-0.14.0-r15-animation.2-ui`. The build
identity changed for UI artifact v3 even though the transport protocol version
did not; an older build must not receive a v3 `uiRoots` payload.

This protocol integrates Creator Store import, native model construction/refinement, trusted Roblox Open Cloud upload, server-owned asset-reference application, uploaded-model Studio insertion, the script execution-context quality gate, and the Phase 9 Studio validation quality gate. Uploaded assets, uploaded models, and validation targets must come from backend-held receipts; the browser never submits a trusted Roblox asset ID, Studio root path, inserted root path, model revision, insertion identity, or validation status for trusted commands.

The backend validates every Studio command in `backend/src/lib/studioToolProtocol.js` before it is queued. The plugin acknowledges each command with a structured result containing:

- `success`, `ok`, `commandId`, `runId`, `stepId`
- `operation`, `affectedPaths`
- `previousHashes`, `resultingHashes`
- `warnings`, `diagnostics`, `output`
- `duration`, `snapshotIds`, `retryable`
- `verification: { verified, source, evidence }` (additive, plugin >= 0.10.0):
  after a mutating command the plugin re-reads Studio and returns
  `source = "studio_readback"` with command-bound evidence. Evidence includes
  `commandType`, semantic `checks: [{ kind, path, ok, ... }]`, and applicable
  source hashes, revisions, affected paths, and snapshot IDs. Property,
  attribute, tag, instance-creation, and native-model commands must prove every
  requested value or operation; path existence and `affectedPaths` alone are
  not verification. A failed check or verifier error fails closed as
  `apply_unverified` (retryable). Top-level `verified` and
  `verificationChecks` remain compatibility fields for older backends, but the
  backend completion gate consumes the nested receipt.
- `placeSignature` (additive, on `get_project_manifest` results): a cheap
  top-level fingerprint of the place used by the backend to detect an unchanged
  project and skip a full re-index.
- `error: { code, message, retryable }` when failed

## Session Liveness

The backend owns plugin compatibility. Every first heartbeat includes the
release version, protocol version, build identity, exact command handlers,
capabilities, and an attestation fingerprint. The backend validates that data,
atomically repairs stale stored attestation, and acknowledges one of five
states: `compatible`, `repairing`, `degraded`, `update_required`, or `unknown`.
Only `compatible` and `degraded` sessions may poll commands.

Each account has one authoritative plugin session. Claiming a new plugin pair
code atomically marks every earlier connected plugin session as `replaced` and
updates the account singleton. A replaced token receives
`STUDIO_SESSION_REPLACED`; disconnect only clears the singleton when it still
names that exact session. MCP pairing is unchanged and never counts as the
primary plugin singleton.

Heartbeat and chat bootstrap responses include the authorized account
`activeProjectId`, project title, and revision marker. Projects are
organizational folders, not Studio target identities. The plugin refreshes its
conversation when this marker changes, while commands continue to use the
plugin-attested place, universe, target generation, and signature.

- `repairing` means the authenticated handshake has not completed. Clients show
  “Restoring Studio connection” and retry with bounded backoff and jitter.
- `degraded` keeps every advertised command available. An unavailable requested
  command fails with `studio_tool_unavailable` and includes the command and its
  required capability.
- `update_required` is reserved for a release, protocol, or build identity that
  the server release catalog does not accept. An older plugin session may
  continue to inspect its project, but AI mutations remain disabled until the
  current script-context release is installed. Only this state shows reinstall
  instructions.
- Network errors and missing compatibility data are never interpreted as an
  outdated plugin. Repeated identical attestations do not write to Firestore.

`GET /api/studio/plugin/release` exposes the server-owned current release and
temporarily accepted releases. The legacy `POST /api/studio/session/attestation`
endpoint remains available and uses the same validation and repair service as
the heartbeat endpoint.

- The plugin decouples polling from command execution: a poll/dispatch loop keeps
  `lastSeenAt` fresh (every authenticated request refreshes it) while a separate
  executor drains one command at a time, so long applies and approval prompts can
  never stall the connection.
- `POST /api/studio/session/ping` (plugin token) is a side-effect-free liveness
  ping. It refreshes `lastSeenAt` without claiming a command and accepts an
  optional `{ placeSignature, studio }` body used for manifest freshness and
  the compatibility handshake. Command polling starts only after the server
  acknowledges the attestation.

## Manifest Freshness

- `StudioManifestService.isRevisionFresh({ userId, sessionId, placeId, ttlMs, currentSignature })`
  gates re-indexing. A completed revision is reused when it is within the TTL
  (default 5 min, `STUDIO_MANIFEST_FRESH_TTL_MS`) and the place signature has not
  changed. A changed signature forces a re-index even inside the TTL. Callers:
  artifact refinement preflight, and the website (cache-first; explicit "Rescan"
  forces a live `get_project_manifest`).

## Discovery And Reads

- `get_project_manifest`: paginated manifest with canonical paths, classes, managed IDs, source hashes, property hashes, revision, and `nextCursor`. The plugin snapshots and deterministically sorts the first scan, then serves every continuation from that revision; missing or expired continuation revisions return structured retryable errors instead of rebuilding a different tree.
- `list_children`: children of one canonical path.
- `inspect_instances`: detailed metadata for selected paths.
- `search_project`: path/name/class search.
- `search_source`: script source search without returning all source by default.
- `read_script` / `read_scripts`: explicit full source reads.
- `read_instance` / `read_properties`: supported properties, attributes, and tags.
- `get_selection`, `get_studio_context`, `get_change_history`, `get_output_logs`.

## Mutations

- Script tools: `create_script`, `write_script`, `patch_script`, `rename_script`, `move_script`, `duplicate_script`, `delete_script`, `replace_in_files`.
- Instance tools: `create_instance`, `update_properties`, `update_attributes`, `update_tags`, `rename_instance`, `move_instance`, `duplicate_instance`, `delete_instance`.
- Native model tools: `build_native_model` constructs one validated editable Roblox-native model from a declarative `NativeModelSpec`; `inspect_native_model` and `apply_native_model_patch` support transactional refinement of managed native models.
- Creator Store import: `insert_creator_store_asset` imports a server-verified Creator Store `Model` or `Mesh` through Studio asset loading, sanitizes executable/networking descendants while unparented, then places it under an allowed Studio destination.
- Uploaded Roblox model import: `insert_uploaded_roblox_model` imports a backend-verified uploaded Roblox `Model` asset. The command can only be queued by the backend insertion review flow. The payload is generated from the trusted upload receipt and contains `uploadId`, `insertionId`, `assetId`, `assetName`, `assetType`, `targetParentPath`, `requestedName`, `placement`, `anchoredPolicy`, `collisionPolicy`, `sanitizationMode`, `trustedSource`, and `idempotencyKey`.
- R15 animation creation: `create_animation_sequence` accepts only a server-normalized animation document with 2–61 ordered keyframes, standard R15 joint names, normalized quaternions, in-place root motion, and a 0.5–10 second duration. The plugin uses the selected R15 rig when `rigPath` is omitted, snapshots `AnimSaves/<name>`, creates a native `KeyframeSequence`/`Keyframe`/`Pose` hierarchy, and verifies the sequence fingerprint and keyframe count after the write. Replacing an existing sequence requires its current Studio fingerprint.
- UI artifact v3: `apply_artifact` may carry one validated `uiRoots` entry that creates an editable managed `ScreenGui` tree under `StarterGui/NexusRBX_UI`. The browser never supplies HTML, CSS, JavaScript, or executable Luau for the tree; only the allowlisted document projection and separately validated generated runtime/hook scripts reach Studio.
- Asset references: `apply_asset_reference` applies one exact, server-trusted Roblox asset ID to one inspected Studio instance. Its backend-only payload is `{ path, className, property, robloxAssetId, assetRecordId }`. Allowed targets are `ImageLabel.Image`, `ImageButton.Image`, `Decal.Texture`, `Texture.Texture`, `MeshPart.MeshId`, `MeshPart.TextureID`, `SpecialMesh.MeshId`, `SpecialMesh.TextureId`, `Sound.SoundId`, and `Animation.AnimationId`. The plugin snapshots before mutation, writes `rbxassetid://<id>`, reads the property back, and returns the previous/current value, changed instance, and snapshot receipt. Generic property/create commands cannot bypass this server-owned path, and browser-supplied asset IDs are never authoritative.
- Coordination: `batch_operations` runs deterministic sub-operations and rolls back snapshots when `atomic` is true.

Every mutation of an existing `Script`, `LocalScript`, or `ModuleScript` must include the `expectedSourceHash` returned by the Studio read/manifest that informed the change. Missing preconditions fail with `expected_source_hash_required`; stale preconditions fail with `source_conflict`. Multi-file replacements carry an `expectedSourceHashes` map, and duplication also carries `expectedTargetSourceHash` when it replaces an existing script at the destination.

Mutation snapshots are mandatory; a caller-provided `snapshot: false` is ignored. The plugin snapshots both the target and any missing parent path segments before it mutates Studio. A failed mutation returns a rollback receipt. `rolledBack: true` is emitted only after every snapshot is restored and its pre-mutation state is verified; an incomplete restore fails with `rollback_failed` and includes the per-path restore errors.

Unknown top-level and nested command types fail with `STUDIO_TOOL_UNSUPPORTED`; they are never remapped to `inspect_place`. Plugin attestation advertises only executable handlers. `format_script`, `run_test_service`, `run_play_test`, and `stop_play_test` remain available only as structured compatibility errors for stale queued commands and are omitted from `supportedCommands`.

## UI Artifact v3

UI Creator compilation uses `apply_artifact` schema version `3`. The UI
document remains canonical; the payload is a reproducible projection for one
Studio apply and cannot be used to round-trip arbitrary Studio edits.

```json
{
  "schemaVersion": 3,
  "artifactId": "design_123",
  "revision": "9f0f4d4bb8c2f30cd0a19aa1",
  "kind": "ui",
  "uiRoots": [
    {
      "rootId": "main",
      "designId": "design_123",
      "targetPath": "StarterGui/NexusRBX_UI/Shop_UI",
      "expectedTreeHash": "a1b2c3d4",
      "replaceModifiedRoot": false,
      "treeHash": "<canonical-document-projection-sha256>",
      "documentRevision": "9f0f4d4bb8c2f30cd0a19aa1",
      "className": "ScreenGui",
      "properties": {
        "resetOnSpawn": false,
        "ignoreGuiInset": true,
        "displayOrder": 0,
        "enabled": true
      },
      "nodes": []
    }
  ],
  "files": [],
  "operations": []
}
```

V1 accepts exactly one root and at most 240 nodes with a maximum hierarchy
depth of 32. The root must be a direct child of `StarterGui/NexusRBX_UI`.
`artifactId`, `designId`, `rootId`, artifact `revision`, and
`documentRevision` are required and cross-checked. Node IDs must be stable and
unique; missing parents, cycles, unsupported classes, malformed constraints,
reserved top-level runtime names, additional roots, nested target paths, and
malformed hashes are rejected before queueing.

Allowed node classes are `Frame`, `TextLabel`, `TextButton`, `ImageLabel`,
`ImageButton`, `TextBox`, and `ScrollingFrame`. The projection also supports
the compiler-owned allowlisted decorators and constraints: list/grid layout,
padding, corners, strokes, two-stop gradients, aspect/size/text constraints,
and `UIScale`. Image properties accept only an empty value or a canonical
`rbxassetid://<positive-id>` reference resolved from the server-owned asset
record. `ViewportFrame`, world-space UI, arbitrary Instances, imported model
scripts, and document-provided executable code are rejected.

On first apply, the target must not exist. On later applies, the plugin requires
the opaque `treeHash` returned by the preceding successful Studio receipt as
`expectedTreeHash`. The hash covers the complete managed descendant hierarchy,
all properties emitted by the UI compiler, managed identity/revision
attributes, and generated script source. A changed property, renamed node,
added descendant, removed node, changed source, or changed managed identity
therefore returns `ui_tree_conflict` before mutation. A root at the target path
whose artifact, root, or design identity does not match returns
`ui_foreign_collision`. Omitting the prior hash for an existing root returns
`ui_tree_precondition_required`.

`StarterGui/NexusRBX_UI` is a shared Folder stamped `NexusUiContainer = true`.
The plugin may adopt an existing empty Folder after snapshotting it, but rejects
a non-Folder or a populated, unstamped container as a foreign collision.

`replaceModifiedRoot: true` is accepted only as the explicit “Replace Studio”
choice. It bypasses a missing/stale tree hash but never takes ownership of a
foreign root. “Keep Studio” performs no write. There is no implicit merge or
Studio-to-browser import in v1.

Before replacement, the plugin snapshots the complete previous root, including
nodes, UI decorators/constraints, attributes, tags, image references, and the
full source of generated scripts. The new native tree is created first; the
generated interaction `LocalScript` and editable hook `ModuleScript` are then
applied through the existing source-hash-aware artifact path. Any failure rolls
back all UI and script snapshots in reverse dependency order. A rollback is not
reported as successful until restored state hashes match the snapshots.

The success receipt includes `uiRoots` entries with the resolved path, root,
artifact and design identities, document revision, canonical document tree
hash, actual Studio tree hash, sorted node IDs, node count, and generated script
source hashes. It also includes the normal snapshot IDs and managed-file source
hashes. Command-bound verification re-resolves the root and independently
checks its class, identities, revision, exact node set/count, stored tree hash,
recomputed tree hash, and generated script source. UI-only artifacts therefore
produce an `artifact_ui_root` readback check instead of falling through to a
generic path-existence check.

## Script Execution Context Gate

Every generated or mutated script is validated from its complete descriptor:
`{ className, path, placement, kind, source }`. Quick Script, Agent Build,
generated artifacts, `/apply-artifact`, the Studio protocol, and the Roblox
plugin all use the same execution-context contract:

| Behavior | Required class | Executing container |
| --- | --- | --- |
| Player input, `LocalPlayer`, camera, GUI, render-step work | `LocalScript` | A supported client container |
| Data stores, server storage, messaging, trusted server services | `Script` | A supported server container |
| Reusable library | `ModuleScript` | Any supported module location; runtime is inherited from its requiring script |

API names found only inside comments or string literals do not affect the
result. Runnable scripts in `ServerStorage` are rejected because that container
does not execute them. `Script.RunContext = Client` is intentionally unsupported
in this release; client code is represented by `LocalScript`.

`create_script.className` is required. The backend may adjust only an
unambiguous class mismatch for a new script that can remain in its requested
location—for example, `Script` to `LocalScript` under
`StarterPlayerScripts` when the source uses input and `RenderStepped`. The result
must disclose the adjustment. The plugin never guesses a class, moves a script,
splits source, or repairs architecture.

Mixed client/server source is blocked and must be redesigned as separate client
and server scripts communicating through remotes. Ambiguous generated results
receive at most one AI repair attempt. A second invalid result is blocked before
any Studio command is queued.

Existing scripts preserve their class by default. An explicit conversion
requires all of:

- `allowClassChange: true`
- an inspected target with `inspectedClassName`
- the normal `expectedSourceHash` precondition
- a pre-mutation snapshot

Invalid commands return `SCRIPT_CONTEXT_MISMATCH` with validation metadata:
`status` (`valid`, `adjusted`, or `blocked`), `requiredContext` (`client`,
`server`, `module`, `mixed`, or `unknown`), `findings`, and `adjustments`.
Findings use stable codes including `SCRIPT_CLASS_REQUIRED`,
`CLIENT_API_ON_SERVER`, `SERVER_API_ON_CLIENT`,
`SCRIPT_LOCATION_MISMATCH`, and `MIXED_RUNTIME_CONTEXT`. Each finding includes a
severity, explanation, and an optional source line.

`run_project_validation` and `run_smoke_check` report context mistakes already
present in Studio. Privacy-safe telemetry records aggregate rule triggers,
automatic corrections, repair outcomes, and blocked results; it does not record
script source.

## Validation And Recovery

- `parse_luau`, `run_smoke_check`, `run_project_validation`, `collect_diagnostics`.
- `create_snapshot`, `restore_snapshot`, `undo_last_batch`.
- The plugin transport currently returns structured unsupported errors for `run_test_service`, `run_play_test`, and `stop_play_test`.
- The MCP connector maps play-mode transitions to `start_stop_play`, polls `get_studio_state` with bounded timeouts, and always attempts cleanup. `run_test_service` accepts only named audited profiles with bounded check IDs and explicit confirmation; no command accepts Luau source.

## Studio Validation Quality Gate

Phase 9 adds an optional validation session workflow above the existing Studio commands. The browser calls authenticated backend routes under `/api/studio/validations/*`; the backend resolves the Studio session and target from server-held receipts, prepares a declarative `StudioValidationPlan`, queues existing read-only validation commands, stores a normalized report, and returns findings to the frontend.

Supported targets are:

- `managed_native_model`: resolved from a native model build or refinement receipt. Browser-supplied paths are ignored.
- `creator_store_import`: resolved from a stored Roblox operation/insertion receipt when that receipt has a trusted inserted Studio path.
- `uploaded_roblox_model`: resolved from a stored Roblox operation/insertion receipt when that receipt has a trusted inserted Studio path.
- `entire_project`: requires an explicit user choice and uses stricter object-count limits.

Validation profiles:

- `quick`: managed identity, hierarchy, script/networking object checks, references, transforms, bounds, duplicate managed IDs, and no playtest.
- `standard`: all quick checks plus physics, anchoring, collision, constraints, asset references, unsupported descendants, and performance counts. This is the default.
- `playtest`: standard checks plus explicit playtest intent. It is available only on a mutation-ready MCP session with compatible playtest tools and a named audited test profile; plugin sessions continue to return `PLAYTEST_AUTOMATION_UNAVAILABLE`.

`StudioValidationPlan` is JSON-compatible, schema-versioned, and contains only trusted target identity, target receipt identity, expected target revision, enabled checks, bounded limits, playtest settings, and rules version. It contains no executable source, arbitrary property mutation, browser-controlled path, or Luau. Initial limits are controlled by:

- `STUDIO_VALIDATION_TIMEOUT_MS`, default `90000`.

Reports use statuses `passed`, `passed_with_warnings`, `failed`, `validation_error`, `cancelled`, and `timed_out`. Findings use severities `info`, `warning`, `error`, and `critical`; critical findings prevent a passed result. Reports include counts, bounds, runtime/playtest status, recommendations, rules version `studio-validation-1`, and a timestamp. They never include plugin tokens, Roblox OAuth tokens, full script source, unbounded output, or private chat content.

Validation never publishes the experience, saves/publishes changes, inserts models, generates Luau, executes ModuleScripts during static validation, applies recommendations, or claims the result is bug-free or Roblox moderation-approved. Recommendations are advisory and can feed a future separate, user-approved refinement flow.

Cancellation stores a `cancelled` report, marks outstanding validation commands cancelled, ignores late acknowledgements, and does not modify the target. Timeout handling persists a deadline, marks expired active sessions `timed_out`, invalidates outstanding validation commands, and preserves diagnostics collected so far. Active validation requests are deduplicated with an idempotency key over Firebase UID, Studio session, place, target receipt/revision, profile, plan, and rules version. Reruns use `POST /api/studio/validations/:validationSessionId/rerun`, create a new execution ID and command ID, preserve previous reports in history, and reject stale target revisions.

Normalized error codes include `VALIDATION_TARGET_NOT_FOUND`, `VALIDATION_TARGET_NOT_OWNED`, `VALIDATION_TARGET_MISMATCH`, `VALIDATION_TARGET_CHANGED`, `VALIDATION_TARGET_TOO_LARGE`, `VALIDATION_SESSION_NOT_FOUND`, `VALIDATION_SESSION_NOT_OWNED`, `STUDIO_SESSION_MISSING`, `STUDIO_SESSION_DISCONNECTED`, `PLUGIN_PROTOCOL_OUTDATED`, `STATIC_VALIDATION_FAILED`, `DIAGNOSTIC_COLLECTION_FAILED`, `PLAYTEST_CONFIRMATION_REQUIRED`, `PLAYTEST_AUTOMATION_UNAVAILABLE`, `PLAYTEST_START_FAILED`, `PLAYTEST_STOP_FAILED`, `PLAYTEST_TIMEOUT`, `VALIDATION_TIMEOUT`, `VALIDATION_CANCELLED`, `VALIDATION_REPORT_FAILED`, `COMMAND_ALREADY_RUNNING`, and `VALIDATION_ALREADY_COMPLETED`.

The MCP connector does not inject browser-supplied tests. Connector-owned test
profiles are versioned constant routines with strictly serialized inputs,
bounded duration, explicit confirmation, and guaranteed stop attempts. Unknown
profiles or check IDs fail closed.

## Manual Verification Checklist

1. Pair Studio from the web UI and confirm `/api/studio/status` shows the session.
2. Queue `get_project_manifest` and verify `_studioProjectManifestItems` is populated.
3. For paginated manifests, confirm all pages keep the first page's revision, contain no overlapping canonical paths, and that acknowledging the same page twice with different command IDs does not increase item/page counts.
4. Queue `search_source` for a known token and verify only matching scripts are returned.
5. Queue `read_script`, then `write_script` with the returned hash and confirm source updates. Inspect the acknowledgement and confirm its nested `verification` receipt names `write_script`, includes the baseline and read-back hashes, and has a successful `script_source` check before backend completion.
6. Edit the same script in Studio, retry the old `write_script`, and confirm `source_conflict`.
7. Queue `batch_operations` with create/update/delete operations and verify snapshots.
8. Queue `undo_last_batch` or `restore_snapshot` and confirm the hierarchy is restored.
9. Queue `insert_creator_store_asset` for a public Model and confirm Studio inserts it under `Workspace/NexusImports` after removing scripts, remotes, and bindables.
10. Confirm an uploaded-model insertion from a trusted upload receipt and confirm Studio receives `insert_uploaded_roblox_model` with only the backend-supplied asset ID under `Workspace/NexusImports`.
11. Run `/api/studio/validations/prepare`, `/api/studio/validations`, and the report endpoint against a native model receipt and confirm stale browser paths are ignored.
12. Select a complete R15 rig, queue `create_animation_sequence`, approve the manual-review prompt, and confirm `AnimSaves/<name>` contains a `KeyframeSequence` with `HumanoidRootPart` → `LowerTorso` → `UpperTorso` pose hierarchy.
13. Inspect the animation acknowledgement and confirm `verification.evidence` includes a successful `animation_sequence` check with matching sequence fingerprints and keyframe counts.
14. Edit or replace that sequence in Studio, retry an overwrite with the old `expectedSequenceHash`, and confirm `animation_sequence_conflict`. Then run `undo_last_batch` and verify the prior keyframe tree is restored.
12. Pair one Studio, then pair a second Studio to the same account. Confirm the first receives `STUDIO_SESSION_REPLACED`, the second is the only live plugin target, and no command can reach the revoked session.
13. Replace the stored session attestation with stale metadata, keep the current generated plugin installed, and confirm one successful heartbeat clears the warning without reinstalling, restarting, disconnecting, or re-pairing.
14. Repeat an identical heartbeat and confirm no attestation write occurs; remove one advertised command and confirm the session becomes `degraded` while another supported write still succeeds.
15. Queue the missing command and confirm claim-time validation returns `studio_tool_unavailable`; attest an unaccepted build identity and confirm no queued command reaches Studio.
16. On an MCP session, run one successful and one timed-out named playtest and confirm both return to Edit mode.
17. Apply a published image record to a known `ImageLabel.Image` with `apply_asset_reference`; confirm the acknowledgement contains a snapshot ID and an exact `rbxassetid://<id>` read-back, then confirm unrelated properties are unchanged.
18. Attempt `apply_asset_reference` with an unsupported class/property pair and attempt the same asset property through `update_properties`; confirm both fail before Studio mutation.
19. Attempt a known-script mutation without `expectedSourceHash`; confirm `expected_source_hash_required` and no Studio change.
20. Attempt to submit an unknown top-level command and an unknown nested batch command; confirm both return `STUDIO_TOOL_UNSUPPORTED` and neither triggers `inspect_place`.
21. Confirm plugin attestation omits `format_script`, `run_test_service`, `run_play_test`, and `stop_play_test`. Force an atomic batch failure after a successful mutation and confirm either a verified rollback receipt with `rolledBack: true`, or `rollback_failed` with restore errors; confirm auto-created parent folders are also removed.
22. Generate the Fly GUI as a `Script` under `StarterPlayer/StarterPlayerScripts` with `LocalPlayer`, `UserInputService`, and `RenderStepped`; confirm NexusRBX discloses an adjustment to `LocalScript`, keeps Push Studio enabled, and queues the adjusted class.
23. Press Play and confirm the Fly GUI appears. Verify its toggle, speed input, WASD, Space, and Ctrl controls.
24. Submit mixed client/server source and confirm one repair attempt is allowed, the second invalid result is blocked, and no Studio instance or source changes.
25. Put client API names only in comments and ordinary strings and confirm they do not change the inferred context. Then use `game:GetService("DataStoreService")` in executable code and confirm server context is detected.
26. Attempt to change an existing script class without `allowClassChange`, an inspected class, a source hash, or a snapshot; confirm each incomplete request fails before mutation. Confirm the fully explicit conversion succeeds only after inspection.
27. Connect an older plugin build and confirm project inspection remains available while AI mutations require the current plugin upgrade.
28. Open or create a website project and confirm a fresh chat opens without selecting a Roblox game. Send an Agent prompt and confirm it reaches the sole paired Studio regardless of legacy project place metadata.
29. Change the active website project while the plugin remains open. Confirm the next heartbeat refreshes the plugin conversation and plugin-submitted prompts appear only under the newly active project.
30. Disconnect the plugin and confirm Ask and Plan still work while Agent shows “Connect Studio to apply changes.” Pair MCP alone and confirm it does not become the primary Agent target.

### UI artifact v3 manual verification

1. Install the current `.2-ui` plugin build, pair Studio, create a UI design, and apply it. Confirm `StarterGui/NexusRBX_UI/<design>` is a native editable `ScreenGui`, not a Folder or an opaque model.
2. Inspect the root and nodes. Confirm the root has `AgentArtifactId`, `NexusRootId`, `NexusDesignId`, `NexusRevision`, `NexusDesiredTreeHash`, and `NexusTreeHash`; confirm every document node has `AgentArtifactId`, `NexusDesignId`, `NexusNodeId`, and `NexusRevision`.
3. Confirm `NexusInteractions` is a `LocalScript`, `Hooks` is a `ModuleScript`, their source hashes appear in both `managedFiles` and the UI-root receipt, and no other document-provided script was created.
4. Inspect the acknowledgement. Confirm `uiRoots[0]` contains the exact resolved path, node count and sorted node IDs, document revision/hash, Studio tree hash, and source hashes. Confirm `verification.evidence.checks` contains a successful `artifact_ui_root` check and successful generated-file checks.
5. Reapply the unchanged design with the previous receipt’s Studio tree hash. Confirm the apply succeeds, produces a complete pre-replacement snapshot set, and returns a new verified receipt without duplicate roots or runtime scripts.
6. Change one node property in Studio, then reapply with the old hash and `replaceModifiedRoot: false`. Confirm `ui_tree_conflict`, the current hash is returned, no snapshot is created, and nothing in the UI tree changes.
7. Choose Keep Studio and confirm no command is queued. Then choose Replace Studio, confirm the request sets `replaceModifiedRoot: true`, the complete prior tree is snapshotted, and the canonical Nexus tree replaces it.
8. Put an unmanaged `ScreenGui`, a Folder, or a managed root from another design at the target path. Confirm `ui_foreign_collision` even when explicit replacement is requested, with no mutation or ownership-attribute changes.
9. After a successful replacement, run `restore_snapshot` (or `undo_last_batch`). Confirm the previous ScreenGui, every node/decorator/constraint, image reference, attributes, tags, and both script sources return, and every restored state hash verifies.
10. Force a failure after the new tree is created but before all scripts finish (for example, with a controlled invalid test fixture). Confirm the command returns the specific UI mutation code plus a verified rollback receipt, and no partially applied root, script, or auto-created parent remains.
11. Manually change text wrapping/alignment, font, gradient color/transparency/rotation, padding, layout direction/alignment, a size/text constraint, `UIScale`, or a generated script source. Confirm each change produces a different tree hash and blocks a stale non-force apply.
12. Apply an image node with an unresolved/temporary URL and confirm the backend blocks Studio apply. Publish the image, compile again, and confirm Studio receives only the final `rbxassetid://<id>` value; attempt `rbxassetid://0` or an HTTP URL and confirm protocol validation removes/rejects it before Studio mutation.

## Firestore Notes

- Manifest item documents now use deterministic SHA-256 IDs over `userId`, `sessionId`, `placeId`, `revision`, and `canonicalPath`.
- Manifest pages are keyed by logical cursor identity, not transport command ID.
- Deploy composite indexes from [`backend/firestore.indexes.json`](../backend/firestore.indexes.json) with `firebase deploy --only firestore:indexes`.
- New manifest writes use schema version `2`.
- Top-level legacy version-1 manifest documents can be reviewed or deleted with [`backend/scripts/cleanupLegacyStudioManifest.js`](../backend/scripts/cleanupLegacyStudioManifest.js).

## Native Model Construction

`build_native_model` is a mutating, non-destructive Studio command. The website/backend queues exactly one command with:

```json
{
  "schemaVersion": 1,
  "idempotencyKey": "native-model:...",
  "spec": { "schemaVersion": 1, "modelId": "wooden-table", "root": { "className": "Model" } },
  "applyMode": "manual_review"
}
```

The spec is declarative JSON, not Luau. It supports editable Roblox-native structures made from `Model`, `Folder`, `Part`, `WedgePart`, `CornerWedgePart`, `TrussPart`, `Seat`, `VehicleSeat`, `SpawnLocation`, `Attachment`, safe value objects, safe lights/decals/textures/highlights/particle emitters, and allowlisted constraints. It does not support scripts, remotes, arbitrary services, mesh imports, CSG, terrain, rigs, vehicles, runtime code, or paid mesh generation providers.

Properties are class-specific allowlists. Typed values use JSON forms such as `{"$type":"Vector3","x":1,"y":2,"z":3}`, `Color3`, `CFrame`, `Enum`, `NumberRange`, and limited `NumberSequence`. Unknown classes, unknown properties, invalid enum values, NaN/Infinity, negative sizes, unsafe asset IDs, duplicate IDs, external references, and missing internal references reject the build before Studio receives it.

Default BasePart behavior is conservative: anchored, collidable/queryable/touchable, casts shadows, zero transparency, and not massless unless the spec overrides an allowed property.

Initial limits are 750 total instances, 400 BaseParts, 150 constraints, 300 attachments, 50 lights, 30 particle emitters, tree depth 32, and 4096 studs maximum extent on any axis. The backend and plugin both enforce limits.

Allowed destinations are `Workspace`, `ReplicatedStorage`, and `ServerStorage`; the frontend defaults to `Workspace/NexusBuilds`. Placement modes are `camera_focus`, `origin`, `explicit_position`, and `selection_relative`. The plugin builds the hierarchy while unparented, resolves references, creates the destination only after validation, parents the completed model, then calls `Model:PivotTo()` once.

Receipts include the inserted root path, counts, bounds, placement mode, warnings, and history status. Idempotent replay returns the existing generated model instead of creating a duplicate. Failures destroy the unparented hierarchy and remove empty destination folders created by the failed command.

Common failure codes include `INVALID_SPEC`, `UNSUPPORTED_CLASS`, `UNSUPPORTED_PROPERTY`, `INVALID_PROPERTY_VALUE`, `INVALID_REFERENCE`, `DUPLICATE_INSTANCE_ID`, `INSTANCE_LIMIT_EXCEEDED`, `PART_LIMIT_EXCEEDED`, `CONSTRAINT_LIMIT_EXCEEDED`, `TREE_DEPTH_EXCEEDED`, `BOUNDS_LIMIT_EXCEEDED`, `INVALID_TARGET_PATH`, `STUDIO_SESSION_MISSING`, `BUILD_FAILED`, `PLACEMENT_FAILED`, and `COMMAND_ALREADY_APPLIED`.
- Legacy malformed nested item paths produced by slash-bearing version-1 document IDs are not enumerable through normal collection queries and require separate administrative cleanup.

## Native Model Refinement

Managed native model roots carry `NexusGenerated`, `NexusManaged`, `NexusModelId`, `NexusCommandId`, `NexusLastCommandId`, `NexusSchemaVersion`, and `NexusRevision`. Every generated descendant carries a stable `NexusInstanceId`; edits target these IDs, not mutable names or arbitrary Studio paths.

`inspect_native_model` is read-only. It accepts `modelPath` and `expectedModelId`, verifies the root is Nexus-managed, and returns a bounded allowlisted snapshot with model ID, revision, root path/name, counts, bounds, normalized instances, and warnings for missing/duplicate IDs or unsupported descendants. It never returns script source or plugin tokens. The backend stores successful inspections as 10-minute server-held records and returns an `inspectionId`; patch validation uses that reference instead of trusting browser-submitted snapshots.

`NativeModelPatch` is declarative JSON:

```json
{
  "schemaVersion": 1,
  "modelId": "market-stall",
  "expectedRevision": "rev_...",
  "summary": "Make the roof red",
  "operations": [
    { "op": "set_properties", "targetId": "roof-left", "properties": { "Color": { "$type": "Color3", "r": 1, "g": 0, "b": 0 } } }
  ]
}
```

Supported operations are `set_properties`, `set_attributes`, `rename`, `transform`, `resize`, `add_instance`, `remove_instance`, `duplicate_instance`, `move_instance`, `replace_instance`, `set_tags`, and `transform_model`. Removals require `recursive: true` when descendants exist and a separate `destructiveConfirmed` flag before apply. The managed root cannot be removed through normal refinement.

The backend validates schema version, model ID, expected revision, operation count, target IDs, new IDs, class/property allowlists, typed values, transforms, duplicate IDs, removed-target conflicts, estimated counts, estimated bounds, code-bearing fields, and arbitrary URLs. It then generates a human-readable diff with added/removed/modified counts and bounds before/after. The browser must show this diff for approval; raw patch JSON is not required for normal review.

`apply_native_model_patch` is one typed mutating command for the complete patch. The plugin re-verifies model identity, managed metadata, expected revision, targets, and allowlists. It snapshots/clones the managed root before applying, applies the patch deterministically, updates `NexusRevision` only after success, records one logical history/snapshot entry, and returns a structured receipt with `previousRevision`, `newRevision`, operation counts, affected IDs, counts/bounds after, warnings, and history status. If any step fails, the plugin restores the complete pre-edit model and does not increment the revision.

Revision conflicts return `MODEL_REVISION_CONFLICT` with the stale expected revision and current revision. The frontend should disable apply, show that Studio changed the model, and offer Refresh/Recalculate/Cancel. There is no force-overwrite flow in Phase 4.

Unsupported edits include generated Luau, script or remote creation, Terrain, MeshPart/external mesh upload, CSG, arbitrary property paths, raw CFrame matrices from the browser, cross-model references, reparenting to Roblox services, editing unmanaged objects by default, and taking ownership of arbitrary project objects. NexusRBX edits models it manages; manually added descendants are reported as warnings instead of silently modified.
