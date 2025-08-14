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

// --- In-memory throttle/backoff for versions polling ---
let lastVersionsFetch = 0;
let versionsBackoff = 0;

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

// --- Model Resolver ---
const resolveModel = (mv) => {
  switch (mv) {
    case "nexus-4":
      return "gpt-4.1-2025-04-14";
    case "nexus-2":
      return "gpt-3.5-turbo";
    case "nexus-3":
    default:
      return "gpt-4.1-2025-04-14";
  }
};

// --- Auth Retry Helper ---
async function authedFetch(user, url, init = {}, retry = true) {
  let idToken = await user.getIdToken();
  let res = await fetch(url, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${idToken}`,
    },
  });
  if (res.status === 401 && retry) {
    // Try to refresh token and retry once
    await user.getIdToken(true);
    idToken = await user.getIdToken();
    res = await fetch(url, {
      ...init,
      headers: {
        ...(init.headers || {}),
        Authorization: `Bearer ${idToken}`,
      },
    });
  }
  return res;
}

// --- Debounce Helper ---
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debounced;
}

// --- Safe Timestamp Helper ---
const toLocalTime = (ts) => {
  if (!ts) return "";
  let date;
  if (typeof ts === "number") date = new Date(ts);
  else if (typeof ts === "string") {
    const parsed = Date.parse(ts);
    if (!isNaN(parsed)) date = new Date(parsed);
    else return "";
  } else if (ts?.seconds) date = new Date(ts.seconds * 1000);
  else return "";
  if (!date || isNaN(date.getTime())) return "";
  return date.toLocaleString();
};

// --- Safe Filename Helper ---
const safeFile = (title) =>
  (title || "Script").replace(/[^a-zA-Z0-9_\- ]/g, "").replace(/\s+/g, "_").slice(0, 40) + ".lua";

// --- Stable Hash Helper ---
function hash(str) {
  let h = 0, i, chr;
  if (!str) return "0";
  for (i = 0; i < str.length; i++) {
    chr = str.charCodeAt(i);
    h = (h << 5) - h + chr;
    h |= 0;
  }
  return Math.abs(h).toString(16);
}

// --- Outline → Explanation Helper ---
function outlineToExplanationText(outline = []) {
  if (!Array.isArray(outline)) return "";
  return outline
    .map(sec => {
      const heading = sec?.heading ? `## ${sec.heading}` : "";
      const bullets = (sec?.bulletPoints || [])
        .map(b => `• ${b}`)
        .join("\n");
      return [heading, bullets].filter(Boolean).join("\n");
    })
    .join("\n\n");
}

// --- Polling Utility ---
async function pollJob(user, jobId, onTick, { intervalMs = 1200, maxMs = 120000, signal } = {}) {
  const started = Date.now();
  let status = "running";
  while (Date.now() - started < maxMs) {
    if (signal?.aborted) throw new Error("Aborted");
    const res = await authedFetch(user, `${BACKEND_URL}/api/jobs/${jobId}`, { method: "GET", signal });
    const data = await res.json().catch(() => ({}));
    if (onTick) onTick(data);
    status = data.status;
    if (status === "succeeded" || status === "failed") return data;
    await new Promise(r => setTimeout(r, intervalMs));
  }
  return { status: "failed", error: "Timeout" };
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
  const [lastUserPrompt, setLastUserPrompt] = useState(""); // For chat bubble
  const [promptCharCount, setPromptCharCount] = useState(0);
  const [promptError, setPromptError] = useState("");
  const [errorMsg, setErrorMsg] = useState(""); // Inline error
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState("idle"); // idle | title | explanation | code | done | preparing | calling model | post-processing | polishing | finalizing
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
    stage: "",
    eta: null,
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

// --- Token Bar State ---
const [tokensLeft, setTokensLeft] = useState(TOKEN_LIMIT);
const [tokenRefreshTime, setTokenRefreshTime] = useState(null);

// --- Prompt Input Ref for focus ---
const promptInputRef = useRef(null);

// --- Polling ETA ---
const pollingTimesRef = useRef([]);

// --- Local Persistence for chat/sidebar ---
useEffect(() => {
  if (currentScript) {
    localStorage.setItem("nexusrbx:currentScript", JSON.stringify(currentScript));
  }
}, [currentScript]);
useEffect(() => {
  if (versionHistory) {
    localStorage.setItem("nexusrbx:versionHistory", JSON.stringify(versionHistory));
  }
}, [versionHistory]);
useEffect(() => {
  if (lastUserPrompt) {
    localStorage.setItem("nexusrbx:lastUserPrompt", lastUserPrompt);
  }
}, [lastUserPrompt]);
useEffect(() => {
  if (scripts) {
    localStorage.setItem("nexusrbx:scripts", JSON.stringify(scripts));
  }
}, [scripts]);
useEffect(() => {
  const cachedScript = localStorage.getItem("nexusrbx:currentScript");
  if (cachedScript) setCurrentScript(JSON.parse(cachedScript));
  const cachedVersions = localStorage.getItem("nexusrbx:versionHistory");
  if (cachedVersions) setVersionHistory(JSON.parse(cachedVersions));
  const cachedPrompt = localStorage.getItem("nexusrbx:lastUserPrompt");
  if (cachedPrompt) setLastUserPrompt(cachedPrompt);
  const cachedScripts = localStorage.getItem("nexusrbx:scripts");
  if (cachedScripts) setScripts(JSON.parse(cachedScripts));
}, []);

// --- Auth ---
const [authReady, setAuthReady] = useState(false);
useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
    setAuthReady(true);
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

// --- Load Last Project (no /api/scripts backend route yet) ---
useEffect(() => {
  if (!user) {
    // keep local cache visible; do not clear scripts
    return;
  }
  // Try to restore last projectId from localStorage and fetch versions for it
  const lastProjectId = localStorage.getItem("nexusrbx:lastProjectId");
  if (lastProjectId) {
    setCurrentScriptId(lastProjectId);
  } else {
    // No projects to list (backend has no list endpoint yet)
    setScripts([]);
  }
  // eslint-disable-next-line
}, [user]);

  // --- Load Versions for Current Script from Backend ---
useEffect(() => {
  if (!authReady) return; // wait until auth resolves
  if (!user || !currentScriptId) return; // don't clear; keep what we have

  const now = Date.now();
  if (now - lastVersionsFetch < 10000 + versionsBackoff) return;
  lastVersionsFetch = now;

  user.getIdToken().then((idToken) => {
    fetch(`${BACKEND_URL}/api/projects/${currentScriptId}/versions`, {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    })
      .then((res) => {
        if (res.status === 429) {
          versionsBackoff = Math.min((versionsBackoff || 0) * 2 + 5000, 60000);
          setErrorMsg("Temporarily showing cached draft (429).");
          return null;
        } else {
          versionsBackoff = 0;
        }
        if (!res.ok) {
          setErrorMsg("Temporarily showing cached draft (error).");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data && Array.isArray(data.versions)) {
          // Normalize timestamps
          const sortedVersions = data.versions
            .map((v) => ({
              ...v,
              createdAt:
                typeof v.createdAt === "number"
                  ? v.createdAt
                  : Date.parse(v.createdAt) || Date.now(),
            }))
            .sort((a, b) => (b.version || 1) - (a.version || 1));
          setCurrentScript({
            id: currentScriptId,
            title: sortedVersions[0]?.title || "",
            versions: sortedVersions,
          });
          setVersionHistory(sortedVersions);
          setSelectedVersion((sv) =>
            sv ? sortedVersions.find((v) => v.id === sv.id) || sortedVersions[0] : sortedVersions[0]
          );
        }
      });
  });
  // eslint-disable-next-line
}, [user, currentScriptId, authReady]);

  // --- Prompt Char Count & Error ---
  useEffect(() => {
    setPromptCharCount(prompt.length);
    if (prompt.length > 800) {
      setPromptError("Prompt too long (max 800 characters).");
    } else {
      setPromptError("");
    }
  }, [prompt]);

  // --- Debounced Prompt for Autocomplete ---
  const debouncedPrompt = useDebounce(prompt, 150);

  // --- Autocomplete logic (debounced) ---
  useEffect(() => {
    if (debouncedPrompt.length > 1) {
      const allPrompts = [
        ...promptTemplates,
        ...userPromptTemplates,
        ...promptHistory,
      ];
      const filtered = allPrompts
        .filter(
          (p) =>
            p.toLowerCase().startsWith(debouncedPrompt.toLowerCase()) &&
            p.toLowerCase() !== debouncedPrompt.toLowerCase()
        )
        .slice(0, 5);
      setPromptAutocomplete(filtered);
    } else {
      setPromptAutocomplete([]);
    }
  }, [debouncedPrompt, promptTemplates, userPromptTemplates, promptHistory]);

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

  // --- Focus textarea on mount ---
  useEffect(() => {
    promptInputRef.current?.focus();
  }, []);

  // --- Main Generation Flow (Handles both new script and new version) ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    if (typeof prompt !== "string" || !prompt.trim() || isGenerating) return;
    if (prompt.length > 800) {
      setPromptError("Prompt too long (max 800 characters).");
      return;
    }
    if (!user) {
      setErrorMsg("Sign in to generate scripts.");
      return;
    }

    // --- Sanitize and clamp prompt ---
    const cleaned = prompt.trim().replace(/\s+/g, " ");
    if (!cleaned) return;

    setLastUserPrompt(cleaned);
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
      setErrorMsg("Not authenticated.");
      return;
    }

    let scriptTitle = "";
    let explanation = "";
    let explanationObj = {};
    let code = "";
    let version = 1;
    let scriptApiId = null;
    // --- AbortController for polling ---
    const abortController = new AbortController();

    try {
      // --- 1. Generate Title ---
      setGenerationStep("title");

  let titleRes;
  titleRes = await authedFetch(user, `${BACKEND_URL}/api/generate-title-advanced`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: cleaned,
      conversation: [],
      isNewScript: !currentScriptId,
      previousTitle: ""
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
        setIsGenerating(false);
        setGenerationStep("idle");
        setErrorMsg("Failed to parse title response. Please try again.");
        return;
      }
      scriptTitle = titleData.title || "Script";
      if (!scriptTitle) throw new Error("Failed to generate title");

      // Ensure we have a projectId before generating artifact
      let projectIdToUse = currentScriptId;
      if (!projectIdToUse) {
        const createProjectRes = await authedFetch(user, `${BACKEND_URL}/api/projects`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: scriptTitle }),
        });
        if (!createProjectRes.ok) {
          const text = await createProjectRes.text();
          throw new Error(`Failed to create project: ${createProjectRes.status} ${createProjectRes.statusText} - ${text.slice(0,200)}`);
        }
        const created = await createProjectRes.json();
        projectIdToUse = created.projectId;
        setCurrentScriptId(projectIdToUse);
        localStorage.setItem("nexusrbx:lastProjectId", projectIdToUse);
      }

      // --- 2. Generate Outline (use as explanation text) ---
      setGenerationStep("explanation");

      let conversation = [];
      if (versionHistory.length > 0) {
        const prevVersion = versionHistory[0];
        conversation = [
          { role: "assistant", content: prevVersion.explanation || "" },
          { role: "assistant", content: prevVersion.code || "" },
        ];
      }

      let outlineRes;
      try {
        outlineRes = await authedFetch(user, `${BACKEND_URL}/api/generate/outline`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: projectIdToUse,
            prompt: cleaned,
            conversation,
            settings: {
              model: resolveModel(settings.modelVersion),
              temperature: settings.creativity,
              codeStyle: settings.codeStyle,
            },
          }),
        });
      } catch (err) {
        setIsGenerating(false);
        setGenerationStep("idle");
        setErrorMsg("Network error during outline generation.");
        return;
      }

      if (!outlineRes.ok) {
        const text = await outlineRes.text();
        throw new Error(`Failed to generate outline: ${outlineRes.status} ${outlineRes.statusText} - ${text.slice(0,200)}`);
      }

      let outlineData;
      try {
        outlineData = await outlineRes.json();
      } catch (err) {
        setIsGenerating(false);
        setGenerationStep("idle");
        setErrorMsg("Failed to parse outline response. Please try again.");
        return;
      }

      const outline = Array.isArray(outlineData.outline) ? outlineData.outline : [];
      explanationObj = { outline };
      explanation = outlineToExplanationText(outline);
      if (!explanation) throw new Error("Failed to generate outline/explanation");

      // --- 3. Show explanation immediately, then wait, then start code generation ---
      const tempId = `temp-${Date.now()}`;
      setAnimatedScriptIds((prev) => ({
        ...prev,
        [tempId]: true,
      }));

      setCurrentScript({
        id: tempId,
        title: scriptTitle,
        versions: [
          {
            id: tempId,
            title: scriptTitle,
            explanation: explanation,
            code: "",
            version: 1,
            temp: true,
            createdAt: new Date().toISOString(),
          },
        ],
      });
      setVersionHistory([
        {
          id: tempId,
          title: scriptTitle,
          explanation: explanation,
          code: "",
          version: 1,
          temp: true,
          createdAt: new Date().toISOString(),
        },
      ]);
      setSelectedVersion({
        id: tempId,
        title: scriptTitle,
        explanation: explanation,
        code: "",
        version: 1,
        temp: true,
        createdAt: new Date().toISOString(),
      });

      // Wait for a short moment before starting code generation
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // --- 4. Show Loading Bar for Code Generation (before calling API) ---
      setGenerationStep("preparing");
      setLoadingBarVisible(true);
      const generatedFilename = safeFile(scriptTitle);

      setLoadingBarData({
        filename: generatedFilename,
        version: `v1`,
        language: "lua",
        loading: true,
        codeReady: false,
        estimatedLines: null,
        saved: false,
        onSave: () => {},
        onView: () => {},
        stage: "Preparing",
        eta: null,
      });

      // --- 5. Generate Code via Job Flow ---
      let artifactStart;
      try {
        artifactStart = await authedFetch(user, `${BACKEND_URL}/api/generate/artifact`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": window.crypto?.randomUUID?.() || Math.random().toString(36).slice(2, 26),
          },
          body: JSON.stringify({
            projectId: projectIdToUse,
            prompt: cleaned,
            pipelineId: window.crypto?.randomUUID?.() || Math.random().toString(36).slice(2, 26),
            outline: explanationObj?.outline || [{ heading: "Plan", bulletPoints: [] }],
            settings: {
              model: resolveModel(settings.modelVersion),
              temperature: settings.creativity,
              codeStyle: settings.codeStyle,
            },
          }),
        });
      } catch (err) {
        setIsGenerating(false);
        setGenerationStep("idle");
        setLoadingBarVisible(false);
        setErrorMsg("Network error during code generation.");
        return;
      }
      let jobId, pipelineId;
      try {
        const jobStartData = await artifactStart.json();
        jobId = jobStartData.jobId;
        pipelineId = jobStartData.pipelineId;
      } catch (err) {
        setIsGenerating(false);
        setGenerationStep("idle");
        setLoadingBarVisible(false);
        setErrorMsg("Failed to start code generation job.");
        return;
      }

      // --- Poll job status ---
      pollingTimesRef.current = [];
      let lastStage = "";
      let jobResult;
      try {
        jobResult = await pollJob(
          user,
          jobId,
          (tick) => {
            // Map backend stage to UI step
            let stage = tick.stage || "";
            let mappedStep = "preparing";
            if (/prepar/i.test(stage)) mappedStep = "preparing";
            else if (/call/i.test(stage)) mappedStep = "calling model";
            else if (/post/i.test(stage)) mappedStep = "post-processing";
            else if (/polish/i.test(stage)) mappedStep = "polishing";
            else if (/final/i.test(stage)) mappedStep = "finalizing";
            setGenerationStep(mappedStep);

            // Progress/ETA
            if (tick.stage !== lastStage) {
              pollingTimesRef.current.push(Date.now());
              if (pollingTimesRef.current.length > 5)
                pollingTimesRef.current.shift();
              lastStage = tick.stage;
            }
            let eta = null;
            if (pollingTimesRef.current.length > 1) {
              const diffs = [];
              for (let i = 1; i < pollingTimesRef.current.length; ++i) {
                diffs.push(
                  pollingTimesRef.current[i] - pollingTimesRef.current[i - 1]
                );
              }
              const avg = diffs.reduce((a, b) => a + b, 0) / diffs.length;
              eta = Math.round(avg / 1000);
            }
            setLoadingBarData((prev) => ({
              ...prev,
              estimatedLines: undefined,
              stage: stage,
              eta,
            }));
          },
          { intervalMs: 1200, maxMs: 120000, signal: abortController.signal }
        );
      } catch (err) {
        setIsGenerating(false);
        setGenerationStep("idle");
        setLoadingBarVisible(false);
        setErrorMsg("Job polling aborted or failed.");
        return;
      }

      if (jobResult.status !== "succeeded") {
        setIsGenerating(false);
        setGenerationStep("idle");
        setLoadingBarVisible(false);
        setErrorMsg(jobResult.error || "Generation failed");
        return;
      }
      const { code: generatedCode, warnings, versionId } = jobResult.result;
      code = generatedCode || "";
      if (!code) {
        setIsGenerating(false);
        setGenerationStep("idle");
        setLoadingBarVisible(false);
        setErrorMsg("Failed to generate code");
        return;
      }

      // --- 6. Fetch Version History from backend (artifact job already saved) ---
      setGenerationStep("saving"); // UI consistency

      let versions = [];
      try {
        const versionsRes = await authedFetch(user, `${BACKEND_URL}/api/projects/${projectIdToUse}/versions`, {
          method: "GET",
        });
        if (versionsRes.ok) {
          const versionsData = await versionsRes.json();
          versions = versionsData.versions || [];
        }
      } catch (err) {
        // keep empty
      }

      // Keep versions DESC (latest first)
      const sorted = versions.sort((a, b) => (b.version || 1) - (a.version || 1));
      setVersionHistory(sorted);
      setCurrentScript({
        id: projectIdToUse,
        title: scriptTitle,
        versions: sorted,
      });
      setSelectedVersion(sorted[0]);

      setLoadingBarData((prev) => ({
        ...prev,
        loading: false,
        codeReady: true,
        saved: true,
        version: sorted[0]?.version ? `v${sorted[0].version}` : `v1`,
        filename: safeFile(scriptTitle),
        onSave: () => {},
        onView: () => {},
      }));
      setTimeout(() => setLoadingBarVisible(false), 1500);
      setGenerationStep("done");
      setShowCelebration(true);
      setAnimatedScriptIds((prev) => ({ ...prev, [projectIdToUse]: true }));
      setTimeout(() => setShowCelebration(false), 3000);
      setTimeout(() => setErrorMsg(`Saved ${sorted[0]?.version ? `v${sorted[0].version}` : "v1"}`), 500);
    } catch (err) {
      setIsGenerating(false);
      setGenerationStep("idle");
      setLoadingBarVisible(false);
      setErrorMsg("Error during script generation: " + (err.message || err));
    } finally {
      setIsGenerating(false);
      setGenerationStep("idle");
    }
    // Abort polling if unmount
    return () => abortController.abort();
  };

  // --- Save Script (manual save disabled) ---
  const handleSaveScript = async (newTitle, code, explanation = "") => {
    setErrorMsg("Manual save is not supported yet (artifact job writes versions).");
    return false;
  };

  // --- Sidebar Version Click Handler (no single-version GET) ---
  const handleVersionView = async (versionObj) => {
    setErrorMsg("");
setSelectedVersion(versionObj);
setCurrentScript((cs) => ({
  ...cs,
  title: versionObj?.title || cs?.title || "",
}));
  };

  // --- Download Handler for Version ---
  const handleVersionDownload = (versionObj) => {
    const blob = new Blob([versionObj.code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const filename = safeFile(versionObj.title);
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // --- Script Management ---
const handleCreateScript = async (title = "New Script") => {
  setErrorMsg("");
  if (!user) return;
  const res = await authedFetch(user, `${BACKEND_URL}/api/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (res.ok) {
    const data = await res.json();
    setCurrentScriptId(data.projectId);
    localStorage.setItem("nexusrbx:lastProjectId", data.projectId);
  } else {
    setErrorMsg("Failed to create project.");
  }
};

  const handleRenameScript = async (scriptId, newTitle) => {
    setErrorMsg("Renaming projects is not supported yet.");
  };

  const handleDeleteScript = async (scriptId) => {
    setErrorMsg("Deleting projects is not supported yet.");
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

  // --- Token Bar Logic (simulate tokens for now) ---
  useEffect(() => {
    // Simulate token system for demo
    if (!user) {
      setTokensLeft(TOKEN_LIMIT);
      setTokenRefreshTime(null);
      return;
    }
    // For dev email, infinite tokens
    if (!!user?.email && user.email.toLowerCase() === DEVELOPER_EMAIL) {
      setTokensLeft(null); // null = unlimited
      setTokenRefreshTime(null);
      return;
    }
    // Otherwise, simulate tokens
    setTokensLeft(TOKEN_LIMIT - 0); // TODO: Replace with real backend logic
    setTokenRefreshTime(
      new Date(Date.now() + TOKEN_REFRESH_HOURS * 60 * 60 * 1000)
    );
  }, [user]);

  // --- Keyboard UX for textarea ---
  const handlePromptKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
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
  if (!window.confirm('Clear this chat?')) return;
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
    if (!window.confirm('Clear this chat?')) return;
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
                  {currentScript &&
                    currentScript.versions.map((version, idx, arr) => {
                      // Keep DESC order (latest first)
                      const isLatest = idx === 0;
                      const animateThisScript =
                        !!animatedScriptIds[currentScript.id] && isLatest;

                      return (
                        <div key={version.id || `${currentScript?.id || 'temp'}-v${version.version || 1}`} className="space-y-2">
                          {/* User Prompt Bubble */}
                          {lastUserPrompt && isLatest && (
                            <div className="flex justify-end items-end mb-1">
                              <div className="flex flex-row-reverse items-end gap-2 w-full max-w-2xl">
                                <UserAvatar email={user?.email} />
                                <div className="bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-white px-4 py-2 rounded-2xl rounded-br-sm shadow-lg max-w-[75%] text-right break-words text-base font-medium animate-fade-in">
                                  {lastUserPrompt}
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
                                  {isLatest && (
                                    <span className="ml-2 px-2 py-0.5 rounded bg-[#00f5d4]/20 text-[#00f5d4] text-xs font-semibold">
                                      Latest
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
                                    <div>{version.explanation}</div>
                                  </div>
                                </div>
                              )}
                              {/* Code Block */}
                              {animatedScriptIds[currentScript.id] && (
                                <div className="mb-2 mt-3">
                                  <ScriptLoadingBarContainer
                                    filename={safeFile(version.title || currentScript?.title)}
                                    displayName={version.title || currentScript?.title || "Script"}
                                    version={
                                      version.version
                                        ? `v${version.version}`
                                        : "v1"
                                    }
                                    language="lua"
                                    loading={!!isGenerating || loadingBarVisible}
                                    codeReady={!!version.code}
                                    estimatedLines={
                                      version.code
                                        ? version.code.split("\n").length
                                        : null
                                    }
                                    saved={loadingBarData.saved}
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
                                    stage={loadingBarData.stage}
                                    eta={loadingBarData.eta}
                                  />
                                </div>
                              )}
                              {/* Timestamp */}
                              <div className="text-xs text-gray-500 mt-2 text-right">
                                {toLocalTime(version.createdAt)}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </>
              )}
              {/* Loading bar appears just below the latest script output */}
              {(isGenerating || loadingBarVisible) && (
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
                  <span aria-live="polite">
                    NexusRBX is typing...
                    {generationStep === "title" && " (Generating script title...)"}
                    {generationStep === "explanation" && " (Generating explanation...)"}
                    {["preparing", "calling model", "post-processing", "polishing", "finalizing"].includes(generationStep) && (
                      <>
                        {" ("}
                        {loadingBarData.stage || generationStep.charAt(0).toUpperCase() + generationStep.slice(1)}
                        {loadingBarData.eta ? `, ETA: ${loadingBarData.eta}s` : ""}
                        {")"}
                      </>
                    )}
                    {generationStep === "code" && " (Generating code...)"}
                  </span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
          {/* Input Area */}
          <div className="border-t border-gray-800 bg-black/30 px-2 md:px-4 py-4 flex flex-col items-center shadow-inner">
            {/* Token Bar */}
            <div className="w-full max-w-2xl mx-auto mb-2">
              <TokenBar
                tokensLeft={tokensLeft}
                tokenLimit={TOKEN_LIMIT}
                refreshTime={tokenRefreshTime}
                isDev={!!user?.email && user.email.toLowerCase() === DEVELOPER_EMAIL}
              />
            </div>
            <form
              onSubmit={handleSubmit}
              className="w-full max-w-2xl mx-auto"
              autoComplete="off"
            >
              <div className="relative">
                <textarea
                  ref={promptInputRef}
                  value={typeof prompt === "string" ? prompt : ""}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={handlePromptKeyDown}
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
              {errorMsg && (
                <div className="mt-2 text-xs text-red-400">{errorMsg}</div>
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
          filename={safeFile(selectedVersion.title)}
          version={selectedVersion.version ? `v${selectedVersion.version}` : ""}
          onClose={() => setSelectedVersion(null)}
          onSaveScript={handleSaveScript}
        />
      )}
      {/* Celebration Animation */}
      {showCelebration && <CelebrationAnimation />}
      {errorMsg && (
  <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-red-700 text-white px-6 py-3 rounded-lg shadow-lg z-[200] animate-fade-in">
    {errorMsg}
  </div>
)}
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