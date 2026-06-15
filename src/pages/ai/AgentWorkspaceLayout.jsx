import React, { useCallback, useMemo, useState } from "react";
import { Menu, FolderTree, History, Layers, FileCode2, MessageSquare, ClipboardList, Search, RefreshCw, TerminalSquare } from "lucide-react";

import SidebarContent from "../../components/SidebarContent";
import NexusRBXHeader from "../../components/NexusRBXHeader";
import CodeDrawer from "../../components/CodeDrawer";
import SignInNudgeModal from "../../components/SignInNudgeModal";
import ProNudgeModal from "../../components/ProNudgeModal";
import NotificationToast from "../../components/NotificationToast";
import GameProfileWizard from "../../components/ai/GameProfileWizard";
import ModelSwitcher from "../../components/ai/ModelSwitcher";
import StudioPairControl from "../../components/ai/StudioPairControl";
import DailyPromptBadge from "../../components/ai/DailyPromptBadge";
import ProjectArchitecturePanel from "../../components/ai/ProjectArchitecturePanel";
import { ProjectContextStatus } from "../../components/ai/AiComponents";
import { AI_EVENTS } from "../../lib/aiEvents";
import { Segmented } from "../../components/ui";

import CodeFileTree from "../../components/ai/workspace/CodeFileTree";
import CodeWorkspace from "../../components/ai/workspace/CodeWorkspace";
import AgentChatPanel from "../../components/ai/workspace/AgentChatPanel";
import BuildDetailsPanel from "../../components/ai/workspace/BuildDetailsPanel";
import { getStudioCommand, getStudioManifest, queueStudioTool } from "../../lib/studioBridgeApi";

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

async function pollStudioCommand(commandId, { timeoutMs = 30000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const command = await getStudioCommand(commandId);
    if (command.status === "succeeded" || command.status === "failed") return command;
    await new Promise((resolve) => setTimeout(resolve, 1200));
  }
  throw new Error("Studio command timed out");
}

export default function AgentWorkspaceLayout({ controller }) {
  const { billing, navigation, uiState, refs, modules, handlers, studio } = controller;
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
    handleApproveStep,
    handleRestoreRun,
    handleStudioEnabledChange,
    handleStudioApplyModeChange,
    handleStudioAutoPushEnabledChange,
    handleStudioAutoPushPolicyChange,
  } = handlers;

  const { chatEndRef } = refs;

  const [leftView, setLeftView] = useState("files");
  const [studioManifest, setStudioManifest] = useState([]);
  const [studioSearch, setStudioSearch] = useState("");
  const [studioFile, setStudioFile] = useState(null);
  const [studioConflict, setStudioConflict] = useState(null);
  const [studioBusy, setStudioBusy] = useState(false);
  const [terminalLines, setTerminalLines] = useState([]);

  const appendTerminal = useCallback((line) => {
    setTerminalLines((prev) => [...prev.slice(-200), `[${new Date().toLocaleTimeString()}] ${line}`]);
  }, []);

  const refreshStudioManifest = useCallback(async () => {
    setStudioBusy(true);
    setStudioConflict(null);
    try {
      if (studio?.connected) {
        const queued = await queueStudioTool({
          type: "get_project_manifest",
          payload: { maxDepth: 24, maxInstances: 10000, pageSize: 500, includeSource: false },
          sessionId: studio?.lastAuthorizedSessionId || null,
          label: "Refresh Studio manifest",
          applyMode: "unrestricted_dev",
        });
        appendTerminal(`queued manifest refresh ${queued.commandId}`);
      }
      const data = await getStudioManifest({ sessionId: studio?.lastAuthorizedSessionId || null, limit: 1000 });
      setStudioManifest(data.manifest?.items || []);
    } catch (err) {
      notify?.({ message: err?.message || "Could not refresh Studio manifest", type: "error" });
    } finally {
      setStudioBusy(false);
    }
  }, [appendTerminal, notify, studio?.connected, studio?.lastAuthorizedSessionId]);

  const studioResults = useMemo(() => {
    const query = studioSearch.trim().toLowerCase();
    return (studioManifest || [])
      .filter((item) => !query || `${item.canonicalPath || item.path} ${item.className}`.toLowerCase().includes(query))
      .slice(0, 200);
  }, [studioManifest, studioSearch]);

  const openStudioScript = useCallback(async (item) => {
    const path = item?.canonicalPath || item?.path;
    if (!path) return;
    setStudioBusy(true);
    setStudioConflict(null);
    try {
      const queued = await queueStudioTool({
        type: "read_script",
        payload: { paths: [path], maxChars: 200000 },
        sessionId: studio?.lastAuthorizedSessionId || null,
        label: `Read ${path}`,
        applyMode: "unrestricted_dev",
      });
      appendTerminal(`queued read ${path}`);
      const command = await pollStudioCommand(queued.commandId);
      if (command.status === "failed") throw new Error(command.error || "Studio read failed");
      const script = command.result?.scripts?.[0];
      if (!script || script.error) throw new Error(script?.error || "Script source unavailable");
      setStudioFile({
        id: `studio:${script.path}`,
        name: script.name || path.split("/").pop(),
        path: script.path,
        placement: script.path.split("/")[0],
        kind: script.className === "LocalScript" ? "client" : script.className === "Script" ? "server" : "module",
        language: "luau",
        content: script.source || "",
        originalContent: script.source || "",
        sourceHash: script.sourceHash,
        className: script.className,
        status: "synced",
      });
      appendTerminal(`opened ${script.path}`);
    } catch (err) {
      notify?.({ message: err?.message || "Could not open Studio script", type: "error" });
    } finally {
      setStudioBusy(false);
    }
  }, [appendTerminal, notify, studio?.lastAuthorizedSessionId]);

  const studioArtifact = useMemo(() => {
    if (!studioFile) return workspace.activeArtifact;
    return {
      id: "studio-live",
      title: "Studio live file",
      summary: studioFile.path,
      files: [studioFile],
      dirtyCount: studioFile.dirty ? 1 : 0,
    };
  }, [studioFile, workspace.activeArtifact]);

  const studioActiveFile = studioFile || workspace.activeFile;

  const handleStudioFileChange = useCallback((_artifactId, _fileId, content) => {
    if (studioFile) {
      setStudioFile((prev) => prev ? { ...prev, content, dirty: content !== prev.originalContent, status: "edited" } : prev);
    } else {
      workspace.updateFileContent(_artifactId, _fileId, content);
    }
  }, [studioFile, workspace]);

  const saveStudioFile = useCallback(async (file) => {
    if (!file?.path) return;
    setStudioBusy(true);
    setStudioConflict(null);
    try {
      const queued = await queueStudioTool({
        type: "write_script",
        payload: {
          path: file.path,
          className: file.className || "ModuleScript",
          source: file.content || "",
          expectedSourceHash: file.sourceHash || "",
          createParents: false,
          snapshot: true,
        },
        sessionId: studio?.lastAuthorizedSessionId || null,
        label: `Save ${file.path}`,
        applyMode: "unrestricted_dev",
      });
      appendTerminal(`queued save ${file.path}`);
      const command = await pollStudioCommand(queued.commandId);
      if (command.status === "failed") {
        if (command.result?.code === "source_conflict" || command.result?.error?.code === "source_conflict") {
          const read = await queueStudioTool({
            type: "read_script",
            payload: { paths: [file.path], maxChars: 200000 },
            sessionId: studio?.lastAuthorizedSessionId || null,
            label: `Read conflict ${file.path}`,
            applyMode: "unrestricted_dev",
          });
          const current = await pollStudioCommand(read.commandId);
          setStudioConflict({
            currentSource: current.result?.scripts?.[0]?.source || "",
            attemptedSource: file.content || "",
          });
          throw new Error("Studio source conflict detected");
        }
        throw new Error(command.error || "Studio save failed");
      }
      setStudioFile((prev) => prev ? { ...prev, sourceHash: command.result?.sourceHash || prev.sourceHash, dirty: false, status: "synced" } : prev);
      appendTerminal(`saved ${file.path}`);
      notify?.({ message: "Saved to Studio", type: "success" });
    } catch (err) {
      notify?.({ message: err?.message || "Could not save to Studio", type: "error" });
    } finally {
      setStudioBusy(false);
    }
  }, [appendTerminal, notify, studio?.lastAuthorizedSessionId]);

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
      onApproveStep={handleApproveStep}
      onRestoreRun={handleRestoreRun}
      approvingStepId={studio?.approvingStepId}
      restoringRun={studio?.restoringRun}
      studioConnected={studio?.connected}
      studioLoading={studio?.loading}
      studioEnabled={studio?.enabled}
      onStudioEnabledChange={handleStudioEnabledChange}
      studioApplyMode={studio?.applyMode}
      onStudioApplyModeChange={handleStudioApplyModeChange}
      studioAutoPushEnabled={studio?.autoPushEnabled}
      onStudioAutoPushEnabledChange={handleStudioAutoPushEnabledChange}
      studioAutoPushPolicy={studio?.autoPushPolicy}
      onStudioAutoPushPolicyChange={handleStudioAutoPushPolicyChange}
      studioAutoPushAuthorized={Boolean(studio?.lastAuthorizedSessionId)}
    />
  );

  const codeWorkspace = (
    <CodeWorkspace
      artifact={studioArtifact}
      activeFile={studioActiveFile}
      onSelectFile={(fileId) => workspace.openFile(workspace.activeArtifact?.id, fileId)}
      onChangeContent={handleStudioFileChange}
      onRevertEdits={workspace.revertArtifactEdits}
      onSaveFile={studioFile ? saveStudioFile : null}
      saving={studioBusy}
      conflict={studioConflict}
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
      <div className="mt-4 border-t border-white/10 pt-3 space-y-2">
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Studio Manifest</div>
          <button
            type="button"
            onClick={refreshStudioManifest}
            disabled={studioBusy}
            className="p-1.5 rounded-lg border border-white/10 bg-white/5 text-gray-400 hover:text-white disabled:opacity-40"
            title="Refresh Studio manifest"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${studioBusy ? "animate-spin" : ""}`} />
          </button>
        </div>
        <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-2 py-1.5">
          <Search className="w-3.5 h-3.5 text-gray-500" />
          <input
            value={studioSearch}
            onChange={(e) => setStudioSearch(e.target.value)}
            placeholder="Search Studio paths..."
            className="min-w-0 flex-1 bg-transparent text-xs text-gray-200 placeholder:text-gray-600 outline-none"
          />
        </label>
        <div className="max-h-72 overflow-y-auto space-y-0.5 pr-1">
          {studioResults.map((item) => {
            const isScript = ["Script", "LocalScript", "ModuleScript"].includes(item.className);
            return (
              <button
                key={item.id || item.canonicalPath}
                type="button"
                onClick={() => isScript && openStudioScript(item)}
                disabled={!isScript || studioBusy}
                className={`w-full text-left px-2 py-1.5 rounded-lg border text-[11px] transition-all ${
                  studioFile?.path === (item.canonicalPath || item.path)
                    ? "border-[#00f5d4]/40 bg-[#00f5d4]/10 text-[#00f5d4]"
                    : "border-transparent bg-white/[0.03] text-gray-400 hover:text-white hover:bg-white/[0.06]"
                } disabled:opacity-40`}
                title={item.canonicalPath || item.path}
              >
                <div className="truncate">{item.canonicalPath || item.path}</div>
                <div className="text-[10px] text-gray-600">{item.className}{item.sourceHash ? ` · ${String(item.sourceHash).slice(0, 8)}` : ""}</div>
              </button>
            );
          })}
          {!studioResults.length && (
            <div className="px-2 py-4 text-center text-xs text-gray-600">No persisted Studio manifest yet.</div>
          )}
        </div>
        <div className="rounded-lg border border-white/10 bg-black/30 p-2">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">
            <TerminalSquare className="w-3.5 h-3.5" />
            Terminal
          </div>
          <pre className="max-h-28 overflow-auto whitespace-pre-wrap text-[10px] leading-relaxed text-gray-500">
            {terminalLines.length ? terminalLines.join("\n") : "Studio command output appears here."}
          </pre>
        </div>
      </div>
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

        {/* CENTER: Studio agent chat */}
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
              <div className="h-4 w-px bg-white/10 hidden sm:block" aria-hidden="true" />
              <StudioPairControl
                connected={studio?.connected}
                loading={studio?.loading}
                refresh={studio?.refresh}
                notify={notify}
                requireUser={requireUser}
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

          {/* Desktop center + right; mobile single-pane via tabs */}
          <div className="flex-1 min-h-0 flex">
            <div className={`flex-1 min-w-0 ${isMobile ? (mobileTab === "chat" ? "flex pb-16" : "hidden") : "flex"} flex-col`}>
              {agentChat}
            </div>

            {/* Mobile-only file tree + details panes */}
            {isMobile && mobileTab === "files" && (
              <div className="flex-1 min-w-0 overflow-y-auto bg-[#0a0a0a]">{fileTree}</div>
            )}
            {isMobile && mobileTab === "details" && (
              <div className="flex-1 min-w-0 bg-[#0a0a0a]">
                <BuildDetailsPanel
                  artifact={workspace.activeArtifact}
                  agentRun={workspace.agentRun}
                  onApproveStep={handleApproveStep}
                  onRestoreRun={handleRestoreRun}
                  approvingStepId={studio?.approvingStepId}
                  restoringRun={studio?.restoringRun}
                />
              </div>
            )}

            {/* RIGHT: generated code workspace */}
            <div className={`w-full lg:w-[46%] xl:w-[42%] 2xl:w-[38%] lg:min-w-[420px] lg:max-w-[720px] lg:shrink-0 border-l border-white/5 ${isMobile && mobileTab !== "code" ? "hidden" : "flex"} flex-col min-h-0`}>
              {codeWorkspace}
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
