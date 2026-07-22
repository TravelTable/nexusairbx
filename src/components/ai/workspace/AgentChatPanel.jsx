import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ClipboardList, FileArchive, ListChecks, MessageSquare, Search, X } from "lib/icons";
import ChatView from "../ChatView";
import ChatComposer from "../chat/ChatComposer";
import BuildDetailsPanel from "./BuildDetailsPanel";
import PlanWorkspace from "./PlanWorkspace";
import RobloxAssetTray from "./RobloxAssetTray";
import CreatorStoreSearch from "../../assets/CreatorStoreSearch";
import ModelFilePipelinePanel from "../../assets/ModelFilePipelinePanel";
import { useMotionPresence } from "../../../hooks/useMotionPresence";
import FEATURE_FLAGS from "../../../lib/featureFlags";
// Primary Studio agent surface. Chat drives the
// workflow; build progress + setup/testing/security live in the Details view.
export default function AgentChatPanel({
  // chat
  currentChatId,
  projectId = "",
  messages,
  pendingMessage,
  pendingMessages,
  generationStage,
  user,
  profile,
  activeMode,
  isBusy,
  onApprovePlan,
  onClarifySubmit,
  onEditPlan,
  onRefine,
  onOpenArtifact,
  onQuickStart,
  notify,
  onApproveStep,
  onRestoreRun,
  approvingStepId,
  onSelectStudioTarget,
  selectingStudioTargetId,
  restoringRun,
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
  attachments,
  setAttachments,
  robloxImageUploading = false,
  robloxImageUploads = [],
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
  // details
  artifact,
  agentRun,
}) {
  const [view, setView] = useState("chat");
  const [creatorStoreOpen, setCreatorStoreOpen] = useState(false);
  const [glbPanelOpen, setGlbPanelOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const openPlanWorkspace = useCallback(() => setView("plan"), []);
  const creatorStorePresence = useMotionPresence(creatorStoreOpen, 220);
  const glbPanelPresence = useMotionPresence(glbPanelOpen, 220);
  const viewOptions = useMemo(() => FEATURE_FLAGS.newPlanningMode ? [
    { id: "chat", label: "Chat", icon: MessageSquare },
    { id: "plan", label: "Plan", icon: ListChecks },
    { id: "details", label: "Details", icon: ClipboardList },
  ] : undefined, []);
  const latestPlanMessageId = useMemo(() => {
    const message = [...(messages || [])]
      .reverse()
      .find((entry) => entry?.planId || ["plan", "plan_approved"].includes(entry?.stage));
    return message
      ? String(message.id || `${message.planId || "plan"}:${message.planVersion || message.version || 1}`)
      : "";
  }, [messages]);
  const previousPlanMessageIdRef = useRef("");

  useEffect(() => {
    if (!FEATURE_FLAGS.newPlanningMode) return;
    if (latestPlanMessageId && latestPlanMessageId !== previousPlanMessageIdRef.current) {
      setView("plan");
    }
    previousPlanMessageIdRef.current = latestPlanMessageId;
  }, [latestPlanMessageId]);

  const handlePlanExecute = useCallback(async ({ result }) => {
    const task = result?.task || result?.execution?.task || result?.run || null;
    const taskId = task?.taskId || task?.id || result?.taskId || result?.execution?.taskId || result?.runId || "";
    if (!taskId) throw new Error("NexusRBX did not return an execution task.");
    onPlanTaskAccepted?.(task || taskId);
    setView("chat");
  }, [onPlanTaskAccepted]);

  const handleComposerSubmit = useCallback((event) => {
    const submission = onSubmit?.(
      event,
      selectedTemplateId ? { templateId: selectedTemplateId } : undefined,
    );
    setSelectedTemplateId("");
    return submission;
  }, [onSubmit, selectedTemplateId]);

  useEffect(() => {
    if (!creatorStoreOpen && !glbPanelOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      if (glbPanelOpen) setGlbPanelOpen(false);
      else if (creatorStoreOpen) setCreatorStoreOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [creatorStoreOpen, glbPanelOpen]);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-ink-900">
      <div className="flex min-h-0 flex-1 flex-col">
        {view === "details" ? (
          <div className="min-h-0 flex-1 motion-safe:animate-panel-in">
            <BuildDetailsPanel
              artifact={artifact}
              agentRun={agentRun}
              onApproveStep={onApproveStep}
              onRestoreRun={onRestoreRun}
              approvingStepId={approvingStepId}
              onSelectStudioTarget={onSelectStudioTarget}
              selectingStudioTargetId={selectingStudioTargetId}
              restoringRun={restoringRun}
              notify={notify}
            />
          </div>
        ) : view === "plan" && FEATURE_FLAGS.newPlanningMode ? (
          <div className="min-h-0 flex-1 overflow-y-auto scrollbar-subtle">
            <PlanWorkspace
              enabled
              messages={messages}
              userId={user?.uid || "guest"}
              chatId={currentChatId || "chat"}
              projectId={projectId}
              studioConnected={Boolean(studioConnected)}
              studioTarget={studioPlacePreference}
              onExecute={handlePlanExecute}
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
          <div className="relative flex min-h-0 flex-1 flex-col">
            <ChatView
              messages={messages}
              pendingMessage={pendingMessage}
              pendingMessages={pendingMessages}
              generationStage={generationStage}
              user={user}
              profile={profile}
              activeMode={activeMode}
              isBusy={isBusy}
              onApprovePlan={FEATURE_FLAGS.newPlanningMode ? undefined : onApprovePlan}
              onClarifySubmit={onClarifySubmit}
              onEditPlan={FEATURE_FLAGS.newPlanningMode ? openPlanWorkspace : onEditPlan}
              onViewUi={onOpenArtifact}
              onRefine={onRefine}
              onQuickStart={onQuickStart}
              notify={notify}
              onApproveStep={onApproveStep}
              approvingStepId={approvingStepId}
              onSelectStudioTarget={onSelectStudioTarget}
              selectingStudioTargetId={selectingStudioTargetId}
            />
          </div>
        )}
      </div>

      {view !== "plan" && <div className="shrink-0 border-t border-white/10 bg-[#080a12] px-3 py-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setCreatorStoreOpen(true)}
            className="inline-flex min-w-0 flex-1 items-center justify-between gap-2 rounded-lg border border-[#00bbf9]/20 bg-[#00bbf9]/10 px-3 py-2 text-left text-[#b9ecff] transition-all hover:border-[#00bbf9]/35 hover:bg-[#00bbf9]/15 hover:text-white focus-ring"
            aria-haspopup="dialog"
            aria-expanded={creatorStoreOpen}
            aria-controls="creator-store-drawer"
            title="Open Creator Store search"
          >
            <span className="flex min-w-0 items-center gap-2">
              <Search className="h-4 w-4 shrink-0 text-[#00bbf9]" />
              <span className="min-w-0">
                <span className="block text-[11px] font-black uppercase tracking-widest">Creator Store</span>
                <span className="block truncate text-[10px] text-[#8bdcf8]/65">Search assets</span>
              </span>
            </span>
            <span className="shrink-0 text-[10px] font-black uppercase tracking-widest text-[#00bbf9]">Open</span>
          </button>

          <button
            type="button"
            onClick={() => setGlbPanelOpen(true)}
            className="inline-flex min-w-0 flex-1 items-center justify-between gap-2 rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-left text-cyan-100 transition-all hover:border-cyan-300/35 hover:bg-cyan-300/15 hover:text-white focus-ring"
            aria-haspopup="dialog"
            aria-expanded={glbPanelOpen}
            aria-controls="glb-model-drawer"
            title="Open GLB model files"
          >
            <span className="flex min-w-0 items-center gap-2">
              <FileArchive className="h-4 w-4 shrink-0 text-cyan-300" />
              <span className="min-w-0">
                <span className="block text-[11px] font-black uppercase tracking-widest">GLB models</span>
                <span className="block truncate text-[10px] text-cyan-100/65">Upload and insert</span>
              </span>
            </span>
            <span className="shrink-0 text-[10px] font-black uppercase tracking-widest text-cyan-300">Open</span>
          </button>
        </div>
      </div>}

      {creatorStorePresence.present && (
        <div
          className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-200 ease-out motion-reduce:transition-none ${
            creatorStorePresence.entering ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          role="presentation"
          onClick={() => setCreatorStoreOpen(false)}
        >
          <div
            id="creator-store-drawer"
            className={`absolute inset-y-0 right-0 flex w-full max-w-2xl flex-col border-l border-white/10 bg-[#080a12] shadow-2xl transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none ${
              creatorStorePresence.entering
                ? "translate-x-0 opacity-100 motion-safe:animate-drawer-in"
                : "translate-x-6 opacity-0"
            }`}
            role="dialog"
            aria-modal="true"
            aria-label="Creator Store search"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <Search className="h-4 w-4 shrink-0 text-[#00bbf9]" />
                <div className="min-w-0">
                  <div className="text-[11px] font-black uppercase tracking-widest text-white">Creator Store</div>
                  <div className="truncate text-[10px] text-gray-500">Search and import Roblox development assets</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreatorStoreOpen(false)}
                className="rounded-lg border border-white/10 bg-white/5 p-2 text-gray-400 transition-all hover:bg-white/10 hover:text-white focus-ring"
                aria-label="Close Creator Store search"
                title="Close Creator Store search"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3 scrollbar-subtle">
              <CreatorStoreSearch notify={notify} className="m-0 border-white/10 bg-black/20" />
            </div>
          </div>
        </div>
      )}

      {glbPanelPresence.present && (
        <div
          className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-200 ease-out motion-reduce:transition-none ${
            glbPanelPresence.entering ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          role="presentation"
          onClick={() => setGlbPanelOpen(false)}
        >
          <div
            id="glb-model-drawer"
            className={`absolute inset-y-0 right-0 flex w-full max-w-2xl flex-col border-l border-white/10 bg-[#080a12] shadow-2xl transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none ${
              glbPanelPresence.entering
                ? "translate-x-0 opacity-100 motion-safe:animate-drawer-in"
                : "translate-x-6 opacity-0"
            }`}
            role="dialog"
            aria-modal="true"
            aria-label="GLB model files"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <FileArchive className="h-4 w-4 shrink-0 text-cyan-300" />
                <div className="min-w-0">
                  <div className="text-[11px] font-black uppercase tracking-widest text-white">GLB model files</div>
                  <div className="truncate text-[10px] text-gray-500">Upload, optimize, and insert models</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setGlbPanelOpen(false)}
                className="rounded-lg border border-white/10 bg-white/5 p-2 text-gray-400 transition-all hover:bg-white/10 hover:text-white focus-ring"
                aria-label="Close GLB model files"
                title="Close GLB model files"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto scrollbar-subtle">
              <div className="pt-3">
                <RobloxAssetTray
                  projectId={robloxAssetProjectId}
                  robloxConnected={robloxConnected}
                  uploadAvailable={robloxUploadAvailable}
                  assetUploadsEnabled={robloxAssetUploadsEnabled}
                  selectedCreator={robloxSelectedCreator}
                  notify={notify}
                />
              </div>
              <ModelFilePipelinePanel notify={notify} />
            </div>
          </div>
        </div>
      )}

      <div className="shrink-0">
        <ChatComposer
        prompt={prompt}
        setPrompt={setPrompt}
        attachments={attachments}
        setAttachments={setAttachments}
        robloxImageUploading={robloxImageUploading}
        robloxImageUploads={robloxImageUploads}
        onSubmit={handleComposerSubmit}
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
        disabled={isBusy || composerLocked}
        mode={activeMode}
        onModeChange={onModeChange}
        view={view}
        onViewChange={setView}
        viewOptions={viewOptions}
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
