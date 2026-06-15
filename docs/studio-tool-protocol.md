# Studio Tool Protocol

Protocol version: `2026-06-15`

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
- Coordination: `batch_operations` runs deterministic sub-operations and rolls back snapshots when `atomic` is true.

Writes should include `expectedSourceHash` when the caller previously read a script. The plugin rejects stale writes with `code: "source_conflict"`.

## Validation And Recovery

- `parse_luau`, `run_smoke_check`, `run_project_validation`, `collect_diagnostics`.
- `create_snapshot`, `restore_snapshot`, `undo_last_batch`.
- `run_test_service`, `run_play_test`, and `stop_play_test` return structured unsupported errors in the current plugin runtime.

## Manual Verification Checklist

1. Pair Studio from the web UI and confirm `/api/studio/status` shows the session.
2. Queue `get_project_manifest` and verify `_studioProjectManifestItems` is populated.
3. Queue `search_source` for a known token and verify only matching scripts are returned.
4. Queue `read_script`, then `write_script` with the returned hash and confirm source updates.
5. Edit the same script in Studio, retry the old `write_script`, and confirm `source_conflict`.
6. Queue `batch_operations` with create/update/delete operations and verify snapshots.
7. Queue `undo_last_batch` or `restore_snapshot` and confirm the hierarchy is restored.
