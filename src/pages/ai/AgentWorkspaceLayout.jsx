import React, { useState } from "react";
import { Menu, FolderTree, History, Layers, FileCode2, MessageSquare, ClipboardList } from "lucide-react";

import SidebarContent from "../../components/SidebarContent";
import NexusRBXHeader from "../../components/NexusRBXHeader";
import CodeDrawer from "../../components/CodeDrawer";
import SignInNudgeModal from "../../components/SignInNudgeModal";
import ProNudgeModal from "../../components/ProNudgeModal";
import NotificationToast from "../../components/NotificationToast";
import GameProfileWizard from "../../components/ai/GameProfileWizard";
import ModelSwitcher from "../../components/ai/ModelSwitcher";
import DailyPromptBadge from "../../components/ai/DailyPromptBadge";
import ProjectArchitecturePanel from "../../components/ai/ProjectArchitecturePanel";
import StudioAgentPanel from "../../components/ai/StudioAgentPanel";
import { ProjectContextStatus } from "../../components/ai/AiComponents";
import { AI_EVENTS } from "../../lib/aiEvents";
import { Segmented } from "../../components/ui";

import CodeFileTree from "../../components/ai/workspace/CodeFileTree";
import CodeWorkspace from "../../components/ai/workspace/CodeWorkspace";
import AgentChatPanel from "../../components/ai/workspace/AgentChatPanel";
import BuildDetailsPanel from "../../components/ai/workspace/BuildDetailsPanel";

const MOBILE_TABS = [
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "files", label: "Files", icon: FolderTree },
  { id: "code", label: "Code", icon: FileCode2 },
  { id: "details", label: "Details", icon: ClipboardList },
];

function ArtifactSwitcher({ artifacts, activeId, onSelect }) {
  if (!artifacts || artifacts.length < 2) return null;
  return (
    <div className="px-2 pb-2 space-y-1">
      <div className="text-[10px] font-bold text-gray-600 uppercase tracking-widest px-1.5 py-1">Generations</div>
      {artifacts.map((a) => (
        <button
          key={a.id}
          type="button"
          onClick={() => onSelect(a.id)}
          className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs transition-all ${
            a.id === activeId ? "bg-white/[0.07] text-white border border-white/10" : "text-gray-400 hover:text-white hover:bg-white/[0.04] border border-transparent"
          }`}
          title={a.title}
        >
          <Layers className="w-3.5 h-3.5 shrink-0 text-[#9b5de5]" />
          <span className="truncate flex-1">{a.title}</span>
          <span className="text-[10px] text-gray-600">{a.files.length}</span>
        </button>
      ))}
    </div>
  );
}

export default function AgentWorkspaceLayout({ controller }) {
  const { billing, navigation, uiState, refs, modules, handlers } = controller;
  const { planKey, totalRemaining, subRemaining, paygRemaining, subLimit, resetsAt, isPremium, unlimitedTokens, devOverride, flags } = billing;
  const { navigate, location } = navigation;
  const {
    user,
    isMobile,
    sidebarOpen,
    mobileTab,
    prompt,
    isImproving,
    refineTarget,
    attachments,
    scripts,
    projectContext,
    architecturePanelOpen,
    showSignInNudge,
    showProNudge,
    proNudgeReason,
    codeDrawerOpen,
    codeDrawerData,
    currentTheme,
    currentToast,
  } = uiState;

  const { chat, game, scriptManager, unified, workspace, settings } = modules;

  const {
    setSidebarOpen,
    setMobileTab,
    setActiveTab,
    setPrompt,
    setAttachments,
    setArchitecturePanelOpen,
    setShowSignInNudge,
    setShowProNudge,
    setProNudgeReason,
    setCodeDrawerOpen,
    dismissToast,
    updateSettings,
    handlePromptSubmit,
    onApprovePlan,
    onClarifySubmit,
    handleEditPlan,
    handleStartRefine,
    cancelRefine,
    handleImprovePrompt,
    handleFileUpload,
    handleQuickStart,
    handleOpenArtifact,
    track,
    notify,
  } = handlers;

  const { chatEndRef } = refs;

  const [leftView, setLeftView] = useState("files");

  const requireUser = (fallback) => {
    if (!user) {
      setShowSignInNudge(true);
      return false;
    }
    if (typeof fallback === "function") fallback();
    return true;
  };

  const requirePremium = (reason, next) => {
    if (!requireUser()) return false;
    if (!isPremium) {
      setProNudgeReason(reason || "This feature");
      setShowProNudge(true);
      return false;
    }
    if (typeof next === "function") next();
    return true;
  };

  const onRefine = (m) => {
    if (!requirePremium("Refinement & Iteration")) return;
    handleStartRefine(m);
    track("artifact_action_used", { action: "refine_start" });
  };

  const agentChat = (
    <AgentChatPanel
      messages={chat.messages}
      pendingMessage={unified.pendingMessage}
      generationStage={unified.generationStage}
      user={user}
      activeMode={chat.activeMode}
      isBusy={unified.isGenerating}
      onApprovePlan={onApprovePlan}
      onClarifySubmit={onClarifySubmit}
      onEditPlan={handleEditPlan}
      onRefine={onRefine}
      onOpenArtifact={handleOpenArtifact}
      onQuickStart={handleQuickStart}
      notify={notify}
      chatEndRef={chatEndRef}
      prompt={prompt}
      setPrompt={setPrompt}
      attachments={attachments}
      setAttachments={setAttachments}
      onSubmit={(e) => handlePromptSubmit(e)}
      refineTarget={refineTarget}
      onCancelRefine={cancelRefine}
      onFileUpload={handleFileUpload}
      onImprovePrompt={handleImprovePrompt}
      isImproving={isImproving}
      tokensLeft={totalRemaining}
      tokensLimit={subLimit}
      resetsAt={resetsAt}
      planKey={planKey}
      unlimitedTokens={unlimitedTokens}
      devOverride={devOverride}
      themePrimary={currentTheme.primary}
      themeSecondary={currentTheme.secondary}
      onModeChange={(m) => chat.updateChatMode(chat.currentChatId, m)}
      artifact={workspace.activeArtifact}
      agentRun={workspace.agentRun}
    />
  );

  const codeWorkspace = (
    <CodeWorkspace
      artifact={workspace.activeArtifact}
      activeFile={workspace.activeFile}
      onSelectFile={(fileId) => workspace.openFile(workspace.activeArtifact?.id, fileId)}
      onChangeContent={workspace.updateFileContent}
      onRevertEdits={workspace.revertArtifactEdits}
      notify={notify}
    />
  );

  const fileTree = (
    <div className="p-2">
      <ArtifactSwitcher
        artifacts={workspace.artifacts}
        activeId={workspace.activeArtifact?.id}
        onSelect={(id) => {
          workspace.openArtifact(id);
          if (isMobile) setMobileTab("code");
        }}
      />
      <CodeFileTree
        artifact={workspace.activeArtifact}
        activeFileId={workspace.activeFile?.id}
        onSelectFile={(fileId) => {
          workspace.openFile(workspace.activeArtifact?.id, fileId);
          if (isMobile) setMobileTab("code");
        }}
      />
    </div>
  );

  return (
    <div className="h-screen ai-page font-sans flex flex-col relative overflow-hidden" role="application" aria-label="Nexus AI Workspace">
      <div
        className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] blur-[120px] rounded-full pointer-events-none transition-colors duration-1000"
        style={{ backgroundColor: `${currentTheme.primary}14` }}
        aria-hidden="true"
      />
      <div
        className="fixed bottom-[-15%] right-[-10%] w-[45%] h-[45%] blur-[140px] rounded-full pointer-events-none transition-colors duration-1000"
        style={{ backgroundColor: `${currentTheme.secondary}10` }}
        aria-hidden="true"
      />

      <NexusRBXHeader
        variant="ai"
        navigate={navigate}
        user={user}
        handleLogin={() => navigate("/signin", { state: { from: location } })}
        tokenInfo={{
          sub: { limit: subLimit, used: subLimit - subRemaining },
          payg: { remaining: paygRemaining },
          unlimitedTokens,
          devOverride,
          isAdmin: Boolean(flags?.isAdmin),
          flags: flags || {
            isAdmin: Boolean(flags?.isAdmin),
            unlimitedTokens,
            devOverride,
          },
        }}
        tokenLoading={false}
      />

      <div className="flex flex-1 min-h-0 overflow-hidden pt-20">
        {/* LEFT: project / artifacts / file tree / history */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-80 bg-[#0D0D0D]/95 backdrop-blur-2xl border-r border-white/5 flex flex-col transform transition-all duration-300 ease-in-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:relative lg:translate-x-0 ${sidebarOpen ? "lg:w-80" : "lg:w-0 lg:opacity-0 lg:pointer-events-none"}`}
          aria-label="Project sidebar"
        >
          <div className="flex items-center px-3 py-2.5 border-b border-white/10">
            <Segmented
              fullWidth
              options={[
                { id: "files", label: "Files", icon: FolderTree },
                { id: "history", label: "History", icon: History },
              ]}
              value={leftView}
              onChange={setLeftView}
            />
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
            {leftView === "files" ? (
              fileTree
            ) : (
              <SidebarContent
                activeTab="chats"
                setActiveTab={() => setActiveTab("chat")}
                scripts={scripts}
                currentChatId={chat.currentChatId}
                currentScriptId={scriptManager.currentScriptId}
                setCurrentScriptId={scriptManager.setCurrentScriptId}
                handleCreateScript={scriptManager.handleCreateScript}
                handleRenameScript={scriptManager.handleRenameScript}
                handleDeleteScript={scriptManager.handleDeleteScript}
                currentScript={scriptManager.currentScript}
                versionHistory={scriptManager.versionHistory}
                selectedVersionId={scriptManager.selectedVersionId}
                onSelectChat={(id) => {
                  chat.openChatById(id);
                  setActiveTab("chat");
                  if (window.innerWidth < 1024) setSidebarOpen(false);
                }}
                onOpenGameContext={() => {
                  if (!requireUser()) return;
                  game.setShowWizard(true);
                }}
                onDeleteChat={chat.handleDeleteChat}
                handleClearChat={chat.handleClearChat}
                gameProfile={game.profile}
                user={user}
                onVersionView={(ver) => {
                  if (!ver.code) return;
                  controller.handlers.emitAiEvent(AI_EVENTS.OPEN_CODE_DRAWER, {
                    code: ver.code,
                    title: ver.title || scriptManager.currentScript?.title || "Script",
                    explanation: ver.explanation || "",
                    versionNumber: ver.versionNumber,
                  });
                }}
              />
            )}
          </div>
        </aside>

        {/* CENTER: code workspace */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="relative z-30 flex items-center justify-between px-4 py-2.5 border-b border-white/5 bg-black/30 backdrop-blur-md gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className={`p-2 rounded-xl transition-all ${sidebarOpen ? "bg-[#00f5d4]/10 text-[#00f5d4]" : "bg-white/5 text-gray-400 hover:text-white"}`}
                title="Toggle sidebar"
                aria-label="Toggle sidebar"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="h-4 w-px bg-white/10 hidden sm:block" aria-hidden="true" />
              <ModelSwitcher
                value={settings.modelVersion}
                isPremium={isPremium}
                onChange={(id) => updateSettings({ modelVersion: id })}
                onProNudge={(reason) => {
                  if (!requireUser()) return;
                  setProNudgeReason(reason || "Premium AI Models");
                  setShowProNudge(true);
                }}
              />
            </div>
            <div className="flex items-center gap-3">
              <DailyPromptBadge
                totalRemaining={totalRemaining}
                subLimit={subLimit}
                resetsAt={resetsAt}
                planKey={planKey}
                unlimitedTokens={unlimitedTokens}
                devOverride={devOverride}
              />
              <div className="h-4 w-px bg-white/10 hidden sm:block" aria-hidden="true" />
              <ProjectContextStatus
                context={projectContext}
                plan={planKey}
                onViewStructure={() => setArchitecturePanelOpen(true)}
                onSync={async () => {
                  if (!requireUser()) return;
                  game.setShowWizard(true);
                }}
              />
            </div>
          </div>

          <StudioAgentPanel user={user} chatId={chat.currentChatId} notify={notify} />

          {/* Desktop center + right; mobile single-pane via tabs */}
          <div className="flex-1 min-h-0 flex">
            <div className={`flex-1 min-w-0 ${isMobile && mobileTab !== "code" ? "hidden" : "flex"} flex-col`}>
              {codeWorkspace}
            </div>

            {/* Mobile-only file tree + details panes */}
            {isMobile && mobileTab === "files" && (
              <div className="flex-1 min-w-0 overflow-y-auto bg-[#0a0a0a]">{fileTree}</div>
            )}
            {isMobile && mobileTab === "details" && (
              <div className="flex-1 min-w-0 bg-[#0a0a0a]">
                <BuildDetailsPanel artifact={workspace.activeArtifact} agentRun={workspace.agentRun} />
              </div>
            )}

            {/* RIGHT: agent chat (desktop always; mobile when chat tab) */}
            <div className={`w-full lg:w-[400px] lg:shrink-0 border-l border-white/5 ${isMobile ? (mobileTab === "chat" ? "flex pb-16" : "hidden") : "flex"} flex-col min-h-0`}>
              {agentChat}
            </div>
          </div>
        </main>

        {architecturePanelOpen && (
          <div className="fixed inset-y-0 right-0 z-40 w-full max-w-md h-full shadow-2xl">
            <ProjectArchitecturePanel
              context={projectContext}
              onClose={() => setArchitecturePanelOpen(false)}
              onSync={async () => {
                if (!requireUser()) return;
                setArchitecturePanelOpen(false);
                game.setShowWizard(true);
              }}
            />
          </div>
        )}
      </div>

      {/* Mobile tab bar */}
      {isMobile && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-black/80 backdrop-blur-xl border border-white/10 rounded-full p-1.5 flex items-center gap-1 shadow-2xl">
          {MOBILE_TABS.map((t) => {
            const Icon = t.icon;
            const active = mobileTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setMobileTab(t.id)}
                className={`px-3.5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all inline-flex items-center gap-1.5 ${active ? "bg-[#00f5d4] text-black" : "text-gray-400 hover:text-white"}`}
                aria-pressed={active}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
      )}

      <CodeDrawer
        open={codeDrawerOpen}
        onClose={() => setCodeDrawerOpen(false)}
        code={codeDrawerData.code}
        title={codeDrawerData.title}
        explanation={codeDrawerData.explanation}
        onSaveScript={async (title, code) => {
          await scriptManager.handleCreateScript(title, code, "logic");
          notify({ message: "Script saved to library", type: "success" });
          track("artifact_action_used", { action: "save_script_from_drawer" });
        }}
      />

      {settings.enableGameWizard !== false && (
        <GameProfileWizard
          isOpen={game.showWizard}
          onClose={() => game.setShowWizard(false)}
          profile={game.profile}
          onUpdate={game.updateProfile}
        />
      )}

      <SignInNudgeModal isOpen={showSignInNudge} onClose={() => setShowSignInNudge(false)} />
      <ProNudgeModal isOpen={showProNudge} onClose={() => setShowProNudge(false)} reason={proNudgeReason} />

      {currentToast && (
        <div className="fixed bottom-8 right-8 z-[120]" role="status" aria-live="polite">
          <NotificationToast
            message={currentToast.count > 1 ? `${currentToast.message} (x${currentToast.count})` : currentToast.message}
            type={currentToast.type}
            duration={currentToast.duration}
            cta={currentToast.cta}
            secondary={currentToast.secondary}
            onClose={() => dismissToast(currentToast.id)}
          />
        </div>
      )}

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
