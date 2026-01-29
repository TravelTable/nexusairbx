import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { useBilling } from "../context/BillingContext";
import { useSettings } from "../context/SettingsContext";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Loader,
  Menu,
  Library,
  Plus,
  Sparkles,
  Search,
  Zap,
  Layout,
  X,
} from "lucide-react";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import SidebarContent from "../components/SidebarContent";
import NexusRBXHeader from "../components/NexusRBXHeader";
import AiTour from "../components/AiTour";
import OnboardingContainer from "../components/OnboardingContainer";
import UiPreviewDrawer from "../components/UiPreviewDrawer";
import CodeDrawer from "../components/CodeDrawer";
import SignInNudgeModal from "../components/SignInNudgeModal";
import ProNudgeModal from "../components/ProNudgeModal";
import {
  TokenBar,
  CustomModeModal,
  UnifiedStatusBar,
  ProjectContextStatus,
} from "../components/ai/AiComponents";
import NotificationToast from "../components/NotificationToast";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
  setDoc,
  addDoc,
  doc,
  serverTimestamp,
  deleteDoc,
} from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";

import { BACKEND_URL } from "../lib/uiBuilderApi";

// Hooks
import { useAiChat } from "../hooks/useAiChat";
import { useUiBuilder } from "../hooks/useUiBuilder";
import { useGameProfile } from "../hooks/useGameProfile";
import { useAiScripts } from "../hooks/useAiScripts";
import { useAgent } from "../hooks/useAgent";

// Components
import ChatView, { CHAT_MODES } from "../components/ai/ChatView";
import LibraryView from "../components/ai/LibraryView";
import GameProfileWizard from "../components/ai/GameProfileWizard";

function AiPage() {
  // 1. External Hooks
  const { plan, totalRemaining, subLimit, resetsAt, refresh: refreshBilling } = useBilling();
  const { settings, updateSettings } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();

  // 2. Local State
  const [user, setUser] = useState(null);
  const [scripts, setScripts] = useState([]);
  const [scriptsLimit] = useState(50);
  const [activeTab, setActiveTab] = useState("chat"); // "chat" | "library"
  const [mobileTab, setMobileTab] = useState("chat"); // "chat" | "preview"
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Map sidebar tabs to main tabs
  const handleSidebarTabChange = (sidebarTab) => {
    if (sidebarTab === "scripts" || sidebarTab === "chats" || sidebarTab === "agent") setActiveTab("chat");
    else if (sidebarTab === "saved") {
      if (planKey === "free") {
        setProNudgeReason("Saved Scripts Library");
        setShowProNudge(true);
        return;
      }
      setActiveTab("library");
    }
  };

  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 1024);
  const [prompt, setPrompt] = useState("");
  const [showTour, setShowTour] = useState(localStorage.getItem("nexusrbx:tourComplete") !== "true");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSignInNudge, setShowSignInNudge] = useState(false);
  const [customModeModalOpen, setCustomModeModalOpen] = useState(false);
  const [editingCustomMode, setEditingCustomMode] = useState(null);
  const [showProNudge, setShowProNudge] = useState(false);
  const [proNudgeReason, setProNudgeReason] = useState("");
  const [projectContext, setProjectContext] = useState(null);
  const [teams, setTeams] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [toast, setToast] = useState(null);

  // Code Drawer State
  const [codeDrawerOpen, setCodeDrawerOpen] = useState(false);
  const [codeDrawerData, setCodeDrawerData] = useState({ code: "", title: "", explanation: "" });

  // 3. Custom Hooks
  const notify = useCallback(({ message, type = "info" }) => {
    console.log(`[${type}] ${message}`);
  }, []);

  const chat = useAiChat(user, settings, refreshBilling, notify);
  const ui = useUiBuilder(user, settings, refreshBilling, notify);
  const game = useGameProfile(settings, updateSettings);
  const scriptManager = useAiScripts(user, notify);
  const agent = useAgent(user, notify, refreshBilling);

  // Auto-focus prompt box on mode change or new chat
  useEffect(() => {
    const el = document.getElementById("tour-prompt-box");
    if (el) el.focus();
  }, [chat.activeMode, chat.currentChatId]);

  // Listen for startDraft event
  useEffect(() => {
    const handleStartDraft = () => {
      chat.startNewChat();
      setActiveTab("chat");
    };
    window.addEventListener("nexus:startDraft", handleStartDraft);
    return () => window.removeEventListener("nexus:startDraft", handleStartDraft);
  }, [chat]);

  // 4. Derived State
  const planKey = plan?.toLowerCase() || "free";
  const chatEndRef = useRef(null);

  const activeModeData = CHAT_MODES.find(m => m.id === chat.activeMode) || CHAT_MODES[0];

  // Mode-specific theme colors for background glows
  const modeColors = {
    general: { primary: "#9b5de5", secondary: "#00f5d4" },
    ui: { primary: "#00f5d4", secondary: "#9b5de5" },
    logic: { primary: "#9b5de5", secondary: "#f15bb5" },
    system: { primary: "#00bbf9", secondary: "#00f5d4" },
    animator: { primary: "#f15bb5", secondary: "#fee440" },
    data: { primary: "#fee440", secondary: "#00f5d4" },
    performance: { primary: "#00f5d4", secondary: "#00bbf9" },
    security: { primary: "#ff006e", secondary: "#8338ec" },
  };
  const currentTheme = modeColors[chat.activeMode] || modeColors.general;

  // Mode-specific quick actions
  const quickActions = {
    ui: [
      { label: "✨ Generate Layout", prompt: "/ui Generate a modern layout for a " },
      { label: "🎨 Glassmorphism", prompt: "Apply a glassmorphism theme to this UI" },
    ],
    security: [
      { label: "🛡️ Audit Remotes", prompt: "Audit my RemoteEvents for vulnerabilities: " },
      { label: "🔑 Check Scopes", prompt: "Check my DataStore scopes for security issues" },
    ],
    logic: [
      { label: "⚡ Optimize Loop", prompt: "Optimize this loop for performance: " },
      { label: "🛠️ Convert to Module", prompt: "Convert this script into a modular Luau component" },
    ],
    performance: [
      { label: "📊 Memory Audit", prompt: "Audit this code for potential memory leaks: " },
      { label: "🚀 Speed Up", prompt: "Suggest micro-optimizations to speed up this function: " },
    ],
  };
  const currentActions = quickActions[chat.activeMode] || [];

  // Mode-specific power tools
  const powerTools = {
    ui: [
      { label: "Simulator Style", prompt: "Apply a high-quality Simulator style to this UI (bright colors, thick strokes, playful fonts)" },
      { label: "Glassmorphism", prompt: "Apply a modern Glassmorphism style to this UI (transparency, blur, thin white strokes)" },
      { label: "Minimalist", prompt: "Apply a clean, professional Minimalist style to this UI (flat colors, ample whitespace, sharp corners)" },
    ],
    animator: [
      { label: "Smooth Fade", prompt: "Add a smooth fade-in/out animation to this UI using TweenService" },
      { label: "Spring Bounce", prompt: "Add a juicy spring bounce effect to the buttons" },
    ],
    logic: [
      { label: "Convert to OOP", prompt: "Refactor this code to use an Object-Oriented Programming (OOP) pattern" },
      { label: "Add Type-Checking", prompt: "Add strict Luau type-checking to this script" },
    ],
  };
  const currentPowerTools = powerTools[chat.activeMode] || [];

  // 5. Effects
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
      } else {
        setUser(null);
        navigate("/signin");
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!user) {
      setScripts([]);
      return;
    }
    const q = query(
      collection(db, "users", user.uid, "scripts"),
      orderBy("updatedAt", "desc"),
      limit(scriptsLimit)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          updatedAt: d.data().updatedAt?.toMillis?.() || Date.now(),
          createdAt: d.data().createdAt?.toMillis?.() || Date.now(),
        }));
        setScripts(list);
      },
      (err) => {
        console.error("Firestore scripts subscription error:", err);
        notify({ message: "Failed to sync scripts library", type: "error" });
      }
    );
    return () => unsub();
  }, [user, scriptsLimit, notify]);

  useEffect(() => {
    if (location?.state?.initialPrompt) {
      setPrompt(location.state.initialPrompt);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Listen for Code Drawer & Script Saving events
  useEffect(() => {
    const handleOpenCodeDrawer = (e) => {
      const { code, title, explanation } = e.detail;
      setCodeDrawerData({ code, title, explanation });
      setCodeDrawerOpen(true);
    };
    const handleSaveScript = async (e) => {
      if (planKey === "free") {
        setProNudgeReason("Saved Scripts Library");
        setShowProNudge(true);
        return;
      }
      const { name, code } = e.detail;
      await scriptManager.handleCreateScript(name, code, "logic");
      notify({ message: `Saved ${name} to library!`, type: "success" });
    };
    window.addEventListener("nexus:openCodeDrawer", handleOpenCodeDrawer);
    window.addEventListener("nexus:saveScript", handleSaveScript);
    return () => {
      window.removeEventListener("nexus:openCodeDrawer", handleOpenCodeDrawer);
      window.removeEventListener("nexus:saveScript", handleSaveScript);
    };
  }, [scriptManager, notify, planKey]);

  // Load Project Context & Teams
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) {
        setProjectContext(snap.data().projectContext || null);
      }
    });

    const fetchTeams = async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch(`${BACKEND_URL}/api/user/teams`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setTeams(data.teams || []);
        }
      } catch (e) {}
    };
    fetchTeams();

    return () => unsub();
  }, [user]);

  // 6. Handlers
  const handleInstallCommunityMode = async (mode) => {
    if (!user) return;
    try {
      const modeId = `custom_${uuidv4().slice(0, 8)}`;
      await setDoc(doc(db, "users", user.uid, "custom_modes", modeId), {
        ...mode,
        id: modeId,
        isPublic: false,
        authorId: mode.authorId,
        authorName: mode.authorName,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      });
      notify({ message: `Expert "${mode.label}" installed!`, type: "success" });
    } catch (err) {
      console.error("Failed to install community mode:", err);
      notify({ message: "Failed to install expert", type: "error" });
    }
  };

  const handleSaveCustomMode = async (data) => {
    if (!user) return;
    try {
      const modeId = editingCustomMode?.id || `custom_${uuidv4().slice(0, 8)}`;
      const payload = {
        ...data,
        authorId: user.uid,
        authorName: user.displayName || "Anonymous",
        updatedAt: serverTimestamp(),
        createdAt: editingCustomMode?.createdAt || serverTimestamp(),
      };

      await setDoc(doc(db, "users", user.uid, "custom_modes", modeId), payload);

      if (data.isPublic) {
        await setDoc(doc(db, "community_modes", modeId), payload);
      } else {
        try {
          await deleteDoc(doc(db, "community_modes", modeId));
        } catch (e) {}
      }

      notify({ message: "Custom expert saved!", type: "success" });
      setCustomModeModalOpen(false);
      setEditingCustomMode(null);
    } catch (err) {
      console.error("Failed to save custom mode:", err);
      notify({ message: "Failed to save custom expert", type: "error" });
    }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachments(prev => [...prev, {
          name: file.name,
          type: file.type,
          size: file.size,
          data: reader.result,
          isImage: file.type.startsWith('image/')
        }]);
      };
      if (file.type.startsWith('image/')) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
    });
  };

  const handlePromptSubmit = async (e, overridePrompt = null) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    const currentPrompt = (overridePrompt || prompt).trim();
    if (!currentPrompt || !user) {
      if (!user) setShowSignInNudge(true);
      return;
    }

    const currentAttachments = [...attachments];
    setPrompt("");
    setAttachments([]);
    if (activeTab !== "chat") setActiveTab("chat");

    let effectiveMode = chat.activeMode;
    const commandMap = { "/ui": "ui", "/audit": "security", "/optimize": "performance", "/logic": "logic" };
    for (const [cmd, mode] of Object.entries(commandMap)) {
      if (currentPrompt.startsWith(cmd)) {
        effectiveMode = mode;
        chat.updateChatMode(chat.currentChatId, mode);
        break;
      }
    }

    try {
      const requestId = uuidv4();
      let activeChatId = chat.currentChatId;

      if (!activeChatId) {
        const newChatRef = await addDoc(collection(db, "users", user.uid, "chats"), {
          title: currentPrompt.slice(0, 30) + (currentPrompt.length > 30 ? "..." : ""),
          activeMode: effectiveMode,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        activeChatId = newChatRef.id;
        chat.openChatById(activeChatId);
      }

      chat.setPendingMessage({ 
        role: "assistant", content: "", type: "chat", prompt: currentPrompt, mode: chat.chatMode, attachments: currentAttachments
      });

      const p = currentPrompt.toLowerCase();
      const isUiRequest = p.startsWith("/ui") || ["build ui", "menu", "screen", "hud", "shop", "layout", "frame"].some(k => p.includes(k));
      const isRefineRequest = p.startsWith("refine:") || p.startsWith("tweak:") || p.includes("refine ui");

      if (isUiRequest && !isRefineRequest) {
        const uiPromise = ui.handleGenerateUiPreview(currentPrompt.replace(/^\/ui\s*/i, ""), activeChatId, chat.setCurrentChatId, null, requestId, currentAttachments);
        const chatPromise = chat.handleSubmit(currentPrompt, activeChatId, requestId, null, false, currentAttachments);
        await Promise.all([uiPromise, chatPromise]);
        return;
      }

      if (isRefineRequest) {
        if (!ui.activeUi?.lua) {
          await ui.handleGenerateUiPreview(currentPrompt.replace(/^(refine|tweak):\s*/i, ""), activeChatId, chat.setCurrentChatId, null, requestId, currentAttachments);
        } else {
          await ui.handleRefine(currentPrompt.replace(/^(refine|tweak):\s*/i, ""), null, currentAttachments);
        }
        return;
      }

      const data = await agent.sendMessage(currentPrompt, activeChatId, chat.setCurrentChatId, requestId, effectiveMode, chat.chatMode, currentAttachments);
      if (!data) return await chat.handleSubmit(currentPrompt, activeChatId, requestId, null, false, currentAttachments);

      switch (data.action) {
        case "pipeline":
          await Promise.all([
            ui.handleGenerateUiPreview(data.parameters?.prompt || currentPrompt, activeChatId, chat.setCurrentChatId, data.parameters?.specs || null, requestId),
            chat.handleSubmit(currentPrompt, activeChatId, requestId)
          ]);
          break;
        case "refine":
          if (!ui.activeUi?.lua) {
            await ui.handleGenerateUiPreview(data.parameters?.instruction || currentPrompt, activeChatId, chat.setCurrentChatId, data.parameters?.specs || null, requestId);
          } else {
            await ui.handleRefine(data.parameters?.instruction || currentPrompt);
          }
          break;
        case "suggest_assets":
          await handleSuggestAssets(data.parameters?.prompt || currentPrompt);
          await chat.handleSubmit(currentPrompt, activeChatId, requestId);
          break;
        case "lint":
          await handleUiAudit();
          await chat.handleSubmit(currentPrompt, activeChatId, requestId);
          break;
        case "plan":
          chat.setTasks(data.tasks || []);
          await chat.handleSubmit(currentPrompt, activeChatId, requestId);
          break;
        default:
          await chat.handleSubmit(currentPrompt, activeChatId, requestId);
      }
    } catch (err) {
      console.error("Routing error:", err);
      await chat.handleSubmit(currentPrompt);
    }
  };

  const handleSuggestAssets = async (promptContext) => {
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${BACKEND_URL}/api/ui-builder/ai/suggest-image-queries`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ items: ui.activeUi?.boardState?.items || [], boardPrompt: promptContext }),
      });
      if (res.ok) {
        const out = await res.json();
        const msg = out?.suggestions?.length > 0 
          ? out.suggestions.map(s => `${s.itemId}: ${s.queries.join(", ")}`).join(" | ")
          : "No suggestions returned.";
        notify({ message: msg, type: "info" });
      }
    } catch (err) { notify({ message: "Asset suggestion failed", type: "error" }); }
  };

  const handleUiAudit = async () => {
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${BACKEND_URL}/api/ui-builder/ai/audit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ boardState: ui.activeUi?.boardState || null }),
      });
      if (res.ok) {
        const out = await res.json();
        const msg = out?.audit?.score !== undefined 
          ? `Audit score: ${out.audit.score}. Issues: ${out.audit.issues.map(i => i.message).join(" | ")}`
          : "Audit returned no score.";
        notify({ message: msg, type: "info" });
      }
    } catch (err) { notify({ message: "Audit failed", type: "error" }); }
  };

  const handleOpenScript = async (script) => {
    if (planKey === "free") {
      setProNudgeReason("Saved Scripts Library");
      setShowProNudge(true);
      return;
    }
    if (script.type === "ui") {
      setActiveTab("chat");
      const uid = user?.uid;
      if (!uid) return;
      const snap = await getDocs(query(collection(db, "users", uid, "scripts", script.id, "versions"), orderBy("versionNumber", "desc"), limit(1)));
      if (!snap.empty) {
        const data = snap.docs[0].data();
        ui.setActiveUiId(script.id);
        ui.setUiGenerations(prev => prev.some(g => g.id === script.id) ? prev : [{ 
          id: script.id, 
          uiModuleLua: data.uiModuleLua || data.code, 
          systemsLua: data.systemsLua || "",
          boardState: data.boardState || null,
          prompt: script.title, 
          createdAt: Date.now() 
        }, ...prev]);
        ui.setUiDrawerOpen(true);
      }
    } else {
      setActiveTab("chat");
      notify({ message: "Opening script...", type: "info" });
    }
  };

  return (
    <div className="h-screen bg-[#050505] text-white font-sans flex flex-col relative overflow-hidden">
      <div 
        className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] blur-[120px] rounded-full pointer-events-none transition-colors duration-1000" 
        style={{ backgroundColor: `${currentTheme.primary}1a` }}
      />
      <div 
        className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] blur-[120px] rounded-full pointer-events-none transition-colors duration-1000" 
        style={{ backgroundColor: `${currentTheme.secondary}1a` }}
      />

      <NexusRBXHeader 
        variant="ai"
        navigate={navigate}
        user={user}
        tokenInfo={{ sub: { limit: subLimit, used: subLimit - totalRemaining }, payg: { remaining: totalRemaining } }}
        tokenLoading={false}
      />

      <div className="flex flex-1 min-h-0 overflow-hidden pt-20">
        <aside 
          id="tour-sidebar" 
          className={`fixed inset-y-0 left-0 z-40 w-72 bg-[#0D0D0D]/95 backdrop-blur-2xl border-r border-white/5 flex flex-col transform transition-all duration-500 ease-in-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:relative lg:translate-x-0 ${sidebarOpen ? 'lg:w-72' : 'lg:w-0 lg:opacity-0 lg:pointer-events-none'}`}
        >
          <div className="flex-1 flex flex-col min-h-0">
            <SidebarContent
              activeTab={activeTab === "chat" ? "chats" : "saved"} 
              setActiveTab={handleSidebarTabChange} 
              scripts={scripts} 
              currentChatId={chat.currentChatId} 
              currentScriptId={scriptManager.currentScriptId}
              setCurrentScriptId={scriptManager.setCurrentScriptId}
              handleCreateScript={scriptManager.handleCreateScript}
              handleRenameScript={scriptManager.handleRenameScript}
              handleDeleteScript={scriptManager.handleDeleteScript}
              currentScript={scriptManager.currentScript}
              versionHistory={scriptManager.versionHistory}
              selectedVersionId={scriptManager.selectedVersionId}
              onSelectChat={(id) => { chat.openChatById(id); if(window.innerWidth < 1024) setSidebarOpen(false); setActiveTab("chat"); }} 
              onOpenGameContext={() => game.setShowWizard(true)}
              onDeleteChat={chat.handleDeleteChat}
              handleClearChat={chat.handleClearChat}
              gameProfile={game.profile}
              user={user}
              onVersionView={(ver) => {
                if (ver.code) {
                  window.dispatchEvent(
                    new CustomEvent("nexus:openCodeDrawer", {
                      detail: {
                        code: ver.code,
                        title: ver.title || scriptManager.currentScript?.title || "Script",
                        explanation: ver.explanation || "",
                        versionNumber: ver.versionNumber,
                      },
                    })
                  );
                }
              }}
              onVersionDownload={(ver) => {
                if (!ver.code) return;
                const blob = new Blob([ver.code], { type: "text/plain;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${(ver.title || "script").replace(/\s+/g, "_")}.lua`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            />
          </div>
        </aside>

        <main className="flex-1 flex flex-row relative min-w-0 overflow-hidden">
          {/* Mobile Tab Switcher */}
          {isMobile && ui.uiDrawerOpen && (
            <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-black/60 backdrop-blur-xl border border-white/10 rounded-full p-1.5 flex items-center gap-1 shadow-2xl">
              <button 
                onClick={() => setMobileTab("chat")}
                className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${mobileTab === "chat" ? "bg-[#00f5d4] text-black" : "text-gray-400 hover:text-white"}`}
              >
                Chat
              </button>
              <button 
                onClick={() => setMobileTab("preview")}
                className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${mobileTab === "preview" ? "bg-[#00f5d4] text-black" : "text-gray-400 hover:text-white"}`}
              >
                Preview
              </button>
            </div>
          )}

          <div className={`flex-1 flex flex-col min-w-0 transition-all duration-500 ${ui.uiDrawerOpen ? 'lg:max-w-[40%] border-r border-white/5' : 'w-full'} ${isMobile && ui.uiDrawerOpen && mobileTab !== "chat" ? "hidden" : "flex"}`}>
            <div className="flex items-center justify-between p-4 border-b border-white/5 bg-black/20 backdrop-blur-md sticky top-0 z-20">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setSidebarOpen(!sidebarOpen)} 
                  className={`p-2 rounded-xl transition-all ${sidebarOpen ? 'bg-[#00f5d4]/10 text-[#00f5d4]' : 'bg-white/5 text-gray-400 hover:text-white'}`}
                  title="Toggle History"
                >
                  <Menu className="h-5 w-5" />
                </button>
                <div className="h-4 w-px bg-white/10 mx-1" />
                <div className="flex bg-gray-900/50 rounded-xl p-1 border border-white/5">
                  <button onClick={() => setActiveTab("chat")} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "chat" ? "bg-gray-800 text-[#00f5d4]" : "text-gray-500 hover:text-white"}`}>
                    <Sparkles className="w-3.5 h-3.5 inline mr-1.5" /> Chat
                  </button>
                  <button onClick={() => setActiveTab("library")} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "library" ? "bg-gray-800 text-white" : "text-gray-500 hover:text-white"}`}>
                    <Library className="w-3.5 h-3.5 inline mr-1.5" /> Library
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <ProjectContextStatus 
                  context={projectContext} 
                  plan={planKey}
                  onSync={async () => {
                    if (planKey === "free") {
                      setProNudgeReason("Project Context Sync");
                      setShowProNudge(true);
                      return;
                    }
                    notify({ message: "Please use the NexusRBX Studio Plugin to refresh context", type: "info" });
                  }} 
                />
              </div>
            </div>

            <div className="flex-grow overflow-y-auto px-4 py-6 scrollbar-hide">
              {activeTab === "chat" && (
                <ChatView 
                  messages={chat.messages} 
                  pendingMessage={chat.pendingMessage || ui.pendingMessage || (agent.isThinking ? { role: "assistant", content: "", thought: "Nexus is thinking...", prompt: "" } : null)} 
                  generationStage={chat.generationStage || ui.generationStage || (agent.isThinking ? "Nexus is thinking..." : "")} 
                  user={user} 
                  activeMode={chat.activeMode}
                  customModes={chat.customModes}
                  onModeChange={(mode) => chat.updateChatMode(chat.currentChatId, mode)}
                  onCreateCustomMode={() => { setEditingCustomMode(null); setCustomModeModalOpen(true); }}
                  onEditCustomMode={(mode) => { setEditingCustomMode(mode); setCustomModeModalOpen(true); }}
                  onInstallCommunityMode={handleInstallCommunityMode}
                  onViewUi={(m) => { ui.setActiveUiId(m.projectId); ui.setUiDrawerOpen(true); if(isMobile) setMobileTab("preview"); }}
                  onQuickStart={(p) => handlePromptSubmit(null, p)}
                  onRefine={(m) => { 
                    if (planKey === "free") {
                      setProNudgeReason("UI Refinement & Iteration");
                      setShowProNudge(true);
                      return;
                    }
                    setPrompt(`Refine this UI: `);
                    const el = document.getElementById("tour-prompt-box");
                    if (el) el.focus();
                  }}
                  onToggleActMode={async (m) => {
                    const isGeneral = chat.activeMode === 'general';
                    let targetMode = chat.activeMode;
                    
                    if (isGeneral) {
                      // Transfer context to a specialist
                      const p = (m.prompt || m.content || "").toLowerCase();
                      targetMode = (p.includes('ui') || p.includes('menu') || p.includes('layout')) ? 'ui' : 'logic';
                      
                      // Start new chat with context
                      const context = chat.messages.map(msg => `${msg.role}: ${msg.content || msg.explanation}`).join('\n');
                      chat.startNewChat();
                      chat.setActiveMode(targetMode);
                      chat.setChatMode("act");
                      
                      setToast({
                        message: `Context transferred to ${CHAT_MODES.find(mode => mode.id === targetMode)?.label || targetMode}`,
                        type: "success"
                      });

                      // Submit with transferred context and explicit mode command
                      const cmd = targetMode === 'ui' ? '/ui ' : '/logic ';
                      await handlePromptSubmit(null, `${cmd}[Transferred Context]\n${context}\n\n[Goal]\n${m.prompt || m.content}`);
                    } else {
                      chat.setChatMode("act");
                      if (m.projectId && m.metadata?.type === 'ui') {
                        await ui.handleRefine(m.prompt || m.content);
                      } else {
                        await handlePromptSubmit(null, m.prompt || m.content);
                      }
                    }
                  }}
                  onPushToStudio={(id, type, data) => {
                    if (planKey === "free") {
                      setProNudgeReason("One-Click Studio Push");
                      setShowProNudge(true);
                      return;
                    }
                    chat.handlePushToStudio(id, type, data);
                  }}
                  onShareWithTeam={(id, type, teamId) => {
                    if (planKey === "free") {
                      setProNudgeReason("Team Collaboration");
                      setShowProNudge(true);
                      return;
                    }
                    chat.handleShareWithTeam(id, type, teamId);
                  }}
                  teams={teams}
                  onFixUiAudit={async (m) => {
                    if (planKey === "free") {
                      setProNudgeReason("UI Auto-Fix & Audit");
                      setShowProNudge(true);
                      return;
                    }
                    if (!m.boardState || !m.metadata?.qaReport?.issues) return;
                    try {
                      const token = await user.getIdToken();
                      const res = await fetch(`${BACKEND_URL}/api/ui-builder/ai/audit/fix`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                        body: JSON.stringify({
                          boardState: m.boardState,
                          issues: m.metadata.qaReport.issues
                        })
                      });
                      if (res.ok) {
                        const data = await res.json();
                        ui.setUiGenerations(prev => prev.map(g => g.id === m.id ? { ...g, boardState: data.boardState } : g));
                        notify({ message: "UI fixes applied! Regenerating Lua...", type: "success" });
                        await ui.handleRefine("Finalize Lua for the updated layout", m.id);
                      }
                    } catch (err) {
                      console.error("Fix UI Audit failed:", err);
                      notify({ message: "Failed to apply UI fixes", type: "error" });
                    }
                  }}
                  onExecuteTask={async (task) => {
                    if (planKey === "free") {
                      setProNudgeReason("Multi-Step Goal Execution");
                      setShowProNudge(true);
                      return;
                    }
                    chat.setCurrentTaskId(task.id);
                    const requestId = uuidv4();
                    try {
                      if (task.type === "pipeline") {
                        await ui.handleGenerateUiPreview(task.prompt, chat.currentChatId, chat.setCurrentChatId, null, requestId);
                      } else if (task.type === "generate_functionality") {
                        const token = await user.getIdToken();
                        const res = await fetch(`${BACKEND_URL}/api/ui-builder/ai/generate-functionality`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                          body: JSON.stringify({
                            lua: ui.activeUi?.uiModuleLua || "",
                            prompt: task.prompt,
                            gameSpec: settings.gameSpec || ""
                          })
                        });
                        if (res.ok) {
                          const data = await res.json();
                          for (const s of data.scripts) {
                            await scriptManager.handleCreateScript(s.name, s.code, "logic");
                          }
                          notify({ message: `Generated ${data.scripts.length} scripts for ${task.label}`, type: "success" });
                        }
                      }
                      chat.setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'done' } : t));
                    } catch (err) {
                      console.error("Task execution failed:", err);
                      notify({ message: `Failed to execute ${task.label}`, type: "error" });
                    } finally {
                      chat.setCurrentTaskId(null);
                    }
                  }}
                  currentTaskId={chat.currentTaskId}
                  chatEndRef={chatEndRef}
                />
              )}
              {activeTab === "library" && (
                <LibraryView 
                  scripts={scripts} 
                  onOpenScript={handleOpenScript} 
                />
              )}
            </div>

            <div className="p-4 bg-gradient-to-t from-black via-black/80 to-transparent">
              <div className="max-w-5xl mx-auto space-y-4">
                <UnifiedStatusBar 
                  isGenerating={chat.isGenerating || ui.uiIsGenerating || agent.isThinking}
                  stage={chat.generationStage || ui.generationStage || (agent.isThinking ? "Nexus is thinking..." : "")}
                  mode={chat.activeMode}
                />

                {currentPowerTools.length > 0 && (
                  <div className="flex items-center gap-2 px-2 overflow-x-auto scrollbar-hide pb-1 border-b border-white/5 mb-2">
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest mr-2">Power Tools:</span>
                    {currentPowerTools.map((tool, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          if (planKey === "free") {
                            setProNudgeReason("UI Power Tools & Styles");
                            setShowProNudge(true);
                            return;
                          }
                          handlePromptSubmit(null, tool.prompt);
                        }}
                        className="whitespace-nowrap px-3 py-1.5 rounded-lg bg-[#00f5d4]/5 border border-[#00f5d4]/10 text-[9px] font-black text-[#00f5d4] uppercase tracking-widest hover:bg-[#00f5d4]/20 transition-all flex items-center gap-1.5"
                      >
                        {tool.label}
                        {planKey === "free" && <Zap className="w-2 h-2 text-[#9b5de5] fill-current" />}
                      </button>
                    ))}
                  </div>
                )}

                {currentActions.length > 0 && (
                  <div className="flex items-center gap-2 px-2 overflow-x-auto scrollbar-hide pb-1">
                    {currentActions.map((action, idx) => (
                      <button
                        key={idx}
                        onClick={() => setPrompt(action.prompt)}
                        className="whitespace-nowrap px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all"
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}

                <div className="px-2 flex items-center justify-between gap-4">
                  <TokenBar tokensLeft={totalRemaining} tokensLimit={subLimit} resetsAt={resetsAt} plan={planKey} />
                  
                  <div className="flex items-center bg-gray-900/50 border border-gray-800 rounded-xl p-1 shadow-inner">
                    <button 
                      onClick={() => chat.setChatMode("plan")}
                      className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${chat.chatMode === "plan" ? "bg-gray-800 text-[#00f5d4] shadow-sm" : "text-gray-400 hover:text-white"}`}
                    >
                      <Search className="w-3 h-3" /> Plan
                    </button>
                    <button 
                      onClick={async () => {
                        if (planKey === "free") {
                          setProNudgeReason("Act Mode (Auto-Execution)");
                          setShowProNudge(true);
                          return;
                        }
                        chat.setChatMode("act");
                        const lastMsg = chat.messages[chat.messages.length - 1];
                        if (lastMsg && lastMsg.role === 'assistant' && (lastMsg.plan || lastMsg.explanation?.includes('<plan>'))) {
                          await handlePromptSubmit(null, lastMsg.prompt || chat.messages[chat.messages.length - 2]?.content);
                        }
                      }}
                      className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${chat.chatMode === "act" ? "bg-gray-800 text-orange-400 shadow-sm" : "text-gray-500 hover:text-white"}`}
                    >
                      <Zap className="w-3 h-3" /> Act
                    </button>
                  </div>
                </div>
                
                <div className="relative group">
                  {chat.isGenerating && (
                    <div className="absolute -top-6 left-0 right-0 flex justify-center animate-in fade-in slide-in-from-bottom-1 duration-500">
                      <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/5">
                        Complex generations may take up to 5 minutes
                      </span>
                    </div>
                  )}
                  <div 
                    className="absolute -inset-0.5 rounded-2xl blur opacity-20 group-focus-within:opacity-40 transition duration-500" 
                    style={{ background: `linear-gradient(to r, ${currentTheme.primary}, ${currentTheme.secondary})` }}
                  />
                  <div className="relative bg-[#121212] border border-white/10 rounded-2xl p-2 shadow-2xl flex flex-col gap-2">
                    {attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 px-2 pt-2">
                        {attachments.map((file, idx) => (
                          <div key={idx} className="relative group/file bg-white/5 border border-white/10 rounded-lg p-2 flex items-center gap-2 pr-8">
                            {file.isImage ? (
                              <img src={file.data} alt={file.name} className="w-6 h-6 rounded object-cover" />
                            ) : (
                              <Layout className="w-4 h-4 text-gray-500" />
                            )}
                            <span className="text-[10px] font-bold text-gray-300 truncate max-w-[100px]">{file.name}</span>
                            <button 
                              onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                              className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-red-400 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2 px-2 pt-2">
                      <div className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest transition-all ${agent.isThinking || ui.uiIsGenerating || chat.isGenerating ? 'bg-[#00f5d4] text-black animate-pulse' : 'bg-white/5 text-gray-500'}`}>
                        {agent.isThinking ? 'Thinking' : ui.uiIsGenerating ? 'Building' : chat.isGenerating ? 'Responding' : 'Ready'}
                      </div>
                      <div className="h-px flex-1 bg-white/5" />
                    </div>
                    <div className="flex items-center gap-2 p-2 pt-0">
                      <div className="relative">
                        <input 
                          type="file" 
                          id="file-upload" 
                          className="hidden" 
                          multiple 
                          onChange={handleFileUpload}
                          accept="image/*,.lua,.txt,.json"
                        />
                        <label 
                          htmlFor="file-upload"
                          className="p-3 rounded-xl bg-white/5 text-gray-500 hover:text-white hover:bg-white/10 transition-all cursor-pointer flex items-center justify-center"
                          title="Upload Image or File"
                        >
                          <Plus className="h-5 w-5" />
                        </label>
                      </div>
                      <textarea
                        id="tour-prompt-box"
                        className="flex-1 bg-transparent border-none rounded-xl p-3 resize-none focus:ring-0 text-gray-100 placeholder-gray-500 text-[14px] md:text-[15px] leading-relaxed disabled:opacity-50"
                        rows="1" 
                        placeholder={activeModeData.placeholder}
                        value={prompt} 
                        onChange={(e) => setPrompt(e.target.value)}
                        disabled={chat.isGenerating || ui.uiIsGenerating || agent.isThinking}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handlePromptSubmit();
                          }
                        }}
                      />
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => {
                            const allModes = [...CHAT_MODES, ...chat.customModes];
                            const modeIds = allModes.map(m => m.id);
                            const currentIndex = modeIds.indexOf(chat.activeMode);
                            const nextIndex = (currentIndex + 1) % modeIds.length;
                            chat.updateChatMode(chat.currentChatId, modeIds[nextIndex]);
                          }}
                          className={`hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl border border-white/5 text-[10px] font-black uppercase tracking-widest transition-all hover:bg-white/5 ${activeModeData.bg} ${activeModeData.color}`}
                          style={chat.activeMode.startsWith('custom_') ? { color: activeModeData.color || '#9b5de5' } : {}}
                          title={`Current Mode: ${activeModeData.label}. Click to cycle.`}
                        >
                          {activeModeData.icon}
                          <span className="hidden lg:inline">{activeModeData.label}</span>
                        </button>
                        <button 
                          id="tour-generate-button"
                          onClick={handlePromptSubmit} 
                          disabled={chat.isGenerating || ui.uiIsGenerating || agent.isThinking || (!prompt.trim() && attachments.length === 0)}
                          className="p-3 rounded-xl transition-all disabled:opacity-50 bg-[#00f5d4] text-black hover:shadow-[0_0_20px_rgba(0,245,212,0.4)] active:scale-95"
                        >
                          {chat.isGenerating || ui.uiIsGenerating || agent.isThinking ? <Loader className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Live Preview (Focus Mode) */}
          <div className={`flex-1 bg-[#050505] flex-col min-w-0 transition-all duration-500 ${ui.uiDrawerOpen ? 'flex' : 'hidden'} ${isMobile && mobileTab !== "preview" ? "hidden" : "flex"}`}>
            <div className="flex items-center justify-between p-4 border-b border-white/5 bg-black/20 backdrop-blur-md sticky top-0 z-20">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[#00f5d4]/10 text-[#00f5d4]">
                  <Layout className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-white">Live Preview & Code</span>
              </div>
              <button 
                onClick={() => { ui.setUiDrawerOpen(false); if(isMobile) setMobileTab("chat"); }}
                className="p-2 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <UiPreviewDrawer
                open={true}
                inline={true}
                onClose={() => ui.setUiDrawerOpen(false)}
                uiModuleLua={ui.activeUi?.uiModuleLua || ""}
                systemsLua={ui.activeUi?.systemsLua || ""}
                lua={ui.activeUi?.lua || ""}
                boardState={ui.activeUi?.boardState || null}
                prompt={ui.activeUi?.prompt || ""}
                history={ui.uiGenerations}
                activeId={ui.activeUiId}
                onSelectHistory={(id) => ui.setActiveUiId(id)}
                onDownload={() => {
                  const blob = new Blob([ui.activeUi?.lua], { type: "text/plain;charset=utf-8" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url; a.download = "generated_ui.lua"; a.click();
                  URL.revokeObjectURL(url);
                }}
                user={user}
                settings={settings}
                onRefine={ui.handleRefine}
                onUpdateLua={(newLua) => {
                  if (ui.activeUiId) {
                    ui.setUiGenerations(prev => prev.map(g => g.id === ui.activeUiId ? { ...g, lua: newLua } : g));
                  }
                }}
                isRefining={ui.uiIsGenerating}
              />
            </div>
          </div>
        </main>
      </div>

      <CodeDrawer
        open={codeDrawerOpen}
        onClose={() => setCodeDrawerOpen(false)}
        code={codeDrawerData.code}
        title={codeDrawerData.title}
        explanation={codeDrawerData.explanation}
        onSaveScript={async (title, code) => {
          await scriptManager.handleCreateScript(title, code, "logic");
          notify({ message: "Script saved to library!", type: "success" });
        }}
      />

      {settings.enableGameWizard !== false && (
        <GameProfileWizard 
          isOpen={game.showWizard}
          onClose={() => game.setShowWizard(false)}
          profile={game.profile}
          onUpdate={game.updateProfile}
        />
      )}

      <SignInNudgeModal 
        isOpen={showSignInNudge} 
        onClose={() => setShowSignInNudge(false)} 
      />

      <ProNudgeModal
        isOpen={showProNudge}
        onClose={() => setShowProNudge(false)}
        reason={proNudgeReason}
      />

      <CustomModeModal 
        isOpen={customModeModalOpen}
        onClose={() => setCustomModeModalOpen(false)}
        onSave={handleSaveCustomMode}
        initialData={editingCustomMode}
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

      {toast && (
        <div className="fixed bottom-8 right-8 z-[100]">
          <NotificationToast 
            message={toast.message} 
            type={toast.type} 
            onClose={() => setToast(null)} 
          />
        </div>
      )}

      <style>{`
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
