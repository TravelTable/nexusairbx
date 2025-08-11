import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Send, Loader, Menu
} from "lucide-react";
import { auth, db } from "./firebase";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import {
  doc, getDoc, setDoc, collection, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy
} from "firebase/firestore";
import SidebarContent from "../components/SidebarContent";
import RightSidebar from "../components/RightSidebar";
import Modal from "../components/Modal";
import FeedbackModal from "../components/FeedbackModal";
import SimpleCodeDrawer from "../components/CodeDrawer";
import ScriptLoadingBarContainer from "../components/ScriptLoadingBarContainer";
import WelcomeCard from "../components/WelcomeCard";
import TokenBar from "../components/TokenBar";
import TypewriterText from "../components/TypewriterText";
import CelebrationAnimation from "../components/CelebrationAnimation";

// --- Backend API URL ---
const BACKEND_URL = "https://nexusrbx-backend-production.up.railway.app";

// --- Token System Constants ---
const TOKEN_LIMIT = 4;
const TOKEN_REFRESH_HOURS = 48; // 2 days

// --- Developer Email for Infinite Tokens ---
const DEVELOPER_EMAIL = "jackt1263@gmail.com"; // CHANGE THIS TO YOUR DEV EMAIL

const modelOptions = [
  { value: "nexus-3", label: "Nexus-3 (Legacy, Default)" },
  { value: "nexus-4", label: "Nexus-4 (Fast, Accurate)" },
  { value: "nexus-2", label: "Nexus-2 (GPT-3.5 Turbo)" }
];
const creativityOptions = [
  { value: 0.3, label: "Low (Precise)" },
  { value: 0.7, label: "Medium (Balanced)" },
  { value: 1.0, label: "High (Creative)" }
];
const codeStyleOptions = [
  { value: "optimized", label: "Optimized" },
  { value: "readable", label: "Readable" }
];

const defaultSettings = {
  modelVersion: "nexus-3",
  creativity: 0.7,
  codeStyle: "optimized"
};

// --- Token System ---
function getTokenDocRef(uid) {
  return doc(db, "userTokens", uid);
}

async function getUserTokens(uid) {
  const tokenDoc = await getDoc(getTokenDocRef(uid));
  if (!tokenDoc.exists()) {
    return null;
  }
  return tokenDoc.data();
}

async function setUserTokens(uid, tokens, lastRefresh) {
  await setDoc(getTokenDocRef(uid), {
    tokens,
    lastRefresh,
  });
}

function getNextRefreshDate(lastRefresh) {
  const date = new Date(lastRefresh);
  date.setHours(date.getHours() + TOKEN_REFRESH_HOURS);
  return date;
}

function useTokens(user) {
  const [tokens, setTokens] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshCountdown, setRefreshCountdown] = useState(null);

  // --- Infinite tokens for developer email ---
  const isDev =
    user &&
    user.email &&
    user.email.toLowerCase() === DEVELOPER_EMAIL.toLowerCase();

  useEffect(() => {
    if (!user) {
      setTokens(null);
      setLastRefresh(null);
      setRefreshCountdown(null);
      return;
    }
    if (isDev) {
      setTokens(Infinity);
      setLastRefresh(new Date().toISOString());
      setLoading(false);
      setRefreshCountdown(null);
      return;
    }
    setLoading(true);
    getUserTokens(user.uid)
      .then((data) => {
        if (!data) {
          const now = new Date().toISOString();
          setUserTokens(user.uid, TOKEN_LIMIT, now).then(() => {
            setTokens(TOKEN_LIMIT);
            setLastRefresh(now);
            setLoading(false);
          });
        } else {
          setTokens(data.tokens);
          setLastRefresh(data.lastRefresh);
          setLoading(false);
        }
      })
      .catch(() => {
        setTokens(TOKEN_LIMIT);
        setLastRefresh(new Date().toISOString());
        setLoading(false);
      });
    // eslint-disable-next-line
  }, [user, isDev]);

  useEffect(() => {
    if (!user || !lastRefresh || isDev) return;
    const interval = setInterval(() => {
      const now = new Date();
      const refreshDate = getNextRefreshDate(lastRefresh);
      if (now >= refreshDate) {
        setUserTokens(user.uid, TOKEN_LIMIT, now.toISOString()).then(() => {
          setTokens(TOKEN_LIMIT);
          setLastRefresh(now.toISOString());
        });
      } else {
        const diff = refreshDate - now;
        if (diff > 0) {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const mins = Math.floor((diff / (1000 * 60)) % 60);
          setRefreshCountdown({ hours, mins });
        }
      }
    }, 1000 * 60);
    return () => clearInterval(interval);
  }, [user, lastRefresh, isDev]);

  useEffect(() => {
    if (!user || !lastRefresh || isDev) return;
    const now = new Date();
    const refreshDate = getNextRefreshDate(lastRefresh);
    if (now >= refreshDate) {
      setUserTokens(user.uid, TOKEN_LIMIT, now.toISOString()).then(() => {
        setTokens(TOKEN_LIMIT);
        setLastRefresh(now.toISOString());
      });
    }
  }, [user, lastRefresh, isDev]);

  const consumeToken = async () => {
    if (!user || tokens === null) return false;
    if (isDev) return true;
    if (tokens <= 0) return false;
    const newTokens = tokens - 1;
    await setUserTokens(user.uid, newTokens, lastRefresh);
    setTokens(newTokens);
    return true;
  };

  return {
    tokens,
    loading,
    refreshCountdown,
    consumeToken,
    lastRefresh,
    isDev,
  };
}

// --- Firestore Chat Helpers ---
function getChatsCollectionRef(uid) {
  return collection(db, "users", uid, "chats");
}
function getChatDocRef(uid, chatId) {
  return doc(db, "users", uid, "chats", chatId);
}
function getScriptsCollectionRef(uid, chatId) {
  return collection(db, "users", uid, "chats", chatId, "scripts");
}
function getScriptDocRef(uid, chatId, scriptId) {
  return doc(db, "users", uid, "chats", chatId, "scripts", scriptId);
}

// --- Main Container Component ---
export default function NexusRBXAIPageContainer() {
  const navigate = useNavigate();

  // --- State for multi-chat ---
  const [user, setUser] = useState(null);
  const [chats, setChats] = useState([]); // [{id, title, createdAt, updatedAt}]
  const [currentChatId, setCurrentChatId] = useState(null);
  const [scripts, setScripts] = useState([]); // [{id, prompt, sections, status, versions: []}]
  const [currentScript, setCurrentScript] = useState(null); // {id, title, versions: [...]}
  const [versionHistory, setVersionHistory] = useState([]); // [{version, code, createdAt, id}]
  const [selectedVersion, setSelectedVersion] = useState(null);

  // --- UI State ---
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("chat"); // chat | saved | chats
  const [prompt, setPrompt] = useState("");
  const [promptCharCount, setPromptCharCount] = useState(0);
  const [promptError, setPromptError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState("idle"); // idle | title | explanation | code | done
  const [typewriterTitle, setTypewriterTitle] = useState("");
  const [typewriterExplanation, setTypewriterExplanation] = useState("");
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
  });

  // --- Settings, tokens, etc. ---
  const [settings, setSettings] = useState(defaultSettings);
  const [promptTemplates, setPromptTemplates] = useState([]);
  const [userPromptTemplates, setUserPromptTemplates] = useState([]);
  const [promptAutocomplete, setPromptAutocomplete] = useState([]);
  const [promptHistory, setPromptHistory] = useState([]);
  const [promptSearch, setPromptSearch] = useState("");
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState("all");
  const [tags, setTags] = useState([]);
  const [selectedTag, setSelectedTag] = useState("all");
  const [showAddFolderModal, setShowAddFolderModal] = useState(false);
  const [showAddTagModal, setShowAddTagModal] = useState(false);
  const [promptSuggestions, setPromptSuggestions] = useState([]);
  const [promptSuggestionLoading, setPromptSuggestionLoading] = useState(false);

  // --- Auth ---
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

  // --- Tokens ---
  const {
    tokens,
    loading: tokensLoading,
    refreshCountdown,
    consumeToken,
    lastRefresh,
    isDev,
  } = useTokens(user);

  // --- Load Chats from Firestore ---
  useEffect(() => {
    if (!user) {
      setChats([]);
      setCurrentChatId(null);
      return;
    }
    const q = query(getChatsCollectionRef(user.uid), orderBy("updatedAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatList = [];
      snapshot.forEach(doc => {
        chatList.push({ id: doc.id, ...doc.data() });
      });
      setChats(chatList);
      // Auto-select first chat if none selected
      if (!currentChatId && chatList.length > 0) {
        setCurrentChatId(chatList[0].id);
      }
    });
    return () => unsubscribe();
    // eslint-disable-next-line
  }, [user]);

  // --- Load Scripts for Current Chat ---
  useEffect(() => {
    if (!user || !currentChatId) {
      setScripts([]);
      setCurrentScript(null);
      setVersionHistory([]);
      setSelectedVersion(null);
      return;
    }
    const q = query(getScriptsCollectionRef(user.uid, currentChatId), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const scriptList = [];
      snapshot.forEach(doc => {
        scriptList.push({ id: doc.id, ...doc.data() });
      });
      setScripts(scriptList);
    });
    return () => unsubscribe();
    // eslint-disable-next-line
  }, [user, currentChatId]);

  // --- Prompt Char Count & Error ---
  useEffect(() => {
    setPromptCharCount(prompt.length);
    if (prompt.length > 800) {
      setPromptError("Prompt too long (max 800 characters).");
    } else {
      setPromptError("");
    }
    // Autocomplete logic
    if (prompt.length > 1) {
      const allPrompts = [
        ...promptTemplates,
        ...userPromptTemplates,
        ...promptHistory
      ];
      const filtered = allPrompts
        .filter(p => p.toLowerCase().startsWith(prompt.toLowerCase()) && p.toLowerCase() !== prompt.toLowerCase())
        .slice(0, 5);
      setPromptAutocomplete(filtered);
    } else {
      setPromptAutocomplete([]);
    }
  }, [prompt, promptTemplates, userPromptTemplates, promptHistory]);

  // --- Typewriter Effect for Title and Explanation ---
  const runTypewriter = (text, setText, doneCallback) => {
    let idx = 0;
    let timeoutId = null;
    function type() {
      setText(text.slice(0, idx + 1));
      idx++;
      if (idx < text.length) {
        timeoutId = setTimeout(type, 18 + Math.random() * 30);
      } else if (doneCallback) {
        doneCallback();
      }
    }
    setText("");
    type();
    return () => clearTimeout(timeoutId);
  };

  // --- Main Generation Flow ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (typeof prompt !== "string" || !prompt.trim() || isGenerating) return;
    if (prompt.length > 800) {
      setPromptError("Prompt too long (max 800 characters).");
      return;
    }
    if (!user) {
      alert("Sign in to generate scripts and use tokens.");
      return;
    }
    if (tokensLoading) {
      alert("Loading your tokens. Please wait...");
      return;
    }
    if (tokens === null || tokens === undefined) {
      alert("Unable to load your tokens. Please try again.");
      return;
    }
    if (!isDev && tokens <= 0) {
      alert("You have 0 tokens left. Please wait for your tokens to refresh in 2 days.");
      return;
    }

    setPrompt("");
    setIsGenerating(true);
    setGenerationStep("title");
    setTypewriterTitle("");
    setTypewriterExplanation("");
    setShowCelebration(false);

    // Conversational memory: last 10 scripts in this chat
    const conversation = scripts
      .slice(-10)
      .map(s => ({
        role: "assistant",
        content: s.sections?.code || s.sections?.title || ""
      }));

    let idToken;
    try {
      idToken = await user.getIdToken();
    } catch {
      setIsGenerating(false);
      setGenerationStep("idle");
      alert("Not authenticated.");
      return;
    }

    let scriptTitle = "";
    let explanation = "";
    let explanationObj = {};
    let code = "";
    let version = 1;
    let baseScriptId = null;
    let newChatId = null;

    try {
      // --- 1. Generate Title ---
      setGenerationStep("title");
      const titleRes = await fetch(`${BACKEND_URL}/api/generate-title-advanced`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({
          prompt,
          conversation,
          model: "gpt-4.1-2025-04-14",
          isNewScript: true,
          previousTitle: ""
        })
      });

      if (!titleRes.ok) {
        const text = await titleRes.text();
        throw new Error(`Failed to generate title: ${titleRes.status} ${titleRes.statusText} - ${text.slice(0, 200)}`);
      }
      let titleData;
      try {
        titleData = await titleRes.json();
      } catch (err) {
        const text = await titleRes.text();
        throw new Error(`Title API did not return JSON: ${text.slice(0, 200)}`);
      }
      scriptTitle = titleData.title || "Script";
      if (!scriptTitle) throw new Error("Failed to generate title");

      // --- If no current chat, create one with the script title as chat name ---
      if (!currentChatId) {
        const chatDoc = await addDoc(getChatsCollectionRef(user.uid), {
          title: scriptTitle,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        newChatId = chatDoc.id;
        setCurrentChatId(chatDoc.id);
      }

      // --- Typewriter for Title ---
      await new Promise(resolve => runTypewriter(scriptTitle, setTypewriterTitle, resolve));

      // --- 2. Generate Explanation ---
      setGenerationStep("explanation");
      const explanationRes = await fetch(`${BACKEND_URL}/api/generate-explanation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({
          prompt,
          conversation,
          model: "gpt-4.1-2025-04-14"
        })
      });

      if (!explanationRes.ok) {
        const text = await explanationRes.text();
        throw new Error(`Failed to generate explanation: ${explanationRes.status} ${explanationRes.statusText} - ${text.slice(0, 200)}`);
      }
      try {
        explanationObj = await explanationRes.json();
      } catch (err) {
        const text = await explanationRes.text();
        throw new Error(`Explanation API did not return JSON: ${text.slice(0, 200)}`);
      }
      explanation = explanationObj.explanation || "";
      if (!explanation) throw new Error("Failed to generate explanation");

      // --- Typewriter for Explanation ---
      await new Promise(resolve => runTypewriter(explanation, setTypewriterExplanation, resolve));

      // --- 3. Show Loading Bar for Code Generation ---
      setGenerationStep("code");
      setLoadingBarVisible(true);
      setLoadingBarData({
        filename: scriptTitle.replace(/[^a-zA-Z0-9_\- ]/g, "").replace(/\s+/g, "_").slice(0, 40) + ".lua",
        version: "v1",
        language: "lua",
        loading: true,
        codeReady: false,
        estimatedLines: null,
        saved: false,
        onSave: null,
        onView: null,
      });

      // --- 4. Generate Code ---
      const codeRes = await fetch(`${BACKEND_URL}/api/generate-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({
          prompt,
          conversation,
          explanation,
          model: "gpt-4.1-2025-04-14"
        })
      });

      if (!codeRes.ok) {
        const text = await codeRes.text();
        throw new Error(`Failed to generate code: ${codeRes.status} ${codeRes.statusText} - ${text.slice(0, 200)}`);
      }
      let codeData;
      try {
        codeData = await codeRes.json();
      } catch (err) {
        const text = await codeRes.text();
        throw new Error(`Code API did not return JSON: ${text.slice(0, 200)}`);
      }
      code = codeData.code || "";
      if (!code) throw new Error("Failed to generate code");

      // --- 5. Save Script (as v1) in Firestore ---
      setGenerationStep("saving");
      // Use the new chat id if we just created one, otherwise use currentChatId
      const chatIdToUse = newChatId || currentChatId;
      const scriptDocRef = await addDoc(getScriptsCollectionRef(user.uid, chatIdToUse), {
        prompt,
        sections: {
          title: scriptTitle,
          ...explanationObj,
          code,
          version: 1
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        versions: [
          {
            version: 1,
            code,
            createdAt: new Date().toISOString(),
            title: scriptTitle
          }
        ]
      });
      baseScriptId = scriptDocRef.id;
      version = 1;

      // --- 6. Update Chat updatedAt ---
      await updateDoc(getChatDocRef(user.uid, chatIdToUse), {
        updatedAt: new Date().toISOString()
      });

      // --- 7. Fetch Version History ---
      const scriptDoc = await getDoc(getScriptDocRef(user.uid, chatIdToUse, baseScriptId));
      let versions = [];
      if (scriptDoc.exists()) {
        versions = scriptDoc.data().versions || [];
      }
      setVersionHistory(versions.sort((a, b) => (b.version || 1) - (a.version || 1)));
      setCurrentScript({
        id: baseScriptId,
        title: scriptTitle,
        versions,
      });
      setSelectedVersion(versions[0]);

      setLoadingBarData(prev => ({
        ...prev,
        loading: false,
        codeReady: true,
        saved: true,
        version: `v${version}`,
        filename: scriptTitle.replace(/[^a-zA-Z0-9_\- ]/g, "").replace(/\s+/g, "_").slice(0, 40) + ".lua",
        onSave: () => {},
        onView: () => {}
      }));
      setLoadingBarVisible(false);
      setGenerationStep("done");
      setShowCelebration(true);

      // --- 8. Reset typewriter for next prompt ---
      setTimeout(() => setShowCelebration(false), 3000);
    } catch (err) {
      setIsGenerating(false);
      setGenerationStep("idle");
      setLoadingBarVisible(false);
      alert("Error during script generation: " + (err.message || err));
    } finally {
      setIsGenerating(false);
      setLoadingBarVisible(false);
      setGenerationStep("idle");
    }
  };

  // --- Save Script (new version) ---
  const handleSaveScript = async (newTitle, code) => {
    if (!user || !code || !currentChatId || !currentScript) return;
    let baseScriptId = currentScript.id;
    let scriptDocRef = getScriptDocRef(user.uid, currentChatId, baseScriptId);
    let scriptDoc = await getDoc(scriptDocRef);
    let versions = [];
    if (scriptDoc.exists()) {
      versions = scriptDoc.data().versions || [];
    }
    let version = (versions[0]?.version || 1) + 1;
    const newVersion = {
      version,
      code,
      createdAt: new Date().toISOString(),
      title: newTitle
    };
    versions.unshift(newVersion);
    await updateDoc(scriptDocRef, {
      versions,
      updatedAt: new Date().toISOString(),
      "sections.code": code,
      "sections.title": newTitle,
      "sections.version": version
    });
    setVersionHistory(versions);
    setCurrentScript(cs => ({
      ...cs,
      versions
    }));
    alert("Script saved as new version!");
  };

  // --- Sidebar Version Click Handler ---
  const handleVersionView = (versionObj) => {
    setSelectedVersion(versionObj);
    setCurrentScript(cs => ({
      ...cs,
      title: versionObj.title
    }));
  };

  // --- Download Handler for Version ---
  const handleVersionDownload = (versionObj) => {
    const blob = new Blob([versionObj.code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    // Sanitize filename
    const filename = (versionObj.title || "Script").replace(/[^a-zA-Z0-9_\- ]/g, "").replace(/\s+/g, "_").slice(0, 40) + ".lua";
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // --- Chat Management ---
  const handleCreateChat = async (title = "New Chat") => {
    if (!user) return;
    const chatDoc = await addDoc(getChatsCollectionRef(user.uid), {
      title,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    setCurrentChatId(chatDoc.id);
  };
  const handleRenameChat = async (chatId, newTitle) => {
    if (!user) return;
    await updateDoc(getChatDocRef(user.uid, chatId), {
      title: newTitle,
      updatedAt: new Date().toISOString()
    });
  };
  const handleDeleteChat = async (chatId) => {
    if (!user) return;
    await deleteDoc(getChatDocRef(user.uid, chatId));
    if (currentChatId === chatId) {
      setCurrentChatId(chats.length > 1 ? chats.find(c => c.id !== chatId)?.id : null);
    }
  };

  // --- Scroll to bottom on new script ---
  const messagesEndRef = useRef(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [scripts, isGenerating]);

  // --- Main Layout ---
  return (
    <div
      className="min-h-screen bg-[#0D0D0D] text-white font-sans flex flex-col relative"
      style={{
        backgroundImage:
          "radial-gradient(ellipse at 60% 0%, rgba(155,93,229,0.08) 0%, rgba(0,0,0,0) 70%), radial-gradient(ellipse at 0% 100%, rgba(0,245,212,0.06) 0%, rgba(0,0,0,0) 80%)"
      }}
    >
      {/* Header */}
      <header className="border-b border-gray-800 bg-black/30 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center">
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
              <a
                href="/"
                className="text-gray-300 hover:text-white transition-colors duration-300"
              >
                Home
              </a>
              <a
                href="/ai"
                className="text-white border-b-2 border-[#9b5de5] transition-colors duration-300"
              >
                AI Console
              </a>
              <a
                href="/docs"
                className="text-gray-300 hover:text-white transition-colors duration-300"
              >
                Docs
              </a>
              <a
                href="#"
                className="text-gray-300 hover:text-white transition-colors duration-300"
              >
                Discord
              </a>
            </nav>
          </div>
          {/* Hamburger for mobile */}
          <button
            className="md:hidden text-gray-300 ml-2 p-2 rounded hover:bg-gray-800 transition-colors"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </header>

      {/* Sidebar (desktop) */}
      <aside
        className="hidden md:flex w-80 bg-gray-900 border-r border-gray-800 flex-col sticky top-[64px] left-0 z-30 h-[calc(100vh-64px)]"
        style={{
          minHeight: "calc(100vh - 64px)",
          maxHeight: "calc(100vh - 64px)"
        }}
      >
        <SidebarContent
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          handleClearChat={() => {
            // Clear scripts for current chat
            setScripts([]);
            setCurrentScript(null);
            setVersionHistory([]);
            setSelectedVersion(null);
          }}
          setPrompt={setPrompt}
          chats={chats}
          currentChatId={currentChatId}
          setCurrentChatId={setCurrentChatId}
          handleCreateChat={handleCreateChat}
          handleRenameChat={handleRenameChat}
          handleDeleteChat={handleDeleteChat}
          scripts={scripts}
          currentScript={currentScript}
          versionHistory={versionHistory}
          onVersionView={handleVersionView}
          onVersionDownload={handleVersionDownload}
          promptSearch={promptSearch}
          setPromptSearch={setPromptSearch}
        />
      </aside>

      {/* Main Content */}
      <main className="flex-grow flex flex-col md:flex-row relative">
        {/* Main chat area */}
        <section className="flex-grow flex flex-col md:w-2/3 h-full relative z-10">
          <div className="flex-grow overflow-y-auto px-2 md:px-4 py-6 flex flex-col items-center">
            <div className="w-full max-w-2xl mx-auto space-y-6">
              {/* Show Title at Top */}
              {typewriterTitle && (
                <div className="mb-4 text-center">
                  <TypewriterText
                    text={typewriterTitle}
                    className="text-3xl font-bold bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text"
                    instant
                  />
                </div>
              )}
              {/* Show Explanation after Title */}
              {typewriterExplanation && (
                <div className="mb-4">
                  <div className="font-bold text-[#9b5de5] mb-1 text-lg">Explanation</div>
                  <TypewriterText
                    text={typewriterExplanation}
                    className="text-gray-200 whitespace-pre-line text-base"
                    instant
                  />
                </div>
              )}
              {/* Script history for current chat */}
              {scripts.length === 0 && !isGenerating ? (
                <WelcomeCard
                  setPrompt={setPrompt}
                  promptTemplates={promptTemplates}
                  userPromptTemplates={userPromptTemplates}
                  promptSuggestions={promptSuggestions}
                  promptSuggestionLoading={promptSuggestionLoading}
                />
              ) : (
                scripts.map((session, idx) => (
                  <div key={session.id} className="mb-6">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-bold text-lg text-[#00f5d4]">
                        {session.sections?.title
                          ? session.sections.title.replace(/\s*v\d+$/i, "")
                          : `Script ${idx + 1}`}
                      </span>
                      {session.sections?.version && (
                        <span className="ml-2 text-xs text-gray-400 font-bold">
                          v{session.sections.version}
                        </span>
                      )}
                      {session.status === "generating" && (
                        <Loader className="h-4 w-4 text-[#9b5de5] animate-spin ml-2" />
                      )}
                    </div>
                    <div className="bg-gray-900/60 rounded-lg p-4 border border-gray-800">
                      {session.sections?.controlExplanation && (
                        <div className="mb-3">
                          <div className="font-bold text-[#9b5de5] mb-1">Controls Explanation</div>
                          <div className="text-gray-200 whitespace-pre-line text-sm">
                            {session.sections.controlExplanation}
                          </div>
                        </div>
                      )}
                      {session.sections?.features && (
                        <div className="mb-3">
                          <div className="font-bold text-[#00f5d4] mb-1">Features</div>
                          <div className="text-gray-200 whitespace-pre-line text-sm">
                            {session.sections.features}
                          </div>
                        </div>
                      )}
                      {session.sections?.controls && (
                        <div className="mb-3">
                          <div className="font-bold text-[#9b5de5] mb-1">Controls</div>
                          <div className="text-gray-200 whitespace-pre-line text-sm">
                            {session.sections.controls}
                          </div>
                        </div>
                      )}
                      {session.sections?.howItShouldAct && (
                        <div className="mb-3">
                          <div className="font-bold text-[#00f5d4] mb-1">How It Should Act</div>
                          <div className="text-gray-200 whitespace-pre-line text-sm">
                            {session.sections.howItShouldAct}
                          </div>
                        </div>
                      )}
                      {/* Code is only shown in the code drawer */}
                      {session.status === "error" && (
                        <div className="text-red-400 text-sm mt-2">
                          Error generating script. Please try again.
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
              {isGenerating && (
                <div className="flex items-center text-gray-400 text-sm mt-2">
                  <Loader className="h-4 w-4 animate-spin mr-2" />
                  NexusRBX is generating...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
          {/* Input Area */}
          <div className="border-t border-gray-800 bg-black/30 px-2 md:px-4 py-4 flex justify-center shadow-inner">
            <form
              onSubmit={handleSubmit}
              className="w-full max-w-2xl mx-auto"
              autoComplete="off"
            >
              <div className="relative">
                <textarea
                  value={typeof prompt === "string" ? prompt : ""}
                  onChange={e => setPrompt(e.target.value)}
                  placeholder="Describe the Roblox mod you want to create..."
                  className={`w-full rounded-lg bg-gray-900/60 border border-gray-700 focus:border-[#9b5de5] focus:outline-none focus:ring-2 focus:ring-[#9b5de5]/50 transition-all duration-300 py-3 px-4 pr-14 resize-none shadow-lg ${promptError ? "border-red-500" : ""}`}
                  rows="3"
                  disabled={isGenerating}
                  maxLength={800}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      handleSubmit(e);
                    }
                  }}
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
                    tokens === 0 ||
                    tokens === null ||
                    tokens === undefined ||
                    tokensLoading ||
                    prompt.length > 800
                  }
                  className={`absolute right-3 bottom-3 p-3 rounded-full shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#9b5de5] ${
                    isGenerating ||
                    !(typeof prompt === "string" && prompt.trim()) ||
                    tokens === 0 ||
                    tokens === null ||
                    tokens === undefined ||
                    tokensLoading ||
                    prompt.length > 800
                      ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-white hover:shadow-xl hover:scale-110"
                  }`}
                  aria-label="Send prompt"
                >
                  {isGenerating ? (
                    <Loader className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </button>
              </div>
              <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                <TokenBar tokens={tokens} tokensLoading={tokensLoading} refreshCountdown={refreshCountdown} isDev={isDev} />
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
              {!user && (
                <div className="mt-2 text-xs text-red-400">
                  Sign in to use tokens and generate scripts.
                </div>
              )}
              {tokens !== null && tokens <= 0 && (
                <div className="mt-2 text-xs text-yellow-400">
                  You have 0 tokens left. Tokens refresh every 2 days.
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
            maxHeight: "calc(100vh - 64px)"
          }}
        >
          <RightSidebar
            settings={settings}
            setSettings={setSettings}
            modelOptions={modelOptions}
            creativityOptions={creativityOptions}
            codeStyleOptions={codeStyleOptions}
            messages={scripts}
            setPrompt={setPrompt}
            userPromptTemplates={userPromptTemplates}
            setUserPromptTemplates={setUserPromptTemplates}
            promptSuggestions={promptSuggestions}
            promptSuggestionLoading={promptSuggestionLoading}
          />
        </aside>
      </main>
      {/* Loading Bar */}
      {loadingBarVisible && (
        <ScriptLoadingBarContainer
          filename={loadingBarData.filename}
          version={loadingBarData.version}
          language={loadingBarData.language}
          loading={loadingBarData.loading}
          codeReady={loadingBarData.codeReady}
          estimatedLines={loadingBarData.estimatedLines}
          saved={loadingBarData.saved}
          onSave={loadingBarData.onSave}
          onView={loadingBarData.onView}
        />
      )}
      {/* --- Code Drawer Integration --- */}
      {selectedVersion && (
        <SimpleCodeDrawer
          open={!!selectedVersion}
          code={selectedVersion.code}
          title={selectedVersion.title}
          version={selectedVersion.version ? `v${selectedVersion.version}` : ""}
          onClose={() => setSelectedVersion(null)}
          onSaveScript={handleSaveScript}
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
    </div>
  );
}