# NexusRBX live model-call inventory

Inventory date: 2026-07-21. Provider wrappers are listed separately from prompt owners. Test fixtures and evaluation-only calls are excluded.

## Primary runtime

| Call site | Route / worker | Surface and mode | Prompt source | Model | Context and output | Side effects / completion |
| --- | --- | --- | --- | --- | --- | --- |
| `src/lib/conversationalChat.js` | `POST /api/ai/chat` | AI workspace Ask | `NexusAgentPromptService` (`ask`) | Runtime chat model through `llmChat` | Conversation, optional authorised Studio reads; text | Read-only; cannot report writes |
| `src/routes/workflow.js` | `POST /api/ai/orchestrate` | Ask and Plan | `NexusAgentPromptService` (`ask` / `plan`) | Metered runtime chat model | Conversation, task binding, plan request; typed orchestration JSON | Plan stores an immutable version and waits for approval; no execution |
| `src/workers/generateArtifactWorker.js` | Artifact job worker | Agent artifact generation and Debug | `NexusAgentPromptService` (`artifact_generation` / `debug`) | Job-selected generation model | Trusted task/capabilities/approved plan plus delimited project data; artifact files | Writes artifact storage only; metadata records executed plan; completion remains job/verifier owned |
| `src/services/QuickScriptService.js` | `POST /api/quick-script/generate` | Quick Script | `NexusAgentPromptService` (`quick_script`) | Quick Script runtime model | Focused instruction/context; one script result or typed escalation | Generates one script; project-wide work escalates to Agent |
| `src/services/StudioAgentService.js` | Studio agent routes and worker lifecycle | Studio iterative Agent | `NexusAgentPromptService` (`studio_decision`) | Studio decision model through `llmChat` | Trusted bindings/tool allowlist plus delimited manifests, reads and receipts; strict JSON tool decisions | May enqueue supported writes. Complete requires command execution, target match, validation/readback, clean diagnostics and durable record |
| `src/routes/ai.js` | `POST /api/generate-code` | Transitional focused generation | `NexusAgentPromptService` (`quick_script`) | Metered chat model | Instruction and optional context; strict JSON code response | Code generation only; invalid mode resolves read-only rather than Agent |

## Specialist helpers

| Call site | Surface | Prompt source | Model / output | Classification and effects |
| --- | --- | --- | --- | --- |
| `src/routes/ai.js` | Chat title, explanations and prompt improvement | `NexusAgentPromptService` (`specialist`) | Metered chat model; short text or strict JSON | Canonical specialist; no task completion authority |
| `src/services/AIService.js` | Prompt expansion, code/file review and repair | `NexusAgentPromptService` (`specialist` or `debug`) | `llmChat`; text or strict JSON | Canonical specialist; source is untrusted; repair output does not itself verify deployment |
| `src/lib/luauLint.js` | Luau lint auto-fix | `NexusAgentPromptService` (`debug`) | `llmChat`; code-only | Canonical specialist; generated code and diagnostics are untrusted input |
| `src/routes/audit.js` | Admin code audit | `NexusAgentPromptService` (`specialist`, Ask) | `llmChat`; strict JSON | Canonical read-only specialist |
| `src/routes/tools.js` | Image prompt enhancement | `NexusAgentPromptService` (`specialist`, Ask) | Direct provider chat; text | Canonical specialist; subject/style are untrusted asset context |
| `src/routes/tools.js` | Vision-to-image-prompt analysis | Executor-specific multimodal prompt | Vision-capable provider; text | Specialist image helper, not a Nexus task execution/completion path |
| `src/lib/imageProviders/geminiImagen.js` | Image edit/generation adapter | Executor-specific multimodal contract | Provider Responses API; image result | Specialist media executor; no code/Studio completion authority |
| `src/lib/imageProviders/gptImage/dalle.js` and tool image calls | Image generation | Provider image API contract | `images.generate`; image result | Specialist media executor |

## Legacy, isolated runtime

All entries below are behind the single `LEGACY_UI_BUILDER_ENABLED` route boundary, emit deprecation telemetry, and cannot be selected by the primary `/ai` Agent, Plan, Debug or Studio paths.

| Call site | Surface | Prompt / output | Classification |
| --- | --- | --- | --- |
| `src/routes/uiBuilder.js` | Legacy UI Builder routes | Route-local UI personas; `boardState`, previews and `systemsLua` | Legacy |
| `src/services/UIPlanService.js` | Legacy UI planning | UI product-manager plan JSON | Legacy |
| `src/services/AIService.js` legacy UI methods | Board-state planning/generation/review and systems Lua | Legacy UI personas and board-state schemas | Legacy |
| `src/lib/uiBoardStateValidation.js` | Board-state validation/repair | Legacy UI repair JSON | Legacy |

## Provider and metering adapters

`src/lib/ai.js`, `_streamChatJson` in `AIService`, and the metered chat helpers in `routes/ai.js` and `routes/workflow.js` select providers/models, meter tokens, and normalize output. They are not prompt-policy owners. Dynamically loaded custom-mode `systemPrompt` values are now passed only as delimited untrusted style/specialist preferences; they cannot replace identity, safety, capability, ownership or completion rules.

