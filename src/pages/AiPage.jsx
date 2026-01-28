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
  Gamepad2,
  Sparkles,
} from "lucide-react";
import { auth, db } from "../firebase";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import SidebarContent from "../components/SidebarContent";
import PlanBadge from "../components/PlanBadge";
import BetaBadge from "../components/BetaBadge";
import AiTour from "../components/AiTour";
import OnboardingContainer from "../components/OnboardingContainer";
import UiPreviewDrawer from "../components/UiPreviewDrawer";
import SignInNudgeModal from "../components/SignInNudgeModal";
import {
  TokenBar,
  CustomModeModal,
  UnifiedStatusBar,
} from "../components/ai/AiComponents";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
  setDoc,
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

  // Map sidebar tabs to main tabs
  const handleSidebarTabChange = (sidebarTab) => {
    if (sidebarTab === "scripts" || sidebarTab === "chats" || sidebarTab === "agent") setActiveTab("chat");
    else if (sidebarTab === "saved") setActiveTab("library");
  };
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [showTour, setShowTour] = useState(localStorage.getItem("nexusrbx:tourComplete") !== "true");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSignInNudge, setShowSignInNudge] = useState(false);
  const [customModeModalOpen, setCustomModeModalOpen] = useState(false);
  const [editingCustomMode, setEditingCustomMode] = useState(null);

  // 3. Custom Hooks
  const notify = useCallback(({ message, type = "info" }) => {
    // Simplified notification for now, can be expanded
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
        signInAnonymously(auth)
          .then((res) => setUser(res.user))
          .catch((err) => {
            console.error("Firebase Anonymous Auth Error:", err);
            setUser(null);
            // If it's a 400 error, it likely means Anonymous Auth is disabled in Firebase Console
            if (err.code === 'auth/operation-not-allowed') {
              notify({ 
                message: "Anonymous sign-in is disabled. Please enable it in Firebase Console or sign in manually.", 
                type: "error" 
              });
            }
          });
      }
    });
    return () => unsubscribe();
  }, [notify]);

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

  // 6. Handlers
  const handleInstallCommunityMode = async (mode) => {
    if (!user) return;
    try {
      const modeId = `custom_${uuidv4().slice(0, 8)}`;
      await setDoc(doc(db, "users", user.uid, "custom_modes", modeId), {
        ...mode,
        id: modeId,
        isPublic: false, // Installed modes are private by default
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

      // Save to user's private collection
      await setDoc(doc(db, "users", user.uid, "custom_modes", modeId), payload);

      // If public, also save to global community collection
      if (data.isPublic) {
        await setDoc(doc(db, "community_modes", modeId), payload);
      } else {
        // If it was public but now private, remove from community
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

  const handlePromptSubmit = async (e, overridePrompt = null) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    const currentPrompt = (overridePrompt || prompt).trim();
    if (!currentPrompt || !user) {
      if (!user) setShowSignInNudge(true);
      return;
    }

    setPrompt("");
    if (activeTab !== "chat") setActiveTab("chat");

    // Smart Routing: Auto-switch mode based on commands
    let effectiveMode = chat.activeMode;
    if (currentPrompt.startsWith("/ui")) {
      effectiveMode = "ui";
      chat.updateChatMode(chat.currentChatId, "ui");
    } else if (currentPrompt.startsWith("/audit")) {
      effectiveMode = "security";
      chat.updateChatMode(chat.currentChatId, "security");
    } else if (currentPrompt.startsWith("/optimize")) {
      effectiveMode = "performance";
      chat.updateChatMode(chat.currentChatId, "performance");
    } else if (currentPrompt.startsWith("/logic")) {
      effectiveMode = "logic";
      chat.updateChatMode(chat.currentChatId, "logic");
    }

    // Smarter routing: do deterministic routing first, use agent only when unclear
    try {
      const requestId = uuidv4();
      
      // Set a temporary pending message so the user sees immediate feedback
      chat.setPendingMessage({ 
        role: "assistant", 
        content: "", 
        type: "chat", 
        prompt: currentPrompt 
      });
      const p = currentPrompt.toLowerCase();

      const looksLikeUi =
        p.startsWith("/ui") ||
        p.includes("build ui") ||
        p.includes("menu") ||
        p.includes("screen") ||
        p.includes("hud") ||
        p.includes("shop") ||
        p.includes("onboarding") ||
        p.includes("layout") ||
        p.includes("buttons") ||
        p.includes("frame");

      const looksLikeRefine =
        p.startsWith("refine:") ||
        p.startsWith("tweak:") ||
        p.includes("refine ui") ||
        p.includes("make the ui");

      // If user wants UI and it's obvious OR mode is UI, skip agent
      if ((looksLikeUi || effectiveMode === "ui") && !looksLikeRefine) {
        // Trigger both chat (for streaming) and UI builder
        const uiPromise = ui.handleGenerateUiPreview(
          currentPrompt.replace(/^\/ui\s*/i, ""),
          chat.currentChatId,
          chat.setCurrentChatId,
          null,
          requestId
        );
        const chatPromise = chat.handleSubmit(currentPrompt, chat.currentChatId, requestId);
        
        await Promise.all([uiPromise, chatPromise]);
        return;
      }

      // Refine only if there's actually an active UI
      if (looksLikeRefine) {
        if (!ui.activeUi?.lua) {
          // No UI to refine => generate instead
          await ui.handleGenerateUiPreview(
            currentPrompt.replace(/^refine:\s*/i, "").replace(/^tweak:\s*/i, ""),
            chat.currentChatId,
            chat.setCurrentChatId,
            null,
            requestId
          );
          return;
        }
        await ui.handleRefine(currentPrompt.replace(/^refine:\s*/i, "").replace(/^tweak:\s*/i, ""));
        return;
      }

    // Otherwise, ask agent to route
    const data = await agent.sendMessage(
      currentPrompt,
      chat.currentChatId,
      chat.setCurrentChatId,
      requestId,
      effectiveMode
    );

      if (data?.action === "pipeline") {
        const uiPromise = ui.handleGenerateUiPreview(
          data.parameters?.prompt || currentPrompt,
          chat.currentChatId,
          chat.setCurrentChatId,
          data.parameters?.specs || null,
          requestId
        );
        const chatPromise = chat.handleSubmit(currentPrompt, chat.currentChatId, requestId);
        
        await Promise.all([uiPromise, chatPromise]);
      } else if (data?.action === "refine") {
        if (!ui.activeUi?.lua) {
          await ui.handleGenerateUiPreview(
            data.parameters?.instruction || currentPrompt,
            chat.currentChatId,
            chat.setCurrentChatId,
            data.parameters?.specs || null,
            requestId
          );
        } else {
          await ui.handleRefine(data.parameters?.instruction || currentPrompt);
        }
      } else if (data?.action === "suggest_assets") {
        // Suggest Roblox catalog queries for placeholders (or for the current UI prompt)
        try {
          const token = await user.getIdToken();
          const res = await fetch(`${BACKEND_URL}/api/ui-builder/ai/suggest-image-queries`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              items: ui.activeUi?.boardState?.items || [],
              boardPrompt: data.parameters?.prompt || currentPrompt,
            }),
          });

          if (res.ok) {
            const out = await res.json();
            const suggestions = out?.suggestions || [];
            const msg =
              suggestions.length > 0
                ? suggestions
                    .map((s) => `${s.itemId}: ${Array.isArray(s.queries) ? s.queries.join(", ") : ""}`)
                    .join(" | ")
                : "No suggestions returned.";
            notify({ message: msg, type: "info" });
          } else {
            notify({ message: "Asset suggestion request failed", type: "error" });
          }
        } catch (err) {
          notify({ message: "Asset suggestion failed", type: "error" });
        }

        await chat.handleSubmit(currentPrompt, chat.currentChatId, requestId);
      } else if (data?.action === "lint") {
        // Audit UI for UX/accessibility issues (contrast, tap targets, hierarchy, consistency)
        try {
          const token = await user.getIdToken();
          const res = await fetch(`${BACKEND_URL}/api/ui-builder/ai/audit`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              boardState: ui.activeUi?.boardState || null,
            }),
          });

          if (res.ok) {
            const out = await res.json();
            const score = out?.audit?.score;
            const issues = out?.audit?.issues || [];
            const msg =
              typeof score === "number"
                ? `Audit score: ${score}. Issues: ${issues.map((i) => i.message).join(" | ")}`
                : "Audit returned no score.";
            notify({ message: msg, type: "info" });
          } else {
            notify({ message: "Audit request failed", type: "error" });
          }
        } catch (err) {
          notify({ message: "Audit failed", type: "error" });
        }

        await chat.handleSubmit(currentPrompt, chat.currentChatId, requestId);
      } else {
        await chat.handleSubmit(currentPrompt, chat.currentChatId, requestId);
      }
    } catch (err) {
      console.error("Routing error:", err);
      await chat.handleSubmit(currentPrompt);
    }
  };

  const handleOpenScript = async (script) => {
    // Switch to UI tab if it's a UI script, or Chat if it's a regular script
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
      // Handle regular script opening (e.g. open in a code modal)
      notify({ message: "Opening script...", type: "info" });
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans flex flex-col relative overflow-hidden">
      {/* Background Glows */}
      <div 
        className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] blur-[120px] rounded-full pointer-events-none transition-colors duration-1000" 
        style={{ backgroundColor: `${currentTheme.primary}1a` }}
      />
      <div 
        className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] blur-[120px] rounded-full pointer-events-none transition-colors duration-1000" 
        style={{ backgroundColor: `${currentTheme.secondary}1a` }}
      />

      <header className="border-b border-white/5 bg-black/40 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text cursor-pointer" onClick={() => navigate("/")}>NexusRBX</div>
              <BetaBadge className="mt-1" />
            </div>
            
            <nav id="tour-mode-toggle" className="hidden md:flex items-center bg-gray-900/50 border border-gray-800 rounded-xl p-1">
              <button 
                onClick={() => setActiveTab("chat")} 
                className={`px-4 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === "chat" ? "bg-gray-800 text-[#00f5d4] shadow-sm" : "text-gray-400 hover:text-white"}`}
              >
                <Sparkles className="h-4 w-4" /> Nexus AI
              </button>
              <button 
                onClick={() => setActiveTab("library")} 
                className={`px-4 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === "library" ? "bg-gray-800 text-white shadow-sm" : "text-gray-400 hover:text-white"}`}
              >
                <Library className="h-4 w-4" /> Library
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => game.setShowWizard(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-800 text-xs font-bold text-gray-300 hover:border-[#00f5d4] transition-all"
            >
              <Gamepad2 className="w-4 h-4 text-[#00f5d4]" />
              Game Profile
            </button>
            <PlanBadge plan={planKey} />
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <aside id="tour-sidebar" className={`fixed inset-y-0 left-0 z-40 w-72 bg-gray-900 border-r border-gray-800 flex flex-col transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
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
            onSelectChat={(id) => { chat.openChatById(id); setSidebarOpen(false); setActiveTab("chat"); }} 
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
        </aside>

        <main className="flex-1 flex flex-col relative min-w-0">
          <div className="md:hidden flex items-center justify-between p-4 border-b border-white/5 bg-black/40 backdrop-blur-xl sticky top-0 z-20">
            <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 text-gray-400 hover:text-white">
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex bg-gray-900 rounded-lg p-1">
              <button onClick={() => setActiveTab("chat")} className={`p-1.5 rounded ${activeTab === "chat" ? "bg-gray-800 text-[#00f5d4]" : "text-gray-500"}`}><Sparkles className="w-4 h-4" /></button>
              <button onClick={() => setActiveTab("library")} className={`p-1.5 rounded ${activeTab === "library" ? "bg-gray-800 text-white" : "text-gray-500"}`}><Library className="w-4 h-4" /></button>
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
                onViewUi={(m) => { ui.setActiveUiId(m.projectId); ui.setUiDrawerOpen(true); }}
                onQuickStart={(p) => handlePromptSubmit(null, p)}
                onRefine={(m) => { 
                  setPrompt(`Refine this UI: `);
                  const el = document.getElementById("tour-prompt-box");
                  if (el) el.focus();
                }}
                onToggleActMode={async (m) => {
                  // Logic to transition from Plan to Act
                  const requestId = uuidv4();
                  await ui.handleGenerateUiPreview(
                    m.parameters?.prompt || m.content || "",
                    chat.currentChatId,
                    chat.setCurrentChatId,
                    m.parameters?.specs || null,
                    requestId
                  );
                }}
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
                      onClick={() => handlePromptSubmit(null, tool.prompt)}
                      className="whitespace-nowrap px-3 py-1.5 rounded-lg bg-[#00f5d4]/5 border border-[#00f5d4]/10 text-[9px] font-black text-[#00f5d4] uppercase tracking-widest hover:bg-[#00f5d4]/20 transition-all"
                    >
                      {tool.label}
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

              <div className="px-2">
                <TokenBar tokensLeft={totalRemaining} tokensLimit={subLimit} resetsAt={resetsAt} plan={planKey} />
              </div>
              
              <div className="relative group">
                <div 
                  className="absolute -inset-0.5 rounded-2xl blur opacity-20 group-focus-within:opacity-40 transition duration-500" 
                  style={{ background: `linear-gradient(to r, ${currentTheme.primary}, ${currentTheme.secondary})` }}
                />
                <div className="relative bg-[#121212] border border-white/10 rounded-2xl p-2 shadow-2xl flex flex-col gap-2">
                  <div className="flex items-center gap-2 px-2 pt-2">
                    <div className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest transition-all ${agent.isThinking || ui.uiIsGenerating || chat.isGenerating ? 'bg-[#00f5d4] text-black animate-pulse' : 'bg-white/5 text-gray-500'}`}>
                      {agent.isThinking ? 'Thinking' : ui.uiIsGenerating ? 'Building' : chat.isGenerating ? 'Responding' : 'Ready'}
                    </div>
                    <div className="h-px flex-1 bg-white/5" />
                  </div>
                  <div className="flex items-center gap-2 p-2 pt-0">
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
                        disabled={chat.isGenerating || ui.uiIsGenerating || agent.isThinking || !prompt.trim()}
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
        </main>
      </div>

      <UiPreviewDrawer
        open={ui.uiDrawerOpen}
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

      <GameProfileWizard 
        isOpen={game.showWizard}
        onClose={() => game.setShowWizard(false)}
        profile={game.profile}
        onUpdate={game.updateProfile}
      />

      <SignInNudgeModal 
        isOpen={showSignInNudge} 
        onClose={() => setShowSignInNudge(false)} 
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
