# AI Page V2 Backend Contract (Additive)

This frontend now supports two additive endpoints for AI page V2.

## 1) Route Classification
`POST /api/ui-builder/ai/route`

### Request
```json
{
  "prompt": "string",
  "attachments": [{ "type": "string", "isImage": true }],
  "activeMode": "general|ui|logic|...",
  "chatMode": "plan|act",
  "hasActiveUi": true
}
```

### Response
```json
{
  "action": "chat|pipeline|refine|lint|suggest_assets",
  "targetMode": "optional string",
  "normalizedPrompt": "optional string",
  "reason": "optional string"
}
```

Notes:
- Endpoint is best-effort; client has deterministic fallback heuristics.
- Deterministic heuristic routing is server-side (no LLM classifier in V2).
- Existing generation endpoints remain unchanged.

## 2) Telemetry Ingest
`POST /api/ui-builder/ai/telemetry`

### Request
```json
{
  "events": [
    {
      "sessionId": "string",
      "chatId": "optional string",
      "event": "string",
      "mode": "optional string",
      "chatMode": "optional string",
      "surface": "ai_page",
      "ts": 1700000000000,
      "metadata": { "any": "json" }
    }
  ]
}
```

### Response
```json
{
  "accepted": 3,
  "rejected": 0
}
```

Notes:
- Max `events[]` batch size is 50.
- Malformed payloads return `400` with details and no writes.
- Non-200 responses are ignored by client (best-effort telemetry).

## Core Events Emitted
- `ai_page_view`
- `quickstart_clicked`
- `prompt_submitted`
- `artifact_generated`
- `artifact_action_used`
- `task_completed`
