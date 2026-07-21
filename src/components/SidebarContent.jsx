import React, { useCallback, useDeferredValue, useMemo, useState } from "react";
import { FileCode, Gamepad2, Link2, Loader2, MessageSquare, Plus, Search, Trash2 } from "lib/icons";
import Modal from "./Modal";
import ChatRow from "./sidebar/ChatRow";
import ScriptRow from "./sidebar/ScriptRow";
import ChatHistoryModal from "./sidebar/ChatHistoryModal";
import { AI_EVENTS, emitAiEvent } from "../lib/aiEvents";
import { useAiLibrary } from "../hooks/useAiLibrary";
import { useProjectBindings } from "../hooks/useProjectBindings";
import { useBilling } from "../context/BillingContext";
import { resolveGameIdentityFromStudioStatus, resolveGameTitleFromTarget } from "../lib/studioPlaceBinding";
import { getStudioStatus } from "../lib/studioBridgeApi";

const timeValue = (value) => Number(value?.toMillis?.() || value || 0);

export default function SidebarContent({
  scripts = [], currentChatId, currentScriptId, setCurrentScriptId = () => {},
  handleRenameScript = () => {}, handleDeleteScript = () => {}, onSelectChat,
  onDeleteChat = () => {}, onRenameChat = () => {}, generatingChatIds = [], activeAgentStatusByChat = {},
  user = null, authReady = true, notify = () => {}, isMobile = false, onSelect = () => {},
}) {
  const { isFreeUsagePlan, limits, plan } = useBilling();
  const retentionDays = limits?.chatRetentionDays ?? (isFreeUsagePlan ? 7 : (String(plan || "").toUpperCase() === "STARTER" ? 30 : null));
  const { chats, allChats } = useAiLibrary(user, { retentionDays, authReady });
  const {
    projects, loading: projectsLoading, selectedProjectId, selectedProject,
    setSelectedProjectId, openGameProject, deleteProject,
  } = useProjectBindings(user, { authReady });
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const [creatingProject, setCreatingProject] = useState(false);
  const [studioOptions, setStudioOptions] = useState([]);
  const [deleteChatId, setDeleteChatId] = useState(null);
  const [deleteProjectId, setDeleteProjectId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [renamingChatId, setRenamingChatId] = useState(null);
  const [renameChatTitle, setRenameChatTitle] = useState("");
  const [renamingScriptId, setRenamingScriptId] = useState(null);
  const [renameScriptTitle, setRenameScriptTitle] = useState("");
  const [showAllChats, setShowAllChats] = useState(false);

  const knownProjectIds = useMemo(() => new Set(projects.map((project) => project.projectId)), [projects]);
  const chatById = useMemo(() => new Map(allChats.map((chat) => [chat.id, chat])), [allChats]);
  const classifyProject = useCallback((projectId) => knownProjectIds.has(String(projectId || "")) ? String(projectId) : null, [knownProjectIds]);
  const filterChats = useCallback((source) => source.filter((chat) => classifyProject(chat.projectId) === selectedProjectId)
    .filter((chat) => !deferredSearch || `${chat.title || ""} ${chat.lastMessage || ""}`.toLowerCase().includes(deferredSearch))
    .sort((a, b) => timeValue(b.updatedAt || b.createdAt) - timeValue(a.updatedAt || a.createdAt)),
  [classifyProject, deferredSearch, selectedProjectId]);
  const selectedChats = useMemo(() => filterChats(chats), [chats, filterChats]);
  const allSelectedChats = useMemo(() => filterChats(allChats), [allChats, filterChats]);
  const hiddenSelectedChatCount = Math.max(0, allSelectedChats.length - selectedChats.length);
  const selectedScripts = useMemo(() => scripts.filter((script) => {
    const linkedChatProject = chatById.get(script.chatId)?.projectId;
    const projectId = classifyProject(script.workspaceProjectId || linkedChatProject);
    return projectId === selectedProjectId;
  }).filter((script) => !deferredSearch || (script.title || "").toLowerCase().includes(deferredSearch))
    .sort((a, b) => timeValue(b.updatedAt || b.createdAt) - timeValue(a.updatedAt || a.createdAt)),
  [chatById, classifyProject, deferredSearch, scripts, selectedProjectId]);

  const createChat = () => {
    emitAiEvent(AI_EVENTS.START_DRAFT, { projectId: selectedProjectId || null });
    if (isMobile) onSelect();
  };
  const openChat = (id) => {
    if (onSelectChat) onSelectChat(id); else emitAiEvent(AI_EVENTS.OPEN_CHAT, { id });
    if (isMobile) onSelect();
  };
  const openScript = (id) => {
    setCurrentScriptId(id);
    emitAiEvent(AI_EVENTS.OPEN_CODE_DRAWER, { scriptId: id });
    if (isMobile) onSelect();
  };
  const adoptIdentity = async (identity) => {
    const project = await openGameProject(identity);
    setStudioOptions([]);
    notify({ message: `Working on ${project?.title || "game"}`, type: "success" });
  };
  const openFromStudio = async () => {
    if (!user || creatingProject) return;
    setCreatingProject(true);
    try {
      const identity = resolveGameIdentityFromStudioStatus(await getStudioStatus());
      if (identity.status === "needs_connect") throw new Error("Connect Roblox Studio to detect a published game.");
      if (identity.status === "needs_selection") { setStudioOptions(identity.options || []); return; }
      await adoptIdentity(identity);
    } catch (error) { notify({ message: error.message || "Could not detect a published Studio game", type: "error" }); }
    finally { setCreatingProject(false); }
  };
  const chooseStudioOption = async (option) => {
    setCreatingProject(true);
    try {
      const title = resolveGameTitleFromTarget(option);
      await adoptIdentity({ title, placeId: option.placeId, universeId: option.universeId, studioTargetId: option.studioTargetId || option.id, studioTargetLabel: option.label || title, source: "studio", target: option });
    } catch (error) { notify({ message: error.message || "Could not open that game", type: "error" }); }
    finally { setCreatingProject(false); }
  };
  const confirmChatDelete = async () => {
    if (!deleteChatId || activeAgentStatusByChat[deleteChatId]) return;
    setDeleting(true);
    try { await onDeleteChat(deleteChatId); setDeleteChatId(null); } finally { setDeleting(false); }
  };
  const commitChatRename = async (id, title) => {
    const nextTitle = String(title || "").trim();
    if (nextTitle) await onRenameChat(id, nextTitle);
    setRenamingChatId(null);
  };
  const confirmProjectDelete = async () => {
    if (!deleteProjectId) return;
    setDeleting(true);
    try {
      const result = await deleteProject(deleteProjectId);
      setDeleteProjectId(null);
      notify({ message: `Deleted game project and ${result?.counts?.chats || 0} chats. Roblox content was not changed.`, type: "success" });
    } catch (error) { notify({ message: error.message || "Project deletion stopped and can be retried.", type: "error" }); }
    finally { setDeleting(false); }
  };
  const projectCounts = deleteProjectId ? {
    chats: allChats.filter((chat) => chat.projectId === deleteProjectId).length,
    creations: scripts.filter((script) => script.workspaceProjectId === deleteProjectId || allChats.find((chat) => chat.id === script.chatId)?.projectId === deleteProjectId).length,
  } : { chats: 0, creations: 0 };

  return <div className="flex h-full flex-col bg-[#050505]/50">
    <div className="border-b border-white/5 p-3 space-y-3">
      <button onClick={() => setSelectedProjectId(null)} className={`w-full rounded-xl border px-3 py-3 text-left transition ${selectedProjectId === null ? "border-[#00f5d4]/50 bg-[#00f5d4]/10 text-white" : "border-white/10 text-gray-300 hover:bg-white/5"}`}>
        <span className="flex items-center gap-2 font-semibold"><MessageSquare className="h-4 w-4 text-[#00f5d4]" />General</span>
        <span className="mt-1 block text-[11px] text-gray-500">Chats and creations not linked to a Roblox game</span>
      </button>
      <div className="flex items-center justify-between px-1"><span className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">Roblox Games</span><button onClick={openFromStudio} disabled={creatingProject} className="text-[10px] font-bold uppercase text-[#00f5d4] hover:text-white"><Link2 className="mr-1 inline h-3 w-3" />Detect from Studio</button></div>
      {projectsLoading && <div className="px-2 text-xs text-gray-500"><Loader2 className="mr-2 inline h-3 w-3 animate-spin" />Detecting games…</div>}
      <div className="space-y-1">
        {projects.map((project) => <div key={project.projectId} className={`group flex items-center rounded-xl border ${selectedProjectId === project.projectId ? "border-[#9b5de5]/50 bg-[#9b5de5]/10" : "border-white/5 bg-white/[.02]"}`}>
          <button onClick={() => setSelectedProjectId(project.projectId)} className="min-w-0 flex-1 px-3 py-2 text-left"><span className="flex items-center gap-2 truncate text-sm font-semibold text-gray-200"><Gamepad2 className="h-4 w-4 shrink-0 text-[#9b5de5]" />{project.title}</span><span className="pl-6 text-[10px] text-gray-500">Place {project.placeId}</span></button>
          <button aria-label={`Delete game project ${project.title}`} onClick={() => setDeleteProjectId(project.projectId)} className="m-1.5 rounded-lg p-2 text-gray-500 hover:bg-red-400/10 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>)}
        {!projectsLoading && !projects.length && <p className="px-2 text-xs text-gray-600">No published Studio games detected yet.</p>}
      </div>
      {studioOptions.length > 0 && <div className="rounded-xl border border-[#00f5d4]/20 bg-black/40 p-2 space-y-1">{studioOptions.map((option) => <button key={option.id || option.placeId} onClick={() => chooseStudioOption(option)} className="w-full rounded-lg px-2 py-2 text-left text-xs text-gray-300 hover:bg-white/5">{option.label || option.placeName}</button>)}</div>}
      <button onClick={createChat} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] px-3 py-2.5 font-semibold text-black"><Plus className="h-4 w-4" />New chat</button>
      <label className="relative block"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search chats and creations…" className="w-full rounded-xl border border-white/10 bg-white/[.03] py-2.5 pl-9 pr-3 text-sm text-white outline-none focus:border-[#00f5d4]/40" /></label>
    </div>
    <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-6 scrollbar-subtle">
      <section><h3 className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.18em] text-gray-500"><MessageSquare className="h-3.5 w-3.5" />Chats · {selectedProject?.title || "General"}</h3><div className="space-y-2">{selectedChats.map((chat) => <ChatRow key={chat.id} chat={chat} currentChatId={currentChatId} isGenerating={generatingChatIds.includes(chat.id)} agentStatus={activeAgentStatusByChat[chat.id]} onOpenChat={openChat} renamingChatId={renamingChatId} renameChatTitle={renameChatTitle} setRenameChatTitle={setRenameChatTitle} onRenameStart={(id, title) => { setRenamingChatId(id); setRenameChatTitle(title); }} onRenameCommit={commitChatRename} onRenameCancel={() => setRenamingChatId(null)} onDeleteClick={setDeleteChatId} />)}{!selectedChats.length && <p className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-gray-600">No chats in this workspace.</p>}</div>{hiddenSelectedChatCount > 0 && <button onClick={() => setShowAllChats(true)} className="mt-3 w-full text-xs text-gray-500 hover:text-white">View {hiddenSelectedChatCount} more chats</button>}</section>
      <section><h3 className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.18em] text-gray-500"><FileCode className="h-3.5 w-3.5" />Creations</h3><div className="space-y-2">{selectedScripts.map((script) => <ScriptRow key={script.id} script={script} isSelected={currentScriptId === script.id} onSelect={() => openScript(script.id)} onRename={(id, title) => { setRenamingScriptId(id); setRenameScriptTitle(title); }} onDelete={handleDeleteScript} renaming={renamingScriptId === script.id} renameValue={renameScriptTitle} setRenameValue={setRenameScriptTitle} onRenameCommit={(id, title) => { handleRenameScript(id, title); setRenamingScriptId(null); }} onRenameCancel={() => setRenamingScriptId(null)} />)}{!selectedScripts.length && <p className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-gray-600">No creations in this workspace.</p>}</div></section>
    </div>
    <ChatHistoryModal isOpen={showAllChats} onClose={() => setShowAllChats(false)} chats={allSelectedChats} currentChatId={currentChatId} onOpenChat={openChat} renamingChatId={renamingChatId} renameChatTitle={renameChatTitle} setRenameChatTitle={setRenameChatTitle} onRenameStart={(id, title) => { setRenamingChatId(id); setRenameChatTitle(title); }} onRenameCommit={commitChatRename} onRenameCancel={() => setRenamingChatId(null)} onDeleteClick={setDeleteChatId} activeAgentStatusByChat={activeAgentStatusByChat} />
    <Modal isOpen={Boolean(deleteChatId)} onClose={() => setDeleteChatId(null)} title="Delete chat?"><p className="text-sm text-gray-400">This removes the chat and all its messages. Saved creations will remain.</p>{activeAgentStatusByChat[deleteChatId] && <p className="mt-3 text-sm text-amber-300">Finish or cancel the active run first.</p>}<div className="mt-6 flex justify-end gap-2"><button onClick={() => setDeleteChatId(null)} className="rounded-lg px-4 py-2 text-sm text-gray-400">Cancel</button><button onClick={confirmChatDelete} disabled={deleting || activeAgentStatusByChat[deleteChatId]} className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">Delete chat</button></div></Modal>
    <Modal isOpen={Boolean(deleteProjectId)} onClose={() => setDeleteProjectId(null)} title="Delete game project?"><p className="text-sm text-gray-300">This removes {projectCounts.chats} chats, {projectCounts.creations} creations, their messages, Nexus asset records, and Nexus-hosted files. It never deletes the Roblox experience or assets already uploaded to Roblox.</p><p className="mt-3 text-xs text-gray-500">An active agent run must be finished or cancelled first. Partial failures can be retried.</p><div className="mt-6 flex justify-end gap-2"><button onClick={() => setDeleteProjectId(null)} className="rounded-lg px-4 py-2 text-sm text-gray-400">Cancel</button><button onClick={confirmProjectDelete} disabled={deleting} className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">Delete Nexus data</button></div></Modal>
  </div>;
}
