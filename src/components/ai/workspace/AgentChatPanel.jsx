import React, { useState } from "react";
import ChatView from "../ChatView";
import ChatComposer from "../chat/ChatComposer";
import AgentPlanPanel from "./AgentPlanPanel";
import BuildDetailsPanel from "./BuildDetailsPanel";

// Primary Studio agent surface. Chat drives the
// workflow; build progress + setup/testing/security live in the Details view.
export default function AgentChatPanel({
  // chat
  messages,
  pendingMessage,
  generationStage,
  user,
  activeMode,
  isBusy,
  onApprovePlan,
  onClarifySubmit,
  onEditPlan,
  onRefine,
  onOpenArtifact,
  onQuickStart,
  notify,
  chatEndRef,
  onApproveStep,
  onRestoreRun,
  approvingStepId,
  restoringRun,
  // studio
  studioConnected,
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
  // roblox cloud
  robloxConnected,
  robloxLoading,
  robloxSelectedCreator,
  robloxUploadAvailable,
  robloxAssetUploadsEnabled,
  onRobloxAssetUploadsEnabledChange,
  // composer
  prompt,
  setPrompt,
  attachments,
  setAttachments,
  onSubmit,
  refineTarget,
  onCancelRefine,
  onFileUpload,
  onImprovePrompt,
  isImproving,
  tokensLeft,
  tokensLimit,
  resetsAt,
  planKey,
  unlimitedTokens,
  devOverride,
  themePrimary,
  themeSecondary,
  onModeChange,
  // details
  artifact,
  agentRun,
}) {
  const [view, setView] = useState("chat");
  const active = [
    "inspecting",
    "waiting_for_tool",
    "waiting_for_approval",
    "generating",
    "validating",
    "applying",
  ].includes(agentRun?.status);

  return (
    <div className="h-full flex flex-col min-h-0 bg-ink-900">
      <div className="flex-1 min-h-0 flex flex-col">
        {view === "details" ? (
          <div className="flex-1 min-h-0">
            <BuildDetailsPanel
              artifact={artifact}
              agentRun={agentRun}
              onApproveStep={onApproveStep}
              onRestoreRun={onRestoreRun}
              approvingStepId={approvingStepId}
              restoringRun={restoringRun}
            />
          </div>
        ) : (
          <>
            {active && (
              <div className="px-3 pt-3">
                <AgentPlanPanel
                  agentRun={agentRun}
                  onApproveStep={onApproveStep}
                  onRestoreRun={onRestoreRun}
                  approvingStepId={approvingStepId}
                  restoring={restoringRun}
                />
              </div>
            )}
            <div className="flex-1 min-h-0 overflow-y-auto px-3 py-4 scrollbar-hide">
              <ChatView
                messages={messages}
                pendingMessage={pendingMessage}
                generationStage={generationStage}
                user={user}
                activeMode={activeMode}
                isBusy={isBusy}
                onApprovePlan={onApprovePlan}
                onClarifySubmit={onClarifySubmit}
                onEditPlan={onEditPlan}
                onViewUi={onOpenArtifact}
                onRefine={onRefine}
                onQuickStart={onQuickStart}
                notify={notify}
                chatEndRef={chatEndRef}
                onApproveStep={onApproveStep}
                approvingStepId={approvingStepId}
              />
            </div>
          </>
        )}
      </div>

      <ChatComposer
        prompt={prompt}
        setPrompt={setPrompt}
        attachments={attachments}
        setAttachments={setAttachments}
        onSubmit={onSubmit}
        isGenerating={isBusy}
        generationStage={generationStage}
        placeholder={refineTarget ? "Describe the Studio change you want..." : "Ask the Studio agent to build, inspect, wire, or fix..."}
        refineTarget={refineTarget}
        onCancelRefine={onCancelRefine}
        tokensLeft={tokensLeft}
        tokensLimit={tokensLimit}
        resetsAt={resetsAt}
        planKey={planKey}
        unlimitedTokens={unlimitedTokens}
        devOverride={devOverride}
        themePrimary={themePrimary}
        themeSecondary={themeSecondary}
        onFileUpload={onFileUpload}
        onImprovePrompt={onImprovePrompt}
        isImproving={isImproving}
        disabled={isBusy}
        mode={activeMode}
        onModeChange={onModeChange}
        view={view}
        onViewChange={setView}
        studioConnected={studioConnected}
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
        robloxConnected={robloxConnected}
        robloxLoading={robloxLoading}
        robloxSelectedCreator={robloxSelectedCreator}
        robloxUploadAvailable={robloxUploadAvailable}
        robloxAssetUploadsEnabled={robloxAssetUploadsEnabled}
        onRobloxAssetUploadsEnabledChange={onRobloxAssetUploadsEnabledChange}
      />
    </div>
  );
}
