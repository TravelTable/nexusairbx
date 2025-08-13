import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Send,
  Loader,
  Menu,
  Settings,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
} from "lucide-react";
import { auth, db } from "./firebase";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import SidebarContent from "../components/SidebarContent";
import RightSidebar from "../components/RightSidebar";
import Modal from "../components/Modal";
import FeedbackModal from "../components/FeedbackModal";
import SimpleCodeDrawer from "../components/CodeDrawer";
import ScriptLoadingBarContainer from "../components/ScriptLoadingBarContainer";
import WelcomeCard from "../components/WelcomeCard";
import TokenBar from "../components/TokenBar";
import CelebrationAnimation from "../components/CelebrationAnimation";
import PersistentTypewriterExplanation from "../components/PersistentTypewriterExplanation";

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

// --- Typewriter Effect for Explanation Only ---
function useTypewriterWords(text, speed = 40, enabled = true) {
  const [displayed, setDisplayed] = useState("");
  const words = text ? text.split(" ") : [];
  const indexRef = useRef(0);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (!enabled) {
      setDisplayed(text || "");
      return;
    }
    setDisplayed("");
    indexRef.current = 0;
    if (!text) return;

    function type() {
      if (indexRef.current < words.length) {
        setDisplayed((prev) =>
          prev
            ? prev + " " + words[indexRef.current]
            : words[indexRef.current]
        );
        indexRef.current += 1;
        timeoutRef.current = setTimeout(type, speed);
      }
    }
    type();

    return () => {
      clearTimeout(timeoutRef.current);
    };
  }, [text, speed, enabled]);

  return displayed;
}

// --- Gravatar Helper ---
function getGravatarUrl(email, size = 40) {
  if (!email) return null;
  // Simple synchronous hash for demo (not real MD5)
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
  const [sidebarOpen, setSidebarOpen] = useState(false); // legacy, not used for mobile
  const [activeTab, setActiveTab] = useState("chat"); // chat | saved | chats
  const [prompt, setPrompt] = useState("");
  const [promptCharCount, setPromptCharCount] = useState(0);
  const [promptError, setPromptError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState("idle"); // idle | title | explanation | code | done
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

  // --- Mobile Sidebar State ---
  const [mobileLeftSidebarOpen, setMobileLeftSidebarOpen] = useState(false);
  const [mobileRightSidebarOpen, setMobileRightSidebarOpen] = useState(false);

  // --- Typewriter Animation State ---
  const [animatedScriptIds, setAnimatedScriptIds] = useState({}); // { [scriptId]: true }

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

  // --- Always create a new chat on AI page load ---
  useEffect(() => {
    if (!user) return;
    let unsub = null;
    let created = false;
    const createFreshChat = async () => {
      // Create a new chat and set as current, but leave the title as empty string for now
      const chatDoc = await addDoc(getChatsCollectionRef(user.uid), {
        title: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setCurrentChatId(chatDoc.id);
      created = true;
    };
    createFreshChat();
    // Don't auto-select any previous chat
    return () => {
      if (unsub) unsub();
    };
    // eslint-disable-next-line
  }, [user]);

// --- Load Scripts from Backend ---
useEffect(() => {
  if (!user) {
    setChats([]);
    setCurrentChatId(null);
    return;
  }
  user.getIdToken().then((idToken) => {
    fetch(`${BACKEND_URL}/api/scripts`, {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.scripts)) {
          setChats(data.scripts.map(script => ({
            id: script.id,
            title: script.title,
            createdAt: script.createdAt,
            updatedAt: script.updatedAt,
            latestVersion: script.latestVersion,
          })));
        }
      });
  });
}, [user]);

// --- Load Versions for Current Script from Backend ---
useEffect(() => {
  if (!user || !currentChatId) {
    setScripts([]);
    setCurrentScript(null);
    setVersionHistory([]);
    setSelectedVersion(null);
    return;
  }
  user.getIdToken().then((idToken) => {
    fetch(`${BACKEND_URL}/api/scripts/${currentChatId}/versions`, {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.versions)) {
          setScripts([
            {
              id: currentChatId,
              title: chats.find(c => c.id === currentChatId)?.title || "",
              versions: data.versions,
              sections: {
                title: data.versions[0]?.title || "",
                code: data.versions[0]?.code || "",
                explanation: data.versions[0]?.explanation || "",
                version: data.versions[0]?.version || 1,
              },
              updatedAt: data.versions[0]?.createdAt || "",
              saved: true,
              status: "done",
            },
          ]);
          setCurrentScript({
            apiId: currentChatId,
            title: data.versions[0]?.title || "",
            versions: data.versions,
          });
          setVersionHistory(data.versions);
          setSelectedVersion(data.versions[0]);
        }
      });
  });
}, [user, currentChatId, chats]);

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
        ...promptHistory,
      ];
      const filtered = allPrompts
        .filter(
          (p) =>
            p.toLowerCase().startsWith(prompt.toLowerCase()) &&
            p.toLowerCase() !== prompt.toLowerCase()
        )
        .slice(0, 5);
      setPromptAutocomplete(filtered);
    } else {
      setPromptAutocomplete([]);
    }
  }, [prompt, promptTemplates, userPromptTemplates, promptHistory]);

  // --- Scroll to bottom on new script or loading bar ---
  const messagesEndRef = useRef(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [scripts, isGenerating, loadingBarVisible]);

  // --- Mobile Sidebar Overlay Logic ---
  const closeAllMobileSidebars = () => {
    setMobileLeftSidebarOpen(false);
    setMobileRightSidebarOpen(false);
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
    setShowCelebration(false);

    // Conversational memory: last 10 scripts in this chat
    const conversation = scripts
      .slice(-10)
      .map((s) => ({
        role: "assistant",
        content: s.sections?.code || s.sections?.title || "",
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
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          prompt,
          conversation,
          model: "gpt-4.1-2025-04-14",
          isNewScript: true,
          previousTitle: "",
        }),
      });

      if (!titleRes.ok) {
        const text = await titleRes.text();
        throw new Error(
          `Failed to generate title: ${titleRes.status} ${titleRes.statusText} - ${text.slice(
            0,
            200
          )}`
        );
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
          updatedAt: new Date().toISOString(),
        });
        newChatId = chatDoc.id;
        setCurrentChatId(chatDoc.id);
      } else {
        // If the current chat exists and its title is empty or "New Chat", update it to the script title
        const chatDocRef = getChatDocRef(user.uid, currentChatId);
        const chatDocSnap = await getDoc(chatDocRef);
        if (chatDocSnap.exists()) {
          const chatData = chatDocSnap.data();
          if (!chatData.title || chatData.title === "" || chatData.title === "New Chat") {
            await updateDoc(chatDocRef, {
              title: scriptTitle,
              updatedAt: new Date().toISOString(),
            });
          }
        }
      }

      // --- 2. Generate Explanation ---
      setGenerationStep("explanation");
      const explanationRes = await fetch(
        `${BACKEND_URL}/api/generate-explanation`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            prompt,
            conversation,
            model: "gpt-4.1-2025-04-14",
          }),
        }
      );

      if (!explanationRes.ok) {
        const text = await explanationRes.text();
        throw new Error(
          `Failed to generate explanation: ${explanationRes.status} ${explanationRes.statusText} - ${text.slice(
            0,
            200
          )}`
        );
      }
      try {
        explanationObj = await explanationRes.json();
      } catch (err) {
        const text = await explanationRes.text();
        throw new Error(
          `Explanation API did not return JSON: ${text.slice(0, 200)}`
        );
      }
      explanation = explanationObj.explanation || "";
      if (!explanation) throw new Error("Failed to generate explanation");

      // --- 3. Save Script with title and explanation (no code yet) ---
      // Use the new chat id if we just created one, otherwise use currentChatId
      const chatIdToUse = newChatId || currentChatId;
      const scriptDocRef = await addDoc(
        getScriptsCollectionRef(user.uid, chatIdToUse),
        {
          prompt,
          sections: {
            title: scriptTitle,
            ...explanationObj,
            code: "",
            version: 1,
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          versions: [],
          saved: false, // Start as unsaved
          status: "generating",
        }
      );
      baseScriptId = scriptDocRef.id;
      version = 1;

      // --- 4. Update Chat updatedAt ---
      await updateDoc(getChatDocRef(user.uid, chatIdToUse), {
        updatedAt: new Date().toISOString(),
      });

      // --- 5. Wait for typewriter effect to finish before generating code ---
      setAnimatedScriptIds((prev) => ({
        ...prev,
        [baseScriptId]: true,
      }));

      // Wait for the typewriter effect to finish (based on word count and speed)
      const wordsCount = (explanationObj.explanation || "").split(" ").length;
      const typewriterSpeed = 30; // ms per word (should match PersistentTypewriterExplanation)
      const typewriterDuration = wordsCount * typewriterSpeed + 500; // add a small buffer

      await new Promise((resolve) => setTimeout(resolve, typewriterDuration));

      // --- 6. Show Loading Bar for Code Generation ---
      setGenerationStep("code");
      setLoadingBarVisible(true);
const generatedFilename =
  (scriptTitle
    ? scriptTitle.replace(/[^a-zA-Z0-9_\- ]/g, "").replace(/\s+/g, "_").slice(0, 40)
    : "Script") + ".lua";

setLoadingBarData({
  filename: generatedFilename,
  version: "v1",
  language: "lua",
  loading: true,
  codeReady: false,
  estimatedLines: null,
  saved: false,
  onSave: () => {},
  onView: () => {},
});

      // --- 7. Generate Code ---
      const codeRes = await fetch(`${BACKEND_URL}/api/generate-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          prompt,
          conversation,
          explanation,
          model: "gpt-4.1-2025-04-14",
        }),
      });

      if (!codeRes.ok) {
        const text = await codeRes.text();
        throw new Error(
          `Failed to generate code: ${codeRes.status} ${codeRes.statusText} - ${text.slice(
            0,
            200
          )}`
        );
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

// --- 7. Save Script (as v1) in backend with code and explanation ---
setGenerationStep("saving");
let scriptApiId = null;
try {
  const scriptRes = await fetch(`${BACKEND_URL}/api/scripts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      title: scriptTitle,
      code,
      explanation,
    }),
  });
  if (!scriptRes.ok) {
    const text = await scriptRes.text();
    throw new Error(
      `Failed to save script to backend: ${scriptRes.status} ${scriptRes.statusText} - ${text.slice(0, 200)}`
    );
  }
  const scriptData = await scriptRes.json();
  scriptApiId = scriptData.scriptId;
  version = scriptData.version || 1;
  setCurrentChatId(scriptApiId); // Set the new script as current chat
} catch (err) {
  alert("Failed to save script to backend.");
  return;
}

// --- 8. Fetch Version History from backend ---
let versions = [];
let scriptApiIdToUse = scriptApiId; // from above
try {
  const versionsRes = await fetch(`${BACKEND_URL}/api/scripts/${scriptApiIdToUse}/versions`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });
  if (versionsRes.ok) {
    const versionsData = await versionsRes.json();
    versions = versionsData.versions || [];
  }
} catch (err) {
  // fallback: keep empty
}
setVersionHistory(
  versions.sort((a, b) => (b.version || 1) - (a.version || 1))
);
setCurrentScript({
  apiId: scriptApiIdToUse,
  title: scriptTitle,
  versions,
});
setSelectedVersion(versions[0]);

setLoadingBarData((prev) => ({
  ...prev,
  loading: false,
  codeReady: true,
  saved: false, // Start as unsaved
  version: `v${version}`,
  filename: generatedFilename,
  onSave: () => {},
  onView: () => {},
}));
      setLoadingBarVisible(false);
      setGenerationStep("done");
      setShowCelebration(true);

      // Mark this script as animated for typewriter effect
      setAnimatedScriptIds((prev) => ({
        ...prev,
        [baseScriptId]: true,
      }));

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

  // --- Save Script (add new version to backend) ---
const handleSaveScript = async (newTitle, code, explanation = "") => {
  if (!user || !code || !currentScript || !currentScript.apiId) return false;
  let scriptApiId = currentScript.apiId;
  let idToken = await user.getIdToken();
  try {
    // Add new version to backend
    const res = await fetch(`${BACKEND_URL}/api/scripts/${scriptApiId}/versions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        code,
        explanation,
      }),
    });
    if (!res.ok) {
      alert("Failed to save version to backend.");
      return false;
    }
    // Refresh version history after saving
    const versionsRes = await fetch(`${BACKEND_URL}/api/scripts/${scriptApiId}/versions`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });
    let versions = [];
    if (versionsRes.ok) {
      const versionsData = await versionsRes.json();
      versions = versionsData.versions || [];
    }
    setCurrentScript((cs) => ({
      ...cs,
      saved: true,
      title: newTitle,
      versions,
    }));
    setVersionHistory(versions);
    alert("Script version saved!");
    return true;
  } catch (err) {
    alert("Failed to save version to backend.");
    return false;
  }
};

// --- Sidebar Version Click Handler ---
const handleVersionView = async (versionObj) => {
  if (!user || !currentScript || !currentScript.apiId || !versionObj?.id) {
    setSelectedVersion(versionObj);
    setCurrentScript((cs) => ({
      ...cs,
      title: versionObj.title,
    }));
    return;
  }
  let idToken = await user.getIdToken();
  try {
    const res = await fetch(`${BACKEND_URL}/api/scripts/${currentScript.apiId}/versions/${versionObj.id}`, {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });
    if (res.ok) {
      const data = await res.json();
      setSelectedVersion(data);
      setCurrentScript((cs) => ({
        ...cs,
        title: data.title || versionObj.title,
      }));
    } else {
      setSelectedVersion(versionObj);
      setCurrentScript((cs) => ({
        ...cs,
        title: versionObj.title,
      }));
    }
  } catch {
    setSelectedVersion(versionObj);
    setCurrentScript((cs) => ({
      ...cs,
      title: versionObj.title,
    }));
  }
};

  // --- Download Handler for Version ---
  const handleVersionDownload = (versionObj) => {
    const blob = new Blob([versionObj.code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    // Sanitize filename
    const filename =
      (versionObj.title || "Script")
        .replace(/[^a-zA-Z0-9_\- ]/g, "")
        .replace(/\s+/g, "_")
        .slice(0, 40) + ".lua";
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

// --- Script Management ---
const handleCreateChat = async (title = "New Script") => {
  if (!user) return;
  let idToken = await user.getIdToken();
  const res = await fetch(`${BACKEND_URL}/api/scripts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      title,
      code: "-- New script",
      explanation: "",
    }),
  });
  if (res.ok) {
    const data = await res.json();
    setCurrentChatId(data.scriptId);
  }
};
  const handleRenameChat = async (chatId, newTitle) => {
    if (!user) return;
    await updateDoc(getChatDocRef(user.uid, chatId), {
      title: newTitle,
      updatedAt: new Date().toISOString(),
    });
  };
const handleDeleteChat = async (chatId) => {
  if (!user) return;
  let idToken = await user.getIdToken();
  await fetch(`${BACKEND_URL}/api/scripts/${chatId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });
  if (currentChatId === chatId) {
    setCurrentChatId(
      chats.length > 1 ? chats.find((c) => c.id !== chatId)?.id : null
    );
  }
};

  // --- AI Avatar (NexusRBX Logo) ---
const NexusRBXAvatar = () => (
  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-lg overflow-hidden">
    <img
      src="/logo.png" // or /logo.jpg
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



  // --- Main Layout ---
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
            isMobile
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
            messages={scripts}
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
              {scripts.length === 0 && !isGenerating ? (
                <WelcomeCard
                  setPrompt={setPrompt}
                  promptTemplates={promptTemplates}
                  userPromptTemplates={userPromptTemplates}
                  promptSuggestions={promptSuggestions}
                  promptSuggestionLoading={promptSuggestionLoading}
                />
              ) : (
                <>
                  {/* Render all scripts as chat bubbles/cards */}
                  {scripts.map((session, idx) => {
                    // Only render if there is actual content
                    const hasContent =
                      session.sections?.title ||
                      session.sections?.explanation ||
                      session.sections?.features ||
                      session.sections?.controls ||
                      session.sections?.howItShouldAct ||
                      session.sections?.code;
                    if (!hasContent) return null;

                    // For every version of this script, render a ScriptLoadingBarContainer
                    const versions = Array.isArray(session.versions)
                      ? session.versions
                      : [];

                    // Typewriter effect only for the latest script (the last in the array)
                    const isLatest = idx === scripts.length - 1;
                    const animateThisScript =
                      !!animatedScriptIds[session.id] && isLatest;

                    // --- User Prompt Bubble (right-aligned) ---
                    return (
                      <div key={session.id} className="space-y-2">
                        {/* User Prompt Bubble */}
                        {session.prompt && (
                          <div className="flex justify-end items-end mb-1">
                            <div className="flex flex-row-reverse items-end gap-2 w-full max-w-2xl">
                              <UserAvatar email={user?.email} />
                              <div className="bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-white px-4 py-2 rounded-2xl rounded-br-sm shadow-lg max-w-[75%] text-right break-words text-base font-medium animate-fade-in">
                                {session.prompt}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* AI Response Card (left-aligned) */}
                        <div className="flex items-start gap-2 w-full max-w-2xl animate-fade-in">
                          <NexusRBXAvatar />
                          <div className="flex-1 bg-gray-900/80 border border-gray-800 rounded-2xl rounded-tl-sm shadow-lg px-5 py-4 mb-2">
                            {/* Title */}
                            {session.sections?.title && (
                              <div className="mb-1 flex items-center gap-2">
                                <span className="text-xl font-bold bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">
                                  {session.sections.title.replace(/\s*v\d+$/i, "")}
                                </span>
                                {versions.length > 0 && (
                                  <span className="ml-2 px-2 py-0.5 rounded bg-[#9b5de5]/20 text-[#9b5de5] text-xs font-semibold">
                                    v{versions[0].version || 1}
                                  </span>
                                )}
                              </div>
                            )}
                            {/* Explanation */}
                            {session.sections?.explanation && (
                              <div className="mb-2">
                                <div className="font-bold text-[#9b5de5] mb-1">
                                  Explanation
                                </div>
                                <div className="text-gray-200 whitespace-pre-line text-base">
                                  <PersistentTypewriterExplanation
                                    text={session.sections.explanation}
                                    speed={30}
                                    scriptId={session.id}
                                    className=""
                                    as="div"
                                  />
                                </div>
                              </div>
                            )}
                            {/* Features/Controls/How It Should Act */}
                            {session.sections?.features && (
                              <div className="mb-2">
                                <div className="font-bold text-[#00f5d4] mb-1">
                                  Features
                                </div>
                                <div className="text-gray-200 whitespace-pre-line text-base">
                                  {session.sections.features}
                                </div>
                              </div>
                            )}
                            {session.sections?.controls && (
                              <div className="mb-2">
                                <div className="font-bold text-[#9b5de5] mb-1">
                                  Controls
                                </div>
                                <div className="text-gray-200 whitespace-pre-line text-base">
                                  {session.sections.controls}
                                </div>
                              </div>
                            )}
                            {session.sections?.howItShouldAct && (
                              <div className="mb-2">
                                <div className="font-bold text-[#00f5d4] mb-1">
                                  How It Should Act
                                </div>
                                <div className="text-gray-200 whitespace-pre-line text-base">
                                  {session.sections.howItShouldAct}
                                </div>
                              </div>
                            )}
                            {/* Error */}
                            {session.status === "error" && (
                              <div className="text-red-400 text-sm mt-2">
                                Error generating script. Please try again.
                              </div>
                            )}
                            {/* Code Block */}
                            {session.sections?.code && (
                              <div className="mb-2 mt-3">
                                <ScriptLoadingBarContainer
  filename={
    (session.sections?.title
      ? session.sections.title.replace(/[^a-zA-Z0-9_\- ]/g, "").replace(/\s+/g, "_").slice(0, 40)
      : "Script") + ".lua"
  }
  version={
    versions[0]?.version
      ? `v${versions[0].version}`
      : "v1"
  }
  language="lua"
  loading={false}
  codeReady={true}
  estimatedLines={
    session.sections.code
      ? session.sections.code.split("\n").length
      : null
  }
  saved={session.saved}
  onSave={() =>
    handleSaveScript(
      session.sections.title,
      session.sections.code
    )
  }
  onView={() =>
    handleVersionView(
      versions[0] || {
        title: session.sections.title,
        code: session.sections.code,
        version: 1,
      }
    )
  }
/>
                              </div>
                            )}
                            {/* Version Controls */}
                            {versions.length > 1 && (
                              <div className="flex gap-2 mt-2">
                                {versions.map((versionObj, vIdx) => (
                                  <button
                                    key={versionObj.version || vIdx}
                                    className={`px-2 py-1 rounded text-xs font-semibold border ${
                                      selectedVersion &&
                                      selectedVersion.version ===
                                        versionObj.version
                                        ? "bg-[#9b5de5] text-white border-[#9b5de5]"
                                        : "bg-gray-800 text-[#9b5de5] border-[#9b5de5]/40"
                                    }`}
                                    onClick={() => handleVersionView(versionObj)}
                                    type="button"
                                  >
                                    v{versionObj.version || vIdx + 1}
                                  </button>
                                ))}
                              </div>
                            )}
                            {/* Timestamp */}
                            <div className="text-xs text-gray-500 mt-2 text-right">
                              {session.updatedAt
                                ? new Date(session.updatedAt).toLocaleString()
                                : ""}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
              {/* Loading bar appears just below the latest script output */}
              {isGenerating && (
                <div className="flex items-center text-gray-400 text-sm mt-2 animate-fade-in">
                  <span className="mr-2">
                    <span className="inline-block w-8 h-8 rounded-full bg-gradient-to-br from-[#9b5de5] to-[#00f5d4] flex items-center justify-center shadow-lg overflow-hidden animate-pulse">
                      <img
                        src="/logo.svg"
                        alt="NexusRBX"
                        className="w-6 h-6 object-contain"
                        style={{ filter: "drop-shadow(0 0 2px #9b5de5)" }}
                      />
                    </span>
                  </span>
                  <span>
                    NexusRBX is typing...
                    {generationStep === "title" && " (Generating script title...)"}
                    {generationStep === "explanation" && " (Generating explanation...)"}
                    {generationStep === "code" && " (Generating code...)"}
                  </span>
                </div>
              )}
{loadingBarVisible && generationStep === "code" && animatedScriptIds[currentScript?.apiId] && (
  <div className="mt-4">
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
      showGradientTitle={false}
    />
  </div>
)}
{/* Persist the loading bar after code is ready */}
{!loadingBarVisible && loadingBarData.codeReady && animatedScriptIds[currentScript?.apiId] && (
  <div className="mt-4">
    <ScriptLoadingBarContainer
      filename={loadingBarData.filename}
      version={loadingBarData.version}
      language={loadingBarData.language}
      loading={false}
      codeReady={true}
      estimatedLines={loadingBarData.estimatedLines}
      saved={loadingBarData.saved}
      onSave={loadingBarData.onSave}
      onView={loadingBarData.onView}
      showGradientTitle={false}
    />
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
  onChange={(e) => setPrompt(e.target.value)}
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
                <TokenBar
                  tokens={tokens}
                  tokensLoading={tokensLoading}
                  refreshCountdown={refreshCountdown}
                  isDev={isDev}
                />
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
            maxHeight: "calc(100vh - 64px)",
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
      {/* --- Code Drawer Integration --- */}
      {selectedVersion && (
<SimpleCodeDrawer
  open={!!selectedVersion}
  code={selectedVersion.code}
  title={selectedVersion.title}
  filename={
    (selectedVersion.title
      ? selectedVersion.title.replace(/[^a-zA-Z0-9_\- ]/g, "").replace(/\s+/g, "_").slice(0, 40)
      : "Script") + ".lua"
  }
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
