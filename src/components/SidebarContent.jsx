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
  getDocs,
  limit,
  startAfter,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { FixedSizeList as List } from "react-window";
import { useBilling } from "../context/BillingContext";

// --- Utility Functions ---

// Normalize Firestore timestamp to ms
const toMs = (t) =>
  t?.toMillis?.() ? t.toMillis() : +new Date(t) || Date.now();

// Utility: Safe filename for download
const safeFile = (t) =>
  (t || "Script")
    .replace(/[^a-zA-Z0-9_\- ]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 40) + ".lua";

// Version string getter (always string)
const getVersionStr = (v) =>
  String(v?.versionNumber ?? v?.version ?? "");

// Stable key for scripts/versions
const keyForScript = (s) => `${s.id}__${getVersionStr(s)}`;

// Utility: fromNow with ms support
const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
const fromNow = (ms) => {
  if (!ms || !Number.isFinite(ms)) return "—";
  const now = Date.now();
  const diff = ms - now;
  const mins = Math.round(diff / 60000);
  if (isFinite(mins) && Math.abs(mins) < 60) return rtf.format(mins, "minute");
  const hrs = Math.round(diff / 3600000);
  if (isFinite(hrs) && Math.abs(hrs) < 24) return rtf.format(hrs, "hour");
  const days = Math.round(diff / 86400000);
  if (isFinite(days)) return rtf.format(days, "day");
  return "—";
};

// --- Toast Hook for Error Surfaces ---
function useToast() {
  const [toast, setToast] = useState(null);
  const show = (msg, opts = {}) => setToast({ msg, ...opts });
  const clear = () => setToast(null);
  return { toast, show, clear };
}

// --- NotificationToast for upgrade nudges ---
function NotificationToast({ open, message, cta, onCta, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-5 py-3 rounded shadow-lg z-50 flex items-center gap-4 border border-[#00f5d4]">
      <span className="font-medium">{message}</span>
      {cta && (
        <button
          className="ml-2 px-3 py-1 rounded bg-[#00f5d4] text-black font-bold text-xs"
          onClick={onCta}
        >
          {cta}
        </button>
      )}
      <button
        className="ml-2 text-white opacity-60 hover:opacity-100"
        onClick={onClose}
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// --- Memoized Script Row ---
const ScriptRow = React.memo(function ScriptRow({
  script,
  isSelected,
  onSelect,
  onRename,
  onDelete,
  onToggleSave,
  isSaved,
  renaming,
  renameValue,
  setRenameValue,
  onRenameCommit,
  onRenameCancel,
}) {
  const version = getVersionStr(script);
  return (
    <div
      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border ${
        isSelected
          ? "border-[#00f5d4] bg-gray-800/60"
          : "border-gray-700 bg-gray-900/40"
      } transition-colors text-left group`}
      tabIndex={0}
      role="row"
      aria-selected={isSelected}
      style={{ outline: "none" }}
      data-id={script.id}
      data-version={version}
      aria-label={`Select script ${script.title || "Untitled"}`}
      onClick={onSelect}
    >
      <div className="flex-1 min-w-0">
        {renaming ? (
          <input
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white w-full"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.stopPropagation();
                if (renameValue.trim()) onRenameCommit(script.id, renameValue.trim());
              }
              if (e.key === "Escape") {
                e.stopPropagation();
                onRenameCancel();
              }
            }}
            onBlur={() => {
              if (renameValue.trim()) onRenameCommit(script.id, renameValue.trim());
              onRenameCancel();
            }}
            aria-label="Rename script"
          />
        ) : (
          <span
            className="font-semibold text-white truncate block max-w-[12rem] md:max-w-[16rem]"
            title={script.title || "Untitled"}
          >
            {script.title || "Untitled"}
            {version && (
              <span className="inline-block px-2 py-0.5 rounded bg-[#9b5de5]/20 text-[#9b5de5] text-xs font-semibold ml-2">
                v{version}
              </span>
            )}
          </span>
        )}
        <div className="text-xs text-gray-400">
          {script.updatedAt && (
            <span title={new Date(script.updatedAt).toLocaleString()}>
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
          title={isSaved ? "Unsave" : "Save"}
          tabIndex={-1}
          aria-label={isSaved ? "Unsave script" : "Save script"}
          onClick={(e) => {
            e.stopPropagation();
            onToggleSave(script);
          }}
        >
          {isSaved ? (
            <Bookmark className="h-4 w-4 text-[#00f5d4]" />
          ) : (
            <Bookmark className="h-4 w-4 text-gray-400" />
          )}
        </button>
        {renaming ? (
          <button
            className="p-1 rounded hover:bg-gray-700"
            title="Save"
            tabIndex={-1}
            aria-label="Save script name"
            onClick={(e) => {
              e.stopPropagation();
              if (renameValue.trim()) onRenameCommit(script.id, renameValue.trim());
              onRenameCancel();
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
              onRename(script.id, script.title || "");
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
            onDelete(script.id);
          }}
        >
          <Trash2 className="h-4 w-4 text-gray-400" />
        </button>
      </div>
    </div>
  );
});

// --- SidebarContent component ---
export default function SidebarContent({
  activeTab,
  setActiveTab,
  handleClearChat,
  setPrompt,
  scripts = [],
  currentChatId,
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
  onSelect,
  onRenameChat,
  onDeleteChat,
  selectedVersionId, // <-- pass from parent for version selection
  onLoadMoreScripts,
  hasMoreScripts,
  onSelectChat,
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
    if (currentChatId) setSelectedChatId(currentChatId);
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
    return (Array.isArray(scripts) ? scripts : []).filter((s) => s.chatId === currentChatId);
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
        new CustomEvent("nexus:forceOpenScript", { detail: { scriptId } })
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

  // --- Main Render ---
  return (
    <>
      <div className="flex border-b border-gray-800" role="tablist" aria-label="Sidebar sections">
        <SidebarTab
          label="Scripts"
          active={activeTab === "scripts"}
          onClick={() => setActiveTab("scripts")}
          role="tab"
          aria-selected={activeTab === "scripts"}
          aria-controls={`${tabId}-panel-scripts`}
          id={`${tabId}-scripts`}
          tabIndex={0}
        />
        <SidebarTab
          label="History"
          active={activeTab === "history"}
          onClick={() => setActiveTab("history")}
          role="tab"
          aria-selected={activeTab === "history"}
          aria-controls={`${tabId}-panel-history`}
          id={`${tabId}-history`}
          tabIndex={0}
        />
        <SidebarTab
          label="Chats"
          active={activeTab === "chats"}
          onClick={() => setActiveTab("chats")}
          role="tab"
          aria-selected={activeTab === "chats"}
          aria-controls={`${tabId}-panel-chats`}
          id={`${tabId}-chats`}
          tabIndex={0}
        />
        <SidebarTab
          label="Saved"
          active={activeTab === "saved"}
          onClick={() => setActiveTab("saved")}
          role="tab"
          aria-selected={activeTab === "saved"}
          aria-controls={`${tabId}-panel-saved`}
          id={`${tabId}-saved`}
          tabIndex={0}
        />
      </div>
      <div className="flex-grow overflow-y-auto">
        {activeTab === "scripts" && (
          <div
            className="p-4"
            role="tabpanel"
            id={`${tabId}-panel-scripts`}
            aria-labelledby={`${tabId}-scripts`}
          >
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
                onChange={(e) => setLocalSearch(e.target.value)}
                aria-label="Search scripts"
              />
            </div>
            <div
              className="space-y-2"
              ref={scriptsContainerRef}
              tabIndex={-1}
              aria-live="polite"
            >
            {scripts === undefined ? (
              <>
                {renderSkeleton()}
                {renderSkeleton()}
              </>
            ) : chatScripts.length === 0 ? (
              <div className="text-gray-400 text-sm mb-2 flex items-center gap-2">
                No scripts in this chat.
                <button
                  className="ml-2 px-2 py-1 rounded bg-[#00f5d4] text-black font-bold text-xs"
                  onClick={handleNewScript}
                >
                  Create one
                </button>
              </div>
            ) : filteredScripts.length === 0 ? (
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
            ) : filteredScripts.length > 60 ? (
              <List
                height={400}
                itemCount={filteredScripts.length}
                  itemSize={56}
                  width="100%"
                  style={{ background: "transparent" }}
                >
                  {({ index, style }) => {
                    const script = filteredScripts[index];
                    return (
                      <div style={style} key={keyForScript(script)}>
                        <ScriptRow
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
                      </div>
                    );
                  }}
                </List>
              ) : (
                filteredScripts.map((script) => (
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
          </div>
        )}

        {activeTab === "history" && (
          <div
            className="p-4"
            role="tabpanel"
            id={`${tabId}-panel-history`}
            aria-labelledby={`${tabId}-history`}
          >
            <button
              onClick={() => {
                if (
                  window.confirm(
                    "Clear this conversation? This cannot be undone."
                  )
                ) {
                  handleClearChat();
                }
              }}
              className="w-full py-2 rounded-lg border border-gray-700 hover:bg-gray-800/50 transition-colors duration-300 text-gray-300 text-sm flex items-center justify-center focus:ring-2 focus:ring-[#9b5de5] outline-none"
              aria-label="Clear conversation"
            >
              <X className="h-4 w-4 mr-2" />
              Clear conversation
            </button>
            {/* Info bar for Free users */}
            {showHistoryInfoBar && (
              <div className="w-full bg-[#00f5d4]/10 border border-[#00f5d4] text-[#00f5d4] text-xs font-semibold px-3 py-1 rounded mt-6 mb-2 flex items-center gap-2">
                <Lock className="h-3 w-3 mr-1 text-[#00f5d4]" />
                Showing last 7 days — Upgrade for unlimited history.
              </div>
            )}
            {/* Version History for Current Script */}
            <div className="mt-2">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-[#00f5d4]" />
                  <span className="font-bold text-[#00f5d4]">
                    Version History
                  </span>
                </div>
              </div>
              {(!versionHistoryWithLock || versionHistoryWithLock.length === 0) && (
                <div className="text-gray-400 text-sm">
                  No versions for this script yet. Generate your first version by submitting a prompt on the AI Console.
                </div>
              )}
              <div className="space-y-2" aria-live="polite">
                {(versionHistoryWithLock ?? []).map((ver, vIdx) => {
                  const version = getVersionStr(ver);
                  const saveKey = `${currentScriptId}__${version}`;
                  const isSaved = savedVersionSet.has(saveKey);
                  const isSelected =
                    selectedVersionId === version ||
                    selectedVersionId === ver.id ||
                    selectedVersionId === saveKey;

                  // Locked item UI
                  if (ver.isLocked) {
                    return (
                      <div
                        key={keyForScript({ ...ver, id: currentScriptId })}
                        className={`w-full flex items-center justify-between px-3 py-2 border-b border-gray-800 last:border-b-0 rounded text-left group cursor-not-allowed opacity-60 bg-gray-900/60 relative`}
                        style={{
                          background: "rgba(55,65,81,0.5)",
                          pointerEvents: "auto",
                        }}
                        role="button"
                        tabIndex={0}
                        aria-label={`Locked version ${version}`}
                        onClick={(e) => {
                          e.preventDefault();
                          handleLockedHistoryClick();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleLockedHistoryClick();
                          }
                        }}
                      >
                        <div className="flex flex-col flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className="font-semibold text-[#00f5d4] truncate block max-w-[10rem] md:max-w-[14rem]"
                              title={ver.title || "Untitled"}
                            >
                              {ver.title || "Untitled"}
                            </span>
                            {version ? (
                              <span className="inline-block px-2 py-0.5 rounded bg-[#9b5de5]/20 text-[#9b5de5] text-xs font-semibold ml-1">
                                v{version}
                              </span>
                            ) : null}
                            <span className="flex items-center gap-1 ml-2 text-xs text-[#9b5de5] font-bold">
                              <Lock className="h-3 w-3 mr-0.5" />
                              Locked
                            </span>
                          </div>
                          <span
                            className="text-xs text-gray-400"
                            title={
                              ver.createdAt
                                ? new Date(ver.createdAt).toLocaleString()
                                : undefined
                            }
                          >
                            {ver.createdAt ? fromNow(ver.createdAt) : ""}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <button
                            className="p-1 rounded hover:bg-gray-700"
                            title="Locked"
                            aria-label="Locked"
                            tabIndex={-1}
                            onClick={(e) => {
                              e.preventDefault();
                              handleLockedHistoryClick();
                            }}
                          >
                            <Lock className="h-4 w-4 text-[#9b5de5]" />
                          </button>
                        </div>
                      </div>
                    );
                  }

                  // Unlocked item UI
                  return (
                    <div
                      key={keyForScript({ ...ver, id: currentScriptId })}
                      className={`w-full flex items-center justify-between px-3 py-2 border-b border-gray-800 last:border-b-0 hover:bg-gray-800 transition-colors rounded text-left group ${
                        isSelected ? "bg-[#00f5d4]/10" : ""
                      }`}
                      style={{
                        background: isSelected
                          ? "rgba(0,245,212,0.08)"
                          : undefined,
                      }}
                      role="button"
                      onClick={() => {
                        if (typeof onVersionView === "function") {
                          onVersionView(ver);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          if (typeof onVersionView === "function") {
                            onVersionView(ver);
                          }
                        }
                      }}
                      tabIndex={0}
                      aria-label={`Show version ${version}`}
                    >
                      <div className="flex flex-col flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="font-semibold text-[#00f5d4] truncate block max-w-[10rem] md:max-w-[14rem]"
                            title={ver.title || "Untitled"}
                          >
                            {ver.title || "Untitled"}
                          </span>
                          {version ? (
                            <span className="inline-block px-2 py-0.5 rounded bg-[#9b5de5]/20 text-[#9b5de5] text-xs font-semibold ml-1">
                              v{version}
                            </span>
                          ) : null}
                        </div>
                        <span
                          className="text-xs text-gray-400"
                          title={
                            ver.createdAt
                              ? new Date(ver.createdAt).toLocaleString()
                              : undefined
                          }
                        >
                          {ver.createdAt ? fromNow(ver.createdAt) : ""}
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
                              id: currentScriptId,
                              title: ver.title || "Untitled",
                              version,
                              chatId: currentScript?.chatId ?? null,
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
                            if (typeof onVersionView === "function") {
                              onVersionView(ver);
                            }
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
                            if (typeof onVersionDownload === "function") {
                              onVersionDownload(ver);
                            }
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
          <div
            className="p-4"
            role="tabpanel"
            id={`${tabId}-panel-chats`}
            aria-labelledby={`${tabId}-chats`}
          >
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

            <div className="space-y-2" aria-live="polite">
              {(filteredChats ?? []).map((c) => (
                <div
                  key={c.id}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border ${
                    selectedChatId === c.id
                      ? "border-[#00f5d4] bg-gray-800/60"
                      : "border-gray-700 bg-gray-900/40"
                  } transition-colors text-left group`}
                  tabIndex={0}
                  role="row"
                  aria-selected={selectedChatId === c.id}
                  data-id={c.id}
                  aria-label={`Open chat ${c.title || "Untitled chat"}`}
                  onClick={() => handleOpenChat(c.id)}
                >
                  <div className="flex-1 min-w-0">
                    {renamingChatId === c.id ? (
                      <input
                        className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white w-full"
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
                        aria-label="Rename chat"
                      />
                    ) : (
                      <span
                        className="font-semibold text-white truncate block max-w-[12rem] md:max-w-[16rem]"
                        title={c.title || "Untitled chat"}
                      >
                        {c.title || "Untitled chat"}
                      </span>
                    )}
                    <div className="text-xs text-gray-400">
                      {c.updatedAt && (
                        <span title={new Date(c.updatedAt).toLocaleString()}>
                          Updated {fromNow(c.updatedAt)}
                        </span>
                      )}
                      {c.lastMessage && (
                        <span className="ml-2 text-gray-500 truncate">
                          {c.lastMessage}
                        </span>
                      )}
                      <span className="ml-2 text-[10px] text-gray-500 hidden group-hover:inline">
                        (F2: Rename • Delete: Delete)
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    {renamingChatId === c.id ? (
                      <button
                        className="p-1 rounded hover:bg-gray-700"
                        title="Save"
                        tabIndex={-1}
                        aria-label="Save chat name"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRenameChatCommit(c.id, renameChatTitle);
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
                          setRenamingChatId(c.id);
                          setRenameChatTitle(c.title || "");
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
                        setDeleteChatId(c.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-gray-400" />
                    </button>
                  </div>
                </div>
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
                          code: row.code,
                          title: row.title,
                          versionNumber: getVersionStr(row),
                          explanation: row.explanation || "",
                          savedScriptId: `${row.scriptId || ""}__${getVersionStr(row)}`,
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
                            code: row.code,
                            title: row.title,
                            versionNumber: getVersionStr(row),
                            explanation: row.explanation || "",
                            savedScriptId: `${row.scriptId || ""}__${getVersionStr(row)}`,
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
    </>
  );
}
