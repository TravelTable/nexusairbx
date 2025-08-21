import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useDeferredValue,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  Send,
  Loader,
  Menu,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { auth } from "./firebase";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import SidebarContent from "../components/SidebarContent";
import RightSidebar from "../components/RightSidebar";
import Modal from "../components/Modal";
import FeedbackModal from "../components/FeedbackModal";
import SimpleCodeDrawer from "../components/CodeDrawer";
import ScriptLoadingBarContainer from "../components/ScriptLoadingBarContainer";
import WelcomeCard from "../components/WelcomeCard";
import TokenBar from "../components/TokenBar";
import CelebrationAnimation from "../components/CelebrationAnimation";
import OnboardingContainer from "../components/OnboardingContainer";
import FancyLoadingOverlay from "../components/FancyLoadingOverlay";
import NotificationToast from "../components/NotificationToast";
import { v4 as uuidv4 } from "uuid";
import {
  normalizeServerVersion,
  sortDesc,
  nextVersionNumber,
  cryptoRandomId,
} from "../lib/versioning";
import {
  getFirestore,
  doc,
  collection,
  query,
  orderBy,
  limitToLast,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  setDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { FixedSizeList as List } from "react-window";

// --- Backend API URL ---
let BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
if (!BACKEND_URL) {
  BACKEND_URL = "https://nexusrbx-backend-production.up.railway.app";
  console.warn("REACT_APP_BACKEND_URL is not set. Using default:", BACKEND_URL);
}
if (BACKEND_URL.endsWith("/")) {
  BACKEND_URL = BACKEND_URL.replace(/\/+$/, "");
}

// --- Token System Constants ---
const TOKEN_LIMIT = 4;
const TOKEN_REFRESH_HOURS = 48; // 2 days

// --- Developer Email for Infinite Tokens ---
const DEV_EMAIL = process.env.REACT_APP_DEV_EMAIL?.toLowerCase() || "dev@example.com";

// --- Model/Creativity/CodeStyle Options ---
const modelOptions = [
  { value: "nexus-3", label: "Nexus-3 (Legacy, Default)" },
  { value: "nexus-4", label: "Nexus-4 (Fast, Accurate)" },
  { value: "nexus-2", label: "Nexus-2 (GPT-3.5 Turbo)" },
];
const creativityOptions = [
  { value: 0.3, label: "Low (Precise)" },
  { value: 0.7, label: "Medium (Balanced)" },
  { value: 1.0, label: "High (Creative)" },
];
const codeStyleOptions = [
  { value: "optimized", label: "Optimized" },
  { value: "readable", label: "Readable" },
];

const defaultSettings = {
  modelVersion: "nexus-3",
  creativity: 0.7,
  codeStyle: "optimized",
};

// --- Gravatar Helper ---
function getGravatarUrl(email, size = 40) {
  if (!email) return null;
  function fallbackMd5(str) {
    let hash = 0,
      i,
      chr;
    if (str.length === 0) return hash;
    for (i = 0; i < str.length; i++) {
      chr = str.charCodeAt(i);
      hash = (hash << 5) - hash + chr;
      hash |= 0;
    }
    return Math.abs(hash).toString(16);
  }
  const hash = fallbackMd5(email.trim().toLowerCase());
  return `https://www.gravatar.com/avatar/${hash}?d=identicon&s=${size}`;
}

// --- User Initials Helper ---
function getUserInitials(email) {
  if (!email) return "U";
  const parts = email.split("@")[0].split(/[._]/);
  return parts
    .map((p) => p[0]?.toUpperCase())
    .join("")
    .slice(0, 2);
}

// --- Version Number Helpers ---
const getVN = (v) => Number(v?.versionNumber ?? v?.version ?? 0);
const byVN = (a, b) => getVN(b) - getVN(a);

// --- Auth Retry Helper ---
async function authedFetch(user, url, init = {}, retry = true) {
  let idToken = await user.getIdToken();
  let res = await fetch(url, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${idToken}`,
    },
    signal: init.signal,
  });
  if (res.status === 401 && retry) {
    await user.getIdToken(true);
    idToken = await user.getIdToken();
    res = await fetch(url, {
      ...init,
      headers: {
        ...(init.headers || {}),
        Authorization: `Bearer ${idToken}`,
      },
      signal: init.signal,
    });
  }
  return res;
}


const [showOnboarding, setShowOnboarding] = useState(
  localStorage.getItem("nexusrbx:onboardingComplete") !== "true"
);

// --- Debounce Helper ---
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debounced;
}

// --- Safe Timestamp Helper ---
const toLocalTime = (ts) => {
  if (!ts) return "";
  const d = new Date(typeof ts === "number" ? ts : Date.parse(ts) || Date.now());
  return isNaN(d.getTime()) ? "" : d.toLocaleString();
};

// --- Safe Filename Helper ---
const safeFile = (title) =>
  ((title || "Script")
    .replace(/[^a-zA-Z0-9_\- ]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 40) || "Script") + ".lua";

// --- Outline → Explanation Helper ---
function outlineToExplanationText(outline = []) {
  if (!Array.isArray(outline)) return "";
  return outline
    .map((sec) => {
      const heading = sec?.heading ? `## ${sec.heading}` : "";
      const bullets = (sec?.bulletPoints || []).map((b) => `• ${b}`).join("\n");
      return [heading, bullets].filter(Boolean).join("\n");
    })
    .join("\n\n");
}

// --- Polling Utility (with Retry-After, abort, backoff) ---
async function pollJob(user, jobId, onTick, { signal }) {
  let delay = 1200;
  while (true) {
    if (signal?.aborted) throw new Error("Aborted");
    const res = await authedFetch(
      user,
      `${BACKEND_URL}/api/jobs/${jobId}`,
      { method: "GET", signal }
    );
    if (res.status === 429) {
      const ra = Number(res.headers.get("Retry-After")) || 2;
      await new Promise((r) => setTimeout(r, ra * 1000));
      continue;
    }
    const data = await res.json();
    onTick?.(data);
    if (data.status === "succeeded" || data.status === "failed") return data;
    await new Promise((r) => setTimeout(r, delay));
    delay = Math.min(delay + 300, 3000);
  }
}

// --- Safe localStorage helpers ---
function safeGet(key, fallback = null) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}
function safeSet(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {}
}

// --- AI Bubble Sizing Helper ---
function getAiBubbleSizing(text = "") {
  const len = text.length;
  if (len < 240) {
    return { wrapClass: "max-w-2xl", bubbleClass: "text-base px-5 py-4" };
  }
  if (len < 1200) {
    return { wrapClass: "max-w-3xl", bubbleClass: "text-[15px] leading-6 px-6 py-5" };
  }
  return { wrapClass: "max-w-4xl", bubbleClass: "text-[14px] leading-7 px-7 py-6" };
}

export default function NexusRBXAIPageContainer() {
  const navigate = useNavigate();

  // --- State for scripts and versions ---
  const [user, setUser] = useState(null);
  const [scripts, setScripts] = useState([]);
  const [currentScriptId, setCurrentScriptId] = useState(null);
  const [currentScript, setCurrentScript] = useState(null);
  const [versionHistory, setVersionHistory] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState(null);

  // Chat timeline: ordered messages
  const [messages, setMessages] = useState([]);

  // --- Chat state + listener refs ---
  const [currentChatId, setCurrentChatId] = useState(null);
  const [currentChatMeta, setCurrentChatMeta] = useState(null);
  const messagesUnsubRef = useRef(null);
  const chatUnsubRef = useRef(null);

  const [activeTab, setActiveTab] = useState("scripts");
  const [prompt, setPrompt] = useState("");
  const [promptCharCount, setPromptCharCount] = useState(0);
  const [promptError, setPromptError] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState("idle");
  const [showCelebration, setShowCelebration] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // --- Notification Helper (deduped) ---
  const notify = useCallback(
    ({ message, type = "info", duration = 4000 }) => {
      setNotifications((prev) => {
        if (prev.some((n) => n.message === message && n.type === type)) return prev;
        return [...prev, { id: uuidv4(), message, type, duration }];
      });
    },
    [setNotifications]
  );


  // Hide onboarding when finished (listen for reload or localStorage change)
  useEffect(() => {
    function handleStorage() {
      if (localStorage.getItem("nexusrbx:onboardingComplete") === "true") {
        setShowOnboarding(false);
      }
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // --- Loading Bar ---
  const [loadingBarVisible, setLoadingBarVisible] = useState(false);
  const [loadingBarData, setLoadingBarData] = useState({
    filename: "",
    version: "",
    language: "lua",
    loading: false,
    codeReady: false,
    estimatedLines: null,
    saved: false,
    onSave: null,
    onView: null,
    stage: "",
    eta: null,
  });

  // --- Settings, tokens, etc. ---
  const [settings, setSettings] = useState(defaultSettings);
  const [promptTemplates, setPromptTemplates] = useState([]);
  const [userPromptTemplates, setUserPromptTemplates] = useState([]);
  const [promptAutocomplete, setPromptAutocomplete] = useState([]);
  const [promptHistory, setPromptHistory] = useState([]);
  const [promptSearch, setPromptSearch] = useState("");
  const [promptSuggestions, setPromptSuggestions] = useState([]);
  const [promptSuggestionLoading, setPromptSuggestionLoading] = useState(false);

  // --- Mobile Sidebar State ---
  const [mobileLeftSidebarOpen, setMobileLeftSidebarOpen] = useState(false);
  const [mobileRightSidebarOpen, setMobileRightSidebarOpen] = useState(false);

  // --- Typewriter Animation State ---
  const [animatedScriptIds, setAnimatedScriptIds] = useState({});

  // --- Token Bar State ---
  const [tokensLeft, setTokensLeft] = useState(TOKEN_LIMIT);
  const [tokenRefreshTime, setTokenRefreshTime] = useState(null);

  // --- Prompt Input Ref for focus ---
  const promptInputRef = useRef(null);

  // --- Polling ETA ---
  const pollingTimesRef = useRef([]);

  // --- Abort management for job polling ---
  const jobAbortRef = useRef(null);

  // --- Versions polling refs (HMR-safe, jittered backoff, ETag) ---
  const lastVersionsFetchRef = useRef(0);
  const versionsBackoffRef = useRef(0);
  const versionsEtagRef = useRef(null);

  // --- Local Persistence for chat/sidebar (throttled) ---
  const persist = useRef(0);
  useEffect(() => {
    const now = Date.now();
    if (now - persist.current < 800) return;
    persist.current = now;
    safeSet(
      `nexusrbx:messages:${currentScriptId || "none"}`,
      messages.map((m) => ({
        id: m.id,
        role: m.role,
        versionId: m.versionId,
        versionNumber: m.versionNumber,
      }))
    );
  }, [messages, currentScriptId]);
  useEffect(() => {
    if (currentScript) safeSet("nexusrbx:currentScript", currentScript);
  }, [currentScript]);
  useEffect(() => {
    safeSet("nexusrbx:versionHistory", versionHistory || []);
  }, [versionHistory]);

  useEffect(() => {
    const cachedScript = safeGet("nexusrbx:currentScript");
    if (cachedScript) setCurrentScript(cachedScript);
    const cachedVersions = safeGet("nexusrbx:versionHistory");
    if (cachedVersions) setVersionHistory(cachedVersions);
    const cachedScripts = safeGet("nexusrbx:scripts");
    if (cachedScripts) setScripts(cachedScripts);
  }, []);

  // --- Auth ---
  const [authReady, setAuthReady] = useState(false);
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setAuthReady(true);
      if (firebaseUser) {
        setUser(firebaseUser);
      } else {
        signInAnonymously(auth)
          .then((res) => setUser(res.user))
          .catch(() => setUser(null));
      }
    });
    return () => unsubscribe();
  }, []);

  // --- Fresh draft on load (no auto-restore) ---
  useEffect(() => {
    if (!user) return;
    setCurrentScriptId(null);
    setMessages([]);
    setCurrentChatId(null);
    setCurrentChatMeta(null);
  }, [user]);

  // --- Listener cleanup and abort on chat/project switch ---
  const openChatById = useCallback(
    (chatId) => {
      const db = getFirestore();
      const u = auth.currentUser;
      if (!u || !chatId) return;

      // abort inflight job
      if (jobAbortRef.current) {
        try {
          jobAbortRef.current.abort();
        } catch {}
        jobAbortRef.current = null;
      }

      // clean old listeners first
      messagesUnsubRef.current?.();
      messagesUnsubRef.current = null;
      chatUnsubRef.current?.();
      chatUnsubRef.current = null;

      setCurrentChatId(chatId);

      const chatDocRef = doc(db, "users", u.uid, "chats", chatId);
      chatUnsubRef.current = onSnapshot(chatDocRef, (snap) => {
        const data = snap.exists() ? { id: snap.id, ...snap.data() } : null;
        setCurrentChatMeta(data || null);
        if (data?.projectId) {
          setCurrentScriptId(data.projectId);
        }
      });

      const msgsRef = collection(db, "users", u.uid, "chats", chatId, "messages");
      const qMsgs = query(msgsRef, orderBy("createdAt", "asc"), limitToLast(200));
      messagesUnsubRef.current = onSnapshot(qMsgs, (snap) => {
        const arr = [];
        snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
        const seen = new Set();
        const unique = arr.filter((m) => {
          const key = m.clientId || m.id;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setMessages(unique);
      });
    },
    [setCurrentScriptId, setMessages]
  );

  useEffect(() => {
    // window event listeners
    const onOpenChat = (e) => {
      const id = e?.detail?.id;
      if (id) openChatById(id);
    };
    const onStartDraft = () => {
      setCurrentChatId(null);
      setCurrentChatMeta(null);
      setCurrentScriptId(null);
      setCurrentScript(null);
      setVersionHistory([]);
      setMessages([]);
      setSelectedVersion(null);
    };
    window.addEventListener("nexus:openChat", onOpenChat);
    window.addEventListener("nexus:startDraft", onStartDraft);

    // ESC closes mobile sidebars
    const onKey = (e) => e.key === "Escape" && closeAllMobileSidebars();
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("nexus:openChat", onOpenChat);
      window.removeEventListener("nexus:startDraft", onStartDraft);
      window.removeEventListener("keydown", onKey);
      messagesUnsubRef.current?.();
      chatUnsubRef.current?.();
    };
  }, [openChatById]);

  // --- Load Versions for Current Script from Backend (event-driven, skip if not current) ---
  useEffect(() => {
    if (!authReady) return;
    if (!user || !currentScriptId) return;
    if (selectedVersion && selectedVersion.projectId && selectedVersion.projectId !== currentScriptId) return;

    const now = Date.now();
    const delay = 10000 + (versionsBackoffRef.current || 0);
    if (now - lastVersionsFetchRef.current < delay) return;
    lastVersionsFetchRef.current = now;

    user.getIdToken().then((idToken) => {
      const headers = { Authorization: `Bearer ${idToken}` };
      if (versionsEtagRef.current) headers["If-None-Match"] = versionsEtagRef.current;

      fetch(`${BACKEND_URL}/api/projects/${currentScriptId}/versions`, { headers })
        .then(async (res) => {
          if (res.status === 304) {
            versionsBackoffRef.current = 0;
            return { versions: null, etag: versionsEtagRef.current };
          }
          if (res.status === 429) {
            const base = Math.min((versionsBackoffRef.current || 0) * 2 + 5000, 60000);
            const jitter = Math.floor(Math.random() * 2000);
            versionsBackoffRef.current = base + jitter;
            const ra = res.headers.get("Retry-After");
            if (ra) setErrorMsg(`Rate limited. Try again in ~${ra}s.`);
            else setErrorMsg("Temporarily showing cached draft (429).");
            return null;
          }
          versionsBackoffRef.current = 0;
          if (!res.ok) {
            setErrorMsg("Temporarily showing cached draft (error).");
            return null;
          }
          const etag = res.headers.get("ETag");
          const data = await res.json().catch(() => null);
          return { ...data, etag };
        })
        .then((data) => {
          if (!data) return;
          if (data.versions === null) return;
          const normalized = Array.isArray(data.versions)
            ? data.versions.map(normalizeServerVersion).sort(byVN)
            : [];
          if (data.etag) versionsEtagRef.current = data.etag;
          if (normalized.length === 0) return;
          setCurrentScript((cs) => ({
            id: currentScriptId,
            title: normalized[0]?.title || cs?.title || "",
            versions: normalized,
          }));
          setVersionHistory(normalized);
          setSelectedVersion((sv) =>
            sv ? normalized.find((v) => v.id === sv.id) || normalized[0] : normalized[0]
          );
        })
        .catch(() => setErrorMsg("Failed to load versions."));
    });
  }, [user, currentScriptId, authReady, selectedVersion]);

  // --- Prompt Char Count & Error ---
  useEffect(() => {
    setPromptCharCount(prompt.length);
    if (prompt.length > 800) {
      setPromptError("Prompt too long (max 800 characters).");
    } else {
      setPromptError("");
    }
  }, [prompt]);

  // --- Debounced Prompt for Autocomplete (deferred for snappy typing) ---
  const deferredPrompt = useDeferredValue(prompt);
  useEffect(() => {
    if (deferredPrompt.length > 1 && !isGenerating) {
      const allPrompts = [
        ...promptTemplates,
        ...userPromptTemplates,
        ...promptHistory,
      ];
      const filtered = allPrompts
        .filter(
          (p) =>
            p.toLowerCase().startsWith(deferredPrompt.toLowerCase()) &&
            p.toLowerCase() !== deferredPrompt.toLowerCase()
        )
        .slice(0, 5);
      setPromptAutocomplete(filtered);
    } else {
      setPromptAutocomplete([]);
    }
  }, [deferredPrompt, promptTemplates, userPromptTemplates, promptHistory, isGenerating]);

  // --- Scroll to bottom on new script or loading bar ---
  const messagesEndRef = useRef(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating, loadingBarVisible]);

  // --- Mobile Sidebar Overlay Logic ---
  const closeAllMobileSidebars = () => {
    setMobileLeftSidebarOpen(false);
    setMobileRightSidebarOpen(false);
  };

  // --- Focus textarea on mount ---
  useEffect(() => {
    promptInputRef.current?.focus();
  }, []);

  // --- Cleanup job polling on unmount ---
  useEffect(() => {
    return () => {
      if (jobAbortRef.current) {
        try {
          jobAbortRef.current.abort();
        } catch {}
        jobAbortRef.current = null;
      }
    };
  }, []);

  async function createChatWithTitleAndFirstMessage({ user, title, firstMessage, clientId }) {
    const db = getFirestore();
    const authUser = auth.currentUser;
    if (!authUser) throw new Error("Not authenticated");

    const chatRef = doc(collection(db, "users", authUser.uid, "chats"));
    const msgRef = doc(collection(chatRef, "messages"));
    const now = serverTimestamp();

    const batch = writeBatch(db);
    batch.set(chatRef, {
      title,
      createdAt: now,
      updatedAt: now,
      firstMessageAt: now,
      lastMessage: firstMessage,
      projectId: null,
      archived: false,
    });
    batch.set(msgRef, {
      clientId,
      role: "user",
      content: firstMessage,
      createdAt: now,
    });

    await batch.commit();
    return chatRef.id;
  }

  // --- Sidebar Version Click Handler ---
  const handleVersionView = async (versionObj) => {
    setErrorMsg("");
    setSelectedVersion(versionObj);

    if (versionObj?.projectId && versionObj.projectId !== currentScriptId) {
      setCurrentScriptId(versionObj.projectId);
      setCurrentScript((cs) => ({
        ...cs,
        id: versionObj.projectId,
        title: versionObj?.title || cs?.title || "",
      }));
    } else {
      setCurrentScript((cs) => ({
        ...cs,
        title: versionObj?.title || cs?.title || "",
      }));
    }
  };

  // --- Download Handler for Version ---
  const handleVersionDownload = (versionObj) => {
    const filename = safeFile(
      (versionObj?.title || currentScript?.title || "Script").trim() || "Script"
    );
    const blob = new Blob([versionObj.code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // --- Script Management (Firestore-based Project IDs) ---
  const handleCreateScript = async (title = "New Script") => {
    setErrorMsg("");
    if (!user) return;
    try {
      const db = getFirestore();
      const authUser = auth.currentUser;
      const projectRef = doc(collection(db, "users", authUser.uid, "projects"));
      await setDoc(projectRef, {
        title,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        owner: authUser.uid,
      });
      setCurrentScriptId(projectRef.id);
      safeSet("nexusrbx:lastProjectId", projectRef.id);

      const res = await authedFetch(user, `${BACKEND_URL}/api/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, firestoreId: projectRef.id }),
      });
      if (!res.ok) {
        notify({ message: "Failed to sync project to backend.", type: "error" });
      }
    } catch (err) {
      notify({ message: "Failed to create project.", type: "error" });
    }
  };

  const handleRenameScript = async (scriptId, newTitle) => {
    setErrorMsg("Renaming projects is not supported yet.");
  };

  const handleDeleteScript = async (scriptId) => {
    setErrorMsg("Deleting projects is not supported yet.");
  };

  // --- Chat Management for Sidebar (rename/delete) ---
  const handleRenameChat = async (chatId, newTitle) => {
    if (!user || !chatId || !newTitle.trim()) return;
    try {
      const db = getFirestore();
      await updateDoc(doc(db, "users", user.uid, "chats", chatId), {
        title: newTitle.trim(),
        updatedAt: serverTimestamp(),
      });
      setSuccessMsg("Chat renamed.");
    } catch (err) {
      setErrorMsg("Failed to rename chat.");
    }
  };

  const handleDeleteChat = async (chatId) => {
    if (!user || !chatId) return;
    try {
      const db = getFirestore();
      await deleteDoc(doc(db, "users", user.uid, "chats", chatId));
      if (currentChatId === chatId) {
        setCurrentChatId(null);
        setCurrentChatMeta(null);
        setCurrentScriptId(null);
        setCurrentScript(null);
        setVersionHistory([]);
        setMessages([]);
        setSelectedVersion(null);
      }
      setSuccessMsg("Chat deleted.");
    } catch (err) {
      setErrorMsg("Failed to delete chat.");
    }
  };

  // --- AI Avatar (NexusRBX Logo) ---
  const NexusRBXAvatar = () => (
    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-lg overflow-hidden">
      <img
        src="/logo.png"
        alt="NexusRBX"
        className="w-8 h-8 object-contain"
        style={{ filter: "drop-shadow(0 0 2px #9b5de5)" }}
      />
    </div>
  );

  // --- User Avatar ---
  const UserAvatar = ({ email }) => {
    const gravatarUrl = getGravatarUrl(email);
    if (gravatarUrl) {
      return (
        <img
          src={gravatarUrl}
          alt="User"
          className="w-10 h-10 rounded-full border-2 border-[#9b5de5] shadow-lg object-cover"
        />
      );
    }
    return (
      <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-lg font-bold text-white border-2 border-[#9b5de5] shadow-lg">
        {getUserInitials(email)}
      </div>
    );
  };

  // --- Token Bar Logic (dev bypass) ---
  useEffect(() => {
    if (!user) {
      setTokensLeft(TOKEN_LIMIT);
      setTokenRefreshTime(null);
      return;
    }
    const isDev = !!user?.email && user.email.toLowerCase() === DEV_EMAIL;
    if (isDev) {
      setTokensLeft(null);
      setTokenRefreshTime(null);
      return;
    }
    setTokensLeft(TOKEN_LIMIT - 0);
    setTokenRefreshTime(
      new Date(Date.now() + TOKEN_REFRESH_HOURS * 60 * 60 * 1000)
    );
  }, [user]);

useEffect(() => {
  function onOpenCodeDrawer(e) {
    const scriptId = e?.detail?.scriptId;
    const code = e?.detail?.code;
    const title = e?.detail?.title || "Script";
    const version = e?.detail?.version || e?.detail?.versionNumber || null;
    const explanation = e?.detail?.explanation || "";
    const savedScriptId = e?.detail?.savedScriptId || null;

    // If code is provided (from Saved tab), always open as-is
    if (code) {
      setSelectedVersion({
        id: savedScriptId || cryptoRandomId(),
        projectId: scriptId,
        code,
        title,
        versionNumber: version,
        explanation,
        createdAtMs: Date.now(),
        isSavedScript: true,
      });
      return;
    }

    // If opening from version history, find the correct version
    if (scriptId === currentScriptId && versionHistory.length > 0) {
      // Try to find by id, versionNumber, or savedScriptId
      const found = versionHistory.find(
        (v) =>
          v.id === savedScriptId ||
          String(v.versionNumber) === String(version) ||
          String(v.id) === String(version) ||
          String(v.id) === String(savedScriptId)
      );
      setSelectedVersion(found || versionHistory[0]);
    } else {
      setCurrentScriptId(scriptId);
    }
  }
  window.addEventListener("nexus:openCodeDrawer", onOpenCodeDrawer);
  return () =>
    window.removeEventListener("nexus:openCodeDrawer", onOpenCodeDrawer);
}, [currentScriptId, versionHistory]);

  // --- Main Generation Flow (Handles both new script and new version) ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (typeof prompt !== "string" || !prompt.trim() || isGenerating) return;
    if (prompt.length > 800) {
      setPromptError("Prompt too long (max 800 characters).");
      return;
    }
    if (!user) {
      setErrorMsg("Sign in to generate scripts.");
      return;
    }

    const clientId = "u-" + Date.now();
    const cleaned = prompt.trim().replace(/\s+/g, " ");
    if (!cleaned) return;

    let chatIdToUse = currentChatId;

    // abort inflight job
    if (jobAbortRef.current) {
      try {
        jobAbortRef.current.abort();
      } catch {}
      jobAbortRef.current = null;
    }
    const abortController = new AbortController();
    jobAbortRef.current = abortController;

    try {
      setIsGenerating(true);
      setGenerationStep("title");
      setShowCelebration(false);

      // 1) Title
      const titleRes = await authedFetch(
        user,
        `${BACKEND_URL}/api/generate-title-advanced`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: cleaned,
            conversation: [],
            isNewScript: !currentScriptId,
            previousTitle: "",
            settings: {
              modelVersion: settings.modelVersion,
              temperature: settings.creativity,
            },
          }),
          signal: abortController.signal,
        }
      );
      if (!titleRes.ok) {
        const text = await titleRes.text();
        throw new Error(
          `Failed to generate title: ${titleRes.status} ${titleRes.statusText} - ${text.slice(
            0,
            200
          )}`
        );
      }
      const titleData = await titleRes.json().catch(() => null);
      if (!titleData?.title) throw new Error("No title returned");
      const scriptTitle = titleData.title;

      // 2) Chat create/update
      try {
        if (!chatIdToUse) {
          const newChatId = await createChatWithTitleAndFirstMessage({
            user,
            title: scriptTitle,
            firstMessage: cleaned,
            clientId,
          });
          chatIdToUse = newChatId;
          setCurrentChatId(chatIdToUse);
          openChatById(chatIdToUse);
          window.dispatchEvent(
            new CustomEvent("nexus:chatActivity", {
              detail: { id: chatIdToUse, title: scriptTitle, lastMessage: cleaned },
            })
          );
        } else {
          const db = getFirestore();
          const authUser = auth.currentUser;
          const chatRef = doc(db, "users", authUser.uid, "chats", chatIdToUse);
          const msgRef = doc(collection(chatRef, "messages"));
          await setDoc(msgRef, {
            clientId,
            role: "user",
            content: cleaned,
            createdAt: serverTimestamp(),
          });
          await updateDoc(chatRef, {
            lastMessage: cleaned,
            updatedAt: serverTimestamp(),
          });
        }
      } catch {
        setErrorMsg("Could not create or update chat.");
      }

      // 3) Ensure project
      let projectIdToUse = currentScriptId;
      if (!projectIdToUse) {
        const createProjectRes = await authedFetch(
          user,
          `${BACKEND_URL}/api/projects`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: scriptTitle || "Script" }),
            signal: abortController.signal,
          }
        );
        if (!createProjectRes.ok) {
          const text = await createProjectRes.text();
          throw new Error(
            `Failed to create project: ${createProjectRes.status} ${createProjectRes.statusText} - ${text.slice(
              0,
              200
            )}`
          );
        }
        const created = await createProjectRes.json();
        projectIdToUse = created.projectId;
        setCurrentScriptId(projectIdToUse);

        try {
          const db = getFirestore();
          const authUser = auth.currentUser;
          if (authUser && chatIdToUse) {
            await updateDoc(
              doc(db, "users", authUser.uid, "chats", chatIdToUse),
              {
                projectId: projectIdToUse,
                updatedAt: serverTimestamp(),
              }
            );
          }
        } catch {}
      }

      // 4) Outline (explanation)
      setGenerationStep("explanation");
      const recent = [...messages, { role: "user", content: cleaned }].slice(-6);
      const conversation = recent.map((m) => {
        if (m.role === "user") return { role: "user", content: m.content };
        const content = m.explanation
          ? `Explanation:\n${m.explanation}`
          : m.code
          ? "Provided code previously."
          : "Assistant response.";
        return { role: "assistant", content };
      });

      const outlineRes = await authedFetch(
        user,
        `${BACKEND_URL}/api/generate/outline`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: projectIdToUse,
            prompt: cleaned,
            conversation,
            settings: {
              modelVersion: settings.modelVersion,
              temperature: settings.creativity,
              codeStyle: settings.codeStyle,
            },
          }),
          signal: abortController.signal,
        }
      );
      if (!outlineRes.ok) {
        const text = await outlineRes.text();
        throw new Error(
          `Failed to generate outline: ${outlineRes.status} ${outlineRes.statusText} - ${text.slice(
            0,
            200
          )}`
        );
      }
      const outlineData = await outlineRes.json().catch(() => null);
      const outline = Array.isArray(outlineData?.outline) ? outlineData.outline : [];
      const explanation = outlineToExplanationText(outline);
      if (!explanation) throw new Error("Failed to generate outline/explanation");

      // 5) Show pending assistant message with explanation AND save to Firestore
      const pendingId = `a-temp-${Date.now()}`;
      const assistantMsgData = {
        id: pendingId,
        clientId: pendingId,
        role: "assistant",
        content: explanation,
        createdAt: new Date().toISOString(),
        versionNumber: null,
        explanation,
        projectId: projectIdToUse,
        versionId: null,
        pending: true,
        localOnly: true,
      };

      setMessages((prev) => [...prev, assistantMsgData]);
      setAnimatedScriptIds((prev) => ({ ...prev, [pendingId]: true }));

      try {
        const db = getFirestore();
        const authUser = auth.currentUser;
        if (authUser && chatIdToUse) {
          const chatRef = doc(db, "users", authUser.uid, "chats", chatIdToUse);
          const msgRef = doc(collection(chatRef, "messages"), pendingId);
          await setDoc(msgRef, {
            ...assistantMsgData,
            localOnly: false,
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        setErrorMsg("Could not save assistant explanation to chat.");
      }

      await new Promise((r) => setTimeout(r, 1000));

      // 6) Start code job
      setGenerationStep("preparing");
      setLoadingBarVisible(true);
      setLoadingBarData({
        filename: safeFile((scriptTitle || "Script").trim() || "Script"),
        version: "v1",
        language: "lua",
        loading: true,
        codeReady: false,
        estimatedLines: null,
        saved: false,
        onSave: () => {},
        onView: () => {},
        stage: "Preparing",
        eta: null,
      });

      // --- Versioning: FE chooses next version number ---
      const plannedVersionNumber = nextVersionNumber(versionHistory);

      const artifactStart = await authedFetch(
        user,
        `${BACKEND_URL}/api/generate/artifact`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key":
              window.crypto?.randomUUID?.() ||
              Math.random().toString(36).slice(2, 26),
          },
          body: JSON.stringify({
            projectId: projectIdToUse,
            prompt: cleaned,
            pipelineId:
              window.crypto?.randomUUID?.() ||
              Math.random().toString(36).slice(2, 26),
            outline: outline || [{ heading: "Plan", bulletPoints: [] }],
            settings: {
              modelVersion: settings.modelVersion,
              temperature: settings.creativity,
              codeStyle: settings.codeStyle,
            },
            versionNumber: plannedVersionNumber,
          }),
          signal: abortController.signal,
        }
      );

      let jobId, pipelineId;
      try {
        const jobStartData = await artifactStart.json();
        jobId = jobStartData.jobId;
        pipelineId = jobStartData.pipelineId;
      } catch {
        throw new Error("Failed to start code generation job.");
      }

      // 7) Poll status (with backoff, abort, Retry-After)
      pollingTimesRef.current = [];
      let lastStage = "";
      const jobResult = await pollJob(
        user,
        jobId,
        (tick) => {
          const stage = tick.stage || "";
          let mappedStep = "preparing";
          if (/prepar/i.test(stage)) mappedStep = "preparing";
          else if (/call/i.test(stage)) mappedStep = "calling model";
          else if (/post/i.test(stage)) mappedStep = "post-processing";
          else if (/polish/i.test(stage)) mappedStep = "polishing";
          else if (/final/i.test(stage)) mappedStep = "finalizing";
          setGenerationStep(mappedStep);

          if (tick.stage !== lastStage) {
            pollingTimesRef.current.push(Date.now());
            if (pollingTimesRef.current.length > 5) pollingTimesRef.current.shift();
            lastStage = tick.stage;
          }
          let eta = null;
          if (pollingTimesRef.current.length > 1) {
            const diffs = [];
            for (let i = 1; i < pollingTimesRef.current.length; ++i) {
              diffs.push(pollingTimesRef.current[i] - pollingTimesRef.current[i - 1]);
            }
            const avg = diffs.reduce((a, b) => a + b, 0) / diffs.length;
            eta = Math.round(avg / 1000);
          }
          setLoadingBarData((prev) => ({
            ...prev,
            estimatedLines: undefined,
            stage,
            eta,
          }));
        },
        { signal: abortController.signal }
      );

      if (jobResult.status !== "succeeded")
        throw new Error(jobResult.error || "Generation failed");
      const { code: generatedCode, versionId } = jobResult.result;
      const code = generatedCode || "";
      if (!code) throw new Error("Failed to generate code");

      // 8) Get versions (always use backend version numbers)
      setGenerationStep("saving");
      let versions = [];
      try {
        const versionsRes = await authedFetch(
          user,
          `${BACKEND_URL}/api/projects/${projectIdToUse}/versions`,
          { method: "GET", signal: abortController.signal }
        );
        if (versionsRes.ok) {
          const versionsData = await versionsRes.json();
          versions = Array.isArray(versionsData.versions)
            ? versionsData.versions.map(normalizeServerVersion).sort(byVN)
            : [];
        }
      } catch {}

      if (versions.length === 0) {
        versions = [
          normalizeServerVersion({
            id: versionId || `local-${Date.now()}`,
            title: scriptTitle,
            explanation,
            code,
            versionNumber: plannedVersionNumber,
            createdAt: new Date().toISOString(),
            projectId: projectIdToUse,
          }),
        ];
      }

      const sorted = versions;

      setVersionHistory(sorted);
      setCurrentScript({
        id: projectIdToUse,
        title: scriptTitle,
        versions: sorted,
      });
      setSelectedVersion(sorted[0]);

      setLoadingBarData((prev) => ({
        ...prev,
        loading: false,
        codeReady: true,
        saved: true,
        version: sorted[0]?.versionNumber
          ? `v${sorted[0].versionNumber}`
          : `v1`,
        filename: safeFile((scriptTitle || "Script").trim() || "Script"),
        onSave: () => {},
        onView: () => {},
      }));
      setTimeout(() => setLoadingBarVisible(false), 1500);

      // 9) Finalize assistant msg + persist in chat (update the SAME Firestore message by pendingId)
      setMessages((prev) => {
        const copy = [...prev];
        const idx = copy.findIndex((m) => m.id === pendingId);
        const backendVersion = plannedVersionNumber;
        const finalized = {
          ...(idx !== -1
            ? copy[idx]
            : {
                id: pendingId,
                role: "assistant",
                createdAt: new Date().toISOString(),
              }),
          content: explanation,
          projectId: projectIdToUse,
          versionId: sorted[0]?.id || versionId,
          versionNumber: backendVersion,
          explanation,
          pending: false,
          localOnly: false,
        };
        if (idx !== -1) copy[idx] = finalized;
        else copy.push(finalized);
        return copy;
      });

      try {
        const db = getFirestore();
        const authUser = auth.currentUser;
        if (authUser && chatIdToUse) {
          const chatRef = doc(db, "users", authUser.uid, "chats", chatIdToUse);
          const msgRef = doc(collection(chatRef, "messages"), pendingId);
          await updateDoc(msgRef, {
            projectId: projectIdToUse,
            versionId: sorted[0]?.id || versionId || null,
            versionNumber: plannedVersionNumber,
            pending: false,
            localOnly: false,
            updatedAt: serverTimestamp(),
          });
          await updateDoc(chatRef, {
            lastMessage: `v${sorted[0]?.versionNumber || 1} ready`,
            updatedAt: serverTimestamp(),
          });
          window.dispatchEvent(
            new CustomEvent("nexus:chatActivity", {
              detail: {
                id: chatIdToUse,
                lastMessage: `v${sorted[0]?.versionNumber || 1} ready`,
              },
            })
          );
        }
      } catch (err) {
        setErrorMsg("Could not update assistant message with code.");
      }

      setGenerationStep("done");
      setShowCelebration(true);
      setAnimatedScriptIds((prev) => ({ ...prev, [projectIdToUse]: true }));
      setTimeout(() => setShowCelebration(false), 3000);
      setTimeout(
        () =>
          setSuccessMsg(
            `Saved ${sorted[0]?.versionNumber ? `v${sorted[0].versionNumber}` : "v1"}`
          ),
        500
      );

      setTokensLeft((prev) =>
        prev == null ? null : Math.max(0, (prev || 4) - 1)
      );

      window.dispatchEvent(
        new CustomEvent("nexus:codeReady", {
          detail: { projectId: projectIdToUse, versionId: sorted[0]?.id },
        })
      );
    } catch (err) {
      setErrorMsg("Error during script generation: " + (err.message || err));
    } finally {
      setIsGenerating(false);
      setGenerationStep("idle");
      jobAbortRef.current?.abort();
      jobAbortRef.current = null;
    }
  };

  // --- Keyboard UX for textarea (single Enter rule, IME safe) ---
  const handlePromptKeyDown = (e) => {
    if (e.isComposing) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // --- Virtualized version list for long histories ---
  const renderVersionList = (props) => {
    if (versionHistory.length > 80) {
      return (
        <List
          height={400}
          itemCount={versionHistory.length}
          itemSize={56}
          width="100%"
        >
          {({ index, style }) => {
            const v = versionHistory[index];
            return (
              <div style={style} key={v.id}>
                {props.renderVersion(v)}
              </div>
            );
          }}
        </List>
      );
    }
    return versionHistory.map(props.renderVersion);
  };

  return (
    <React.Fragment>
      {showOnboarding && <OnboardingContainer />}
      <div
        className="min-h-screen bg-[#0D0D0D] text-white font-sans flex flex-col relative"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 60% 0%, rgba(155,93,229,0.08) 0%, rgba(0,0,0,0) 70%), radial-gradient(ellipse at 0% 100%, rgba(0,245,212,0.06) 0%, rgba(0,0,0,0) 80%)",
        }}
      >
        {/* Header */}
        <header className="border-b border-gray-800 bg-black/30 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center">
          {/* Hamburger for mobile */}
          <button
            type="button"
            className="md:hidden text-gray-300 mr-2 p-2 rounded hover:bg-gray-800 transition-colors"
            onClick={() => {
              setMobileLeftSidebarOpen(true);
              setMobileRightSidebarOpen(false);
            }}
            aria-label="Open sidebar"
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="flex-1 flex items-center">
            <div
              className="text-2xl font-bold bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text cursor-pointer"
              onClick={() => navigate("/")}
              tabIndex={0}
              aria-label="Go to home"
            >
              NexusRBX
            </div>
            <nav className="hidden md:flex space-x-8 ml-10">
              <button
                type="button"
                onClick={() => navigate("/")}
                className="text-gray-300 hover:text-white transition-colors duration-300"
              >
                Home
              </button>
              <button
                type="button"
                onClick={() => navigate("/ai")}
                className="text-white border-b-2 border-[#9b5de5] transition-colors duration-300"
              >
                AI Console
              </button>
              <button
                type="button"
                onClick={() => navigate("/docs")}
                className="text-gray-300 hover:text-white transition-colors duration-300"
              >
                Docs
              </button>
              <button
                type="button"
                onClick={() =>
                  window.open(
                    "https://discord.com/invite/yourserver",
                    "_blank",
                    "noopener,noreferrer"
                  )
                }
                className="text-gray-300 hover:text-white transition-colors duration-300"
              >
                Discord
              </button>
            </nav>
          </div>
          {/* Settings icon for mobile */}
          <button
            className="md:hidden text-gray-300 ml-2 p-2 rounded hover:bg-gray-800 transition-colors"
            onClick={() => {
              setMobileRightSidebarOpen(true);
              setMobileLeftSidebarOpen(false);
            }}
            aria-label="Open settings"
          >
            <Settings className="h-6 w-6" />
          </button>
        </div>
      </header>
      {/* Notification stack (top left) */}
      <div className="fixed top-6 left-6 z-[9999] flex flex-col items-start pointer-events-none">
        {notifications.map((n) => (
          <NotificationToast
            key={n.id}
            message={n.message}
            type={n.type}
            duration={n.duration}
            onClose={() =>
              setNotifications((prev) => prev.filter((x) => x.id !== n.id))
            }
          />
        ))}
      </div>
      {/* --- Mobile Left Sidebar --- */}
      <div
        className={`fixed inset-0 z-[100] md:hidden transition-all duration-300 ${
          mobileLeftSidebarOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
        aria-modal={mobileLeftSidebarOpen}
        style={{ display: mobileLeftSidebarOpen ? "block" : "none" }}
      >
        {/* Overlay */}
        <div
          className={`fixed inset-0 bg-black/60 transition-opacity duration-300 ${
            mobileLeftSidebarOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={closeAllMobileSidebars}
        />
        {/* Sidebar */}
        <aside
          className={`fixed top-0 left-0 h-full bg-gray-900 border-r border-gray-800 w-[80vw] max-w-xs z-[101] shadow-2xl transition-transform duration-300 ${
            mobileLeftSidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-800">
            <span className="font-bold text-lg bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">
              Menu
            </span>
            <button
              className="p-2 rounded hover:bg-gray-800 transition-colors"
              onClick={closeAllMobileSidebars}
              aria-label="Close sidebar"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          </div>
          <SidebarContent
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            handleClearChat={() => {
              if (!window.confirm("Clear this chat?")) return;
              setCurrentScript(null);
              setVersionHistory([]);
              setMessages([]);
              setSelectedVersion(null);
              setCurrentScriptId(null);
              setCurrentChatId(null);
              setCurrentChatMeta(null);
            }}
            setPrompt={setPrompt}
            scripts={scripts}
            currentScriptId={currentScriptId}
            setCurrentScriptId={setCurrentScriptId}
            handleCreateScript={handleCreateScript}
            handleRenameScript={handleRenameScript}
            handleDeleteScript={handleDeleteScript}
            currentScript={currentScript}
            versionHistory={versionHistory}
            onVersionView={handleVersionView}
            onVersionDownload={handleVersionDownload}
            promptSearch={promptSearch}
            setPromptSearch={setPromptSearch}
            isMobile
            onRenameChat={handleRenameChat}
            onDeleteChat={handleDeleteChat}
            renderVersionList={renderVersionList}
          />
        </aside>
      </div>

      {/* --- Mobile Right Sidebar --- */}
      <div
        className={`fixed inset-0 z-[100] md:hidden transition-all duration-300 ${
          mobileRightSidebarOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
        aria-modal={mobileRightSidebarOpen}
        style={{ display: mobileRightSidebarOpen ? "block" : "none" }}
      >
        {/* Overlay */}
        <div
          className={`fixed inset-0 bg-black/60 transition-opacity duration-300 ${
            mobileRightSidebarOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={closeAllMobileSidebars}
        />
        {/* Sidebar */}
        <aside
          className={`fixed top-0 right-0 h-full bg-gray-900 border-l border-gray-800 w-[80vw] max-w-xs z-[101] shadow-2xl transition-transform duration-300 ${
            mobileRightSidebarOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-800">
            <span className="font-bold text-lg bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">
              Settings
            </span>
            <button
              className="p-2 rounded hover:bg-gray-800 transition-colors"
              onClick={closeAllMobileSidebars}
              aria-label="Close settings"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>
          <RightSidebar
            settings={settings}
            setSettings={setSettings}
            modelOptions={modelOptions}
            creativityOptions={creativityOptions}
            codeStyleOptions={codeStyleOptions}
            messages={messages}
            setPrompt={setPrompt}
            userPromptTemplates={userPromptTemplates}
            setUserPromptTemplates={setUserPromptTemplates}
            promptSuggestions={promptSuggestions}
            promptSuggestionLoading={promptSuggestionLoading}
            isMobile
          />
        </aside>
      </div>

      {/* Sidebar (desktop) */}
      <aside
        className="hidden md:flex w-80 bg-gray-900 border-r border-gray-800 flex-col sticky top-[64px] left-0 z-30 h-[calc(100vh-64px)]"
        style={{
          minHeight: "calc(100vh - 64px)",
          maxHeight: "calc(100vh - 64px)",
        }}
      >
        <SidebarContent
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          handleClearChat={() => {
            if (!window.confirm("Clear this chat?")) return;
            setCurrentScript(null);
            setVersionHistory([]);
            setMessages([]);
            setSelectedVersion(null);
            setCurrentScriptId(null);
            setCurrentChatId(null);
            setCurrentChatMeta(null);
          }}
          setPrompt={setPrompt}
          scripts={scripts}
          currentScriptId={currentScriptId}
          setCurrentScriptId={setCurrentScriptId}
          handleCreateScript={handleCreateScript}
          handleRenameScript={handleRenameScript}
          handleDeleteScript={handleDeleteScript}
          currentScript={currentScript}
          versionHistory={versionHistory}
          onVersionView={handleVersionView}
          onVersionDownload={handleVersionDownload}
          promptSearch={promptSearch}
          setPromptSearch={setPromptSearch}
          onRenameChat={handleRenameChat}
          onDeleteChat={handleDeleteChat}
          renderVersionList={renderVersionList}
        />
      </aside>

      {/* Main Content */}
      <main className="flex-grow flex flex-col md:flex-row relative">
        {/* Main chat area */}
        <section className="flex-grow flex flex-col md:w-2/3 h-full relative z-10">
          <div className="flex-grow overflow-y-auto px-2 md:px-4 py-6 flex flex-col items-center">
            <div className="w-full mx-auto space-y-6">
              {/* Show Title at Top */}
              {messages.length === 0 && !isGenerating ? (
                <WelcomeCard
                  setPrompt={setPrompt}
                  promptTemplates={promptTemplates}
                  userPromptTemplates={userPromptTemplates}
                  promptSuggestions={promptSuggestions}
                  promptSuggestionLoading={promptSuggestionLoading}
                />
              ) : (
                <>
                  {/* Chat timeline driven by `messages` */}
                  {messages.map((m) => {
                    const isUser = m.role === "user";
                    if (isUser) {
                      return (
                        <div key={m.id} className="flex justify-end items-end mb-1">
                          <div className="flex flex-row-reverse items-end gap-2 w-full max-w-2xl">
                            <UserAvatar email={user?.email} />
                            <div className="bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-white px-4 py-2 rounded-2xl rounded-br-sm shadow-lg max-w-[75%] text-right break-words text-base font-medium animate-fade-in">
                              {m.content}
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // assistant bubble
                    const coreText = m.explanation || m.content || "";
                    const size = getAiBubbleSizing(coreText);
                    const ver = m.versionId
                      ? versionHistory.find((v) => v.id === m.versionId)
                      : versionHistory.find((v) => getVN(v) === getVN(m));

                    return (
                      <div
                        key={m.id}
                        className={`flex items-start gap-2 w-full ${size.wrapClass} mx-auto animate-fade-in`}
                      >
                        <NexusRBXAvatar />
                        <div
                          className={`flex-1 bg-gray-900/80 border border-gray-800 rounded-2xl rounded-tl-sm shadow-lg mb-2 ${size.bubbleClass}`}
                        >
                          <div className="mb-1 flex items-center gap-2">
                            <span className="text-xl font-bold bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">
                              {(currentScript?.title || "Script").replace(/\s*v\d+$/i, "")}
                            </span>
                            {m.versionNumber && (
                              <span className="ml-2 px-2 py-0.5 rounded bg-[#9b5de5]/20 text-[#9b5de5] text-xs font-semibold">
                                v{getVN(m)}
                              </span>
                            )}
                            {m.pending && (
                              <span className="ml-2 px-2 py-0.5 rounded bg-[#00f5d4]/20 text-[#00f5d4] text-xs font-semibold">
                                Generating…
                              </span>
                            )}
                          </div>

                          {m.explanation && (
                            <div className="mb-2">
                              <div className="font-bold text-[#9b5de5] mb-1">Explanation</div>
                              <div className="text-gray-200 whitespace-pre-line text-base">
                                {m.explanation}
                              </div>
                            </div>
                          )}

                          <div className="mb-2 mt-3">
                            <ScriptLoadingBarContainer
                              filename={safeFile((currentScript?.title || "Script").trim() || "Script")}
                              displayName={currentScript?.title || "Script"}
                              version={m.versionNumber ? `v${getVN(m)}` : ""}
                              language="lua"
                              loading={!!m.pending || !!isGenerating || loadingBarVisible}
                              codeReady={!!ver?.code}
                              estimatedLines={ver?.code ? ver.code.split("\n").length : null}
                              saved={!!ver?.code}
                              onSave={async () => {
                                const prev = versionHistory;
                                setVersionHistory((v) => [
                                  { ...v[0], versionNumber: getVN(v[0]) + 1 },
                                  ...v,
                                ]);
                                try {
                                  if (!user || !ver?.code) return false;
                                  let scriptId = currentScriptId || ver.projectId;
                                  if (!scriptId) return false;
                                  const vn = nextVersionNumber(versionHistory);
                                  const res = await authedFetch(
                                    user,
                                    `${BACKEND_URL}/api/projects/${scriptId}/versions`,
                                    {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({
                                        code: ver.code,
                                        explanation: ver.explanation || "",
                                        title: currentScript?.title || "Script",
                                        versionNumber: vn,
                                      }),
                                    }
                                  );
                                  if (!res.ok) {
                                    setVersionHistory(prev);
                                    const t = await res.text();
                                    setErrorMsg(
                                      `Save failed: ${res.status} ${res.statusText} - ${t.slice(
                                        0,
                                        120
                                      )}`
                                    );
                                    return false;
                                  }
                                  lastVersionsFetchRef.current = 0;
                                  versionsBackoffRef.current = 0;
                                  setSuccessMsg(`Saved v${vn}`);
                                  try {
                                    const versionsRes = await authedFetch(
                                      user,
                                      `${BACKEND_URL}/api/projects/${scriptId}/versions`,
                                      { method: "GET" }
                                    );
                                    if (versionsRes.ok) {
                                      const { versions = [] } = await versionsRes.json();
                                      const sorted = versions
                                        .map(normalizeServerVersion)
                                        .sort(byVN);
                                      setVersionHistory(sorted);
                                      setCurrentScript({
                                        id: scriptId,
                                        title: currentScript?.title || "Script",
                                        versions: sorted,
                                      });
                                      setSelectedVersion(sorted[0]);
                                    }
                                  } catch {}
                                  return true;
                                } catch (e) {
                                  setVersionHistory(prev);
                                  setErrorMsg(`Save error: ${e.message || e}`);
                                  return false;
                                }
                              }}
                              onView={() => {
                                if (ver) setSelectedVersion(ver);
                              }}
                              jobStage={loadingBarData.stage}
                              etaSeconds={loadingBarData.eta}
                            />
                          </div>

                          <div className="text-xs text-gray-500 mt-2 text-right">
                            {toLocalTime(m.createdAtMs || m.createdAt)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
              {/* Loading bar appears just below the latest script output */}
              {(() => {
                const last = messages[messages.length - 1];
                return last?.role === "assistant" && last?.pending;
              })() && (
                <div className="flex items-center text-gray-400 text-sm mt-2 animate-fade-in">
                  <span className="mr-2">
                    <span className="inline-block w-8 h-8 rounded-full bg-gradient-to-br from-[#9b5de5] to-[#00f5d4] flex items-center justify-center shadow-lg overflow-hidden animate-pulse">
                      <img
                        src="/logo.png"
                        alt="NexusRBX"
                        className="w-6 h-6 object-contain"
                        style={{ filter: "drop-shadow(0 0 2px #9b5de5)" }}
                      />
                    </span>
                  </span>
                  <span aria-live="polite">
                    NexusRBX is typing...
                    {["preparing", "calling model", "post-processing", "polishing", "finalizing"].includes(
                      generationStep
                    ) && (
                      <>
                        {" "}
                        ({loadingBarData.stage || generationStep}
                        {loadingBarData.eta ? `, ETA: ${loadingBarData.eta}s` : ""})
                      </>
                    )}
                  </span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
          {/* Input Area */}
          <div
            className="border-t border-gray-800 bg-black/30 px-2 md:px-4 py-4 flex flex-col items-center shadow-inner"
            aria-busy={isGenerating}
          >
            {/* Token Bar */}
            <div className="w-full max-w-2xl mx-auto mb-2">
              <TokenBar
                tokensLeft={tokensLeft}
                tokenLimit={TOKEN_LIMIT}
                refreshTime={tokenRefreshTime}
                isDev={!!user?.email && user.email.toLowerCase() === DEV_EMAIL}
              />
            </div>
            {/* Fancy Loading Overlay */}
            <div className="w-full max-w-2xl mx-auto">
              <FancyLoadingOverlay
                visible={
                  isGenerating &&
                  !(
                    messages.some(
                      (m) => m.role === "assistant" && !m.pending
                    )
                  )
                }
              />
            </div>
            <form
              onSubmit={handleSubmit}
              className="w-full max-w-2xl mx-auto"
              autoComplete="off"
            >
              <div className="relative">
                <textarea
                  ref={promptInputRef}
                  value={typeof prompt === "string" ? prompt : ""}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={handlePromptKeyDown}
                  placeholder="Describe the Roblox mod you want to create..."
                  className={`w-full rounded-lg bg-gray-900/60 border border-gray-700 focus:border-[#9b5de5] focus:outline-none focus:ring-2 focus:ring-[#9b5de5]/50 transition-all duration-300 py-3 px-4 pr-14 resize-none shadow-lg ${
                    promptError ? "border-red-500" : ""
                  }`}
                  rows="3"
                  disabled={isGenerating}
                  maxLength={800}
                  aria-label="Prompt input"
                ></textarea>
                {/* Prompt Autocomplete Dropdown */}
                {promptAutocomplete.length > 0 && !isGenerating && (
                  <div className="absolute left-0 right-0 top-full z-30 bg-gray-900 border border-gray-700 rounded-b-lg shadow-lg">
                    {promptAutocomplete.map((sugg, i) => (
                      <button
                        key={i}
                        type="button"
                        className="block w-full text-left px-4 py-2 text-sm hover:bg-[#9b5de5]/20 text-gray-200"
                        onClick={() => {
                          setPrompt(sugg);
                          setPromptAutocomplete([]);
                        }}
                      >
                        <span className="font-semibold">{sugg}</span>
                      </button>
                    ))}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={
                    isGenerating ||
                    !(typeof prompt === "string" && prompt.trim()) ||
                    prompt.length > 800
                  }
                  className={`absolute right-3 bottom-3 p-3 rounded-full shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#9b5de5] ${
                    isGenerating ||
                    !(typeof prompt === "string" && prompt.trim()) ||
                    prompt.length > 800
                      ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-white hover:shadow-xl hover:scale-110"
                  }`}
                  aria-label="Send prompt"
                  title="Enter to send • Shift+Enter for newline"
                >
                  {isGenerating ? (
                    <Loader className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </button>
              </div>
              <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                <div>
                  <span className={promptCharCount > 800 ? "text-red-400" : ""}>
                    {promptCharCount}/800
                  </span>
                  <span className="ml-2">Press Enter to submit</span>
                </div>
              </div>
              {promptError && (
                <div className="mt-2 text-xs text-red-400">{promptError}</div>
              )}
              {errorMsg && (
                <div className="mt-2 text-xs text-red-400">{errorMsg}</div>
              )}
              {!user && (
                <div className="mt-2 text-xs text-red-400">
                  Sign in to generate scripts.
                </div>
              )}
            </form>
          </div>
        </section>
        {/* Right Sidebar */}
        <aside
          className="hidden md:flex w-80 bg-gray-900 border-l border-gray-800 flex-col fixed right-0 top-[64px] z-30 h-[calc(100vh-64px)]"
          style={{
            minHeight: "calc(100vh - 64px)",
            maxHeight: "calc(100vh - 64px)",
          }}
        >
          <RightSidebar
            settings={settings}
            setSettings={setSettings}
            modelOptions={modelOptions}
            creativityOptions={creativityOptions}
            codeStyleOptions={codeStyleOptions}
            messages={messages}
            setPrompt={setPrompt}
            userPromptTemplates={userPromptTemplates}
            setUserPromptTemplates={setUserPromptTemplates}
            promptSuggestions={promptSuggestions}
            promptSuggestionLoading={promptSuggestionLoading}
          />
        </aside>
      </main>
      {/* --- Code Drawer Integration --- */}
      {selectedVersion && (
        <SimpleCodeDrawer
          open={!!selectedVersion}
          code={selectedVersion.code}
          title={selectedVersion.title}
          filename={safeFile(
            (selectedVersion?.title || currentScript?.title || "Script").trim() ||
              "Script"
          )}
          version={
            selectedVersion.versionNumber
              ? `v${getVN(selectedVersion)}`
              : ""
          }
          onClose={() => setSelectedVersion(null)}
          onSaveScript={async (newTitle, code, explanation = "") => {
            const prev = versionHistory;
            setVersionHistory((v) => [
              { ...v[0], versionNumber: getVN(v[0]) + 1 },
              ...v,
            ]);
            try {
              if (!user || !code) return false;
              let scriptId = currentScriptId;
              if (!scriptId && selectedVersion?.projectId) {
                scriptId = selectedVersion.projectId;
              }
              if (!scriptId) {
                const resCreate = await authedFetch(
                  user,
                  `${BACKEND_URL}/api/projects`,
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ title: newTitle || "Script" }),
                  }
                );
                if (!resCreate.ok) {
                  setVersionHistory(prev);
                  setErrorMsg("Failed to create new script for saving.");
                  return false;
                }
                const data = await resCreate.json();
                scriptId = data.projectId;
                setCurrentScriptId(scriptId);
              }
              const vn = nextVersionNumber(versionHistory);
              const res = await authedFetch(
                user,
                `${BACKEND_URL}/api/projects/${scriptId}/versions`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    code,
                    explanation,
                    title: newTitle || (currentScript?.title || "Script"),
                    versionNumber: vn,
                  }),
                }
              );
              if (!res.ok) {
                setVersionHistory(prev);
                const t = await res.text();
                setErrorMsg(
                  `Save failed: ${res.status} ${res.statusText} - ${t.slice(
                    0,
                    120
                  )}`
                );
                return false;
              }
              lastVersionsFetchRef.current = 0;
              versionsBackoffRef.current = 0;
              notify({ message: "Saved new version", type: "success" });
              try {
                const versionsRes = await authedFetch(
                  user,
                  `${BACKEND_URL}/api/projects/${scriptId}/versions`,
                  { method: "GET" }
                );
                if (versionsRes.ok) {
                  const versionsData = await versionsRes.json();
                  const versions = Array.isArray(versionsData.versions)
                    ? versionsData.versions.map(normalizeServerVersion).sort(byVN)
                    : [];
                  setVersionHistory(versions);
                  setCurrentScript({
                    id: scriptId,
                    title: newTitle || (currentScript?.title || "Script"),
                    versions,
                  });
                  setSelectedVersion(versions[0]);
                }
              } catch {}
              try {
                const db = getFirestore();
                const authUser = auth.currentUser;
                if (authUser && currentChatId) {
                  const chatRef = doc(
                    db,
                    "users",
                    authUser.uid,
                    "chats",
                    currentChatId
                  );
                  const msgRef = doc(collection(chatRef, "messages"));
                  await setDoc(msgRef, {
                    role: "assistant",
                    content: "Saved a new version.",
                    createdAt: serverTimestamp(),
                  });
                  await updateDoc(chatRef, {
                    lastMessage: "Saved a new version.",
                    updatedAt: serverTimestamp(),
                  });
                }
              } catch {}
              return true;
            } catch (e) {
              setVersionHistory(prev);
              setErrorMsg(`Save error: ${e.message || e}`);
              return false;
            }
          }}
          onLiveOpen={() => {}}
        />
      )}
      {/* Celebration Animation */}
      {showCelebration && <CelebrationAnimation />}
      {/* Footer */}
      <footer className="border-t border-gray-800 py-4 px-4 bg-black/40 text-center text-sm text-gray-500">
        <div className="max-w-6xl mx-auto">
          NexusRBX AI Console • &copy; 2023 NexusRBX. All rights reserved.
        </div>
      </footer>
      {/* Blinking cursor animation & fade-in */}
      <style>
        {`
          @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0; }
          }
          .animate-blink {
            animation: blink 1s step-end infinite;
          }
          @keyframes fade-in {
            from { opacity: 0; transform: translateY(16px);}
            to { opacity: 1; transform: translateY(0);}
          }
          .animate-fade-in {
            animation: fade-in 0.5s cubic-bezier(.4,0,.2,1) both;
          }
          .animate-pulse {
            animation: pulse 1.2s cubic-bezier(.4,0,.6,1) infinite;
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}
      </style>
    </div>
  );
}