# Prompt 3 task-runtime dashboard and alert definitions

These definitions are the production packaging for the 17 release measures in
`operations-migration-and-flags.md`. Wire them to whatever log sink consumes
`[ops]` structured events (`telemetryVersion=task-runtime-observability-v1`).

## Log query contract

- Event names: `TASK_RUNTIME_EVENT_NAMES` in
  `backend/src/lib/taskRuntimeObservability.js`
- Correlation fields: `taskId`, `requestId`, `traceId`, `projectId`, `status`,
  `sequence`, `eventId`
- Forbidden keys (already scrubbed): authorization, cookie, password, secret,
  token, credential, private, prompt, source, body, email

## Required panels

| Panel | Derivation |
| --- | --- |
| Task completion rate | `task.completed` / (`task.completed` + `task.failed`) |
| Verified completion rate | verified `task.completed` / `task.completed` |
| Studio write success rate | verified Studio writes / terminal Studio writes |
| Command delivery success | `studio.command_delivered` / `studio.command_created` |
| Command ACK rate | `studio.command_acknowledged` / `studio.command_delivered` |
| Average retries | retry attempts / terminal tasks |
| Automatic recovery rate | recovered retryable failures / retryable failures |
| Intervention rate | waiting_user or operator-intervention tasks / accepted tasks |
| Studio disconnect recovery | resumed disconnects / disconnects |
| Checkpoint resume rate | `checkpoint.restored` success / restore attempts |
| Duplicate external action rate | duplicate provider side effects / external ops |
| Manifest conflict rate | `manifest.conflict_detected` / Studio write verifications |
| Unsupported capability rate | unsupported capability decisions / decisions |
| Incorrect project/universe rate | wrong-binding attempts / bound operations |
| Failure distribution | `task.failed` grouped by typed error category/code |
| Request → verified completion ms | `chat.request_received` → verified `task.completed` |
| Unverified reported complete | count of complete-without-verification (**must be 0**) |

## Release-blocking alerts

| Alert | Condition | Action |
| --- | --- | --- |
| Unverified complete | `unverifiedReportedCompleteCount > 0` | Freeze external writes; page on-call |
| Duplicate external action | any duplicate in release window | Freeze outbox/Roblox writes; reconcile |
| Incorrect binding | any wrong project/universe/place | Freeze Studio + Roblox writes |
| Observability gap | no `task.created` while canonical intake succeeds | Investigate emit path / sink |

## Staging acceptance

Before promoting a stage, capture a screenshot or export of these panels for the
evidence block in `staging-cutover-runbook.md`. Vocabulary alone is not evidence.
