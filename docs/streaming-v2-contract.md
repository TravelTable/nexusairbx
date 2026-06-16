# Streaming V2 Contract (Backend)

This frontend now supports live `delta` streaming for `/api/generate/stream`.

## Artifact job response
`POST /api/generate/artifact`

- Existing response fields remain unchanged.
- Optional additions used by client:
  - `streamVersion: "v2"`
  - `resultUrl: string` (absolute or relative URL for recovery lookup)

## SSE stream
`GET /api/generate/stream?jobId=...&token=...&mode=...`

Events:

1. `stage`
- Payload: `{ jobId, message, ts }`

2. `delta`
- Payload: `{ jobId, seq, channel, text?, event?, ts }`
- `channel` values: `reasoning | explanation | content | file_event`
- `reasoning` carries display-safe `<thinking>` / `<progress>` work-log text for live display only; the saved final payload may keep it as `thought` metadata, but artifact parsing strips these tags.
- `explanation` carries display-safe explanation text from the generated response.
- `file_event` carries live artifact file lifecycle events:
  - `file_start`: `{ event, fileId, id, name, path, placement, kind, purpose }`
  - `file_chunk`: `{ event, fileId, sequence, content }`
  - `file_end`: `{ event, fileId }`
  - `file_ready`: `{ event, file }`, emitted after backend normalization/repair/merge so the client can replace provisional content.
  - `file_rename`: `{ event, id?, fileId?, fromPath, toPath }`
  - `file_delete`: `{ event, id?, fileId?, path }`
- `seq` must be monotonically increasing per `jobId`
- Clients should merge `reasoning`, `stage`, `tool_step`, and `file_event` updates into one chronological work stream. The workspace file tree may still consume aggregate `files[]`, but pending chat should not render separate file-card dashboards.

3. `done`
- Payload: final canonical result payload currently consumed by client
- May include `steps[]` and `runId` when unified agent is enabled (see `docs/unified-agent-contract.md`)

4. `tool_step` (unified agent)
- Payload: `{ jobId, runId, step: { id, type, label, status, error, result, snapshotCount, requiresApproval }, ts }`
- Client upserts steps by `step.id`

5. `error`
- Payload: `{ jobId, code, message, retryable }`

## Recovery endpoint
`GET /api/generate/result?jobId=...`

- `202` when still processing
- `200` with final result payload when completed
- May also return `{ status: "pending" }` during processing

The client retries SSE, then falls back to this endpoint before failing.

## Chat project snapshot
Each chat owns a current materialized project at:

`users/{uid}/chats/{chatId}/project/current`

Shape:
- `artifactId: string`
- `revision: string`
- `title: string`
- `files: ArtifactFile[]`
- `updatedAt: Firestore timestamp`

Each successful generation also writes an audit record to:

`users/{uid}/chats/{chatId}/project_operations/{jobId}`

Shape:
- `operations: Array<{ type: "upsert" | "rename" | "delete", ... }>`
- `baseRevision: string | null`
- `resultRevision: string`
- `runId: string | null`
- `messageId: string | null`
- `createdAt: Firestore timestamp`

Clients should render `project/current` as the primary file tree. Assistant
messages remain generation history and may be replayed only as fallback when no
persisted project snapshot exists.
