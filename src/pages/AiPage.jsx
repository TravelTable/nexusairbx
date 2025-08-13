import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Send,
  Loader,
  Menu,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { auth } from "./firebase";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import SidebarContent from "../components/SidebarContent";
import RightSidebar from "../components/RightSidebar";
import Modal from "../components/Modal";
import FeedbackModal from "../components/FeedbackModal";
import SimpleCodeDrawer from "../components/CodeDrawer";
import ScriptLoadingBarContainer from "../components/ScriptLoadingBarContainer";
import WelcomeCard from "../components/WelcomeCard";
import TokenBar from "../components/TokenBar";
import CelebrationAnimation from "../components/CelebrationAnimation";
import TypewriterEffect from "../components/TypewriterEffect";

// --- Backend API URL ---
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "https://nexusrbx-backend-production.up.railway.app";

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

// --- Main Container Component ---
export default function NexusRBXAIPageContainer() {
  const navigate = useNavigate();

  // --- State for scripts and versions ---
  const [user, setUser] = useState(null);
  const [scripts, setScripts] = useState([]); // [{id, title, createdAt, updatedAt, latestVersion}]
  const [currentScriptId, setCurrentScriptId] = useState(null);
  const [currentScript, setCurrentScript] = useState(null); // {id, title, versions: [...]}
  const [versionHistory, setVersionHistory] = useState([]); // [{version, code, createdAt, id}]
  const [selectedVersion, setSelectedVersion] = useState(null);

  // --- UI State ---
  const [activeTab, setActiveTab] = useState("scripts"); // scripts | history | saved
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

  // --- Load Scripts from Backend ---
  useEffect(() => {
    if (!user) {
      setScripts([]);
      setCurrentScriptId(null);
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
            setScripts(data.scripts.map(script => ({
              id: script.id,
              title: script.title,
              createdAt: script.createdAt,
              updatedAt: script.updatedAt,
              latestVersion: script.latestVersion,
            })));
            if (data.scripts.length > 0 && !currentScriptId) {
              setCurrentScriptId(data.scripts[0].id);
            }
          }
        });
    });
    // eslint-disable-next-line
  }, [user]);

  // --- Load Versions for Current Script from Backend ---
  useEffect(() => {
    if (!user || !currentScriptId) {
      setCurrentScript(null);
      setVersionHistory([]);
      setSelectedVersion(null);
      return;
    }
    user.getIdToken().then((idToken) => {
      fetch(`${BACKEND_URL}/api/scripts/${currentScriptId}/versions`, {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      })
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data.versions)) {
            const sortedVersions = data.versions.sort((a, b) => (b.version || 1) - (a.version || 1));
            setCurrentScript({
              id: currentScriptId,
              title: scripts.find(c => c.id === currentScriptId)?.title || "",
              versions: sortedVersions,
            });
            setVersionHistory(sortedVersions);
            setSelectedVersion(sortedVersions[0]);
          }
        });
    });
    // eslint-disable-next-line
  }, [user, currentScriptId, scripts]);

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
  }, [currentScript, isGenerating, loadingBarVisible]);

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
      alert("Sign in to generate scripts.");
      return;
    }

    setPrompt("");
    setIsGenerating(true);
    setGenerationStep("title");
    setShowCelebration(false);

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
    let scriptApiId = null;

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
          conversation: [],
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
            conversation: [],
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

      // --- 3. Show explanation immediately, then wait, then start code generation ---
      setAnimatedScriptIds((prev) => ({
        ...prev,
        temp: true,
      }));

      setCurrentScript({
        id: "temp",
        title: scriptTitle,
        versions: [
          {
            title: scriptTitle,
            explanation: explanation,
            code: "",
            version: 1,
            temp: true,
          },
        ],
      });
      setVersionHistory([
        {
          title: scriptTitle,
          explanation: explanation,
          code: "",
          version: 1,
          temp: true,
        },
      ]);
      setSelectedVersion({
        title: scriptTitle,
        explanation: explanation,
        code: "",
        version: 1,
        temp: true,
      });

      // Wait for the typewriter effect to finish (based on word count and speed)
      const wordsCount = (explanationObj.explanation || "").split(" ").length;
      const typewriterSpeed = 30; // ms per word
      const typewriterDuration = wordsCount * typewriterSpeed + 500;

      await new Promise((resolve) => setTimeout(resolve, typewriterDuration));
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // --- 4. Show Loading Bar for Code Generation (before calling API) ---
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

      // --- 5. Generate Code ---
      const codeRes = await fetch(`${BACKEND_URL}/api/generate-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          prompt,
          conversation: [],
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

      // --- 6. Save Script (as v1) in backend with code and explanation ---
      setGenerationStep("saving");
      let scriptRes = await fetch(`${BACKEND_URL}/api/scripts`, {
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
      setCurrentScriptId(scriptApiId);

      // --- 7. Fetch Version History from backend ---
      let versions = [];
      let scriptApiIdToUse = scriptApiId;
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
        id: scriptApiIdToUse,
        title: scriptTitle,
        versions,
      });
      setSelectedVersion(versions[0]);

      setLoadingBarData((prev) => ({
        ...prev,
        loading: false,
        codeReady: true,
        saved: false,
        version: `v${version}`,
        filename: generatedFilename,
        onSave: () => {},
        onView: () => {},
      }));
      setLoadingBarVisible(false);
      setGenerationStep("done");
      setShowCelebration(true);

      setAnimatedScriptIds((prev) => ({
        ...prev,
        [scriptApiIdToUse]: true,
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
    if (!user || !code || !currentScript || !currentScript.id) return false;
    let scriptApiId = currentScript.id;
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
    if (!user || !currentScript || !currentScript.id || !versionObj?.id) {
      setSelectedVersion(versionObj);
      setCurrentScript((cs) => ({
        ...cs,
        title: versionObj.title,
      }));
      return;
    }
    let idToken = await user.getIdToken();
    try {
      const res = await fetch(`${BACKEND_URL}/api/scripts/${currentScript.id}/versions/${versionObj.id}`, {
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
  const handleCreateScript = async (title = "New Script") => {
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
      setCurrentScriptId(data.scriptId);
      // Optionally refetch scripts here
    }
  };

  const handleRenameScript = async (scriptId, newTitle) => {
    // Not implemented in backend; would require a PATCH endpoint
    alert("Renaming scripts is not yet supported.");
  };

  const handleDeleteScript = async (scriptId) => {
    if (!user) return;
    let idToken = await user.getIdToken();

    await fetch(`${BACKEND_URL}/api/scripts/${scriptId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });

    setScripts((prev) => prev.filter((c) => c.id !== scriptId));

    if (currentScriptId === scriptId) {
      setCurrentScriptId(
        scripts.length > 1 ? scripts.find((c) => c.id !== scriptId)?.id : null
      );
    }
  };

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
              setCurrentScript(null);
              setVersionHistory([]);
              setSelectedVersion(null);
            }}
            setPrompt={setPrompt}
            scripts={scripts}
            currentScriptId={currentScriptId}
            setCurrentScriptId={setCurrentScriptId}
            handleCreateScript={handleCreateScript}
            handleRenameScript={handleRenameScript}
            handleDeleteScript={handleDeleteScript}
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
            messages={currentScript ? currentScript.versions : []}
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
            setCurrentScript(null);
            setVersionHistory([]);
            setSelectedVersion(null);
          }}
          setPrompt={setPrompt}
          scripts={scripts}
          currentScriptId={currentScriptId}
          setCurrentScriptId={setCurrentScriptId}
          handleCreateScript={handleCreateScript}
          handleRenameScript={handleRenameScript}
          handleDeleteScript={handleDeleteScript}
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
              {!currentScript && !isGenerating ? (
                <WelcomeCard
                  setPrompt={setPrompt}
                  promptTemplates={promptTemplates}
                  userPromptTemplates={userPromptTemplates}
                  promptSuggestions={promptSuggestions}
                  promptSuggestionLoading={promptSuggestionLoading}
                />
              ) : (
                <>
                  {/* Render all versions as chat bubbles/cards */}
                  {currentScript && currentScript.versions.map((version, idx) => {
                    const isLatest = idx === 0;
                    const animateThisScript =
                      !!animatedScriptIds[currentScript.id] && isLatest;

                    return (
                      <div key={version.id || idx} className="space-y-2">
                        {/* User Prompt Bubble */}
                        {prompt && isLatest && (
                          <div className="flex justify-end items-end mb-1">
                            <div className="flex flex-row-reverse items-end gap-2 w-full max-w-2xl">
                              <UserAvatar email={user?.email} />
                              <div className="bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-white px-4 py-2 rounded-2xl rounded-br-sm shadow-lg max-w-[75%] text-right break-words text-base font-medium animate-fade-in">
                                {prompt}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* AI Response Card (left-aligned) */}
                        <div className="flex items-start gap-2 w-full max-w-2xl animate-fade-in">
                          <NexusRBXAvatar />
                          <div className="flex-1 bg-gray-900/80 border border-gray-800 rounded-2xl rounded-tl-sm shadow-lg px-5 py-4 mb-2">
                            {/* Title */}
                            {version.title && (
                              <div className="mb-1 flex items-center gap-2">
                                <span className="text-xl font-bold bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">
                                  {version.title.replace(/\s*v\d+$/i, "")}
                                </span>
                                {version.version && (
                                  <span className="ml-2 px-2 py-0.5 rounded bg-[#9b5de5]/20 text-[#9b5de5] text-xs font-semibold">
                                    v{version.version}
                                  </span>
                                )}
                              </div>
                            )}
                            {/* Explanation */}
                            {version.explanation && (
                              <div className="mb-2">
                                <div className="font-bold text-[#9b5de5] mb-1">
                                  Explanation
                                </div>
                                <div className="text-gray-200 whitespace-pre-line text-base">
                                  {version.typewriterDone ? (
                                    <div>{version.explanation}</div>
                                  ) : (
                                    <TypewriterEffect
                                      text={version.explanation}
                                      speed={30}
                                      className=""
                                      as="div"
                                      onDone={() => {
                                        setVersionHistory((prev) =>
                                          prev.map((v, i) =>
                                            i === idx
                                              ? { ...v, typewriterDone: true }
                                              : v
                                          )
                                        );
                                      }}
                                    />
                                  )}
                                </div>
                              </div>
                            )}
                            {/* Code Block */}
                            {animatedScriptIds[currentScript.id] && (
                              <div className="mb-2 mt-3">
                                <ScriptLoadingBarContainer
                                  filename={
                                    (version.title
                                      ? version.title.replace(/[^a-zA-Z0-9_\- ]/g, "").replace(/\s+/g, "_").slice(0, 40)
                                      : "Script") + ".lua"
                                  }
                                  version={
                                    version.version
                                      ? `v${version.version}`
                                      : "v1"
                                  }
                                  language="lua"
                                  loading={!!isGenerating}
                                  codeReady={!!version.code}
                                  estimatedLines={
                                    version.code
                                      ? version.code.split("\n").length
                                      : null
                                  }
                                  saved={false}
                                  onSave={() =>
                                    handleSaveScript(
                                      version.title,
                                      version.code
                                    )
                                  }
                                  onView={() =>
                                    handleVersionView(
                                      version
                                    )
                                  }
                                />
                              </div>
                            )}
                            {/* Timestamp */}
                            <div className="text-xs text-gray-500 mt-2 text-right">
                              {version.createdAt
                                ? new Date(version.createdAt).toLocaleString()
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
                    prompt.length > 800
                  }
                  className={`absolute right-3 bottom-3 p-3 rounded-full shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#9b5de5] ${
                    isGenerating ||
                    !(typeof prompt === "string" && prompt.trim()) ||
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
                  Sign in to generate scripts.
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
            messages={currentScript ? currentScript.versions : []}
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