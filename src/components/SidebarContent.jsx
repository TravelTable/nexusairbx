import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
  useId,
  useDeferredValue,
} from "react";
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
  Lock,
  Gamepad2,
  Clock,
  Sparkles,
  MessageSquare,
  Layout,
  History,
  ChevronRight,
} from "lucide-react";
import SidebarTab from "./SidebarTab";
import Modal from "./Modal";
import ScriptRow from "./sidebar/ScriptRow";
import NotificationToast from "./sidebar/NotificationToast";
import {
  toMs,
  getVersionStr,
  keyForScript,
  fromNow,
} from "../lib/sidebarUtils";
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
  getDocs,
  limit,
  startAfter,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useBilling } from "../context/BillingContext";

// --- Toast Hook for Error Surfaces ---
function useToast() {
  const [toast, setToast] = useState(null);
  const show = (msg, opts = {}) => setToast({ msg, ...opts });
  const clear = () => setToast(null);
  return { toast, show, clear };
}

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
  handleCreateScript = () => {},
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
}) {
  // --- Billing ---
  const { plan, historyDays } = useBilling();

  // --- State ---
  const tabId = useId();

  // Script management state
  const [showAddScriptModal, setShowAddScriptModal] = useState(false);
  const [newScriptTitle, setNewScriptTitle] = useState("");
  const [renamingScriptId, setRenamingScriptId] = useState(null);
  const [renameScriptTitle, setRenameScriptTitle] = useState("");
  const [deleteScriptId, setDeleteScriptId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Debounced search state
  const [localSearch, setLocalSearch] = useState(promptSearch || "");
  const deferredSearch = useDeferredValue(localSearch);
  useEffect(() => setPromptSearch(deferredSearch), [deferredSearch, setPromptSearch]);
  useEffect(() => setLocalSearch(promptSearch || ""), [promptSearch]);

  // --- Saved Scripts state ---
  const [savedScripts, setSavedScripts] = useState([]);
  const [savedSearch, setSavedSearch] = useState("");
  const [savedErr, setSavedErr] = useState(null);

  // --- Chats state (Firestore) ---
  const [chats, setChats] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [chatSearch, setChatSearch] = useState("");
  const [renamingChatId, setRenamingChatId] = useState(null);
  const [renameChatTitle, setRenameChatTitle] = useState("");
  const [deleteChatId, setDeleteChatId] = useState(null);
  const [chatDeleteLoading, setChatDeleteLoading] = useState(false);
  const [chatCursor, setChatCursor] = useState(null);
  const [chatErr, setChatErr] = useState(null);

  useEffect(() => {
    setSelectedChatId(currentChatId);
  }, [currentChatId]);

  // --- Toast for errors and notification ---
  const { toast, show: showToast, clear: clearToast } = useToast();

  // --- NotificationToast for upgrade nudges ---
  const [notification, setNotification] = useState(null);

  // --- Firestore: subscribe to chats for current user (paginated) ---
  useEffect(() => {
    const db = getFirestore();
    const auth = getAuth();
    let unsubSnapshot = null;
    let unsubAuth = null;

    unsubAuth = onAuthStateChanged(auth, (u) => {
      if (unsubSnapshot) {
        unsubSnapshot();
        unsubSnapshot = null;
      }
      if (!u) {
        setChats([]);
        setChatCursor(null);
        return;
      }

      let qRef = query(
        collection(db, "users", u.uid, "chats"),
        orderBy("updatedAt", "desc"),
        limit(50),
        ...(chatCursor ? [startAfter(chatCursor)] : [])
      );

      unsubSnapshot = onSnapshot(
        qRef,
        (snap) => {
          const arr = snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
            updatedAt: toMs(d.data().updatedAt),
            createdAt: toMs(d.data().createdAt),
          }));
          setChats(arr);
          setChatCursor(snap.docs[snap.docs.length - 1]);
        },
        (err) => setChatErr(err.message)
      );
    });

    return () => {
      if (unsubSnapshot) unsubSnapshot();
      if (unsubAuth) unsubAuth();
    };
    // eslint-disable-next-line
  }, []);

  // --- Firestore: subscribe to saved scripts (event-listener leak fixed) ---
  useEffect(() => {
    const db = getFirestore();
    const auth = getAuth();
    let unsubSnapshot = null;
    let handler = null;
    let unsubAuth = null;

    unsubAuth = onAuthStateChanged(auth, (u) => {
      if (unsubSnapshot) {
        unsubSnapshot();
        unsubSnapshot = null;
      }
      if (handler) {
        window.removeEventListener("nexus:sidebarSaveScript", handler);
        handler = null;
      }
      if (!u) {
        setSavedScripts([]);
        return;
      }

      const savedRef = collection(db, "users", u.uid, "savedScripts");
      const qSaved = query(savedRef, orderBy("updatedAt", "desc"));
      unsubSnapshot = onSnapshot(
        qSaved,
        (snap) => {
          const arr = [];
          snap.forEach((docSnap) =>
            arr.push({
              id: docSnap.id,
              ...docSnap.data(),
              updatedAt: toMs(docSnap.data().updatedAt),
              createdAt: toMs(docSnap.data().createdAt),
              versionNumber: getVersionStr(docSnap.data()),
            })
          );
          setSavedScripts(arr);
        },
        (err) => setSavedErr(err.message)
      );

      handler = async (e) => {
        const { code, title, version, language, scriptId, chatId } = e.detail || {};
        if (!code) return;
        try {
          await addDoc(collection(db, "users", u.uid, "savedScripts"), {
            scriptId: scriptId ?? null,
            chatId: chatId ?? null,
            code,
            title: title || "Untitled",
            version: version || "",
            language: language || "lua",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          showToast("Failed to save script: " + err.message);
        }
      };
      window.addEventListener("nexus:sidebarSaveScript", handler);
    });

    return () => {
      if (unsubSnapshot) unsubSnapshot();
      if (unsubAuth) unsubAuth();
      if (handler) window.removeEventListener("nexus:sidebarSaveScript", handler);
    };
    // eslint-disable-next-line
  }, []);

  // --- Writer: upsert chats on activity ---
  useEffect(() => {
    const db = getFirestore();
    const auth = getAuth();

    const onActivity = async (e) => {
      const { id, title, lastMessage } = e.detail || {};
      const u = auth.currentUser;
      if (!id || !u) return;

      const chatRef = doc(db, "users", u.uid, "chats", id);
      const updates = {
        ...(title !== undefined
          ? { title: (title ?? "").trim() || "Untitled chat" }
          : {}),
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

  // --- Memoized filtered and sorted scripts (deferred search) ---
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
        const ac = Number(a.createdAt) || 0;
        const bc = Number(b.createdAt) || 0;
        if (bc !== ac) return bc - ac;
        return (a.title || "").localeCompare(b.title || "");
      });
  }, [chatScripts, deferredScriptSearch]);

  // --- Memoized filtered/sorted chats (deferred search) ---
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

  // --- Memoized filtered/sorted saved scripts (deferred search, unique per scriptId+versionNumber) ---
  const deferredSavedSearch = useDeferredValue(savedSearch.trim().toLowerCase());
  const filteredSavedScripts = useMemo(() => {
    const list = Array.isArray(savedScripts) ? savedScripts : [];
    const q = deferredSavedSearch;
    // Remove duplicates: only one per scriptId+versionNumber
    const uniqueMap = new Map();
    for (const s of list) {
      const key = `${s.scriptId}__${s.versionNumber || getVersionStr(s)}`;
      if (!uniqueMap.has(key)) uniqueMap.set(key, s);
    }
    const uniqueList = Array.from(uniqueMap.values());
    const filtered = q
      ? uniqueList.filter(
          (s) =>
            (s.title || "").toLowerCase().includes(q) ||
            getVersionStr(s).toLowerCase().includes(q)
        )
      : uniqueList;
    return filtered
      .slice()
      .sort((a, b) => {
        const au = Number(a.updatedAt || a.createdAt || 0) || 0;
        const bu = Number(b.updatedAt || b.createdAt || 0) || 0;
        if (bu !== au) return bu - au;
        const at = (a.title || "").localeCompare(b.title || "");
        if (at !== 0) return at;
        return getVersionStr(a).localeCompare(getVersionStr(b));
      });
  }, [savedScripts, deferredSavedSearch]);

  // --- Saved version set (single source of truth) ---
  const savedVersionSet = useMemo(() => {
    const s = new Set();
    for (const row of savedScripts) {
      if (row.scriptId) s.add(keyForScript(row));
    }
    return s;
  }, [savedScripts]);

  // --- Handlers ---
  const handleNewScript = useCallback(() => {
    setCurrentScriptId(null);
    window.dispatchEvent(new CustomEvent("nexus:startDraft"));
    if (isMobile && typeof onSelect === "function") onSelect();
  }, [setCurrentScriptId, isMobile, onSelect]);

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

  const handleCreateScriptClick = async () => {
    await handleCreateScript(newScriptTitle || "New Script");
    setShowAddScriptModal(false);
    setNewScriptTitle("");
  };

  const handleDeleteScriptConfirm = async () => {
    setDeleteLoading(true);
    await handleDeleteScript(deleteScriptId);
    setDeleteLoading(false);
    setDeleteScriptId(null);
    if (currentScriptId === deleteScriptId) {
      setCurrentScriptId(null);
    }
  };

  // --- Save/Unsave with version awareness ---
  const handleToggleSaveScript = useCallback(
    async (script) => {
      const db = getFirestore();
      const auth = getAuth();
      const u = auth.currentUser;
      if (!u) return;

      let versionNumber = script.versionNumber;
      if (!versionNumber && script.latestVersion) {
        versionNumber = script.latestVersion;
      }
      if (!versionNumber) versionNumber = 1;

      const versionStr = String(versionNumber);
      const key = `${script.id}__${versionNumber}`;
      const wasSaved = savedVersionSet.has(key);

      try {
        if (wasSaved) {
          const match = savedScripts.find(
            (s) =>
              s.scriptId === script.id &&
              (String(s.versionNumber) === versionStr || getVersionStr(s) === versionStr)
          );

          if (match) {
            await deleteDoc(doc(db, "users", u.uid, "savedScripts", match.id));
            showToast("Script unsaved.");
          } else {
            showToast("Could not find saved reference to delete.");
          }
        } else {
          await addDoc(collection(db, "users", u.uid, "savedScripts"), {
            scriptId: script.id,
            title: script.title || "Untitled",
            version: versionStr,
            versionNumber: Number(versionNumber),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          showToast("Script saved!");
        }
      } catch (err) {
        console.error(err);
        showToast("Failed to update saved status.");
        setSavedScripts((prev) => [...prev]);
      }
    },
    [savedVersionSet, savedScripts, showToast]
  );
  const handleUnsaveBySavedId = useCallback(
    async (savedDocId) => {
      const db = getFirestore();
      const auth = getAuth();
      if (!auth.currentUser) return;
      const userId = auth.currentUser.uid;
      try {
        await deleteDoc(doc(db, "users", userId, "savedScripts", savedDocId));
      } catch (err) {
        showToast("Failed to unsave script: " + err.message);
      }
    },
    [showToast]
  );

  const handleCreateChatLocal = useCallback(() => {
    window.dispatchEvent(new CustomEvent("nexus:startDraft"));
    setSelectedChatId(null);
    if (isMobile && typeof onSelect === "function") onSelect();
  }, [isMobile, onSelect]);

  const handleRenameChatCommit = useCallback(
    async (id, title) => {
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
    },
    [onRenameChat]
  );

  const handleDeleteChatConfirm = useCallback(async () => {
    setChatDeleteLoading(true);

    const db = getFirestore();
    const auth = getAuth();
    const userId = auth.currentUser?.uid;

    if (onDeleteChat && deleteChatId) {
      await onDeleteChat(deleteChatId);
    } else if (userId && deleteChatId) {
      await deleteDoc(doc(db, "users", userId, "chats", deleteChatId));
    }

    // Delete all scripts associated with this chat (but DO NOT delete savedScripts)
    if (userId && deleteChatId) {
      const scriptsRef = collection(db, "users", userId, "scripts");
      const scriptsQuery = query(scriptsRef);
      const scriptsSnap = await getDocs(scriptsQuery);
      const scriptIdsToDelete = [];
      scriptsSnap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.chatId === deleteChatId) {
          scriptIdsToDelete.push(docSnap.id);
        }
      });

      await Promise.all(
        scriptIdsToDelete.map((scriptId) =>
          deleteDoc(doc(db, "users", userId, "scripts", scriptId))
        )
      );
    }

    setChatDeleteLoading(false);
    if (selectedChatId === deleteChatId) setSelectedChatId(null);
    setDeleteChatId(null);
  }, [onDeleteChat, deleteChatId, selectedChatId, savedScripts]);

  const handleOpenChat = useCallback(
    (chatId) => {
      setSelectedChatId(chatId);
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

  // --- Keydown handler for list actions ---
  const scriptsContainerRef = useRef(null);
  useEffect(() => {
    const el = scriptsContainerRef.current;
    if (!el) return;
    const onKey = (e) => {
      const active = document.activeElement;
      if (!active || !el.contains(active)) return;
      const id = active.getAttribute("data-id");
      if (!id) return;
      if (e.key === "F2") {
        e.preventDefault();
        setRenamingScriptId(id);
        const script = filteredScripts.find((s) => s.id === id);
        setRenameScriptTitle(script?.title || "");
      }
      if (e.key === "Delete") {
        e.preventDefault();
        setDeleteScriptId(id);
      }
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [filteredScripts]);

  // --- Render skeleton shimmer ---
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

// --- Version History Filtering and Locking ---
// Only show info bar and lock history if plan is free and historyDays is set
const showHistoryInfoBar = plan === "free" && !!historyDays;
const lockHistory = plan === "free" && !!historyDays;

// Compute cutoff timestamp (ms)
const historyCutoffMs =
  historyDays && Number.isFinite(Number(historyDays))
    ? Date.now() - Number(historyDays) * 24 * 60 * 60 * 1000
    : null;

// Partition versionHistory into unlocked and locked
const versionHistoryWithLock = useMemo(() => {
  if (!Array.isArray(versionHistory)) return [];
  return versionHistory.map((ver) => {
    const createdAtMs = toMs(ver.createdAt);
    const isLocked =
      lockHistory && historyCutoffMs !== null && createdAtMs < historyCutoffMs;
    return { ...ver, isLocked, createdAtMs };
  });
}, [versionHistory, lockHistory, historyCutoffMs]);

  // --- Notification handler for locked history ---
  const handleLockedHistoryClick = useCallback(() => {
    setNotification({
      message: "Older history is a Pro feature.",
      cta: "Upgrade to view",
      onCta: () => {
        setNotification(null);
        window.location.href = "/subscribe";
      },
    });
  }, []);

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

  // --- Main Render ---
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
          onClick={activeTab === "chats" ? handleCreateChatLocal : handleNewScript}
          className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-black font-bold text-sm flex items-center justify-center gap-2 shadow-lg hover:shadow-[#00f5d4]/20 transition-all active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          {activeTab === "chats" ? "New Chat Session" : "Create New Script"}
        </button>
      </div>

      {/* 3. Modern Pill Navigation */}
      <div className="px-4 py-3">
        <div className="flex bg-gray-900/50 border border-white/5 rounded-2xl p-1" role="tablist">
          <SidebarTab
            label="Scripts"
            active={activeTab === "scripts"}
            onClick={() => setActiveTab("scripts")}
            icon={Layout}
          />
          <SidebarTab
            label="Chats"
            active={activeTab === "chats"}
            onClick={() => setActiveTab("chats")}
            icon={MessageSquare}
          />
          <SidebarTab
            label="Saved"
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

            <div ref={scriptsContainerRef} className="space-y-6">
              {scripts === undefined ? (
                <div className="space-y-2">{renderSkeleton()}{renderSkeleton()}</div>
              ) : chatScripts.length === 0 ? (
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
                          key={keyForScript(script)}
                          script={script}
                          isSelected={currentScriptId === script.id}
                          onSelect={() => handleScriptSelect(script.id)}
                          onRename={(id, title) => {
                            setRenamingScriptId(id);
                            setRenameScriptTitle(title);
                          }}
                          onDelete={setDeleteScriptId}
                          onToggleSave={handleToggleSaveScript}
                          isSaved={savedVersionSet.has(keyForScript(script))}
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
              {hasMoreScripts && !localSearch && (
                <button
                  onClick={onLoadMoreScripts}
                  className="w-full py-2 mt-2 text-xs font-bold text-[#00f5d4] border border-[#00f5d4]/30 rounded hover:bg-[#00f5d4]/10 transition-colors"
                >
                  Load More Scripts
                </button>
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

            {/* Versions section */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-lg text-[#00f5d4]">Versions</span>
              </div>
              {(!versionHistoryWithLock || versionHistoryWithLock.length === 0) && (
                <div className="text-gray-400 text-sm">
                  No versions for this script yet. Generate your first version by submitting a prompt on the AI Console.
                </div>
              )}
              <div className="space-y-2" aria-live="polite">
                {(versionHistoryWithLock ?? []).map((ver) => {
                  const version = getVersionStr(ver);
                  const saveKey = `${currentScriptId}__${version}`;
                  const isSaved = savedVersionSet.has(saveKey);
                  const isSelected =
                    selectedVersionId === version ||
                    selectedVersionId === ver.id ||
                    selectedVersionId === saveKey;

                  if (ver.isLocked) {
                    return (
                      <div
                        key={keyForScript({ ...ver, id: currentScriptId })}
                        className="w-full flex items-center justify-between px-3 py-2 border-b border-gray-800 last:border-b-0 rounded text-left group cursor-not-allowed opacity-60 bg-gray-900/60 relative"
                        title="Upgrade to view older history"
                      >
                        <div className="flex-1 min-w-0 flex items-center gap-2">
                          <Lock className="h-4 w-4 text-[#00f5d4]" />
                          <span className="font-semibold text-gray-300 truncate max-w-[14rem]">
                            Version {version} (locked)
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <span className="px-2 py-0.5 rounded bg-[#9b5de5]/20 text-[#9b5de5]">
                            Upgrade
                          </span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <button
                      key={keyForScript({ ...ver, id: currentScriptId })}
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
                              savedScriptId: `${currentScriptId}__${getVersionStr(ver)}`,
                            },
                          })
                        );
                      }}
                      aria-label={`Open version ${version}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white truncate block max-w-[10rem] md:max-w-[14rem]">
                            {ver.title || currentScript?.title || "Script"}
                          </span>
                          {version && (
                            <span className="inline-block px-2 py-0.5 rounded bg-[#9b5de5]/20 text-[#9b5de5] text-xs font-semibold ml-2">
                              v{version}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400">
                          {ver.createdAt ? new Date(ver.createdAt).toLocaleString() : ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          className="p-1 rounded hover:bg-gray-800"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (savedVersionSet.has(saveKey)) {
                              handleUnsaveBySavedId(saveKey);
                            } else {
                              handleToggleSaveScript({
                                id: currentScriptId,
                                title: ver.title || currentScript?.title || "Script",
                                versionNumber: ver.versionNumber,
                              });
                            }
                          }}
                          aria-label={isSaved ? "Unsave version" : "Save version"}
                        >
                          {isSaved ? (
                            <BookmarkCheck className="h-4 w-4 text-[#00f5d4]" />
                          ) : (
                            <Bookmark className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
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
                groupItemsByDate(filteredChats).map(([group, items]) => (
                  <div key={group} className="space-y-2">
                    <div className="flex items-center gap-2 px-1">
                      <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">{group}</span>
                      <div className="h-px flex-1 bg-white/5" />
                    </div>
                    <div className="space-y-1">
                      {items.map((c) => (
                        <div
                          key={c.id}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all duration-300 text-left group cursor-pointer relative overflow-hidden ${
                            selectedChatId === c.id
                              ? "border-[#9b5de5]/50 bg-[#9b5de5]/5 shadow-[0_0_20px_rgba(155,93,229,0.05)]"
                              : "border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10"
                          }`}
                          onClick={() => handleOpenChat(c.id)}
                        >
                          {selectedChatId === c.id && (
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#9b5de5] shadow-[0_0_10px_#9b5de5]" />
                          )}
                          <div className="flex-1 min-w-0">
                            {renamingChatId === c.id ? (
                              <input
                                className="bg-gray-800 border border-[#9b5de5] rounded-lg px-2 py-1 text-xs text-white w-full outline-none"
                                value={renameChatTitle}
                                onChange={(e) => setRenameChatTitle(e.target.value)}
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.stopPropagation();
                                    handleRenameChatCommit(c.id, renameChatTitle);
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
                              />
                            ) : (
                              <div className="flex flex-col gap-0.5">
                                <span className={`font-bold text-sm truncate ${selectedChatId === c.id ? "text-white" : "text-gray-300 group-hover:text-white"}`}>
                                  {c.title || "Untitled chat"}
                                </span>
                                <span className="text-[10px] text-gray-500 truncate">
                                  {c.lastMessage || "No messages yet"}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                            <button
                              className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5"
                              onClick={(e) => { e.stopPropagation(); setRenamingChatId(c.id); setRenameChatTitle(c.title || ""); }}
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-400/10"
                              onClick={(e) => { e.stopPropagation(); setDeleteChatId(c.id); }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
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
          <div
            className="p-4"
            role="tabpanel"
            id={`${tabId}-panel-saved`}
            aria-labelledby={`${tabId}-saved`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-lg text-[#00f5d4]">
                Saved Scripts
              </span>
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

            <div className="space-y-2" aria-live="polite">
              {(filteredSavedScripts ?? []).map((row) => (
                <button
                  key={`${row.scriptId || ""}__${getVersionStr(row)}`}
                  type="button"
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-gray-700 bg-gray-900/40 transition-colors group hover:border-[#00f5d4] hover:bg-gray-800/60 focus:outline-none"
                  title={row.title || "Untitled"}
                  onClick={() => {
                    window.dispatchEvent(
                      new CustomEvent("nexus:openCodeDrawer", {
                        detail: {
                          scriptId: row.scriptId,
                          code: row.code || "-- No code found",
                          title: row.title,
                          versionNumber: getVersionStr(row),
                          explanation: row.explanation || "",
                          savedScriptId: row.id || `${row.scriptId || ""}__${getVersionStr(row)}`,
                        },
                      })
                    );
                  }}
                  tabIndex={0}
                  aria-label={`Open saved script ${row.title || "Untitled"} v${getVersionStr(row)}`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      window.dispatchEvent(
                        new CustomEvent("nexus:openCodeDrawer", {
                          detail: {
                            scriptId: row.scriptId,
                            code: row.code || "-- No code found",
                            title: row.title,
                            versionNumber: getVersionStr(row),
                            explanation: row.explanation || "",
                            savedScriptId: row.id || `${row.scriptId || ""}__${getVersionStr(row)}`,
                          },
                        })
                      );
                    }
                  }}
                >
                  <div className="flex-1 min-w-0 flex flex-col">
                    <div className="flex items-center gap-2">
                      <span
                        className="font-semibold text-white truncate block max-w-[10rem] md:max-w-[14rem]"
                        title={row.title || "Untitled"}
                      >
                        {row.title || "Untitled"}
                      </span>
                      {getVersionStr(row) && (
                        <span className="inline-block px-2 py-0.5 rounded bg-[#9b5de5]/20 text-[#9b5de5] text-xs font-semibold ml-2">
                          v{getVersionStr(row)}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400">
                      {row.updatedAt && (
                        <span title={new Date(row.updatedAt).toLocaleString()}>
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
            ease: "easeInOut",
          }}
          className="w-full flex justify-center"
        >
          {/* You can import and use SubscribeButtonInline here if needed */}
        </motion.div>
      </div>
      {/* Toast for errors */}
      {toast && toast.msg && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-red-700 text-white px-4 py-2 rounded shadow-lg z-50">
          {toast.msg}
          <button
            className="ml-4 text-white underline"
            onClick={clearToast}
            aria-label="Dismiss error"
          >
            Dismiss
          </button>
        </div>
      )}
      {/* Firestore error surfaces */}
      {savedErr && (
        <div className="fixed bottom-16 left-1/2 transform -translate-x-1/2 bg-red-700 text-white px-4 py-2 rounded shadow-lg z-50">
          Error loading saved scripts: {savedErr}
          <button
            className="ml-4 text-white underline"
            onClick={() => window.location.reload()}
            aria-label="Retry"
          >
            Retry
          </button>
        </div>
      )}
      {chatErr && (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-red-700 text-white px-4 py-2 rounded shadow-lg z-50">
          Error loading chats: {chatErr}
          <button
            className="ml-4 text-white underline"
            onClick={() => window.location.reload()}
            aria-label="Retry"
          >
            Retry
          </button>
        </div>
      )}
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
