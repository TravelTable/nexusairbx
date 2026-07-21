# Canonical prompt migration and rollback

## Configuration

| Variable | Values | Purpose |
| --- | --- | --- |
| `NEXUS_PROMPT_MODE` | `legacy`, `shadow`, `internal`, `canonical` | Selects prompt ownership; defaults safely to `legacy` until a rollout stage is explicitly configured |
| `NEXUS_PROMPT_INTERNAL_USER_IDS` | Comma-separated authenticated user IDs | Cohort for `internal` mode |
| `LEGACY_UI_BUILDER_ENABLED` | Boolean | Keeps the isolated legacy UI Builder boundary available during measured deprecation; defaults to enabled |

## Staged rollout

1. `legacy`: execute only the current legacy prompt path.
2. `shadow`: execute the legacy path once and assemble canonical safe metadata for comparison. Never run a second provider/tool side-effect path.
3. `internal`: use canonical prompts only for the configured internal cohort; other users stay legacy.
4. `canonical`: use canonical assembly for primary AI modes.
5. After legacy UI usage is measured and callers are migrated, disable `LEGACY_UI_BUILDER_ENABLED` and schedule data-safe route removal separately.

Compare selected mode, tool names, context sections, plan binding, output contract, terminal status, verifier requirements, truncation and blocker type. Telemetry must contain safe metadata only, never hidden prompts, source, attachments, tokens or credentials.

## Effective Prompt Inspector

`GET /api/ai/prompt-inspector/:jobId` returns owner-scoped safe metadata: version/hash, route, call kind/mode/model, reasoning configuration, approved plan reference, task/project/place/Studio binding, tool names, section character counts, truncation, canonical/legacy path and verifier requirements. In production the caller must also be an administrator. Full assembled messages are available only through the service's test method.

## Rollback

Set `NEXUS_PROMPT_MODE=legacy` and restart the backend cohort. This changes prompt/routing ownership only. It does not delete or mutate tasks, plan versions, operations, Studio commands, snapshots or receipts. Keep `LEGACY_UI_BUILDER_ENABLED` independent so a canonical-prompt rollback does not silently widen or remove legacy UI access.

## Deployment order

1. Deploy backend storage/schema-tolerant readers and canonical services.
2. Configure the desired rollout mode and internal IDs.
3. Deploy the frontend plan-reference handoff.
4. Observe shadow/internal safe comparisons and verifier/blocker metrics.
5. Move primary modes to canonical, retaining the flag rollback.
6. Measure legacy UI traffic before disabling its boundary.
