# Unified AI architecture implementation report

Report date: 2026-07-21.

## Files changed

Backend prompt/routing ownership:

- `src/services/NexusAgentPromptService.js`
- `src/services/PromptRolloutService.js`
- `src/lib/runtimeFeatureFlags.js`
- `src/lib/intentClassifier.js`, `src/lib/personas.js`, `src/lib/safetyIntentClassifier.js`
- `src/routes/ai.js`, `src/routes/workflow.js`, `src/lib/conversationalChat.js`
- `src/services/QuickScriptService.js`, `src/services/AIService.js`, `src/lib/luauLint.js`
- `src/routes/audit.js`, `src/routes/tools.js`

Plan continuity and execution:

- `src/services/WorkflowPlanService.js`
- `src/services/artifactRunLauncher.js`
- `src/workers/generateArtifactWorker.js`
- `src/services/agentV2/ChatAgentService.js` and task-runtime adapters
- Frontend `src/hooks/useUnifiedChat.js`, `src/hooks/useAiChat.js`, `src/lib/workflowApi.js`

Studio, legacy boundary and inspection:

- `src/services/StudioAgentService.js`
- `src/lib/legacyUiBuilderBoundary.js`, `src/routes/uiBuilder.js`, `server.js`
- `src/services/PromptInspectorService.js`
- Unit, integration and deterministic evaluation tests adjacent to these modules and under `src/ai-evals/`

Documentation:

- `docs/unified-ai-architecture/model-call-inventory.md`
- `docs/unified-ai-architecture/architecture.md`
- `docs/unified-ai-architecture/migration-and-rollout.md`
- This report

## Implemented behaviour

- One layered canonical identity/trust/mode/output contract for every primary code-first mode.
- Immutable, server-authoritative approved-plan versions bound through job execution and result metadata.
- Delimited, redacted and budgeted untrusted content with deterministic prompt hashes and safe inspection metadata.
- Read-only Ask, approval-gated Plan, autonomous Agent, minimal-fix Debug, focused Quick Script and verifier-backed Studio contracts.
- Intent-aware defensive security classification and safe invalid/custom-mode handling.
- Single-execution rollout modes, isolated legacy UI Builder, deprecation telemetry and rollback configuration.

## Verification record

| Check | Result |
| --- | --- |
| Canonical prompt, plan, routing, safety and inspector unit tests | Passed: 43 tests |
| Studio prompt rollout, Quick Script and conversation integration tests | Passed: 77 tests |
| Prompt rollout and Luau helper integration tests | Passed: 16 tests |
| Deterministic unified-AI scenario evaluations | Passed: 18 tests; `unverifiedReportedCompleteCount === 0` |
| Studio tool protocol contract | Passed: 19 tests |
| Frontend plan handoff and Studio binding tests | Passed: 34 tests across 3 suites |
| Backend syntax checks for every changed/untracked JavaScript file | Passed: 58 files |
| Frontend/public-frontend production build | Passed; CRA and Next static export completed |
| Whitespace/error-marker check in both repositories | Passed |
| Full backend regression | 923 passed, 3 failed out of 926 |

The three full-suite failures are outside this change's ownership: `src/firestore.rules.firestore.test.js` currently redeclares `db`, and two source-shape assertions in `src/lib/studioPluginBuildContract.test.js` no longer match the already-modified generated plugin bundle. The focused Studio protocol, Studio service and unified-AI suites pass. The production build emitted the existing Firebase App Check availability warning for project `nexusrbx` but exited successfully.

## Required flow trace

| Flow | Traced ownership and terminal rule |
| --- | --- |
| Ask question | Unified classifier selects read-only response; canonical Ask contract forbids files, writes and modification claims. Optional Studio context is read-only and untrusted. |
| Agent build | Clear implementation verbs select `execute`; the artifact route launches one job and the worker assembles the canonical Agent envelope. |
| Debug fix | Debug selects `diagnose_and_fix`; its contract requires reproduction/root cause and the smallest correct fix while preserving unrelated code. |
| Plan approval and execution | Workflow stores immutable version/hash; approval records authenticated approver/time; frontend sends only ID/version/hash; `/api/ai/artifact` reloads and validates the exact approved version; launcher, worker and result metadata retain that reference. |
| Quick Script | Focused requests execute immediately through the Quick Script canonical contract; structurally multi-file requests return typed Agent escalation. |
| Agent with Studio | Studio decisions receive the same identity/task binding, exact runtime allowlist and manifest-first context; strict JSON is parsed against the allowlist. |
| Studio disconnected | MCP-only inspection remains read-only; write work parks in an `awaiting_studio_plugin` blocker instead of silently gaining write capability. |
| Invalid/custom mode | Invalid identifiers resolve to typed safe Ask behaviour; custom text can adjust style/specialism but cannot replace identity, authority, safety or completion policy. |
| Defensive anti-cheat | Deterministic safety classification allows defensive design, auditing and remediation while blocking exploit, bypass, theft, backdoor and unauthorized-access intent. |
| Prompt injection in source | Source, names, manifests, assets, attachments and tool output are redacted/budgeted and placed only in delimited untrusted user sections after trusted policy. |

Studio success was traced through `ensureFinalValidation`: a model `done` decision cannot finalize after a write acknowledgement alone. It requires target verification plus project validation, diagnostics, smoke check or targeted readback, with no remaining error diagnostics, before the run and linked job are durably finalized.

## Tests not run / remaining verification

- No live Roblox Studio/plugin session was mutated, disconnected and reconnected during this run; protocol and service behavior were verified through automated tests and code tracing only.
- No live provider request, production Firestore migration, billing operation or production cohort rollout was executed.
- Shadow/internal comparison telemetry must be observed in the deployed environment before selecting `canonical` for all users.

## Deployment configuration

`NEXUS_PROMPT_MODE` now defaults to `legacy`; explicitly select `shadow`, then `internal` with `NEXUS_PROMPT_INTERNAL_USER_IDS`, and finally `canonical` after comparison. Keep or disable `LEGACY_UI_BUILDER_ENABLED` independently based on measured legacy traffic. No new credential or secret is required.
