# Chat attachments and build options

## Rollout

Attachments and model files are independently gated and default off.

| Layer | Attachments | Model upload/edit/insertion |
| --- | --- | --- |
| Backend | `CHAT_ATTACHMENTS_ENABLED=true` | `CHAT_MODEL_FILES_ENABLED=true` |
| Frontend build | `REACT_APP_CHAT_ATTACHMENTS=true` | `REACT_APP_CHAT_MODEL_FILES=true` |

Set `CHAT_ATTACHMENT_BUCKET` to a private Firebase/GCS bucket accessible by the backend service account. Existing asset/Firebase bucket settings are fallback values. The service account needs private object read/write/delete and signed-read-URL permission. No public bucket access or client storage rules are required. Install backend dependencies from its own lockfile.

Deploy the backend and rebuilt plugin before enabling model insertion. Build `.11-chat-model-files` advertises `import_model_file`; older accepted plugins retain their existing capabilities and return “Update plugin to insert models” for this workflow. No deployment or flag activation is included in this change.

## Data and API

`/api/attachments` authenticates every request. Upload one multipart `file` per request. The server validates the extension, actual bytes, UTF-8/JSON structure, image decoding, and model structure. Limits are 16 selected files, 20 MiB each and 100 MiB per message; the resolver checks the owned records' sizes. Supported types are PNG/JPEG/WebP, Lua/Luau, TXT, MD, JSON, RBXM and RBXMX.

Original bytes, manifests and image previews are stored under private `chat-attachments/<uid>/<attachmentId>/<versionId>/` prefixes. Firestore stores owner-scoped metadata and immutable versions under `users/<uid>/chatAttachments`. Message and queued-run references contain attachment ID, version ID and content hash. Editing creates a new version, with an optimistic version/hash check. Deleting a stored file tombstones its metadata and removes its private bytes; removing a composer card only changes the next message.

Endpoints include metadata/status, `/read` (query, line/column paging or instance ID/source offset), `/versions`, authenticated `/download`, deletion, `/insert`, `/import` status and `/undo-import`. `/api/ai/attachments/chat` streams file-reading/editing progress and persists completed versions before continuing. Request IDs bind transcript results; operation IDs prevent replaying an already accepted request. Upload retry, generation retry and insertion retry have separate actions.

The shared resolver is used by Ask, Plan, Build, artifact workers and legacy prompt selection. Historical files remain in the chat catalog, including named `@{filename}` references; explicit message versions take precedence over newer history. Initial context contains manifests and bounded text pages. Additional content is selectively read in file conversations. Deleted historical files produce an unavailable-file entry rather than breaking the next message. Images are actual image inputs, with explicit rejection when the selected model cannot accept them.

The composer supports picker, drop and pasted images, ready/failed cards, removal, retry and local draft recovery. Only ready immutable references are persisted across refresh. Uploads do not publish Roblox assets or change Studio. Upload-only messages inspect; Ask and Plan cannot execute the file agent's edit or insert actions. Uploaded text and comments are reference material.

## Model preservation and insertion

The installed binary parser handles RBXM. A separate XML adapter preserves the RBXMX document. Manifests expose stable instance paths within the file, typed properties, source hashes, hierarchy and asset references. Supported edits are names, existing properties and script source; reference/64-bit and complex XML edits that cannot be represented faithfully fail visibly. Inspection never executes embedded scripts.

Every export is reparsed and compared against its intended manifest. Some parser-supported models still fail faithful write/read round trips; these remain inspectable and downloadable, with editing visibly unavailable. Unknown binary sections/property types are rejected. Parsers run in workers with a 30-second timeout, 256 MiB JS heap, bounded stack, 50,000 objects and a 128 MiB declared decompression budget. Images have a 40-megapixel decode budget. Large text lines and scripts are paged with explicit continuation offsets.

Insertion uses an owned immutable version, target session, parent and hash. The backend signs a private download; signed URL rotation is excluded from the semantic idempotency hash. Supported XML properties are converted to a verified binary derivative. Unsupported XML conversions fail without publishing or modifying the original.

The plugin downloads and checks the bytes, deserializes with `SerializationService`, checks root counts, stages names and recovery snapshots, then parents the roots in Edit mode. Existing objects are not replaced. Import markers prevent duplicate insertion on reconnect; incomplete previous imports block rather than adding another copy. Backend verification requires the expected roots, content hash, target parent and identity checks. Saved cards poll the command result and expose snapshot-backed Undo. Insertion currently supports up to 500 top-level roots. Signed downloads expire after one hour; an expired delivery must be reconciled/retried through the command lifecycle rather than blindly repeated.

## Build settings

New settings use schema version 2: Automatic, Standard, destructive-change review off. The server captures build behavior on each Studio run. Automatic requested changes use existing snapshot and recovery gates. Quick prefers the bounded smoke check; Standard requires supported validation and readback; Playtest requires a supported playtest after application and can block with “changes applied” when unavailable. A successful application is distinct from passed tests.

Saved legacy combinations are normalized without silently enabling automatic writes. The legacy after-playtest apply policy and unusual destructive-review combinations remain visible in Advanced. Changes affect subsequent runs.

Build options has a fixed header, one scrolling body, stacked controls, Escape/focus restoration and viewport-aware sizing for narrow screens and zoom. Usage stays in Usage. Asset selection, publishing preferences and destination live in Assets.

## Verification and release gate

Validated on 2026-09-05: the full frontend suite passed (216 suites, 1,176 tests), the targeted backend/protocol suite passed (297 tests), backend syntax checks passed, and `npm run build` completed successfully. The plugin build passed its 61 contract tests and artifact verification. The design review reported no findings.

Automated checks cover format/size limits, private ownership, immutable edits, stale hashes, deletion, cancellation, history/version resolution, image inputs, read-only file modes, XML/binary round trips, unknown properties, decompression limits, paging and command idempotency/verification. Frontend tests cover upload retry/cancellation, draft recovery, settings and existing chat behavior. The plugin build runs its source contracts, handler and artifact checks.

Browser checks used the real components with sample attachment states: 390px viewport, 200% CSS zoom, keyboard opening, Escape focus restoration, a single scrolling body and scroll reset on reopen. No browser console errors were reported. The zoom check found and fixed a clipped header.

**Live Studio verification is still required before enabling the model flag.** The generated plugin has not been installed/reloaded and exercised in the open Studio session. Run the repository's `studio-tool-protocol.md` manual checklist plus the following:

1. Insert a binary model containing hierarchy, scripts and ObjectValue references into a disposable Edit-mode place. Confirm identity/parent checks, unchanged script contents, and snapshots in the acknowledgement.
2. Repeat the exact import across a dropped acknowledgement and reconnect. Confirm one copy. Simulate a partial prior import and confirm a visible blocked state.
3. Undo insertion; confirm the imported roots are removed and existing objects remain. Edit an imported root before Undo and confirm the snapshot conflict protection behaves correctly.
4. Insert supported XML and reject unsupported XML conversion. Try Play mode, an invalid parent, an expired download and an older plugin; confirm readable errors and no duplicate or partial application.
5. Exercise automatic destructive changes, snapshot failure, Review first, Manual, and unavailable/failed Playtest. Verify Ask and Plan leave Studio unchanged.

Watch `chat_attachment.ready`/`chat_attachment.failed` processing telemetry and existing Studio command lifecycle/verification telemetry filtered by `import_model_file`: processing failures, missing references, import failures, verification failures and idempotency replays. Keep the model flag off if any live verification case fails.
