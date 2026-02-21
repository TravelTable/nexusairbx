import React from "react";
import { Menu, Layout, X, Eye, EyeOff, FolderOpen } from "lucide-react";

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
import LibraryView from "../../components/ai/LibraryView";
import ProjectArchitecturePanel from "../../components/ai/ProjectArchitecturePanel";
import { CustomModeModal, ProjectContextStatus } from "../../components/ai/AiComponents";
import { CHAT_MODES } from "../../components/ai/chatConstants";
import { AI_EVENTS } from "../../lib/aiEvents";
import { BACKEND_URL } from "../../lib/uiBuilderApi";

export default function AiWorkspaceLayout({ controller }) {
  const { billing, navigation, uiState, refs, modules, handlers } = controller;
  const { planKey, totalRemaining, subLimit, resetsAt, isPremium } = billing;
  const { navigate, location } = navigation;
  const {
    user,
    isMobile,
    sidebarOpen,
    activeTab,
    mobileTab,
    prompt,
    attachments,
    scripts,
    projectContext,
    architecturePanelOpen,
    teams,
    customModeModalOpen,
    editingCustomMode,
    showSignInNudge,
    showProNudge,
    proNudgeReason,
    codeDrawerOpen,
    codeDrawerData,
    currentTheme,
    activeModeData,
    composerSuggestions,
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
    setCustomModeModalOpen,
    setEditingCustomMode,
    setCodeDrawerOpen,
    dismissToast,
    handleSidebarTabChange,
    handlePromptSubmit,
    handleFileUpload,
    handleModeChange,
    handleOpenScript,
    handlePlanUi,
    handlePlanSystem,
    handleToggleActMode,
    handleQuickStart,
    handleInstallCommunityMode,
    handleSaveCustomMode,
    handlePreviewToggle,
    handleClosePreview,
    handleUiAudit,
    handleSuggestAssets,
    track,
    notify,
    emitAiEvent,
  } = handlers;

  const { chatEndRef } = refs;

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
        tokenInfo={{ sub: { limit: subLimit, used: subLimit - totalRemaining }, payg: { remaining: totalRemaining } }}
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
              activeTab={activeTab === "chat" ? "chats" : "saved"}
              setActiveTab={handleSidebarTabChange}
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

        <main className="flex-1 flex flex-row relative min-w-0 overflow-hidden">
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

          <div className={`flex-1 flex flex-col min-w-0 transition-all duration-500 ${ui.uiDrawerOpen ? "lg:max-w-[40%] border-r border-white/5" : "w-full"} ${isMobile && ui.uiDrawerOpen && mobileTab !== "chat" ? "hidden" : "flex"}`}>
            <div className="flex items-center justify-between p-4 border-b border-white/5 bg-black/30 backdrop-blur-md sticky top-0 z-20 gap-4">
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
                {!ui.uiDrawerOpen && (
                  <span className="text-[10px] font-medium text-gray-500 hidden sm:inline">Preview opens when a UI artifact is selected.</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider hidden sm:inline">Project</span>
                <ProjectContextStatus
                  context={projectContext}
                  plan={planKey}
                  onViewStructure={() => setArchitecturePanelOpen(true)}
                  onSync={async () => {
                    if (!requirePremium("Project Context Sync")) return;
                    notify({ message: "Use the NexusRBX Studio Plugin to refresh context", type: "info" });
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
                  customModes={chat.customModes}
                  onModeChange={handleModeChange}
                  onCreateCustomMode={() => {
                    if (!requireUser()) return;
                    setEditingCustomMode(null);
                    setCustomModeModalOpen(true);
                  }}
                  onEditCustomMode={(mode) => {
                    if (!requireUser()) return;
                    setEditingCustomMode(mode);
                    setCustomModeModalOpen(true);
                  }}
                  onInstallCommunityMode={handleInstallCommunityMode}
                  onViewUi={(m) => {
                    ui.setActiveUiId(m.projectId);
                    ui.setUiDrawerOpen(true);
                    if (isMobile) setMobileTab("preview");
                    track("artifact_action_used", { action: "view_ui" });
                  }}
                  onQuickStart={handleQuickStart}
                  onRefine={(m) => {
                    if (!requirePremium("UI Refinement & Iteration")) return;
                    setPrompt("Refine this UI: ");
                    track("artifact_action_used", { action: "refine_prompt_seed" });
                  }}
                  onToggleActMode={handleToggleActMode}
                  onPlanUI={handlePlanUi}
                  onPlanSystem={handlePlanSystem}
                  onPushToStudio={(id, type, data) => {
                    if (!requirePremium("One-Click Studio Push")) return;
                    chat.handlePushToStudio(id, type, data);
                    track("artifact_action_used", { action: "push_to_studio", type });
                  }}
                  onShareWithTeam={(id, type, teamId) => {
                    if (!requirePremium("Team Collaboration")) return;
                    chat.handleShareWithTeam(id, type, teamId);
                    track("artifact_action_used", { action: "share_with_team", type });
                  }}
                  teams={teams}
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
                  onExecuteTask={async (task) => {
                    if (!requirePremium("Multi-Step Goal Execution")) return;
                    chat.setCurrentTaskId(task.id);
                    const requestId =
                      typeof crypto !== "undefined" && crypto.randomUUID
                        ? crypto.randomUUID()
                        : `${Date.now()}-${Math.random()}`;
                    try {
                      if (task.type === "pipeline") {
                        await ui.handleGenerateUiPreview(task.prompt, chat.currentChatId, chat.setCurrentChatId, null, requestId);
                      } else if (task.type === "generate_functionality") {
                        const token = await user.getIdToken();
                        const res = await fetch(`${BACKEND_URL}/api/ui-builder/ai/generate-functionality`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                          body: JSON.stringify({
                            lua: ui.activeUi?.uiModuleLua || "",
                            prompt: task.prompt,
                            gameSpec: settings.gameSpec || "",
                          }),
                        });
                        if (res.ok) {
                          const data = await res.json();
                          for (const s of data.scripts) {
                            // eslint-disable-next-line no-await-in-loop
                            await scriptManager.handleCreateScript(s.name, s.code, "logic");
                          }
                          notify({ message: `Generated ${data.scripts.length} scripts for ${task.label}`, type: "success" });
                        }
                      } else if (task.type === "refine") {
                        if (ui.activeUi?.uiModuleLua || ui.activeUi?.lua) {
                          await ui.handleRefine(task.prompt);
                        } else {
                          await ui.handleGenerateUiPreview(task.prompt, chat.currentChatId, chat.setCurrentChatId, null, requestId);
                        }
                      } else if (task.type === "lint") {
                        await handleUiAudit();
                      } else if (task.type === "suggest_assets") {
                        await handleSuggestAssets(task.prompt);
                      } else if (task.type === "code") {
                        await handlePromptSubmit(null, task.prompt);
                      }

                      chat.setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: "done" } : t)));
                      track("task_completed", { taskType: task.type, taskLabel: task.label });
                    } catch (err) {
                      notify({ message: `Failed to execute ${task.label}`, type: "error" });
                    } finally {
                      chat.setCurrentTaskId(null);
                    }
                  }}
                  currentTaskId={chat.currentTaskId}
                  chatEndRef={chatEndRef}
                />
              )}

              {activeTab === "library" && (
                <LibraryView scripts={scripts} onOpenScript={handleOpenScript} />
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
              placeholder={activeModeData.placeholder}
              activeModeData={activeModeData}
              allModes={[...CHAT_MODES, ...chat.customModes]}
              onModeChange={handleModeChange}
              currentChatId={chat.currentChatId}
              chatMode={chat.chatMode}
              setChatMode={chat.setChatMode}
              onActClick={async () => {
                chat.setChatMode("act");
                const lastMsg = chat.messages[chat.messages.length - 1];
                if (lastMsg?.role === "assistant" && (lastMsg.plan || lastMsg.explanation?.includes("<plan>"))) {
                  await handlePromptSubmit(null, lastMsg.prompt || chat.messages[chat.messages.length - 2]?.content);
                }
              }}
              tokensLeft={totalRemaining}
              tokensLimit={subLimit}
              resetsAt={resetsAt}
              planKey={planKey}
              themePrimary={currentTheme.primary}
              themeSecondary={currentTheme.secondary}
              suggestions={composerSuggestions}
              onSuggestionClick={(item) => {
                if (item.submit) handlePromptSubmit(null, item.prompt);
                else setPrompt(item.prompt);
              }}
              isPremium={isPremium}
              onProNudge={(reason) => {
                setProNudgeReason(reason || "This feature");
                setShowProNudge(true);
              }}
              onFileUpload={handleFileUpload}
              disabled={unified.isGenerating}
            />
          </div>

          <div className={`flex-1 bg-[#050505] flex-col min-w-0 transition-all duration-500 ${ui.uiDrawerOpen ? "flex" : "hidden"} ${isMobile && mobileTab !== "preview" ? "hidden" : "flex"}`}>
            <div className="flex items-center justify-between p-4 border-b border-white/5 bg-black/30 backdrop-blur-md sticky top-0 z-20">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[#00f5d4]/10 text-[#00f5d4]">
                  <Layout className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-white">Live Preview & Code</span>
              </div>
              <button
                type="button"
                onClick={handleClosePreview}
                className="p-2 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition-all"
                aria-label="Close preview panel"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-white/5 bg-black/20">
              <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold inline-flex items-center gap-2">
                <FolderOpen className="w-3.5 h-3.5" />
                {ui.activeUi?.prompt ? `Active: ${ui.activeUi.prompt.slice(0, 46)}${ui.activeUi.prompt.length > 46 ? "..." : ""}` : "No active UI"}
              </span>
            </div>

            <div className="flex-1 overflow-hidden">
              <UiPreviewDrawer
                open
                inline
                onClose={handleClosePreview}
                uiModuleLua={ui.activeUi?.uiModuleLua || ""}
                systemsLua={ui.activeUi?.systemsLua || ""}
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
                if (!requirePremium("Project Context Sync")) return;
                notify({ message: "Use the NexusRBX Studio Plugin to refresh context", type: "info" });
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

      <SignInNudgeModal isOpen={showSignInNudge} onClose={() => setShowSignInNudge(false)} />

      <ProNudgeModal
        isOpen={showProNudge}
        onClose={() => setShowProNudge(false)}
        reason={proNudgeReason}
      />

      <CustomModeModal
        isOpen={customModeModalOpen}
        onClose={() => setCustomModeModalOpen(false)}
        onSave={handleSaveCustomMode}
        initialData={editingCustomMode}
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
