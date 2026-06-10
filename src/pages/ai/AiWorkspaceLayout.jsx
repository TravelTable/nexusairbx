import React, { useState, useRef, useEffect, useCallback } from "react";
import { Menu, Layout, X, Eye, EyeOff, FolderOpen, LayoutGrid, Share2, Loader2 } from "lucide-react";

import SidebarContent from "../../components/SidebarContent";
import NexusRBXHeader from "../../components/NexusRBXHeader";
import UiPreviewDrawer from "../../components/UiPreviewDrawer";
import CodeDrawer from "../../components/CodeDrawer";
import SignInNudgeModal from "../../components/SignInNudgeModal";
import ProNudgeModal from "../../components/ProNudgeModal";
import NotificationToast from "../../components/NotificationToast";
import GameProfileWizard from "../../components/ai/GameProfileWizard";
import ChatView from "../../components/ai/ChatView";
import ChatComposer from "../../components/ai/chat/ChatComposer";
import ExportBar from "../../components/ai/ExportBar";
import ModelSwitcher from "../../components/ai/ModelSwitcher";
import TemplateGallery from "../../components/ai/TemplateGallery";
import DailyPromptBadge from "../../components/ai/DailyPromptBadge";
import ProjectArchitecturePanel from "../../components/ai/ProjectArchitecturePanel";
import { ProjectContextStatus } from "../../components/ai/AiComponents";
import { AI_EVENTS } from "../../lib/aiEvents";
import { BACKEND_URL } from "../../lib/uiBuilderApi";

export default function AiWorkspaceLayout({ controller }) {
  const { billing, navigation, uiState, refs, modules, handlers } = controller;
  const { planKey, totalRemaining, subRemaining, paygRemaining, subLimit, resetsAt, isPremium } = billing;
  const { navigate, location } = navigation;
  const {
    user,
    isMobile,
    sidebarOpen,
    activeTab,
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
    templateGalleryOpen,
    isSharing,
    currentTheme,
    currentToast,
  } = uiState;

  const { chat, ui, game, scriptManager, unified, settings } = modules;

  const {
    setSidebarOpen,
    setActiveTab,
    setMobileTab,
    setPrompt,
    setAttachments,
    setArchitecturePanelOpen,
    setShowSignInNudge,
    setShowProNudge,
    setProNudgeReason,
    setCodeDrawerOpen,
    setTemplateGalleryOpen,
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
    handleSelectTemplate,
    handleCreateShareLink,
    handlePreviewToggle,
    handleClosePreview,
    track,
    notify,
    emitAiEvent,
  } = handlers;

  const { chatEndRef } = refs;

  // Resizable chat <-> preview split (desktop only). previewWidth is a percent
  // of the workspace width; the chat column takes the rest.
  const MIN_PREVIEW = 28;
  const MAX_PREVIEW = 70;
  const mainRef = useRef(null);
  const [previewWidth, setPreviewWidth] = useState(42);
  const [isResizing, setIsResizing] = useState(false);

  const desktopSplit = ui.uiDrawerOpen && !isMobile;

  const handleDividerMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleDividerKeyDown = useCallback((e) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setPreviewWidth((w) => Math.min(MAX_PREVIEW, w + 3));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setPreviewWidth((w) => Math.max(MIN_PREVIEW, w - 3));
    }
  }, []);

  useEffect(() => {
    if (!isResizing) return undefined;
    const onMove = (e) => {
      const rect = mainRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0) return;
      const fromRight = rect.right - e.clientX;
      const pct = (fromRight / rect.width) * 100;
      setPreviewWidth(Math.max(MIN_PREVIEW, Math.min(MAX_PREVIEW, pct)));
    };
    const onUp = () => setIsResizing(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing]);

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

  return (
    <div className="h-screen ai-page font-sans flex flex-col relative overflow-hidden" role="application" aria-label="Nexus AI Workspace">
      <div
        className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] blur-[120px] rounded-full pointer-events-none transition-colors duration-1000"
        style={{ backgroundColor: `${currentTheme.primary}1a` }}
        aria-hidden="true"
      />
      <div
        className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] blur-[120px] rounded-full pointer-events-none transition-colors duration-1000"
        style={{ backgroundColor: `${currentTheme.secondary}1a` }}
        aria-hidden="true"
      />

      <NexusRBXHeader
        variant="ai"
        navigate={navigate}
        user={user}
        handleLogin={() => navigate("/signin", { state: { from: location } })}
        tokenInfo={{ sub: { limit: subLimit, used: subLimit - subRemaining }, payg: { remaining: paygRemaining } }}
        tokenLoading={false}
      />

      <div className="flex flex-1 min-h-0 overflow-hidden pt-20">
        <aside
          id="ai-sidebar"
          className={`fixed inset-y-0 left-0 z-40 w-72 bg-[#0D0D0D]/95 backdrop-blur-2xl border-r border-white/5 flex flex-col transform transition-all duration-500 ease-in-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:relative lg:translate-x-0 ${sidebarOpen ? "lg:w-72" : "lg:w-0 lg:opacity-0 lg:pointer-events-none"}`}
          aria-label="AI workspace sidebar"
        >
          <div className="flex-1 flex flex-col min-h-0">
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
                emitAiEvent(AI_EVENTS.OPEN_CODE_DRAWER, {
                  code: ver.code,
                  title: ver.title || scriptManager.currentScript?.title || "Script",
                  explanation: ver.explanation || "",
                  versionNumber: ver.versionNumber,
                });
              }}
              onVersionDownload={(ver) => {
                if (!ver.code) return;
                const blob = new Blob([ver.code], { type: "text/plain;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${(ver.title || "script").replace(/\s+/g, "_")}.lua`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            />
          </div>
        </aside>

        <main ref={mainRef} className="flex-1 flex flex-row relative min-w-0 overflow-hidden">
          {isMobile && ui.uiDrawerOpen && (
            <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-black/70 backdrop-blur-xl border border-white/10 rounded-full p-1.5 flex items-center gap-1 shadow-2xl">
              <button
                type="button"
                onClick={() => setMobileTab("chat")}
                className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${mobileTab === "chat" ? "bg-[#00f5d4] text-black" : "text-gray-400 hover:text-white"}`}
                aria-pressed={mobileTab === "chat"}
              >
                Chat
              </button>
              <button
                type="button"
                onClick={() => setMobileTab("preview")}
                className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${mobileTab === "preview" ? "bg-[#00f5d4] text-black" : "text-gray-400 hover:text-white"}`}
                aria-pressed={mobileTab === "preview"}
              >
                Preview
              </button>
            </div>
          )}

          <div
            className={`flex flex-col min-w-0 ${isResizing ? "" : "transition-all duration-300"} ${ui.uiDrawerOpen ? "border-r border-white/5" : "w-full"} ${desktopSplit ? "" : "flex-1"} ${isMobile && ui.uiDrawerOpen && mobileTab !== "chat" ? "hidden" : "flex"}`}
            style={desktopSplit ? { width: `${100 - previewWidth}%`, flexGrow: 0, flexShrink: 0 } : undefined}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-black/30 backdrop-blur-md sticky top-0 z-20 gap-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className={`p-2 rounded-xl transition-all ${sidebarOpen ? "bg-[#00f5d4]/10 text-[#00f5d4]" : "bg-white/5 text-gray-400 hover:text-white"}`}
                  title="Toggle workspace sidebar"
                  aria-label="Toggle workspace sidebar"
                >
                  <Menu className="h-5 w-5" />
                </button>
                <div className="h-4 w-px bg-white/10" aria-hidden="true" />
                <button
                  type="button"
                  onClick={handlePreviewToggle}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-widest text-gray-300 hover:text-white hover:bg-white/10 transition-all"
                  aria-label={ui.uiDrawerOpen ? "Hide live preview" : "Show live preview"}
                >
                  {ui.uiDrawerOpen ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {ui.uiDrawerOpen ? "Hide Preview" : "Open Preview"}
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
                <button
                  type="button"
                  onClick={() => setTemplateGalleryOpen(true)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-widest text-gray-300 hover:text-white hover:bg-white/10 transition-all"
                  aria-label="Open quick-start template gallery"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Templates</span>
                </button>
              </div>

              <div className="flex items-center gap-3">
                <DailyPromptBadge
                  totalRemaining={totalRemaining}
                  subLimit={subLimit}
                  resetsAt={resetsAt}
                  planKey={planKey}
                />
                <div className="h-4 w-px bg-white/10 hidden sm:block" aria-hidden="true" />
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider hidden sm:inline">Project</span>
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

            <div className="flex-grow overflow-y-auto px-4 py-6 scrollbar-hide">
              {activeTab === "chat" && (
                <ChatView
                  messages={chat.messages}
                  pendingMessage={unified.pendingMessage}
                  generationStage={unified.generationStage}
                  user={user}
                  activeMode={chat.activeMode}
                  isBusy={unified.isGenerating}
                  onApprovePlan={onApprovePlan}
                  onClarifySubmit={onClarifySubmit}
                  onEditPlan={handleEditPlan}
                  onViewUi={(m) => {
                    ui.setActiveUiId(m.projectId);
                    ui.setUiDrawerOpen(true);
                    if (isMobile) setMobileTab("preview");
                    track("artifact_action_used", { action: "view_ui" });
                  }}
                  onQuickStart={handleQuickStart}
                  onOpenTemplates={() => setTemplateGalleryOpen(true)}
                  notify={notify}
                  onRefine={(m) => {
                    if (!requirePremium("Refinement & Iteration")) return;
                    handleStartRefine(m);
                    track("artifact_action_used", { action: "refine_start" });
                  }}
                  onFixUiAudit={async (m) => {
                    if (!requirePremium("UI Auto-Fix & Audit")) return;
                    if (!m.boardState || !m.metadata?.qaReport?.issues) return;
                    try {
                      const token = await user.getIdToken();
                      const res = await fetch(`${BACKEND_URL}/api/ui-builder/ai/audit/fix`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                        body: JSON.stringify({
                          boardState: m.boardState,
                          issues: m.metadata.qaReport.issues,
                        }),
                      });

                      if (!res.ok) throw new Error("Failed to apply fixes");

                      const data = await res.json();
                      ui.setUiGenerations((prev) => prev.map((g) => (g.id === m.id ? { ...g, boardState: data.boardState } : g)));
                      notify({ message: "UI fixes applied. Regenerating Lua", type: "success" });
                      await ui.handleRefine("Finalize Lua for the updated layout", m.id);
                      track("artifact_action_used", { action: "apply_ui_audit_fix" });
                    } catch (err) {
                      notify({ message: "Failed to apply UI fixes", type: "error" });
                    }
                  }}
                  chatEndRef={chatEndRef}
                />
              )}
            </div>

            <ChatComposer
              prompt={prompt}
              setPrompt={setPrompt}
              attachments={attachments}
              setAttachments={setAttachments}
              onSubmit={(e) => handlePromptSubmit(e)}
              isGenerating={unified.isGenerating}
              generationStage={unified.generationStage}
              placeholder={refineTarget ? "Describe the change you want…" : "What do you want to build?"}
              refineTarget={refineTarget}
              onCancelRefine={cancelRefine}
              tokensLeft={totalRemaining}
              tokensLimit={subLimit}
              resetsAt={resetsAt}
              planKey={planKey}
              themePrimary={currentTheme.primary}
              themeSecondary={currentTheme.secondary}
              onFileUpload={handleFileUpload}
              onImprovePrompt={handleImprovePrompt}
              isImproving={isImproving}
              disabled={unified.isGenerating}
            />
          </div>

          {desktopSplit && (
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize preview panel"
              aria-valuenow={Math.round(previewWidth)}
              aria-valuemin={MIN_PREVIEW}
              aria-valuemax={MAX_PREVIEW}
              tabIndex={0}
              onMouseDown={handleDividerMouseDown}
              onKeyDown={handleDividerKeyDown}
              className={`group hidden lg:flex shrink-0 w-1.5 cursor-col-resize items-center justify-center relative z-30 transition-colors ${isResizing ? "bg-[#00f5d4]/40" : "bg-white/5 hover:bg-[#00f5d4]/30"}`}
              title="Drag to resize (or use arrow keys)"
            >
              <div className={`w-0.5 h-10 rounded-full transition-colors ${isResizing ? "bg-[#00f5d4]" : "bg-white/20 group-hover:bg-[#00f5d4]"}`} />
            </div>
          )}

          <div
            className={`bg-[#050505] flex-col min-w-0 ${isResizing ? "" : "transition-all duration-300"} ${ui.uiDrawerOpen ? "flex" : "hidden"} ${desktopSplit ? "" : "flex-1"} ${isMobile && mobileTab !== "preview" ? "hidden" : "flex"}`}
            style={desktopSplit ? { width: `${previewWidth}%`, flexGrow: 0, flexShrink: 0 } : undefined}
          >
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/5 bg-black/30 backdrop-blur-md sticky top-0 z-20">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-1.5 rounded-lg bg-[#00f5d4]/10 text-[#00f5d4] shrink-0">
                  <Layout className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-black uppercase tracking-widest text-white leading-tight">Live Preview & Code</div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-gray-400 truncate">
                    <FolderOpen className="w-3 h-3 shrink-0" />
                    <span className="truncate">
                      {ui.activeUi?.prompt ? `${ui.activeUi.prompt.slice(0, 46)}${ui.activeUi.prompt.length > 46 ? "…" : ""}` : "No active UI"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {ui.activeUi && (
                  <button
                    type="button"
                    onClick={handleCreateShareLink}
                    disabled={isSharing}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-gray-300 hover:text-white hover:bg-white/10 transition-all disabled:opacity-50"
                    aria-label="Create a shareable read-only preview link"
                    title="Copy a public, read-only preview link"
                  >
                    {isSharing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Share2 className="w-3.5 h-3.5" />
                    )}
                    Share
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleClosePreview}
                  className="p-2 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition-all"
                  aria-label="Close preview panel"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {ui.activeUi && (
              <ExportBar
                lua={ui.activeUi?.uiModuleLua || ui.activeUi?.lua || ""}
                systemsLua={ui.activeUi?.systemsLua || ""}
                boardState={ui.activeUi?.boardState || null}
                title={ui.activeUi?.prompt || "Generated UI"}
                projectId={ui.activeUiId}
                kind="ui"
                files={ui.activeUi?.files || []}
                notify={notify}
              />
            )}

            <div className="flex-1 overflow-hidden">
              <UiPreviewDrawer
                open
                inline
                onClose={handleClosePreview}
                uiModuleLua={ui.activeUi?.uiModuleLua || ""}
                systemsLua={ui.activeUi?.systemsLua || ""}
                files={ui.activeUi?.files || []}
                lua={ui.activeUi?.lua || ""}
                boardState={ui.activeUi?.boardState || null}
                prompt={ui.activeUi?.prompt || ""}
                history={ui.uiGenerations}
                activeId={ui.activeUiId}
                onSelectHistory={(id) => ui.setActiveUiId(id)}
                onDownload={() => {
                  const blob = new Blob([ui.activeUi?.lua], { type: "text/plain;charset=utf-8" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "generated_ui.lua";
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                user={user}
                settings={settings}
                onRefine={ui.handleRefine}
                onUpdateLua={(newLua) => {
                  if (!ui.activeUiId) return;
                  ui.setUiGenerations((prev) => prev.map((g) => (g.id === ui.activeUiId ? { ...g, lua: newLua } : g)));
                }}
                isRefining={ui.uiIsGenerating}
              />
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

      <TemplateGallery
        open={templateGalleryOpen}
        onClose={() => setTemplateGalleryOpen(false)}
        onSelect={handleSelectTemplate}
      />

      <SignInNudgeModal isOpen={showSignInNudge} onClose={() => setShowSignInNudge(false)} />

      <ProNudgeModal
        isOpen={showProNudge}
        onClose={() => setShowProNudge(false)}
        reason={proNudgeReason}
      />

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
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
