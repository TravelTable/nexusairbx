# NexusRBX Quick Script Mode API

## Purpose

Quick Script is a focused generation path for one prompt and immediate Luau output. It does not use Agent Build planning, approval, or Studio orchestration. It is intended for:

- One focused script
- One contained feature
- Script debugging
- Code explanation
- Small modifications
- Simple GUI behavior
- Clear placement instructions

Agent Build remains the correct path for multi-file systems, broad game implementation, data persistence architecture, complex Studio changes, and requests that need plan approval.

## Generator Modes

Valid generator modes:

- `quick_script`
- `agent_build`

The backend exposes deterministic assessment through:

`POST /api/ai/generator-mode/assess`

Request:

```json
{
  "prompt": "Make a LocalScript that opens a shop frame when I press a button.",
  "generatorMode": "quick_script"
}
```

Response:

```json
{
  "ok": true,
  "selectedMode": "quick_script",
  "recommendedMode": "quick_script",
  "complexity": "simple",
  "reasons": ["quick_script_signals"],
  "upgradeRecommended": false
}
```

## Complexity Rules

Quick Script normally accepts prompts with focused signals:

- Single script, LocalScript, Script, ModuleScript, Luau
- Debug, fix, error, bug, explain, small change
- Simple UI/button behavior
- Clear Roblox placement such as `StarterPlayerScripts`, `ServerScriptService`, `ReplicatedStorage`, `StarterGui`, `Workspace`, or `StarterPack`

Agent Build is recommended when deterministic signals indicate:

- Complete game/project/experience request
- Multiple systems, scripts, assets, modules, or features
- DataStore or persistence architecture
- Economy, trading, quests, combat, round systems, pet systems, admin systems
- Studio/project/map/model/asset import work
- Client/server networking architecture
- Explicit plan, architecture, orchestration, approval, or multi-file request

If a user explicitly selects Quick Script for a clearly complex prompt, the backend returns `409 AGENT_BUILD_RECOMMENDED` instead of producing misleading partial output.

## Generate Quick Script

`POST /api/quick-script/generate`

Authentication:

- Optional Firebase auth.
- Anonymous users may generate one useful Quick Script result.
- Authenticated users use existing billing/free-usage controls.
- This endpoint never creates an account as a side effect.

Headers:

- `Authorization: Bearer <Firebase ID token>` optional
- `X-Nexus-Anonymous-User-Id` recommended for anonymous identity continuity
- `X-Nexus-Anonymous-Session-Id` recommended for session continuity
- `Idempotency-Key` optional

Request:

```json
{
  "prompt": "Make a Script that damages players when they touch a part named DamagePart.",
  "generatorMode": "quick_script"
}
```

Successful response:

```json
{
  "ok": true,
  "generatorMode": "quick_script",
  "recommendedMode": "quick_script",
  "complexity": "simple",
  "anonymous": true,
  "result": {
    "title": "Touch Damage",
    "language": "luau",
    "scriptType": "Script",
    "studioLocation": "ServerScriptService",
    "requiredObjects": ["A Part named DamagePart in Workspace"],
    "setup": ["Create the part and paste the script into ServerScriptService."],
    "testing": ["Run Play mode and touch DamagePart."],
    "limitations": ["Uses a fixed damage amount."],
    "assumptions": ["DamagePart already exists."],
    "code": "local part = workspace:WaitForChild(\"DamagePart\")\n..."
  },
  "claim": {
    "anonymousResultId": "doc_id",
    "claimToken": "qs_claim_token",
    "expiresAt": "2026-07-03T00:00:00.000Z"
  }
}
```

Upgrade recommendation:

```json
{
  "ok": false,
  "code": "AGENT_BUILD_RECOMMENDED",
  "message": "This request needs Agent Build so NexusRBX can plan the files, dependencies, and Studio changes before generating.",
  "selectedMode": "quick_script",
  "recommendedMode": "agent_build",
  "complexity": "complex",
  "reasons": ["broad_game_request", "agent_build_signals"]
}
```

Provider failure:

```json
{
  "ok": false,
  "code": "QUICK_SCRIPT_FAILED",
  "message": "Quick Script generation failed. Please try again.",
  "retryable": true
}
```

## Claim Anonymous Result

`POST /api/quick-script/claim`

Authentication is required.

Request:

```json
{
  "anonymousResultId": "doc_id",
  "claimToken": "qs_claim_token"
}
```

Response:

```json
{
  "ok": true,
  "quickScriptId": "doc_id",
  "result": {
    "title": "Touch Damage",
    "scriptType": "Script",
    "studioLocation": "ServerScriptService"
  }
}
```

Claimed scripts are stored under the authenticated user's `quick_scripts` collection. Anonymous temporary result records expire based on `QUICK_SCRIPT_RESULT_TTL_DAYS`.

## Anonymous Limit Strategy

Server-side controls:

- `QUICK_SCRIPT_ANON_LIMIT`, default `1`
- `QUICK_SCRIPT_ANON_IP_DAILY_LIMIT`, default `12`
- `QUICK_SCRIPT_RATE_LIMIT_WINDOW_MS`, default `60000`
- `QUICK_SCRIPT_RATE_LIMIT_MAX`, default `6`
- `QUICK_SCRIPT_MAX_PROMPT_CHARS`, default `5000`
- `QUICK_SCRIPT_MAX_OUTPUT_TOKENS`, default `2600`
- `QUICK_SCRIPT_RESULT_TTL_DAYS`, default `7`
- `QUICK_SCRIPT_USAGE_TTL_DAYS`, default `30`

The anonymous limit is enforced through hashed anonymous ID plus hashed IP/day counters. The client flag is never trusted. Provider failures release the anonymous reservation so a user is not charged for a failed attempt.

## Analytics

Server-side events:

- `generation_started`
- `generation_completed`
- `generation_failed`
- `anonymous_generation_limit_reached`
- `quick_script_upgrade_recommended`

Analytics payloads use `prompt_category`, `generator_mode`, `output_type`, latency, and error category. Full prompt text and generated code are never sent.

## Security And Cost Controls

- Provider credentials remain server-only.
- Bot trap fields reject obvious automated form posts.
- Public rate limiting applies before generation.
- Anonymous quota is server-side and transactional.
- Free/authenticated users still use existing free usage accounting.
- Paid users still use token entitlement checks and consumption.
- Complex prompts are not silently downgraded to partial Quick Script output.
