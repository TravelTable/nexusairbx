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

// --- JWT Auth Helpers ---
function getJWT() {
  return localStorage.getItem("jwt_token");
}
function setJWT(token) {
  localStorage.setItem("jwt_token", token);
}
function removeJWT() {
  localStorage.removeItem("jwt_token");
}

// --- Main Container Component ---
export default function NexusRBXAIPageContainer() {
  const navigate = useNavigate();

  // --- State for script sessions (each script = one prompt/response group) ---
  const [scriptSessions, setScriptSessions] = useState([]); // [{id, prompt, sections, status}]
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

  // --- Saved Scripts, Folders, Tags ---
useEffect(() => {
  if (!user) return;
  const fetchScripts = async () => {
    try {
      const jwt = getJWT();
      const res = await fetch(`/api/scripts`, {
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
    fetch("https://nexusrbx-backend-production.up.railway.app/api/prompt-templates")
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
    fetch("https://nexusrbx-backend-production.up.railway.app/api/prompt-templates")
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

  // --- SSE Streaming AI Response (per script session) ---
  const generateAIResponse = async (userPrompt, userSettings, conversation = []) => {
    return new Promise(async (resolve, reject) => {
      let jwt = getJWT();
      if (!jwt) {
        reject(new Error("Not authenticated."));
        return;
      }
      let sessionId = Date.now() + Math.floor(Math.random() * 10000);
      let newSession = {
        id: sessionId,
        prompt: userPrompt,
        sections: {},
        status: "generating"
      };
      setScriptSessions(prev => [...prev, newSession]);
      let sessionIndex = null;

      // Open SSE connection
      try {
        const response = await fetch("/api/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${jwt}`
          },
          body: JSON.stringify({
            prompt: userPrompt,
            modelVersion: userSettings.modelVersion,
            creativity: userSettings.creativity,
            codeStyle: userSettings.codeStyle,
            conversation: conversation
          })
        });

        if (!response.body) {
          reject(new Error("Streaming not supported."));
          return;
        }

        const reader = response.body.getReader();
        let decoder = new TextDecoder();
        let done = false;
        let currentSections = {};
        let codeStarted = false;
        let codeLive = "";
        let codeTitle = "";
        let codeVersion = null;

        // For code drawer: open only when code section starts
        let codeDrawerOpened = false;

        while (!done) {
          const { value, done: doneReading } = await reader.read();
          if (doneReading) break;
          const chunk = decoder.decode(value, { stream: true });
          // Parse SSE lines
          const lines = chunk.split("\n\n");
          for (let line of lines) {
            if (line.startsWith("data:")) {
              try {
                const data = JSON.parse(line.replace(/^data:\s*/, ""));
                if (data.section) {
                  // Find session index
                  if (sessionIndex === null) {
                    sessionIndex = scriptSessions.length;
                  }
                  // Update section in session
                  currentSections = { ...currentSections, [data.section]: data.content };
                  // If version is present, store it
                  if (data.version) {
                    currentSections.version = data.version;
                  }
                  // If title is present, store it for code drawer
                  if (data.section === "title") {
                    codeTitle = data.content;
                  }
                  // If code section, stream code live
                  if (data.section === "code") {
                    codeStarted = true;
                    codeLive = data.content;
                    codeVersion = data.version || currentSections.version || 1;
                    // Open code drawer if not already open
                    if (!codeDrawerOpened) {
                      setCodeDrawer({
                        open: true,
                        code: "",
                        title: codeTitle,
                        version: codeVersion,
                        liveGenerating: true,
                        liveContent: codeLive
                      });
                      codeDrawerOpened = true;
                    } else {
                      setCodeDrawer(prev => ({
                        ...prev,
                        open: true,
                        title: codeTitle,
                        version: codeVersion,
                        liveGenerating: true,
                        liveContent: codeLive
                      }));
                    }
                  }
                  // Update session in state
                  setScriptSessions(prev => {
                    let updated = [...prev];
                    let idx = updated.findIndex(s => s.id === sessionId);
                    if (idx !== -1) {
                      updated[idx] = {
                        ...updated[idx],
                        sections: { ...currentSections },
                        status: "generating"
                      };
                    }
                    return updated;
                  });
                }
                // Handle end of stream
                if (data === "[DONE]") {
                  done = true;
                  break;
                }
              } catch {}
            }
          }
        }
        // Finalize session
        setScriptSessions(prev => {
          let updated = [...prev];
          let idx = updated.findIndex(s => s.id === sessionId);
          if (idx !== -1) {
            updated[idx] = {
              ...updated[idx],
              sections: { ...currentSections },
              status: "done"
            };
          }
          return updated;
        });
        // Finalize code drawer
        setCodeDrawer(prev => ({
          ...prev,
          open: true,
          code: codeLive,
          title: codeTitle,
          version: codeVersion,
          liveGenerating: false,
          liveContent: ""
        }));
        resolve();
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

  // --- Chat Submission ---
  const handlePromptChange = (e) => {
    setPrompt(e.target.value);
  };

  const handlePromptAutocomplete = (suggestion) => {
    setPrompt(suggestion);
    setPromptAutocomplete([]);
  };

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

    const tokenConsumed = await consumeToken();
    if (!tokenConsumed) {
      alert("Unable to consume a token. Please try again.");
      return;
    }

    setPrompt("");
    setIsGenerating(true);

    // Conversational memory: last 10 script sessions
    const conversation = scriptSessions
      .slice(-10)
      .map(s => ({
        role: "assistant",
        content: s.sections.code || s.sections.title || ""
      }));

    try {
      await generateAIResponse(
        prompt,
        settings,
        conversation
      );
    } catch (err) {
      // Error already handled in generateAIResponse
    } finally {
      setIsGenerating(false);
    }
  };

  // --- Scroll to bottom on new script session ---
  const messagesEndRef = useRef(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [scriptSessions, isGenerating]);

  // --- Save Script (with folder/tag/version support) ---
  const handleSaveScript = async (title, code, baseScript = null, folder = null, tagsArr = []) => {
  if (!user || !code) return;

  let baseTitle = title || `Script ${savedScripts.length + 1}`;
  let version = 1;

  // If editing an existing script, increment version in title
  if (baseScript) {
    const titleMatch = baseScript.title.match(/(.+?)(?: v(\d+))?$/i);
    if (titleMatch) {
      baseTitle = titleMatch[1].trim();
      version = titleMatch[2] ? parseInt(titleMatch[2], 10) + 1 : 2;
    }
  }

  // Prompt for folder and tags if not provided
  let finalFolder = folder;
  let finalTags = tagsArr;

  if (!folder) {
    finalFolder = window.prompt("Enter folder name for this script (optional):", "");
    if (finalFolder === null) finalFolder = ""; // Cancel = blank
  }
  if (!tagsArr || tagsArr.length === 0) {
    const tagStr = window.prompt("Enter tags for this script (comma separated, optional):", "");
    if (tagStr !== null && tagStr.trim() !== "") {
      finalTags = tagStr.split(",").map(t => t.trim()).filter(Boolean);
    } else {
      finalTags = [];
    }
  }

  const newScript = {
    title: baseScript ? `${baseTitle} v${version}` : baseTitle,
    description: "",
    code: code,
    language: "lua",
    baseScriptId: baseScript ? baseScript.id : null,
    version: version,
    folder: finalFolder || null,
    tags: finalTags || []
  };
  try {
    const jwt = getJWT();
    const res = await fetch("https://nexusrbx-backend-production.up.railway.app/api/scripts", {
    
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${jwt}`
      },
      body: JSON.stringify(newScript)
    });
    if (!res.ok) throw new Error("Failed to save script");
    const saved = await res.json();
    setSavedScripts((prev) => [saved, ...prev]);
    alert("Script saved!");
  } catch (err) {
    setSavedScripts((prev) => [{ ...newScript, id: Date.now() }, ...prev]);
    alert("Script saved locally (offline mode).");
  }
};

  // --- Update Script Title ---
const handleUpdateScriptTitle = async (scriptId, newTitle) => {
  setSavedScripts((prev) =>
    prev.map((script) => (script.id === scriptId ? { ...script, title: newTitle } : script))
  );
  if (!user) return;
  try {
    const jwt = getJWT();
    await fetch(`/api/scripts/${scriptId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${jwt}`
      },
      body: JSON.stringify({ title: newTitle })
    });
  } catch (err) {}
};
  // --- Delete Script ---
const handleDeleteScript = async (scriptId) => {
  setSavedScripts((prev) => prev.filter((script) => script.id !== scriptId));
  if (!user) return;
  try {
    const jwt = getJWT();
    await fetch(`/api/scripts/${scriptId}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${jwt}`
      }
    });
  } catch (err) {}
};

  // --- Favorite/Unfavorite Script ---
const handleFavoriteScript = async (scriptId, favorite) => {
  setSavedScripts((prev) =>
    prev.map((script) =>
      script.id === scriptId ? { ...script, favorite } : script
    )
  );
  try {
    const jwt = getJWT();
    await fetch(`/api/scripts/${scriptId}/favorite`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${jwt}`
      },
      body: JSON.stringify({ favorite })
    });
  } catch (err) {}
};

  // --- Tag Script ---
const handleTagScript = async (scriptId, tags) => {
  setSavedScripts((prev) =>
    prev.map((script) =>
      script.id === scriptId ? { ...script, tags } : script
    )
  );
  try {
    const jwt = getJWT();
    await fetch(`/api/scripts/${scriptId}/tags`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${jwt}`
      },
      body: JSON.stringify({ tags })
    });
  } catch (err) {}
};

  // --- Clear Chat ---
  const handleClearChat = () => {
    setScriptSessions([]);
    setPrompt("");
  };

  // --- Copy Code ---
  const handleCopyCode = (code, index) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // --- In-Chat Actions ---
  const handleImproveScript = async (code) => {
    setShowImprovedModal(true);
    setImprovedScriptContent("Improving script...");
    try {
      const res = await fetch("https://nexusrbx-backend-production.up.railway.app/api/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script: code })
      });
      const data = await res.json();
      setImprovedScriptContent(data.improved || "No improvement found.");
    } catch {
      setImprovedScriptContent("Failed to improve script.");
    }
  };

  const handleExplainScript = async (code) => {
    setShowExplainModal(true);
    setExplainContent("Explaining script...");
    try {
      const res = await fetch("https://nexusrbx-backend-production.up.railway.app/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script: code })
      });
      const data = await res.json();
      setExplainContent(data.explanation || "No explanation found.");
    } catch {
      setExplainContent("Failed to explain script.");
    }
  };

  const handleLintScript = async (code, msgId) => {
    setShowLintModal(true);
    setLintContent("Linting script...");
    try {
      const res = await fetch("https://nexusrbx-backend-production.up.railway.app/api/lint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script: code })
      });
      const data = await res.json();
      setLintContent(data.lint || "No linting issues found.");
      setLintState((prev) => ({
        ...prev,
        [msgId]: data
      }));
    } catch {
      setLintContent("Failed to lint script.");
    }
  };

  const handleFeedback = (msgId) => {
    setShowFeedbackModal(true);
    setFeedbackMsgId(msgId);
  };

  const submitFeedback = async (rating, feedback) => {
    setFeedbackState((prev) => ({
      ...prev,
      [feedbackMsgId]: { rating, feedback }
    }));
    setShowFeedbackModal(false);
    setFeedbackMsgId(null);
    try {
      await fetch("https://nexusrbx-backend-production.up.railway.app/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scriptId: feedbackMsgId,
          rating,
          feedback
        })
      });
    } catch {}
  };

  // --- Script Version History Modal ---
const openVersionHistory = async (script) => {
  if (!script) return;
  setVersionModalScript(script);
  setVersionModalVersions([]);
  setShowVersionModal(true);
  try {
    const jwt = getJWT();
    const res = await fetch(`/api/scripts/${script.baseScriptId}/versions`, {
      headers: {
        "Authorization": `Bearer ${jwt}`
      }
    });
    if (!res.ok) throw new Error("Failed to fetch versions");
    const versions = await res.json();
    setVersionModalVersions(versions.sort((a, b) => (b.version || 1) - (a.version || 1)));
  } catch (err) {
    setVersionModalVersions([]);
  }
};

  // --- Copy to Roblox Studio Modal ---
  const openStudioModal = (code) => {
    setStudioModalCode(code);
    setShowStudioModal(true);
  };

  // --- Add Folder/Tag Modal ---
  const handleAddFolder = () => {
    if (newFolderName && !folders.includes(newFolderName)) {
      setFolders(prev => [...prev, newFolderName]);
      setNewFolderName("");
      setShowAddFolderModal(false);
    }
  };
  const handleAddTag = () => {
    if (newTagName && !tags.includes(newTagName)) {
      setTags(prev => [...prev, newTagName]);
      setNewTagName("");
      setShowAddTagModal(false);
    }
  };

  // --- Add Prompt Template Modal ---
  const handleAddPromptTemplate = () => {
    if (newPromptTemplate && !userPromptTemplates.includes(newPromptTemplate)) {
      setUserPromptTemplates(prev => [newPromptTemplate, ...prev]);
      setNewPromptTemplate("");
      setShowPromptTemplateModal(false);
    }
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
          savedScripts={savedScripts}
          handleUpdateScriptTitle={handleUpdateScriptTitle}
          handleDeleteScript={handleDeleteScript}
          folders={folders}
          setFolders={setFolders}
          selectedFolder={selectedFolder}
          setSelectedFolder={setSelectedFolder}
          tags={tags}
          setTags={setTags}
          selectedTag={selectedTag}
          setSelectedTag={setSelectedTag}
          openVersionHistory={openVersionHistory}
          setShowAddFolderModal={setShowAddFolderModal}
          setShowAddTagModal={setShowAddTagModal}
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
                scriptSessions.map((session, idx) => (
                  <div key={session.id} className="mb-6">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-bold text-lg text-[#00f5d4]">
                        {session.sections.title
                          ? session.sections.title.replace(/\s*v\d+$/i, "")
                          : `Script ${idx + 1}`}
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
