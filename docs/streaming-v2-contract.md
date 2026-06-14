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
- Payload: `{ jobId, seq, channel, text, ts }`
- `channel` values: `reasoning | content`
- `reasoning` carries the leading streamed thinking block for display only; the saved final payload uses `thought`.
- `seq` must be monotonically increasing per `jobId`

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
