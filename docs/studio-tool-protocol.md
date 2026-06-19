# Studio Tool Protocol

Protocol version: `2026-06-19-phases1-9`

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
- Creator Store import: `insert_creator_store_asset` imports a server-verified Creator Store `Model` or `Mesh` through Studio asset loading, sanitizes executable/networking descendants while unparented, then places it under an allowed Studio destination.
- Uploaded Roblox model import: `insert_uploaded_roblox_model` inserts a trusted Phase 7 uploaded `Model` asset ID only after backend ownership/moderation/access checks, then uses the same unparented sanitization and atomic placement path.
- Coordination: `batch_operations` runs deterministic sub-operations and rolls back snapshots when `atomic` is true.

Writes should include `expectedSourceHash` when the caller previously read a script. The plugin rejects stale writes with `code: "source_conflict"`.

## Validation And Recovery

- `parse_luau`, `run_smoke_check`, `run_project_validation`, `collect_diagnostics`.
- `create_snapshot`, `restore_snapshot`, `undo_last_batch`.
- `run_test_service`, `run_play_test`, and `stop_play_test` return structured unsupported errors in the current plugin runtime.

## Studio Validation Quality Gate

Phase 9 adds an optional validation session workflow above the existing Studio commands. The browser calls authenticated backend routes under `/api/studio/validations/*`; the backend resolves the Studio session and target from server-held receipts, prepares a declarative `StudioValidationPlan`, queues existing read-only validation commands, stores a normalized report, and returns findings to the frontend.

Supported targets are:

- `managed_native_model`: resolved from a native model build or refinement receipt. Browser-supplied paths are ignored.
- `creator_store_import`: resolved from a stored Roblox operation/insertion receipt when that receipt has a trusted inserted Studio path.
- `uploaded_roblox_model`: resolved from a stored Roblox operation/insertion receipt when that receipt has a trusted inserted Studio path.
- `entire_project`: requires an explicit user choice and uses stricter object-count limits.

Profiles:

- `quick`: managed identity, hierarchy, script/networking object checks, references, transforms, bounds, duplicate managed IDs, and no playtest.
- `standard`: all quick checks plus physics, anchoring, collision, constraints, asset references, unsupported descendants, and performance counts. This is the default.
- `playtest`: standard checks plus explicit playtest intent. The current bridge returns `PLAYTEST_AUTOMATION_UNAVAILABLE` because bounded automatic stopping would require server-side test code to call `StudioTestService:EndTest`, and Phase 9 does not inject arbitrary Luau or modify the validated place.

`StudioValidationPlan` is JSON-compatible, schema-versioned, and contains only target identity, enabled checks, bounded limits, and playtest settings. It contains no executable source. Initial limits are controlled by:

- `STUDIO_VALIDATION_TIMEOUT_MS`, default `90000`.

Reports use statuses `passed`, `passed_with_warnings`, `failed`, `validation_error`, `cancelled`, and `timed_out`. Findings use severities `info`, `warning`, `error`, and `critical`; critical findings prevent a passed result. Reports include counts, bounds, runtime/playtest status, recommendations, rules version `studio-validation-1`, and a timestamp. They never include plugin tokens, Roblox OAuth tokens, full script source, unbounded output, or private chat content.

Validation never publishes the experience, saves/publishes changes, inserts models, generates Luau, executes ModuleScripts during static validation, applies recommendations, or claims the result is bug-free or Roblox moderation-approved. Recommendations are advisory and can feed a future separate, user-approved refinement flow.

Cancellation stores a `cancelled` report and does not modify the target. Timeout handling marks the session as non-passing and preserves diagnostics collected so far. Active validation requests are deduplicated with an idempotency key over Firebase UID, Studio session, place, target receipt/revision, profile, plan, and rules version.

Normalized error codes include `VALIDATION_TARGET_NOT_FOUND`, `VALIDATION_TARGET_NOT_OWNED`, `VALIDATION_TARGET_MISMATCH`, `VALIDATION_TARGET_CHANGED`, `VALIDATION_TARGET_TOO_LARGE`, `VALIDATION_SESSION_NOT_FOUND`, `VALIDATION_SESSION_NOT_OWNED`, `STUDIO_SESSION_MISSING`, `STUDIO_SESSION_DISCONNECTED`, `PLUGIN_PROTOCOL_OUTDATED`, `STATIC_VALIDATION_FAILED`, `DIAGNOSTIC_COLLECTION_FAILED`, `PLAYTEST_CONFIRMATION_REQUIRED`, `PLAYTEST_AUTOMATION_UNAVAILABLE`, `PLAYTEST_START_FAILED`, `PLAYTEST_STOP_FAILED`, `PLAYTEST_TIMEOUT`, `VALIDATION_TIMEOUT`, `VALIDATION_CANCELLED`, `VALIDATION_REPORT_FAILED`, `COMMAND_ALREADY_RUNNING`, and `VALIDATION_ALREADY_COMPLETED`.

Official Studio testing API verification: on 2026-06-18, Roblox Creator Hub documented `StudioTestService` as a plugin-accessible service for automated Test and Run mode testing, including `ExecutePlayModeAsync` and `EndTest`. The same documentation states `EndTest` must be called from the server DataModel of a running test. Because the NexusRBX bridge must not inject arbitrary test scripts or mutate content during validation, automated bounded playtest is intentionally unavailable in this phase; manual playtest recommendations are reported instead.

## Manual Verification Checklist

1. Pair Studio from the web UI and confirm `/api/studio/status` shows the session.
2. Queue `get_project_manifest` and verify `_studioProjectManifestItems` is populated.
3. For paginated manifests, acknowledge the same page twice with different command IDs and confirm the item/page counts do not increase.
4. Queue `search_source` for a known token and verify only matching scripts are returned.
5. Queue `read_script`, then `write_script` with the returned hash and confirm source updates.
6. Edit the same script in Studio, retry the old `write_script`, and confirm `source_conflict`.
7. Queue `batch_operations` with create/update/delete operations and verify snapshots.
8. Queue `undo_last_batch` or `restore_snapshot` and confirm the hierarchy is restored.
9. Queue `insert_creator_store_asset` for a public Model and confirm Studio inserts it under `Workspace/NexusImports` after removing scripts, remotes, and bindables.
10. Queue `insert_uploaded_roblox_model` from a trusted upload receipt and confirm Studio inserts only the backend-supplied asset ID.
11. Run `/api/studio/validations/prepare`, `/api/studio/validations`, and the report endpoint against a native model receipt and confirm stale browser paths are ignored.

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
