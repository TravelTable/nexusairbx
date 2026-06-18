# Phase 5 Model Validation

Phase 5 accepts private, self-contained `.glb` uploads and produces a bounded Roblox-oriented compatibility report. It does not upload files to Roblox, insert models into Studio, convert formats, optimize geometry, or add paid generation.

## MVP format

- Accepted: binary GLB containers using glTF 2.0 with embedded buffers and embedded PNG/JPEG images.
- Deferred: FBX, OBJ, textual glTF, ZIP/RAR/7z archives, Blender, and format conversion.
- Rejected: malformed GLB files, GLB version 1, external buffers, external images, network URLs, `file://` URLs, data URIs, and unsupported GLB chunks.

The UI wording is intentionally scoped to NexusRBX: Studio supports more import formats, but this Phase 5 NexusRBX validator accepts only `.glb`.

## Storage lifecycle

- Browser requests `POST /api/model-files/upload-sessions`.
- Backend creates `users/{uid}/modelFiles/{modelFileId}` with status `awaiting_upload`.
- Browser uploads directly to private Cloud Storage at `model-files/{uid}/{modelFileId}/source/model.glb` using a short-lived signed PUT URL.
- Browser calls `POST /api/model-files/:modelFileId/complete`.
- Backend verifies the stored object size, GLB header, declared GLB length, and SHA-256 before queueing validation.
- Reports are stored under the user record and optionally mirrored to `model-files/{uid}/{modelFileId}/reports/validation.json`.
- Users can delete uploads immediately. Expired uploads are cleaned up by the backend cleanup loop.

Default retention is 7 days (`MODEL_FILE_RETENTION_DAYS=7`).

## Rules version

Current rules are `roblox-general-2026-06`, checked against Roblox Creator Hub on 2026-06-18:

- Studio Importer supported formats: https://create.roblox.com/docs/studio/importer
- General mesh specifications: https://create.roblox.com/docs/art/modeling/specifications
- Model import dependency guidance: https://create.roblox.com/docs/parts/models

Official rule encoded in Phase 5:

- Individual meshes cannot exceed 20,000 triangles.

NexusRBX operational recommendations:

- Warn at 15,000 triangles per mesh.
- Recommend 18,000 triangles per mesh.

Passing validation means "likely compatible with the checked Roblox-oriented rules." It does not guarantee Roblox moderation approval, successful cloud upload, Studio visual appearance, collision behavior, avatar compatibility, or rig behavior.

## Limits

Defaults are configurable:

- `MODEL_FILE_MAX_BYTES=26214400`
- `MODEL_FILE_MAX_MESHES=200`
- `MODEL_FILE_MAX_NODES=5000`
- `MODEL_FILE_MAX_MATERIALS=100`
- `MODEL_FILE_MAX_TEXTURES=100`
- `MODEL_FILE_MAX_EMBEDDED_IMAGE_BYTES=16777216`
- `MODEL_FILE_MAX_TOTAL_IMAGE_BYTES=67108864`
- `MODEL_FILE_MAX_SCENES=20`
- `MODEL_FILE_MAX_TREE_DEPTH=128`
- `MODEL_FILE_MAX_TOTAL_TRIANGLES=1000000`
- `MODEL_FILE_VALIDATION_TIMEOUT_MS=30000`

Quota defaults:

- 10 upload sessions per user per hour.
- 5 active validation jobs.
- 250 MiB uploaded per user per day.
- 20 retained files per user.
- 7-day automatic retention.

## Statuses

Upload records use:

- `awaiting_upload`
- `uploaded`
- `queued`
- `validating`
- `valid`
- `valid_with_warnings`
- `invalid`
- `failed`
- `deleted`
- `expired`

Reports use:

- `compatible`
- `compatible_with_warnings`
- `incompatible`
- `validation_failed`

## Validation stages

Jobs report bounded stage values:

- `queued`
- `validating_container`
- `parsing`
- `analyzing_geometry`
- `analyzing_materials`
- `analyzing_textures`
- `building_report`
- `completed`
- `failed`
- `cancelled`

The UI displays real stages only and does not fabricate validation percentages.

## Security notes

- Files stay private in Cloud Storage.
- Users can access only `users/{uid}/modelFiles`.
- Browser MIME type and extension are advisory only.
- The backend verifies GLB magic, version, declared length, chunk bounds, object size, and SHA-256.
- Parser work runs in a bounded worker thread from a queued job, not inside the request lifecycle.
- External resources are rejected and preview URLs are issued only after validation confirms no external references.
- Binary GLB data is not stored in Firestore.
- Signed URLs are short-lived and are never persisted in audit records.
- Reports and issue lists are capped.
