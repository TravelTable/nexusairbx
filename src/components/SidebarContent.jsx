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
  ChevronRight,
  FileCode,
} from "lucide-react";
import SidebarTab from "./SidebarTab";
import Modal from "./Modal";
import ScriptRow from "./sidebar/ScriptRow";
import ChatRow from "./sidebar/ChatRow";
import ChatHistoryModal from "./sidebar/ChatHistoryModal";
import NotificationToast from "./sidebar/NotificationToast";
import {
  getVersionStr,
  fromNow,
} from "../lib/sidebarUtils";
import {
  getFirestore,
  doc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useAiLibrary } from "../hooks/useAiLibrary";

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
  user = null,
}) {
  // --- Library Data ---
  const { chats } = useAiLibrary(user);

  // --- State ---
  const [notification, setNotification] = useState(null);
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
    return filtered
      .slice()
      .sort((a, b) => {
        const au = Number(a.updatedAt || a.createdAt || 0) || 0;
        const bu = Number(b.updatedAt || b.createdAt || 0) || 0;
        return bu - au;
      });
  }, [chats, deferredChatSearch]);

  // --- Handlers ---
  const handleScriptSelect = useCallback(
    (scriptId) => {
      setCurrentScriptId(scriptId);
      window.dispatchEvent(
        new CustomEvent("nexus:openCodeDrawer", { detail: { scriptId } })
      );
      if (isMobile && typeof onSelect === "function") onSelect();
    },
    [isMobile, setCurrentScriptId, onSelect]
  );

  const handleCreateChatLocal = useCallback(() => {
    window.dispatchEvent(new CustomEvent("nexus:startDraft"));
    if (isMobile && typeof onSelect === "function") onSelect();
  }, [isMobile, onSelect]);

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
    if (!user || !deleteChatId) return;
    setChatDeleteLoading(true);
    const db = getFirestore();
    await deleteDoc(doc(db, "users", user.uid, "chats", deleteChatId));
    setChatDeleteLoading(false);
    setDeleteChatId(null);
  }, [user, deleteChatId]);

  const handleOpenChat = useCallback(
    (chatId) => {
      if (typeof onSelectChat === "function") {
        onSelectChat(chatId);
      } else {
        window.dispatchEvent(
          new CustomEvent("nexus:openChat", { detail: { id: chatId } })
        );
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
              <div className="w-2 h-2 rounded-full bg-[#00f5d4] animate-pulse shadow-[0_0_8px_#00f5d4]" />
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Active System</span>
            </div>
            
            <div className="font-bold text-white text-sm mb-1 truncate">
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
                        window.dispatchEvent(
                          new CustomEvent("nexus:openCodeDrawer", {
                            detail: {
                              scriptId: currentScriptId,
                              code: ver.code,
                              title: ver.title || currentScript?.title || "Script",
                              versionNumber: ver.versionNumber || getVersionStr(ver),
                              explanation: ver.explanation || "",
                            },
                          })
                        );
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
            />

            {/* Delete Chat Modal */}
            {deleteChatId && (
              <Modal onClose={() => setDeleteChatId(null)} title="Delete Chat">
                <div className="mb-4 text-gray-200">
                  Are you sure you want to delete this chat? This cannot be undone.
                </div>
                <div className="flex gap-2">
                  <button
                    className="flex-1 py-2 rounded bg-red-600 text-white font-bold disabled:opacity-60"
                    onClick={handleDeleteChatConfirm}
                    disabled={chatDeleteLoading}
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

      {/* NotificationToast for upgrade nudges */}
      <NotificationToast
        open={!!notification}
        message={notification?.message}
        cta={notification?.cta}
        onCta={notification?.onCta}
        onClose={() => setNotification(null)}
      />
    </div>
  );
}
