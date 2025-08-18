import React, { useState, useEffect, useRef } from "react";
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

// --- Firestore Imports ---
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

// --- Backend API URL ---
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "https://nexusrbx-backend-production.up.railway.app";

// --- Token System Constants ---
const TOKEN_LIMIT = 4;
const TOKEN_REFRESH_HOURS = 48; // 2 days

// --- Developer Email for Infinite Tokens ---
const DEVELOPER_EMAIL = "jackt1263@gmail.com"; // CHANGE THIS TO YOUR DEV EMAIL

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

// --- Model Resolver ---
const resolveModel = (mv) => {
  switch (mv) {
    case "nexus-4":
      return "gpt-4.1-2025-04-14";
    case "nexus-2":
      return "gpt-3.5-turbo";
    case "nexus-3":
    default:
      return "gpt-4.1-2025-04-14";
  }
};

// --- Auth Retry Helper ---
async function authedFetch(user, url, init = {}, retry = true) {
  let idToken = await user.getIdToken();
  let res = await fetch(url, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${idToken}`,
    },
  });
  if (res.status === 401 && retry) {
    // Try to refresh token and retry once
    await user.getIdToken(true);
    idToken = await user.getIdToken();
    res = await fetch(url, {
      ...init,
      headers: {
        ...(init.headers || {}),
        Authorization: `Bearer ${idToken}`,
      },
    });
  }
  return res;
}

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
  let date;
  if (typeof ts === "number") date = new Date(ts);
  else if (typeof ts === "string") {
    const parsed = Date.parse(ts);
    if (!isNaN(parsed)) date = new Date(parsed);
    else return "";
  } else if (ts?.seconds) date = new Date(ts.seconds * 1000);
  else return "";
  if (!date || isNaN(date.getTime())) return "";
  return date.toLocaleString();
};

// --- Safe Filename Helper ---
const safeFile = (title) =>
  (title || "Script").replace(/[^a-zA-Z0-9_\- ]/g, "").replace(/\s+/g, "_").slice(0, 40) + ".lua";

// --- Stable Hash Helper ---
function hash(str) {
  let h = 0, i, chr;
  if (!str) return "0";
  for (i = 0; i < str.length; i++) {
    chr = str.charCodeAt(i);
    h = (h << 5) - h + chr;
    h |= 0;
  }
  return Math.abs(h).toString(16);
}

// --- Outline → Explanation Helper ---
function outlineToExplanationText(outline = []) {
  if (!Array.isArray(outline)) return "";
  return outline
    .map(sec => {
      const heading = sec?.heading ? `## ${sec.heading}` : "";
      const bullets = (sec?.bulletPoints || [])
        .map(b => `• ${b}`)
        .join("\n");
      return [heading, bullets].filter(Boolean).join("\n");
    })
    .join("\n\n");
}

// --- Polling Utility ---
async function pollJob(user, jobId, onTick, { intervalMs = 1200, maxMs = 120000, signal } = {}) {
  const started = Date.now();
  let status = "running";
  while (Date.now() - started < maxMs) {
    if (signal?.aborted) throw new Error("Aborted");
    const res = await authedFetch(user, `${BACKEND_URL}/api/jobs/${jobId}`, { method: "GET", signal });
    const data = await res.json().catch(() => ({}));
    if (onTick) onTick(data);
    status = data.status;
    if (status === "succeeded" || status === "failed") return data;
    await new Promise(r => setTimeout(r, intervalMs));
  }
  return { status: "failed", error: "Timeout" };
}

export default function NexusRBXAIPageContainer() {
  const navigate = useNavigate();

  // --- State for scripts and versions ---
  const [user, setUser] = useState(null);
  const [scripts, setScripts] = useState([]); // (reserved for future /list route)
  const [currentScriptId, setCurrentScriptId] = useState(null);
  const [currentScript, setCurrentScript] = useState(null); // { id, title }
  const [versionHistory, setVersionHistory] = useState([]); // authoritative versions from backend (DESC)
  const [selectedVersion, setSelectedVersion] = useState(null);

  // Chat timeline: ordered messages
  // { id, role: 'user'|'assistant', content, createdAt, versionId?, versionNumber?, code?, explanation? }
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
  const [errorMsg, setErrorMsg] = useState(""); // Inline error
  const [successMsg, setSuccessMsg] = useState(""); // Inline success toast
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState("idle"); // idle | title | explanation | code | done | preparing | calling model | post-processing | polishing | finalizing
  const [showCelebration, setShowCelebration] = useState(false);

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
  const [animatedScriptIds, setAnimatedScriptIds] = useState({}); // { [scriptId]: true }

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

  // --- Local Persistence for chat/sidebar ---
  useEffect(() => {
    if (currentScript) localStorage.setItem("nexusrbx:currentScript", JSON.stringify(currentScript));
  }, [currentScript]);

  useEffect(() => {
    localStorage.setItem("nexusrbx:versionHistory", JSON.stringify(versionHistory || []));
  }, [versionHistory]);

  useEffect(() => {
    localStorage.setItem(`nexusrbx:messages:${currentScriptId || "none"}`, JSON.stringify(messages || []));
  }, [messages, currentScriptId]);

  useEffect(() => {
    const cachedScript = localStorage.getItem("nexusrbx:currentScript");
    if (cachedScript) setCurrentScript(JSON.parse(cachedScript));
    const cachedVersions = localStorage.getItem("nexusrbx:versionHistory");
    if (cachedVersions) setVersionHistory(JSON.parse(cachedVersions));
    const cachedScripts = localStorage.getItem("nexusrbx:scripts");
    if (cachedScripts) setScripts(JSON.parse(cachedScripts));
    // No auto-restore of project/chat here
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

  // --- Listen for SidebarContent’s open-chat event and start-draft event ---
  const openChatById = React.useCallback((chatId) => {
    const db = getFirestore();
    const authUser = auth.currentUser;
    if (!authUser || !chatId) return;

    // clean previous listeners
    if (messagesUnsubRef.current) { try { messagesUnsubRef.current(); } catch {} messagesUnsubRef.current = null; }
    if (chatUnsubRef.current) { try { chatUnsubRef.current(); } catch {} chatUnsubRef.current = null; }

    setCurrentChatId(chatId);

    // chat meta
    const chatDocRef = doc(db, "users", authUser.uid, "chats", chatId);
    chatUnsubRef.current = onSnapshot(chatDocRef, (snap) => {
      const data = snap.exists() ? { id: snap.id, ...snap.data() } : null;
      setCurrentChatMeta(data || null);
      if (data?.projectId) {
        setCurrentScriptId(data.projectId);
      }
    });

    // messages (last 200, oldest→newest)
    const msgsRef = collection(db, "users", authUser.uid, "chats", chatId, "messages");
    const qMsgs = query(msgsRef, orderBy("createdAt", "asc"), limitToLast(200));
    messagesUnsubRef.current = onSnapshot(qMsgs, (snap) => {
      const arr = [];
      snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
      // Deduplicate by clientId if present (fallback to Firestore doc id)
      const seen = new Set();
      const unique = arr.filter((m) => {
        const key = m.clientId || m.id;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setMessages(unique);
    });
  }, [setCurrentScriptId, setMessages]);

  // Listen for sidebar events: open chat and start draft
  useEffect(() => {
    const onOpenChat = (e) => {
      const id = e?.detail?.id;
      if (id) openChatById(id);
    };
    const onStartDraft = () => {
      // Reset to draft state (no Firestore chat yet)
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
    return () => {
      window.removeEventListener("nexus:openChat", onOpenChat);
      window.removeEventListener("nexus:startDraft", onStartDraft);
    };
  }, [openChatById]);

  // --- Load Versions for Current Script from Backend ---
  useEffect(() => {
    if (!authReady) return; // wait until auth resolves
    if (!user || !currentScriptId) return; // don't clear; keep what we have

    const now = Date.now();
    const delay = 10000 + (versionsBackoffRef.current || 0);
    if (now - lastVersionsFetchRef.current < delay) return;
    lastVersionsFetchRef.current = now;

    user.getIdToken().then((idToken) => {
      const headers = { Authorization: `Bearer ${idToken}` };
      if (versionsEtagRef.current) headers["If-None-Match"] = versionsEtagRef.current;

      fetch(`${BACKEND_URL}/api/projects/${currentScriptId}/versions`, { headers })
        .then((res) => {
          if (res.status === 304) {
            // nothing new; collapse backoff
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
          return res.json().then(data => ({ ...data, etag }));
        })
        .then((data) => {
          if (!data) return;
          if (data.versions === null) return; // 304, keep what we have
          if (!Array.isArray(data.versions)) return;

          if (data.etag) versionsEtagRef.current = data.etag;

          const normalized = data.versions.map((v) => ({
            ...v,
            createdAt:
              typeof v.createdAt === "number"
                ? v.createdAt
                : Date.parse(v.createdAt) || Date.now(),
          }));
          if (normalized.length === 0) return;

          const sortedVersions = normalized.sort((a, b) => (b.version || 1) - (a.version || 1));

          setCurrentScript((cs) => ({
            id: currentScriptId,
            title: sortedVersions[0]?.title || cs?.title || "",
            versions: sortedVersions,
          }));
          setVersionHistory(sortedVersions);
          setSelectedVersion((sv) =>
            sv
              ? sortedVersions.find((v) => v.id === sv.id) || sortedVersions[0]
              : sortedVersions[0]
          );
        });
    });
    // eslint-disable-next-line
  }, [user, currentScriptId, authReady]);

  // --- Prompt Char Count & Error ---
  useEffect(() => {
    setPromptCharCount(prompt.length);
    if (prompt.length > 800) {
      setPromptError("Prompt too long (max 800 characters).");
    } else {
      setPromptError("");
    }
  }, [prompt]);

  // --- Debounced Prompt for Autocomplete ---
  const debouncedPrompt = useDebounce(prompt, 150);

  // --- Autocomplete logic (debounced) ---
  useEffect(() => {
    if (debouncedPrompt.length > 1) {
      const allPrompts = [
        ...promptTemplates,
        ...userPromptTemplates,
        ...promptHistory,
      ];
      const filtered = allPrompts
        .filter(
          (p) =>
            p.toLowerCase().startsWith(debouncedPrompt.toLowerCase()) &&
            p.toLowerCase() !== debouncedPrompt.toLowerCase()
        )
        .slice(0, 5);
      setPromptAutocomplete(filtered);
    } else {
      setPromptAutocomplete([]);
    }
  }, [debouncedPrompt, promptTemplates, userPromptTemplates, promptHistory]);

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
        try { jobAbortRef.current.abort(); } catch {}
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
    title,              // final title from AI
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

  // --- Sidebar Version Click Handler (no single-version GET) ---
  const handleVersionView = async (versionObj) => {
    setErrorMsg("");
    setSelectedVersion(versionObj);
    setCurrentScript((cs) => ({
      ...cs,
      title: versionObj?.title || cs?.title || "",
    }));
  };

  // --- Download Handler for Version ---
  const handleVersionDownload = (versionObj) => {
    const blob = new Blob([versionObj.code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const filename = safeFile(versionObj.title);
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // --- Script Management ---
  const handleCreateScript = async (title = "New Script") => {
    setErrorMsg("");
    if (!user) return;
    const res = await authedFetch(user, `${BACKEND_URL}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (res.ok) {
      const data = await res.json();
      setCurrentScriptId(data.projectId);
      localStorage.setItem("nexusrbx:lastProjectId", data.projectId);
    } else {
      setErrorMsg("Failed to create project.");
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
      // If the deleted chat is currently open, reset to draft
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

  // --- Token Bar Logic (simulate tokens for now) ---
  useEffect(() => {
    // Simulate token system for demo
    if (!user) {
      setTokensLeft(TOKEN_LIMIT);
      setTokenRefreshTime(null);
      return;
    }
    // For dev email, infinite tokens
    if (!!user?.email && user.email.toLowerCase() === DEVELOPER_EMAIL) {
      setTokensLeft(null); // null = unlimited
      setTokenRefreshTime(null);
      return;
    }
    // Otherwise, simulate tokens
    setTokensLeft(TOKEN_LIMIT - 0); // TODO: Replace with real backend logic
    setTokenRefreshTime(
      new Date(Date.now() + TOKEN_REFRESH_HOURS * 60 * 60 * 1000)
    );
  }, [user]);

  useEffect(() => {
  function onOpenCodeDrawer(e) {
    const scriptId = e?.detail?.scriptId;
    const code = e?.detail?.code;
    const title = e?.detail?.title;
    const version = e?.detail?.version;
    if (!scriptId) return;
    // If code is provided (from saved tab), open drawer immediately
    if (code) {
    setSelectedVersion({
      id: scriptId,
      code,
      title: title || "Script",
      version: version || "",
      explanation: "",
      createdAt: new Date().toISOString(),
    });
      return;
    }
    // If already loaded, open the latest version
    if (scriptId === currentScriptId && versionHistory.length > 0) {
      setSelectedVersion(versionHistory[0]);
    } else {
      setCurrentScriptId(scriptId);
      // When versionHistory loads, the code drawer will open automatically
    }
  }
  window.addEventListener("nexus:openCodeDrawer", onOpenCodeDrawer);
  return () => window.removeEventListener("nexus:openCodeDrawer", onOpenCodeDrawer);
}, [currentScriptId, versionHistory]);

  // --- Main Generation Flow (Handles both new script and new version) ---
const handleSubmit = async (e) => {
  e.preventDefault();
  setErrorMsg("");

  // guard rails
  if (typeof prompt !== "string" || !prompt.trim() || isGenerating) return;
  if (prompt.length > 800) {
    setPromptError("Prompt too long (max 800 characters).");
    return;
  }
  if (!user) {
    setErrorMsg("Sign in to generate scripts.");
    return;
  }

  // stable id for this user message (helps dedupe)
  const clientId = "u-" + Date.now();

  // clean prompt
  const cleaned = prompt.trim().replace(/\s+/g, " ");
  if (!cleaned) return;

  let chatIdToUse = currentChatId;

  // cancel any previous job
  if (jobAbortRef.current) {
    try { jobAbortRef.current.abort(); } catch {}
  }
  const abortController = new AbortController();
  jobAbortRef.current = abortController;

  try {
    setIsGenerating(true);
    setGenerationStep("title");
    setShowCelebration(false);

    // 1) Title
    const titleRes = await authedFetch(user, `${BACKEND_URL}/api/generate-title-advanced`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: cleaned,
        conversation: [],
        isNewScript: !currentScriptId,
        previousTitle: "",
        settings: {
          model: resolveModel(settings.modelVersion),
          temperature: settings.creativity,
        }
      }),
      signal: abortController.signal,
    });
    if (!titleRes.ok) {
      const text = await titleRes.text();
      throw new Error(`Failed to generate title: ${titleRes.status} ${titleRes.statusText} - ${text.slice(0,200)}`);
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
        window.dispatchEvent(new CustomEvent("nexus:chatActivity", {
          detail: { id: chatIdToUse, title: scriptTitle, lastMessage: cleaned }
        }));
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
      const createProjectRes = await authedFetch(user, `${BACKEND_URL}/api/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: scriptTitle || "Script" }),
      });
      if (!createProjectRes.ok) {
        const text = await createProjectRes.text();
        throw new Error(`Failed to create project: ${createProjectRes.status} ${createProjectRes.statusText} - ${text.slice(0,200)}`);
      }
      const created = await createProjectRes.json();
      projectIdToUse = created.projectId;
      setCurrentScriptId(projectIdToUse);

      // link chat -> project
      try {
        const db = getFirestore();
        const authUser = auth.currentUser;
        if (authUser && chatIdToUse) {
          await updateDoc(doc(db, "users", authUser.uid, "chats", chatIdToUse), {
            projectId: projectIdToUse,
            updatedAt: serverTimestamp(),
          });
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
        : (m.code ? "Provided code previously." : "Assistant response.");
      return { role: "assistant", content };
    });

    const outlineRes = await authedFetch(user, `${BACKEND_URL}/api/generate/outline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: projectIdToUse,
        prompt: cleaned,
        conversation,
        settings: {
          model: resolveModel(settings.modelVersion),
          temperature: settings.creativity,
          codeStyle: settings.codeStyle,
        },
      }),
    });
    if (!outlineRes.ok) {
      const text = await outlineRes.text();
      throw new Error(`Failed to generate outline: ${outlineRes.status} ${outlineRes.statusText} - ${text.slice(0,200)}`);
    }
    const outlineData = await outlineRes.json().catch(() => null);
    const outline = Array.isArray(outlineData?.outline) ? outlineData.outline : [];
    const explanation = outline
      .map(sec => {
        const heading = sec?.heading ? `## ${sec.heading}` : "";
        const bullets = (sec?.bulletPoints || []).map(b => `• ${b}`).join("\n");
        return [heading, bullets].filter(Boolean).join("\n");
      })
      .join("\n\n");
    if (!explanation) throw new Error("Failed to generate outline/explanation");

    // 5) Show pending assistant message with explanation
    const tempId = `temp-${Date.now()}`;
    const nextVersionNum = (versionHistory[0]?.version || 0) + 1;
    const pendingId = `a-temp-${Date.now()}`;
    setMessages(prev => [
      ...prev,
      {
        id: pendingId,
        role: "assistant",
        content: explanation,
        createdAt: new Date().toISOString(),
        versionNumber: nextVersionNum,
        explanation,
        code: "",
        pending: true,
      },
    ]);
    setAnimatedScriptIds(prev => ({ ...prev, [tempId]: true }));
    setCurrentScript({
      id: tempId,
      title: scriptTitle,
      versions: [
        { id: tempId, title: scriptTitle, explanation, code: "", version: 1, temp: true, createdAt: new Date().toISOString() },
      ],
    });
    setVersionHistory([
      { id: tempId, title: scriptTitle, explanation, code: "", version: 1, temp: true, createdAt: new Date().toISOString() },
    ]);
    setSelectedVersion({
      id: tempId, title: scriptTitle, explanation, code: "", version: 1, temp: true, createdAt: new Date().toISOString(),
    });

    // tiny pause for UI
    await new Promise((r) => setTimeout(r, 1000));

    // 6) Start code job
    setGenerationStep("preparing");
    setLoadingBarVisible(true);
    setLoadingBarData({
      filename: (scriptTitle || "Script").replace(/[^a-zA-Z0-9_\- ]/g, "").replace(/\s+/g, "_").slice(0, 40) + ".lua",
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

    const artifactStart = await authedFetch(user, `${BACKEND_URL}/api/generate/artifact`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": window.crypto?.randomUUID?.() || Math.random().toString(36).slice(2, 26),
      },
      body: JSON.stringify({
        projectId: projectIdToUse,
        prompt: cleaned,
        pipelineId: window.crypto?.randomUUID?.() || Math.random().toString(36).slice(2, 26),
        outline: outline || [{ heading: "Plan", bulletPoints: [] }],
        settings: {
          model: resolveModel(settings.modelVersion),
          temperature: settings.creativity,
          codeStyle: settings.codeStyle,
        },
      }),
    });

    let jobId, pipelineId;
    try {
      const jobStartData = await artifactStart.json();
      jobId = jobStartData.jobId;
      pipelineId = jobStartData.pipelineId;
    } catch {
      throw new Error("Failed to start code generation job.");
    }

    // 7) Poll status
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
        setLoadingBarData((prev) => ({ ...prev, estimatedLines: undefined, stage, eta }));
      },
      { intervalMs: 1200, maxMs: 120000, signal: abortController.signal }
    );

    if (jobResult.status !== "succeeded") throw new Error(jobResult.error || "Generation failed");
    const { code: generatedCode, versionId } = jobResult.result;
    const code = generatedCode || "";
    if (!code) throw new Error("Failed to generate code");

    // 8) Get versions (fallback if empty)
    setGenerationStep("saving");
    let versions = [];
    try {
      const versionsRes = await authedFetch(user, `${BACKEND_URL}/api/projects/${projectIdToUse}/versions`, { method: "GET" });
      if (versionsRes.ok) {
        const versionsData = await versionsRes.json();
        versions = Array.isArray(versionsData.versions) ? versionsData.versions : [];
      }
    } catch {}

    if (versions.length === 0) {
      versions = [{
        id: versionId || `local-${Date.now()}`,
        title: scriptTitle,
        explanation,
        code,
        version: 1,
        createdAt: new Date().toISOString(),
      }];
    }

    const sorted = versions
      .map(v => ({ ...v, createdAt: typeof v.createdAt === "number" ? v.createdAt : Date.parse(v.createdAt) || Date.now() }))
      .sort((a, b) => (b.version || 1) - (a.version || 1));

    setVersionHistory(sorted);
    setCurrentScript({ id: projectIdToUse, title: scriptTitle, versions: sorted });
    setSelectedVersion(sorted[0]);

    setLoadingBarData((prev) => ({
      ...prev,
      loading: false,
      codeReady: true,
      saved: true,
      version: sorted[0]?.version ? `v${sorted[0].version}` : `v1`,
      filename: (scriptTitle || "Script").replace(/[^a-zA-Z0-9_\- ]/g, "").replace(/\s+/g, "_").slice(0, 40) + ".lua",
      onSave: () => {},
      onView: () => {},
    }));
    setTimeout(() => setLoadingBarVisible(false), 1500);

    // 9) Finalize assistant msg + persist in chat
    const finalVersion = sorted[0]?.version || ((versionHistory[0]?.version || 0) + 1);
    setMessages(prev => {
      const copy = [...prev];
      const idx = copy.findIndex(m => m.role === "assistant" && m.pending);
      const finalized = {
        ...(idx !== -1 ? copy[idx] : { id: `a-${Date.now()}`, role: "assistant", createdAt: new Date().toISOString() }),
        content: explanation,
        versionId: sorted[0]?.id || versionId,
        versionNumber: finalVersion,
        code,
        explanation,
        pending: false,
      };
      if (idx !== -1) copy[idx] = finalized; else copy.push(finalized);
      return copy;
    });

    try {
      const db = getFirestore();
      const authUser = auth.currentUser;
      if (authUser && chatIdToUse) {
        const chatRef = doc(db, "users", authUser.uid, "chats", chatIdToUse);
        const msgRef = doc(collection(chatRef, "messages"));
        await setDoc(msgRef, {
          role: "assistant",
          content: explanation || "Generated code",
          code,
          versionId: sorted[0]?.id || versionId || null,
          versionNumber: sorted[0]?.version || finalVersion || 1,
          createdAt: serverTimestamp(),
        });
        await updateDoc(chatRef, {
          lastMessage: `v${sorted[0]?.version || finalVersion} ready`,
          updatedAt: serverTimestamp(),
        });
        window.dispatchEvent(new CustomEvent("nexus:chatActivity", {
          detail: { id: chatIdToUse, lastMessage: `v${sorted[0]?.version || finalVersion} ready` }
        }));
      }
    } catch {}

    setGenerationStep("done");
    setShowCelebration(true);
    setAnimatedScriptIds((prev) => ({ ...prev, [projectIdToUse]: true }));
    setTimeout(() => setShowCelebration(false), 3000);
    setTimeout(() => setSuccessMsg(`Saved ${sorted[0]?.version ? `v${sorted[0].version}` : "v1"}`), 500);

    // tokens (skip if dev)
    setTokensLeft((prev) => (prev == null ? null : Math.max(0, (prev || 4) - 1)));
  } catch (err) {
    setErrorMsg("Error during script generation: " + (err.message || err));
  } finally {
    setIsGenerating(false);
    setGenerationStep("idle");
  }
};

  // --- Keyboard UX for textarea ---
  const handlePromptKeyDown = (e) => {
    if ((e.key === "Enter" && !e.shiftKey) || ((e.ctrlKey || e.metaKey) && e.key === "Enter")) {
      e.preventDefault();
      handleSubmit(e);
    }
    // Add more keyboard shortcuts here if desired
  };

  return (
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
                onClick={() => window.open("https://discord.com/invite/yourserver", "_blank", "noopener,noreferrer")}
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
            mobileLeftSidebarOpen
              ? "translate-x-0"
              : "-translate-x-full"
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
              if (!window.confirm('Clear this chat?')) return;
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
            // Chat management
            onRenameChat={handleRenameChat}
            onDeleteChat={handleDeleteChat}
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
            mobileRightSidebarOpen
              ? "translate-x-0"
              : "translate-x-full"
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
            if (!window.confirm('Clear this chat?')) return;
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
          // Chat management
          onRenameChat={handleRenameChat}
          onDeleteChat={handleDeleteChat}
        />
      </aside>

      {/* Main Content */}
      <main className="flex-grow flex flex-col md:flex-row relative">
        {/* Main chat area */}
        <section className="flex-grow flex flex-col md:w-2/3 h-full relative z-10">
          <div className="flex-grow overflow-y-auto px-2 md:px-4 py-6 flex flex-col items-center">
            <div className="w-full max-w-2xl mx-auto space-y-6">
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
                    const isUser = m.role === 'user';

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
                    return (
                      <div key={m.id} className="flex items-start gap-2 w-full max-w-2xl animate-fade-in">
                        <NexusRBXAvatar />
                        <div className="flex-1 bg-gray-900/80 border border-gray-800 rounded-2xl rounded-tl-sm shadow-lg px-5 py-4 mb-2">
                          <div className="mb-1 flex items-center gap-2">
                            <span className="text-xl font-bold bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">
                              {(currentScript?.title || "Script").replace(/\s*v\d+$/i, "")}
                            </span>
                            {m.versionNumber && (
                              <span className="ml-2 px-2 py-0.5 rounded bg-[#9b5de5]/20 text-[#9b5de5] text-xs font-semibold">
                                v{m.versionNumber}
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
                              <div className="text-gray-200 whitespace-pre-line text-base">{m.explanation}</div>
                            </div>
                          )}

                          <div className="mb-2 mt-3">
                            <ScriptLoadingBarContainer
                              filename={safeFile(currentScript?.title || "Script")}
                              displayName={currentScript?.title || "Script"}
                              version={m.versionNumber ? `v${m.versionNumber}` : ""}
                              language="lua"
                              loading={!!m.pending || !!isGenerating || loadingBarVisible}
                              codeReady={!!m.code}
                              estimatedLines={m.code ? m.code.split("\n").length : null}
                              saved={!m.pending && !!m.code}
                              onSave={() => {
                                setErrorMsg("Manual save is not supported yet (artifact job writes versions).");
                                return false;
                              }}
                              onView={() => {
                                if (!m.code) return;
                                setSelectedVersion({
                                  id: m.versionId || `local-${m.versionNumber}`,
                                  title: currentScript?.title || "Script",
                                  version: m.versionNumber,
                                  code: m.code,
                                  explanation: m.explanation,
                                  createdAt: m.createdAt,
                                });
                              }}
                              stage={loadingBarData.stage}
                              eta={loadingBarData.eta}
                            />
                          </div>

                          <div className="text-xs text-gray-500 mt-2 text-right">{toLocalTime(m.createdAt)}</div>
                        </div>
                      </div>
                    );
                  })}

                </>
              )}
              {/* Loading bar appears just below the latest script output */}
              {(() => {
                const last = messages[messages.length - 1];
                return (last?.role === 'assistant' && last?.pending);
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
                    {["preparing","calling model","post-processing","polishing","finalizing"].includes(generationStep) && (
                      <> ({loadingBarData.stage || generationStep}{loadingBarData.eta ? `, ETA: ${loadingBarData.eta}s` : ""})</>
                    )}
                  </span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
          {/* Input Area */}
          <div className="border-t border-gray-800 bg-black/30 px-2 md:px-4 py-4 flex flex-col items-center shadow-inner">
            {/* Token Bar */}
            <div className="w-full max-w-2xl mx-auto mb-2">
              <TokenBar
                tokensLeft={tokensLeft}
                tokenLimit={TOKEN_LIMIT}
                refreshTime={tokenRefreshTime}
                isDev={!!user?.email && user.email.toLowerCase() === DEVELOPER_EMAIL}
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
                {promptAutocomplete.length > 0 && (
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
  filename={safeFile(selectedVersion.title)}
  version={selectedVersion.version ? `v${selectedVersion.version}` : ""}
  onClose={() => setSelectedVersion(null)}
  onSaveScript={async (newTitle, code, explanation = "") => {
    try {
      if (!user || !code) return false;

      // Try to determine the script/project ID
      let scriptId = currentScriptId;
      // If not available, try to use selectedVersion.id as scriptId
      if (!scriptId && selectedVersion?.id) {
        scriptId = selectedVersion.id;
      }

      // If still not available, create a new project
      if (!scriptId) {
        const resCreate = await authedFetch(user, `${BACKEND_URL}/api/projects`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: newTitle || "Script" }),
        });
        if (!resCreate.ok) {
          setErrorMsg("Failed to create new script for saving.");
          return false;
        }
        const data = await resCreate.json();
        scriptId = data.projectId;
        setCurrentScriptId(scriptId);
      }

      // Save the new version
      const res = await authedFetch(user, `${BACKEND_URL}/api/projects/${scriptId}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          explanation,
          title: newTitle || (currentScript?.title || "Script"),
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        setErrorMsg(`Save failed: ${res.status} ${res.statusText} - ${t.slice(0,120)}`);
        return false;
      }
      // refresh versions immediately (bypass throttle)
      lastVersionsFetchRef.current = 0;
      versionsBackoffRef.current = 0;
      setSuccessMsg("Saved new version");

      // Immediately update versionHistory and selectedVersion with the new version
      try {
        const versionsRes = await authedFetch(user, `${BACKEND_URL}/api/projects/${scriptId}/versions`, { method: "GET" });
        if (versionsRes.ok) {
          const versionsData = await versionsRes.json();
          const versions = Array.isArray(versionsData.versions) ? versionsData.versions : [];
          const sorted = versions
            .map(v => ({
              ...v,
              createdAt: typeof v.createdAt === "number"
                ? v.createdAt
                : Date.parse(v.createdAt) || Date.now(),
            }))
            .sort((a, b) => (b.version || 1) - (a.version || 1));
          setVersionHistory(sorted);
          setCurrentScript({ id: scriptId, title: newTitle || (currentScript?.title || "Script"), versions: sorted });
          setSelectedVersion(sorted[0]);
        }
      } catch {}

      // Optional: when saving a new version from the code drawer, log a tiny assistant message
      try {
        const db = getFirestore();
        const authUser = auth.currentUser;
        if (authUser && currentChatId) {
          const chatRef = doc(db, "users", authUser.uid, "chats", currentChatId);
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
      setErrorMsg(`Save error: ${e.message || e}`);
      return false;
    }
  }}
  onLiveOpen={() => {}}
/>
      )}
      {/* Celebration Animation */}
      {showCelebration && <CelebrationAnimation />}
      {errorMsg && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-red-700 text-white px-6 py-3 rounded-lg shadow-lg z-[200] animate-fade-in">
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-green-700 text-white px-6 py-3 rounded-lg shadow-lg z-[200] animate-fade-in">
          {successMsg}
        </div>
      )}
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