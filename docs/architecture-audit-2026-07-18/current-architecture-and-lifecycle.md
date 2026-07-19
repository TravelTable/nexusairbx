# Current architecture and request lifecycle

## Scope and evidence

This document describes the implementation found on 2026-07-18. **Confirmed**, **Strong inference**, and **Unknown** have the meanings defined in [README.md](./README.md).

## Repository and deployment map

| Area | Implementation | Runtime responsibility | Current authority |
| --- | --- | --- | --- |
| Web application | **src/**, React 18/CRA; routes in **src/App.js** | Authentication UI, chats, AI workspace, streaming, Studio pairing, asset UI | Browser state plus Firestore chat documents |
| Public web | **public-frontend/**, Next-based static/export build | Public pages and docs | Built static output routed by **vercel.json** |
| API | **backend/server.js**, Express/Node 22 | Auth, AI, workflows, projects, assets, OAuth, Studio bridge, billing | Route-specific services; no one task authority |
| Artifact worker | **backend/src/workers/jobWorkerLoop.js** and **backend/src/workers/generateArtifactWorker.js** | Claims jobs and generates artifacts | Firestore **_jobs** plus process-local loop state |
| Agent runtimes | **AgentRunService.js**, **backend/src/services/StudioAgentService.js**, **backend/src/workers/generateArtifactWorker.js** | Legacy apply, iterative tools, textual artifact generation | Separate job/run documents |
| Model providers | OpenAI calls in AI routes/services; image providers under **backend/src/lib/imageProviders/** | Chat, planning, code/artifact and image generation | Provider response plus local persistence |
| Primary operational database | Firebase Admin/Firestore | Users, chats, jobs, runs, Studio, manifests, assets, billing records | Collection-specific |
| Object storage | Firebase Storage in asset pipelines | Generated images/models and exports | Storage objects plus URLs saved in Firestore |
| Cache/transient stream | Redis through **backend/src/services/JobStreamService.js** and **backend/src/lib/securityStore.js** | Stream events, locks/rate limits/security state | Transient; detailed stream events can expire |
| SQL | **backend/prisma/schema.prisma** | Legacy User, UsageLog, PaygCredit schema | Not the current task/asset authority |
| Roblox OAuth/Open Cloud | **backend/src/routes/roblox.js**, OAuth/token/capability/upload services | User connection and current asset API operations | Encrypted Firestore integration record plus Roblox |
| Studio bridge | **backend/src/routes/studio.js**, **backend/src/services/StudioBridgeService.js** | Pairing, command queue, fetch/ack | Firestore **_studioCommands** for plugin transport |
| Local MCP transport | **local-connector/**, **StudioToolRouter.js**, **studioTransport/** | Alternate local Studio connection | Adapter/session state |
| Studio plugin | **roblox-plugin/src/**; generated install artifact **roblox-plugin/NexusRBXStudioBridge.plugin.lua** | Executes Studio reads/writes and returns acknowledgements | Live Studio place is runtime truth |
| Manifests | **backend/src/services/StudioManifestService.js**, plugin manifest commands | Paged hashed snapshot of Studio paths/source/property hashes | Live place first; last complete Firestore revision is backend snapshot |
| Desktop connector | **desktop-connector/** | Local desktop connection and preview support | Local process state |
| Deployment | **vercel.json**, root and backend GitHub workflows, backend environment flags | Frontend/public routing, API/worker deployment gates | External platform configuration is not fully in this repo |

### Current topology

~~~mermaid
flowchart LR
  U["User / browser"]
  CRA["CRA AI workspace<br/>useUnifiedChat + useAiChat"]
  FSCHAT["Firestore chats/messages"]
  API["Express API<br/>backend/server.js"]
  WF["Workflow / Ask routes"]
  LAUNCH["artifactRunLauncher"]
  JOB["Firestore _jobs<br/>JobService"]
  LEGACY["generateArtifactWorker<br/>AgentRunService"]
  ITER["StudioAgentService"]
  STREAM["Redis + SSE<br/>jobStream"]
  OAI["OpenAI / image providers"]
  BRIDGE["StudioBridgeService<br/>_studioCommands"]
  MCP["Local MCP adapter"]
  PLUGIN["Roblox Studio plugin"]
  PLACE["Live Roblox place"]
  MAN["StudioManifestService<br/>Firestore revisions"]
  OAUTH["RobloxOAuthService<br/>encrypted token record"]
  RBX["Roblox Open Cloud"]
  ASSET1["ProjectAssetService"]
  ASSET2["AssetOntologyService"]
  STORE["Firebase Storage"]

  U --> CRA
  CRA <--> FSCHAT
  CRA --> API
  API --> WF
  API --> LAUNCH
  LAUNCH --> JOB
  JOB --> LEGACY
  LAUNCH --> ITER
  LEGACY --> OAI
  ITER --> OAI
  JOB --> STREAM
  STREAM --> CRA
  LEGACY --> BRIDGE
  ITER --> BRIDGE
  ITER --> MCP
  BRIDGE --> PLUGIN
  MCP --> PLUGIN
  PLUGIN --> PLACE
  PLUGIN --> BRIDGE
  PLUGIN --> MAN
  API --> OAUTH
  OAUTH --> RBX
  API --> ASSET1
  API --> ASSET2
  ASSET1 --> STORE
  ASSET2 --> STORE
  ASSET2 --> RBX
~~~

The diagram deliberately shows parallel state stores. That fragmentation is a finding, not a target design.

## Agent entry points and identity

| Entry point | Route/runtime | Identity and context behavior | Tool behavior |
| --- | --- | --- | --- |
| Conversational Ask | **useUnifiedChat.handleSubmit** → **POST /api/ai/chat** in **backend/src/routes/ai.js** | A separately assembled conversational prompt; last messages and optional Studio context are truncated/selected independently | No canonical model tool registry; Ask may read Studio context before the model call |
| Planning | **useUnifiedChat.handleSubmit** → **POST /api/ai/orchestrate** in **backend/src/routes/workflow.js** | Frontend and backend each classify intent; the approved plan is not passed into execution | Produces a plan/clarification, then creates a new generation request |
| Artifact/agent/debug | **useAiChat.handleSubmit** → **POST /api/generate/artifact** | Stores rich job input, but iterative Studio run receives only goal/chat/session/routing fields | Routes to textual worker generation, legacy apply, or iterative Studio tools |
| Iterative Studio | **StudioAgentService.createRun/continueRun/buildAgentDecision** | Includes a permanent NexusRBX identity prompt and live filtered Studio tools, but omits stored conversation, attachments, base artifact, project assets, and Roblox authorization | All live-advertised protocol commands except legacy **apply_artifact** |
| Legacy worker generation | **generateArtifactWorker.execute** | Builds a different artifact prompt from job fields; Studio preflight differs for refinement vs from-scratch work | Model emits files textually; application is a later background command |
| Asset/OAuth wrappers | **RobloxAgentToolService**, **AssetAgentToolService** | Services can construct context/wrappers | No production registration of these wrappers in the model tool set was found |

**Confirmed:** there are multiple conflicting agent implementations. A NexusRBX identity exists in the iterative Studio system prompt at **backend/src/services/StudioAgentService.js:1742-1760**, but it is not a universal request envelope. Tool exposure and context therefore depend on the branch.

**Confirmed:** approved plan continuity is broken. **src/hooks/useUnifiedChat.js:298-341** creates a generation request from the original prompt/classification/attachments/base artifact without the plan ID, approved steps, or clarification answers generated by **backend/src/routes/workflow.js:372-389**.

**Confirmed:** iterative context continuity is broken. **backend/src/services/artifactRunLauncher.js:144-188** stores conversation/settings/assets/Roblox authorization on the job, while **backend/src/services/artifactRunLauncher.js:211-225** passes only a small subset to **StudioAgentService.createRun**. Its context/prompt assembly at **backend/src/services/StudioAgentService.js:1004-1162,1691-1819** does not recover those omitted fields.

**Strong inference:** these branch-dependent omissions explain generic-chatbot behavior more directly than model quality. They also mean fallback/retry paths can receive different context even when the visible user request is the same.

### Prompt mechanics by entry point

| Entry point | Actual model and fallback | System-message order and context budget | Project, manifest, tool, and authorization injection | Anonymous, retry, stream, and execution behavior | Site versus Studio behavior | Status and evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Conversational Ask | Model is resolved from the requested model/tier; free and anonymous requests are forced through the free-tier resolver. The provider call has no model fallback. | Persona is first, followed by up to 1,500 characters of game specification, optional Studio context/note, guidance, the last ten conversation messages, attachment text, and the current prompt. Output is capped at 3,000 tokens; there is no shared input-token budget. | Studio context is best-effort and textual. No model tool schemas, approved plan, canonical project manifest, project asset inventory, or structured Roblox capability snapshot is injected. | Anonymous is allowed through the free-tier path. The direct stream has no provider/model retry; an error before headers returns JSON, while a failure after headers closes the stream. It creates no durable job. | It can describe both site and Studio work, but cannot execute Studio tools in this branch. | **Confirmed** — **backend/src/routes/ai.js:1301-1565**, **backend/src/lib/ai.js:118-170**, **src/hooks/useUnifiedChat.js:344-432**. |
| Planning/orchestration | The route requests **deepseek/deepseek-v3.2**, then tier resolution can replace it; free users are forced to the free primary. `llmChat` retries the same resolved model, not a different fallback model. | Orchestrator system prompt, mode instruction, then a user-context message. It estimates tokens as characters/4, supplies only the last six messages truncated to 500 characters each, and attachment names rather than contents. Parse failure defaults to a project classification. | No live manifest or executable tool schemas. Project/chat identifiers and coarse Studio state can influence classification, but approved steps and clarification answers are not forwarded to execution. | Planning itself is synchronous JSON, not a durable stream/background task. Anonymous/free behavior follows the free model gate. Same-model retry is at most two attempts in `llmChat`. | It chooses a route such as Ask, project generation, or agent work; it does not itself perform Studio work. | **Confirmed** — **backend/src/routes/workflow.js:35-112,154-199,256-328,372-389**, **backend/src/lib/ai.js:342-384**, **src/hooks/useUnifiedChat.js:298-341**. |
| Artifact submission/launcher | The launcher stores the requested/resolved model. Legacy generation uses the gated resolved model for one provider stream; no alternate model fallback was found. Iterative Studio uses its own decision-model resolver. | The launcher does not assemble one prompt. It persists rich source fields, then selects either the legacy worker prompt or iterative Studio prompt; those branches have different order and limits. | Rich job data includes conversation, settings, assets, Studio selection, and Roblox authorization. The iterative call receives only goal/chat/session/apply metadata, so most stored context is not injected into that agent. | Authenticated artifact requests create durable jobs and support SSE cursor/resume plus result polling. Free Studio artifact work is gated. Launch/read/write idempotency is not atomic. | Site/text generation normally remains on the worker; iterative Studio is a feature-flagged diversion and is not context-equivalent. | **Confirmed** — **backend/src/services/artifactRunLauncher.js:3-7,59-100,118-225**, **backend/src/routes/ai.js:748-908,1096-1240**. |
| Iterative Studio agent | Decision model defaults through the **gpt-4o-mini** alias and tier resolver; free/anonymous selection is forced to the free primary, but free Studio execution is separately gated. No cross-model fallback is implemented. | Permanent NexusRBX identity, run/session/tool context, then truncated run data: leading-character slices, the last 24 steps, up to 12,000 characters of result snippets, and about 32,000 characters of assembled context. One malformed decision receives a repair attempt. | Live tool schemas are filtered by the session-advertised protocol capabilities. Project assets, stored conversation, attachments, base artifact, approved plan, and structured Roblox OAuth authorization omitted by the launcher are not recovered. | Persistent run with a decision lease, up to 40 iterations/10 minutes. Provider/transient failures can terminally fail the run; there is no general model fallback. Continuation is reader/ack driven in identified paths. | This is the only production branch found with dynamic live Studio tools. It does not inherit the full site-generation prompt. | **Confirmed** — **backend/src/services/StudioAgentService.js:31-45,1004-1162,1691-1852,1979-2153**. |
| Legacy artifact worker | Uses the job's gated resolved model and one provider stream. Model selection defaults include DeepSeek/Gemini aliases and **openai/gpt-5-mini** as the configured free GPT alternative, but the worker does not automatically swap to it on failure. | Global identity → genre → project → first 2,000 characters of game spec → first 2,000 characters of standards → conventions → examples → safe Studio excerpts; then persona, exemplars, brief, plan instructions, manifest, base artifact up to 30,000 characters, Studio inspection up to 20,000, attachments, assets, style, sanitized conversation, prompt, and format instruction. Character slicing and characters/4 metering are used instead of one tokenizer-backed input budget. | Can inject stored manifest, selected assets, attachments, conversation, and preflight Studio reads. It emits textual files; tools are not dynamically exposed to the model. Roblox authorization is stored but is not a live model tool registry. | Authenticated, durable background job with stream events. Generation success is committed before a later Studio apply command; no alternate-model retry was found. | Generates site or Studio-targeted files from one textual pipeline; Studio application is a separate, later operation. | **Confirmed** — **backend/src/lib/ai.js:43-60,225-245**, **backend/src/workers/generateArtifactWorker.js:93-98,270-299,355-376,486-589,608-676,816-866,1383-1463**. |
| Quick Script and asset/OAuth wrappers | Quick Script uses the free primary and can try **DEFAULT_FREE_GPT** only when the first response is unusable; an initial provider exception escapes before that content fallback. Asset/OAuth wrappers do not select a model. | Quick Script has its own sanitized system/user prompt. Anonymous history is a browser-local session. Wrapper context is service-defined rather than part of the six agent prompts above. | Quick Script has no live manifest/tool set. **RobloxAgentToolService** and **AssetAgentToolService** can validate and execute service calls, but no production registration of them in a model tool set was found. | Anonymous API has no client retry; browser history is `localStorage`. Quick Script uses `llmChat` same-model retry within each attempt. Wrapper retry/background behavior is operation-specific. | Quick Script returns code only. The wrappers could support site-side Roblox/asset operations, but they are not proven reachable by a model or connected to iterative Studio. | **Confirmed** for Quick Script and wrapper implementations; **Strong inference** for production unreachability — **backend/src/services/QuickScriptService.js:14-25,157-225,254-311**, **backend/src/services/AnonymousQuickScriptService.js:56-287**, **src/lib/quickScriptSession.js:1-52**, **src/lib/quickScriptApi.js:40-66**, **backend/src/services/RobloxAgentToolService.js:18-68**, **backend/src/services/AssetAgentToolService.js:30-203**. |

### Prompt and agent identity disposition

| Required disposition | Current finding | Classification and evidence |
| --- | --- | --- |
| Identity always included | NexusRBX identity is explicit in the iterative Studio prompt and a global identity exists in the worker, but Ask, planning, and Quick Script assemble different identities. | **Confirmed: no** — **backend/src/services/StudioAgentService.js:1742-1760**, **backend/src/workers/generateArtifactWorker.js:486-589**, **backend/src/routes/ai.js:1301-1565**. |
| Identity overwritten or omitted | Branch-specific prompt builders can omit the iterative identity; tier/model resolution does not restore it. | **Confirmed** — the independent builders above are the source of truth; there is no universal prompt envelope. |
| Tool consistency | Iterative Studio filters tools dynamically; worker/Ask/planning describe capabilities textually and do not receive the same schemas. | **Confirmed: inconsistent** — **backend/src/services/StudioAgentService.js:119-290,1742-1819**. |
| Stale or hard-coded tool descriptions | The iterative tool list comes from the versioned protocol and advertised capabilities, while other prompt guidance/examples are static text. Whether deployed plugin advertisements match the current server cannot be proven from the repository. | **Confirmed** static and dynamic mixtures; **Unknown** deployed drift — **backend/src/lib/studioToolProtocol.js**, **backend/src/services/StudioAgentService.js:119-290**. |
| Knows whether Studio is connected | Iterative runs are session-bound and get filtered capabilities. Ask receives best-effort context/note. Planning and worker branches can operate from stored or omitted state. | **Confirmed: branch-dependent** — **backend/src/routes/ai.js:1301-1565**, **backend/src/services/StudioAgentService.js:1004-1162**. |
| Correct universe and place | Session/place identity exists, but canonical project-owner-universe-place binding is absent from commands and manifests; OAuth resource data is not universally injected. | **Confirmed gap** — **backend/src/services/StudioManifestService.js:909-1003**, **backend/src/services/StudioBridgeService.js:943-1019**, **backend/src/services/RobloxOAuthService.js:559-574**. |
| Relevant assets | The worker can receive selected project assets; the iterative branch loses them and Ask/plan do not share one canonical asset inventory. | **Confirmed: branch-dependent** — **backend/src/services/artifactRunLauncher.js:144-225**, **backend/src/workers/generateArtifactWorker.js:816-846**. |
| Authorized Roblox actions | OAuth service can construct a capability context, but complete resources/policy are omitted and no production model registration of the Roblox wrapper was found. | **Confirmed** incomplete context; **Strong inference** unreachable to model — **backend/src/services/RobloxOAuthService.js:536-579**, **backend/src/services/RobloxAgentToolService.js:18-68**. |
| Usable failed-tool structure | Studio protocol has structured errors for many unsupported/runtime failures, but plugin acknowledgements and non-table results are not normalized into one required error envelope. | **Confirmed: partial** — **roblox-plugin/src/commands/registry.lua:31-655**, **backend/src/services/StudioBridgeService.js:1169-1193**. |
| Fallback-model prompt | `llmChat` same-model retries reuse messages, but Quick Script's content fallback is a separate call and separate agent branches construct different prompts. No cross-model fallback in the main artifact/Ask/iterative paths was found. | **Confirmed: not guaranteed** — **backend/src/lib/ai.js:342-384**, **backend/src/services/QuickScriptService.js:157-225**. |
| Token limits dropping context | Character slicing drops older steps/history and truncates game specs, standards, manifests, base artifacts, and Studio results without semantic priority guarantees. | **Confirmed** — **backend/src/services/StudioAgentService.js:108-111,1691-1819**, **backend/src/workers/generateArtifactWorker.js:93-98,270-299,355-376,660-676,816-846**. |
| Multiple conflicting implementations | Ask, orchestration, worker generation, legacy apply, iterative Studio, and Quick Script each own different prompt/runtime semantics. | **Confirmed** — entry-point and mechanics matrices above. |

## End-to-end request sequence

The most consequential path is an agent/debug request with Studio selected. The current sequence is:

~~~mermaid
sequenceDiagram
  actor User
  participant UI as useUnifiedChat/useAiChat
  participant Chat as Firestore chat
  participant API as POST /api/generate/artifact
  participant Launch as artifactRunLauncher
  participant Job as JobService/_jobs
  participant Worker as Worker or StudioAgentService
  participant Model as Model provider
  participant Bridge as StudioBridgeService
  participant Plugin as Studio plugin
  participant Place as Live place

  User->>UI: Submit message
  UI->>Chat: Persist user message
  UI->>API: Request + request ID + selected Studio data
  API->>API: Firebase identity, verified email, entitlement
  API->>Launch: Normalized request
  Launch->>Job: Create job
  alt iterative Studio mode and feature flag
    Launch->>Worker: Create Studio agent run
    Worker->>Bridge: Queue manifest/tool command
    Bridge->>Plugin: Plugin fetch claims queued command
    Plugin->>Place: Execute
    Plugin->>Bridge: Acknowledge result
    Bridge->>Worker: Continue run
  else legacy/textual artifact path
    Job->>Worker: Worker claims job
    Worker->>Model: Generate files
    Worker->>Job: Mark succeeded and emit done
    Worker-->>Bridge: Queue background apply afterward
    Bridge->>Plugin: Fetch command
    Plugin->>Place: Apply
    Plugin->>Bridge: Acknowledge
    Bridge-->>Job: Attempt late result update (ignored if terminal)
  end
  Job-->>UI: SSE/result polling
  UI->>Chat: Persist assistant result
  UI-->>User: Show completion
~~~

## Nineteen-stage lifecycle trace

The properties below apply to the primary artifact path; branches are called out explicitly.

| # | Stage and implementation | Inputs → outputs | Persistence and ownership | Failure, retry, timeout, verification |
| --- | --- | --- | --- | --- |
| 1 | Submit: **useUnifiedChat.handleSubmit** and **useAiChat.handleSubmit**, **src/hooks/useUnifiedChat.js:435-595**, **src/hooks/useAiChat.js:561-1405** | Prompt, mode, chat/project, attachments, Studio selection → routed request | Frontend owns draft/routing; an in-flight map is browser-local | Per-chat guard reduces same-tab duplicates only; browser close loses it; not verified |
| 2 | Chat write: **src/hooks/useAiChat.js:648-799** and unified-chat helpers | User/assistant message records | Firestore chat/message documents plus UI state | User message can remain orphaned if pre-job creation fails; failures often toast rather than persist an assistant failure |
| 3 | API ingress: **POST /api/generate/artifact**, **backend/src/routes/ai.js:748-888** | JSON plus **Idempotency-Key** → accepted job/run identifiers | Express route owns normalization | Request idempotency is read, launch, then write; concurrent requests can race |
| 4 | Identity/entitlement: Firebase auth and verified-email middleware in **backend/server.js:155-187** plus artifact-route billing checks | Firebase identity, verified-email state, and product/micros state → allow/deny | Firebase identity and entitlement services are authoritative | Denials are HTTP errors; there is no task event if failure precedes task creation |
| 5 | Project/context load: **backend/src/services/artifactRunLauncher.js:118-188**, project/asset/OAuth services | Chat/project ID, Studio selection → stored job context | Job record, chat/project stores, Studio context services | Several context failures are caught and replaced with disconnected/empty context at **backend/src/services/artifactRunLauncher.js:135-142**; no retry/typed blocked state |
| 6 | Prompt/context assembly: **backend/src/workers/generateArtifactWorker.js:608-834** or **backend/src/services/StudioAgentService.js:1691-1819** | Goal/history/settings/manifest/tool descriptions → model messages | Mostly ephemeral model request; partial data stored on job/run | Branch-dependent truncation/omission; iterative path loses rich job context |
| 7 | Tool exposure: **backend/src/services/StudioAgentService.js:119-290,1742-1760** | Protocol commands ∩ session-advertised capabilities → tool schemas/descriptions | Runtime snapshot in prompt/step, not universal capability record | Studio tools are dynamic only on iterative branch; OAuth/asset wrappers are not found in production model registration |
| 8 | Model action selection: **StudioAgentService.buildAgentDecision**, worker/Ask model calls | Model messages/tools → action, file output, or reply | Iterative decision/step persists; worker output persists later | Malformed decision gets repair/fallback; provider transient errors can fail iterative run immediately at **backend/src/services/StudioAgentService.js:1822-1852,2133-2153** |
| 9 | Task/command creation: **JobService.createJob**, **StudioAgentService.createRun**, **StudioBridgeService.queueCommand** | User request/action → job/run/command IDs | Separate **_jobs**, **_agentRuns**, **_studioAgentRuns**, **_studioCommands** | No canonical task ID and no cross-store transaction; session-bound command idempotency |
| 10 | Backend tool execution: worker or service wrappers | Tool input → provider/backend result | Service-specific Firestore/Storage/Redis | Retry policies differ by service; external lost-response ambiguity is not centrally reconciled |
| 11 | Studio delivery: **StudioBridgeService.claimNextCommand**, **backend/src/services/StudioBridgeService.js:1073-1133** or MCP adapter | Queued envelope → delivered command | Firestore command is plugin source of truth | Claim irreversibly changes queued to delivered; no delivery lease/redelivery/expiry check; a lost response strands it |
| 12 | Studio acknowledgement: **POST studio ack**, **backend/src/routes/studio.js:1678-2069** | Plugin/MCP status/result → terminal command state | **ackCommand** commits command terminal status first | Plugin ack status is less strictly validated than MCP; duplicate terminal ack returns before downstream replay |
| 13 | Studio action: **roblox-plugin/src/commands/registry.lua:31-655** | Command payload → mutation/read/validation | Live place; plugin queue is memory-only | Queue removes before execution; outer crash can produce no ack; several unsupported actions return structured errors, but nil/non-table result can default success |
| 14 | Studio result: plugin HTTP client/registry → bridge ack | Result/error/verification data → command document and downstream handlers | Command result then run/manifest/validation projections | Ack HTTP result is ignored locally; downstream projections occur after terminal commit and can diverge |
| 15 | Manifest/files: **backend/src/services/StudioManifestService.js:202-229,562-834,1396-1573** | Paged paths/classes/hashes → complete revision/current manifest | Firestore states/pages/items/revisions/cache; live place remains truth | Page continuity/checksums/conflicts are strong; freshness is TTL/signature based, not a guaranteed post-write readback |
| 16 | Asset IDs: **ProjectAssetService**, **AssetOntologyService**, upload services | Provider/Roblox operation → IDs/bindings | Three competing asset stores plus Roblox | Some paths persist IDs; failed binding reuse and non-atomic receipts permit false success/duplicates; no canonical asset linkage |
| 17 | Task state: **JobService.updateJob/appendEvent**, run services | Stage/result/ack → job/run state | Firestore job/run records; detailed stream events partly Redis | Terminal job cannot accept late apply result; only selected event types are durable |
| 18 | User response: SSE/result handlers in **src/hooks/useAiChat.js:706-1405** and Ask handling **src/hooks/useUnifiedChat.js:344-432** | Stream/events/result → assistant message/UI | Browser plus Firestore assistant message | Reconnect/polling exists; Ask treats stream close after partial provider failure as completion |
| 19 | Completion verification: **generateJobStatus.js**, job projection, iterative validation | Status/result/diagnostics → success shown to user | Job/run projection | Legacy succeeded implies **userGoalResolved: true** in **backend/src/services/JobService.js:94-119**. Iterative validation is health-oriented, not persisted user-goal acceptance proof |

The following control matrix makes the authentication, ownership, timeout, verification, loss, and duplication properties explicit for every stage. “No separate check” means the stage inherits a previously authenticated server operation; it does not mean anonymous access is intended.

| # | Authentication and ownership boundary | Retry and timeout behavior | Completion verification | Loss and duplicate-execution window |
| --- | --- | --- | --- | --- |
| 1 | The browser owns draft/routing state; it is not an authority for user, project, Studio, or Roblox ownership. Server authentication occurs at ingress. | Same-chat in-flight guards are browser-local; no durable submission lease exists. | None; pressing submit proves only local dispatch. | Closing the tab loses the guard. A second browser/process can submit the same intent. |
| 2 | The message is written in the selected user's chat/project namespace; deployed Firestore-rule coverage is **Unknown** from server code alone. | Firestore errors are handled as request/UI failures; no task-level retry policy protects the pair of user-message and job writes. | A successful write verifies message persistence only. | The user message can survive without a task/assistant response; retries can add another message. |
| 3 | Firebase auth and verified-email middleware in **backend/server.js:155-187** supplies `req.user`; browser IDs remain untrusted input. | The idempotency lookup/launch/store sequence has no atomic reservation or single transaction. Route/provider timeout policies are path-specific. | The accepted job/run ID is not task completion. | Concurrent requests with one key can both pass the lookup and launch duplicate work. |
| 4 | Firebase identity and entitlement/billing services own the allow/deny decision. | Denials are terminal HTTP responses; no durable task exists to retry or explain them. | Identity, email, and entitlement are checked, not the requested outcome. | State is not duplicated, but a denial before task creation leaves the already-written chat message orphaned. |
| 5 | Services receive server-derived user identity; project, asset, Studio, and OAuth records are expected to be owner-scoped, with the asset exceptions in [findings-and-capabilities.md](./findings-and-capabilities.md). | Several context exceptions are caught and replaced with empty/disconnected context; there is no common timeout, retry, or typed degraded state. | No universal freshness or completeness check covers the assembled context. | Context can be silently omitted; different branches can load different snapshots for the same request. |
| 6 | Prompt construction is server-side, but project files/history are untrusted data and there is no universal immutable identity envelope. | Provider budgets, truncation, and retries differ between Ask, worker, and iterative paths. | No recorded proof that the final prompt contained every required identity/context component. | Prompt material is mostly ephemeral; truncation/branch handoff can lose plan, chat, asset, or OAuth facts. Retried branches may assemble a different prompt. |
| 7 | Iterative Studio tools are filtered by session-advertised capability; OAuth/asset authorization is not represented by one authoritative model-visible snapshot. | Capability failure behavior is branch-specific; there is no shared snapshot expiry/reload policy. | Advertisement proves only what the session says it can handle, not current user authorization or successful execution. | Runtime-only tool knowledge can become stale; duplicate/overlapping tool definitions exist across agent implementations. |
| 8 | The model is not an authority; the server must validate its selected action. Provider credentials remain server-side. | Iterative malformed decisions get repair/fallback, but transient provider decision errors can terminate the run at **backend/src/services/StudioAgentService.js:2133-2153**. | Parsing/schema checks validate the decision shape, not the goal result. | Iterative decisions persist as steps; other calls are more ephemeral. A model retry can choose another action without one shared operation identity. |
| 9 | Creation services receive the authenticated user, but job/run/command ownership lives in separate records; command identity is also session-bound. | Jobs and iterative decisions have leases; plugin commands store expiry but claim/ack do not enforce it. | Record creation proves accepted/queued only. | No cross-store transaction; partial creation and duplicate logical commands are possible, especially after Studio reconnect changes the session ID. |
| 10 | Backend services execute under server identity and must recheck user, entitlement, owner/destination, and capability; current enforcement is service-specific. | Each provider/service has its own retry behavior. There is no shared reconciliation rule for a timeout after dispatch. | Verification ranges from none to provider-specific receipts/readback. | A successful-but-lost external response can be retried as a new creation; process interruption can lose only-ephemeral provider state. |
| 11 | Plugin polling uses the paired session bearer token; MCP uses its adapter/session authentication. The command remains tied to the stored user/session, not a stable project-universe binding. | A claim changes `queued` to `delivered` with no delivery lease, redelivery, cancellation, or enforced expiry. | Delivery claim does not verify plugin receipt or execution. | A lost claim response strands the command. Requeue workarounds can duplicate an operation because command identity includes session. |
| 12 | Ack routes authenticate the plugin token or MCP path and look up the command/session owner. Plugin and MCP status validation is not identical. | Repeated terminal ack returns early; there is no inbox/outbox replay for downstream projections. | Current bridge treats statuses other than literal failure permissively; ack is not independent readback. | Terminal command state can persist while run/manifest/asset projections are lost. Duplicate ack cannot repair them. |
| 13 | The plugin trusts the already-paired command transport; live-place ownership/universe identity is not independently signed in the current envelope. | The local queue removes before execution. Unsupported runtime operations return errors, but outer crashes have no durable local retry. | Handler return values/optional checks drive success; nil/non-table results can default to success. | Studio/plugin restart loses queued/in-flight local state. A retry under a new command/session can repeat a mutation. |
| 14 | Result submission inherits the paired command/session; downstream services separately associate run/manifest/validation state. | The plugin does not act on the ack HTTP result; backend downstream processing occurs after terminal command commit. | Result payload is not uniformly backed by live readback or a replayable projection transaction. | Lost ack response can cause local uncertainty; a backend crash after terminal commit loses downstream result propagation. |
| 15 | Manifest writes/reads are scoped by user, Studio session, place, and revision; stable project-owner-universe binding is missing. | Paged upload supports continuity/conflict checks; freshness is TTL/signature based and collection is re-requested rather than transactionally coupled to each write. | Checksums/page completeness verify stored revision integrity, not necessarily current live post-write state. | Incomplete/conflicting page sets are retained safely, but a complete snapshot can become stale. Duplicate identical pages dedupe; conflicting duplicates mark conflict. |
| 16 | Uploads use authenticated server services and server-side OAuth, but catalog review, usage aggregation, style profiles, and approval have confirmed owner/role gaps. | Upload/reconcile/poll behavior differs by service. A failed binding may be reused and receipt reservations are non-atomic. | Some paths store a Roblox ID, but moderation, owner/destination, and Studio-use readback are not universally required. | Three asset stores can omit/link different IDs. Lost responses and failed-binding reuse can duplicate creation or manufacture false success. |
| 17 | Worker/run services update stored IDs internally; authenticated result/stream routes project those records back to the user. | Job claims have leases and bounded attempts, but terminal jobs reject later correction; detailed Redis stream data can expire. | Job status is a projection, not goal-specific evidence. | Late Studio ack is lost to a terminal job; partial event history or divergent job/run records can survive. Idempotent event append is not universal. |
| 18 | UI recovery uses the current authenticated chat and job identifiers; browser state chooses which pending work to resume. | SSE reconnect and result polling exist for artifact jobs; Ask stream close after headers has no equivalent structured terminal recovery. | The UI trusts backend terminal projection/partial Ask text. Display and chat persistence do not verify the external result. | Browser closure can lose local in-flight context; assistant persistence can be missing or duplicated. Partial Ask output may be saved as successful. |
| 19 | Status/validation reads are user/job/run scoped, but no single acceptance-policy owner exists. | There is no generic corrective/retry loop driven by failed goal checks; iterative continuation is path/reader/ack driven. | Legacy `succeeded` maps directly to `userGoalResolved: true`; iterative checks are health-oriented and do not constitute persisted user acceptance proof. | The dominant risk is false completion, not missing display: generation success can mask missing/failed Studio apply. Repeated manual recovery can then duplicate work. |

## Current task, stream, and recovery model

There is durable work data, but no true canonical task ledger:

- **JobService** stores job status, attempts, leases, result, and a subset of events under **_jobs** and **_idempotency**.
- **AgentRunService** stores legacy Studio application state and acknowledgements.
- **StudioAgentService** stores iterative steps and uses a decision lease.
- **StudioBridgeService** stores plugin commands separately.
- Redis carries detailed live events with limited retention; **backend/src/services/JobService.js:14-43,343-375** persists only selected stage/file/done/error/outcome categories.
- Frontend recovery in **src/hooks/useAiChat.js** centers on a pending assistant message in the current chat rather than enumerating all active user tasks.

### Task and recovery mechanism inventory

| Mechanism | Current source of truth and state | Recovery/retry behavior | Classification and evidence |
| --- | --- | --- | --- |
| Task creation | Artifact launch creates a durable Firestore job, then creates either an iterative or legacy run and links its `runId`; launch failure terminalizes the job. There is no single task aggregate above these records. | Pre-creation failures have no durable task event, and no transaction spans job, run, and command creation. | **Confirmed** — **backend/src/services/artifactRunLauncher.js:144-264**, **backend/src/services/StudioAgentService.js:1004-1226**, **backend/src/services/AgentRunService.js:115-148**. |
| Step creation | Run steps are Firestore subdocuments. Legacy IDs are stable by type/suffix; iterative steps usually use auto IDs and persist `queueing`/`pendingCommand` before bridge queueing. | This is a crash checkpoint before external command creation, but step semantics and ID rules are branch-specific. | **Confirmed** — **backend/src/services/AgentRunService.js:49-52,95-103,173-200**, **backend/src/services/StudioAgentService.js:985-1002,1434-1546**. |
| Task IDs | Jobs and runs use Firestore auto IDs; jobs later store `runId`; commands store `runId` and `stepId`; explicit command idempotency hashes user, session, type, and key into the document ID. | IDs are linked rather than unified, so there is no one ID through prompt, model, tool, Studio, asset, and response boundaries. | **Confirmed** branch IDs; **Strong inference** canonical-ID gap — **backend/src/services/JobService.js:261-280**, **backend/src/services/artifactRunLauncher.js:209-264**, **backend/src/services/StudioBridgeService.js:96-98,941-1032**. |
| Persistence | Jobs/events, legacy and iterative runs/steps, Studio commands/snapshots, and chat state persist in separate Firestore collections; large job payloads can use Cloud Storage, while Redis/browser state is supplementary. | Durable branch records survive restart, but no transaction spans the ledgers and detailed transient events can expire. | **Confirmed fragmented sources of truth** — **backend/src/services/JobService.js:45-58,167-171,261-375**, **backend/src/services/AgentRunService.js:95-103**, **backend/src/services/StudioAgentService.js:651-668**, **backend/src/services/StudioBridgeService.js:400-404**. |
| Active state | Jobs use `queued`/`running` plus a lease; iterative and legacy runs/steps define additional waiting, delivered, running, and approval states; commands use their own four-state lifecycle. | No aggregate state proves which user tasks are active across runtimes; downstream best-effort updates can lag and `delivered` commands can remain active indefinitely. | **Confirmed** — **backend/src/services/JobService.js:14-31,378-448**, **backend/src/services/StudioAgentService.js:31-65,715-787,1979-2132**, **backend/src/services/AgentRunService.js:11-25,250-319**. |
| Completion state | Terminal job outcome is durable and terminal jobs reject later mutation; run finalization stores summary and termination time, while command success is separate. Legacy generation can become terminal before Studio application. | Completion does not prove every projection, external effect, Studio apply, or readback verification completed. | **Confirmed** — **backend/src/services/JobService.js:14-31,283-327**, **backend/src/services/StudioAgentService.js:1897-1976**, **backend/src/services/AgentRunService.js:428-525**, **backend/src/workers/generateArtifactWorker.js:1424-1463**. |
| Failure state | Commands, steps, runs, and jobs persist failures independently; iterative runs add `blocked`, `timed_out`, and `cancelled` terminal states. | A parent can fail or block while the raw command remains `delivered`; there is no task-wide failure state retaining every dependency and recovery action. | **Confirmed** — **backend/src/services/StudioAgentService.js:31-65,905-983,1897-1976**, **backend/src/services/AgentRunService.js:428-610**, **backend/src/services/JobService.js:283-327**. |
| Retry state | Jobs persist attempts and leases with a three-attempt default; model loops can repair or choose another tool; plugin HTTP retries are bounded. | There is no unified retry state for a delivered Studio command. Whole-job lease recovery or an uncorrelated retry can repeat model calls or external effects after a lost response. | **Confirmed: partial** — **backend/src/services/JobService.js:1-13,378-448**, **backend/src/services/StudioAgentService.js:1379-1597,1979-2132,2502-2670**, **roblox-plugin/src/net/httpClient.lua:184-213**. |
| Checkpoints | Durable run steps, selected job events, `pendingCommand` plus queue lease, command records, snapshots, and manifest revisions/checksums are local recovery points. | There is no general computation checkpoint: stale-lease recovery restarts the claimed job unit rather than resuming mid-model or mid-external operation. | **Confirmed local mechanisms**; **Strong inference** global gap — **backend/src/services/JobService.js:329-375**, **backend/src/services/StudioAgentService.js:1513-1546,1639-1688**, **backend/src/services/StudioBridgeService.js:1136-1266**, **backend/src/services/StudioManifestService.js:562-834**. |
| Cancellation | Iterative cancellation writes `cancelRequestedAt` and immediately finalizes only when no step is active; legacy cancellation marks its run/job. | Neither path recalls a Firestore command nor cancels an external asset operation, so in-flight Studio work can finish after cancellation. | **Confirmed: incomplete** — **backend/src/services/StudioAgentService.js:2763-2775**, **backend/src/services/AgentRunService.js:647-665**. |
| Resumption | Workers can reclaim a queued/stale-running job after its lease; iterative read-time reconciliation can recover terminal command acknowledgement, find a command by ID/idempotency key, and continue. Browser SSE can reconnect by cursor and poll the result. | There is no redelivery of a `delivered` command or mid-operation continuation; resume means reconcile, retry a whole unit, or create a new step. | **Confirmed: partial** — **backend/src/services/JobService.js:378-448**, **backend/src/services/StudioAgentService.js:859-983,1639-1688,2502-2670**, **backend/src/routes/ai.js:1096-1240**. |
| Task history | Run steps and durable job-event reads are each capped at 200; command and snapshot records persist; transient SSE details are trimmed/expired. | The separate, bounded histories are not a guaranteed complete audit ledger and cannot be reconstructed into one ordered task history. | **Confirmed** — **backend/src/services/AgentRunService.js:150-171**, **backend/src/services/StudioAgentService.js:715-856**, **backend/src/services/JobService.js:329-375**, **backend/src/services/StudioBridgeService.js:1035-1062,1237-1266**. |
| Task-to-chat relationship | `chatId` is stored on the job and both run types; the frontend stores an assistant pending message with job/run identifiers and restores polling from chat history. | Recovery centers on one chat message rather than enumerating every active user task. | **Confirmed** — **backend/src/services/artifactRunLauncher.js:144-177,209-246**, **backend/src/services/AgentRunService.js:115-148**, **backend/src/services/StudioAgentService.js:1004-1163**, **src/hooks/useAiChat.js:413-559,760-799**. |
| Task-to-project relationship | Artifact launch resolves project asset context by `chatId`; results may carry `projectId`, but the iterative run schema does not require a canonical project foreign key. | Project linkage is partial and weakly normalized; no authoritative dependency graph enforces ownership/completion order. | **Confirmed: partial** — **backend/src/services/artifactRunLauncher.js:135-177**, **backend/src/services/StudioAgentService.js:1004-1132,1320-1367,1897-1945**. |
| Task-to-Studio relationship | Jobs store Studio session/connection/target place; runs store owner session/place/connection; commands store session/run/step/execution session, and ownership/compatibility is checked before queueing. | A correct session relationship does not add stable project/universe ownership or rescue a delivered command after session loss. | **Confirmed** — **backend/src/services/artifactRunLauncher.js:155-177,209-246**, **backend/src/services/StudioAgentService.js:1004-1163,1434-1688**, **backend/src/services/StudioBridgeService.js:865-1032**. |
| External asset operations | Artifact jobs snapshot Roblox/project asset context and IDs; `roblox_model_upload` is independently claimed, processed, and terminalized. | No atomic transaction or compensation ties task completion to remote Roblox side effects, and failures persist separately. | **Confirmed: separate jobs, partial task atomicity** — **backend/src/services/artifactRunLauncher.js:135-177**, **backend/src/workers/jobWorkerLoop.js:103-124,222-266**, **backend/src/services/JobService.js:261-448**. |
| Rollback data | Command acknowledgement stores received snapshots with results; runs can queue `restore_snapshot`; plugin atomic batches restore local snapshots on selected failures. | If acknowledgement/result is lost, rollback data never reaches the backend; uploads and model/provider calls have no equivalent rollback primitive in the inspected task path. | **Confirmed: Studio-only and conditional** — **backend/src/services/StudioBridgeService.js:1136-1266**, **backend/src/services/AgentRunService.js:612-639**, **backend/src/services/StudioAgentService.js:2738-2775**, **roblox-plugin/src/commands/registry.lua:128-172**. |

### Interruption behavior

| Interruption | What survives | Current recovery and risk | Classification and evidence |
| --- | --- | --- | --- |
| Backend restart | Firestore jobs/runs/commands/manifests survive; process-local loops, caches, locks, refresh deduplication, and in-memory continuation work do not. | Job leases can be reclaimed, but delivered Studio commands have no lease/redelivery and some continuation is reader/ack driven. | **Confirmed** persistence split; **Strong inference** incomplete recovery — **backend/src/workers/jobWorkerLoop.js:8-15,222-285**, **backend/src/services/StudioBridgeService.js:1073-1133**. |
| Deployment | Same durability boundary as restart; exact number and role of deployed processes are not in repository evidence. | Feature flags and worker topology can change which branch can resume. | **Unknown** live topology — **backend/server.js:241-255**. |
| Browser close | Durable backend jobs continue; chat/job records survive. In-flight maps, active stream, anonymous Quick Script history not yet synced, and view-local recovery context can be lost. | Reopening the same chat may poll a pending assistant job, but no all-tasks inbox is present. | **Confirmed** — **src/hooks/useAiChat.js:1112-1176,1327-1374**, **src/lib/quickScriptSession.js:1-52**. |
| Studio close | Firestore command survives; plugin queue/in-flight state does not. | A queued command can be claimed later, but a command claimed before closure remains `delivered` with no automatic redelivery. | **Confirmed** — **roblox-plugin/src/commands/registry.lua:527-655**, **backend/src/services/StudioBridgeService.js:1073-1133**. |
| Network interruption | Firestore state survives. Browser SSE can reconnect/poll; plugin HTTP client retries selected network/429/5xx failures. | A lost Studio claim response can strand `delivered`; a lost ack response creates ambiguity despite duplicate terminal-ack handling; Ask can retain partial text as success. | **Confirmed** — **roblox-plugin/src/net/httpClient.lua:22-42,184-213**, **backend/src/routes/ai.js:1482-1564**, **src/hooks/useUnifiedChat.js:344-432**. |
| Token expiry | OAuth refresh token remains encrypted; Studio session record remains until expiry/revocation. Process-local access-token and refresh-dedup caches are lost on restart. | OAuth attempts refresh and maps `invalid_grant` to reconnect. Studio authentication failure does not requeue a previously claimed command. | **Confirmed** — **backend/src/services/RobloxOAuthService.js:461-534**, **backend/src/services/StudioBridgeService.js:575-593,1073-1133**. |
| API timeout | Local job/command may survive; provider-side completion may have occurred without a recorded result. | Retry is provider-specific; there is no universal external-operation reconciliation, so duplicate or missing effects remain possible. | **Confirmed** divergent retries; **Strong inference** ambiguous outcome — image-provider and task retry evidence in this document. |
| Duplicate request | Existing idempotency and deterministic command IDs can collapse some duplicates. | Artifact idempotency uses a read-launch-write window, and reconnect changes session-bound command identity; concurrent duplicates remain possible. | **Confirmed** — **backend/src/routes/ai.js:748-908**, **backend/src/services/StudioBridgeService.js:96-98**. |
| Model retry | `llmChat` retries the same model/messages at most twice; malformed iterative decisions receive one repair attempt. | Ask and the primary worker/iterative provider paths do not use a shared cross-model fallback/resume contract; iterative provider failure can terminally fail the run. | **Confirmed** — **backend/src/lib/ai.js:342-384**, **backend/src/services/StudioAgentService.js:1822-1852,2133-2153**. |

**Confirmed failure window:** worker generation becomes terminal before Studio apply.  
**Confirmed failure window:** delivered plugin commands have no lease or redelivery.  
**Confirmed failure window:** command terminal state commits before manifest/run/receipt projections; duplicate ack cannot replay those projections.  
**Strong inference:** after a process interruption, some iterative continuation is reader- or ack-driven because the continuation/reconciliation entry points in **backend/src/services/StudioAgentService.js:859-983** are invoked through status/result/ack flows, not a clearly dedicated durable scheduler.  
**Unknown:** the exact deployed worker topology. **RUN_JOB_WORKER** is opt-in in **backend/server.js:241-255**, and the repository does not prove that exactly one healthy worker is deployed.

## Studio transport and command behavior

### Plugin transport

- Firestore **_studioCommands** is authoritative in **backend/src/services/StudioBridgeService.js:391-403**.
- Current state machine is only **queued → delivered → succeeded | failed** at **backend/src/services/StudioBridgeService.js:1073-1235**.
- **expiresAt** is stored at **backend/src/services/StudioBridgeService.js:943-1019** but not enforced by claim or ack.
- Deterministic command IDs include session ID at **backend/src/services/StudioBridgeService.js:96-98**; reconnecting changes the identity of the same logical operation.
- The Lua plugin queue and in-flight command are memory-only at **roblox-plugin/src/commands/registry.lua:527-655** and **roblox-plugin/src/Main.server.lua:291-365**.
- The plugin already performs limited live post-mutation verification: it re-resolves changed paths, compares script hashes where available, returns `verified` / `verificationChecks`, and converts a failed check to `apply_unverified` at **roblox-plugin/src/commands/registry.lua:231-310,398-427**. This is a useful existing primitive, not a complete verifier: snapshots, undo, and batches are explicitly skipped at **roblox-plugin/src/commands/registry.lua:208-215**; an exception inside the verifier records `verificationError` but preserves apparent success at **roblox-plugin/src/commands/registry.lua:428-432**; and the bridge maps every acknowledgement status except literal `failed` to `succeeded` without independently requiring `result.ok` or `result.verified` at **backend/src/services/StudioBridgeService.js:1169-1193**.

### MCP/local transport

**StudioToolRouter.js** dispatches through transport adapters and validates advertised capabilities. This provides a good abstraction boundary, but it does not itself supply the canonical task, operation reservation, delivery lease, or shared post-execution outbox required by both transports.

### Security controls and gaps

- Website pair/queue routes require Firebase auth, verified email, and rate limiting at **backend/src/routes/studio.js:408-424,1384-1425**.
- Backend stores a SHA-256 token hash and uses timing-safe verification at **backend/src/services/StudioBridgeService.js:428-498,575-593**.
- The plugin bearer token is stored in local plugin settings at **roblox-plugin/src/net/httpClient.lua:245-249**; command envelopes are not independently signed or fenced.
- Pair codes are six characters from a 32-symbol alphabet and live ten minutes at **backend/src/services/StudioBridgeService.js:67-108**. The plugin claim route at **backend/src/routes/studio.js:425-449** has no route-local limiter, while MCP claim does at **backend/src/routes/studio.js:463**. **Unknown:** whether broader middleware fully covers it.
- **expectedSourceHash** is supported, but optional for several mutations in **backend/src/lib/studioToolProtocol.js:744-857**.
- Atomic batch rollback reports success without checking restore success at **roblox-plugin/src/commands/registry.lua:128-175**.

### Studio transport mechanism audit

| Mechanism | Source of truth and state transitions | Retry, timeout, and recovery | Loss, duplication, or false-success exposure | Classification and evidence |
| --- | --- | --- | --- | --- |
| Polling | Studio uses HTTP pull plus heartbeat, not server push. The plugin auto-loop claims one command, then repolls or backs off; heartbeat runs every 15 seconds with jittered exponential backoff. | HTTP retries cover selected network, 429, and 5xx failures; an empty poll is normal. | A poll can transactionally claim a command even if its response never reaches the plugin. | **Confirmed** — **roblox-plugin/src/Main.server.lua:291-347,367-416**, **roblox-plugin/src/net/httpClient.lua:22-42,184-213**, **backend/src/services/StudioBridgeService.js:1073-1134**. |
| Long polling | Backend wait defaults to 20 seconds and is clamped to 25 seconds. It queries only `queued`, transactionally changes `queued` → `delivered`, retries a claim race after 100 ms, and checks again every 1.5 seconds until returning no command. | Request completion starts another poll; it is not a durable subscription, and no `delivered` → `queued` transition exists in the inspected service. | Backend/client/network timeout ordering can make delivery ambiguous after the Firestore claim. | **Confirmed** — **backend/src/services/StudioBridgeService.js:1073-1134**, **backend/src/routes/studio.js:1637-1670**. |
| WebSockets | No WebSocket Studio command transport was found. | None. | No WebSocket reconnect/replay semantics exist. | **Confirmed absent** in the inspected Studio route, service, plugin HTTP client, and registry. |
| SSE | SSE is used for browser artifact-job events, not for plugin command delivery. | Browser reconnect uses cursor/poll fallback; Studio does not inherit it. | Treating job-stream recovery as Studio-command recovery would be a false assumption. | **Confirmed distinction** — **backend/src/routes/ai.js:1096-1240**, **src/hooks/useAiChat.js:1112-1176,1327-1374**. |
| Queues | Firestore **_studioCommands** is the durable queue; the plugin maintains a memory-only local queue/in-flight slot after claim. | Only `queued` commands are claimable; no delivered-command lease returns work to the queue. | Claim-before-receive and plugin closure can strand work. | **Confirmed** — **backend/src/services/StudioBridgeService.js:391-403,1073-1133**, **roblox-plugin/src/commands/registry.lua:527-655**. |
| DB-backed storage | Firestore stores sessions, pair state, commands, acknowledgements/results, and manifest projections. | Survives process restart; downstream projections after terminal ack are not one transaction with command completion. | A terminal command can exist without corresponding manifest/run/receipt projection. | **Confirmed** — **backend/src/services/StudioBridgeService.js:391-403,1169-1235**, **backend/src/routes/studio.js:1678-2069**. |
| In-memory storage | Plugin queue/in-flight work is a non-authoritative Lua table; claimed work is removed before execution. Development security storage and selected session-touch fallbacks are also process-local. | Rebuilt only by new polls/reads; claimed commands are not reconstructed into the plugin queue. | Studio/plugin close loses local claim/result state and can leave Firestore `delivered`; process restart loses development maps and per-process fallbacks, not Firestore commands. | **Confirmed** — **roblox-plugin/src/commands/registry.lua:527-654**, **backend/src/lib/securityStore.js:20-93**, **backend/src/services/StudioBridgeService.js:596-637**. |
| Redis streams | Redis carries transient browser job events and liveness throttling; it is not the Studio command source of truth. It uses append/trim/expiry and range reads, with no consumer-group acknowledgement. | Events can expire; selected categories are projected to Firestore. Production configuration requires a Redis URL, but runtime reconnect/fallback is not implemented in the inspected adapter. | Redis stream success does not prove command execution or result retention. | **Confirmed distinction** — **backend/src/lib/securityStore.js:95-197**, **backend/src/services/JobStreamService.js:1-33**, **backend/src/services/JobService.js:14-43,343-375**. |
| Acknowledgements | Plugin/MCP posts status and result; bridge commits terminal command state first. State maps to `failed` only for literal `failed`, otherwise `succeeded`. | A duplicate terminal ack returns early rather than replaying downstream projections. Plugin HTTP posting has bounded retries, but the registry ignores the final response and has no durable ack outbox/replay. | Unknown/nonstandard status, missing `result.ok`, or unverified results can become success; Studio can show local success while Firestore remains `delivered`, and lost projection cannot be healed by duplicate ack. | **Confirmed** — **backend/src/services/StudioBridgeService.js:1136-1235**, **backend/src/routes/studio.js:1678-2069**, **roblox-plugin/src/commands/registry.lua:177-187,461-525**, **roblox-plugin/src/net/httpClient.lua:184-213**. |
| Results | Result/error data is stored on the command; route code then projects selected manifests, receipts, and run effects. | Readers can fetch command/run state, but no generic result outbox/reconciler was found. If every plugin ack retry fails after local execution, no result reaches durable storage. | Large/malformed or successfully stored command results can be absent from parent state; a locally successful command can leave no persisted result at all. | **Confirmed** storage/projection split; **Strong inference** reconciliation gap — **backend/src/services/StudioBridgeService.js:1136-1266**, **backend/src/routes/studio.js:1678-2069**, **roblox-plugin/src/commands/registry.lua:461-525**. |
| Timeouts | Poll defaults to 20 seconds and clamps at 25; iterative reconciliation treats an active command as timed out after 2 minutes by default; the legacy `waiting_for_tool` sweep uses a 90-second default and runs from the worker loop every 30 seconds; the plugin's 30-minute watchdog only clears local busy state. | Iterative recovery is reader-driven and may handle a terminal ack or timeout/finalize a dead session; the legacy sweep can fail, preflight-continue, or mark ready-to-apply. Neither path requeues the command, and no common deadline propagates task → command → plugin. | An upstream timeout can coexist with later Studio execution; clearing local busy state does not repair the durable command. | **Confirmed** — **backend/src/services/StudioBridgeService.js:1073-1134**, **backend/src/services/StudioAgentService.js:36-41,657-663,905-983**, **backend/src/services/AgentRunService.js:13,528-610**, **backend/src/workers/jobWorkerLoop.js:20,277-284**, **roblox-plugin/src/commands/registry.lua:590-654**. |
| Expiry | Pair/session/command expiry defaults are 10 minutes, 30 days, and 7 days, and the timestamps are persisted. Session verification enforces its expiry; command claim/ack does not explicitly enforce command `expiresAt`. | Expired queued/delivered commands are not shown returning to a terminal expired state; actual Firestore TTL deletion configuration is outside the inspected code. | Old commands can remain pending or execute later than the caller expects. | **Confirmed** metadata; cleanup guarantee **Unknown** — **backend/src/services/StudioBridgeService.js:67-81,406-499,575-593,941-1032,1073-1235**. |
| Duplicates | Command IDs are deterministic from user/session/idempotency input; terminal duplicate ack is ignored. The plugin HTTP client also generates request IDs per request. | Same session/key can deduplicate command creation; a new session changes command identity. | Reconnect/retry of the same logical action can create a new command; early duplicate-ack return prevents projection repair. | **Confirmed** — **backend/src/services/StudioBridgeService.js:67-98,1169-1235**, **roblox-plugin/src/net/httpClient.lua:69-71**. |
| Reconnect | Plugin re-pairs/re-polls using locally stored settings; browser job streams reconnect separately. A 401/403 heartbeat clears the plugin's local session. | New polls retrieve only `queued`; there is no claim lease or replay cursor for `delivered`, so Firestore preserves queued work but not recoverability of a claimed command. | Reconnection does not recover an ambiguously delivered command and may assign a new session identity. | **Confirmed** — **roblox-plugin/src/net/httpClient.lua:244-249**, **roblox-plugin/src/Main.server.lua:367-416**, **backend/src/services/StudioBridgeService.js:1073-1134**. |
| Cancellation | Iterative cancellation writes `cancelRequestedAt` and terminalizes immediately only when no step is active; legacy cancellation updates the run/job. No path recalls a Firestore command or interrupts plugin execution. | A plugin that already claimed an action continues unless its command handler implements its own stop behavior. | UI/run can appear cancelled while a Studio mutation completes later. | **Confirmed** — **backend/src/services/StudioAgentService.js:2763-2775**, **backend/src/services/AgentRunService.js:647-665**, **backend/src/services/StudioBridgeService.js:1073-1235**. |
| Task ownership | Commands store user and session identity and routes scope website operations to authenticated users. There is no canonical task ID binding every command to one task aggregate. | Authorization is checked at route/service boundaries; task-terminal reconciliation is service-specific. | A correctly user-scoped command can still be orphaned from its initiating job/run or falsely projected. | **Confirmed** scoping; **Strong inference** aggregate gap — **backend/src/routes/studio.js:408-424,1384-1425**, **backend/src/services/StudioBridgeService.js:943-1019**. |
| Session identity | Pairing creates a Studio session and token hash; command deterministic identity includes session ID. Manifest identity is also session/place oriented. | Expiry/token validation denies stale credentials; reconnect can create a different session. | Same logical place/action across sessions lacks a stable operation fence. | **Confirmed** — **backend/src/services/StudioBridgeService.js:96-98,428-498,575-593**, **backend/src/services/StudioManifestService.js:909-1003**. |
| Pairing codes | A random six-character code maps a website user to a plugin session through a Firestore transaction, with a ten-minute expiry and up to eight collision retries. | Claim requires pending/unexpired state, consumes the code once, creates the session, and returns its secret once with the poll interval. | Entropy/rate-limit safety depends on route-wide controls; the plugin claim route has no explicit local limiter, while the MCP path does. | **Confirmed** mechanics; **Unknown** complete deployed rate-limit coverage — **backend/src/services/StudioBridgeService.js:67-108,406-499**, **backend/src/routes/studio.js:425-463**. |
| Security validation | Firebase/verified-email protects website queueing; plugin bearer token is hash-verified timing-safely; MCP advertises capabilities; expected source hashes are available. | Failed authentication rejects requests. There is no independently signed/fenced command envelope and expected source hash is optional for some writes. | A valid but stale session/command can pass transport auth; optional optimistic concurrency permits overwrite races. | **Confirmed** — **backend/src/routes/studio.js:408-424,1384-1425**, **backend/src/services/StudioBridgeService.js:575-593**, **backend/src/lib/studioToolProtocol.js:744-857**. |

### Studio transport symptom trace

| Symptom | Current path that can produce it | Classification and evidence |
| --- | --- | --- |
| Empty | Long poll legitimately returns no queued command; plugin queue is memory-only and rebuilt from claims. Malformed or missing payload validation can also surface as a handler error rather than a command. | **Confirmed** empty-poll behavior; exact production reports are **Unknown** — **roblox-plugin/src/commands/registry.lua:527-655**. |
| Disappear | Claim moves a command to `delivered` before the plugin proves receipt; plugin restart then loses the local queue/in-flight copy. | **Confirmed failure window** — **backend/src/services/StudioBridgeService.js:1073-1134**, **roblox-plugin/src/commands/registry.lua:527-655**. |
| Execute twice | A reconnect/new session or non-atomic caller idempotency can create a new command for the same logical action; lost acknowledgements can prompt manual retry. | **Strong inference** — deterministic IDs are session-bound at **backend/src/services/StudioBridgeService.js:96-98**; no global operation fence was found. |
| Time out | Long poll, HTTP, agent wait, and caller deadlines are independent; a queued/delivered command has no shared terminal deadline. | **Confirmed** timeout fragmentation — transport mechanism rows above. |
| Remain pending | `delivered` has no lease/redelivery/expiry transition; downstream run/job can wait without a terminal acknowledgement. Reader-driven iterative and scheduled legacy recovery finalize or continue their parent state; neither requeues the command. | **Confirmed** — **backend/src/services/StudioBridgeService.js:1073-1235**, **backend/src/services/StudioAgentService.js:905-983**, **backend/src/services/AgentRunService.js:528-610**. |
| Success before execution | Legacy generation marks the job succeeded and emits done before queueing/awaiting background Studio apply. | **Confirmed** — **backend/src/workers/generateArtifactWorker.js:1424-1463**. |
| Fail after disconnect | Plugin close/network loss can occur after claim or execution but before ack; token/session expiry can reject the later ack. | **Confirmed failure window** — plugin HTTP retry and bridge claim/ack evidence above. |
| Lose results | Terminal ack is committed before downstream projections and a duplicate ack returns early; the plugin ignores the final ack response and has no durable replay, so exhausted retries or a crash after execution can leave no durable result. | **Confirmed failure windows** — **backend/src/services/StudioBridgeService.js:1169-1235**, **backend/src/routes/studio.js:1678-2069**, **roblox-plugin/src/commands/registry.lua:177-187,461-525,607-655**. |

## Manifest and shared project state

The current manifest stores paths, class names, managed IDs, and source/property hashes rather than full source at **backend/src/services/StudioManifestService.js:202-229**. Page-chain continuity, checksums, duplicate-page conflict detection, and atomic promotion of the last complete revision are implemented at **backend/src/services/StudioManifestService.js:562-834,1396-1573**. **backend/src/services/StudioProjectContextService.js:32-53** defaults agent reads to that last complete revision.

Limitations:

- **Strong inference:** manifest freshness can lag live Studio because the identified refresh path scans and persists stored revision summaries rather than issuing a live Studio readback at **backend/src/services/StudioManifestService.js:1081-1206**.
- Identity is primarily user/session/place/revision at **backend/src/services/StudioManifestService.js:909-1003**, not a stable project-owner-universe-place binding.
- Commands at **backend/src/services/StudioBridgeService.js:943-1019** similarly lack stable project, universe, and Roblox owner identity.
- Separate chats/projects can therefore remain isolated, but they also cannot safely discover one canonical set of universe resources.

### Manifest current-state matrix

| Reader, writer, or relationship | Current behavior and source of truth | Classification and evidence |
| --- | --- | --- |
| Plugin manifest writer | The plugin executes **get_project_manifest** against the live DataModel and returns a paged/structured manifest result through the command acknowledgement. Live Studio is the source at capture time. | **Confirmed** — **roblox-plugin/src/commands/registry.lua**, **backend/src/lib/studioToolProtocol.js**. |
| HTTP acknowledgement writer | The Studio ack route accepts the plugin result and invokes manifest persistence/projection after terminal command acknowledgement. | **Confirmed** — **backend/src/routes/studio.js:1743-2069**. |
| Manifest service writer/promoter | **StudioManifestService** validates page chain/checksums and promotes a last-complete revision in Firestore. It also retains revision/page/item state rather than full script source by default. | **Confirmed** — **backend/src/services/StudioManifestService.js:202-229,562-834,1396-1573**. |
| Ask reader | **AskStudioContextService** reads available manifest/context and selects/truncates relevant Studio information for conversational Ask; this is best-effort textual context, not a live tool transaction. | **Confirmed** — **backend/src/services/AskStudioContextService.js:173-285,468-545**, **backend/src/routes/ai.js:1301-1565**. |
| Legacy worker reader | **generateArtifactWorker** reads stored manifest/chat context and can request preflight Studio inspection before constructing its prompt. From-scratch and refinement paths differ. | **Confirmed** — **backend/src/workers/generateArtifactWorker.js:489-610,825,1383-1400**. |
| Iterative agent reader | **StudioProjectContextService** supplies the last complete manifest/relevant source to iterative decisions and can issue targeted live reads through tools. | **Confirmed** — **backend/src/services/StudioProjectContextService.js:28-142,424-425**, **backend/src/services/StudioAgentService.js:1004-1162**. |
| HTTP/browser readers | Studio routes expose manifest status/revision/content reads to authenticated web clients. These read persisted revisions unless a separate command refreshes them. | **Confirmed** — **backend/src/routes/studio.js:1257-1381**. |
| Legacy chat manifest reader/writer | **uiBuilder** and worker compatibility code also store/read a manifest-like value on chat state. That is a separate shape/path from canonical paged manifest revisions. | **Confirmed overlap** — **backend/src/routes/uiBuilder.js:1248-1258,1767-1787**, **backend/src/workers/generateArtifactWorker.js:608-610,825**. |
| Studio-to-web reconciliation | Web reads use the last-complete persisted snapshot. A manifest refresh or tool preflight is a separate command; a mutation acknowledgement may project manifest effects afterward. No transaction couples every Studio/web mutation to a new manifest revision. | **Confirmed** separate paths; **Strong inference** stale window — **backend/src/services/StudioManifestService.js:1081-1206**, **backend/src/workers/generateArtifactWorker.js:489-610,1383-1463**, **backend/src/routes/studio.js:1743-2069**. |
| Multiple projects sharing one universe | Canonical manifest and command identity are user/session/place/revision oriented and do not contain a stable project-owner-universe-place key. The repository therefore neither defines safe shared-universe discovery nor isolation/conflict policy for several web projects. | **Confirmed** missing key; behavior is **Strong inference** — **backend/src/services/StudioManifestService.js:909-1003**, **backend/src/services/StudioBridgeService.js:943-1019**. |
| Asset binding to project/place/universe | Project assets, ontology bindings, and chat generated uploads use separate records. Some bind to a project/chat or Roblox asset ID, but no manifest-owned relationship simultaneously proves project, place, universe, Roblox owner, and live insertion. | **Confirmed** fragmented records; **Unknown** any external/live convention not represented in the repo — **backend/src/lib/projectState.js:8**, **backend/src/services/AssetOntologyService.js:494-557,1447-1493**, **backend/src/services/ProjectAssetService.js:190-692**. |

## OAuth and Roblox capability state

### Implemented and reusable

- OAuth authorization uses state, PKCE, a ten-minute state record, and transactional state consumption when Firestore transactions are available: **backend/src/services/RobloxOAuthService.js:169-383**.
- Refresh tokens are encrypted with AES-256-GCM under **users/{uid}/integrations/roblox**: **backend/src/services/RobloxTokenStore.js:35-107**.
- Current capability metadata includes connection/resources/creator selection, asset upload/read/version/quota, and Creator Store search in **backend/src/services/RobloxCapabilityRegistry.js:1-340**.
- Current operational write implementations located in the repository cover image/decal and model assets.

### Gaps

- OAuth nonce is generated and stored but not validated against returned identity-token claims at **backend/src/services/RobloxOAuthService.js:169,383**.
- Encryption has no persisted key ID or rotation model; arbitrary secret input is hashed into a key at **backend/src/services/RobloxTokenStore.js:4-33**.
- Access-token cache and refresh deduplication are process-local at **backend/src/services/RobloxOAuthService.js:129,461**. **Strong inference:** concurrent instances can race rotating refresh tokens.
- Capability state at **backend/src/services/RobloxOAuthService.js:536-579** is a stored snapshot and agent context omits complete resources, freshness, policy/consent, and structured unavailable reasons.
- Scope planning always starts with a broad default bundle at **backend/src/services/RobloxCapabilityRegistry.js:275-297**.
- No operational badge, game-pass, developer-product, or Robux-pricing implementation was found. Registry entries for universe/group/secret operations are explicitly future.

Raw tokens must remain server-only. A versioned capability snapshot, not tokens or generic prompt prose, should be given to the agent.

### OAuth implementation inventory

| OAuth area | Current implementation | Classification and evidence |
| --- | --- | --- |
| Login | Server creates state, PKCE verifier/challenge, nonce, requested scopes, return target, and a ten-minute authorization transaction, then returns the Roblox authorization URL. | **Confirmed** — **backend/src/services/RobloxOAuthService.js:169-240**, **backend/src/routes/roblox.js:355-389**. |
| Callback | Server transactionally consumes state where supported, exchanges the authorization code, loads profile/resources, maps the user, and redirects. Stored nonce is not validated against identity-token claims. | **Confirmed**, with nonce gap — **backend/src/services/RobloxOAuthService.js:290-458**, **backend/src/routes/roblox.js:390-425**. |
| Token storage | Access tokens are AES-256-GCM encrypted in **users/{uid}/integrations/roblox**; ordinary reads redact encrypted token fields. | **Confirmed** — **backend/src/services/RobloxTokenStore.js:15-27,35-100,113-153**. |
| Refresh-token storage | Refresh tokens are encrypted alongside access tokens and removed when the integration is marked disconnected. | **Confirmed** — **backend/src/services/RobloxTokenStore.js:113-153,179-190**. |
| Token encryption | AES-256-GCM v1 provides confidentiality/integrity at rest. The key is derived by parsing/hashing one configured secret; no persisted key ID, rotation, or re-encryption path was found. | **Confirmed** implementation and rotation gap — **backend/src/services/RobloxTokenStore.js:4-13,39-76**. |
| Scope requests | Default request includes `openid`, `profile`, asset read/write, and Creator Store read; the planner begins with this broad bundle. Universe/group/private-server scope bundles are marked future. Actual grants can differ. | **Confirmed** requested metadata; live grant is **Unknown** — **backend/src/services/RobloxCapabilityRegistry.js:1-50,275-295**. |
| Token refresh | Access-token lookup refreshes near/after expiry and persists rotated tokens. Refresh deduplication is process-local. | **Confirmed** — **backend/src/services/RobloxOAuthService.js:461-534**. |
| Expiry handling | Authorization state expires after ten minutes; access-token expiry drives refresh; disconnected/expired status is reflected in integration state. | **Confirmed** — **backend/src/services/RobloxOAuthService.js:169-240,290-323,461-557**. |
| Revoked-token handling | `invalid_grant` or a revoked refresh marks the integration disconnected, removes encrypted values, and returns a reconnect-required error. Other live revocation behaviors depend on Roblox responses. | **Confirmed** code path; live behavior **Unknown** — **backend/src/services/RobloxOAuthService.js:499-515**, **backend/src/services/RobloxTokenStore.js:179-190**. |
| User identity mapping | Callback maps Roblox user profile/resource data into the authenticated Firebase user's integration document. It does not make a browser-supplied Roblox identity authoritative. | **Confirmed** — **backend/src/services/RobloxOAuthService.js:352-458**. |
| Universe access | Default scopes do not establish universe operations; universe capability entries are future and actual returned resources are only stored/summarized. | **Confirmed not operational**; current user's live access is **Unknown** — **backend/src/services/RobloxCapabilityRegistry.js:16-50,113-175**, **backend/src/services/RobloxOAuthService.js:352-458**. |
| Place access | No place-operation OAuth implementation or stable OAuth-resource-to-Studio-place binding was found. Studio session place identity is a separate authority. | **Confirmed repository gap**; live external access **Unknown** — **backend/src/services/StudioManifestService.js:909-1003**, **backend/src/services/RobloxOAuthService.js:536-574**. |
| Group access | Group scopes/capabilities are represented as future metadata; no operational group API wrapper was found. | **Confirmed not implemented** — **backend/src/services/RobloxCapabilityRegistry.js:16-50,113-175**. |
| Ownership validation | Selected creator is checked against an allowed creator list derived from connection/resources. This validates target selection, not full ownership/permission for every asset/universe/place operation. | **Confirmed: partial** — **backend/src/services/RobloxOAuthService.js:577-596**. |
| Capability loading | Status derives capabilities from stored connection/scopes/resources and returns availability metadata. Agent context includes user, selected creator, capability IDs, and policy, but omits the complete resource set/freshness and is not found in a production model tool registration. | **Confirmed** context limitation; model reachability **Strong inference** — **backend/src/services/RobloxOAuthService.js:536-574**, **backend/src/services/RobloxCapabilityRegistry.js:311-334**. |
| Error handling | Token endpoint errors use typed service codes; revoked refresh becomes reconnect-required. Resource lookup failure can silently return an empty list, disconnect revocation is best-effort, and callback places an error message in a redirect query. | **Confirmed mixed behavior** — **backend/src/services/RobloxOAuthService.js:325-380,499-515,599-616**, **backend/src/routes/roblox.js:422-425**. |
| Logging | OAuth audit events are attempted, but audit-write failure is swallowed. No repository-wide proof that every OAuth failure carries request/operation correlation exists. | **Confirmed** swallowed audit path; universal correlation **Unknown** — **backend/src/services/RobloxOAuthService.js:160-167**. |
| Security boundaries | Client secret and raw tokens remain server-side; PKCE/state, encrypted storage, redacted reads, Firebase-user mapping, and selected-creator validation are present. Missing nonce validation, no key rotation, process-local refresh dedupe, and incomplete resource-to-project/place binding remain. | **Confirmed** — OAuth and token-store evidence above. |

### OAuth operation availability

| Availability category | Current disposition | Classification and boundary |
| --- | --- | --- |
| Currently implemented | OAuth connect/callback/status/disconnect, selected-creator target, asset get/version/quota, image/decal/model upload paths, and Creator Store search have repository implementations. | **Confirmed in code, not live-validated** — **backend/src/routes/roblox.js:355-495**, capability/upload services. |
| Technically authorized by current scopes | Identity/profile, asset read/write, and Creator Store read can be authorized when those requested scopes were actually granted and the selected resource/creator permits the action. A scope alone does not prove target ownership or that every operation is implemented. | **Confirmed scope plan; Unknown per live account/grant** — **backend/src/services/RobloxCapabilityRegistry.js:1-14,275-334**. |
| Technically possible via official Roblox APIs but not implemented | No operation is promoted to this category from repository evidence alone. Universe/group/private-server candidates are marked future, but current official API availability, required scopes, and semantics require separate live documentation validation. | **Unknown by design** — the repository is insufficient evidence of current official platform support. |
| Not currently available | Universe/group/secret/private-server operations and badge, game-pass, developer-product, and Robux-pricing workflows are not operational in the inspected code. Asset/OAuth wrappers are also not found in the production model tool registry. | **Confirmed repository absence**; external platform possibility is not asserted — **backend/src/services/RobloxCapabilityRegistry.js:16-50,113-175**, **backend/src/services/RobloxAgentToolService.js:18-68**. |
| Uncertain without live validation | Actual granted scopes/resources, creator ownership, universe/place/group permissions, quota, moderation outcomes, deployed credentials/configuration, and current Roblox endpoint support cannot be established from static code. | **Unknown** until tested against the deployed environment and authorized Roblox account. |

## Persistence sources of truth

| Entity | Current authority | Durability concern |
| --- | --- | --- |
| User/chat messages | Firestore user/chat collections | Not a task ledger; orphaned user messages possible |
| Artifact job | Firestore **_jobs** | Terminal too early; late correction refused |
| Legacy run | Firestore **_agentRuns** | Can diverge from job |
| Iterative run/steps | Firestore **_studioAgentRuns** | Context incomplete; continuation topology uncertain |
| Live stream | Redis plus selected Firestore events | Intermediate details can expire |
| Studio command | Firestore **_studioCommands** | Delivered commands can strand; downstream projection not atomic |
| Live project | Roblox Studio place | Backend manifest can be stale |
| Manifest snapshot | Firestore manifest state/pages/items/revisions | Strong revision assembly, weak stable project/universe identity |
| OAuth refresh token | Encrypted Firestore integration document | No key rotation; multi-instance refresh race |
| Asset records | Three Firestore shapes plus Storage | No canonical lifecycle or owner/universe relationship |
| Billing/entitlement | Firestore services; legacy Prisma schema also exists | Schema duplication and deployment-specific authority need explicit documentation |
| Rate/security state | Redis in production | Reconnect disabled and client error events ignored at **backend/src/lib/securityStore.js:168-197** |

The Prisma schema at **backend/prisma/schema.prisma** contains only legacy User, UsageLog, and PaygCredit concepts and does not model the current task/runtime/asset system.

## Asset readiness

Three current stores overlap:

1. UI project assets under **users/{uid}/uiProjects/{projectId}/screens/assets**, rooted in **backend/src/lib/projectState.js:8**.
2. Global ontology collections such as **masterAssets**, **assetGenerations**, **robloxAssetBindings**, and **assetUsageEvents** in **backend/src/services/AssetOntologyService.js:494-557**.
3. Chat/project attachments and **generated_asset_uploads** under **users/{uid}/chats/{projectId}** in **backend/src/services/ProjectAssetService.js:190-692**.

### Existing icon and style asset reuse audit

| Existing component | What exists now | Reuse versus replacement | Existing UI versus Prompt 2 readiness | Classification and evidence |
| --- | --- | --- | --- | --- |
| **IconGeneratorPage.jsx** | Routed page with prompt, filter, reference-image upload, background option, generation request, preview, and download. It calls **/api/tools/generate-icon** with base64 reference data. | **Reuse** the user-flow shell, input controls, preview/download, and visual vocabulary. **Refactor** data ownership and submission into the canonical task/asset lifecycle rather than treating the provider URL as completion. | **UI exists. Not Prompt 2 ready:** no chat/project-bound approved asset record, reusable library/profile/bundle selection, Studio insertion receipt, or verified readback is shown. | **Confirmed** — **src/pages/IconGeneratorPage.jsx:33-53,96-128,160-188**, route at **src/App.js:29,74**. |
| **POST /api/tools/generate-icon** | Auth/premium/token checks, optional reference image, provider generation, token consumption, and seven-day Firestore history. Prompt enhancement is a separate direct model call. | **Reuse** authentication, entitlement/billing, reference-image validation, provider adapter, and history concepts. **Replace/refactor** direct response/history as the canonical asset result; reservation/idempotency, durable operation receipt, moderation/readiness, and project ownership must be unified. | **Backend mechanic exists. Not Prompt 2 ready:** result is primarily a URL/prompt/filter history record and errors can expose raw messages. | **Confirmed** — **backend/src/routes/tools.js:16-87,90-216**. |
| **backend/src/routes/icons.js** | Separate Firestore **icons** catalog/list/get/export API with filters and export-format selection. It is not the endpoint used by **IconGeneratorPage** generation. | **Reuse** searchable catalog and export API shape. **Merge/refactor** the separate collection into the canonical asset ontology rather than expanding a fourth lifecycle. | **Catalog/export backend exists. Not Prompt 2 ready:** no proof of project/universe ownership, generation task linkage, approval state, or live Studio verification. | **Confirmed** — **backend/src/routes/icons.js:16-125**. |
| **iconExporter.js** | Produces fixed Luau snippets for Bar, Button, and a generic icon from icon metadata. | **Reuse** as a compatibility exporter/example. **Replace** hard-coded templates as the primary generation/insertion path with versioned artifact templates and verified Studio operations. | **Export utility exists. Not Prompt 2 ready:** output generation is not a task, asset binding, insertion receipt, or readback verifier. | **Confirmed** — **backend/src/lib/iconExporter.js:6-137**. |
| **uiGenrePresets.js** | Genre presets, tokens, prompt/rubric/style guidance, and detection are already consumed by worker/UI generation code. | **Reuse directly** as initial style seeds and evaluation guidance. **Refactor** into versioned/editable style profiles or bundles only when the target lifecycle needs user-managed state. | **Prompt-time style system exists. Partially Prompt 2 ready:** useful seed data, but not an owned asset library, approved bundle version, provenance record, or universally injected project profile. | **Confirmed** — **backend/src/lib/uiGenrePresets.js:1-324**, consumers in **backend/src/lib/ai.js:503**, **backend/src/workers/generateArtifactWorker.js**, **backend/src/services/UIPlanService.js**, **backend/src/lib/uiBuilder.js**, and **backend/src/lib/promptExemplars.js**. |

The generated-upload queue has queue/retry methods at **backend/src/services/ProjectAssetService.js:625-692**, but no consuming worker was found. The agent reads the chat/project asset shape rather than the richer ontology shape.

Provider/storage issues:

- Generated images receive publicly accessible permanent Storage URLs at **backend/src/services/AssetPipelineService.js:86-113**.
- Provider selection silently falls through failures at **backend/src/lib/imageProviders/index.js:88-118**.
- DALL-E retries any error without a provider job receipt at **backend/src/lib/imageProviders/dalle.js:37-72**, leaving successful-but-lost ambiguity.
- Background-removal failure can pass through an opaque image as ready at **backend/src/lib/bgRemoval.js:102-127**.
- Moderation **unknown/submitted** can coexist with an asset ID and current reuse/promotion paths at **backend/src/services/AssetOntologyService.js:409-445** and **backend/src/services/RobloxModelUploadService.js:298-350**.
- Applying an asset ID at **backend/src/services/AssetOntologyService.js:1447-1493** updates project state; it does not prove Studio insertion or a verified readback.

## Errors, observability, deployment, and configuration

### Current error-handling and observability matrix

| Required audit case | Current behavior | Classification and evidence |
| --- | --- | --- |
| Raw errors shown to users | Icon generation returns `error.message` in JSON; OAuth callback appends a service error message to a redirect query. Other routes use curated messages. | **Confirmed: selected paths** — **backend/src/routes/tools.js:203-216**, **backend/src/routes/roblox.js:422-425**. |
| Swallowed errors | Artifact launch converts capability/project-context failures to disconnected/empty context; OAuth audit writes and selected revoke/resource failures are best-effort; image provider selection silently falls through. | **Confirmed** — **backend/src/services/artifactRunLauncher.js:135-142**, **backend/src/services/RobloxOAuthService.js:160-167,352-380,599-616**, **backend/src/lib/imageProviders/index.js:88-118**. |
| Generic error messages | Icon catalog/export handlers respond with generic list/fetch/export messages, losing a stable cause taxonomy at the client boundary. | **Confirmed** — **backend/src/routes/icons.js:77-80,101-104,121-124**. |
| Inconsistent HTTP status codes | Routes variously return raw 500 messages, status-code-bearing service errors, redirects with query errors, SSE close, or generic JSON; no universal error envelope was found. | **Confirmed** — sampled **backend/src/routes/tools.js:203-216**, **backend/src/routes/roblox.js:355-495**, **backend/src/routes/ai.js:1482-1564**. |
| Unstructured logs | Direct `console.log`/`console.warn`/`console.error` calls emit free-form text/objects in tool routes and process-level exception handlers. | **Confirmed** — **backend/src/routes/tools.js:40-54,83-85,146,203-215**, **backend/server.js:68-74**. |
| Missing request IDs | Some artifact requests accept/carry a request or idempotency ID, but the sampled Ask, OAuth, tools, and process-error paths do not enforce one request ID in every log/error/record. | **Confirmed: not universal** — route evidence above and **backend/src/routes/ai.js:748-908**. |
| Missing task IDs | No canonical task entity/ID exists; job/run/command IDs are branch-local and errors before creation cannot name a task. | **Confirmed** — task inventory above. |
| Missing operation IDs | Studio deterministic command IDs and selected Roblox operation/receipt concepts exist, but provider/image/OAuth/Ask calls do not share a required external-operation ID. | **Confirmed: not universal** — **backend/src/services/StudioBridgeService.js:67-98,943-1019**, **backend/src/routes/roblox.js:475-495**, **backend/src/routes/tools.js:90-216**. |
| Secrets in logs | Normal token-store reads redact encrypted token fields and OAuth code paths do not intentionally log raw tokens in the inspected samples. A repository-wide structured redaction policy or deployed log audit was not found. | **Unknown** whether secrets have ever reached live logs; defensive evidence — **backend/src/services/RobloxTokenStore.js:15-27,78-100**. |
| Duplicate logs | Without a universal request/task/operation correlation key and deduplication policy, static code cannot establish whether multi-layer logs represent duplicates or distinct attempts. | **Unknown** — requires live log sampling; the missing correlation envelope is confirmed. |
| Failure paths with no logging | Swallowed OAuth audit/context/provider branches can continue with no guaranteed durable error event; an Ask stream failure after headers can end without a structured terminal task record. | **Confirmed** — **backend/src/services/RobloxOAuthService.js:160-167**, **backend/src/services/artifactRunLauncher.js:135-142**, **backend/src/routes/ai.js:1482-1564**. |
| Success responses not verified | Legacy artifact job success precedes Studio apply; bridge maps every ack status except literal `failed` to success without requiring `result.ok`/`verified`; verifier exceptions can preserve apparent success. | **Confirmed** — **backend/src/workers/generateArtifactWorker.js:1424-1463**, **backend/src/services/StudioBridgeService.js:1169-1193**, **roblox-plugin/src/commands/registry.lua:398-432**. |

- **backend/server.js:68-74** logs unhandled rejection/exception but does not terminate on an uncaught exception.
- **backend/server.js:97-108** exposes static health/status success without Firebase, Redis, worker, storage, OAuth, or provider readiness.
- **backend/src/services/artifactRunLauncher.js:135-142** swallows capability/project context errors into disconnected/empty context.
- **backend/src/lib/imageProviders/index.js:88-118** silently changes providers on failure.
- Ask streaming at **backend/src/routes/ai.js:1482-1564** can close after headers without a structured terminal error; **src/hooks/useUnifiedChat.js:344-432** saves accumulated output as success.
- Logs and records use some request/job/run/command IDs, but no enforced correlation envelope carries request, trace, task, step, operation, command, user, project, universe, and Studio session IDs through every boundary.
- **RUN_JOB_WORKER**, **STUDIO_ITERATIVE_AGENT_ENABLED**, **STUDIO_PREFLIGHT_FROM_SCRATCH_ENABLED**, and **STREAM_EVENT_PERSISTENCE_ENABLED** materially alter behavior. The repository does not contain a single validated startup manifest proving compatible production values.
- **backend/src/workers/jobWorkerLoop.js:8-15,222-285** uses a process-local running guard and one-at-a-time polling loop. Firestore job claims have leases, but process topology and readiness are not exposed.
- Root and backend CI validate builds/tests, but frontend dependency installation is not lockfile-enforced in the inspected workflow.

## Deprecated and overlapping paths

The following should be treated as compatibility paths until migration gates pass:

- legacy **apply_artifact**;
- **AgentRunService** alongside **StudioAgentService**;
- direct Ask, orchestration, and artifact submission branches in **useUnifiedChat**;
- **src/lib/aiRouter.js** and regex intent classifiers in both frontend/backend;
- legacy Prisma billing models where Firestore services are authoritative;
- chat-local generated upload queues without a consumer;
- three asset schemas;
- existing job result endpoints once the task projection is authoritative.

None should be deleted during contract/runtime introduction. Instrument and shadow-compare before deprecation.
