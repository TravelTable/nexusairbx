# Studio Tool Protocol

Protocol version: `2026-06-17`

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
- Creator Store import: `insert_creator_store_asset` queues a verified public Creator Store `Model` or `Mesh` for strict sanitized insertion.
- Coordination: `batch_operations` runs deterministic sub-operations and rolls back snapshots when `atomic` is true.

Writes should include `expectedSourceHash` when the caller previously read a script. The plugin rejects stale writes with `code: "source_conflict"`.

## Creator Store Importing

The website imports existing Creator Store assets only. The browser sends an asset ID, optional connected Studio session, destination, requested name, and placement. The backend re-fetches Creator Store metadata with the user's Roblox OAuth connection and queues `insert_creator_store_asset`; it does not trust browser-supplied asset name, creator, type, source, URLs, or class names.

Default target is `Workspace/NexusImports`. Supported destination roots are `Workspace`, `ReplicatedStorage`, and `ServerStorage`. Phase 2 supports `Model` and `Mesh` assets, strict sanitization, and `camera_focus`, `origin`, or validated `explicit_position` placement.

Strict sanitization reduces risk; it does not guarantee an imported asset is harmless. The plugin uses `AssetService:LoadAssetAsync(assetId)`, keeps the returned object unparented while scanning, removes all `LuaSourceContainer` descendants and networking/bindable objects, flags behavioural objects, validates limits, and only then parents the sanitized root. It never calls `require()` and never reads or executes imported script source.

Initial import limits:

- Maximum descendants: `10,000`.
- Maximum tree depth: `64`.
- Frontend import rate: backend default `10` queued imports per user per minute via `CREATOR_STORE_IMPORT_RATE_MAX`.

Common failure codes:

- `STUDIO_SESSION_MISSING`: pair the Studio plugin before importing.
- `UNSUPPORTED_ASSET_TYPE`: only `Model` and `Mesh` are supported.
- `THIRD_PARTY_ASSETS_DISABLED`: open Roblox Studio Experience Settings and enable Allow Loading Third Party Assets.
- `ASSET_LOAD_FAILED` / `ASSET_NOT_ACCESSIBLE`: Roblox Studio could not load the asset.
- `ASSET_TREE_TOO_LARGE`, `ASSET_TREE_TOO_DEEP`, `NO_USABLE_CONTENT`, `SANITIZATION_FAILED`, `INVALID_TARGET_PATH`, `PLACEMENT_FAILED`.
- `COMMAND_ALREADY_APPLIED`: the same idempotency key was replayed and the plugin returned the previous receipt.

Phase 2 deliberately excludes paid generation, Meshy/fal/Replicate/Tripo/Rodin, new mesh generation, GLB/FBX upload, arbitrary URL fetching, unrestricted Luau execution, and runtime insertion for live players.

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
9. Queue `insert_creator_store_asset` for a plain model and confirm the asset is inserted under `Workspace/NexusImports`.
10. Repeat with a model containing nested scripts and RemoteEvents; confirm scripts/networking objects are removed and reported.
11. Disable Allow Loading Third Party Assets and confirm `THIRD_PARTY_ASSETS_DISABLED`.
12. Replay the same command/idempotency key and confirm a second copy is not inserted.

## Firestore Notes

- Manifest item documents now use deterministic SHA-256 IDs over `userId`, `sessionId`, `placeId`, `revision`, and `canonicalPath`.
- Manifest pages are keyed by logical cursor identity, not transport command ID.
- Deploy composite indexes from [`backend/firestore.indexes.json`](../backend/firestore.indexes.json) with `firebase deploy --only firestore:indexes`.
- New manifest writes use schema version `2`.
- Top-level legacy version-1 manifest documents can be reviewed or deleted with [`backend/scripts/cleanupLegacyStudioManifest.js`](../backend/scripts/cleanupLegacyStudioManifest.js).
- Legacy malformed nested item paths produced by slash-bearing version-1 document IDs are not enumerable through normal collection queries and require separate administrative cleanup.
