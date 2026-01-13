import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useDeferredValue,
} from "react";
import { useBilling } from "../context/BillingContext";
import { useSettings } from "../context/SettingsContext";
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
  Gamepad2,
  MessageSquare,
  Layout,
  Plus,
  X,
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
import AiTour from "../components/AiTour";
import FancyLoadingOverlay from "../components/FancyLoadingOverlay";
import NotificationToast from "../components/NotificationToast";
import UiPreviewDrawer from "../components/UiPreviewDrawer";
import SignInNudgeModal from "../components/SignInNudgeModal";
import {
  FormatText,
  TokenBar,
  PlanBadge,
  NexusRBXAvatar,
  UserAvatar,
} from "../components/ai/AiComponents";
import UiSpecificationModal from "../components/ai/UiSpecificationModal";
import {
  getExplanationBlocks,
  authedFetch,
  formatNumber,
} from "../lib/aiUtils";
import { sha256 } from "../lib/hash";
import { v4 as uuidv4 } from "uuid";
import {
  normalizeServerVersion,
  sortDesc,
  nextVersionNumber,
  cryptoRandomId,
} from "../lib/versioning";
import { aiPipeline, aiRefineLua } from "../lib/uiBuilderApi";
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
}
if (BACKEND_URL.endsWith("/")) {
  BACKEND_URL = BACKEND_URL.replace(/\/+$/, "");
}

const DEV_EMAIL = process.env.REACT_APP_DEV_EMAIL?.toLowerCase() || "dev@example.com";

const modelOptions = [
  { value: "nexus-4", label: "Nexus-5 (GPT-5.2, High Accuracy)" },
  { value: "nexus-3", label: "Nexus-4 (Legacy, Fast)" },
  { value: "nexus-2", label: "Nexus-2 (Legacy)" },
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
  verbosity: "concise",
  maxOutputTokens: 8000,
  gameSpec: "",
  uiCanvasSize: { w: 1280, h: 720 },
  uiMaxItems: 45,
  uiMaxSystemsTokens: 8000,
  uiThemePrimary: "#00f5d4",
  uiThemeSecondary: "#9b5de5",
  uiThemeAccent: "#f15bb5",
  uiThemeMuted: "#a1a1aa",
  uiThemeFont: "Poppins, Roboto, sans-serif",
};

const getVN = (v) => Number(v?.versionNumber ?? v?.version ?? 0);
const byVN = (a, b) => getVN(b) - getVN(a);

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debounced;
}

const toLocalTime = (ts) => {
  if (!ts) return "";
  const d = new Date(typeof ts === "number" ? ts : Date.parse(ts) || Date.now());
  return isNaN(d.getTime()) ? "" : d.toLocaleString();
};

const safeFile = (title) =>
  ((title || "Script").replace(/[^a-zA-Z0-9_\- ]/g, "").replace(/\s+/g, "_").slice(0, 40) || "Script") + ".lua";


function AiPage() {
  // 1. External Hooks
  const { plan, totalRemaining, subLimit, resetsAt } = useBilling();
  const { settings, updateSettings } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();

  // 2. State Variables
  const [user, setUser] = useState(null);
  const [scripts, setScripts] = useState([]);
  const [scriptsLimit, setScriptsLimit] = useState(50);
  const [currentScriptId, setCurrentScriptId] = useState(null);
  const [currentScript, setCurrentScript] = useState(null);
  const [versionHistory, setVersionHistory] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [messages, setMessages] = useState([]);
  const [prompt, setPrompt] = useState("");
  const [uiGenerations, setUiGenerations] = useState([]); 
  const [activeUiId, setActiveUiId] = useState(null);
  const [uiIsGenerating, setUiIsGenerating] = useState(false);
  const [uiDrawerOpen, setUiDrawerOpen] = useState(false);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [currentChatMeta, setCurrentChatMeta] = useState(null);
  const [activeTab, setActiveTab] = useState("scripts");
  const [showTour, setShowTour] = useState(localStorage.getItem("nexusrbx:tourComplete") !== "true");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [mode, setMode] = useState("ui"); 
  const [showGameContextModal, setShowGameContextModal] = useState(false);
  const [showUiSpecModal, setShowUiSpecModal] = useState(false);
  const [uiSpecs, setUiSpecs] = useState({
    theme: { bg: "#020617", primary: "#00f5d4", secondary: "#9b5de5", accent: "#f15bb5" },
    catalog: [],
    animations: "",
    platforms: ["pc"], // Default to PC
  });
  const [notifications, setNotifications] = useState([]);
  const [promptCharCount, setPromptCharCount] = useState(0);
  const [promptError, setPromptError] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState("idle");
  const [showCelebration, setShowCelebration] = useState(false);
  const [pendingMessage, setPendingMessage] = useState(null);
  const [generationStage, setGenerationStage] = useState("");
  const [showSignInNudge, setShowSignInNudge] = useState(false);

  // 3. Derived State
  const planKey = plan?.toLowerCase() || "free";
  const tokensLeft = totalRemaining;
  const tokensLimit = subLimit;
  const tokenRefreshTime = resetsAt;
  const activeUi = uiGenerations.find((g) => g.id === activeUiId) || uiGenerations[0] || null;

  // 4. Refs
  const messagesUnsubRef = useRef(null);
  const chatUnsubRef = useRef(null);
  const currentChatIdRef = useRef(null);
  const lastCloseTimeRef = useRef(0);
  const userDismissedVersionRef = useRef(false);
  const lastOpenedScriptRef = useRef({ scriptId: null, version: null, ts: 0 });
  const chatEndRef = useRef(null);

  // 5. Callbacks
  const notify = useCallback(({ message, type = "info", duration = 4000, cta, secondary, children }) => {
    setNotifications((prev) => {
      if (prev.some((n) => n.message === message && n.type === type)) return prev;
      return [...prev, { id: uuidv4(), message, type, duration, cta, secondary, children }];
    });
  }, []);

  const handleRefine = useCallback(async (instruction) => {
    if (!activeUi?.lua) return;
    setUiIsGenerating(true);
    try {
      const token = await user.getIdToken();
      
      // Enhancement: If the Lua contains real asset IDs, tell the AI to preserve them
      let enhancedInstruction = instruction;
      if (activeUi.lua.includes("rbxassetid://") && !activeUi.lua.includes("rbxassetid://0")) {
        enhancedInstruction += " (IMPORTANT: Preserve all existing rbxassetid links, do not revert them to placeholders)";
      }

      const data = await aiRefineLua({
        token,
        lua: activeUi.lua,
        instruction: enhancedInstruction,
      });

      if (data.lua) {
        const id = cryptoRandomId();
        setUiGenerations((prev) => [
          { id, lua: data.lua, prompt: `Refine: ${instruction}`, createdAt: Date.now() },
          ...prev,
        ]);
        setActiveUiId(id);
        const tokenMsg = data.tokensConsumed ? ` (${formatNumber(data.tokensConsumed)} tokens used)` : "";
        notify({ message: `UI refined successfully${tokenMsg}`, type: "success" });
      }
    } catch (e) {
      notify({ message: "Refinement failed", type: "error" });
    } finally {
      setUiIsGenerating(false);
    }
  }, [activeUi, user, notify, settings.gameSpec]);

  const openChatById = useCallback((chatId) => {
    const db = getFirestore(); const u = auth.currentUser;
    if (!u || !chatId) return;
    messagesUnsubRef.current?.(); chatUnsubRef.current?.();
    setCurrentChatId(chatId);
    chatUnsubRef.current = onSnapshot(doc(db, "users", u.uid, "chats", chatId), (snap) => {
      const data = snap.exists() ? { id: snap.id, ...snap.data() } : null;
      setCurrentChatMeta(data || null);
      setCurrentScriptId(data?.projectId || null);
    });
    messagesUnsubRef.current = onSnapshot(query(collection(db, "users", u.uid, "chats", chatId, "messages"), orderBy("createdAt", "asc"), limitToLast(200)), (snap) => {
      const arr = []; snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
      setMessages(arr);
    });
  }, []);

  // 6. Effects
  useEffect(() => { currentChatIdRef.current = currentChatId; }, [currentChatId]);

  useEffect(() => {
    if (location?.state?.initialPrompt) {
      setPrompt(location.state.initialPrompt);
      window.history.replaceState({}, document.title);
    } else {
      const saved = localStorage.getItem("nexusrbx:prompt_draft");
      if (saved) setPrompt(saved);
    }
  }, [location]);

  useEffect(() => {
    if (prompt) {
      localStorage.setItem("nexusrbx:prompt_draft", prompt);
    }
  }, [prompt]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
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

  // Show Sign-In Nudge for anonymous users on Free plan
  useEffect(() => {
    if (user && user.isAnonymous && planKey === "free") {
      const hasShownNudge = sessionStorage.getItem("nexusrbx:signInNudgeShown");
      if (!hasShownNudge) {
        const timer = setTimeout(() => {
          setShowSignInNudge(true);
          sessionStorage.setItem("nexusrbx:signInNudgeShown", "true");
        }, 1500); // Slight delay for better UX
        return () => clearTimeout(timer);
      }
    }
  }, [user, planKey]);

  useEffect(() => {
    if (!user) { setScripts([]); return; }
    const db = getFirestore();
    const q = query(collection(db, "users", user.uid, "scripts"), orderBy("updatedAt", "desc"), limit(scriptsLimit));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data(), updatedAt: d.data().updatedAt?.toMillis?.() || Date.now(), createdAt: d.data().createdAt?.toMillis?.() || Date.now() }));
      setScripts(list);
    });
    return () => unsub();
  }, [user, scriptsLimit]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, pendingMessage]);

  useEffect(() => {
    if (currentChatId) {
      openChatById(currentChatId);
    }
  }, [currentChatId, openChatById]);

  useEffect(() => {
    const onOpenChat = (e) => e?.detail?.id && openChatById(e.detail.id);
    const onStartDraft = () => { setCurrentChatId(null); setCurrentChatMeta(null); setCurrentScriptId(null); setCurrentScript(null); setVersionHistory([]); setMessages([]); setSelectedVersion(null); };
    const onOpenCodeDrawer = (e) => {
      const { scriptId, code, title, versionNumber, explanation, savedScriptId } = e.detail || {};
      const script = scripts.find(s => s.id === scriptId);
      if (script?.type === "ui") {
        const fetchUiCode = async () => {
          const db = getFirestore(); const uid = user?.uid || auth.currentUser?.uid; if (!uid) return;
          const snap = await getDocs(query(collection(db, "users", uid, "scripts", scriptId, "versions"), orderBy("versionNumber", "desc"), limit(1)));
          if (!snap.empty) {
            const data = snap.docs[0].data(); setActiveUiId(scriptId);
            setUiGenerations(prev => prev.some(g => g.id === scriptId) ? prev : [{ id: scriptId, lua: data.code, prompt: script.title, createdAt: Date.now() }, ...prev]);
            setUiDrawerOpen(true);
          }
        };
        fetchUiCode(); return;
      }
      if (code && code !== "-- No code found") {
        setSelectedVersion({ id: savedScriptId || `temp-${Date.now()}`, projectId: scriptId || null, code, title: title || "Script", explanation: explanation || "", versionNumber: versionNumber || null, isSavedView: true });
      }
    };
    window.addEventListener("nexus:openChat", onOpenChat);
    window.addEventListener("nexus:startDraft", onStartDraft);
    window.addEventListener("nexus:openCodeDrawer", onOpenCodeDrawer);
    return () => {
      window.removeEventListener("nexus:openChat", onOpenChat);
      window.removeEventListener("nexus:startDraft", onStartDraft);
      window.removeEventListener("nexus:openCodeDrawer", onOpenCodeDrawer);
    };
  }, [openChatById, scripts, user]);

  // 7. Helper Functions
  function downloadLuaFile(lua, name = "generated_ui.lua") {
    if (!lua) return;
    const blob = new Blob([lua], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  }

  async function handleGenerateUiPreview(specs = null) {
    const content = prompt.trim();
    if (!content) { notify({ message: "Describe the UI you want first.", type: "error" }); return; }
    
    // Hard gate for anonymous users
    if (!user || user.isAnonymous) {
      setShowSignInNudge(true);
      return;
    }

    if (!specs && mode === "ui") { setShowUiSpecModal(true); return; }

    setUiIsGenerating(true);

    // Fetch contextual icons from Firestore
    let contextualCatalog = specs?.catalog || [];
    try {
      const params = new URLSearchParams();
      params.append("search", content.split(' ').slice(0, 3).join(' ')); // Use first 3 words of prompt for search
      params.append("limit", "15");
      const res = await fetch(`${BACKEND_URL}/api/icons/market?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.icons && data.icons.length > 0) {
          const firestoreIcons = data.icons.map(icon => ({
            name: icon.name,
            iconId: icon.imageUrl, // Use URL as temporary ID
            style: icon.style,
            category: icon.category
          }));
          contextualCatalog = [...contextualCatalog, ...firestoreIcons];
        }
      }
    } catch (e) {
      console.warn("Failed to fetch contextual icons:", e);
    }

    setPendingMessage({ role: "assistant", content: "", type: "ui", prompt: content });
    setGenerationStage("Planning Layout...");
    setPrompt("");
    
    const db = getFirestore();
    let activeChatId = currentChatId;
    const requestId = uuidv4();

    try {
      const token = await user.getIdToken();
      const canvasSize = settings.uiCanvasSize || { w: 1280, h: 720 };
      const maxItems = Number(settings.uiMaxItems || 45);
      const themeHint = {
        bg: "#020617", panel: "#0b1220", border: "#334155", text: "#e5e7eb",
        muted: settings.uiThemeMuted || "#a1a1aa", primary: settings.uiThemePrimary || "#00f5d4",
        secondary: settings.uiThemeSecondary || "#9b5de5", accent: settings.uiThemeAccent || "#f15bb5",
        radius: "12px", font: settings.uiThemeFont || "Poppins, Roboto, sans-serif",
      };

      if (!activeChatId) {
        const newChatRef = await addDoc(collection(db, "users", user.uid, "chats"), {
          title: prompt.trim().slice(0, 30) + (prompt.length > 30 ? "..." : ""),
          createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
        });
        activeChatId = newChatRef.id;
        setCurrentChatId(activeChatId);
      }

      const userMsgRef = doc(db, "users", user.uid, "chats", activeChatId, "messages", `${requestId}-user`);
      await setDoc(userMsgRef, { role: "user", content: content, createdAt: serverTimestamp(), requestId });

      setGenerationStage("Analyzing Components...");
      // Simulate pipeline stages since aiPipeline is a single call
      const stageTimer = setTimeout(() => setGenerationStage("Writing Luau Code..."), 3000);

      const pipe = await aiPipeline({
        token, 
        prompt: `${content} (IMPORTANT: Use the provided icons from the catalog where appropriate. If an icon from the catalog fits a UI element, use its iconId as the Image property.)`, 
        canvasSize, themeHint, maxItems,
        gameSpec: settings.gameSpec || "", maxSystemsTokens: settings.uiMaxSystemsTokens,
        catalog: contextualCatalog, animations: specs?.animations || "", customTheme: specs?.theme || null,
        platforms: specs?.platforms || ["pc"],
      });

      clearTimeout(stageTimer);
      setGenerationStage("Finalizing UI...");

      const boardState = pipe?.boardState;
      if (!boardState) throw new Error("No boardState returned");
      const lua = pipe?.lua || "";
      if (!lua) throw new Error("No Lua returned");

      const scriptId = cryptoRandomId();
      const resultTitle = prompt.trim().slice(0, 30) + " (UI)";

      await setDoc(doc(db, "users", user.uid, "scripts", scriptId), {
        title: resultTitle, chatId: activeChatId, type: "ui", updatedAt: serverTimestamp(), createdAt: serverTimestamp(),
      });

      const versionId = uuidv4();
      await setDoc(doc(db, "users", user.uid, "scripts", scriptId, "versions", versionId), {
        code: lua, title: resultTitle, versionNumber: 1, createdAt: serverTimestamp(),
      });

      const assistantMsgRef = doc(db, "users", user.uid, "chats", activeChatId, "messages", `${requestId}-assistant`);
      await setDoc(assistantMsgRef, {
        role: "assistant", content: "", code: lua, projectId: scriptId, versionNumber: 1,
        metadata: { type: "ui" }, createdAt: serverTimestamp(), requestId,
      });

      const entry = { id: scriptId, createdAt: Date.now(), prompt: prompt.trim(), boardState, lua };
      setUiGenerations((prev) => [entry, ...(prev || [])]);
      setActiveUiId(scriptId);
      setSelectedVersion(null);
      setUiDrawerOpen(true);
      setPrompt("");
      const tokenMsg = pipe?.tokensConsumed ? ` (${formatNumber(pipe.tokensConsumed)} tokens used)` : "";
      notify({ message: `UI generated and saved.${tokenMsg}`, type: "success" });
    } catch (e) {
      notify({ message: e?.message || "UI generation failed", type: "error" });
    } finally {
      setUiIsGenerating(false);
      setPendingMessage(null);
      setGenerationStage("");
    }
  }

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    const content = prompt.trim();
    if (!content || isGenerating) return;

    // Hard gate for anonymous users
    if (!user || user.isAnonymous) {
      setShowSignInNudge(true);
      return;
    }

    setIsGenerating(true);
    setPendingMessage({ role: "assistant", content: "", type: "chat", prompt: content });
    setGenerationStage("Analyzing Request...");
    setPrompt("");
    localStorage.removeItem("nexusrbx:prompt_draft");

    const db = getFirestore();
    let activeChatId = currentChatId;
    const requestId = uuidv4();

    try {
      // 1. Ensure we have a chat
      if (!activeChatId) {
        const newChatRef = await addDoc(collection(db, "users", user.uid, "chats"), {
          title: content.slice(0, 30) + (content.length > 30 ? "..." : ""),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        activeChatId = newChatRef.id;
        setCurrentChatId(activeChatId);
      }

      // 2. Save User Message
      const userMsgRef = doc(db, "users", user.uid, "chats", activeChatId, "messages", `${requestId}-user`);
      await setDoc(userMsgRef, {
        role: "user",
        content: content,
        createdAt: serverTimestamp(),
        requestId,
      });

      // 3. Generate Code/Response
      setGenerationStage("Generating Response...");
      const token = await user.getIdToken();
      const res = await fetch(`${BACKEND_URL}/api/generate-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ 
          prompt: content, 
          settings,
          conversation: messages.slice(-10).map(m => ({ role: m.role, content: m.content || m.explanation }))
        }),
      });
      
      setGenerationStage("Finalizing...");
      const data = await res.json();
      
      if (data.code || data.explanation) {
        // 4. Save Assistant Message
        const assistantMsgRef = doc(db, "users", user.uid, "chats", activeChatId, "messages", `${requestId}-assistant`);
        await setDoc(assistantMsgRef, {
          role: "assistant",
          content: "",
          explanation: data.explanation || "",
          code: data.code || "",
          createdAt: serverTimestamp(),
          requestId,
        });

        // Update chat timestamp
        await updateDoc(doc(db, "users", user.uid, "chats", activeChatId), {
          updatedAt: serverTimestamp(),
          lastMessage: content.slice(0, 50),
        });
      }
    } catch (e) {
      console.error(e);
      notify({ message: "Generation failed", type: "error" });
    } finally {
      setIsGenerating(false);
      setPendingMessage(null);
      setGenerationStage("");
    }
  };

  const handleDeleteChat = async (chatId) => {
    if (!user || !chatId) return;
    const db = getFirestore();
    try {
      await deleteDoc(doc(db, "users", user.uid, "chats", chatId));
      if (currentChatId === chatId) {
        setCurrentChatId(null);
        setCurrentChatMeta(null);
        setMessages([]);
      }
      notify({ message: "Chat deleted successfully", type: "success" });
    } catch (err) {
      notify({ message: "Failed to delete chat: " + err.message, type: "error" });
    }
  };

  const handleClearChat = async () => {
    if (!user || !currentChatId) return;
    const db = getFirestore();
    try {
      const msgsSnap = await getDocs(collection(db, "users", user.uid, "chats", currentChatId, "messages"));
      const batch = writeBatch(db);
      msgsSnap.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      setMessages([]);
      notify({ message: "Conversation cleared", type: "success" });
    } catch (err) {
      notify({ message: "Failed to clear conversation: " + err.message, type: "error" });
    }
  };

  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans flex flex-col relative overflow-hidden">
      {/* Background Glows */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#9b5de5]/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#00f5d4]/10 blur-[120px] rounded-full pointer-events-none" />

      <header className="border-b border-white/5 bg-black/40 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text cursor-pointer" onClick={() => navigate("/")}>NexusRBX</div>
          <div className="flex items-center gap-4">
            <div id="tour-mode-toggle" className="bg-gray-900/80 border border-gray-800 rounded-full p-1 flex items-center gap-1">
              <button onClick={() => setMode("ui")} className={`px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 transition-all ${mode === "ui" ? "bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-white shadow-md" : "text-gray-400 hover:text-white"}`}><Layout className="h-4 w-4" />UI Builder</button>
              <button onClick={() => setMode("chat")} className={`px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 transition-all ${mode === "chat" ? "bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-white shadow-md" : "text-gray-400 hover:text-white"}`}><MessageSquare className="h-4 w-4" />Chat Mode</button>
            </div>
            <PlanBadge plan={planKey} />
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <aside id="tour-sidebar" className={`fixed inset-y-0 left-0 z-40 w-72 bg-gray-900 border-r border-gray-800 flex flex-col transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="flex items-center justify-between p-4 border-b border-gray-800 md:hidden">
            <span className="font-bold text-[#00f5d4]">NexusRBX</span>
            <button onClick={() => setSidebarOpen(false)} className="p-1 text-gray-400 hover:text-white">
              <X className="h-6 w-6" />
            </button>
          </div>
          <SidebarContent
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
            scripts={scripts} 
            currentChatId={currentChatId} 
            currentScriptId={currentScriptId}
            onSelectChat={(id) => { openChatById(id); setSidebarOpen(false); }} 
            onOpenGameContext={() => setShowGameContextModal(true)}
            onDeleteChat={handleDeleteChat}
            handleClearChat={handleClearChat}
          />
        </aside>

        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main className="flex-1 flex flex-col relative min-w-0">
          <div className="md:hidden flex items-center p-4 border-b border-white/5 bg-black/40 backdrop-blur-xl sticky top-0 z-20">
            <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 text-gray-400 hover:text-white">
              <Menu className="h-6 w-6" />
            </button>
            <span className="ml-2 font-bold bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">NexusRBX Console</span>
          </div>
          <div className="flex-grow overflow-y-auto px-4 py-6 scrollbar-hide">
            <div className="w-full max-w-5xl mx-auto space-y-6">
              {messages.length === 0 && !isGenerating ? (
                <div className="min-h-[50vh] flex items-center justify-center">
                  <div className="w-full max-w-4xl text-center space-y-4">
                    <h2 className="text-3xl font-bold">Welcome back, {user?.email?.split('@')[0] || 'Developer'}</h2>
                    {mode === "ui" ? (
                      <div className="space-y-3">
                        <p className="text-sm text-gray-400">Describe any interface—from main menus to complex inventory systems.</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <button onClick={() => setPrompt("Military themed main menu with Play, Settings, Shop")} className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 hover:border-[#00f5d4] text-left">
                            <div className="font-bold">Military Menu</div><div className="text-xs text-gray-500">Tactical & clean</div>
                          </button>
                          <button onClick={() => setPrompt("Fantasy RPG HUD with health/mana orbs")} className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 hover:border-[#00f5d4] text-left">
                            <div className="font-bold">RPG HUD</div><div className="text-xs text-gray-500">Immersive gameplay</div>
                          </button>
                          <button onClick={() => setPrompt("Modern shop UI with item categories")} className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 hover:border-[#00f5d4] text-left">
                            <div className="font-bold">Modern Shop</div><div className="text-xs text-gray-500">Clean & functional</div>
                          </button>
                        </div>
                      </div>
                    ) : <p className="text-gray-400">How can I help you with your Roblox game today?</p>}
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((m) => (
                    <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} gap-4 group animate-in fade-in slide-in-from-bottom-4 duration-500`}>
                      {m.role === 'assistant' && <NexusRBXAvatar />}
                      <div className={`max-w-[85%] md:max-w-[80%] ${m.role === 'user' ? 'order-1' : 'order-2'}`}>
                        <div className={`p-4 md:p-5 rounded-2xl ${m.role === 'user' 
                          ? 'bg-gradient-to-br from-[#9b5de5] to-[#00f5d4] text-white shadow-[0_8px_32px_rgba(155,93,229,0.2)] border border-white/10' 
                          : 'bg-[#121212] border border-white/5 backdrop-blur-md shadow-xl'}`}>
                          {m.content && m.role === 'user' && <div className="text-[14px] md:text-[15px] whitespace-pre-wrap leading-relaxed text-white">{m.content}</div>}
                          {m.explanation && <div className="text-[14px] md:text-[15px] whitespace-pre-wrap leading-relaxed text-gray-100"><FormatText text={m.explanation} /></div>}
                          {m.role === 'assistant' && m.code && (
                            <div className="mt-4">
                              <ScriptLoadingBarContainer
                                filename={m.title || "Generated_Script.lua"}
                                codeReady={!!m.code}
                                loading={false}
                                onView={() => {
                                  const entry = { 
                                    id: m.id, 
                                    lua: m.code, 
                                    prompt: m.content || "Chat Generated UI", 
                                    createdAt: m.createdAt 
                                  };
                                  setUiGenerations(prev => prev.some(g => g.id === m.id) ? prev : [entry, ...prev]);
                                  setActiveUiId(m.id);
                                  setUiDrawerOpen(true);
                                }}
                              />
                            </div>
                          )}
                        </div>
                        {m.role === 'assistant' && m.code && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {["Make it more blue", "Add a close button", "Make it mobile friendly", "Add animations"].map((chip) => (
                              <button
                                key={chip}
                                onClick={() => {
                                  setPrompt(chip);
                                  if (mode === "ui") {
                                    const entry = { id: m.id, lua: m.code, prompt: m.content, createdAt: m.createdAt };
                                    setUiGenerations(prev => prev.some(g => g.id === m.id) ? prev : [entry, ...prev]);
                                    setActiveUiId(m.id);
                                    handleRefine(chip);
                                  }
                                }}
                                className="px-3 py-1 rounded-full bg-gray-800/50 border border-gray-700 text-[11px] text-gray-400 hover:border-[#00f5d4] hover:text-white transition-all"
                              >
                                {chip}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {m.role === 'user' && <UserAvatar email={user?.email} />}
                    </div>
                  ))}

                  {/* Optimistic Pending Message */}
                  {pendingMessage && (
                    <>
                      <div className="flex justify-end gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="max-w-[80%] order-1">
                          <div className="p-5 rounded-2xl bg-gradient-to-br from-[#9b5de5]/60 to-[#00f5d4]/60 text-white shadow-lg border border-white/10 backdrop-blur-sm">
                            <div className="text-[15px] whitespace-pre-wrap">{pendingMessage.prompt}</div>
                          </div>
                        </div>
                        <UserAvatar email={user?.email} />
                      </div>

                      <div className="flex justify-start gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <NexusRBXAvatar isThinking={true} />
                        <div className="max-w-[80%] order-2">
                          <div className="p-6 rounded-2xl bg-[#121212] border border-[#9b5de5]/40 backdrop-blur-xl shadow-[0_0_40px_rgba(155,93,229,0.15)] relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite] pointer-events-none" />
                            
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div className="relative">
                                  <div className="absolute inset-0 bg-[#00f5d4] blur-md opacity-20 animate-pulse" />
                                  <Loader className="w-5 h-5 text-[#00f5d4] animate-spin relative z-10" />
                                </div>
                                <span className="text-sm font-bold bg-gradient-to-r from-[#00f5d4] to-[#9b5de5] text-transparent bg-clip-text uppercase tracking-wider">
                                  Nexus is crafting...
                                </span>
                              </div>
                              <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest animate-pulse">
                                {generationStage}
                              </div>
                            </div>

                            <div className="space-y-4">
                              <ScriptLoadingBarContainer
                                filename={pendingMessage.type === "ui" ? "Nexus_UI_Engine.lua" : "Nexus_Script_Engine.lua"}
                                loading={true}
                                stage={generationStage}
                                jobProgress={generationStage === "Finalizing..." ? 0.95 : 0.4}
                              />
                              <div className="flex gap-1.5">
                                {[1, 2, 3].map(i => (
                                  <div key={i} className="h-1 w-8 rounded-full bg-white/5 overflow-hidden">
                                    <div 
                                      className="h-full bg-[#9b5de5] animate-[loading_1.5s_infinite]" 
                                      style={{ animationDelay: `${i * 0.2}s` }} 
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                  <div ref={chatEndRef} />
                </>
              )}
            </div>
          </div>

          <div className="p-4 bg-gradient-to-t from-black via-black/80 to-transparent">
            <div className="max-w-5xl mx-auto space-y-4">
              <div id="tour-token-bar" className="px-2">
                <TokenBar tokensLeft={tokensLeft} tokensLimit={tokensLimit} resetsAt={tokenRefreshTime} plan={planKey} />
              </div>
              
              <div id="tour-prompt-box" className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] rounded-2xl blur opacity-20 group-focus-within:opacity-40 transition duration-500" />
                <div className="relative bg-[#121212] border border-white/10 rounded-2xl p-2 shadow-2xl">
                  <textarea
                    className="w-full bg-transparent border-none rounded-xl p-3 pr-16 resize-none focus:ring-0 text-gray-100 placeholder-gray-500 text-[14px] leading-relaxed disabled:opacity-50"
                    rows="2" placeholder={mode === "ui" ? "Describe the UI you want to build..." : "Ask anything about Roblox development..."}
                    value={prompt} onChange={(e) => setPrompt(e.target.value)}
                    disabled={isGenerating || uiIsGenerating}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && mode === 'chat') {
                        e.preventDefault();
                        handleSubmit();
                      }
                    }}
                  />
                  {mode === "chat" && (
                    <button 
                      onClick={handleSubmit} 
                      disabled={isGenerating || uiIsGenerating || !prompt.trim()}
                      className="absolute right-4 bottom-4 p-3 rounded-xl bg-gradient-to-br from-[#9b5de5] to-[#00f5d4] text-white hover:shadow-[0_0_20px_rgba(155,93,229,0.4)] transition-all disabled:opacity-50 disabled:grayscale"
                    >
                      {isGenerating ? <Loader className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                    </button>
                  )}
                </div>
              </div>

              {mode === "ui" && (
                <button 
                  id="tour-generate-button"
                  onClick={() => handleGenerateUiPreview()} 
                  disabled={isGenerating || uiIsGenerating || !prompt.trim()}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-white font-bold text-lg flex items-center justify-center gap-3 hover:shadow-[0_0_30px_rgba(0,245,212,0.3)] transition-all active:scale-[0.98] disabled:opacity-50 disabled:grayscale"
                >
                  {uiIsGenerating ? (
                    <>
                      <Loader className="h-5 w-5 animate-spin" />
                      Generating UI...
                    </>
                  ) : (
                    <>
                      <Layout className="h-5 w-5" /> 
                      Generate UI & Preview
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </main>
      </div>

      <UiPreviewDrawer
        open={uiDrawerOpen}
        onClose={() => setUiDrawerOpen(false)}
        lua={activeUi?.lua || ""}
        prompt={activeUi?.prompt || ""}
        history={uiGenerations}
        activeId={activeUiId}
        onSelectHistory={(id) => setActiveUiId(id)}
        onDownload={() => downloadLuaFile(activeUi?.lua, "generated_ui.lua")}
        user={user}
        settings={settings}
        onRefine={handleRefine}
        onUpdateLua={(newLua) => {
          if (activeUiId) {
            setUiGenerations(prev => prev.map(g => g.id === activeUiId ? { ...g, lua: newLua } : g));
          }
        }}
      />

      {showUiSpecModal && (
        <UiSpecificationModal
          onClose={() => setShowUiSpecModal(false)}
          initialSpecs={uiSpecs}
          onConfirm={(specs) => { setUiSpecs(specs); setShowUiSpecModal(false); handleGenerateUiPreview(specs); }}
        />
      )}

      {showGameContextModal && (
        <Modal onClose={() => setShowGameContextModal(false)} title="Game Context">
          <div className="space-y-4">
            <textarea 
              className="w-full h-40 bg-gray-800 border border-gray-700 rounded-lg p-3 text-white text-sm outline-none" 
              value={settings.gameSpec} 
              onChange={(e) => updateSettings({ gameSpec: e.target.value })} 
            />
            <button className="w-full py-2 rounded-lg bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-white font-bold" onClick={() => setShowGameContextModal(false)}>Save Context</button>
          </div>
        </Modal>
      )}

      <SignInNudgeModal 
        isOpen={showSignInNudge} 
        onClose={() => setShowSignInNudge(false)} 
      />

      {showTour && (
        <AiTour 
          onComplete={() => {
            localStorage.setItem("nexusrbx:tourComplete", "true");
            localStorage.setItem("nexusrbx:onboardingComplete", "true");
            setShowTour(false);
          }}
          onSkip={() => {
            localStorage.setItem("nexusrbx:tourComplete", "true");
            setShowTour(false);
            setShowOnboarding(true);
          }}
        />
      )}

      {showOnboarding && (
        <OnboardingContainer 
          forceShow={true} 
          onComplete={() => setShowOnboarding(false)} 
        />
      )}

      <style>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
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


export default AiPage;
