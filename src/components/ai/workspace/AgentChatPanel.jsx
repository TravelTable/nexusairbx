import React, { useCallback } from "react";
import ChatView from "../ChatView";
import ChatComposer from "../chat/ChatComposer";

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
  onStudioConnectionOpen = null,
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
  workspaceControls = null,
  navigationOpen = false,
  navigationControls = undefined,
  navigationButtonRef = null,
}) {
  const handleComposerSubmit = useCallback(
    (event, overridePrompt = null, composerOptions = {}) => {
      return onSubmit?.(event, overridePrompt, composerOptions);
    },
    [onSubmit]
  );

  const handleEditMessage = useCallback(
    (message) => {
      const messageId = String(message?.id || "").trim();
      setPrompt?.(String(message?.content || ""));
      if (Array.isArray(message?.attachments)) setAttachments?.(message.attachments);
      if (messageId) {
        setRewindTarget?.({ messageId, mode: "replace" });
      } else {
        setRewindTarget?.(null);
      }
    },
    [setAttachments, setPrompt, setRewindTarget]
  );

  return (
    <div
      className="agent-chat-panel flex h-full min-h-0 min-w-0 w-full max-w-full flex-1 flex-col overflow-hidden bg-transparent"
      data-empty={messages?.length === 0 && !pendingMessage ? "true" : "false"}
    >
      <div className="agent-chat-panel__content flex min-h-0 min-w-0 w-full max-w-full flex-1 flex-col">
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
            onApprovePlan={onApprovePlan}
            onClarifySubmit={onClarifySubmit}
            onEditPlan={onEditPlan}
            onViewUi={onOpenArtifact}
            onRefine={onRefine}
            onQuickStart={onQuickStart}
            onStartGuide={onStartGuide}
            startGuideLabel={startGuideLabel}
            notify={notify}
            onApproveStep={onApproveStep}
            approvingStepId={approvingStepId}
            studioConnected={studioConnected}
            studioConnectionState={studioConnectionState}
            studioLoading={studioLoading}
            onRenameChat={onRenameChat}
            onOpenNavigation={onOpenNavigation}
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
                ? "Describe what you want to plan…"
                : activeMode === "ask"
                  ? "Ask Nexus about this project…"
                  : "Tell Nexus what to build or fix…"
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
          onStudioConnectionOpen={onStudioConnectionOpen}
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
