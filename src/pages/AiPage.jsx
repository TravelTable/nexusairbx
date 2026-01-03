import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useDeferredValue,
} from "react";
import { useBilling } from "../context/BillingContext";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Send,
  Loader,
  Menu,
  Settings,
  ChevronLeft,
  ChevronRight,
  Info,
  Copy,
  Check, 
} from "lucide-react";
import { auth } from "./firebase";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import SidebarContent from "../components/SidebarContent";
import RightSidebar from "../components/RightSidebar";
import Modal from "../components/Modal";
import FeedbackModal from "../components/FeedbackModal";
import SimpleCodeDrawer from "../components/CodeDrawer";
import ScriptLoadingBarContainer from "../components/ScriptLoadingBarContainer";
import PlanWelcomeCard from "../components/PlanWelcomeCard";
import PLAN_INFO from "../lib/planInfo";
import CelebrationAnimation from "../components/CelebrationAnimation";
import OnboardingContainer from "../components/OnboardingContainer";
import FancyLoadingOverlay from "../components/FancyLoadingOverlay";
import NotificationToast from "../components/NotificationToast";
import { sha256 } from "../lib/hash"; // You need a hash util for duplicate detection
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
  limit,
  where,
  getDocs,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
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

// --- Inline Text Formatter (Handles **bold**) ---
function FormatText({ text }) {
  if (!text) return null;
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} className="text-[#00f5d4] font-bold">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </>
  );
}

// --- Enhanced Block Parser ---
function getExplanationBlocks(explanation = "") {
  if (!explanation.trim()) return [];

  return explanation
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);

      const isBulletList = lines.length > 0 && lines.every((line) => /^[-*•]\s+/.test(line));
      const isNumberList = lines.length > 0 && lines.every((line) => /^\d+\.\s+/.test(line));

      if (isBulletList) {
        return {
          type: "list",
          ordered: false,
          items: lines.map((line) => line.replace(/^[-*•]\s+/, "")),
        };
      }

      if (isNumberList) {
        return {
          type: "list",
          ordered: true,
          items: lines.map((line) => line.replace(/^\d+\.\s+/, "")),
        };
      }

      if (lines.length === 1) {
        const line = lines[0];
        if (line.startsWith("#")) {
          return { type: "header", text: line.replace(/^#+\s*/, "") };
        }
        if (line.startsWith("**") && line.endsWith("**") && line.length < 60) {
          return { type: "header", text: line.replace(/\*\*/g, "") };
        }
        if (/^[A-Z][a-zA-Z ]+:$/.test(line)) {
          return { type: "header", text: line };
        }
      }

      return { type: "paragraph", text: block };
    });
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

// --- Plan/Token Cap Info ---


function formatNumber(n) {
  if (typeof n !== "number") return n;
  return n.toLocaleString();
}

function formatResetDate(date) {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// --- Token Meter (TokenBar) ---
function TokenBar({ tokensLeft, tokensLimit, resetsAt, plan }) {
  const percent =
    typeof tokensLeft === "number" && typeof tokensLimit === "number"
      ? Math.max(0, Math.min(100, (tokensLeft / tokensLimit) * 100))
      : 100;
  const planInfo = PLAN_INFO[plan] || PLAN_INFO.free;
  return (
    <div className="w-full flex flex-col gap-1">
      <div className="flex items-center justify-between mb-1">
        <div className="text-xs text-gray-300 font-medium">
          Tokens:{" "}
          <span className="text-white font-bold">
            {typeof tokensLeft === "number" ? formatNumber(tokensLeft) : "∞"}
          </span>{" "}
          <span className="text-gray-400">/ {formatNumber(tokensLimit)}</span>
        </div>
        <a
          href="/docs#tokens"
          className="flex items-center gap-1 text-xs text-[#9b5de5] hover:text-[#00f5d4] underline"
          title="How tokens work"
        >
          <Info className="w-4 h-4" />
          How tokens work
        </a>
      </div>
      <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden relative">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            plan === "team"
              ? "bg-gradient-to-r from-[#00f5d4] to-[#9b5de5]"
              : plan === "pro"
              ? "bg-gradient-to-r from-[#9b5de5] to-[#00f5d4]"
              : "bg-gray-400"
          }`}
          style={{ width: `${percent}%` }}
        ></div>
      </div>
      <div className="flex items-center justify-between mt-1 text-xs text-gray-400">
        <span>
          {typeof resetsAt === "string" || resetsAt instanceof Date
            ? `Resets on ${formatResetDate(resetsAt)}`
            : ""}
        </span>
        <span className="text-gray-500">{planInfo.capText}</span>
      </div>
    </div>
  );
}

// --- Plan Badge ---
function PlanBadge({ plan }) {
  const planInfo = PLAN_INFO[plan] || PLAN_INFO.free;
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold mr-2 ${
        planInfo.badgeClass
      }`}
      style={{
        background:
          plan === "pro"
            ? "linear-gradient(90deg, #9b5de5 0%, #00f5d4 100%)"
            : plan === "team"
            ? "linear-gradient(90deg, #00f5d4 0%, #9b5de5 100%)"
            : undefined,
        color: plan === "team" ? "#222" : undefined,
      }}
    >
      {planInfo.label}
      <span className="ml-2 text-xs font-normal opacity-80">
        • {planInfo.capText}
      </span>
    </span>
  );
}

function AiPage() {
  const [showOnboarding, setShowOnboarding] = useState(
    localStorage.getItem("nexusrbx:onboardingComplete") !== "true"
  );
  const navigate = useNavigate();
  const location = useLocation();

  // --- State for scripts and versions ---
  const [user, setUser] = useState(null);
  const [scripts, setScripts] = useState([]);
  const [scriptsLimit, setScriptsLimit] = useState(50);
  const [currentScriptId, setCurrentScriptId] = useState(null);
  const [currentScript, setCurrentScript] = useState(null);
  const [versionHistory, setVersionHistory] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState(null);

  // Chat timeline: ordered messages
  const [messages, setMessages] = useState([]);

  // --- Prompt state (move to top so setPrompt is defined for all hooks below) ---
  const [prompt, setPrompt] = useState("");

  // --- Chat state + listener refs ---
  const [currentChatId, setCurrentChatId] = useState(null);
  const [currentChatMeta, setCurrentChatMeta] = useState(null);
  const messagesUnsubRef = useRef(null);
  const chatUnsubRef = useRef(null);

  const [activeTab, setActiveTab] = useState("scripts");

  // Accept initialPrompt from navigation state (homepage)
  useEffect(() => {
    if (
      location &&
      location.state &&
      typeof location.state.initialPrompt === "string" &&
      location.state.initialPrompt.trim()
    ) {
      setPrompt(location.state.initialPrompt);
      window.history.replaceState({}, document.title);
    }
  }, [location]);
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
    ({ message, type = "info", duration = 4000, cta, secondary, children }) => {
      setNotifications((prev) => {
        if (prev.some((n) => n.message === message && n.type === type)) return prev;
        return [
          ...prev,
          { id: uuidv4(), message, type, duration, cta, secondary, children }
        ];
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

  // --- Billing/Entitlements ---
  const {
    loading: billingLoading,
    error: billingError,
    plan,
    cycle,
    totalRemaining,
    resetsAt,
    checkout,
    portal,
    refresh: refreshBilling,
    tokens = {},
    paygEnabled = false,
  } = useBilling();

  // Listen for entitlement refresh after returning from /subscribe
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  if (params.get("checkout") === "success") {
    refreshBilling?.();
    // Clean up URL so this only runs once
    params.delete("checkout");
    window.history.replaceState({}, "", window.location.pathname + (params.toString() ? "?" + params.toString() : ""));
  }
}, [refreshBilling]);

// Plan info
const isSubscriber = !!(tokens && tokens.entitlements && tokens.entitlements.includes && (
  tokens.entitlements.includes("subscriber") || tokens.entitlements.includes("pro") || tokens.entitlements.includes("team")
));
const normalizedPlan = typeof plan === "string" ? plan.toLowerCase() : "free";
const planKey = normalizedPlan === "team" ? "team" : normalizedPlan === "pro" ? "pro" : "free";
  const planInfo = PLAN_INFO[planKey];
  // --- Token State ---
  const [tokensLeft, setTokensLeft] = useState(null);
  const [tokensLimit, setTokensLimit] = useState(null);
  const [tokenRefreshTime, setTokenRefreshTime] = useState(null);

  useEffect(() => {
    if (billingLoading) return;
    if (billingError) {
      return;
    }
    if (typeof tokens.remaining === "number" && typeof tokens.limit === "number") {
      setTokensLeft(tokens.remaining);
      setTokensLimit(tokens.limit);
      setTokenRefreshTime(tokens.resetsAt || resetsAt || null);
    } else if (typeof totalRemaining === "number") {
      setTokensLeft(totalRemaining);
      setTokensLimit(planInfo.cap);
      setTokenRefreshTime(resetsAt || null);
    } else {
      setTokensLeft(null);
      setTokensLimit(planInfo.cap);
      setTokenRefreshTime(resetsAt || null);
    }
  }, [billingLoading, billingError, tokens, totalRemaining, resetsAt, planInfo.cap]);

  // --- Prompt Input Ref for focus ---
  const promptInputRef = useRef(null);

  // --- Listen to scripts for sidebar updates (paginated) ---
  useEffect(() => {
    if (!user) {
      setScripts([]);
      return;
    }
    const db = getFirestore();
    const q = query(
      collection(db, "users", user.uid, "scripts"),
      orderBy("updatedAt", "desc"),
      limit(scriptsLimit)
    );
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        updatedAt: d.data().updatedAt?.toMillis?.() || Date.now(),
        createdAt: d.data().createdAt?.toMillis?.() || Date.now(),
      }));
      setScripts(list);
      safeSet("nexusrbx:scripts", list);
    });
    return () => unsub();
  }, [user, scriptsLimit]);

  const handleLoadMoreScripts = useCallback(() => {
    setScriptsLimit((prev) => prev + 50);
  }, []);

  const handleDeleteScript = useCallback(
    async (scriptId) => {
      if (!user || !scriptId) return;
      try {
        const token = await user.getIdToken();
        await fetch(`${BACKEND_URL}/api/projects/${scriptId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        setScripts((prev) => prev.filter((s) => s.id !== scriptId));
        if (currentScriptId === scriptId) {
          setCurrentScriptId(null);
          setCurrentScript(null);
        }
        notify({ message: "Script deleted", type: "success" });
      } catch (err) {
        console.error(err);
        notify({ message: "Failed to delete script", type: "error" });
      }
    },
    [user, currentScriptId, notify]
  );

  const handleDeleteChat = useCallback(
    async (chatId) => {
      if (!user || !chatId) return;
      try {
        const db = getFirestore();
        await deleteDoc(doc(db, "users", user.uid, "chats", chatId));
        if (currentChatId === chatId) {
          setCurrentChatId(null);
          setMessages([]);
        }
        notify({ message: "Chat deleted", type: "success" });
      } catch (err) {
        console.error(err);
        notify({ message: "Failed to delete chat", type: "error" });
      }
    },
    [user, currentChatId, notify]
  );

  // --- Polling ETA ---
  const pollingTimesRef = useRef([]);

  // --- Abort management for job polling ---
  const jobAbortRef = useRef(null);

  // --- Versions polling refs (HMR-safe, jittered backoff, ETag) ---
  const lastVersionsFetchRef = useRef(0);
  const versionsBackoffRef = useRef(0);
  const versionsEtagRef = useRef(null);
  const lastFetchedScriptIdRef = useRef(null);

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

      if (jobAbortRef.current) {
        try {
          jobAbortRef.current.abort();
        } catch {}
        jobAbortRef.current = null;
      }

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
    const onOpenCodeDrawer = (e) => {
      const { scriptId, code, title, versionNumber, explanation, savedScriptId } = e.detail || {};

      // If code is provided, open immediately
      if (code && code !== "-- No code found") {
        setSelectedVersion({
          id: savedScriptId || `temp-${Date.now()}`,
          projectId: scriptId || null,
          code,
          title: title || "Script",
          explanation: explanation || "",
          versionNumber: versionNumber || null,
          isSavedView: true,
        });
        if (scriptId) setCurrentScriptId(scriptId);
        return;
      }

      // If code missing but we have a scriptId, fetch latest (or specific) version
      if (scriptId) {
        const fetchCode = async () => {
          try {
            const db = getFirestore();
            const uid = user?.uid || auth.currentUser?.uid;
            if (!uid) return;

            const versionsRef = collection(db, "users", uid, "scripts", scriptId, "versions");
            let q;
            let snap = null;
            if (versionNumber) {
              q = query(versionsRef, where("versionNumber", "==", Number(versionNumber)), limit(1));
              snap = await getDocs(q);
            }
            if (!snap || snap.empty) {
              // fallback to latest by versionNumber then createdAt
              q = query(versionsRef, orderBy("versionNumber", "desc"), limit(1));
              snap = await getDocs(q);
            }
            if (snap.empty) {
              q = query(versionsRef, orderBy("createdAt", "desc"), limit(1));
              snap = await getDocs(q);
            }
            if (!snap.empty) {
              const d = snap.docs[0];
              const data = d.data();
              setSelectedVersion({
                id: d.id,
                projectId: scriptId,
                code: data.code || "",
                title: data.title || title || "Script",
                explanation: data.explanation || "",
                versionNumber: data.versionNumber,
                isSavedView: true,
              });
              setCurrentScriptId(scriptId);
            } else {
              notify({ message: "Script version content not found.", type: "error" });
            }
          } catch (err) {
            console.error("Error fetching saved script code:", err);
            notify({ message: "Failed to load script code.", type: "error" });
          }
        };
        fetchCode();
      }
    };
    const onForceOpenScript = (e) => {
      const { scriptId } = e.detail || {};
      if (scriptId === currentScriptId && !selectedVersion && versionHistory.length > 0) {
        setSelectedVersion(versionHistory[0]);
      }
    };
    window.addEventListener("nexus:openChat", onOpenChat);
    window.addEventListener("nexus:startDraft", onStartDraft);
    window.addEventListener("nexus:openCodeDrawer", onOpenCodeDrawer);
    window.addEventListener("nexus:forceOpenScript", onForceOpenScript);

    // ESC closes mobile sidebars
    const onKey = (e) => e.key === "Escape" && closeAllMobileSidebars();
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("nexus:openChat", onOpenChat);
      window.removeEventListener("nexus:startDraft", onStartDraft);
      window.removeEventListener("nexus:openCodeDrawer", onOpenCodeDrawer);
      window.removeEventListener("nexus:forceOpenScript", onForceOpenScript);
      window.removeEventListener("keydown", onKey);
      messagesUnsubRef.current?.();
      chatUnsubRef.current?.();
    };
  }, [openChatById, currentScriptId, selectedVersion, versionHistory, user, notify]);

  // --- Load Versions for Current Script from Backend (event-driven, skip if not current) ---
  useEffect(() => {
    if (!authReady) return;
    if (!user || !currentScriptId) return;
    if (selectedVersion && selectedVersion.projectId && selectedVersion.projectId !== currentScriptId) return;

    const now = Date.now();
    const delay = 10000 + (versionsBackoffRef.current || 0);
    const isSameScript = lastFetchedScriptIdRef.current === currentScriptId;
    if (isSameScript && now - lastVersionsFetchRef.current < delay) {
      if (!selectedVersion && versionHistory.length > 0) {
        setSelectedVersion(versionHistory[0]);
      }
      return;
    }
    lastVersionsFetchRef.current = now;
    lastFetchedScriptIdRef.current = currentScriptId;

    user.getIdToken().then((idToken) => {
      const headers = { Authorization: `Bearer ${idToken}` };
      if (versionsEtagRef.current) headers["If-None-Match"] = versionsEtagRef.current;

      fetch(`${BACKEND_URL}/api/projects/${currentScriptId}/versions`, { headers })
        .then(async (res) => {
          if (res.status === 304) {
            versionsBackoffRef.current = 0;
            if (!selectedVersion && versionHistory.length > 0) {
              setSelectedVersion(versionHistory[0]);
            }
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
  }, [user, currentScriptId, authReady, selectedVersion, versionHistory]);

  // --- Prompt Char Count & Error ---
  useEffect(() => {
    setPromptCharCount(prompt.length);
    if (prompt.length > (planInfo.promptCap || 800)) {
      setPromptError(
        `Prompt too long (max ${planInfo.promptCap || 800} characters for your plan).`
      );
    } else {
      setPromptError("");
    }
  }, [prompt, planInfo.promptCap]);

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

// --- Cleanup job polling and SSE on unmount ---
useEffect(() => {
  return () => {
    if (jobAbortRef.current) {
      if (typeof jobAbortRef.current.abortJob === "function") {
        jobAbortRef.current.abortJob();
      } else if (typeof jobAbortRef.current.abort === "function") {
        jobAbortRef.current.abort();
      }
      jobAbortRef.current = null;
    }
    if (window.__activeSSE && typeof window.__activeSSE.close === "function") {
      window.__activeSSE.close();
      window.__activeSSE = null;
    }
  };
}, []);

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

// --- Billing 402/entitlement helpers ---
async function mustOk(res, label) {
  if (res.ok) return;
  if (res.status === 402) {
    notify({
      message: planInfo.toastZero,
      type: "error",
      duration: 5000,
      cta: {
        label: "Upgrade",
        onClick: () => navigate("/subscribe"),
      },
    });
    // Optionally, redirect immediately:
    // navigate("/subscribe");
    throw new Error("INSUFFICIENT_TOKENS");
  }
  const text = await res.text();
  throw new Error(`${label}: ${res.status} ${res.statusText} - ${text.slice(0, 200)}`);
}

// --- Main Generation Flow (Handles both new script and new version) ---

const lastPromptHashRef = useRef(null);
const lastPromptTimeRef = useRef(0);
const [showSummarizeModal, setShowSummarizeModal] = useState(false);
const [summarizedPrompt, setSummarizedPrompt] = useState("");
const [pendingMsgId, setPendingMsgId] = useState(null);
const [wasCanceled, setWasCanceled] = useState(false);

async function fireTelemetry(event, data = {}) {
  // Replace with your analytics system
  // Example: window.analytics?.track(event, data);
}

const MIN_PROMPT_LENGTH = 8;
const SUMMARY_THRESHOLD = 0.8; // offer summarize modal if >80% of plan cap

const handleSubmit = async (e, opts = {}) => {
  if (e) e.preventDefault();
  if (isGenerating) return;

  const cap = planInfo?.promptCap ?? 2000;

  // 1) Clean prompt
  const raw = typeof prompt === "string" ? prompt : "";
  const cleanedPrompt = raw.replace(/\s+/g, " ").trim();

  if (!cleanedPrompt) {
    setPromptError("Please enter a prompt.");
    return;
  }
  if (cleanedPrompt.length < MIN_PROMPT_LENGTH) {
    setPromptError("Prompt too short. Please be more specific.");
    return;
  }
  if (cleanedPrompt.length > cap) {
    setPromptError(`Prompt too long (max ${cap} characters for your plan).`);
    return;
  }

  // 2) If near cap, offer to summarize (UX)
  if (!opts.skipSummarize && cleanedPrompt.length > SUMMARY_THRESHOLD * cap) {
    setShowSummarizeModal(true);
    setSummarizedPrompt(cleanedPrompt);
    return;
  }

  // 3) Require sign-in
  if (!user) {
    notify({ message: "Sign in required.", type: "error", duration: 2000 });
    navigate("/signin");
    return;
  }

  // 4) Token guard
  if (typeof tokensLeft === "number" && tokensLeft <= 0) {
    notify({
      message: planKey === "free"
        ? "You’ve used your free monthly token allowance."
        : `You’ve reached your monthly limit for the ${planKey} plan.`,
      type: "error",
      duration: 6000,
      cta: { label: planKey === "free" ? "Choose a Plan" : "Upgrade Plan", onClick: () => navigate("/subscribe") },
    });
    return;
  }

  // 5) Proceed (you already have the rest: setIsGenerating, placeholders, fetch, SSE, etc.)

  // 19. Duplicate submission detection
  const promptHash = await sha256(
    cleanedPrompt +
      JSON.stringify(settings) +
      (currentScriptId || "")
  );
  const now = Date.now();
  if (
    lastPromptHashRef.current === promptHash &&
    now - lastPromptTimeRef.current < 30000 &&
    !opts.forceDuplicate
  ) {
    setPromptError(
      "You just submitted this prompt. Run again anyway?"
    );
    // Optionally show a "Run again anyway" button
    return;
  }
  lastPromptHashRef.current = promptHash;
  lastPromptTimeRef.current = now;

  // 2. Concurrency & double-submit
  setIsGenerating(true);
  setGenerationStep("preparing");
  setErrorMsg("");
  setSuccessMsg("");
  setPromptError("");
  setLoadingBarVisible(true);
  setLoadingBarData((prev) => ({
    ...prev,
    loading: true,
    codeReady: false,
    stage: "preparing",
    eta: null,
  }));
  setWasCanceled(false);

  // 13. Telemetry: submitted
  fireTelemetry("submitted", {
    promptLength: cleanedPrompt.length,
    plan: planKey,
    settings,
    projectId: currentScriptId,
  });

  // 16. Prevent accidental multi-project writes
  let projectIdToSend = undefined;
  if (currentScriptId && !opts.forceNewProject) {
    projectIdToSend = currentScriptId;
  } else if (currentScriptId && opts.forceNewProject) {
    if (
      !window.confirm(
        "Start a new project? This will not overwrite your current script."
      )
    ) {
      setIsGenerating(false);
      setGenerationStep("idle");
      return;
    }
    projectIdToSend = undefined;
  }

  // 8. Server-side idempotency
  const requestId = uuidv4();

  // 10. Pending message content preview
  const pendingMsgIdLocal = uuidv4();
  setPendingMsgId(pendingMsgIdLocal);

  // Add user message to chat
  const userMsg = {
    id: uuidv4(),
    role: "user",
    content: cleanedPrompt,
    createdAt: Date.now(),
    pending: false,
  };
  setMessages((prev) => [...prev, userMsg]);

  // Add pending assistant message
  const pendingMsg = {
    id: pendingMsgIdLocal,
    role: "assistant",
    content: "",
    explanation: "",
    pending: true,
    createdAt: Date.now(),
    versionId: null,
    versionNumber: null,
  };
  setMessages((prev) => [...prev, pendingMsg]);

  let jobId = null;
  let jobData = null;
  let retriedToken = false;
  const db = getFirestore();
  let activeChatId = currentChatId;

  // Ensure chat exists and persist the user message
  if (user) {
    // Create chat if missing
    if (!activeChatId) {
      try {
        const newChatRef = await addDoc(collection(db, "users", user.uid, "chats"), {
          title: cleanedPrompt.slice(0, 30) + (cleanedPrompt.length > 30 ? "..." : ""),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          projectId: projectIdToSend || null,
        });
        activeChatId = newChatRef.id;
        setCurrentChatId(activeChatId);
      } catch (e) {
        console.error("Failed to create chat:", e);
      }
    }

    // Save user message
    if (activeChatId) {
      addDoc(collection(db, "users", user.uid, "chats", activeChatId, "messages"), {
        role: "user",
        content: cleanedPrompt,
        createdAt: serverTimestamp(),
      }).catch((e) => console.error("Failed to save user msg:", e));

      updateDoc(doc(db, "users", user.uid, "chats", activeChatId), {
        lastMessage: cleanedPrompt.slice(0, 50),
        updatedAt: serverTimestamp(),
      }).catch(() => {});
    }
  }

  try {

    // 17. Safer cleanup: track cancel
    setWasCanceled(false);

  // Prepare conversation context for the backend (so “look at chat” works)
  let conversation = [...(messages || []), userMsg]
    .filter((m) => (m.role === "user" || m.role === "assistant") && !m.pending)
    .map((m) => ({
      role: m.role,
      content: String(m.content || "").trim(),
    }))
    .filter((m) => m.content)
    .slice(-30);

  if (
    conversation.length &&
    conversation[conversation.length - 1].role === "user" &&
    conversation[conversation.length - 1].content === cleanedPrompt.trim()
  ) {
    conversation = conversation.slice(0, -1);
  }

  // Prepare request
  const reqBody = {
    prompt: cleanedPrompt,
    model: settings.modelVersion,
    creativity: settings.creativity,
    codeStyle: settings.codeStyle,
    projectId: projectIdToSend,
    requestId,
    chatId: activeChatId,
    conversation,
  };

    // 5. Streaming via POST SSE
    // 15. Guard against stale user: refresh token on 401
    let idToken = await user.getIdToken();
    let codeBuffer = "";
    let explanationBuffer = "";
    let streamDone = false;
    let streamError = null;
    let donePayload = null;
    let artifactId = null;
    let tokensConsumed = null;
    let jobIdFromStream = null;
    let projectIdFromStream = null;
    let pipelineId = null;

    // With one-shot backend, we do NOT stream into UI (or window globals).
    // Keep buffers only for backward compatibility if older backend emits chunks.
    const appendPendingMessage = ({ codeDelta = "", explanationDelta = "" }) => {
      if (codeDelta) codeBuffer += codeDelta;
      if (explanationDelta) explanationBuffer += explanationDelta;
    };

    const parseEventData = (raw) => {
      if (!raw) return null;
      if (typeof raw === "object") return raw;
      try {
        return JSON.parse(raw);
      } catch {
        return raw;
      }
    };

    const extractChunk = (raw) => {
      const parsed = parseEventData(raw);
      if (typeof parsed === "string") return parsed;
      if (!parsed) return "";
      return parsed.chunk || parsed.delta || parsed.content || "";
    };

    const handleStatusEvent = (raw) => {
      const parsed = parseEventData(raw);
      const stage =
        parsed?.stage ||
        parsed?.status ||
        parsed?.state ||
        (typeof parsed === "string" ? parsed : null);
      const eta =
        typeof parsed?.eta === "number" && parsed.eta > 0 ? parsed.eta : null;
      if (parsed?.jobId || parsed?.job_id) jobIdFromStream = parsed.jobId || parsed.job_id;
      if (parsed?.projectId || parsed?.project_id) {
        projectIdFromStream = parsed.projectId || parsed.project_id;
      }
      if (stage) {
        setGenerationStep(stage);
        setLoadingBarData((prev) => ({
          ...prev,
          stage,
          eta,
        }));
      }
    };

    const handleDoneEvent = (raw) => {
      const parsed = parseEventData(raw) || {};
      donePayload = parsed;
      artifactId = parsed.artifact_id || parsed.artifactId || parsed.id || null;
      tokensConsumed =
        parsed.tokens_consumed ?? parsed.tokensConsumed ?? parsed.tokens ?? null;
      if (parsed?.jobId || parsed?.job_id) jobIdFromStream = parsed.jobId || parsed.job_id;
      if (parsed?.projectId || parsed?.project_id) {
        projectIdFromStream = parsed.projectId || parsed.project_id;
      }
      streamDone = true;
    };

    const handleErrorEvent = (raw) => {
      const parsedError = parseEventData(raw) || { message: "Stream error." };
      if (
        typeof parsedError?.message === "string" &&
        parsedError.message.toLowerCase().includes("not enough tokens")
      ) {
        streamError = {
          ...parsedError,
          code: "INSUFFICIENT_TOKENS",
        };
      } else {
        streamError = parsedError;
      }
      streamDone = true;
    };

    const streamAbortController = new AbortController();
    jobAbortRef.current = streamAbortController;
    streamAbortController.abortJob = async () => {
      setWasCanceled(true);
      if (jobIdFromStream) {
        try {
          await fetch(`${BACKEND_URL}/api/generate/${jobIdFromStream}/cancel`, {
            method: "POST",
            headers: { Authorization: `Bearer ${idToken}` },
          });
        } catch {}
      }
      streamAbortController.abort();
    };

    let enqueueRes = await fetch(`${BACKEND_URL}/api/generate/artifact`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
        "Idempotency-Key": requestId,
      },
      body: JSON.stringify(reqBody),
      signal: streamAbortController.signal,
    });

    if (enqueueRes.status === 401 && !retriedToken) {
      await user.getIdToken(true);
      idToken = await user.getIdToken();
      retriedToken = true;
      enqueueRes = await fetch(`${BACKEND_URL}/api/generate/artifact`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
          "Idempotency-Key": requestId,
        },
        body: JSON.stringify(reqBody),
        signal: streamAbortController.signal,
      });
      if (!enqueueRes.ok) {
        throw {
          code: "BACKEND_ERROR",
          message: `Queue failed (${enqueueRes.status})`,
        };
      }
    } else if (!enqueueRes.ok) {
      throw {
        code: "BACKEND_ERROR",
        message: `Queue failed (${enqueueRes.status})`,
      };
    }

    const enqueuePayload = await enqueueRes.json().catch(() => ({}));
    jobId = enqueuePayload?.jobId || enqueuePayload?.job_id || null;
    pipelineId =
      enqueuePayload?.pipelineId || enqueuePayload?.pipeline_id || null;

    if (!jobId) {
      throw { code: "BACKEND_ERROR", message: "Queue did not return a job ID." };
    }

    // 13. Telemetry: stream_started
    fireTelemetry("stream_started", { requestId, jobId, pipelineId });

    /**
     * IMPORTANT:
     * The backend only starts generation when /api/generate/stream is hit (SSE).
     * We still call it, but we DO NOT read/parse chunks.
     * We just let it run, and the UI uses polling via /api/jobs/:jobId.
     */
    let triggerRes = await fetch(
      `${BACKEND_URL}/api/generate/stream?jobId=${encodeURIComponent(jobId)}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${idToken}` },
        signal: streamAbortController.signal,
      }
    );

    if (triggerRes.status === 401 && !retriedToken) {
      await user.getIdToken(true);
      idToken = await user.getIdToken();
      retriedToken = true;

      triggerRes = await fetch(
        `${BACKEND_URL}/api/generate/stream?jobId=${encodeURIComponent(jobId)}`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${idToken}` },
          signal: streamAbortController.signal,
        }
      );
    }

    if (!triggerRes.ok) {
      // Read text safely (backend might return HTML or SSE error text)
      const t = await triggerRes.text().catch(() => "");
      throw {
        code: "BACKEND_ERROR",
        message: `Stream trigger failed (${triggerRes.status}) ${t ? `- ${t.slice(0, 200)}` : ""}`.trim(),
      };
    }

    // DO NOT read stream chunks.
    // Just keep the connection alive while polling.
    // (If the browser closes it early, polling still works as long as the backend started.)
    setGenerationStep("running");
    setLoadingBarData((prev) => ({ ...prev, stage: "running", eta: null }));

    // 14) Poll until done (UI updates come ONLY from polling ticks)
    jobData = await pollJob(
      user,
      jobId,
      (tick) => {
        // Debug (toggle in console: localStorage.setItem("debugAi","1"))
        if (localStorage.getItem("debugAi") === "1") {
          console.debug("[AI job tick]", tick);
        }

        const stage = tick?.stage || tick?.status || "running";
        setGenerationStep(stage);

        setLoadingBarVisible(true);
        setLoadingBarData((prev) => ({
          ...prev,
          loading: true,
          stage,
          eta: null,
        }));
      },
      { signal: streamAbortController.signal }
    );

    // 17. Safer cleanup: check cancel
    if (wasCanceled) {
      setGenerationStep("canceled");
      setIsGenerating(false);
      setLoadingBarVisible(false);
      setLoadingBarData((prev) => ({
        ...prev,
        loading: false,
        codeReady: false,
        stage: "canceled",
        eta: null,
      }));
      fireTelemetry("canceled", { jobId });
      return;
    }

    // Billing is handled server-side inside /api/generate/stream finalize.
    // Frontend should ONLY refresh entitlements.
    await refreshBilling?.();

    // 9. Error taxonomy & user messages
    if (jobData.status !== "succeeded") {
      let code = jobData.errorCode || jobData.code || "UNKNOWN";
      let msg = jobData.error || jobData.message || "Generation failed.";
      let cta = null;
      switch (code) {
        case "INSUFFICIENT_TOKENS":
          msg = planInfo.toastZero;
          cta = {
            label: "Upgrade",
            onClick: () => navigate("/subscribe"),
          };
          break;
        case "PLAN_LIMIT_REACHED":
          msg = "You’ve hit your plan’s monthly limit. Upgrade for more tokens.";
          cta = {
            label: "Upgrade",
            onClick: () => navigate("/subscribe"),
          };
          break;
        case "CONTENT_BLOCKED":
          msg = "Your prompt was blocked. Please rephrase.";
          break;
        case "RATE_LIMIT":
          msg = "Too many requests. Please wait and try again.";
          break;
        case "BACKEND_BUSY":
          msg = "Server is busy. Try again in a moment.";
          break;
        case "TIMEOUT":
          msg = "Generation timed out. Try again.";
          break;
        default:
          break;
      }
      setErrorMsg(msg);
      notify({
        message: msg,
        type: "error",
        duration: 6000,
        cta,
      });
      fireTelemetry("job_failed", { jobId, code, msg });
      setLoadingBarVisible(false);
      setLoadingBarData((prev) => ({
        ...prev,
        loading: false,
        codeReady: false,
        stage: "error",
        eta: null,
      }));
      // 20. Accessibility: focus error CTA
      setTimeout(() => {
        const ctaBtn = document.querySelector('[data-toast-cta]');
        if (ctaBtn) ctaBtn.focus();
      }, 100);
      setIsGenerating(false);
      setGenerationStep("idle");
      return;
    }

    if (jobData.projectId && jobData.projectId !== currentScriptId) {
      setCurrentScriptId(jobData.projectId);
    }

    // 11. Versioning: stable ordering & selection
    let normalizedVersions = [];
    if (jobData.versions) {
      normalizedVersions = jobData.versions.map(normalizeServerVersion).sort(byVN);
      setVersionHistory(normalizedVersions);
    }
    // Normalize the version if present so we can grab code from it
    let finalVersion = null;
    if (jobData.version) {
      finalVersion = normalizeServerVersion(jobData.version);
      setSelectedVersion(
        normalizedVersions.find((v) => v.id === finalVersion.id) || finalVersion
      );
    }

    // Extract title/code/explanation from result or fallbacks
    const resultTitle = jobData.result?.title || jobData.title || currentScript?.title || "Script";
    if (resultTitle) {
      setCurrentScript((prev) => ({
        ...prev,
        title: resultTitle,
        id: jobData.projectId || prev?.id || currentScriptId,
      }));
      setScripts((prev) =>
        Array.isArray(prev)
          ? prev.map((s) =>
              s.id === (jobData.projectId || currentScriptId) ? { ...s, title: resultTitle } : s
            )
          : prev
      );
    }

    const finalCode =
      jobData.result?.code ||
      jobData.result?.content ||
      jobData.code ||
      jobData.content ||
      finalVersion?.code ||
      jobData.artifact?.code ||
      "";

    const finalExplanation =
      jobData.result?.explanation ||
      jobData.explanation ||
      finalVersion?.explanation ||
      "";

    const finalVersionId =
      jobData.versionId ||
      finalVersion?.id ||
      null;

    const finalVersionNumber =
      jobData.result?.versionNumber ||
      jobData.versionNumber ||
      finalVersion?.versionNumber ||
      finalVersion?.version ||
      null;

    // Persist chat association on script so scripts tab scopes per chat
    if (activeChatId && user) {
      const targetProjectId = jobData.projectId || finalVersion?.id || currentScriptId;
      if (targetProjectId) {
        updateDoc(doc(db, "users", user.uid, "scripts", targetProjectId), {
          chatId: activeChatId,
          updatedAt: serverTimestamp(),
        }).catch(() => {});
      }
    }

    // Persist assistant message to chat (so sidebar/history updates)
    if (activeChatId && user) {
      const finalCode =
        jobData.result?.code ||
        jobData.result?.content ||
        jobData.code ||
        jobData.content ||
        finalVersion?.code ||
        jobData.artifact?.code ||
        "";
      const finalExp =
        jobData.result?.explanation ||
        jobData.explanation ||
        finalVersion?.explanation ||
        "";

      addDoc(collection(db, "users", user.uid, "chats", activeChatId, "messages"), {
        role: "assistant",
        content: "",
        code: finalCode,
        explanation: finalExp,
        versionNumber: jobData.versionNumber || null,
        createdAt: serverTimestamp(),
      }).catch((e) => console.error("Failed to save assistant msg:", e));

      if (jobData.result?.title) {
        updateDoc(doc(db, "users", user.uid, "chats", activeChatId), {
          title: jobData.result.title,
          projectId: jobData.projectId || projectIdToSend || null,
          updatedAt: serverTimestamp(),
        }).catch(() => {});
      }
    }

    // 3. Messaging list integrity: remove only the pending you added
    setMessages((prev) =>
      prev
        .filter((m) => m.id !== pendingMsgIdLocal)
        .concat([
          {
            id: uuidv4(),
            role: "assistant",
            content: "",
            explanation: finalExplanation, // Use the resolved explanation
            code: finalCode,               // Use the resolved code
            createdAt: Date.now(),
            versionId: finalVersionId,
            versionNumber: finalVersionNumber,
            pending: false,
          },
        ])
    );

    // 12. State reset hygiene: clear after message attached
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 2500);

    setSuccessMsg("Script generated successfully!");
    setPrompt("");
    setPromptAutocomplete([]);
    setLoadingBarVisible(false);
    setLoadingBarData((prev) => ({
      ...prev,
      loading: false,
      codeReady: true,
      stage: "done",
      eta: null,
    }));

    // 13. Telemetry: stream_completed
    fireTelemetry("stream_completed", { jobId });

    // 20. Accessibility: focus "View Code" or "Save"
    setTimeout(() => {
      const codeBtn =
        document.querySelector('[data-view-code]') ||
        document.querySelector('[data-save-script]');
      if (codeBtn) codeBtn.focus();
    }, 100);
  } catch (err) {
    let code = err.code || err.message || "UNKNOWN";
    let msg = err.message || "Failed to generate script.";
    let cta = null;
    switch (code) {
      case "INSUFFICIENT_TOKENS":
        msg = planInfo.toastZero;
        cta = {
          label: "Upgrade",
          onClick: () => navigate("/subscribe"),
        };
        break;
      case "PLAN_LIMIT_REACHED":
        msg = "You’ve hit your plan’s monthly limit. Upgrade for more tokens.";
        cta = {
          label: "Upgrade",
          onClick: () => navigate("/subscribe"),
        };
        break;
      case "CONTENT_BLOCKED":
        msg = "Your prompt was blocked. Please rephrase.";
        break;
      case "RATE_LIMIT":
        msg = "Too many requests. Please wait and try again.";
        break;
      case "BACKEND_BUSY":
        msg = "Server is busy. Try again in a moment.";
        break;
      case "TIMEOUT":
        msg = "Generation timed out. Try again.";
        break;
      case "BILLING_ERROR":
        msg = "Billing failed. Please retry.";
        break;
      default:
        break;
    }
    setErrorMsg(msg);
    notify({
      message: msg,
      type: "error",
      duration: 6000,
      cta,
    });
    fireTelemetry("job_failed", { code, msg });
    setLoadingBarVisible(false);
    setLoadingBarData((prev) => ({
      ...prev,
      loading: false,
      codeReady: false,
      stage: "error",
      eta: null,
    }));
    setTimeout(() => {
      const ctaBtn = document.querySelector('[data-toast-cta]');
      if (ctaBtn) ctaBtn.focus();
    }, 100);
    setIsGenerating(false);
    setGenerationStep("idle");
  } finally {
    if (!wasCanceled) {
      setIsGenerating(false);
      setGenerationStep("idle");
    } else {
      setGenerationStep("canceled");
    }
  }
};

// Summarize modal logic (18)
function SummarizePromptModal({ open, prompt, onConfirm, onCancel }) {
  // Implement your summarization UI here
  // For now, just a confirm/cancel dialog
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center">
      <div className="bg-gray-900 rounded-lg p-6 max-w-lg w-full">
        <h2 className="text-lg font-bold mb-2">Prompt is very long</h2>
        <p className="mb-4 text-gray-300">
          Your prompt is near the maximum allowed length. Would you like to summarize it before sending? This can reduce token usage and improve results.
        </p>
        <textarea
          className="w-full rounded border border-gray-700 bg-gray-800 text-white p-2 mb-4"
          rows={4}
          value={prompt}
          onChange={(e) => setSummarizedPrompt(e.target.value)}
        />
        <div className="flex gap-2 justify-end">
          <button
            className="px-4 py-2 rounded bg-gray-700 text-white"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 rounded bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-white"
            onClick={() => onConfirm(summarizedPrompt)}
          >
            Send Summarized
          </button>
        </div>
      </div>
    </div>
  );
}

function AssistantCodeBlock({ code }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = code;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "absolute";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className="mt-4 border border-gray-800 rounded-lg bg-black/30 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
        <span className="text-xs uppercase tracking-wide text-[#00f5d4] font-semibold">
          Generated Code
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-2 text-xs font-semibold text-white px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 transition-colors"
          aria-label="Copy generated code"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="px-4 py-3 text-sm text-gray-100 font-mono whitespace-pre-wrap">
        {code}
      </pre>
    </div>
  );
}

// In your render, add:
<SummarizePromptModal
  open={showSummarizeModal}
  prompt={summarizedPrompt}
  onConfirm={(newPrompt) => {
    setShowSummarizeModal(false);
    setPrompt(newPrompt);
    handleSubmit(null, { skipSummarize: true });
  }}
  onCancel={() => setShowSummarizeModal(false)}
/>

  // --- Keyboard UX for textarea (single Enter rule, IME safe) ---
  const handlePromptKeyDown = (e) => {
    if (e.isComposing) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const hasMoreScripts = scripts.length >= scriptsLimit;

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

  // --- Accessibility: focus main on onboarding close ---
  useEffect(() => {
    if (!showOnboarding) {
      const main = document.querySelector("main");
      if (main) main.focus();
    }
  }, [showOnboarding]);

  // --- Plan-aware Toasts ---
  useEffect(() => {
    if (
      typeof tokensLeft === "number" &&
      tokensLeft === 0 &&
      planInfo.toastZero
    ) {
      notify({
        message: planInfo.toastZero,
        type: "error",
        duration: 6000,
        cta: {
          label: "Upgrade",
          onClick: () => navigate("/subscribe"),
        },
      });
    }
  }, [tokensLeft, planInfo.toastZero, notify, navigate]);

// If user tries to access /ai with no plan (not logged in), just show loading or allow access (no redirect)
const [showEntitlementLoading, setShowEntitlementLoading] = useState(false);
const [entitlementChecked, setEntitlementChecked] = useState(false);

useEffect(() => {
  let timeout;
  // If auth is ready and user is not logged in, allow access (no loading)
  if (authReady && !user) {
    setEntitlementChecked(true);
    setShowEntitlementLoading(false);
    return;
  }
  // If auth is ready and user is logged in, but tokens are not loaded yet
  if (authReady && user && (!tokens || typeof tokens !== "object")) {
    setShowEntitlementLoading(true);
    setEntitlementChecked(false);
    // Wait up to 8 seconds for billing/tokens to load, then allow access anyway
    timeout = setTimeout(() => {
      setEntitlementChecked(true);
      setShowEntitlementLoading(false);
    }, 8000);
  } else if (
    authReady &&
    user &&
    tokens &&
    (tokens.entitlements || tokens.limit !== undefined)
  ) {
    // tokens loaded (either entitlements or limit present)
    setShowEntitlementLoading(false);
    setEntitlementChecked(true);
  }
  return () => {
    if (timeout) clearTimeout(timeout);
  };
}, [authReady, user, tokens]);

  // --- Plan-aware nudge after successful Free run ---
  useEffect(() => {
    if (
      planKey === "free" &&
      !isSubscriber &&
      messages.some((m) => m.role === "assistant" && !m.pending)
    ) {
      if (
        Math.random() < 0.25 &&
        planInfo.toastNudge &&
        !notifications.some((n) => n.message === planInfo.toastNudge)
      ) {
        notify({
          message: planInfo.toastNudge,
          type: "info",
          duration: 6000,
          cta: {
            label: "Upgrade",
            onClick: () => navigate("/subscribe"),
          },
        });
      }
    }
    // eslint-disable-next-line
  }, [messages, planKey, planInfo.toastNudge, notify, notifications, navigate, isSubscriber]);

  // --- Welcome State (plan-aware) ---
  // moved to its own component: PlanWelcomeCard

  return (
    <React.Fragment>
      {showEntitlementLoading && (
        <div
          style={{
            position: "fixed",
            zIndex: 999999,
            inset: 0,
            background: "rgba(0,0,0,0.98)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: 1,
            transition: "opacity 0.3s",
          }}
        >
          <div>
            <div className="flex flex-col items-center">
              <div className="animate-spin mb-6">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    stroke="#9b5de5"
                    strokeWidth="6"
                    strokeDasharray="60 40"
                  />
                </svg>
              </div>
              <div>Checking your subscription...</div>
              <div className="mt-2 text-base text-gray-400 font-normal">
                Please wait a moment
              </div>
            </div>
          </div>
        </div>
      )}
      {showOnboarding && <OnboardingContainer />}
      {/* --- Dev Panel (only for DEV_EMAIL) --- */}
      {user?.email && user.email.toLowerCase() === DEV_EMAIL && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 99999,
            background: "rgba(30,30,30,0.98)",
            border: "1px solid #9b5de5",
            borderRadius: 12,
            padding: "12px 18px",
            boxShadow: "0 2px 16px rgba(0,0,0,0.25)",
            minWidth: 120,
            minHeight: 48,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div style={{ fontWeight: 700, color: "#9b5de5", fontSize: 13, marginBottom: 6 }}>
            Dev Panel
          </div>
          <button
            style={{
              background: "linear-gradient(90deg, #9b5de5 0%, #00f5d4 100%)",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "6px 14px",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
              boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
              marginBottom: 2,
            }}
            onClick={() => {
              localStorage.setItem("nexusrbx:onboardingComplete", "false");
              setShowOnboarding(true);
              window.dispatchEvent(new Event("nexus:devShowOnboarding"));
            }}
          >
            Show Onboarding
          </button>
          {isSubscriber && (
            <div style={{ color: "#00f5d4", fontSize: 12, marginTop: 8 }}>
              Subscriber mode: All advertising hidden
            </div>
          )}
        </div>
      )}
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
                  onClick={() => navigate("/settings")}
                  className="text-gray-300 hover:text-white transition-colors duration-300"
                >
                  Settings
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
                {/* Plan Badge */}
                <button
                  type="button"
                  onClick={() => navigate("/subscribe")}
                  className="ml-6"
                  title="Manage your plan"
                >
                  <PlanBadge plan={planKey} />
                </button>
              </nav>
            </div>
            {/* Plan Badge for mobile/right */}
            <button
              type="button"
              onClick={() => navigate("/subscribe")}
              className="ml-4 md:hidden"
              title="Manage your plan"
            >
              <PlanBadge plan={planKey} />
            </button>
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
              cta={n.cta}
              secondary={n.secondary}
            >
              {n.children}
            </NotificationToast>
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
              currentChatId={currentChatId}
              currentScriptId={currentScriptId}
              setCurrentScriptId={setCurrentScriptId}
              handleCreateScript={() => {}}
              handleRenameScript={() => {}}
              handleDeleteScript={handleDeleteScript}
              currentScript={currentScript}
              versionHistory={versionHistory}
              onVersionView={() => {}}
              onVersionDownload={() => {}}
              promptSearch={promptSearch}
              setPromptSearch={setPromptSearch}
              isMobile
              onRenameChat={() => {}}
              onDeleteChat={handleDeleteChat}
              onSelectChat={(chatId) => {
                if (!chatId) return;
                setCurrentChatId(chatId);
                openChatById(chatId);
                closeAllMobileSidebars();
              }}
              renderVersionList={renderVersionList}
              plan={planKey}
              planInfo={planInfo}
              onLoadMoreScripts={handleLoadMoreScripts}
              hasMoreScripts={hasMoreScripts}
            />
          <div className="border-t border-gray-800 px-4 py-2 text-xs text-gray-400 text-center">
            {!isSubscriber && planInfo.sidebarStrip}
          </div>
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
              plan={planKey}
              planInfo={planInfo}
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
            currentChatId={currentChatId}
            currentScriptId={currentScriptId}
            setCurrentScriptId={setCurrentScriptId}
            handleCreateScript={() => {}}
            handleRenameScript={() => {}}
            handleDeleteScript={handleDeleteScript}
            currentScript={currentScript}
            versionHistory={versionHistory}
            onVersionView={() => {}}
            onVersionDownload={() => {}}
            promptSearch={promptSearch}
            setPromptSearch={setPromptSearch}
            onRenameChat={() => {}}
            onDeleteChat={handleDeleteChat}
            onSelectChat={(chatId) => {
              if (!chatId) return;
              setCurrentChatId(chatId);
              openChatById(chatId);
              closeAllMobileSidebars();
            }}
            renderVersionList={renderVersionList}
            plan={planKey}
            planInfo={planInfo}
            onLoadMoreScripts={handleLoadMoreScripts}
            hasMoreScripts={hasMoreScripts}
          />
          <div className="border-t border-gray-800 px-4 py-2 text-xs text-gray-400 text-center">
            {planInfo.sidebarStrip}
          </div>
        </aside>
        {/* Main Content */}
        <main className="flex-grow flex flex-col md:flex-row relative md:pr-80">
          {/* Main chat area */}
          <section className="flex-grow flex flex-col md:w-2/3 h-full relative z-10">
            <div className="flex-grow overflow-y-auto px-2 md:px-4 py-6 flex flex-col items-center">
              <div className="w-full mx-auto space-y-6">
                {/* Welcome State */}
                {messages.length === 0 && !isGenerating ? (
                  <PlanWelcomeCard
                    isSubscriber={isSubscriber}
                    planKey={planKey}
                    planInfo={planInfo}
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
                      const coreText = [m.explanation].filter(Boolean).join("\n");
                      const size = getAiBubbleSizing(coreText);
                      const ver = m.versionId
                        ? versionHistory.find((v) => v.id === m.versionId)
                        : versionHistory.find((v) => getVN(v) === getVN(m));
                      const resolvedCode = ver?.code || m.code || "";
                      const resolvedExplanation =
                        ver?.explanation || m.explanation || "";
                      const previewSnippet = "";
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
                              <span className="ml-2">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                    planInfo.badgeFilled
                                      ? plan === "pro"
                                        ? "bg-[#9b5de5] text-white"
                                        : plan === "team"
                                        ? "bg-[#00f5d4] text-black"
                                        : "bg-gray-700 text-gray-200"
                                      : "border border-gray-400 text-gray-300 bg-transparent"
                                  }`}
                                >
                                  {planInfo.planNudge}
                                </span>
                              </span>
                              {m.pending && (
                                <span className="ml-2 px-2 py-0.5 rounded bg-[#00f5d4]/20 text-[#00f5d4] text-xs font-semibold">
                                  Generating…
                                </span>
                              )}
                            </div>
                            {resolvedExplanation && (
                              <div className="mb-2">
                                <div className="font-bold text-[#9b5de5] mb-3 text-sm uppercase tracking-wider opacity-80">
                                  Explanation
                                </div>
                                <div className="space-y-4 text-gray-200 text-[15px] leading-relaxed">
                                  {getExplanationBlocks(resolvedExplanation).map((block, idx) => {
                                    if (block.type === "header") {
                                      return (
                                        <h3
                                          key={`exp-header-${idx}`}
                                          className="text-lg font-bold text-white mt-5 mb-2 border-b border-gray-700 pb-1"
                                        >
                                          {block.text}
                                        </h3>
                                      );
                                    }

                                    if (block.type === "list") {
                                      const ListTag = block.ordered ? "ol" : "ul";
                                      return (
                                        <ListTag
                                          key={`exp-list-${idx}`}
                                          className={`pl-5 space-y-2 marker:text-gray-500 ${
                                            block.ordered ? "list-decimal" : "list-disc"
                                          }`}
                                        >
                                          {block.items.map((item, itemIdx) => (
                                            <li key={`exp-item-${idx}-${itemIdx}`} className="pl-1">
                                              <FormatText text={item} />
                                            </li>
                                          ))}
                                        </ListTag>
                                      );
                                    }

                                    return (
                                      <p key={`exp-paragraph-${idx}`} className="whitespace-pre-line">
                                        <FormatText text={block.text} />
                                      </p>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                            <div className="mb-2 mt-3">
                              <ScriptLoadingBarContainer
                                loading={m.pending}
                                codeReady={!!(m.code || m.content)}
                                filename={safeFile(currentScript?.title || "Script")}
                                displayName={currentScript?.title || "Script"}
                                version={m.versionNumber}
                                language="lua"
                                onView={() => {
                                  const resolvedCode =
                                    (m.code && m.code.trim()) ||
                                    (m.content && m.content.trim()) ||
                                    "";

                                  if (!resolvedCode) {
                                    console.warn("[View] No code to display");
                                    return;
                                  }

                                  setSelectedVersion({
                                    id: m.versionId || cryptoRandomId(),
                                    code: resolvedCode,
                                    explanation: m.explanation || "",
                                    versionNumber: m.versionNumber || null,
                                    projectId: currentScriptId || null,
                                    title: currentScript?.title || "Script",
                                    createdAt: Date.now(),
                                  });
                                }}
                                estimatedLines={resolvedCode ? resolvedCode.split("\n").length : null}
                                saved={!!ver?.code}
                                onSave={async () => {}}
                                previewSnippet={previewSnippet}
                                onCancel={() => {
                                  if (jobAbortRef.current?.abortJob) {
                                    jobAbortRef.current.abortJob();
                                  } else if (jobAbortRef.current?.abort) {
                                    jobAbortRef.current.abort();
                                  }
                                }}
                                jobStage={m.pending ? loadingBarData.stage : null}
                                etaSeconds={m.pending ? loadingBarData.eta : null}
                                plan={planKey}
                              />
                              {/* Free plan nudge */}
                              {planKey === "free" && !isSubscriber && (
                                <div className="mt-2 text-xs text-[#9b5de5] text-center">
                                  Pro users run faster in queue.
                                </div>
                              )}
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
              {/* Token meter */}
<div className="w-full max-w-2xl mx-auto mb-4">
  <TokenBar
    tokensLeft={tokensLeft}
    tokensLimit={tokensLimit}
    resetsAt={tokenRefreshTime}
    plan={planKey}
  />
</div>

{/* If out of tokens: show upgrade/portal CTA instead of form */}
{typeof tokensLeft === "number" && tokensLeft <= 0 ? (
  <div className="w-full max-w-2xl mx-auto mt-2 flex flex-col gap-3 items-center">
    {planKey === "free" ? (
      <>
        <div className="text-sm text-gray-300 text-center">
          You’ve used your free monthly token allowance.
        </div>
        <button
          type="button"
          className="px-4 py-2 rounded bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-white font-semibold shadow hover:scale-105 transition-transform"
          onClick={() => navigate("/subscribe")}
        >
          Choose a Plan
        </button>
      </>
    ) : (
      <>
        <div className="text-sm text-red-400 text-center">
          You’ve reached the monthly limit for the {planKey.charAt(0).toUpperCase() + planKey.slice(1)} plan.
        </div>
        <button
          type="button"
          className="px-4 py-2 rounded bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-white text-sm font-semibold shadow hover:scale-105 transition-transform"
          onClick={() => navigate("/subscribe")}
        >
          Upgrade Plan
        </button>
      </>
    )}
  </div>
) : (
  /* Prompt form */
  <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto" autoComplete="off">
    <div className="relative">
      <textarea
        ref={promptInputRef}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={handlePromptKeyDown}
        placeholder={planInfo?.promptPlaceholder || "Describe the Roblox script you want..."}
        className={`w-full rounded-lg bg-gray-900/60 border border-gray-700 focus:border-[#9b5de5] focus:ring-2 focus:ring-[#9b5de5]/50 transition-all duration-300 py-3 px-4 pr-14 resize-none shadow-lg ${
          promptError ? "border-red-500" : ""
        }`}
        rows="3"
        maxLength={planInfo?.promptCap ?? 2000}
        disabled={isGenerating}
        aria-label="Prompt input"
      ></textarea>

      <button
        type="submit"
        disabled={
          isGenerating ||
          !prompt.trim() ||
          (planInfo?.promptCap ? prompt.length > planInfo.promptCap : false) ||
          (typeof tokensLeft === "number" && tokensLeft <= 0)
        }
        className={`absolute right-3 bottom-3 p-3 rounded-full shadow-lg focus:outline-none focus:ring-2 focus:ring-[#9b5de5] ${
          isGenerating ||
          !prompt.trim() ||
          (planInfo?.promptCap ? prompt.length > planInfo.promptCap : false) ||
          (typeof tokensLeft === "number" && tokensLeft <= 0)
            ? "bg-gray-700 text-gray-400 cursor-not-allowed"
            : "bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-white hover:shadow-xl hover:scale-110"
        }`}
        aria-label="Send prompt"
        title={
          typeof tokensLeft === "number" && tokensLeft <= 0
            ? "Out of tokens — upgrade to continue."
            : "Enter to send • Shift+Enter for newline"
        }
      >
        {isGenerating ? <Loader className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
      </button>
    </div>

    <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
      <div>
        <span className={(planInfo?.promptCap && prompt.length > planInfo.promptCap) ? "text-red-400" : ""}>
          {promptCharCount}/{planInfo?.promptCap ?? 2000}
        </span>
        <span className="ml-2">Press Enter to submit</span>
      </div>
      {promptError && <div className="mt-2 text-xs text-red-400">{promptError}</div>}
      {errorMsg && <div className="mt-2 text-xs text-red-400">{errorMsg}</div>}
      {!user && <div className="mt-2 text-xs text-red-400">Sign in to generate scripts.</div>}
    </div>
  </form>
)}
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
            <div className="p-4 border-b border-gray-800">
              {/* Upgrade Card */}
              {!isSubscriber && planInfo.sidebarCta && (
                <div className={`rounded-lg p-4 mb-4 ${planInfo.sidebarCtaColor}`}>
                  <div className="font-bold text-lg mb-1">{planInfo.sidebarCtaText}</div>
                  <div className="text-sm mb-2">{planInfo.sidebarCtaSub}</div>
                  <button
                    type="button"
                    className="px-3 py-1 rounded bg-black/20 text-white font-semibold shadow hover:bg-black/40 transition-colors"
                    onClick={() => navigate(planInfo.sidebarCtaLink)}
                  >
                    {planInfo.sidebarCta}
                  </button>
                </div>
              )}
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
              plan={planKey}
              planInfo={planInfo}
            />
          </aside>
        </main>
        {/* --- Code Drawer Integration --- */}
        {selectedVersion && (
          <SimpleCodeDrawer
            open={!!selectedVersion}
            code={selectedVersion.code}
            explanation={selectedVersion.explanation || ""}
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
            onSaveScript={async () => {}}
            onLiveOpen={() => {}}
          />
        )}
        {/* Celebration Animation */}
        {showCelebration && <CelebrationAnimation />}
        {/* Footer */}
        <footer className="border-t border-gray-800 py-4 px-4 bg-black/40 text-center text-sm text-gray-500">
          <div className="max-w-6xl mx-auto">
            NexusRBX AI Console • &copy; 2023 NexusRBX. All rights reserved.{" "}
            <span className="ml-2">
              <a
                href="/contact"
                className="text-[#9b5de5] underline hover:text-[#00f5d4] transition-colors"
              >
                Questions about billing? Contact Support
              </a>
            </span>
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
    </React.Fragment>
  );
}

export default AiPage;
