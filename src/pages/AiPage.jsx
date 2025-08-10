import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Send, Loader, Menu
} from "lucide-react";
import { auth, db } from "./firebase";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import SidebarContent from "../components/SidebarContent";
import RightSidebar from "../components/RightSidebar";
import SimpleCodeDrawer from "../components/CodeDrawer";
import WelcomeCard from "../components/WelcomeCard";
import TokenBar from "../components/TokenBar";
import ScriptLoadingBarContainer from "../components/ScriptLoadingBarContainer";

// --- Token System Constants ---
const TOKEN_LIMIT = 4;
const TOKEN_REFRESH_HOURS = 48; // 2 days

// --- Developer Email for Infinite Tokens ---
const DEVELOPER_EMAIL = "jackt1263@gmail.com"; // CHANGE THIS TO YOUR DEV EMAIL

const API_BASE = process.env.REACT_APP_API_BASE || "https://nexusrbx-backend-production.up.railway.app";

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

// --- JWT Auth Helpers ---
async function getJWT() {
  const user = auth.currentUser;
  if (user) {
    return await user.getIdToken();
  }
  return null;
}
function setJWT(token) {
  localStorage.setItem("jwt_token", token);
}
function removeJWT() {
  localStorage.removeItem("jwt_token");
}

// --- Typewriter Effect Component ---
function Typewriter({ text, onDone, speed = 18, className = "" }) {
  const [displayed, setDisplayed] = useState("");
  const idx = useRef(0);
  useEffect(() => {
    setDisplayed("");
    idx.current = 0;
    if (!text) return;
    let cancelled = false;
    function tick() {
      if (cancelled) return;
      if (idx.current < text.length) {
        setDisplayed((prev) => prev + text[idx.current]);
        idx.current += 1;
        setTimeout(tick, speed);
      } else if (onDone) {
        onDone();
      }
    }
    tick();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line
  }, [text]);
  return (
    <span className={className} aria-live="polite" style={{ whiteSpace: "pre-line" }}>
      {displayed}
      <span className="opacity-60 animate-pulse">|</span>
    </span>
  );
}

// --- Thinking Dots Animation ---
function ThinkingDots({ className = "" }) {
  const [dots, setDots] = useState("");
  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setDots(".".repeat((i % 3) + 1));
      i++;
    }, 500);
    return () => clearInterval(interval);
  }, []);
  return (
    <span className={className} aria-live="polite">
      Thinking{dots}
    </span>
  );
}

// --- Helper: Detect update/modify intent in prompt ---
function isUpdatePrompt(prompt) {
  if (!prompt) return false;
  const updateKeywords = [
    "update", "modify", "add", "change", "improve", "edit", "enhance", "upgrade", "make it", "can you", "could you"
  ];
  const lowerPrompt = prompt.toLowerCase();
  return updateKeywords.some(word => lowerPrompt.startsWith(word) || lowerPrompt.includes(` ${word} `));
}

// --- Helper: Sanitize filename from title ---
function sanitizeFilename(title) {
  if (!title) return "Script.lua";
  // Remove emojis and special chars, replace spaces with underscores, keep alphanum, dash, underscore
  return (
    title
      .replace(/[\u{1F600}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "") // remove emojis
      .replace(/[^a-zA-Z0-9 _-]/g, "") // remove special chars except space, _, -
      .replace(/\s+/g, "_") // spaces to underscores
      .replace(/_+/g, "_") // collapse multiple underscores
      .replace(/^_+|_+$/g, "") // trim underscores
      .slice(0, 40) // limit length
      + ".lua"
  );
}

// --- Main Container Component ---
export default function NexusRBXAIPageContainer() {
  const navigate = useNavigate();

  // --- State for script sessions (each script = one prompt/response group) ---
  const [scriptSessions, setScriptSessions] = useState([]); // [{id, prompt, sections, status, typewriterDone, version}]
  const [prompt, setPrompt] = useState("");
  const [promptCharCount, setPromptCharCount] = useState(0);
  const [promptError, setPromptError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settings, setSettings] = useState(defaultSettings);
  const [promptAutocomplete, setPromptAutocomplete] = useState([]);
  const [promptHistory, setPromptHistory] = useState([]);
  const [codeDrawer, setCodeDrawer] = useState({ open: false, code: "", title: "", version: null, liveGenerating: false, liveContent: "" });

  // --- Loading bar and code loading state ---
  const [isCodeLoading, setIsCodeLoading] = useState(false);
  const [codeReady, setCodeReady] = useState(false);
  const [codeLoadingSessionId, setCodeLoadingSessionId] = useState(null);

  // --- Auth ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        // Always refresh JWT on login
        const token = await firebaseUser.getIdToken();
        setJWT(token);
      } else {
        signInAnonymously(auth)
          .then(async (res) => {
            setUser(res.user);
            const token = await res.user.getIdToken();
            setJWT(token);
          })
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
    isDev,
  } = useTokens(user);

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
        ...promptHistory
      ];
      const filtered = allPrompts
        .filter(p => p.toLowerCase().startsWith(prompt.toLowerCase()) && p.toLowerCase() !== prompt.toLowerCase())
        .slice(0, 5);
      setPromptAutocomplete(filtered);
    } else {
      setPromptAutocomplete([]);
    }
  }, [prompt, promptHistory]);

  // --- Ref for scrolling to bottom ---
  const messagesEndRef = useRef(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [scriptSessions, isGenerating, isCodeLoading]);

  // --- AI Response (two-phase, explanation then code) ---
  const generateAIResponse = async (userPrompt, userSettings, conversation = []) => {
    return new Promise(async (resolve, reject) => {
      let jwt = await getJWT();
      if (!jwt) {
        reject(new Error("Not authenticated."));
        return;
      }

      // --- Versioning logic ---
      let version = 1;
      let titleForUpdate = null;
      if (isUpdatePrompt(userPrompt) && scriptSessions.length > 0) {
        // If updating, use last script's title and increment version
        const lastSession = scriptSessions[scriptSessions.length - 1];
        titleForUpdate = lastSession.sections?.title || null;
        version = (lastSession.version || lastSession.sections?.version || 1) + 1;
      }

      let sessionId = Date.now() + Math.floor(Math.random() * 10000);
      let newSession = {
        id: sessionId,
        prompt: userPrompt,
        sections: {},
        status: "thinking",
        typewriterDone: false,
        version: version
      };
      setScriptSessions(prev => [...prev, newSession]);
      let currentSections = {};

      // PHASE 1: Generate explanation (using /api/generate-explanation)
      try {
        setScriptSessions(prev => {
          const updated = [...prev];
          const idx = updated.findIndex(s => s.id === sessionId);
          if (idx !== -1) {
            updated[idx] = {
              ...updated[idx],
              status: "thinking"
            };
          }
          return updated;
        });

        const response = await fetch(`${API_BASE}/api/generate-explanation`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${jwt}`
          },
          body: JSON.stringify({
            prompt: userPrompt,
            conversation: conversation
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          reject(new Error("API error: " + errorText));
          return;
        }

        const data = await response.json();
        const explanationBuffer = data.explanation || "";

        // --- Parse sections ---
        const controlExplanationMatch = explanationBuffer.match(/\*\*Control Explanation Section\*\*\s*—\s*([\s\S]+?)\n\*\*Features\*\*/);
        const featuresMatch = explanationBuffer.match(/\*\*Features\*\*\s*—\s*([\s\S]+?)\n\*\*Controls\*\*/);
        const controlsMatch = explanationBuffer.match(/\*\*Controls\*\*\s*—\s*([\s\S]+?)\n\*\*How It Should Act\*\*/);
        const howItShouldActMatch = explanationBuffer.match(/\*\*How It Should Act\*\*\s*—\s*([\s\S]+)$/);

        // Use title from backend if not updating, otherwise use previous title
        const title = titleForUpdate || data.title || "";

        currentSections = {
          ...(currentSections || {}),
          ...(title ? { title: title } : {}),
          ...(controlExplanationMatch ? { controlExplanation: controlExplanationMatch[1].trim() } : {}),
          ...(featuresMatch ? { features: featuresMatch[1].trim() } : {}),
          ...(controlsMatch ? { controls: controlsMatch[1].trim() } : {}),
          ...(howItShouldActMatch ? { howItShouldAct: howItShouldActMatch[1].trim() } : {}),
          version: version
        };

        setScriptSessions(prev => {
          const updated = [...prev];
          const idx = updated.findIndex(s => s.id === sessionId);
          if (idx !== -1) {
            updated[idx] = {
              ...updated[idx],
              sections: { ...currentSections },
              status: "typewriting",
              explanationText: explanationBuffer,
              typewriterDone: false,
              version: version
            };
          }
          return updated;
        });

        resolve({ sessionId, explanationBuffer, currentSections });
      } catch (err) {
        setScriptSessions(prev => {
          let updated = [...prev];
          let idx = updated.findIndex(s => s.id === sessionId);
          if (idx !== -1) {
            updated[idx] = {
              ...updated[idx],
              status: "error"
            };
          }
          return updated;
        });
        setCodeDrawer(prev => ({
          ...prev,
          liveGenerating: false,
          liveContent: ""
        }));
        reject(new Error("Streaming error. Please try again."));
      }
    });
  };

  // --- After typewriter effect, generate code and show loading bar ---
  useEffect(() => {
    // Find the latest session that is typewriterDone but not yet "done" and not already loading code
    const session = scriptSessions.find(
      (s) => s.status === "typewriting" && s.typewriterDone === true && !s.sections.code
    );
    if (!session) return;
    const sessionId = session.id;
    const userPrompt = session.prompt;
    const conversation = scriptSessions
      .slice(-10)
      .map(s => ({
        role: "assistant",
        content: s.sections.code || s.sections.title || ""
      }));
    const explanationBuffer = session.explanationText;

    // Show loading bar for this session
    setCodeLoadingSessionId(sessionId);
    setIsCodeLoading(true);
    setCodeReady(false);

    let cancelled = false;
    async function fetchCode() {
      try {
        let jwt = await getJWT();
        const codeRes = await fetch(`${API_BASE}/api/generate-code`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${jwt}`
          },
          body: JSON.stringify({
            prompt: userPrompt,
            conversation: conversation,
            explanation: explanationBuffer
          })
        });

        if (!codeRes.ok) {
          setIsCodeLoading(false);
          throw new Error("Failed to generate code block");
        }
        const codeData = await codeRes.json();
        const codeBlock = codeData.code || "";

        // Parse out code (strip markdown)
        let code = codeBlock;
        const codeMatch = codeBlock.match(/```lua\s*([\s\S]*?)```/i);
        if (codeMatch) code = codeMatch[1].trim();

        setScriptSessions(prev => {
          const updated = [...prev];
          const idx = updated.findIndex(s => s.id === sessionId);
          if (idx !== -1) {
            updated[idx] = {
              ...updated[idx],
              sections: { ...updated[idx].sections, code },
              status: "done"
            };
          }
          return updated;
        });

        setIsCodeLoading(false);
        setCodeReady(true);

        // Open code drawer
        setTimeout(() => {
          setCodeDrawer(prev => ({
            ...prev,
            open: true,
            code: code,
            title: session.sections.title || "Script Code",
            version: session.sections.version ? `v${session.sections.version}` : "v1",
            liveGenerating: false,
            liveContent: ""
          }));
        }, 400); // Give a short delay for the bar to fill
      } catch (err) {
        setIsCodeLoading(false);
        setCodeReady(false);
        setScriptSessions(prev => {
          let updated = [...prev];
          let idx = updated.findIndex(s => s.id === sessionId);
          if (idx !== -1) {
            updated[idx] = {
              ...updated[idx],
              status: "error"
            };
          }
          return updated;
        });
        setCodeDrawer(prev => ({
          ...prev,
          liveGenerating: false,
          liveContent: ""
        }));
      }
    }
    fetchCode();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line
  }, [scriptSessions]);

  // --- Chat Submission ---
  const handlePromptChange = (e) => {
    setPrompt(e.target.value);
  };

  const handlePromptAutocomplete = (suggestion) => {
    setPrompt(suggestion);
    setPromptAutocomplete([]);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (
      isGenerating ||
      !prompt.trim() ||
      tokens === 0 ||
      tokens === null ||
      tokens === undefined ||
      tokensLoading ||
      prompt.length > 800
    ) {
      return;
    }
    if (!user) {
      alert("Sign in to generate scripts and use tokens.");
      return;
    }
    setIsGenerating(true);
    try {
      // Consume a token
      const ok = await consumeToken();
      if (!ok) {
        setPromptError("You have no tokens left.");
        setIsGenerating(false);
        return;
      }
      // Add to prompt history
      setPromptHistory((prev) => {
        const updated = [prompt, ...prev.filter((p) => p !== prompt)];
        return updated.slice(0, 20);
      });
      // Conversational memory: last 10 script sessions
      const conversation = scriptSessions
        .slice(-10)
        .map(s => ({
          role: "assistant",
          content: s.sections.code || s.sections.title || ""
        }));
      await generateAIResponse(prompt, settings, conversation);
      setPrompt("");
    } catch (err) {
      setPromptError("Failed to generate script. Please try again.");
    }
    setIsGenerating(false);
  };

  // --- Clear Chat ---
  const handleClearChat = () => {
    setScriptSessions([]);
    setPrompt("");
  };

  // --- Handler for opening code drawer from ScriptLoadingBarContainer ---
  const handleViewScript = (session) => {
    setCodeDrawer({
      open: true,
      code: session.sections.code || "",
      title: session.sections.title || "Script Code",
      version: session.sections.version ? `v${session.sections.version}` : "v1",
      liveGenerating: false,
      liveContent: ""
    });
  };

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
          handleClearChat={handleClearChat}
          setPrompt={setPrompt}
          savedScripts={[]} // No scripts
          handleUpdateScriptTitle={() => {}}
          handleDeleteScript={() => {}}
          folders={[]} setFolders={() => {}} selectedFolder={"all"} setSelectedFolder={() => {}}
          tags={[]} setTags={() => {}} selectedTag={"all"} setSelectedTag={() => {}}
          openVersionHistory={() => {}} setShowAddFolderModal={() => {}} setShowAddTagModal={() => {}}
          promptSearch={""} setPromptSearch={() => {}}
        />
      </aside>

      {/* Main Content */}
      <main className="flex-grow flex flex-col md:flex-row relative">
        {/* Main chat area */}
        <section className="flex-grow flex flex-col md:w-2/3 h-full relative z-10">
          <div className="flex-grow overflow-y-auto px-2 md:px-4 py-6 flex flex-col items-center">
  {/* --- Script Title Above All Scripts --- */}
  {scriptSessions.length > 0 && scriptSessions[0].sections.title && (
    <div className="w-full flex justify-center mb-8">
      <span className="font-bold text-2xl text-[#00f5d4] text-center">
        {scriptSessions[0].sections.title}
      </span>
      {scriptSessions[0].sections.version && (
        <span className="ml-3 text-base text-gray-400 font-bold self-end pb-1">
          v{scriptSessions[0].sections.version}
        </span>
      )}
    </div>
  )}
  <div className="w-full max-w-2xl mx-auto space-y-6">
    {scriptSessions.length === 0 && !isGenerating ? (
      <WelcomeCard
        setPrompt={setPrompt}
        promptTemplates={[]} // No templates
        userPromptTemplates={[]} // No user templates
        setShowPromptTemplateModal={() => {}}
        promptSuggestions={[]} promptSuggestionLoading={false}
      />
    ) : (
      scriptSessions.map((session, idx) => (
        <div key={session.id} className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-bold text-lg text-[#00f5d4]">
              {/* Use the script title from backend, fallback to Script N */}
              {session.sections.title
                ? session.sections.title
                : `Script ${idx + 1}`}
            </span>
            {session.sections.version && (
              <span className="ml-2 text-xs text-gray-400 font-bold">
                v{session.sections.version}
              </span>
            )}
            {session.status === "thinking" && (
              <Loader className="h-4 w-4 text-[#9b5de5] animate-spin ml-2" />
            )}
          </div>
                    <div className="bg-gray-900/60 rounded-lg p-4 border border-gray-800">
                      {session.status === "thinking" && (
                        <div className="text-gray-400 text-sm flex items-center gap-2">
                          <ThinkingDots className="text-[#9b5de5] font-mono" />
                        </div>
                      )}
                      {(session.status === "typewriting" || session.status === "done") && (
                        <div>
                          <div className="text-gray-200 text-sm whitespace-pre-line mb-3">
                            {session.status === "typewriting" ? (
                              <Typewriter
                                text={session.explanationText}
                                speed={14}
                                className="text-gray-200 text-sm whitespace-pre-line"
                                onDone={() => {
                                  setScriptSessions(prev => {
                                    const updated = [...prev];
                                    const idx = updated.findIndex(s => s.id === session.id);
                                    if (idx !== -1) {
                                      updated[idx] = {
                                        ...updated[idx],
                                        typewriterDone: true
                                      };
                                    }
                                    return updated;
                                  });
                                }}
                              />
                            ) : (
                              session.explanationText
                            )}
                          </div>
                          {session.status === "done" && (
                            <>
                              {session.sections.controlExplanation && (
                                <div className="mb-3">
                                  <div className="font-bold text-[#9b5de5] mb-1">Controls Explanation</div>
                                  <div className="text-gray-200 whitespace-pre-line text-sm">
                                    {session.sections.controlExplanation}
                                  </div>
                                </div>
                              )}
                              {session.sections.features && (
                                <div className="mb-3">
                                  <div className="font-bold text-[#00f5d4] mb-1">Features</div>
                                  <div className="text-gray-200 whitespace-pre-line text-sm">
                                    {session.sections.features}
                                  </div>
                                </div>
                              )}
                              {session.sections.controls && (
                                <div className="mb-3">
                                  <div className="font-bold text-[#9b5de5] mb-1">Controls</div>
                                  <div className="text-gray-200 whitespace-pre-line text-sm">
                                    {session.sections.controls}
                                  </div>
                                </div>
                              )}
                              {session.sections.howItShouldAct && (
                                <div className="mb-3">
                                  <div className="font-bold text-[#00f5d4] mb-1">How It Should Act</div>
                                  <div className="text-gray-200 whitespace-pre-line text-sm">
                                    {session.sections.howItShouldAct}
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                      {session.status === "error" && (
                        <div className="text-red-400 text-sm mt-2">
                          Error generating script. Please try again.
                        </div>
                      )}
                    </div>
                    {/* Code Loading Bar appears under the chat tab when code is being generated for this session */}
                    {codeLoadingSessionId === session.id && (isCodeLoading || codeReady) && (
                      <ScriptLoadingBarContainer
                        filename={
                          session.sections?.title
                            ? sanitizeFilename(session.sections.title)
                            : "Script.lua"
                        }
                        version={session.sections?.version ? `v${session.sections.version}` : "v1"}
                        language="lua"
                        loading={isCodeLoading}
                        codeReady={codeReady}
                        estimatedLines={
                          session.sections?.code
                            ? session.sections.code.split("\n").length
                            : null
                        }
                        onSave={() => {
                          if (session.sections?.code) {
                            const blob = new Blob([session.sections.code], { type: "text/plain" });
                            const a = document.createElement("a");
                            a.href = URL.createObjectURL(blob);
                            a.download =
                              session.sections?.title
                                ? sanitizeFilename(session.sections.title)
                                : "Script.lua";
                            document.body.appendChild(a);
                            a.click();
                            setTimeout(() => {
                              document.body.removeChild(a);
                              URL.revokeObjectURL(a.href);
                            }, 100);
                          }
                        }}
                        saved={false}
                        onView={() => handleViewScript(session)}
                      />
                    )}
                  </div>
                ))
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
                  onChange={handlePromptChange}
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
                        onClick={() => handlePromptAutocomplete(sugg)}
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
            messages={scriptSessions}
            setPrompt={setPrompt}
            userPromptTemplates={[]} setUserPromptTemplates={() => {}}
            setShowPromptTemplateModal={() => {}}
            promptSuggestions={[]} promptSuggestionLoading={false}
          />
        </aside>
      </main>
      {/* --- Code Drawer Integration --- */}
      {codeDrawer.open && (
        <SimpleCodeDrawer
          open={codeDrawer.open}
          code={codeDrawer.code}
          title={codeDrawer.title}
          liveGenerating={codeDrawer.liveGenerating}
          liveContent={codeDrawer.liveContent}
          version={codeDrawer.version}
          onClose={() => setCodeDrawer({ open: false, code: "", title: "", version: null, liveGenerating: false, liveContent: "" })}
        />
      )}
      {/* Footer */}
      <footer className="border-t border-gray-800 py-4 px-4 bg-black/40 text-center text-sm text-gray-500">
        <div className="max-w-6xl mx-auto">
          NexusRBX AI Console • &copy; 2023 NexusRBX. All rights reserved.
        </div>
      </footer>
    </div>
  );
}