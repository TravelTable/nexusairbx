# Studio Tool Protocol

Protocol version: `2026-06-18-phase8`

The backend validates every Studio command in `backend/src/lib/studioToolProtocol.js` before it is queued. The plugin acknowledges each command with a structured result containing:

- `success`, `ok`, `commandId`, `runId`, `stepId`
- `operation`, `affectedPaths`
- `previousHashes`, `resultingHashes`
- `warnings`, `diagnostics`, `output`
- `duration`, `snapshotIds`, `retryable`
- `error: { code, message, retryable }` when failed

## Discovery And Reads

- `get_project_manifest`: paginated manifest with canonical paths, classes, managed IDs, source hashes, property hashes, revision, and `nextCursor`.
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
- Uploaded model tools: `insert_uploaded_roblox_model` inserts one Phase 7 Roblox Model upload after backend ownership, moderation, access, creator, destination, and validation provenance checks.
- Coordination: `batch_operations` runs deterministic sub-operations and rolls back snapshots when `atomic` is true.

Writes should include `expectedSourceHash` when the caller previously read a script. The plugin rejects stale writes with `code: "source_conflict"`.

## Validation And Recovery

- `parse_luau`, `run_smoke_check`, `run_project_validation`, `collect_diagnostics`.
- `create_snapshot`, `restore_snapshot`, `undo_last_batch`.
- `run_test_service`, `run_play_test`, and `stop_play_test` return structured unsupported errors in the current plugin runtime.

## Manual Verification Checklist

1. Pair Studio from the web UI and confirm `/api/studio/status` shows the session.
2. Queue `get_project_manifest` and verify `_studioProjectManifestItems` is populated.
3. For paginated manifests, acknowledge the same page twice with different command IDs and confirm the item/page counts do not increase.
4. Queue `search_source` for a known token and verify only matching scripts are returned.
5. Queue `read_script`, then `write_script` with the returned hash and confirm source updates.
6. Edit the same script in Studio, retry the old `write_script`, and confirm `source_conflict`.
7. Queue `batch_operations` with create/update/delete operations and verify snapshots.
8. Queue `undo_last_batch` or `restore_snapshot` and confirm the hierarchy is restored.

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

## Uploaded Roblox Model Insertion

Phase 8 adds `insert_uploaded_roblox_model` as a mutating, non-destructive Studio command. The browser never constructs this command directly. The backend builds it only from a completed Phase 7 upload record owned by the authenticated Firebase user.

Official Roblox asset-loading documentation was checked on June 18, 2026. The plugin uses `AssetService:LoadAssetAsync(assetId)`, not `InsertService:LoadAsset`, and does not download asset binaries through NexusRBX. Roblox documents creator ownership/sharing restrictions and the third-party asset-loading setting for this API.

Eligibility rules:

- Upload record must belong to the authenticated user.
- Upload must have a verified Roblox asset ID and Model asset type.
- Upload status must be completed and moderation approved; pending moderation is blocked by default.
- Submission-unknown, failed, cancelled, rejected, deleted, invalid, and active upload states are rejected.
- Source validation provenance must remain compatible and have no hard failure status.
- Target Studio session must belong to the same Firebase user.
- Experience creator must come from trusted plugin session metadata, not the browser.
- Asset creator from the upload receipt must match the open experience creator unless a future trusted access check proves sharing.

The Studio session reports:

```json
{
  "placeId": "123456789",
  "universeId": "987654321",
  "experienceCreator": { "type": "user", "id": "111111111" }
}
```

Creator mismatch blocks insertion with `ASSET_CREATOR_MISMATCH`. Unknown creator metadata blocks with `EXPERIENCE_CREATOR_UNKNOWN`. NexusRBX does not change Roblox permissions, publish assets publicly, automatically share assets, or enable third-party asset loading.

Command payload:

```json
{
  "schemaVersion": 1,
  "insertionId": "rmi_...",
  "idempotencyKey": "uploaded-model-insertion:...",
  "uploadId": "upload_...",
  "robloxAssetId": "2205400862",
  "expectedAssetType": "Model",
  "expectedCreator": { "type": "user", "id": "111111111" },
  "expectedSourceSha256": "...",
  "requestedName": "Low Poly Tree",
  "targetParentPath": "Workspace/NexusImports",
  "placement": { "mode": "camera_focus", "position": null, "rotation": { "x": 0, "y": 0, "z": 0 } },
  "sanitizationMode": "strict",
  "anchoringMode": "anchor_all",
  "collisionMode": "visual_default",
  "validationSummary": {
    "totalTriangles": 12000,
    "largestMeshTriangles": 8000,
    "meshes": 2,
    "materials": 3,
    "textures": 4,
    "rulesVersion": "..."
  }
}
```

Allowed destinations are `Workspace/NexusImports`, `ReplicatedStorage/NexusImports`, and `ServerStorage/NexusImports` or safe descendants under those three roots. `ServerScriptService`, StarterPlayer script containers, CoreGui, protected/internal services, traversal syntax, and arbitrary service creation are rejected.

Strict quarantine behavior:

- `AssetService:LoadAssetAsync()` runs inside `pcall`.
- The returned hierarchy must remain unparented until scan, sanitization, validation, naming, anchoring/collision policy, and destination resolution succeed.
- `Script`, `LocalScript`, `ModuleScript`, all `LuaSourceContainer` descendants, remotes, unreliable remotes, bindables, and bindable functions are removed recursively.
- Tools, prompts, click detectors, humanoids, animators, sounds, package links, constraints, and unexpected behavioral objects are reported as warnings.
- Validation enforces usable visual content, no scripts/remotes/bindables, finite transforms/sizes, maximum 10,000 descendants, depth 64, 500 MeshParts, 1,000 BaseParts, and 500 constraints.

Placement modes are `camera_focus`, `origin`, `explicit_position`, and `selection_relative`. `anchor_all` is the default anchoring mode; `preserve` is available with a physics warning. Collision modes are `visual_default`, `preserve`, and `disable`; Phase 8 does not promise optimized collision generation.

Insertion is idempotent per Firebase user, Studio session, place, upload, asset ID, target path, name, placement, anchoring mode, and collision mode. Replayed commands return the existing inserted root instead of creating a duplicate. Failed insertion destroys the unparented hierarchy and removes empty destination folders created by that command.

Receipts are stored in `users/{uid}/robloxModelInsertions/{insertionId}` and include bounded scan counts, removed-object counts, placement, anchoring/collision changes, inserted path, warnings, and history status. They never store OAuth tokens, plugin tokens, GLB binaries, script source, signed URLs, or raw unbounded plugin payloads.

Common Phase 8 failure codes include `UPLOAD_NOT_FOUND`, `UPLOAD_NOT_OWNED`, `UPLOAD_NOT_COMPLETED`, `UPLOAD_SUBMISSION_UNKNOWN`, `ASSET_ID_MISSING`, `ASSET_TYPE_MISMATCH`, `ASSET_MODERATION_PENDING`, `ASSET_MODERATION_REJECTED`, `ASSET_NOT_ACCESSIBLE`, `EXPERIENCE_CREATOR_UNKNOWN`, `ASSET_CREATOR_MISMATCH`, `ASSET_NOT_SHARED_WITH_EXPERIENCE`, `ASSET_ACCESS_NOT_VERIFIED`, `PLUGIN_PROTOCOL_OUTDATED`, `ASSET_LOAD_FAILED`, `ASSET_LOAD_PERMISSION_DENIED`, `THIRD_PARTY_ASSETS_DISABLED`, `ASSET_TREE_TOO_LARGE`, `ASSET_TREE_TOO_DEEP`, `UNEXPECTED_ASSET_STRUCTURE`, `SANITIZATION_FAILED`, `NO_USABLE_VISUAL_CONTENT`, `INVALID_TARGET_PATH`, `PLACEMENT_FAILED`, `ROLLBACK_FAILED`, and `COMMAND_ALREADY_APPLIED`.

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
