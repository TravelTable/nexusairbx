import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Send, Loader, Menu, Crown, Sparkles, Code, Star, X, Download, Plus, History, Check, Trash2, Folder, Tag, Search, Circle
} from "lucide-react";
import { auth, db } from "./firebase";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import SidebarContent from "../components/SidebarContent";
import RightSidebar from "../components/RightSidebar";
import Modal from "../components/Modal";
import FeedbackModal from "../components/FeedbackModal";
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

// --- Typewriter Effect Hook ---
function useTypewriterEffect(text, speed = 18) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    if (!text) {
      setDisplayed("");
      return;
    }
    let i = 0;
    setDisplayed("");
    const interval = setInterval(() => {
      setDisplayed((prev) => {
        if (i >= text.length) {
          clearInterval(interval);
          return text;
        }
        const next = text.slice(0, i + 1);
        i++;
        return next;
      });
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);
  return displayed;
}

// --- Main Container Component ---
export default function NexusRBXAIPageContainer() {
  const navigate = useNavigate();

  // --- State for script sessions (each script = one prompt/response group) ---
  const [scriptSessions, setScriptSessions] = useState([]); // [{id, prompt, sections, status, titleLoading, explanationLoading}]
  const [prompt, setPrompt] = useState("");
  const [promptCharCount, setPromptCharCount] = useState(0);
  const [promptError, setPromptError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [savedScripts, setSavedScripts] = useState([]);
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rightSidebarOpen] = useState(false);
  const [settings, setSettings] = useState(defaultSettings);
  const [promptTemplates, setPromptTemplates] = useState([]);
  const [userPromptTemplates, setUserPromptTemplates] = useState([]);
  const [promptAutocomplete, setPromptAutocomplete] = useState([]);
  const [promptHistory, setPromptHistory] = useState([]);
  const [promptSearch, setPromptSearch] = useState("");
  const [feedbackState, setFeedbackState] = useState({});
  const [lintState, setLintState] = useState({});
  const [explainState, setExplainState] = useState({});
  const [improveState, setImproveState] = useState({});
  const [showImprovedModal, setShowImprovedModal] = useState(false);
  const [improvedScriptContent, setImprovedScriptContent] = useState("");
  const [showExplainModal, setShowExplainModal] = useState(false);
  const [explainContent, setExplainContent] = useState("");
  const [showLintModal, setShowLintModal] = useState(false);
  const [lintContent, setLintContent] = useState("");
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackMsgId, setFeedbackMsgId] = useState(null);
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState("all");
  const [tags, setTags] = useState([]);
  const [selectedTag, setSelectedTag] = useState("all");
  const [scriptVersionHistory, setScriptVersionHistory] = useState({});
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [versionModalScript, setVersionModalScript] = useState(null);
  const [versionModalVersions, setVersionModalVersions] = useState([]);
  const [showStudioModal, setShowStudioModal] = useState(false);
  const [studioModalCode, setStudioModalCode] = useState("");
  const [showAddFolderModal, setShowAddFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [showAddTagModal, setShowAddTagModal] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [showPromptTemplateModal, setShowPromptTemplateModal] = useState(false);
  const [newPromptTemplate, setNewPromptTemplate] = useState("");
  const [promptSuggestions, setPromptSuggestions] = useState([]);
  const [codeDrawer, setCodeDrawer] = useState({ open: false, code: "", title: "", version: null, liveGenerating: false, liveContent: "" });
  const [promptSuggestionLoading, setPromptSuggestionLoading] = useState(false);

  // --- Loading bar and code loading state ---
  const [isCodeLoading, setIsCodeLoading] = useState(false);
  const [loadingBarMeta, setLoadingBarMeta] = useState({
    filename: "Script.lua",
    version: "v1.0",
    language: "lua",
    estimatedLines: null,
  });
  const [codeReady, setCodeReady] = useState(false);
  const [scriptSaved, setScriptSaved] = useState(false);

  // --- Ref for scrolling to bottom ---
  const messagesEndRef = useRef(null);
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [scriptSessions, isGenerating, isCodeLoading]);

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
    lastRefresh,
    isDev,
  } = useTokens(user);

  // --- Saved Scripts, Folders, Tags ---
  useEffect(() => {
    if (!user) return;
    const fetchScripts = async () => {
      try {
        const jwt = await getJWT();
        const res = await fetch(`${API_BASE}/api/scripts`, {
          headers: {
            "Authorization": `Bearer ${jwt}`
          }
        });
        if (!res.ok) throw new Error("Failed to fetch scripts");
        const scripts = await res.json();
        const folderSet = new Set();
        const tagSet = new Set();
        scripts.forEach((data) => {
          if (data.folder) folderSet.add(data.folder);
          if (Array.isArray(data.tags)) data.tags.forEach(t => tagSet.add(t));
        });
        setSavedScripts(scripts);
        setFolders(["all", ...Array.from(folderSet)]);
        setTags(["all", ...Array.from(tagSet)]);
      } catch (err) {
        setSavedScripts([]);
      }
    };
    fetchScripts();
    // Only fetch on user change
    // eslint-disable-next-line
  }, [user]);

  // --- Prompt Templates ---
  useEffect(() => {
    fetch(`${API_BASE}/api/prompt-templates`)
      .then(res => res.json())
      .then(data => setPromptTemplates(data.templates || []))
      .catch(() => setPromptTemplates([]));
  }, []);

  // --- User Prompt Templates (localStorage) ---
  useEffect(() => {
    try {
      const stored = localStorage.getItem("userPromptTemplates");
      if (stored) setUserPromptTemplates(JSON.parse(stored));
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("userPromptTemplates", JSON.stringify(userPromptTemplates));
    } catch {}
  }, [userPromptTemplates]);

  // --- Trending Prompt Suggestions (from backend) ---
  useEffect(() => {
    setPromptSuggestionLoading(true);
    fetch(`${API_BASE}/api/prompt-templates`)
      .then(res => res.json())
      .then(data => {
        setPromptSuggestions(data.templates || []);
        setPromptSuggestionLoading(false);
      })
      .catch(() => setPromptSuggestionLoading(false));
  }, []);

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

  // --- Generate Title (NEW) ---
  const generateTitle = async (userPrompt, conversation = []) => {
    try {
      const jwt = await getJWT();
      const res = await fetch(`${API_BASE}/api/generate-title-advanced`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${jwt}`
        },
        body: JSON.stringify({
          prompt: userPrompt,
          conversation: conversation,
          isNewScript: true
        })
      });
      if (!res.ok) throw new Error("Failed to generate title");
      const data = await res.json();
      return data.title || "";
    } catch (err) {
      return "";
    }
  };

  // --- Generate Explanation (NEW, non-streamed) ---
  const generateExplanation = async (userPrompt, conversation = [], model = "gpt-4.1-2025-04-14") => {
    try {
      const jwt = await getJWT();
      const res = await fetch(`${API_BASE}/api/generate-explanation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${jwt}`
        },
        body: JSON.stringify({
          prompt: userPrompt,
          conversation: conversation,
          model: model
        })
      });
      if (!res.ok) throw new Error("Failed to generate explanation");
      const data = await res.json();
      return data; // { title, explanation }
    } catch (err) {
      return { title: "", explanation: "" };
    }
  };

  // --- Generate Code (NEW, non-streamed) ---
  const generateCode = async (userPrompt, conversation = [], explanation = "", model = "gpt-4.1-2025-04-14") => {
    try {
      const jwt = await getJWT();
      const res = await fetch(`${API_BASE}/api/generate-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${jwt}`
        },
        body: JSON.stringify({
          prompt: userPrompt,
          conversation: conversation,
          explanation: explanation,
          model: model
        })
      });
      if (!res.ok) throw new Error("Failed to generate code");
      const data = await res.json();
      return data.code || "";
    } catch (err) {
      return "";
    }
  };

  // --- AI Response Generation: Title -> Explanation -> Code ---
  const generateAIResponse = async (userPrompt, userSettings, conversation = []) => {
    return new Promise(async (resolve, reject) => {
      let sessionId = Date.now() + Math.floor(Math.random() * 10000);

      // 1. Add session with loading spinners for title and explanation
      let newSession = {
        id: sessionId,
        prompt: userPrompt,
        sections: {},
        status: "generating",
        titleLoading: true,
        explanationLoading: true,
        explanationSections: {
          controlExplanation: "",
          features: "",
          controls: "",
          howItShouldAct: ""
        }
      };
      setScriptSessions(prev => [...prev, newSession]);

      // 2. Generate Title
      let title = "";
      try {
        setScriptSessions(prev =>
          prev.map(s =>
            s.id === sessionId ? { ...s, titleLoading: true } : s
          )
        );
        title = await generateTitle(userPrompt, conversation);
        setScriptSessions(prev =>
          prev.map(s =>
            s.id === sessionId
              ? {
                  ...s,
                  sections: { ...s.sections, title },
                  titleLoading: false
                }
              : s
          )
        );
        // Update loading bar meta as soon as we have a title
        if (title) {
          setLoadingBarMeta(meta => ({
            ...meta,
            filename: title.replace(/[^\w\d]/g, "_") + ".lua"
          }));
        }
      } catch {
        setScriptSessions(prev =>
          prev.map(s =>
            s.id === sessionId ? { ...s, titleLoading: false } : s
          )
        );
      }

      // 3. Generate Explanation
      let explanationObj = { title: "", explanation: "" };
      try {
        setScriptSessions(prev =>
          prev.map(s =>
            s.id === sessionId ? { ...s, explanationLoading: true } : s
          )
        );
        explanationObj = await generateExplanation(
          userPrompt,
          conversation,
          userSettings.modelVersion
        );

        // Parse explanationObj.explanation into sections
        let controlExplanation = "";
        let features = "";
        let controls = "";
        let howItShouldAct = "";
        if (explanationObj && explanationObj.explanation) {
          const ceMatch = explanationObj.explanation.match(
            /\*\*Control Explanation Section\*\*\s*—\s*([\s\S]+?)\n\*\*Features\*\*/
          );
          const featuresMatch = explanationObj.explanation.match(
            /\*\*Features\*\*\s*—\s*([\s\S]+?)\n\*\*Controls\*\*/
          );
          const controlsMatch = explanationObj.explanation.match(
            /\*\*Controls\*\*\s*—\s*([\s\S]+?)\n\*\*How It Should Act\*\*/
          );
          const howItShouldActMatch = explanationObj.explanation.match(
            /\*\*How It Should Act\*\*\s*—\s*([\s\S]+)$/
          );

          controlExplanation = ceMatch ? ceMatch[1].trim() : "";
          features = featuresMatch ? featuresMatch[1].trim() : "";
          controls = controlsMatch ? controlsMatch[1].trim() : "";
          howItShouldAct = howItShouldActMatch ? howItShouldActMatch[1].trim() : "";
        }

        setScriptSessions(prev =>
          prev.map(s =>
            s.id === sessionId
              ? {
                  ...s,
                  explanationLoading: false,
                  explanationSections: {
                    controlExplanation,
                    features,
                    controls,
                    howItShouldAct
                  }
                }
              : s
          )
        );
      } catch {
        setScriptSessions(prev =>
          prev.map(s =>
            s.id === sessionId ? { ...s, explanationLoading: false } : s
          )
        );
      }

      // 4. Generate Code
      setIsCodeLoading(true);
      setCodeReady(false);
      let code = "";
      try {
        code = await generateCode(
          userPrompt,
          conversation,
          explanationObj.explanation,
          userSettings.modelVersion
        );
        setScriptSessions(prev =>
          prev.map(s =>
            s.id === sessionId
              ? {
                  ...s,
                  sections: { ...s.sections, code },
                  status: "done"
                }
              : s
          )
        );
      } catch {
        setScriptSessions(prev =>
          prev.map(s =>
            s.id === sessionId
              ? {
                  ...s,
                  status: "error"
                }
              : s
          )
        );
      }
      setIsCodeLoading(false);
      setCodeReady(true);

      // Open code drawer
      setTimeout(() => {
        setCodeDrawer(prev => ({
          ...prev,
          open: true,
          code: code,
          title: title || "Script Code",
          version: null,
          liveGenerating: false,
          liveContent: ""
        }));
      }, 400);

      resolve();
    });
  };

  // --- Save Script from loading bar ---
  const handleSaveFromLoadingBar = () => {
    // Find the latest session with code
    const lastSession = scriptSessions[scriptSessions.length - 1];
    if (lastSession && lastSession.sections && lastSession.sections.code) {
      handleSaveScript(
        loadingBarMeta.filename.replace(/\.lua$/i, ""),
        lastSession.sections.code
      );
      setScriptSaved(true);
      setTimeout(() => setScriptSaved(false), 2000);
    }
  };

  // --- Prompt input change ---
  const handlePromptChange = (e) => {
    setPrompt(e.target.value);
  };

  // --- Prompt autocomplete selection ---
  const handlePromptAutocomplete = (sugg) => {
    setPrompt(sugg);
    setPromptAutocomplete([]);
  };

  // --- Submit prompt ---
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
      await generateAIResponse(prompt, settings, []);
      setPrompt("");
    } catch (err) {
      setPromptError("Failed to generate script. Please try again.");
    }
    setIsGenerating(false);
  };

  // --- Save script to backend ---
  const handleSaveScript = async (title, code) => {
    if (!user) return;
    try {
      const jwt = await getJWT();
      const res = await fetch(`${API_BASE}/api/scripts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${jwt}`
        },
        body: JSON.stringify({
          title,
          code,
          folder: selectedFolder !== "all" ? selectedFolder : null,
          tags: selectedTag !== "all" ? [selectedTag] : [],
        })
      });
      if (res.ok) {
        // Optionally refresh saved scripts
        const scripts = await res.json();
        setSavedScripts(scripts);
      }
    } catch (err) {}
  };

  // --- Add folder ---
  const handleAddFolder = () => {
    if (!newFolderName.trim()) return;
    setFolders((prev) => [...prev, newFolderName.trim()]);
    setNewFolderName("");
    setShowAddFolderModal(false);
  };

  // --- Add tag ---
  const handleAddTag = () => {
    if (!newTagName.trim()) return;
    setTags((prev) => [...prev, newTagName.trim()]);
    setNewTagName("");
    setShowAddTagModal(false);
  };

  // --- Add prompt template ---
  const handleAddPromptTemplate = () => {
    if (!newPromptTemplate.trim()) return;
    setUserPromptTemplates((prev) => [...prev, newPromptTemplate.trim()]);
    setNewPromptTemplate("");
    setShowPromptTemplateModal(false);
  };

  // --- Submit feedback ---
  const submitFeedback = (feedback) => {
    // Implement feedback submission logic here (e.g., send to backend)
    setShowFeedbackModal(false);
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
      {/* ... header code ... */}
      <main className="flex-grow flex flex-col md:flex-row relative">
        {/* Main chat area */}
        <section className="flex-grow flex flex-col md:w-2/3 h-full relative z-10">
          <div className="flex-grow overflow-y-auto px-2 md:px-4 py-6 flex flex-col items-center">
            <div className="w-full max-w-2xl mx-auto space-y-6">
              {scriptSessions.length === 0 && !isGenerating ? (
                <WelcomeCard
                  setPrompt={setPrompt}
                  promptTemplates={promptTemplates}
                  userPromptTemplates={userPromptTemplates}
                  setShowPromptTemplateModal={setShowPromptTemplateModal}
                  promptSuggestions={promptSuggestions}
                  promptSuggestionLoading={promptSuggestionLoading}
                />
              ) : (
                scriptSessions.map((session, idx) => {
                  // Typewriter effects for each section
                  const ceType = useTypewriterEffect(session.explanationSections?.controlExplanation || "", 12);
                  const featuresType = useTypewriterEffect(session.explanationSections?.features || "", 12);
                  const controlsType = useTypewriterEffect(session.explanationSections?.controls || "", 12);
                  const howType = useTypewriterEffect(session.explanationSections?.howItShouldAct || "", 12);

                  return (
                    <div key={session.id} className="mb-6">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-bold text-lg text-[#00f5d4]">
                          {session.titleLoading ? (
                            <span className="flex items-center">
                              <Loader className="h-4 w-4 animate-spin mr-2" />
                              Generating title...
                            </span>
                          ) : session.sections.title && session.sections.title.trim() ? (
                            session.sections.title.replace(/\s*v\d+$/i, "")
                          ) : (
                            `Script ${idx + 1}`
                          )}
                        </span>
                        {session.sections.version && (
                          <span className="ml-2 text-xs text-gray-400 font-bold">
                            v{session.sections.version}
                          </span>
                        )}
                        {session.status === "generating" && (
                          <Loader className="h-4 w-4 text-[#9b5de5] animate-spin ml-2" />
                        )}
                      </div>
                      <div className="bg-gray-900/60 rounded-lg p-4 border border-gray-800">
                        {session.explanationLoading && (
                          <div className="flex items-center text-gray-400 text-sm mb-2">
                            <Loader className="h-4 w-4 animate-spin mr-2" />
                            Generating explanation...
                          </div>
                        )}
                        {session.explanationSections?.controlExplanation && (
                          <div className="mb-3">
                            <div className="font-bold text-[#9b5de5] mb-1">Controls Explanation</div>
                            <div className="text-gray-200 whitespace-pre-line text-sm">
                              {ceType}
                            </div>
                          </div>
                        )}
                        {session.explanationSections?.features && (
                          <div className="mb-3">
                            <div className="font-bold text-[#00f5d4] mb-1">Features</div>
                            <div className="text-gray-200 whitespace-pre-line text-sm">
                              {featuresType}
                            </div>
                          </div>
                        )}
                        {session.explanationSections?.controls && (
                          <div className="mb-3">
                            <div className="font-bold text-[#9b5de5] mb-1">Controls</div>
                            <div className="text-gray-200 whitespace-pre-line text-sm">
                              {controlsType}
                            </div>
                          </div>
                        )}
                        {session.explanationSections?.howItShouldAct && (
                          <div className="mb-3">
                            <div className="font-bold text-[#00f5d4] mb-1">How It Should Act</div>
                            <div className="text-gray-200 whitespace-pre-line text-sm">
                              {howType}
                            </div>
                          </div>
                        )}
                        {session.status === "error" && (
                          <div className="text-red-400 text-sm mt-2">
                            Error generating script. Please try again.
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              {/* Loading Bar appears here */}
              {isCodeLoading && (
                <ScriptLoadingBarContainer
                  filename={loadingBarMeta.filename}
                  version={loadingBarMeta.version}
                  language={loadingBarMeta.language}
                  loading={isCodeLoading}
                  codeReady={codeReady}
                  onSave={handleSaveFromLoadingBar}
                  saved={scriptSaved}
                  estimatedLines={loadingBarMeta.estimatedLines}
                />
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
            userPromptTemplates={userPromptTemplates}
            setUserPromptTemplates={setUserPromptTemplates}
            setShowPromptTemplateModal={setShowPromptTemplateModal}
            promptSuggestions={promptSuggestions}
            promptSuggestionLoading={promptSuggestionLoading}
          />
        </aside>
      </main>
      {/* Modals */}
      {showImprovedModal && (
        <Modal onClose={() => setShowImprovedModal(false)} title="Improved Script">
          <pre className="bg-gray-950 mt-2 p-2 rounded text-xs text-gray-300 overflow-x-auto">
            <code>{improvedScriptContent}</code>
          </pre>
        </Modal>
      )}
      {showExplainModal && (
        <Modal onClose={() => setShowExplainModal(false)} title="Code Explanation">
          <div className="text-gray-200 text-sm whitespace-pre-line">{explainContent}</div>
        </Modal>
      )}
      {showLintModal && (
        <Modal onClose={() => setShowLintModal(false)} title="Lint Results">
          <div className="text-gray-200 text-sm whitespace-pre-line">{lintContent}</div>
        </Modal>
      )}
      {showFeedbackModal && (
        <FeedbackModal
          onClose={() => setShowFeedbackModal(false)}
          onSubmit={submitFeedback}
        />
      )}
      {showVersionModal && (
        <Modal onClose={() => setShowVersionModal(false)} title="Script Version History">
          <div className="space-y-4">
            {versionModalVersions.length === 0 ? (
              <div className="text-gray-400 text-center py-6">
                <Loader className="h-6 w-6 animate-spin mx-auto mb-2" />
                Loading versions...
              </div>
            ) : (
              versionModalVersions.map((ver, idx) => (
                <div key={ver.id} className="border-b border-gray-700 pb-2 mb-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#00f5d4]">
                      {ver.title} {ver.version ? `v${ver.version}` : ""}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(ver.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <pre className="bg-gray-950 mt-2 p-2 rounded text-xs text-gray-300 overflow-x-auto">
                    <code>{ver.code}</code>
                  </pre>
                  <button
                    className="mt-2 px-3 py-1 rounded bg-[#9b5de5]/20 hover:bg-[#9b5de5]/40 text-[#9b5de5] text-xs font-bold"
                    onClick={() => {
                      setPrompt(ver.code);
                      setShowVersionModal(false);
                    }}
                  >
                    Restore this version
                  </button>
                </div>
              ))
            )}
          </div>
        </Modal>
      )}
      {showStudioModal && (
        <Modal onClose={() => setShowStudioModal(false)} title="Copy to Roblox Studio">
          <div className="mb-2 text-gray-200 text-sm">
            <b>How to use in Roblox Studio:</b>
            <ol className="list-decimal ml-5 mt-2 mb-2">
              <li>Open Roblox Studio and your game.</li>
              <li>Press <b>View &gt; Explorer</b> and <b>View &gt; Properties</b>.</li>
              <li>Right-click <b>StarterPlayer &gt; StarterPlayerScripts</b> and select <b>Insert Object &gt; LocalScript</b>.</li>
              <li>Paste the code below into the script editor.</li>
            </ol>
          </div>
          <pre className="bg-gray-950 mt-2 p-2 rounded text-xs text-gray-300 overflow-x-auto">
            <code>{studioModalCode}</code>
          </pre>
          <button
            className="mt-4 w-full py-2 rounded bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-white font-bold"
            onClick={() => {
              navigator.clipboard.writeText(studioModalCode);
              setShowStudioModal(false);
            }}
          >
            Copy Code to Clipboard
          </button>
        </Modal>
      )}
      {showAddFolderModal && (
        <Modal onClose={() => setShowAddFolderModal(false)} title="Add Folder">
          <input
            className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 mb-4 text-white"
            value={newFolderName}
            onChange={e => setNewFolderName(e.target.value)}
            placeholder="Folder name"
          />
          <button
            className="w-full py-3 rounded-lg font-bold bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-white"
            onClick={handleAddFolder}
          >
            Add Folder
          </button>
        </Modal>
      )}
      {showAddTagModal && (
        <Modal onClose={() => setShowAddTagModal(false)} title="Add Tag">
          <input
            className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 mb-4 text-white"
            value={newTagName}
            onChange={e => setNewTagName(e.target.value)}
            placeholder="Tag name"
          />
          <button
            className="w-full py-3 rounded-lg font-bold bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-white"
            onClick={handleAddTag}
          >
            Add Tag
          </button>
        </Modal>
      )}
      {showPromptTemplateModal && (
        <Modal onClose={() => setShowPromptTemplateModal(false)} title="Add Prompt Template">
          <input
            className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 mb-4 text-white"
            value={newPromptTemplate}
            onChange={e => setNewPromptTemplate(e.target.value)}
            placeholder="Prompt template"
          />
          <button
            className="w-full py-3 rounded-lg font-bold bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-white"
            onClick={handleAddPromptTemplate}
          >
            Add Template
          </button>
        </Modal>
      )}
      {/* --- Code Drawer Integration --- */}
      {codeDrawer.open && (
        <SimpleCodeDrawer
          open={codeDrawer.open}
          code={codeDrawer.code}
          title={codeDrawer.title}
          liveGenerating={codeDrawer.liveGenerating}
          liveContent={codeDrawer.liveContent}
          version={codeDrawer.version}
          codeGenProgress={0}
          onClose={() => setCodeDrawer({ open: false, code: "", title: "", version: null, liveGenerating: false, liveContent: "" })}
          onSaveScript={(newTitle, code) => handleSaveScript(newTitle, code)}
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
