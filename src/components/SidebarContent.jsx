import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  X,
  Plus,
  Edit,
  Trash2,
  Download,
  Eye,
  Search,
  Check,
  MessageCircle,
  Bookmark,
  BookmarkCheck,
} from "lucide-react";
import SidebarTab from "./SidebarTab";
import Modal from "./Modal";
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";

// Debug logs (safe to remove later)
console.log("SidebarTab:", SidebarTab);
console.log("Modal:", Modal);
console.log("Icons:", {
  X,
  Plus,
  Edit,
  Trash2,
  Download,
  Eye,
  Search,
  Check,
  MessageCircle,
  Bookmark,
});


// Utility: Firestore timestamp to JS Date (hardened)
const toJsDate = (ts) =>
  ts && typeof ts === "object" && typeof ts.seconds === "number"
    ? new Date(ts.seconds * 1000)
    : ts
    ? new Date(ts)
    : undefined;

// Utility: Safe filename for download
const safeFile = (t) =>
  (t || "Script")
    .replace(/[^a-zA-Z0-9_\- ]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 40) + ".lua";

// Utility: Stable key for versions (use id or fallback to v-version)
const keyFor = (v, i) => v.id ?? `v-${v.version ?? i}`;

// Utility: fromNow with Firestore timestamp support (hardened)
const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
const fromNow = (ts) => {
  if (!ts) return "—";
  const dt = toJsDate(ts);
  if (!dt) return "—";
  const d = +dt;
  if (!Number.isFinite(d)) return "—";
  const now = Date.now();
  const diff = d - now;
  const mins = Math.round(diff / 60000);
  if (isFinite(mins) && Math.abs(mins) < 60) return rtf.format(mins, "minute");
  const hrs = Math.round(diff / 3600000);
  if (isFinite(hrs) && Math.abs(hrs) < 24) return rtf.format(hrs, "hour");
  const days = Math.round(diff / 86400000);
  if (isFinite(days)) return rtf.format(days, "day");
  return "—";
};

// Generate a random id (for local use, but Firestore will use its own ids)
const generateId = () =>
  (typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`);

// --- SidebarContent component ---
export default function SidebarContent({
  activeTab,
  setActiveTab,
  handleClearChat,
  setPrompt,
  scripts = [],
  currentScriptId,
  setCurrentScriptId,
  handleCreateScript,
  handleRenameScript,
  handleDeleteScript,
  currentScript,
  versionHistory = [],
  onVersionView,
  onVersionDownload,
  promptSearch,
  setPromptSearch,
  isMobile,
  onSelect, // optional: parent can pass to close drawer on mobile
  onRenameChat,
  onDeleteChat,
}) {
  // Script management state
  const [showAddScriptModal, setShowAddScriptModal] = useState(false);
  const [newScriptTitle, setNewScriptTitle] = useState("");
  const [renamingScriptId, setRenamingScriptId] = useState(null);
  const [renameScriptTitle, setRenameScriptTitle] = useState("");
  const [deleteScriptId, setDeleteScriptId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Debounced search state
  const [localSearch, setLocalSearch] = useState(promptSearch || "");
  useEffect(() => setLocalSearch(promptSearch || ""), [promptSearch]);
  const debRef = useRef();

useEffect(() => {
  return () => {
    if (debRef?.current) clearTimeout(debRef.current);
  };
}, []);


  // --- Saved Scripts state ---
  const [savedScripts, setSavedScripts] = useState([]);
  const [savedSearch, setSavedSearch] = useState("");

  // Memoized filtered and sorted scripts (null-safe search, consistent sorting)
  const q = (promptSearch || "").toLowerCase();
  const filteredScripts = useMemo(() => {
    const list = Array.isArray(scripts) ? scripts : [];
    const filtered = q
      ? list.filter((s) => (s.title || "").toLowerCase().includes(q))
      : list;
    // Sort: latest updated first, fallback to createdAt, then title
    return filtered.slice().sort((a, b) => {
      const au = Number(+toJsDate(a.updatedAt)) || 0;
      const bu = Number(+toJsDate(b.updatedAt)) || 0;
      if (bu !== au) return bu - au;
      const ac = Number(+toJsDate(a.createdAt)) || 0;
      const bc = Number(+toJsDate(b.createdAt)) || 0;
      if (bc !== ac) return bc - ac;
      return (a.title || "").localeCompare(b.title || "");
    });
  }, [scripts, q]);

  // --- New Script Logic: clear selection and start a new script ---
  const handleNewScript = useCallback(() => {
    setCurrentScriptId(null); // Clear selection
    // Instead of creating a chat, just trigger a draft event
    window.dispatchEvent(new CustomEvent("nexus:startDraft"));
    if (isMobile && typeof onSelect === "function") onSelect();
  }, [setCurrentScriptId, isMobile, onSelect]);

  // --- Script Selection Logic: select script and load its version history ---
  const handleScriptSelect = useCallback(
    (scriptId) => {
      setCurrentScriptId(scriptId);
      if (isMobile && typeof onSelect === "function") {
        onSelect();
      }
    },
    [isMobile, setCurrentScriptId, onSelect]
  );

  // --- Debounced search input handler ---
  const handleSearchChange = (e) => {
    const v = e.target.value;
    setLocalSearch(v);
    clearTimeout(debRef.current);
    debRef.current = setTimeout(() => setPromptSearch(v), 150);
  };

  // --- Create Script Modal handler (parent-driven state, no local setCurrentScriptId) ---
  const handleCreateScriptClick = async () => {
    await handleCreateScript(newScriptTitle || "New Script");
    setShowAddScriptModal(false);
    setNewScriptTitle("");
    // Parent will setCurrentScriptId; no local override here.
  };

  // --- Confirm Delete Handler ---
  const handleDeleteScriptConfirm = async () => {
    setDeleteLoading(true);
    await handleDeleteScript(deleteScriptId);
    setDeleteLoading(false);
    setDeleteScriptId(null);
    if (currentScriptId === deleteScriptId) {
      setCurrentScriptId(null); // Clear selection if deleted
    }
  };

  
  // --- Memoized callbacks for version actions ---
  const memoOnVersionView = useCallback(
    (ver) => onVersionView && onVersionView(ver),
    [onVersionView]
  );
  const memoOnVersionDownload = useCallback(
    (ver) => onVersionDownload && onVersionDownload(ver),
    [onVersionDownload]
  );

  // --- Empty state skeleton shimmer ---
  const renderSkeleton = () => (
    <div className="animate-pulse flex items-center justify-between px-3 py-2 rounded-lg border border-gray-700 bg-gray-900/40">
      <div className="flex-1 min-w-0">
        <div className="h-4 bg-gray-700 rounded w-24 mb-1"></div>
        <div className="h-3 bg-gray-800 rounded w-16"></div>
      </div>
      <div className="flex items-center gap-1 ml-2">
        <div className="h-4 w-4 bg-gray-700 rounded"></div>
        <div className="h-4 w-4 bg-gray-700 rounded"></div>
      </div>
    </div>
  );

  // --- Chats state (Firestore) ---
  const [chats, setChats] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [chatSearch, setChatSearch] = useState("");
  const [renamingChatId, setRenamingChatId] = useState(null);
  const [renameChatTitle, setRenameChatTitle] = useState("");
  const [deleteChatId, setDeleteChatId] = useState(null);
  const [chatDeleteLoading, setChatDeleteLoading] = useState(false);

// Firestore: subscribe to chats for current user (READS)
useEffect(() => {
  const db = getFirestore();
  const auth = getAuth();
  let unsubSnapshot = null; // <-- plain JS, no TS annotation

  const unsubAuth = onAuthStateChanged(auth, (u) => {
    if (unsubSnapshot) { unsubSnapshot(); unsubSnapshot = null; }
    if (!u) { setChats([]); return; }

    const chatsRef = collection(db, "users", u.uid, "chats");
    const qChats = query(chatsRef, orderBy("updatedAt", "desc"));
    unsubSnapshot = onSnapshot(
      qChats,
      (snap) => {
        const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setChats(arr);
      },
      (err) => console.error("chats onSnapshot error:", err)
    );
  });

  return () => {
    if (unsubSnapshot) unsubSnapshot();
    unsubAuth();
  };
}, []);




  // Firestore: subscribe to saved scripts
useEffect(() => {
  const db = getFirestore();
  const auth = getAuth();
  let unsubSnapshot = null;

  const unsubAuth = onAuthStateChanged(auth, (u) => {
    if (unsubSnapshot) { unsubSnapshot(); unsubSnapshot = null; }
    if (!u) { setSavedScripts([]); return; }

    const savedRef = collection(db, "users", u.uid, "savedScripts");
    const qSaved = query(savedRef, orderBy("updatedAt", "desc"));
    unsubSnapshot = onSnapshot(qSaved, (snap) => {
      const arr = [];
      snap.forEach((docSnap) => arr.push({ id: docSnap.id, ...docSnap.data() }));
      setSavedScripts(arr);
    });

    // Listen for save events from ScriptLoadingBarContainer
    window.addEventListener("nexus:sidebarSaveScript", async (e) => {
      const { code, title, version, language } = e.detail || {};
      if (!code) return;
      // Save to Firestore savedScripts
      await addDoc(collection(db, "users", u.uid, "savedScripts"), {
        scriptId: null, // You can set this to the actual script/project id if available
        code,
        title: title || "Untitled",
        version: version || "",
        language: language || "lua",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
  });

  return () => {
    if (unsubSnapshot) unsubSnapshot();
    unsubAuth();
    window.removeEventListener("nexus:sidebarSaveScript", () => {});
  };
}, []);

// Writer: upsert chats on activity (KEEP ONLY THIS ONE)
useEffect(() => {
  const db = getFirestore();
  const auth = getAuth();

  const onActivity = async (e) => {
    const { id, title, lastMessage } = e.detail || {};
    const u = auth.currentUser;
    if (!id || !u) return;

    const chatRef = doc(db, "users", u.uid, "chats", id);
    const updates = {
      ...(title !== undefined ? { title: (title ?? "").trim() || "Untitled chat" } : {}),
      ...(lastMessage !== undefined ? { lastMessage } : {}),
      updatedAt: serverTimestamp(),
    };

    try {
      await updateDoc(chatRef, updates);
    } catch (err) {
      await setDoc(
        chatRef,
        {
          title: (title ?? "").trim() || "Untitled chat",
          lastMessage: lastMessage ?? "",
          createdAt: serverTimestamp(),
          ...updates,
        },
        { merge: true }
      );
    }
  };

  window.addEventListener("nexus:chatActivity", onActivity);
  return () => window.removeEventListener("nexus:chatActivity", onActivity);
}, []);


  // Derived: filtered/sorted chats
  const filteredChats = useMemo(() => {
    const list = Array.isArray(chats) ? chats : [];
    const q = chatSearch.trim().toLowerCase();
    const filtered = q
      ? list.filter(
          (c) =>
            (c.title || "").toLowerCase().includes(q) ||
            (c.lastMessage || "").toLowerCase().includes(q)
        )
      : list;
    return filtered.slice().sort((a, b) => {
      const au = Number(+toJsDate(a.updatedAt || a.createdAt || 0)) || 0;
      const bu = Number(+toJsDate(b.updatedAt || b.createdAt || 0)) || 0;
      return bu - au;
    });
  }, [chats, chatSearch]);

  // Which scripts are saved
  const savedIdSet = useMemo(() => {
    const s = new Set();
    for (const row of savedScripts) if (row.scriptId) s.add(row.scriptId);
    return s;
  }, [savedScripts]);

  // Filtered Saved Scripts list
  const filteredSavedScripts = useMemo(() => {
    const q = savedSearch.trim().toLowerCase();
    const list = Array.isArray(savedScripts) ? savedScripts : [];
    const filtered = q
      ? list.filter((s) => (s.title || "").toLowerCase().includes(q))
      : list;
    return filtered.slice().sort((a, b) => {
      const au = Number(+toJsDate(a.updatedAt || a.createdAt || 0)) || 0;
      const bu = Number(+toJsDate(b.updatedAt || b.createdAt || 0)) || 0;
      return bu - au;
    });
  }, [savedScripts, savedSearch]);

  // Handlers
  const handleCreateChatLocal = useCallback(() => {
    // no Firestore writes here — just tell the container to reset to a draft
    window.dispatchEvent(new CustomEvent("nexus:startDraft"));
    setSelectedChatId(null);
    if (isMobile && typeof onSelect === "function") onSelect();
  }, [isMobile, onSelect]);

const handleRenameChatCommit = useCallback(async (id, title) => {
  const t = (title || "").trim();
  if (!t) return;

  if (onRenameChat) {
    await onRenameChat(id, t);
    return;
  }

  const db = getFirestore();
  const auth = getAuth();
  if (!auth.currentUser) return;

  await updateDoc(doc(db, "users", auth.currentUser.uid, "chats", id), {
    title: t,
    updatedAt: serverTimestamp(),
  });
}, [onRenameChat]);

  const handleDeleteChatConfirm = useCallback(async () => {
    setChatDeleteLoading(true);
    if (onDeleteChat && deleteChatId) {
      await onDeleteChat(deleteChatId);
    }
    setChatDeleteLoading(false);
    if (selectedChatId === deleteChatId) setSelectedChatId(null);
    setDeleteChatId(null);
  }, [onDeleteChat, deleteChatId, selectedChatId]);

  const handleOpenChat = useCallback((chatId) => {
    setSelectedChatId(chatId);
    window.dispatchEvent(new CustomEvent("nexus:openChat", { detail: { id: chatId } }));
    if (isMobile && typeof onSelect === "function") onSelect();
  }, [isMobile, onSelect]);

  // Toggle save on a script from the Scripts tab
const handleToggleSaveScript = useCallback(async (script) => {
  if (!script || !script.id) return;
  const db = getFirestore();
  const auth = getAuth();
  if (!auth.currentUser) return;
  const userId = auth.currentUser.uid;

  const isSaved = savedIdSet.has(script.id);

  if (isSaved) {
    const match = savedScripts.find((s) => s.scriptId === script.id);
    if (!match) return;
    await deleteDoc(doc(db, "users", userId, "savedScripts", match.id));
  } else {
    await addDoc(collection(db, "users", userId, "savedScripts"), {
      scriptId: script.id,
      title: script.title || "Untitled",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}, [savedIdSet, savedScripts]);


  // Unsave directly from the Saved tab
  const handleUnsaveBySavedId = useCallback(async (savedDocId) => {
    const db = getFirestore();
    const auth = getAuth();
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    await deleteDoc(doc(db, "users", userId, "savedScripts", savedDocId));
  }, []);

  return (
    <>
      <div className="flex border-b border-gray-800" role="tablist" aria-label="Sidebar sections">
        <SidebarTab
          label="Scripts"
          active={activeTab === "scripts"}
          onClick={() => setActiveTab("scripts")}
          role="tab"
          aria-selected={activeTab === "scripts"}
          aria-controls="panel-scripts"
          id="tab-scripts"
          tabIndex={0}
        />
        <SidebarTab
          label="History"
          active={activeTab === "history"}
          onClick={() => setActiveTab("history")}
          role="tab"
          aria-selected={activeTab === "history"}
          aria-controls="panel-history"
          id="tab-history"
          tabIndex={0}
        />
        <SidebarTab
          label="Chats"
          active={activeTab === "chats"}
          onClick={() => setActiveTab("chats")}
          role="tab"
          aria-selected={activeTab === "chats"}
          aria-controls="panel-chats"
          id="tab-chats"
          tabIndex={0}
        />
        <SidebarTab
          label="Saved"
          active={activeTab === "saved"}
          onClick={() => setActiveTab("saved")}
          role="tab"
          aria-selected={activeTab === "saved"}
          aria-controls="panel-saved"
          id="tab-saved"
          tabIndex={0}
        />
      </div>
      <div className="flex-grow overflow-y-auto">
        {activeTab === "scripts" && (
          <div className="p-4" role="tabpanel" id="panel-scripts" aria-labelledby="tab-scripts">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-lg text-[#00f5d4]">Your Scripts</span>
              <button
                className="p-1 rounded hover:bg-gray-800 transition"
                title="New Script"
                onClick={handleNewScript}
                aria-label="Create new script"
              >
                <Plus className="h-5 w-5 text-[#9b5de5]" />
              </button>
            </div>
            {scripts.length === 0 && (
              <div className="text-gray-400 text-sm mb-2 flex items-center gap-2">
                No scripts yet.{" "}
                <button
                  className="ml-2 px-2 py-1 rounded bg-[#00f5d4] text-black font-bold text-xs"
                  onClick={handleNewScript}
                >
                  Create one
                </button>
              </div>
            )}
            <div className="mb-2 flex items-center gap-2">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                className="flex-1 rounded bg-gray-800 border border-gray-700 px-2 py-1 text-sm text-white"
                placeholder="Search scripts..."
                value={localSearch}
                onChange={handleSearchChange}
                aria-label="Search scripts"
              />
            </div>
            <div className="space-y-2">
              {scripts === undefined ? (
                <>
                  {renderSkeleton()}
                  {renderSkeleton()}
                </>
              ) : (filteredScripts ?? []).length === 0 && scripts.length > 0 ? (
                <div className="text-gray-400 text-sm flex items-center gap-2">
                  No scripts match your search.
                  <button
                    className="ml-2 px-2 py-1 rounded bg-[#00f5d4] text-black font-bold text-xs"
                    onClick={() => {
                      setPromptSearch("");
                      setLocalSearch("");
                    }}
                  >
                    Clear search
                  </button>
                </div>
              ) : (
                (filteredScripts ?? []).map((script) => (
                  <button
                    type="button"
                    key={script.id}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border ${
                      currentScriptId === script.id
                        ? "border-[#00f5d4] bg-gray-800/60"
                        : "border-gray-700 bg-gray-900/40"
                    } transition-colors text-left group`}
                    aria-pressed={currentScriptId === script.id}
                    tabIndex={0}
                    role="button"
                    aria-label={`Select script ${script.title || "Untitled"}`}
                    onClick={() => handleScriptSelect(script.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleScriptSelect(script.id);
                      }
                      if (e.key === "Delete") {
                        e.preventDefault();
                        setDeleteScriptId(script.id);
                      }
                      if (e.key === "F2") {
                        e.preventDefault();
                        setRenamingScriptId(script.id);
                        setRenameScriptTitle(script.title || "");
                      }
                    }}
                    title={`Select script\nF2: Rename • Delete: Delete`}
                  >
                    <div className="flex-1 min-w-0">
                      {renamingScriptId === script.id ? (
                        <input
                          className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white w-full"
                          value={renameScriptTitle}
                          onChange={(e) => setRenameScriptTitle(e.target.value)}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.stopPropagation();
                              if (renameScriptTitle.trim()) {
                                handleRenameScript(script.id, renameScriptTitle.trim());
                              }
                              setRenamingScriptId(null);
                            }
                            if (e.key === "Escape") {
                              e.stopPropagation();
                              setRenamingScriptId(null);
                            }
                          }}
                          onBlur={() => {
                            if (renameScriptTitle.trim()) handleRenameScript(renamingScriptId, renameScriptTitle.trim());
                            setRenamingScriptId(null);
                          }}
                          aria-label="Rename script"
                        />
                      ) : (
                        <span
                          className="font-semibold text-white truncate block max-w-[12rem] md:max-w-[16rem]"
                          title={script.title || "Untitled"}
                        >
                          {script.title || "Untitled"}
                        </span>
                      )}
                      <div className="text-xs text-gray-400">
                        {script.updatedAt && (
                          <span
                            title={toJsDate(script.updatedAt)?.toLocaleString()}
                          >
                            Last updated: {fromNow(script.updatedAt)}
                          </span>
                        )}
                        <span className="ml-2 text-[10px] text-gray-500 hidden group-hover:inline">
                          (F2: Rename • Delete: Delete)
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        className="p-1 rounded hover:bg-gray-700"
                        title={savedIdSet.has(script.id) ? "Unsave" : "Save"}
                        tabIndex={-1}
                        aria-label={savedIdSet.has(script.id) ? "Unsave script" : "Save script"}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleSaveScript(script);
                        }}
                      >
                        {savedIdSet.has(script.id)
                          ? <Bookmark className="h-4 w-4 text-[#00f5d4]" />
                          : <Bookmark className="h-4 w-4 text-gray-400" />}
                      </button>

                      {renamingScriptId === script.id ? (
                        <button
                          className="p-1 rounded hover:bg-gray-700"
                          title="Save"
                          tabIndex={-1}
                          aria-label="Save script name"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (renameScriptTitle.trim()) {
                              handleRenameScript(script.id, renameScriptTitle.trim());
                            }
                            setRenamingScriptId(null);
                          }}
                        >
                          <Check className="h-4 w-4 text-green-400" />
                        </button>
                      ) : (
                        <button
                          className="p-1 rounded hover:bg-gray-700"
                          title="Rename"
                          tabIndex={-1}
                          aria-label="Rename script"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenamingScriptId(script.id);
                            setRenameScriptTitle(script.title || "");
                          }}
                        >
                          <Edit className="h-4 w-4 text-gray-400" />
                        </button>
                      )}

                      <button
                        className="p-1 rounded hover:bg-gray-700"
                        title="Delete"
                        tabIndex={-1}
                        aria-label="Delete script"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteScriptId(script.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-gray-400" />
                      </button>
                    </div>
                  </button>
                ))
              )}
            </div>
            {/* Add Script Modal */}
            {showAddScriptModal && (
              <Modal
                onClose={() => setShowAddScriptModal(false)}
                title="Create New Script"
              >
                <div className="mb-4">
                  <input
                    className="w-full rounded bg-gray-800 border border-gray-700 px-2 py-2 text-white"
                    placeholder="Script title"
                    value={newScriptTitle}
                    onChange={(e) => setNewScriptTitle(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    className="flex-1 py-2 rounded bg-[#00f5d4] text-black font-bold"
                    onClick={handleCreateScriptClick}
                    disabled={!newScriptTitle.trim()}
                  >
                    Create
                  </button>
                  <button
                    className="flex-1 py-2 rounded bg-gray-700 text-gray-200 font-bold"
                    onClick={() => setShowAddScriptModal(false)}
                  >
                    Cancel
                  </button>
                </div>
              </Modal>
            )}
            {/* Delete Script Modal */}
            {deleteScriptId && (
              <Modal
                onClose={() => setDeleteScriptId(null)}
                title="Delete Script"
              >
                <div className="mb-4 text-gray-200">
                  Are you sure you want to delete this script? This cannot be undone.
                </div>
                <div className="flex gap-2">
                  <button
                    className="flex-1 py-2 rounded bg-red-600 text-white font-bold disabled:opacity-60"
                    onClick={handleDeleteScriptConfirm}
                    disabled={deleteLoading}
                  >
                    {deleteLoading ? "Deleting..." : "Delete"}
                  </button>
                  <button
                    className="flex-1 py-2 rounded bg-gray-700 text-gray-200 font-bold"
                    onClick={() => setDeleteScriptId(null)}
                    disabled={deleteLoading}
                  >
                    Cancel
                  </button>
                </div>
              </Modal>
            )}
          </div>
        )}

        

        {activeTab === "history" && (
          <div className="p-4" role="tabpanel" id="panel-history" aria-labelledby="tab-history">
            <button
              onClick={() => {
                if (window.confirm("Clear this conversation? This cannot be undone.")) {
                  handleClearChat();
                }
              }}
              className="w-full py-2 rounded-lg border border-gray-700 hover:bg-gray-800/50 transition-colors duration-300 text-gray-300 text-sm flex items-center justify-center focus:ring-2 focus:ring-[#9b5de5] outline-none"
              aria-label="Clear conversation"
            >
              <X className="h-4 w-4 mr-2" />
              Clear conversation
            </button>
            {/* Version History for Current Script */}
            <div className="mt-6">
<div className="flex items-center justify-between mb-2">
  <div className="flex items-center gap-2">
    <MessageCircle className="h-4 w-4 text-[#00f5d4]" />
    <span className="font-bold text-[#00f5d4]">Version History</span>
  </div>
  {currentScriptId && (
    <button
      className="p-1 rounded hover:bg-gray-800 transition"
      title={savedIdSet.has(currentScriptId) ? "Unsave script" : "Save script"}
      aria-label={savedIdSet.has(currentScriptId) ? "Unsave script" : "Save script"}
      onClick={() =>
        handleToggleSaveScript({
          id: currentScriptId,
          title: currentScript?.title || "Untitled",
        })
      }
    >
      {savedIdSet.has(currentScriptId) ? (
        <BookmarkCheck className="h-4 w-4 text-[#00f5d4]" />
      ) : (
        <Bookmark className="h-4 w-4 text-gray-400" />
      )}
    </button>
  )}
</div>
              {(!versionHistory || versionHistory.length === 0) && (
                <div className="text-gray-400 text-sm">
                  No versions for this script yet. Generate your first version by submitting a prompt on the AI Console.
                </div>
              )}
              <div className="space-y-2">
                {(versionHistory ?? []).map((ver, vIdx) => {
  const isSaved = savedIdSet.has(ver.id);
  return (
    <div
      key={keyFor(ver, vIdx)}
      className="flex items-center justify-between px-3 py-2 border-b border-gray-800 last:border-b-0 hover:bg-gray-800 transition-colors rounded"
    >
      <div className="flex flex-col flex-1 min-w-0">
        <span className="font-semibold text-[#00f5d4] truncate block max-w-[12rem] md:max-w-[16rem]" title={ver.title || "Untitled"}>
          {ver.title || "Untitled"}
        </span>
        <span className="text-xs text-gray-400" title={ver.createdAt ? toJsDate(ver.createdAt)?.toLocaleString() : undefined}>
          {ver.version ? `v${ver.version}` : ""}
          {ver.createdAt ? ` • ${fromNow(ver.createdAt)}` : ""}
        </span>
      </div>
      <div className="flex items-center gap-1 ml-2">
        <button
          className="p-1 rounded hover:bg-gray-700"
          title={isSaved ? "Unsave script" : "Save script"}
          aria-label={isSaved ? "Unsave script" : "Save script"}
          onClick={(e) => {
            e.stopPropagation();
            handleToggleSaveScript({
              id: ver.id,
              title: ver.title || "Untitled",
            });
          }}
        >
          {isSaved ? (
            <BookmarkCheck className="h-4 w-4 text-[#00f5d4]" />
          ) : (
            <Bookmark className="h-4 w-4 text-gray-400" />
          )}
        </button>
        <button
          className="p-1 rounded hover:bg-gray-700"
          title="View"
          aria-label="View version"
          onClick={(e) => {
            e.stopPropagation();
            memoOnVersionView(ver);
          }}
        >
          <Eye className="h-4 w-4 text-[#00f5d4]" />
        </button>
        <button
          className="p-1 rounded hover:bg-gray-700"
          title="Download"
          aria-label="Download version"
          onClick={(e) => {
            e.stopPropagation();
            memoOnVersionDownload(ver);
          }}
        >
          <Download className="h-4 w-4 text-gray-400" />
        </button>
      </div>
    </div>
  );
})}
              </div>
            </div>
          </div>
        )}

        {activeTab === "chats" && (
          <div className="p-4" role="tabpanel" id="panel-chats" aria-labelledby="tab-chats">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-lg text-[#00f5d4]">Your Chats</span>
              <button
                className="p-1 rounded hover:bg-gray-800 transition"
                title="New Chat"
                onClick={handleCreateChatLocal}
                aria-label="Create new chat"
              >
                <Plus className="h-5 w-5 text-[#9b5de5]" />
              </button>
            </div>

            {chats.length === 0 && (
              <div className="text-gray-400 text-sm mb-2 flex items-center gap-2">
                No chats yet.
                <button
                  className="ml-2 px-2 py-1 rounded bg-[#00f5d4] text-black font-bold text-xs"
                  onClick={handleCreateChatLocal}
                >
                  Start one
                </button>
              </div>
            )}

            <div className="mb-2 flex items-center gap-2">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                className="flex-1 rounded bg-gray-800 border border-gray-700 px-2 py-1 text-sm text-white"
                placeholder="Search chats…"
                value={chatSearch}
                onChange={(e) => setChatSearch(e.target.value)}
                aria-label="Search chats"
              />
            </div>

            <div className="space-y-2">
              {(filteredChats ?? []).map((chat) => (
                <button
                  type="button"
                  key={chat.id}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border ${
                    selectedChatId === chat.id
                      ? "border-[#00f5d4] bg-gray-800/60"
                      : "border-gray-700 bg-gray-900/40"
                  } transition-colors text-left group`}
                  aria-pressed={selectedChatId === chat.id}
                  tabIndex={0}
                  role="button"
                  aria-label={`Open chat ${chat.title || "Untitled chat"}`}
                  onClick={() => handleOpenChat(chat.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleOpenChat(chat.id);
                    }
                    if (e.key === "Delete") {
                      e.preventDefault();
                      setDeleteChatId(chat.id);
                    }
                    if (e.key === "F2") {
                      e.preventDefault();
                      setRenamingChatId(chat.id);
                      setRenameChatTitle(chat.title || "");
                    }
                  }}
                  title={`Open chat\nF2: Rename • Delete: Delete`}
                >
                  <div className="flex-1 min-w-0">
                    {renamingChatId === chat.id ? (
                      <input
                        className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white w-full"
                        value={renameChatTitle}
                        onChange={(e) => setRenameChatTitle(e.target.value)}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.stopPropagation();
                            handleRenameChatCommit(chat.id, renameChatTitle);
                            setRenamingChatId(null);
                          }
                          if (e.key === "Escape") {
                            e.stopPropagation();
                            setRenamingChatId(null);
                          }
                        }}
                        onBlur={() => {
                          handleRenameChatCommit(renamingChatId, renameChatTitle);
                          setRenamingChatId(null);
                        }}
                        aria-label="Rename chat"
                      />
                    ) : (
                      <span
                        className="font-semibold text-white truncate block max-w-[12rem] md:max-w-[16rem]"
                        title={chat.title || "Untitled chat"}
                      >
                        {chat.title || "Untitled chat"}
                      </span>
                    )}
                    <div className="text-xs text-gray-400">
                      {chat.updatedAt && (
                        <span title={toJsDate(chat.updatedAt)?.toLocaleString?.()}>
                          Updated {fromNow(chat.updatedAt)}
                        </span>
                      )}
                      {chat.lastMessage && (
                        <span className="ml-2 text-gray-500 truncate">
                          {chat.lastMessage}
                        </span>
                      )}
                      <span className="ml-2 text-[10px] text-gray-500 hidden group-hover:inline">
                        (F2: Rename • Delete: Delete)
                      </span>
                    </div>
                  </div>
<div className="flex items-center gap-1 ml-2">
  {renamingChatId === chat.id ? (
    <button
      className="p-1 rounded hover:bg-gray-700"
      title="Save"
      tabIndex={-1}
      aria-label="Save chat name"
      onClick={(e) => {
        e.stopPropagation();
        handleRenameChatCommit(chat.id, renameChatTitle);
        setRenamingChatId(null);
      }}
    >
      <Check className="h-4 w-4 text-green-400" />
    </button>
  ) : (
    <button
      className="p-1 rounded hover:bg-gray-700"
      title="Rename"
      tabIndex={-1}
      aria-label="Rename chat"
      onClick={(e) => {
        e.stopPropagation();
        setRenamingChatId(chat.id);
        setRenameChatTitle(chat.title || "");
      }}
    >
      <Edit className="h-4 w-4 text-gray-400" />
    </button>
  )}
  <button
    className="p-1 rounded hover:bg-gray-700"
    title="Delete"
    tabIndex={-1}
    aria-label="Delete chat"
    onClick={(e) => {
      e.stopPropagation();
      setDeleteChatId(chat.id);
    }}
  >
    <Trash2 className="h-4 w-4 text-gray-400" />
  </button>
</div>
                </button>
              ))}
            </div>

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
          <div className="p-4" role="tabpanel" id="panel-saved" aria-labelledby="tab-saved">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-lg text-[#00f5d4]">Saved Scripts</span>
            </div>

            {savedScripts.length === 0 && (
              <div className="text-gray-400 text-sm mb-2">
                You haven't saved any scripts yet. Open the Scripts tab and click the bookmark icon to save one.
              </div>
            )}

            <div className="mb-2 flex items-center gap-2">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                className="flex-1 rounded bg-gray-800 border border-gray-700 px-2 py-1 text-sm text-white"
                placeholder="Search saved scripts..."
                value={savedSearch}
                onChange={(e) => setSavedSearch(e.target.value)}
                aria-label="Search saved scripts"
              />
            </div>

<div className="space-y-2">
  {(filteredSavedScripts ?? []).map((row) => (
    <button
      type="button"
      key={row.id}
      className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-gray-700 bg-gray-900/40 transition-colors text-left group"
      onClick={async () => {
  if (row.scriptId) {
    let code = "";
    let title = row.title || "Untitled";
    let version = "";
    // Try to find in versionHistory first (if available)
    if (typeof window !== "undefined" && window.nexusVersionHistory && Array.isArray(window.nexusVersionHistory)) {
      const found = window.nexusVersionHistory.find(v => v.id === row.scriptId || v.projectId === row.scriptId);
      if (found) {
        code = found.code || "";
        title = found.title || title;
        version = found.version ? `v${found.version}` : "";
      }
    }
    // If not found, fetch from backend
    if (!code && typeof fetch !== "undefined") {
      try {
        // Try to get Firebase user from window or from firebase/auth
        let user = window.nexusCurrentUser;
        if (!user && window.firebase && window.firebase.auth) {
          user = window.firebase.auth().currentUser;
        }
        let idToken = "";
        if (user && user.getIdToken) {
          idToken = await user.getIdToken();
        }
        const res = await fetch(
          `${process.env.REACT_APP_BACKEND_URL || "https://nexusrbx-backend-production.up.railway.app"}/api/projects/${row.scriptId}/versions`,
          {
            headers: idToken ? { Authorization: `Bearer ${idToken}` } : {},
          }
        );
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.versions) && data.versions.length > 0) {
            const latest = data.versions[0];
            code = latest.code || "";
            title = latest.title || title;
            version = latest.version ? `v${latest.version}` : "";
          }
        }
      } catch (err) {
        // Optionally show error to user
        alert("Failed to load script code.");
      }
    }
    window.dispatchEvent(
      new CustomEvent("nexus:openCodeDrawer", {
        detail: {
          scriptId: row.scriptId,
          code,
          title,
          version,
        },
      })
    );
  }
}}
      title="Open saved script"
    >
      <div className="flex-1 min-w-0">
        <span
          className="font-semibold text-white truncate block max-w-[12rem] md:max-w-[16rem]"
          title={row.title || "Untitled"}
        >
          {row.title || "Untitled"}
        </span>
        <div className="text-xs text-gray-400">
          {row.updatedAt && (
            <span title={toJsDate(row.updatedAt)?.toLocaleString?.()}>
              Saved {fromNow(row.updatedAt)}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 ml-2">
        <button
          className="p-1 rounded hover:bg-gray-700"
          title="Unsave"
          tabIndex={-1}
          aria-label="Unsave script"
          onClick={(e) => {
            e.stopPropagation();
            handleUnsaveBySavedId(row.id);
          }}
        >
          <Bookmark className="h-4 w-4 text-[#00f5d4]" />
        </button>
      </div>
    </button>
  ))}
</div>
          </div>
        )}
      </div>
      <div className="mt-8 mb-8 flex flex-col items-center">
        <motion.div
          key="subscribe-bounce"
          initial={false}
          animate={{ y: [0, -40, 0] }}
          transition={{
            repeat: Infinity,
            repeatType: "loop",
            duration: 1.4,
            ease: "easeInOut"
          }}
          className="w-full flex justify-center"
        >
          {/* You can import and use SubscribeButtonInline here if needed */}
        </motion.div>
      </div>
    </>
  );
}