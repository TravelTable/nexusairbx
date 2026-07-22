# Roblox asset pipeline changed-file inventory

Audit date: 22 July 2026.

The frontend/plugin repository and `backend/` are separate Git worktrees. This
inventory records the files that implement or document this rollout; it does not
authorize overwriting unrelated work in either worktree.

## Architecture and operations documentation

- `docs/roblox-asset-pipeline-2026-07-22/README.md`
- `docs/roblox-asset-pipeline-2026-07-22/roblox-capabilities.md`
- `docs/roblox-asset-pipeline-2026-07-22/operations-security-and-testing.md`
- `docs/roblox-asset-pipeline-2026-07-22/changed-files.md`
- `docs/roblox-oauth-token-broker.md`
- `docs/studio-tool-protocol.md`
- `docs/interactive-plan-mode.md`

## Backend configuration, migration, and contracts

- `backend/.env.example`
- `backend/firestore.indexes.json`
- `backend/package.json`
- `backend/server.js`
- `backend/scripts/backfillAssetPlatformV3.js`
- `backend/scripts/backfillAssetPlatformV3.test.js`
- `backend/src/lib/assetPlatform/contracts.js`
- `backend/src/lib/assetPlatform/contracts.test.js`
- `backend/src/lib/assetPlatformObservability.js`
- `backend/src/lib/assetPlatformObservability.test.js`
- `backend/src/lib/conversationalChat.js`
- `backend/src/lib/conversationalChat.test.js`
- `backend/src/lib/robloxOAuthStateBinding.js`
- `backend/src/lib/robloxOAuthStateBinding.test.js`
- `backend/src/lib/studioToolProtocol.js`
- `backend/src/lib/studioToolProtocol.test.js`
- `backend/src/lib/taskRuntime/validators.js`
- `backend/src/lib/userSettingsSchema.js`

## Backend OAuth, creator, provider, and canonical asset services

- `backend/src/services/RobloxCapabilityRegistry.js`
- `backend/src/services/RobloxCapabilityRegistry.test.js`
- `backend/src/services/RobloxCreatorResolver.js`
- `backend/src/services/RobloxCreatorResolver.test.js`
- `backend/src/services/RobloxDecalUploadService.js`
- `backend/src/services/RobloxDecalUploadService.test.js`
- `backend/src/services/RobloxModelUploadService.js`
- `backend/src/services/RobloxOAuthService.js`
- `backend/src/services/RobloxOAuthService.test.js`
- `backend/src/services/RobloxOidcVerifier.js`
- `backend/src/services/RobloxOidcVerifier.test.js`
- `backend/src/services/RobloxOpenCloudClient.js`
- `backend/src/services/RobloxOpenCloudClient.test.js`
- `backend/src/services/RobloxTokenStore.js`
- `backend/src/services/RobloxTokenStore.test.js`
- `backend/src/services/assetPlatform/AssetPublishingPolicyService.js`
- `backend/src/services/assetPlatform/AssetPublishingPolicyService.test.js`
- `backend/src/services/assetPlatform/AssetOperationService.js`
- `backend/src/services/assetPlatform/AssetOperationService.test.js`
- `backend/src/services/assetPlatform/AssetRegistryService.js`
- `backend/src/services/assetPlatform/AssetRegistryService.test.js`
- `backend/src/services/assetPlatform/AssetSearchService.js`
- `backend/src/services/assetPlatform/AssetSearchService.test.js`
- `backend/src/services/assetPlatform/AssetValidationService.js`
- `backend/src/services/assetPlatform/AssetValidationService.test.js`
- `backend/src/services/assetPlatform/CanonicalAssetToolExecutor.js`
- `backend/src/services/assetPlatform/CanonicalAssetToolExecutor.test.js`
- `backend/src/services/assetPlatform/CanonicalUserUploadService.js`
- `backend/src/services/assetPlatform/CanonicalUserUploadService.test.js`
- `backend/src/services/assetPlatform/RobloxAssetPublishingService.js`
- `backend/src/services/assetPlatform/RobloxAssetPublishingService.test.js`
- `backend/src/services/assetPlatform/AssetPublishingReconciliationService.js`
- `backend/src/services/assetPlatform/AssetPublishingReconciliationService.test.js`
- `backend/src/services/assetPlatform/RobloxMonetizationAdapter.js`
- `backend/src/services/assetPlatform/RobloxMonetizationAdapter.test.js`
- `backend/src/services/assetPlatform/TaskAssetToolAdapter.js`

## Backend routes, runtime, workflow, Studio, and integration coverage

- `backend/src/routes/assetPlatform.js`
- `backend/src/routes/assetPlatform.test.js`
- `backend/src/routes/roblox.js`
- `backend/src/routes/taskRuntime.js`
- `backend/src/routes/taskRuntime.test.js`
- `backend/src/routes/workflow.js`
- `backend/src/routes/workflowConversational.js`
- `backend/src/routes/workflowConversational.test.js`
- `backend/src/routes/workflowPlan.test.js`
- `backend/src/integration/robloxAssetPipeline.integration.test.js`
- `backend/src/services/AgentContextAssembler.js`
- `backend/src/services/AgentContextAssembler.test.js`
- `backend/src/services/StudioAssetReferenceService.js`
- `backend/src/services/StudioAssetReferenceService.test.js`
- `backend/src/services/StudioBridgeService.js`
- `backend/src/services/StudioCommandVerificationService.js`
- `backend/src/services/StudioCommandVerificationService.test.js`
- `backend/src/services/TaskAssetToolAdapter.js`
- `backend/src/services/TaskAssetToolAdapter.test.js`
- `backend/src/services/WorkflowAssetContextService.js`
- `backend/src/services/WorkflowAssetContextService.test.js`
- `backend/src/services/WorkflowPlanExecutionService.d.ts`
- `backend/src/services/WorkflowPlanExecutionService.js`
- `backend/src/services/WorkflowPlanReadinessService.js`
- `backend/src/services/WorkflowPlanReadinessService.test.js`
- `backend/src/services/WorkflowPlanService.js`
- `backend/src/services/WorkflowPlanService.test.js`
- `backend/src/services/WorkflowPlanV3Service.d.ts`
- `backend/src/services/WorkflowPlanV3Service.js`
- `backend/src/services/WorkflowPlanV3Service.test.js`
- `backend/src/services/agentV2/ChatAgentService.js`
- `backend/src/services/agentV2/ChatAgentService.test.js`
- `backend/src/services/artifactRunLauncher.js`
- `backend/src/services/artifactRunLauncher.test.js`
- `backend/src/services/taskRuntime/ArtifactTaskRuntimeFacade.js`
- `backend/src/services/taskRuntime/ArtifactTaskRuntimeFacade.test.js`
- `backend/src/services/taskRuntime/NaturalLanguageAssetToolAdapter.js`
- `backend/src/services/taskRuntime/NaturalLanguageAssetToolAdapter.test.js`
- `backend/src/services/taskRuntime/TaskIntakeService.js`
- `backend/src/services/taskRuntime/TaskIntakeService.test.js`
- `backend/src/services/taskRuntime/TaskAssetToolDispatchService.js`
- `backend/src/services/taskRuntime/TaskAssetToolDispatchService.test.js`
- `backend/src/services/taskRuntime/TaskRuntimeRepository.js`
- `backend/src/services/taskRuntime/index.js`
- `backend/src/services/taskRuntime/taskRuntime.test.js`
- `backend/src/workers/assetPublishingReconciliationWorker.js`
- `backend/src/workers/assetPublishingReconciliationWorker.test.js`

`POST /asset-platform/tools/:toolName` is the executable authenticated canonical
tool boundary. `NaturalLanguageAssetToolAdapter` compiles bounded
high-confidence asset requests into at most six typed calls. The existing
`ChatAgentService` launch path executes those calls through
`TaskIntakeService.executeAssetTool` and `TaskAssetToolDispatchService` with
immutable task authority, task-scoped idempotency, and sanitized receipts. This
is active deterministic integration, not unrestricted model-selected asset tool
execution.

## Frontend asset, connection, plan, and agent integration

- `src/components/ai/chat/ChatComposer.jsx`
- `src/components/ai/chat/FlowCards.jsx`
- `src/components/ai/chat/FlowCards.test.jsx`
- `src/components/ai/workspace/AgentChatPanel.jsx`
- `src/components/ai/workspace/PlanWorkspace.jsx`
- `src/components/ai/workspace/PlanWorkspace.test.jsx`
- `src/components/ai/workspace/RobloxAssetTray.jsx`
- `src/components/ai/workspace/RobloxAssetTray.test.jsx`
- `src/components/ai/workspace/TaskProgressPanel.jsx`
- `src/components/ai/workspace/TaskProgressPanel.test.jsx`
- `src/components/assets/AssetCard.jsx`
- `src/components/assets/AssetCard.test.jsx`
- `src/components/assets/AssetContextBar.jsx`
- `src/components/assets/AssetGenerationForm.jsx`
- `src/components/assets/AssetGenerationForm.test.jsx`
- `src/components/assets/AssetLifecycleBadge.jsx`
- `src/components/assets/AssetLifecycleTimeline.jsx`
- `src/components/assets/AssetLifecycleTimeline.test.jsx`
- `src/components/assets/CanonicalAssetPreview.jsx`
- `src/components/assets/CanonicalAssetPreview.test.jsx`
- `src/components/assets/assetPlatform.css`
- `src/hooks/useAiPageZoom.js`
- `src/hooks/usePlanWorkspace.js`
- `src/hooks/usePlanWorkspace.test.js`
- `src/hooks/useTaskRuntime.js`
- `src/hooks/useTaskRuntime.test.js`
- `src/hooks/useUnifiedChat.js`
- `src/hooks/useUnifiedChat.test.js`
- `src/lib/assetPlatformApi.js`
- `src/lib/assetPlatformApi.test.js`
- `src/lib/authedFetch.test.js`
- `src/lib/billing.js`
- `src/lib/featureFlags.js`
- `src/lib/robloxOAuthApi.js`
- `src/lib/robloxOAuthApi.test.js`
- `src/lib/settingsSchema.js`
- `src/lib/workflowApi.d.ts`
- `src/lib/workflowApi.js`
- `src/lib/workflowApi.test.js`
- `src/lib/workflowPlan.d.ts`
- `src/lib/workflowPlan.js`
- `src/lib/workflowPlan.test.js`
- `src/pages/AssetDetailPage.jsx`
- `src/pages/AssetLibraryPage.jsx`
- `src/pages/IconGeneratorPage.jsx`
- `src/pages/SettingsPage.jsx`
- `src/pages/ai/AgentWorkspaceLayout.jsx`
- `src/pages/ai/AgentWorkspaceLayout.taskRuntime.test.jsx`
- `src/styles/aiTheme.css`

## Roblox Studio bridge

- `roblox-plugin/NexusRBXStudioBridge.plugin.lua`
- `roblox-plugin/build/bundle-plugin.js`
- `roblox-plugin/src/commands/registry.lua`
- `roblox-plugin/src/commands/writeTools.lua`
- `roblox-plugin/src/config.lua`
- `roblox-plugin/src/studio/path.lua`
- `roblox-plugin/src/studio/serialization.lua`
- `roblox-plugin/src/studio/snapshot.lua`
- `roblox-plugin/src/ui/BridgePanel.lua`

The generated `roblox-plugin/NexusRBXStudioBridge.plugin.lua` is the installable
artifact. `roblox-plugin/src/` is source input and is not installed directly.
