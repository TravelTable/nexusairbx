import React, { useCallback, useEffect, useState } from "react";
import ChatView from "../ChatView";
import ChatComposer from "../chat/ChatComposer";
import PlanWorkspace from "./PlanWorkspace";
import FEATURE_FLAGS from "../../../lib/featureFlags";

// Primary Studio agent surface. Chat drives the workflow; deeper build state
// lives in the workspace dock so the conversation keeps the available width.
export default function AgentChatPanel({
  // chat
  currentChatId,
  chatTitle = "New chat",
  projectTitle = "Workspace",
  projectId = "",
  messages,
  pendingMessage,
  pendingMessages,
  generationStage,
  user,
  profile,
  activeMode,
  isBusy,
  operationState,
  onApprovePlan,
  onClarifySubmit,
  onEditPlan,
  onRefine,
  onStartRefine,
  onOpenArtifact,
  onQuickStart,
  onStartGuide,
  startGuideLabel,
  onRenameChat,
  onOpenNavigation,
  onRetryMessage,
  onRestoreRun,
  notify,
  onApproveStep,
  approvingStepId,
  onSelectStudioTarget,
  selectingStudioTargetId,
  // studio
  studioConnected,
  studioConnectionType,
  studioConnectionState,
  studioCapabilities,
  studioLoading,
  studioEnabled,
  onStudioEnabledChange,
  studioApplyMode,
  onStudioApplyModeChange,
  studioAutoPushEnabled,
  onStudioAutoPushEnabledChange,
  studioAutoPushPolicy,
  onStudioAutoPushPolicyChange,
  studioAutoPushAuthorized,
  studioPlacePreference = null,
  studioPlaceOptions = [],
  studioPlacePickerOpen = null,
  onStudioPlacePickerOpenChange = null,
  onStudioConnectionOpen = null,
  onSelectStudioPlace = null,
  studioCollaborators,
  // roblox cloud
  robloxConnected,
  robloxLoading,
  robloxSelectedCreator,
  robloxUploadAvailable,
  robloxUploadState,
  robloxUploadDisabledReason,
  robloxAssetUploadsEnabled,
  robloxAssetProjectId,
  onRobloxAssetUploadsEnabledChange,
  robloxAssetLibraryAvailable,
  robloxAssetLibraryDisabledReason,
  robloxProjectAssets = [],
  onOpenAssetLibrary,
  assetLibraryOpen,
  onCloseAssetLibrary,
  onConfirmProjectAssets,
  onRemoveProjectAsset,
  projectAssetSaving,
  selectedAssetProjectId,
  robloxStatus,
  // composer
  prompt,
  setPrompt,
  setRewindTarget,
  attachments,
  setAttachments,
  robloxImageUploading = false,
  robloxImageUploads = [],
  onSubmit,
  onStop,
  onResumeQueue,
  onSendNext,
  onRemoveQueued,
  refineTarget,
  onCancelRefine,
  rewindTarget = null,
  onCancelRewind,
  onFileUpload,
  onImprovePrompt,
  isImproving,
  tokensLeft,
  tokensLimit,
  resetsAt,
  planKey,
  unlimitedTokens,
  devOverride,
  dailyUsage,
  includedUsage,
  premiumBalance,
  isFreeUsagePlan,
  billingLoading,
  billingError,
  composerLocked = false,
  themePrimary,
  themeSecondary,
  onModeChange,
  onPlanTaskAccepted,
  executionTask,
  workspaceControls = null,
  navigationOpen = false,
  navigationControls = undefined,
  navigationButtonRef = null,
  workspaceView,
  onWorkspaceViewChange,
}) {
  const [internalView, setInternalView] = useState("chat");
  const view = workspaceView ?? internalView;
  const setView = useCallback(
    (nextView) => {
      setInternalView(nextView);
      onWorkspaceViewChange?.(nextView);
    },
    [onWorkspaceViewChange],
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const openPlanWorkspace = useCallback(() => setView("plan"), [setView]);
  const hasReviewablePlan = Boolean(
    executionTask ||
    messages?.some((message) =>
      ["plan", "plan_approved"].includes(
        String(message?.stage || "").toLowerCase(),
      ),
    ),
  );

  useEffect(() => {
    setView("chat");
  }, [currentChatId, setView]);

  const handlePlanExecute = useCallback(
    async ({ result }) => {
      const task =
        result?.task || result?.execution?.task || result?.run || null;
      const taskId =
        task?.taskId ||
        task?.id ||
        result?.taskId ||
        result?.execution?.taskId ||
        result?.runId ||
        "";
      if (!taskId)
        throw new Error("NexusRBX did not return an execution task.");
      onPlanTaskAccepted?.(task || taskId);
    },
    [onPlanTaskAccepted],
  );

  const handleComposerSubmit = useCallback(
    (event, overridePrompt = null, composerOptions = {}) => {
      const submission = onSubmit?.(event, overridePrompt, {
        ...composerOptions,
        ...(selectedTemplateId ? { templateId: selectedTemplateId } : {}),
      });
      setSelectedTemplateId("");
      return submission;
    },
    [onSubmit, selectedTemplateId],
  );

  const handleEditMessage = useCallback(
    (message) => {
      const messageId = String(message?.id || "").trim();
      setPrompt?.(String(message?.content || ""));
      if (Array.isArray(message?.attachments))
        setAttachments?.(message.attachments);
      if (messageId) {
        setRewindTarget?.({ messageId, mode: "replace" });
      } else {
        setRewindTarget?.(null);
      }
    },
    [setAttachments, setPrompt, setRewindTarget],
  );

  return (
    <div
      className="agent-chat-panel flex h-full min-h-0 min-w-0 w-full max-w-full flex-1 flex-col overflow-hidden bg-transparent"
      data-empty={messages?.length === 0 && !pendingMessage ? "true" : "false"}
    >
      <div className="agent-chat-panel__content flex min-h-0 min-w-0 w-full max-w-full flex-1 flex-col">
        {view === "plan" && FEATURE_FLAGS.newPlanningMode ? (
          <div className="min-h-0 min-w-0 w-full max-w-full flex-1 overflow-y-auto scrollbar-subtle">
            <PlanWorkspace
              enabled
              messages={messages}
              userId={user?.uid || "guest"}
              chatId={currentChatId || "chat"}
              projectId={projectId}
              studioConnected={Boolean(studioConnected)}
              studioTarget={studioPlacePreference}
              executionTask={executionTask}
              onExecute={handlePlanExecute}
              onViewProgress={() => setView("chat")}
              notify={notify}
              onUseTemplate={(starterPrompt, templateId) => {
                setPrompt(starterPrompt);
                setSelectedTemplateId(String(templateId || ""));
                onModeChange?.("plan");
                setView("chat");
              }}
            />
          </div>
        ) : (
          <div className="relative flex min-h-0 min-w-0 w-full max-w-full flex-1 flex-col">
            <ChatView
              chatId={currentChatId}
              chatTitle={chatTitle}
              projectTitle={projectTitle}
              projectId={projectId}
              messages={messages}
              pendingMessage={pendingMessage}
              pendingMessages={pendingMessages}
              generationStage={generationStage}
              user={user}
              profile={profile}
              activeMode={activeMode}
              isBusy={isBusy}
              onApprovePlan={
                FEATURE_FLAGS.newPlanningMode ? undefined : onApprovePlan
              }
              onClarifySubmit={onClarifySubmit}
              onEditPlan={
                FEATURE_FLAGS.newPlanningMode ? openPlanWorkspace : onEditPlan
              }
              onViewUi={onOpenArtifact}
              onRefine={onRefine}
              onQuickStart={onQuickStart}
              onStartGuide={onStartGuide}
              startGuideLabel={startGuideLabel}
              notify={notify}
              onApproveStep={onApproveStep}
              approvingStepId={approvingStepId}
              onSelectStudioTarget={onSelectStudioTarget}
              selectingStudioTargetId={selectingStudioTargetId}
              studioConnected={studioConnected}
              studioConnectionState={studioConnectionState}
              studioLoading={studioLoading}
              studioPlacePreference={studioPlacePreference}
              onRenameChat={onRenameChat}
              onOpenNavigation={onOpenNavigation}
              onOpenPlan={
                FEATURE_FLAGS.newPlanningMode && hasReviewablePlan
                  ? openPlanWorkspace
                  : undefined
              }
              onEditMessage={handleEditMessage}
              onRetryMessage={onRetryMessage}
              onRestoreRun={onRestoreRun}
              workspaceControls={workspaceControls}
              navigationOpen={navigationOpen}
              navigationControls={navigationControls}
              navigationButtonRef={navigationButtonRef}
              showHeader={false}
            />
          </div>
        )}
      </div>

      <div className="shrink-0">
        <ChatComposer
          prompt={prompt}
          setPrompt={setPrompt}
          attachments={attachments}
          setAttachments={setAttachments}
          robloxImageUploading={robloxImageUploading}
          robloxImageUploads={robloxImageUploads}
          onSubmit={handleComposerSubmit}
          onStop={onStop}
          operationState={operationState}
          onResumeQueue={onResumeQueue}
          onSendNext={onSendNext}
          onRemoveQueued={onRemoveQueued}
          isGenerating={isBusy}
          generationStage={generationStage}
          placeholder={
            refineTarget
              ? "Describe the exact Studio change..."
              : activeMode === "plan"
                ? "Describe what you want to plan before building..."
                : "Describe the outcome you want Nexus to build..."
          }
          refineTarget={refineTarget}
          onCancelRefine={onCancelRefine}
          onStartRefine={onStartRefine}
          rewindTarget={rewindTarget}
          onCancelRewind={onCancelRewind}
          tokensLeft={tokensLeft}
          tokensLimit={tokensLimit}
          resetsAt={resetsAt}
          planKey={planKey}
          unlimitedTokens={unlimitedTokens}
          devOverride={devOverride}
          dailyUsage={dailyUsage}
          includedUsage={includedUsage}
          premiumBalance={premiumBalance}
          isFreeUsagePlan={isFreeUsagePlan}
          billingLoading={billingLoading}
          billingError={billingError}
          themePrimary={themePrimary}
          themeSecondary={themeSecondary}
          onFileUpload={onFileUpload}
          onImprovePrompt={onImprovePrompt}
          isImproving={isImproving}
          disabled={composerLocked}
          mode={activeMode}
          onModeChange={onModeChange}
          studioConnected={studioConnected}
          studioConnectionType={studioConnectionType}
          studioConnectionState={studioConnectionState}
          studioCapabilities={studioCapabilities}
          studioLoading={studioLoading}
          studioEnabled={studioEnabled}
          onStudioEnabledChange={onStudioEnabledChange}
          studioApplyMode={studioApplyMode}
          onStudioApplyModeChange={onStudioApplyModeChange}
          studioAutoPushEnabled={studioAutoPushEnabled}
          onStudioAutoPushEnabledChange={onStudioAutoPushEnabledChange}
          studioAutoPushPolicy={studioAutoPushPolicy}
          onStudioAutoPushPolicyChange={onStudioAutoPushPolicyChange}
          studioAutoPushAuthorized={studioAutoPushAuthorized}
          studioCollaborators={studioCollaborators}
          studioPlacePreference={studioPlacePreference}
          studioPlaceOptions={studioPlaceOptions}
          studioPlacePickerOpen={studioPlacePickerOpen}
          onStudioPlacePickerOpenChange={onStudioPlacePickerOpenChange}
          onStudioConnectionOpen={onStudioConnectionOpen}
          onSelectStudioPlace={onSelectStudioPlace || onSelectStudioTarget}
          selectingStudioTargetId={selectingStudioTargetId}
          robloxConnected={robloxConnected}
          robloxLoading={robloxLoading}
          robloxSelectedCreator={robloxSelectedCreator}
          robloxUploadAvailable={robloxUploadAvailable}
          robloxUploadState={robloxUploadState}
          robloxUploadDisabledReason={robloxUploadDisabledReason}
          robloxAssetUploadsEnabled={robloxAssetUploadsEnabled}
          onRobloxAssetUploadsEnabledChange={onRobloxAssetUploadsEnabledChange}
          robloxAssetLibraryAvailable={robloxAssetLibraryAvailable}
          robloxAssetLibraryDisabledReason={robloxAssetLibraryDisabledReason}
          robloxProjectAssets={robloxProjectAssets}
          onOpenAssetLibrary={onOpenAssetLibrary}
          assetLibraryOpen={assetLibraryOpen}
          onCloseAssetLibrary={onCloseAssetLibrary}
          onConfirmProjectAssets={onConfirmProjectAssets}
          onRemoveProjectAsset={onRemoveProjectAsset}
          projectAssetSaving={projectAssetSaving}
          assetProjectId={selectedAssetProjectId}
          robloxStatus={robloxStatus}
        />
      </div>
    </div>
  );
}
