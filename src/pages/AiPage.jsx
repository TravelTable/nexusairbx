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
  Send,
  Loader,
  Menu,
  Settings,
  X,
  MessageSquare,
  Layout,
  Library,
  Gamepad2,
  Sparkles,
} from "lucide-react";
import { auth } from "./firebase";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import SidebarContent from "../components/SidebarContent";
import Modal from "../components/Modal";
import ScriptLoadingBarContainer from "../components/ScriptLoadingBarContainer";
import PlanBadge from "../components/PlanBadge";
import AiTour from "../components/AiTour";
import OnboardingContainer from "../components/OnboardingContainer";
import UiPreviewDrawer from "../components/UiPreviewDrawer";
import SignInNudgeModal from "../components/SignInNudgeModal";
import {
  TokenBar,
} from "../components/ai/AiComponents";
import UiSpecificationModal from "../components/ai/UiSpecificationModal";
import {
  getFirestore,
  doc,
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
} from "firebase/firestore";

// Hooks
import { useAiChat } from "../hooks/useAiChat";
import { useUiBuilder } from "../hooks/useUiBuilder";
import { useGameProfile } from "../hooks/useGameProfile";
import { useAiScripts } from "../hooks/useAiScripts";

// Components
import ChatView from "../components/ai/ChatView";
import UiBuilderView from "../components/ai/UiBuilderView";
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
  const [scriptsLimit, setScriptsLimit] = useState(50);
  const [activeTab, setActiveTab] = useState("ui"); // "ui" | "chat" | "library"
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [showTour, setShowTour] = useState(localStorage.getItem("nexusrbx:tourComplete") !== "true");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSignInNudge, setShowSignInNudge] = useState(false);
  const [showUiSpecModal, setShowUiSpecModal] = useState(false);
  const [uiSpecs, setUiSpecs] = useState({
    theme: { bg: "#020617", primary: "#00f5d4", secondary: "#9b5de5", accent: "#f15bb5" },
    catalog: [],
    animations: "",
    platforms: ["pc"],
  });
  const [notifications, setNotifications] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState(null);

  // 3. Custom Hooks
  const notify = useCallback(({ message, type = "info" }) => {
    // Simplified notification for now, can be expanded
    console.log(`[${type}] ${message}`);
  }, []);

  const chat = useAiChat(user, settings, refreshBilling, notify);
  const ui = useUiBuilder(user, settings, refreshBilling, notify);
  const game = useGameProfile(settings, updateSettings);
  const scriptManager = useAiScripts(user, notify);

  // 4. Derived State
  const planKey = plan?.toLowerCase() || "free";
  const chatEndRef = useRef(null);

  // 5. Effects
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
    if (location?.state?.initialPrompt) {
      setPrompt(location.state.initialPrompt);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // 6. Handlers
  const handlePromptSubmit = (e) => {
    if (e) e.preventDefault();
    if (!prompt.trim()) return;

    if (!user || user.isAnonymous) {
      setShowSignInNudge(true);
      return;
    }

    if (activeTab === "ui") {
      setShowUiSpecModal(true);
    } else {
      chat.handleSubmit(prompt);
      setPrompt("");
    }
  };

  const handleOpenScript = async (script) => {
    if (script.type === "ui") {
      const db = getFirestore();
      const uid = user?.uid;
      if (!uid) return;
      const snap = await getDocs(query(collection(db, "users", uid, "scripts", script.id, "versions"), orderBy("versionNumber", "desc"), limit(1)));
      if (!snap.empty) {
        const data = snap.docs[0].data();
        ui.setActiveUiId(script.id);
        ui.setUiGenerations(prev => prev.some(g => g.id === script.id) ? prev : [{ id: script.id, lua: data.code, prompt: script.title, createdAt: Date.now() }, ...prev]);
        ui.setUiDrawerOpen(true);
      }
    } else {
      // Handle regular script opening (e.g. open in a code modal)
      notify({ message: "Opening script...", type: "info" });
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans flex flex-col relative overflow-hidden">
      {/* Background Glows */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#9b5de5]/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#00f5d4]/10 blur-[120px] rounded-full pointer-events-none" />

      <header className="border-b border-white/5 bg-black/40 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="text-2xl font-bold bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text cursor-pointer" onClick={() => navigate("/")}>NexusRBX</div>
            
            <nav className="hidden md:flex items-center bg-gray-900/50 border border-gray-800 rounded-xl p-1">
              <button 
                onClick={() => setActiveTab("ui")} 
                className={`px-4 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === "ui" ? "bg-gray-800 text-[#00f5d4] shadow-sm" : "text-gray-400 hover:text-white"}`}
              >
                <Layout className="h-4 w-4" /> UI Builder
              </button>
              <button 
                onClick={() => setActiveTab("chat")} 
                className={`px-4 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === "chat" ? "bg-gray-800 text-[#9b5de5] shadow-sm" : "text-gray-400 hover:text-white"}`}
              >
                <MessageSquare className="h-4 w-4" /> AI Chat
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
        <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-gray-900 border-r border-gray-800 flex flex-col transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <SidebarContent
            activeTab={activeTab === "ui" ? "scripts" : "chats"} 
            setActiveTab={() => {}} 
            scripts={scripts} 
            currentChatId={chat.currentChatId} 
            currentScriptId={scriptManager.currentScriptId}
            setCurrentScriptId={scriptManager.setCurrentScriptId}
            handleRenameScript={scriptManager.handleRenameScript}
            handleDeleteScript={scriptManager.handleDeleteScript}
            currentScript={scriptManager.currentScript}
            versionHistory={scriptManager.versionHistory}
            selectedVersionId={scriptManager.selectedVersionId}
            onSelectChat={(id) => { chat.openChatById(id); setSidebarOpen(false); setActiveTab("chat"); }} 
            onOpenGameContext={() => game.setShowWizard(true)}
            onDeleteChat={chat.handleDeleteChat}
            handleClearChat={chat.handleClearChat}
            onVersionView={(ver) => {
              if (ver.code) {
                setSelectedVersion({
                  id: `${scriptManager.currentScriptId}__${ver.versionNumber}`,
                  projectId: scriptManager.currentScriptId,
                  code: ver.code,
                  title: ver.title || scriptManager.currentScript?.title || "Script",
                  explanation: ver.explanation || "",
                  versionNumber: ver.versionNumber,
                  isSavedView: true
                });
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
              <button onClick={() => setActiveTab("ui")} className={`p-1.5 rounded ${activeTab === "ui" ? "bg-gray-800 text-[#00f5d4]" : "text-gray-500"}`}><Layout className="w-4 h-4" /></button>
              <button onClick={() => setActiveTab("chat")} className={`p-1.5 rounded ${activeTab === "chat" ? "bg-gray-800 text-[#9b5de5]" : "text-gray-500"}`}><MessageSquare className="w-4 h-4" /></button>
              <button onClick={() => setActiveTab("library")} className={`p-1.5 rounded ${activeTab === "library" ? "bg-gray-800 text-white" : "text-gray-500"}`}><Library className="w-4 h-4" /></button>
            </div>
          </div>

          <div className="flex-grow overflow-y-auto px-4 py-6 scrollbar-hide">
            {activeTab === "ui" && (
              <UiBuilderView 
                messages={chat.messages} 
                pendingMessage={ui.pendingMessage} 
                generationStage={ui.generationStage} 
                user={user} 
                onViewUi={(m) => { ui.setActiveUiId(m.projectId); ui.setUiDrawerOpen(true); }}
                onQuickStart={(p) => { setPrompt(p); setShowUiSpecModal(true); }}
                chatEndRef={chatEndRef}
              />
            )}
            {activeTab === "chat" && (
              <ChatView 
                messages={chat.messages} 
                pendingMessage={chat.pendingMessage} 
                generationStage={chat.generationStage} 
                user={user} 
                onViewUi={(m) => { ui.setActiveUiId(m.projectId); ui.setUiDrawerOpen(true); }}
                onQuickStart={(p) => chat.handleSubmit(p)}
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

          {activeTab !== "library" && (
            <div className="p-4 bg-gradient-to-t from-black via-black/80 to-transparent">
              <div className="max-w-5xl mx-auto space-y-4">
                <div className="px-2">
                  <TokenBar tokensLeft={totalRemaining} tokensLimit={subLimit} resetsAt={resetsAt} plan={planKey} />
                </div>
                
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] rounded-2xl blur opacity-20 group-focus-within:opacity-40 transition duration-500" />
                  <div className="relative bg-[#121212] border border-white/10 rounded-2xl p-2 shadow-2xl flex items-center gap-2">
                    <textarea
                      className="flex-1 bg-transparent border-none rounded-xl p-3 resize-none focus:ring-0 text-gray-100 placeholder-gray-500 text-[14px] leading-relaxed disabled:opacity-50"
                      rows="1" 
                      placeholder={activeTab === "ui" ? "Describe the UI you want to build..." : "Ask anything about Roblox development..."}
                      value={prompt} 
                      onChange={(e) => setPrompt(e.target.value)}
                      disabled={chat.isGenerating || ui.uiIsGenerating}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handlePromptSubmit();
                        }
                      }}
                    />
                    <button 
                      onClick={handlePromptSubmit} 
                      disabled={chat.isGenerating || ui.uiIsGenerating || !prompt.trim()}
                      className={`p-3 rounded-xl transition-all disabled:opacity-50 ${
                        activeTab === "ui" ? "bg-[#00f5d4] text-black hover:shadow-[0_0_20px_rgba(0,245,212,0.4)]" : "bg-[#9b5de5] text-white hover:shadow-[0_0_20px_rgba(155,93,229,0.4)]"
                      }`}
                    >
                      {chat.isGenerating || ui.uiIsGenerating ? <Loader className="h-5 w-5 animate-spin" /> : (activeTab === "ui" ? <Sparkles className="h-5 w-5" /> : <Send className="h-5 w-5" />)}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      <UiPreviewDrawer
        open={ui.uiDrawerOpen}
        onClose={() => ui.setUiDrawerOpen(false)}
        lua={ui.activeUi?.lua || ""}
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
      />

      {showUiSpecModal && (
        <UiSpecificationModal
          onClose={() => setShowUiSpecModal(false)}
          initialSpecs={uiSpecs}
          onConfirm={(specs) => { 
            setUiSpecs(specs); 
            setShowUiSpecModal(false); 
            ui.handleGenerateUiPreview(prompt, chat.currentChatId, chat.setCurrentChatId, specs);
            setPrompt("");
          }}
        />
      )}

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
