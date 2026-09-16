import React, { useCallback, useEffect, useRef, useState } from "react";
import { authedFetch } from "../../../lib/billing";
import ChatView from "../ChatView";
import ChatComposer from "../chat/ChatComposer";
import CompactAgentRunBar from "./CompactAgentRunBar";
import { getWorkspacePresentation, scopeMatches, workspacePresentationAttributes } from "../../../lib/runPresentation";
import { useWorkspacePresentation } from "./WorkspacePresentationContext";
import InlineCreditConfirmation from "./InlineCreditConfirmation";
import { formatNexusCredits } from "../../../lib/creditDenomination";
import { useNexusAutoPreferences } from "../../../hooks/useNexusAutoPreferences";
import { MODEL_ROUTING_EVENT } from "../../../lib/modelRoutingTransport";
import ModelRoutingNotice from "../ModelRoutingNotice";
import ModelRequestEstimate from "../ModelRequestEstimate";

// Primary Studio agent surface. Chat drives the workflow; deeper build state
// lives in the workspace dock so the conversation keeps the available width.
export default function AgentChatPanel({
  // chat
  currentChatId,
  chatTitle = "New chat",
  projectTitle = "Workspace",
  projectId = "",
  modelVersion = "nexus-free-auto",
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
  executionTask,
  onClarifySubmit,
  onEditPlan,
  onRefine,
  onStartRefine,
  onOpenArtifact,
  onOpenFileReference,
  onQuickStart,
  recentProjects,
  onOpenProject,
  onStartGuide,
  startGuideLabel,
  guidedLaunchIdea,
  onRenameChat,
  onOpenNavigation,
  onRetryMessage,
  onRestoreRun,
  notify,
  onApproveStep,
  approvingStepId,
  agentRun,
  activeAgents = [],
  // studio
  studioSessionId,
  studioConnected,
  studioPlaceName,
  studioConnectionType,
  studioConnectionState,
  studioCapabilities,
  studioLoading,
  studioPreferences,
  onStudioPreferencesChange,
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
  referenceFiles = [],
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
  onRetryAttachment,
  onPublishAttachment,
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
  onDockNewChat,
  onDockOpenAssets,
  onDockOpenActivity,
  onDockOpenBuildOptions,
  isDockBuildOptionsOpen,
  onDockBuildOptionsClose,
  renderDockNavigation,
}) {
  const quotePending = useRef(false);
  const quoteSequence = useRef(0);
  const resolveCredit = useRef(null);
  const [creditConfirmation, setCreditConfirmation] = useState(null);
  const [checkingCredits, setCheckingCredits] = useState(false);
  const [creditNotice, setCreditNotice] = useState("");
  const { autoPreferences } = useNexusAutoPreferences();
  const [modelRouting, setModelRouting] = useState(null);
  useEffect(() => {
    setModelRouting(null);
    const receive = event => {
      if (event.detail?.chatId === currentChatId && (!event.detail.projectId || event.detail.projectId === projectId)) {
        setModelRouting(event.detail.modelRouting);
      }
    };
    window.addEventListener(MODEL_ROUTING_EVENT, receive);
    return () => window.removeEventListener(MODEL_ROUTING_EVENT, receive);
  }, [currentChatId, projectId]);
  const scope = { chatId: currentChatId, projectId };
  const visibleRun = executionTask?.taskId && scopeMatches(executionTask, scope) ? executionTask
    : scopeMatches(agentRun, scope) ? agentRun : null;
  const sharedPresentation = useWorkspacePresentation();
  const presentation = sharedPresentation || getWorkspacePresentation({ run: visibleRun, scope, busy: isBusy, stage: generationStage,
    operationState });
  const resolveConfirmation = useCallback(accepted => {
    const resolve = resolveCredit.current;
    resolveCredit.current = null;
    setCreditConfirmation(null);
    if (!accepted) setCreditNotice("");
    resolve?.(accepted);
  }, []);
  useEffect(() => {
    quoteSequence.current += 1;
    resolveConfirmation(false);
    setCheckingCredits(false);
    quotePending.current = false;
    return () => { quoteSequence.current += 1; resolveCredit.current?.(false); resolveCredit.current = null; };
  }, [currentChatId, projectId, modelVersion, prompt, activeMode, attachments, resolveConfirmation]);
  const handleComposerSubmit = useCallback(
    async (event, overridePrompt = null, composerOptions = {}) => {
      if (includedUsage?.catalogVersion === "v2" && !isBusy) {
        event?.preventDefault?.();
        if (quotePending.current) return;
        quotePending.current = true;
        const sequence = ++quoteSequence.current;
        setCheckingCredits(true);
        setCreditNotice("Checking the starting credit estimate…");
        try {
          const text = overridePrompt || prompt || "";
          const contextChars = (messages || []).reduce((n, message) => n + String(message.content || message.text || "").length, text.length);
          const response = await authedFetch("/api/billing/estimate", { method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model: modelVersion, autoPreferences, requestCategory: activeMode, prompt: text.slice(0, 16000), estimatedInputTokens: Math.max(1, Math.min(1000000, Math.ceil(contextChars / 4))), maxOutputTokens: 8000, projectId: projectId || undefined }) });
          const quote = await response.json();
          if (sequence !== quoteSequence.current) return;
          if (!response.ok) throw new Error(quote.error || quote.code || "Could not estimate credits.");
          if (!Number.isFinite(quote.estimatedCreditsMicros) || quote.estimatedCreditsMicros < 0) throw new Error("Could not estimate credits. Try again.");
          const amount = formatNexusCredits(quote.estimatedCreditsMicros, { rounding: "ceil" });
          const scope = quote.billingScope?.type === "team" ? "Team pool" : "personal balance";
          const source = quote.balanceSource === "included" ? "included credits" : quote.balanceSource === "purchased" ? "purchased credits" : "included and purchased credits";
          if (!quote.affordable) throw new Error(`Starting estimate: ${amount} Nexus Credits. Your ${scope} needs more credits.`);
          const explanation = `${quote.modelLabel} · starting estimate ${amount} Nexus Credits from your ${scope} (${source}). Additional project context and agent steps can increase the total.`;
          if (quote.estimatedCreditsMicros >= 250000 || quote.modelLabel === "Premium" || quote.balanceSource !== "included") {
            setCreditNotice("");
            const accepted = await new Promise(resolve => {
              resolveCredit.current = resolve;
              setCreditConfirmation({ title: `${quote.modelLabel} · estimated ${amount} Nexus Credits`,
                description: `From your ${scope} (${source}). Additional project context and agent steps may increase the final amount.` });
            });
            if (!accepted || sequence !== quoteSequence.current) return;
          } else setCreditNotice(explanation);
        } catch (error) { if (sequence === quoteSequence.current) setCreditNotice(error.message); return; }
        finally { if (sequence === quoteSequence.current) { quotePending.current = false; setCheckingCredits(false); } }
      }
      return onSubmit?.(event, overridePrompt, composerOptions);
    },
    [onSubmit, includedUsage, isBusy, prompt, messages, modelVersion, projectId, autoPreferences, activeMode]
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
      {...workspacePresentationAttributes(presentation)}
    >
      <div className="agent-chat-panel__content flex min-h-0 min-w-0 w-full max-w-full flex-1 flex-col">
        <div className="relative flex min-h-0 min-w-0 w-full max-w-full flex-1 flex-col">
          <ChatView
            compactStatus
            chatId={currentChatId}
            chatTitle={chatTitle}
            projectTitle={projectTitle}
            projectId={projectId}
            messages={(messages || []).map((message) => message.taskId && message.taskId === executionTask?.taskId
              ? { ...message, executionStatus: executionTask.status }
              : message)}
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
            onOpenFile={onOpenFileReference}
            onRefine={onRefine}
            onQuickStart={onQuickStart}
              recentProjects={recentProjects}
              onOpenProject={onOpenProject}
            onStartGuide={onStartGuide}
            startGuideLabel={startGuideLabel}
            guidedLaunchIdea={guidedLaunchIdea}
            notify={notify}
            onApproveStep={onApproveStep}
            approvingStepId={approvingStepId}
            onPublishAttachment={onPublishAttachment}
            studioSessionId={studioSessionId} studioConnected={studioConnected}
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

      {presentation.state !== "idle" ? (
        <CompactAgentRunBar
          presentation={presentation}
          agentRun={visibleRun}
          chatId={currentChatId}
          projectId={projectId}
          onOpenActivity={onDockOpenActivity}
        />
      ) : null}

      <div className="shrink-0">
        <ModelRequestEstimate prompt={prompt} model={modelVersion} projectId={projectId} requestCategory={activeMode}
          enabled={Boolean(user?.uid) && !isBusy} contextChars={(messages || []).reduce((n, m) => n + String(m.content || "").length, 0)} />
        <ModelRoutingNotice routing={modelRouting || visibleRun?.modelRouting} />
        <InlineCreditConfirmation confirmation={creditConfirmation} onResolve={resolveConfirmation} />
        {creditNotice && <p className="px-4 py-2 text-xs text-[var(--nx-text-muted)]" role="status">{creditNotice}</p>}
        <ChatComposer
          prompt={prompt}
          setPrompt={setPrompt}
          attachments={attachments}
          setAttachments={setAttachments}
          referenceFiles={referenceFiles}
          robloxImageUploading={robloxImageUploading}
          robloxImageUploads={robloxImageUploads}
          onSubmit={handleComposerSubmit}
          onStop={onStop}
          operationState={operationState}
          onResumeQueue={onResumeQueue}
          onSendNext={onSendNext}
          onRemoveQueued={onRemoveQueued}
          isGenerating={isBusy}
          presentation={presentation}
          compactStatus
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
          onRetryAttachment={onRetryAttachment}
          onPublishAttachment={onPublishAttachment}
          onImprovePrompt={onImprovePrompt}
          isImproving={isImproving}
          disabled={composerLocked || checkingCredits}
          mode={activeMode}
          onModeChange={onModeChange}
          studioSessionId={studioSessionId} studioConnected={studioConnected}
          studioPlaceName={studioPlaceName}
          studioConnectionType={studioConnectionType}
          studioConnectionState={studioConnectionState}
          studioCapabilities={studioCapabilities}
          studioLoading={studioLoading}
          studioPreferences={studioPreferences}
          onStudioPreferencesChange={onStudioPreferencesChange}
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
          onDockNewChat={onDockNewChat}
          onDockOpenAssets={onDockOpenAssets}
          onDockOpenActivity={onDockOpenActivity}
          onDockOpenBuildOptions={onDockOpenBuildOptions}
          openBuildOptions={isDockBuildOptionsOpen}
          onCloseBuildOptions={onDockBuildOptionsClose}
          renderDockNavigation={renderDockNavigation}
        />
      </div>
    </div>
  );
}
