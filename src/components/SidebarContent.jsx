import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useDeferredValue,
} from "react";
import {
  Plus,
  Search,
  Bookmark,
  Gamepad2,
  MessageSquare,
  Layout,
  Zap,
  Users,
  ChevronRight,
  FileCode,
  Link2,
  Loader2,
  MapPin,
} from "lib/icons";
import SidebarTab from "./SidebarTab";
import Modal from "./Modal";
import ScriptRow from "./sidebar/ScriptRow";
import ChatRow from "./sidebar/ChatRow";
import ChatHistoryModal from "./sidebar/ChatHistoryModal";
import { Badge, Button, EmptyState, ListItem } from "./ui";
import {
  getVersionStr,
  fromNow,
} from "../lib/sidebarUtils";
import { AI_EVENTS, emitAiEvent } from "../lib/aiEvents";
import {
  getFirestore,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useAiLibrary } from "../hooks/useAiLibrary";
import { useProjectBindings } from "../hooks/useProjectBindings";
import { useBilling } from "../context/BillingContext";
import {
  resolveGameIdentityFromStudioStatus,
  resolveGameTitleFromTarget,
} from "../lib/studioPlaceBinding";
import { getStudioStatus } from "../lib/studioBridgeApi";

// --- SidebarContent component ---
export default function SidebarContent({
  activeTab,
  setActiveTab = () => {},
  handleClearChat = () => {},
  setPrompt = () => {},
  scripts = [],
  currentChatId,
  currentScriptId,
  setCurrentScriptId = () => {},
  handleRenameScript = () => {},
  handleDeleteScript = () => {},
  currentScript,
  versionHistory = [],
  onVersionView = () => {},
  onVersionDownload = () => {},
  promptSearch = "",
  setPromptSearch = () => {},
  isMobile = false,
  onSelect = () => {},
  onRenameChat = () => {},
  onDeleteChat = () => {},
  selectedVersionId,
  onLoadMoreScripts = () => {},
  hasMoreScripts = false,
  onSelectChat = () => {},
  onOpenGameContext = () => {},
  gameProfile = null,
  generatingChatIds = [],
  activeAgentStatusByChat = {},
  user = null,
  authReady = true,
  notify = () => {},
}) {
  const { isPremium, isFreeUsagePlan, limits, plan, entitlements } = useBilling();

  const retentionDays = limits?.chatRetentionDays ?? (isFreeUsagePlan ? 7 : (String(plan || "").toUpperCase() === "STARTER" ? 30 : null));

  // --- Library Data ---
  const { chats, hiddenChatCount } = useAiLibrary(user, { retentionDays, authReady });
  const {
    projects,
    loading: projectsLoading,
    selectedProjectId,
    selectedProject,
    setSelectedProjectId,
    openGameProject,
  } = useProjectBindings(user, { authReady });

  // --- State ---
  const [creatingProject, setCreatingProject] = useState(false);
  const [showGamePicker, setShowGamePicker] = useState(false);
  const [studioGameOptions, setStudioGameOptions] = useState([]);
  const [studioConnectHint, setStudioConnectHint] = useState(false);
  const [renamingScriptId, setRenamingScriptId] = useState(null);
  const [renameScriptTitle, setRenameScriptTitle] = useState("");

  // Debounced search state
  const [localSearch, setLocalSearch] = useState(promptSearch || "");
  const deferredSearch = useDeferredValue(localSearch);
  useEffect(() => setPromptSearch(deferredSearch), [deferredSearch, setPromptSearch]);
  useEffect(() => setLocalSearch(promptSearch || ""), [promptSearch]);

  // --- Chats state ---
  const [chatSearch, setChatSearch] = useState("");
  const [renamingChatId, setRenamingChatId] = useState(null);
  const [renameChatTitle, setRenameChatTitle] = useState("");
  const [deleteChatId, setDeleteChatId] = useState(null);
  const [chatDeleteLoading, setChatDeleteLoading] = useState(false);
  const [showChatHistoryModal, setShowChatHistoryModal] = useState(false);

  // --- Library Search ---
  const [savedSearch, setSavedSearch] = useState("");

  // --- Memoized filtered and sorted scripts for current chat ---
  const deferredScriptSearch = useDeferredValue(localSearch.trim().toLowerCase());
  const chatScripts = useMemo(() => {
    if (!currentChatId) return [];
    const list = Array.isArray(scripts) ? scripts : [];
    return list.filter((s) => s.chatId === currentChatId);
  }, [scripts, currentChatId]);

  const filteredScripts = useMemo(() => {
    const list = chatScripts;
    const q = deferredScriptSearch;
    const filtered = q
      ? list.filter((s) => (s.title || "").toLowerCase().includes(q))
      : list;
    return filtered
      .slice()
      .sort((a, b) => {
        const au = Number(a.updatedAt) || 0;
        const bu = Number(b.updatedAt) || 0;
        if (bu !== au) return bu - au;
        return (a.title || "").localeCompare(b.title || "");
      });
  }, [chatScripts, deferredScriptSearch]);

  // --- Memoized filtered/sorted chats ---
  const deferredChatSearch = useDeferredValue(chatSearch.trim().toLowerCase());
  const filteredChats = useMemo(() => {
    const list = Array.isArray(chats) ? chats : [];
    const q = deferredChatSearch;
    const filtered = q
      ? list.filter(
          (c) =>
            (c.title || "").toLowerCase().includes(q) ||
            (c.lastMessage || "").toLowerCase().includes(q)
        )
      : list;
    const scoped = selectedProjectId
      ? filtered.filter((c) => String(c.projectId || "") === selectedProjectId)
      : filtered;
    return scoped
      .slice()
      .sort((a, b) => {
        const au = Number(a.updatedAt || a.createdAt || 0) || 0;
        const bu = Number(b.updatedAt || b.createdAt || 0) || 0;
        return bu - au;
      });
  }, [chats, deferredChatSearch, selectedProjectId]);

  // --- Handlers ---
  const handleScriptSelect = useCallback(
    (scriptId) => {
      setCurrentScriptId(scriptId);
      emitAiEvent(AI_EVENTS.OPEN_CODE_DRAWER, { scriptId });
      if (isMobile && typeof onSelect === "function") onSelect();
    },
    [isMobile, setCurrentScriptId, onSelect]
  );

  const handleCreateChatLocal = useCallback(() => {
    if (!selectedProjectId) {
      notify({
        message: "Select or open a game before starting a new chat.",
        type: "error",
      });
      setShowGamePicker(true);
      setActiveTab("chats");
      return;
    }
    emitAiEvent(AI_EVENTS.START_DRAFT, { projectId: selectedProjectId });
    if (isMobile && typeof onSelect === "function") onSelect();
  }, [isMobile, notify, onSelect, selectedProjectId, setActiveTab]);

  const adoptIdentity = useCallback(async (identity) => {
    const project = await openGameProject(identity);
    setShowGamePicker(false);
    setStudioGameOptions([]);
    setStudioConnectHint(false);
    notify({
      message: project?.studioTargetLabel && project.studioTargetLabel !== project.title
        ? `Working on ${project.title} · ${project.studioTargetLabel}`
        : `Working on ${project?.title || "game"}`,
      type: "success",
    });
    return project;
  }, [notify, openGameProject]);

  const handleOpenFromStudio = useCallback(async () => {
    if (!user || creatingProject) return;
    setCreatingProject(true);
    setStudioConnectHint(false);
    try {
      let status = null;
      try {
        status = await getStudioStatus();
      } catch (_) {
        status = null;
      }
      const identity = resolveGameIdentityFromStudioStatus(status || {});
      if (identity.status === "needs_connect") {
        setStudioConnectHint(true);
        setShowGamePicker(true);
        setStudioGameOptions([]);
        notify({
          message: "Connect Roblox Studio (MCP or plugin) to open the game you’re working on.",
          type: "error",
        });
        return;
      }
      if (identity.status === "needs_selection") {
        setShowGamePicker(true);
        setStudioGameOptions(identity.options || []);
        return;
      }
      await adoptIdentity(identity);
    } catch (err) {
      notify({
        message: err?.message || "Could not open game from Studio",
        type: "error",
      });
    } finally {
      setCreatingProject(false);
    }
  }, [adoptIdentity, creatingProject, notify, user]);

  const handleSelectStudioGame = useCallback(async (option) => {
    if (!user || creatingProject || !option) return;
    setCreatingProject(true);
    try {
      const title = resolveGameTitleFromTarget(option);
      await adoptIdentity({
        title,
        placeId: option.placeId && option.placeId !== "0" ? option.placeId : null,
        universeId: option.universeId || null,
        studioTargetId: option.studioTargetId || option.id,
        studioTargetLabel: option.label || title,
        source: "studio",
        target: option,
      });
    } catch (err) {
      notify({
        message: err?.message || "Could not open that game",
        type: "error",
      });
    } finally {
      setCreatingProject(false);
    }
  }, [adoptIdentity, creatingProject, notify, user]);

  const handleRenameChatCommit = useCallback(
    async (id, title) => {
      if (!user) return;
      const t = (title || "").trim();
      if (!t) return;
      const db = getFirestore();
      await updateDoc(doc(db, "users", user.uid, "chats", id), {
        title: t,
        updatedAt: serverTimestamp(),
      });
    },
    [user]
  );

  const handleDeleteChatConfirm = useCallback(async () => {
    if (!deleteChatId) return;
    if (activeAgentStatusByChat[deleteChatId]) {
      notify({
        message: "Cancel this chat's active runs before deleting it.",
        type: "info",
      });
      return;
    }
    setChatDeleteLoading(true);
    try {
      await onDeleteChat(deleteChatId);
      setDeleteChatId(null);
    } finally {
      setChatDeleteLoading(false);
    }
  }, [activeAgentStatusByChat, deleteChatId, notify, onDeleteChat]);

  const handleOpenChat = useCallback(
    (chatId) => {
      if (typeof onSelectChat === "function") {
        onSelectChat(chatId);
      } else {
        emitAiEvent(AI_EVENTS.OPEN_CHAT, { id: chatId });
      }
      if (isMobile && typeof onSelect === "function") onSelect();
    },
    [isMobile, onSelect, onSelectChat]
  );

  // --- Chronological Grouping Logic ---
  const groupItemsByDate = useCallback((items) => {
    const groups = {
      Today: [],
      Yesterday: [],
      Older: []
    };
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = today - 86400000;

    items.forEach(item => {
      const date = Number(item.updatedAt || item.createdAt || 0);
      if (date >= today) groups.Today.push(item);
      else if (date >= yesterday) groups.Yesterday.push(item);
      else groups.Older.push(item);
    });

    return Object.entries(groups).filter(([_, list]) => list.length > 0);
  }, []);

  return (
    <div className="flex flex-col h-full bg-[#050505]/50 backdrop-blur-xl">
      {/* 1. Active Context Header */}
      <div className="p-4 border-b border-white/5">
        <button 
          onClick={onOpenGameContext}
          className="w-full p-4 rounded-2xl bg-gradient-to-br from-gray-900 to-black border border-white/5 hover:border-[#00f5d4]/30 transition-all group text-left relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <Gamepad2 className="w-12 h-12 text-[#00f5d4]" />
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2 h-2 rounded-full animate-pulse ${gameProfile?.enabled ? 'bg-[#00f5d4] shadow-[0_0_8px_#00f5d4]' : 'bg-gray-600'}`} />
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                {gameProfile?.enabled ? 'Active System' : 'System Disabled'}
              </span>
            </div>
            
            <div className={`font-bold text-sm mb-1 truncate ${gameProfile?.enabled ? 'text-white' : 'text-gray-500'}`}>
              {gameProfile?.genre || "No Genre Set"} • {gameProfile?.theme || "No Theme"}
            </div>
            
            <div className="flex flex-wrap gap-1">
              {(gameProfile?.platforms || []).slice(0, 2).map(p => (
                <span key={p} className="px-1.5 py-0.5 rounded bg-white/5 text-[9px] text-gray-400 uppercase font-bold border border-white/5">
                  {p}
                </span>
              ))}
              {gameProfile?.platforms?.length > 2 && (
                <span className="text-[9px] text-gray-500 font-bold">+{gameProfile.platforms.length - 2}</span>
              )}
            </div>
          </div>
        </button>

      {/* 2. Unified Primary Action Button */}
      <button
        onClick={() => {
          handleCreateChatLocal();
          setActiveTab("chats");
        }}
        className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-black font-bold text-sm flex items-center justify-center gap-2 shadow-lg hover:shadow-[#00f5d4]/20 transition-all active:scale-[0.98]"
      >
        <Plus className="w-4 h-4" />
        New Chat Session
      </button>

      {/* Subtle Team Upgrade for Pro Users */}
      {!isPremium && (
        <div className="mt-4 px-2">
          <a 
            href="/subscribe" 
            className="flex items-center justify-center gap-2 py-2 rounded-xl bg-[#9b5de5]/10 border border-[#9b5de5]/20 text-[#9b5de5] text-[10px] font-black uppercase tracking-widest hover:bg-[#9b5de5]/20 transition-all"
          >
            <Zap className="w-3 h-3 fill-current" />
            Upgrade to Pro
          </a>
        </div>
      )}
      
      {entitlements?.includes("pro") && !entitlements?.includes("team") && (
        <div className="mt-4 px-2">
          <a 
            href="/subscribe" 
            className="flex items-center justify-center gap-2 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-500 text-[10px] font-black uppercase tracking-widest hover:text-white hover:bg-white/10 transition-all"
          >
            <Users className="w-3 h-3" />
            Explore Team Seats
          </a>
        </div>
      )}
      </div>

      {/* 3. Modern Pill Navigation */}
      <div className="px-4 py-3">
        <div className="flex bg-gray-900/50 border border-white/5 rounded-2xl p-1" role="tablist">
          <SidebarTab
            label="History"
            active={activeTab === "chats" || activeTab === "scripts"}
            onClick={() => setActiveTab("chats")}
            icon={MessageSquare}
          />
          <SidebarTab
            label="Library"
            active={activeTab === "saved"}
            onClick={() => setActiveTab("saved")}
            icon={Bookmark}
          />
        </div>
      </div>

      <div className="flex-grow overflow-y-auto px-4 pb-4 scrollbar-hide">
        {activeTab === "scripts" && (
          <div className="space-y-6">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500 group-focus-within:text-[#00f5d4] transition-colors" />
              <input
                className="w-full rounded-xl bg-white/[0.03] border border-white/5 px-9 py-2 text-xs text-white outline-none focus:border-[#00f5d4]/30 focus:bg-white/[0.05] transition-all"
                placeholder="Search scripts..."
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
              />
            </div>

            <div className="space-y-6">
              {chatScripts.length === 0 ? (
                <div className="text-center py-8 px-4 rounded-2xl bg-white/[0.02] border border-dashed border-white/5">
                  <Layout className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">No scripts in this chat yet.</p>
                </div>
              ) : (
                groupItemsByDate(filteredScripts).map(([group, items]) => (
                  <div key={group} className="space-y-2">
                    <div className="flex items-center gap-2 px-1">
                      <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">{group}</span>
                      <div className="h-px flex-1 bg-white/5" />
                    </div>
                    <div className="space-y-1">
                      {items.map((script) => (
                        <ScriptRow
                          key={script.id}
                          script={script}
                          isSelected={currentScriptId === script.id}
                          onSelect={() => handleScriptSelect(script.id)}
                          onRename={(id, title) => {
                            setRenamingScriptId(id);
                            setRenameScriptTitle(title);
                          }}
                          onDelete={async (id) => {
                            await handleDeleteScript(id);
                            if (currentScriptId === id) {
                              setCurrentScriptId(null);
                            }
                          }}
                          renaming={renamingScriptId === script.id}
                          renameValue={renameScriptTitle}
                          setRenameValue={setRenameScriptTitle}
                          onRenameCommit={async (id, title) => {
                            await handleRenameScript(id, title);
                            setRenamingScriptId(null);
                          }}
                          onRenameCancel={() => setRenamingScriptId(null)}
                        />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Versions section */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-lg text-[#00f5d4]">Versions</span>
              </div>
              {(!versionHistory || versionHistory.length === 0) && (
                <div className="text-gray-400 text-sm">
                  No versions for this script yet.
                </div>
              )}
              <div className="space-y-2">
                {(versionHistory ?? []).map((ver) => {
                  const version = getVersionStr(ver);
                  const isSelected = selectedVersionId === version || selectedVersionId === ver.id;

                  return (
                    <button
                      key={ver.id}
                      className={`w-full flex items-center justify-between px-3 py-2 border-b border-gray-800 last:border-b-0 rounded text-left group ${
                        isSelected ? "bg-gray-800/60 border-[#00f5d4]" : "bg-gray-900/40 border-gray-700"
                      }`}
                      onClick={() => {
                        emitAiEvent(AI_EVENTS.OPEN_CODE_DRAWER, {
                          scriptId: currentScriptId,
                          code: ver.code,
                          title: ver.title || currentScript?.title || "Script",
                          versionNumber: ver.versionNumber || getVersionStr(ver),
                          explanation: ver.explanation || "",
                        });
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white truncate block">
                            {ver.title || currentScript?.title || "Script"}
                          </span>
                          <span className="inline-block px-2 py-0.5 rounded bg-[#9b5de5]/20 text-[#9b5de5] text-xs font-semibold ml-2">
                            v{version}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400">
                          {ver.createdAt ? new Date(ver.createdAt).toLocaleString() : ""}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === "chats" && (
          <div className="space-y-6">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500 group-focus-within:text-[#9b5de5] transition-colors" />
              <input
                className="w-full rounded-xl bg-white/[0.03] border border-white/5 px-9 py-2 text-xs text-white outline-none focus:border-[#9b5de5]/30 focus:bg-white/[0.05] transition-all"
                placeholder="Search chats..."
                value={chatSearch}
                onChange={(e) => setChatSearch(e.target.value)}
              />
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 px-1">
                  <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Games</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (showGamePicker) {
                        setShowGamePicker(false);
                        setStudioGameOptions([]);
                        setStudioConnectHint(false);
                        return;
                      }
                      handleOpenFromStudio();
                    }}
                    className="text-[10px] font-bold uppercase tracking-wider text-[var(--ds-accent)] hover:text-white"
                    disabled={creatingProject}
                  >
                    {showGamePicker ? "Cancel" : "Open from Studio"}
                  </button>
                </div>

                {showGamePicker && (
                  <div className="rounded-xl border border-white/10 bg-black/30 p-2.5 space-y-2">
                    {studioConnectHint ? (
                      <EmptyState
                        icon={Link2}
                        title="Connect Studio"
                        description="Pair MCP or the Nexus plugin, then open the place you’re editing. The game name becomes your project."
                        action={(
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={creatingProject}
                            onClick={handleOpenFromStudio}
                            icon={creatingProject ? Loader2 : MapPin}
                          >
                            {creatingProject ? "Checking…" : "Retry Studio"}
                          </Button>
                        )}
                      />
                    ) : studioGameOptions.length > 0 ? (
                      <>
                        <p className="px-1 text-[10px] text-gray-500">
                          Choose the Studio place to work on:
                        </p>
                        <div className="space-y-1">
                          {studioGameOptions.map((option) => (
                            <ListItem
                              key={option.id || option.studioTargetId}
                              selected={false}
                              title={resolveGameTitleFromTarget(option)}
                              subtitle={option.placeId && option.placeId !== "0" ? `Place ${option.placeId}` : "Untitled place"}
                              disabled={creatingProject}
                              onClick={() => handleSelectStudioGame(option)}
                              right={creatingProject ? <Loader2 className="h-3.5 w-3.5 motion-safe:animate-spin text-[var(--ds-info)]" /> : <MapPin className="h-3.5 w-3.5 text-gray-600" />}
                            />
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center gap-2 px-2 py-2 text-[11px] text-gray-500">
                        <Loader2 className="h-3.5 w-3.5 motion-safe:animate-spin" />
                        Looking for Studio games…
                      </div>
                    )}
                  </div>
                )}

                <Button
                  size="sm"
                  variant="primary"
                  className="w-full"
                  disabled={creatingProject || !user}
                  onClick={handleOpenFromStudio}
                  icon={creatingProject ? Loader2 : Gamepad2}
                >
                  {creatingProject ? "Opening…" : "Work on this game"}
                </Button>

                <div className="space-y-1">
                  {projectsLoading && projects.length === 0 ? (
                    <div className="px-2 py-2 text-[11px] text-gray-500">Loading games…</div>
                  ) : projects.length === 0 ? (
                    <EmptyState
                      icon={Gamepad2}
                      title="No games yet"
                      description="Open from Studio to create a project named after the experience you’re building."
                    />
                  ) : (
                    projects.map((project) => (
                      <ListItem
                        key={project.projectId}
                        selected={selectedProjectId === project.projectId}
                        title={project.title}
                        subtitle={
                          project.studioTargetLabel && project.studioTargetLabel !== project.title
                            ? project.studioTargetLabel
                            : (project.placeId ? `Place ${project.placeId}` : null)
                        }
                        onClick={() => setSelectedProjectId(project.projectId)}
                        right={project.status === "verified" ? <Badge tone="accent">Live</Badge> : null}
                      />
                    ))
                  )}
                </div>
              </div>

              {/* New conversation: explicit when no chat selected */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                    {selectedProject ? selectedProject.title : "Current"}
                  </span>
                  <div className="h-px flex-1 bg-white/5" />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleCreateChatLocal();
                    setActiveTab("chats");
                  }}
                  className={`w-full py-2.5 px-3 rounded-xl text-left flex items-center gap-3 transition-all ${
                    currentChatId === null
                      ? "bg-[#00f5d4]/10 border border-[#00f5d4]/30 text-white"
                      : "bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-white/10 text-gray-400 hover:text-white"
                  }`}
                >
                  <Plus className="w-4 h-4 shrink-0 text-[#00f5d4]" />
                  <span className="text-xs font-bold truncate">
                    {selectedProjectId ? "New conversation" : "Select a game to chat"}
                  </span>
                </button>
              </div>

              {hiddenChatCount > 0 && (
                <div className="mb-3 rounded-xl border border-[#00f5d4]/20 bg-[#00f5d4]/5 px-3 py-2 text-[10px] text-gray-400 leading-relaxed">
                  {hiddenChatCount} older chat{hiddenChatCount === 1 ? "" : "s"} hidden on Free.
                  {" "}
                  <a href="/subscribe?highlight=starter" className="text-[#00f5d4] font-bold underline">
                    Upgrade to Starter
                  </a>
                  {" "}
                  for 30-day history.
                </div>
              )}

              {chats.length === 0 ? (
                <div className="text-center py-8 px-4 rounded-2xl bg-white/[0.02] border border-dashed border-white/5">
                  <MessageSquare className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">No chat history yet.</p>
                </div>
              ) : (
                <>
                  {groupItemsByDate(filteredChats.slice(0, 5)).map(([group, items]) => (
                    <div key={group} className="space-y-2">
                      <div className="flex items-center gap-2 px-1">
                        <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">{group}</span>
                        <div className="h-px flex-1 bg-white/5" />
                      </div>
                      <div className="space-y-1">
                        {items.map((c) => (
                          <ChatRow
                            key={c.id}
                            chat={c}
                            currentChatId={currentChatId}
                            isGenerating={generatingChatIds?.includes(c.id)}
                            agentStatus={activeAgentStatusByChat[c.id] || null}
                            onOpenChat={handleOpenChat}
                            renamingChatId={renamingChatId}
                            renameChatTitle={renameChatTitle}
                            setRenameChatTitle={setRenameChatTitle}
                            onRenameStart={(id, title) => {
                              setRenamingChatId(id);
                              setRenameChatTitle(title);
                            }}
                            onRenameCommit={async (id, title) => {
                              await handleRenameChatCommit(id, title);
                              setRenamingChatId(null);
                            }}
                            onRenameCancel={() => setRenamingChatId(null)}
                            onDeleteClick={setDeleteChatId}
                          />
                        ))}
                      </div>
                    </div>
                  ))}

                  {filteredChats.length > 5 && (
                    <button
                      onClick={() => setShowChatHistoryModal(true)}
                      className="w-full py-3 px-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-all group flex items-center justify-between"
                    >
                      <span className="text-xs font-bold text-gray-400 group-hover:text-white transition-colors">
                        Load More History
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-[#9b5de5] transition-all group-hover:translate-x-0.5" />
                    </button>
                  )}
                </>
              )}
            </div>

            <ChatHistoryModal
              isOpen={showChatHistoryModal}
              onClose={() => setShowChatHistoryModal(false)}
              chats={filteredChats}
              currentChatId={currentChatId}
              onOpenChat={handleOpenChat}
              renamingChatId={renamingChatId}
              renameChatTitle={renameChatTitle}
              setRenameChatTitle={setRenameChatTitle}
              onRenameStart={(id, title) => {
                setRenamingChatId(id);
                setRenameChatTitle(title);
              }}
              onRenameCommit={async (id, title) => {
                await handleRenameChatCommit(id, title);
                setRenamingChatId(null);
              }}
              onRenameCancel={() => setRenamingChatId(null)}
              onDeleteClick={setDeleteChatId}
              activeAgentStatusByChat={activeAgentStatusByChat}
            />

            {/* Delete Chat Modal */}
            {deleteChatId && (
              <Modal onClose={() => setDeleteChatId(null)} title="Delete Chat">
                <div className="mb-4 text-gray-200">
                  {activeAgentStatusByChat[deleteChatId]
                    ? "This chat still has an active agent. Cancel its runs before deleting the chat."
                    : "Are you sure you want to delete this chat? This cannot be undone."}
                </div>
                <div className="flex gap-2">
                  <button
                    className="flex-1 py-2 rounded bg-red-600 text-white font-bold disabled:opacity-60"
                    onClick={handleDeleteChatConfirm}
                    disabled={chatDeleteLoading || Boolean(activeAgentStatusByChat[deleteChatId])}
                  >
                    {chatDeleteLoading ? "Deleting..." : "Delete"}
                  </button>
                  <button
                    className="flex-1 py-2 rounded bg-gray-700 text-gray-200 font-bold"
                    onClick={() => setDeleteChatId(null)}
                    disabled={chatDeleteLoading}
                  >
                    Cancel
                  </button>
                </div>
              </Modal>
            )}
          </div>
        )}

        {activeTab === "saved" && (
          <div className="space-y-6">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500 group-focus-within:text-[#00f5d4] transition-colors" />
              <input
                className="w-full rounded-xl bg-white/[0.03] border border-white/5 px-9 py-2 text-xs text-white outline-none focus:border-[#00f5d4]/30 focus:bg-white/[0.05] transition-all"
                placeholder="Search library..."
                value={savedSearch}
                onChange={(e) => setSavedSearch(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              {scripts.length === 0 ? (
                <div className="text-center py-8 px-4 rounded-2xl bg-white/[0.02] border border-dashed border-white/5">
                  <FileCode className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">Your library is empty.</p>
                </div>
              ) : (
                scripts
                  .filter(s => !savedSearch || (s.title || "").toLowerCase().includes(savedSearch.toLowerCase()))
                  .map((script) => (
                  <div
                    key={script.id}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300 text-left group cursor-pointer"
                    onClick={() => handleScriptSelect(script.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-sm text-gray-300 group-hover:text-white truncate">
                          {script.title || "Untitled Script"}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          {script.type || 'logic'} • {fromNow(script.updatedAt)}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-700 group-hover:text-white transition-colors" />
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
