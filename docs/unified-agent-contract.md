# Unified Agent Contract (Backend)

Merges chat generation and Studio tool execution into one agent run streamed over the existing artifact job + SSE transport.

## Artifact job request (extended)

`POST /api/generate/artifact`

Existing fields unchanged. Add:

```json
{
  "prompt": "string",
  "chatId": "string",
  "chatMode": "agent|plan|debug|ask",
  "studioEnabled": true,
  "applyMode": "manual_review|auto_after_approval|unrestricted_dev",
  "studioSessionId": "optional string"
}
```

- `studioEnabled`: client preference; backend only exposes Studio tools when `true` **and** a Studio session is connected.
- `applyMode`: gates destructive Studio tools (`write_script`, `create_instance`, `delete_instance`, `restore_snapshot`, `apply_artifact`).
  - `manual_review`: emit step with `status: "awaiting_approval"` until user calls approve-step.
  - `auto_after_approval` / `unrestricted_dev`: execute immediately.

Response may include:

```json
{
  "jobId": "string",
  "runId": "string",
  "streamVersion": "v2"
}
```

`runId` identifies the unified agent run for approve/restore endpoints.

## SSE stream (extended)

`GET /api/generate/stream?jobId=...&mode=...`

Existing events: `stage`, `delta`, `done`, `error`.

### New event: `tool_step`

Payload:

```json
{
  "jobId": "string",
  "runId": "string",
  "step": {
    "id": "string",
    "type": "generate_artifact|inspect_place|read_script|write_script|create_instance|delete_instance|restore_snapshot|run_smoke_check|apply_artifact",
    "label": "optional human label",
    "status": "queued|delivered|running|awaiting_approval|succeeded|failed",
    "error": "optional string",
    "result": {},
    "snapshotCount": 0,
    "requiresApproval": false
  },
  "ts": 1700000000000
}
```

- `step.id` must be stable; client upserts by id (idempotent replays on SSE reconnect).
- Emit status transitions as the run progresses.
- For Studio tools, enqueue on `/api/studio/commands` with `runId`, await plugin `ack`, then emit final `succeeded` or `failed`.

### Extended `done` payload

Include full step log:

```json
{
  "runId": "string",
  "steps": [ /* AgentToolStep[] */ ],
  "content": "string",
  "files": [],
  "artifactId": "string"
}
```

## Inline approval

`POST /api/ai/agent/:runId/approve-step`

```json
{ "stepId": "string" }
```

Response:

```json
{ "ok": true, "step": { /* updated step */ } }
```

After approval, backend executes the queued Studio command and emits further `tool_step` events on the active stream (or polls via run status if stream closed).

## Run-scoped restore

`POST /api/ai/agent/:runId/restore`

Response:

```json
{ "ok": true, "queued": true }
```

Queues `restore_snapshot` for all snapshots captured during the run.

## Tool registry

| Tool | Side effect | Gated by applyMode |
|------|-------------|-------------------|
| `generate_artifact` | Codegen worker | No |
| `inspect_place` | Read-only Studio | No |
| `read_script` | Read-only Studio | No |
| `run_smoke_check` | Read-only Studio | No |
| `write_script` | Mutating Studio | Yes |
| `create_instance` | Mutating Studio | Yes |
| `delete_instance` | Mutating Studio | Yes |
| `apply_artifact` | Mutating Studio | Yes |
| `restore_snapshot` | Mutating Studio | Yes |

## Deprecated endpoints

Replace with unified run (keep temporarily for legacy clients):

- `POST /api/studio/agent/start`
- `POST /api/studio/agent/:runId/continue`
- `GET /api/studio/agent/:runId`
- `POST /api/studio/agent/:runId/restore` → use `/api/ai/agent/:runId/restore`

## Agent loop (pseudocode)

```
run = createRun(chatId, prompt, studioEnabled, applyMode)
while not done and iteration < maxIterations:
  tool = llm.chooseTool(run.context, availableTools)
  if tool is destructive and applyMode == manual_review:
    emit tool_step(awaiting_approval)
    wait for approve-step
  execute tool (codegen or studio command queue)
  emit tool_step(succeeded|failed)
  update run.context
emit done(steps, artifacts)
```
