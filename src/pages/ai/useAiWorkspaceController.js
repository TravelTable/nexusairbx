import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
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

import { auth, db } from "../../firebase";
import { useBilling } from "../../context/BillingContext";
import { useSettings } from "../../context/SettingsContext";
import { useUnifiedChat } from "../../hooks/useUnifiedChat";
import { useGameProfile } from "../../hooks/useGameProfile";
import { useAiScripts } from "../../hooks/useAiScripts";
import { CHAT_MODES } from "../../components/ai/chatConstants";
import { isPremiumMode } from "../../lib/modeGates";
import { AI_PAGE_V2_ENABLED } from "../../config";
import { BACKEND_URL } from "../../lib/uiBuilderApi";
import { AI_EVENTS, emitAiEvent, onAiEvent } from "../../lib/aiEvents";
import { resolveAiRouteDecision } from "../../lib/aiRouter";
import { buildCompactActContext } from "../../lib/aiContext";
import { createAiTelemetryClient } from "../../lib/aiTelemetry";
import { useAiNotifications } from "./useAiNotifications";

const IS_AI_PAGE_V2_ENABLED = AI_PAGE_V2_ENABLED;

const MODE_COLORS = {
  general: { primary: "#9b5de5", secondary: "#00f5d4" },
  ui: { primary: "#00f5d4", secondary: "#9b5de5" },
  logic: { primary: "#9b5de5", secondary: "#f15bb5" },
  system: { primary: "#00bbf9", secondary: "#00f5d4" },
  animator: { primary: "#f15bb5", secondary: "#fee440" },
  data: { primary: "#fee440", secondary: "#00f5d4" },
  performance: { primary: "#00f5d4", secondary: "#00bbf9" },
  security: { primary: "#ff006e", secondary: "#8338ec" },
};

function getDefaultQuickActions(activeMode) {
  const quickActions = {
    ui: [
      { label: "Generate Layout", prompt: "/ui Generate a modern layout for a ", submit: false },
      { label: "Glassmorphism", prompt: "Apply a glassmorphism theme to this UI", submit: false },
    ],
    security: [
      { label: "Audit Remotes", prompt: "Audit my RemoteEvents for vulnerabilities: ", submit: false },
      { label: "Check Scopes", prompt: "Check my DataStore scopes for security issues", submit: false },
    ],
    logic: [
      { label: "Optimize Loop", prompt: "Optimize this loop for performance: ", submit: false },
      { label: "Convert Module", prompt: "Convert this script into a modular Luau component", submit: false },
    ],
    performance: [
      { label: "Memory Audit", prompt: "Audit this code for potential memory leaks: ", submit: false },
      { label: "Speed Up", prompt: "Suggest micro-optimizations to speed up this function: ", submit: false },
    ],
  };

  const powerTools = {
    ui: [
      {
        label: "Simulator Style",
        prompt: "Apply a high-quality Simulator style to this UI (bright colors, thick strokes, playful fonts)",
      },
      {
        label: "Glassmorphism",
        prompt: "Apply a modern Glassmorphism style to this UI (transparency, blur, thin white strokes)",
      },
      {
        label: "Minimalist",
        prompt: "Apply a clean, professional Minimalist style to this UI (flat colors, ample whitespace, sharp corners)",
      },
    ],
    animator: [
      { label: "Smooth Fade", prompt: "Add a smooth fade-in/out animation to this UI using TweenService" },
      { label: "Spring Bounce", prompt: "Add a juicy spring bounce effect to the buttons" },
    ],
    logic: [
      { label: "Convert to OOP", prompt: "Refactor this code to use an Object-Oriented Programming (OOP) pattern" },
      { label: "Type Checking", prompt: "Add strict Luau type-checking to this script" },
    ],
  };

  return {
    currentActions: quickActions[activeMode] || [],
    currentPowerTools: powerTools[activeMode] || [],
  };
}

function inferTargetModeFromMessage(message) {
  const p = String(message?.prompt || message?.content || "").toLowerCase();
  if (["ui", "menu", "layout", "screen", "frame"].some((k) => p.includes(k))) {
    return "ui";
  }
  return "logic";
}

export function useAiWorkspaceController() {
  const { plan, totalRemaining, subLimit, resetsAt, refresh: refreshBilling, entitlements } = useBilling();
  const { settings, updateSettings } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState(null);
  const [scripts, setScripts] = useState([]);
  const [scriptsLimit] = useState(50);
  const [activeTab, setActiveTab] = useState("chat");
  const [mobileTab, setMobileTab] = useState("chat");
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth < 1024 : false);
  const [sidebarOpen, setSidebarOpen] = useState(typeof window !== "undefined" ? window.innerWidth > 1024 : true);

  const [prompt, setPrompt] = useState("");
  const [showSignInNudge, setShowSignInNudge] = useState(false);
  const [showProNudge, setShowProNudge] = useState(false);
  const [proNudgeReason, setProNudgeReason] = useState("");
  const [customModeModalOpen, setCustomModeModalOpen] = useState(false);
  const [editingCustomMode, setEditingCustomMode] = useState(null);
  const [projectContext, setProjectContext] = useState(null);
  const [architecturePanelOpen, setArchitecturePanelOpen] = useState(false);
  const [teams, setTeams] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [codeDrawerOpen, setCodeDrawerOpen] = useState(false);
  const [codeDrawerData, setCodeDrawerData] = useState({ code: "", title: "", explanation: "" });

  const chatEndRef = useRef(null);
  const pageViewTrackedRef = useRef(false);
  const lastArtifactTrackedRef = useRef(null);
  const telemetryRef = useRef(null);

  const {
    notify: queueNotify,
    toasts,
    currentToast,
    dismissToast,
  } = useAiNotifications();

  const notify = useCallback((payload) => {
    queueNotify(payload || {});
  }, [queueNotify]);

  const isPremium = entitlements?.includes("pro") || entitlements?.includes("team");
  const planKey = plan?.toLowerCase() || "free";

  const handleSidebarTabChange = useCallback((sidebarTab) => {
    if (sidebarTab === "scripts" || sidebarTab === "chats" || sidebarTab === "agent") {
      setActiveTab("chat");
      return;
    }
    if (sidebarTab === "saved") {
      if (!user) {
        setShowSignInNudge(true);
        return;
      }
      if (!isPremium) {
        setProNudgeReason("Saved Scripts Library");
        setShowProNudge(true);
        return;
      }
      setActiveTab("library");
    }
  }, [isPremium, user]);

  const handleSuggestAssets = useCallback(
    async (promptContext, uiRef) => {
      if (!user) return;
      try {
        const token = await user.getIdToken();
        const res = await fetch(`${BACKEND_URL}/api/ui-builder/ai/suggest-image-queries`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            items: uiRef?.activeUi?.boardState?.items || [],
            boardPrompt: promptContext,
          }),
        });
        if (!res.ok) throw new Error("Asset suggestion request failed");

        const out = await res.json();
        const msg =
          out?.suggestions?.length > 0
            ? out.suggestions.map((s) => `${s.itemId}: ${s.queries.join(", ")}`).join(" | ")
            : "No suggestions returned.";
        notify({ message: msg, type: "info" });
      } catch (err) {
        notify({ message: "Asset suggestion failed", type: "error" });
      }
    },
    [user, notify]
  );

  const handleUiAudit = useCallback(
    async (uiRef) => {
      if (!user) return;
      try {
        const token = await user.getIdToken();
        const res = await fetch(`${BACKEND_URL}/api/ui-builder/ai/audit`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ boardState: uiRef?.activeUi?.boardState || null }),
        });
        if (!res.ok) throw new Error("Audit request failed");

        const out = await res.json();
        const msg =
          out?.audit?.score !== undefined
            ? `Audit score: ${out.audit.score}. Issues: ${out.audit.issues.map((i) => i.message).join(" | ")}`
            : "Audit returned no score.";
        notify({ message: msg, type: "info" });
      } catch (err) {
        notify({ message: "Audit failed", type: "error" });
      }
    },
    [user, notify]
  );

  const unified = useUnifiedChat(user, settings, refreshBilling, notify, {
    onSuggestAssets: handleSuggestAssets,
    onUiAudit: handleUiAudit,
    onSignInNudge: () => setShowSignInNudge(true),
    isPremium,
    onRequireUpgrade: (modeId) => {
      const modeLabel = CHAT_MODES.find((m) => m.id === modeId)?.label || modeId;
      setProNudgeReason(`${modeLabel} Mode`);
      setShowProNudge(true);
    },
    getModeLabel: (id) => CHAT_MODES.find((m) => m.id === id)?.label || id,
  });

  const chat = unified;
  const ui = unified.ui;
  const game = useGameProfile(settings, updateSettings);
  const scriptManager = useAiScripts(user, notify);

  const activeModeData = useMemo(
    () => CHAT_MODES.find((m) => m.id === chat.activeMode) || CHAT_MODES[0],
    [chat.activeMode]
  );

  const currentTheme = useMemo(
    () => MODE_COLORS[chat.activeMode] || MODE_COLORS.general,
    [chat.activeMode]
  );

  const { currentActions, currentPowerTools } = useMemo(
    () => getDefaultQuickActions(chat.activeMode),
    [chat.activeMode]
  );

  const composerSuggestions = useMemo(() => {
    return [
      ...currentPowerTools.map((tool) => ({
        label: tool.label,
        prompt: tool.prompt,
        submit: true,
        primary: true,
        requiresPro: true,
        proNudgeReason: "UI Power Tools & Styles",
      })),
      ...currentActions.map((action) => ({
        label: action.label,
        prompt: action.prompt,
        submit: false,
        primary: false,
      })),
    ];
  }, [currentActions, currentPowerTools]);

  const track = useCallback((event, metadata = {}) => {
    telemetryRef.current?.track({
      event,
      chatId: chat.currentChatId || undefined,
      mode: chat.activeMode,
      chatMode: chat.chatMode,
      surface: "ai_page",
      metadata,
    });
  }, [chat.activeMode, chat.chatMode, chat.currentChatId]);

  useEffect(() => {
    telemetryRef.current?.destroy?.();
    telemetryRef.current = createAiTelemetryClient({
      enabled: IS_AI_PAGE_V2_ENABLED,
      getToken: async () => {
        if (!user) return null;
        return user.getIdToken();
      },
    });

    return () => {
      telemetryRef.current?.destroy?.();
      telemetryRef.current = null;
    };
  }, [user]);

  useEffect(() => {
    if (pageViewTrackedRef.current) return;
    pageViewTrackedRef.current = true;
    track("ai_page_view", { route: "/ai" });
  }, [track]);

  useEffect(() => {
    const last = [...chat.messages].reverse().find(
      (m) =>
        m.role === "assistant" &&
        (m.projectId || m.artifactId || m.code || m.uiModuleLua)
    );
    if (!last || last.id === lastArtifactTrackedRef.current) return;

    lastArtifactTrackedRef.current = last.id;
    track("artifact_generated", {
      artifactType: last.metadata?.type || (last.projectId ? "ui" : "code"),
      hasQaReport: !!last.metadata?.qaReport,
    });
  }, [chat.messages, track]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) setMobileTab("chat");
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser || null);
    });
    return () => unsubscribe();
  }, []);

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

  useEffect(() => {
    const unbindStartDraft = onAiEvent(AI_EVENTS.START_DRAFT, () => {
      chat.startNewChat();
      setActiveTab("chat");
    });

    const unbindOpenCodeDrawer = onAiEvent(AI_EVENTS.OPEN_CODE_DRAWER, (e) => {
      const { code, title, explanation } = e.detail || {};
      setCodeDrawerData({ code: code || "", title: title || "", explanation: explanation || "" });
      setCodeDrawerOpen(true);
    });

    const unbindSaveScript = onAiEvent(AI_EVENTS.SAVE_SCRIPT, async (e) => {
      if (!isPremium) {
        setProNudgeReason("Saved Scripts Library");
        setShowProNudge(true);
        return;
      }

      const { name, code } = e.detail || {};
      await scriptManager.handleCreateScript(name, code, "logic");
      notify({ message: `Saved ${name} to library`, type: "success" });
      track("artifact_action_used", { action: "save_script" });
    });

    return () => {
      unbindStartDraft();
      unbindOpenCodeDrawer();
      unbindSaveScript();
    };
  }, [chat, isPremium, notify, scriptManager, track]);

  useEffect(() => {
    if (!user) return;

    const unsubUser = onSnapshot(doc(db, "users", user.uid), (snap) => {
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
        if (!res.ok) return;
        const data = await res.json();
        setTeams(data.teams || []);
      } catch (e) {
        // best-effort
      }
    };

    fetchTeams();
    return () => unsubUser();
  }, [user]);

  const getModeLabel = useCallback(
    (modeId) => {
      return (
        CHAT_MODES.find((m) => m.id === modeId)?.label ||
        chat.customModes.find((m) => m.id === modeId)?.label ||
        modeId
      );
    },
    [chat.customModes]
  );

  const handleModeChange = useCallback(
    (modeId) => {
      if (!modeId) return false;
      if (isPremiumMode(modeId) && !isPremium) {
        setProNudgeReason(`${getModeLabel(modeId)} Mode`);
        setShowProNudge(true);
        return false;
      }
      chat.updateChatMode(chat.currentChatId, modeId);
      track("mode_changed", { modeId });
      return true;
    },
    [chat, getModeLabel, isPremium, track]
  );

  const routeAndSubmitPrompt = useCallback(async (rawPrompt, currentAttachments) => {
    const decision = await resolveAiRouteDecision({
      user,
      prompt: rawPrompt,
      attachments: currentAttachments,
      activeMode: chat.activeMode,
      chatMode: chat.chatMode,
      hasActiveUi: !!ui.activeUi?.uiModuleLua,
    });

    let finalPrompt = decision.normalizedPrompt || String(rawPrompt || "").trim();

    if (decision.targetMode && decision.targetMode !== chat.activeMode) {
      const switched = handleModeChange(decision.targetMode);
      if (!switched) return;
    }

    if (decision.action === "pipeline" && !/^\/ui\b/i.test(finalPrompt)) {
      finalPrompt = `/ui ${finalPrompt}`.trim();
    }

    if (decision.action === "refine" && !/^(refine:|tweak:)/i.test(finalPrompt)) {
      finalPrompt = `Refine: ${finalPrompt}`;
    }

    track("prompt_submitted", {
      action: decision.action,
      source: decision.source,
      attachments: currentAttachments.length,
      length: finalPrompt.length,
    });

    await unified.handleSubmit(finalPrompt, currentAttachments);
  }, [
    user,
    chat.activeMode,
    chat.chatMode,
    ui.activeUi,
    handleModeChange,
    track,
    unified,
  ]);

  const handlePromptSubmit = useCallback(async (e, overridePrompt = null) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault();

    const currentPrompt = (overridePrompt ?? prompt).trim();
    const currentAttachments = [...attachments];

    if (!currentPrompt && currentAttachments.length === 0) return;

    if (activeTab !== "chat") setActiveTab("chat");
    setPrompt("");
    setAttachments([]);

    if (IS_AI_PAGE_V2_ENABLED) {
      await routeAndSubmitPrompt(currentPrompt, currentAttachments);
      return;
    }

    await unified.handleSubmit(currentPrompt, currentAttachments);
  }, [
    prompt,
    attachments,
    activeTab,
    unified,
    routeAndSubmitPrompt,
  ]);

  const handleQuickStart = useCallback(async (item) => {
    const payload = typeof item === "string"
      ? { prompt: item, label: "quick_start", mode: chat.activeMode }
      : item;

    if (payload?.mode) {
      handleModeChange(payload.mode);
    }

    track("quickstart_clicked", {
      label: payload?.label || "quick_start",
      mode: payload?.mode || chat.activeMode,
    });

    await handlePromptSubmit(null, payload?.prompt || "");
  }, [chat.activeMode, handleModeChange, handlePromptSubmit, track]);

  const handleInstallCommunityMode = useCallback(async (mode) => {
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
      notify({ message: `Expert "${mode.label}" installed`, type: "success" });
    } catch (err) {
      notify({ message: "Failed to install expert", type: "error" });
    }
  }, [user, notify]);

  const handleSaveCustomMode = useCallback(async (data) => {
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
        } catch (e) {
          // ignore best-effort delete
        }
      }

      notify({ message: "Custom expert saved", type: "success" });
      setCustomModeModalOpen(false);
      setEditingCustomMode(null);
    } catch (err) {
      notify({ message: "Failed to save custom expert", type: "error" });
    }
  }, [editingCustomMode, notify, user]);

  const handleFileUpload = useCallback((e) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachments((prev) => [
          ...prev,
          {
            name: file.name,
            type: file.type,
            size: file.size,
            data: reader.result,
            isImage: file.type.startsWith("image/"),
          },
        ]);
      };

      if (file.type.startsWith("image/")) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
    });
  }, []);

  const handleOpenScript = useCallback(async (script) => {
    if (!isPremium) {
      setProNudgeReason("Saved Scripts Library");
      setShowProNudge(true);
      return;
    }

    if (script.type === "ui") {
      setActiveTab("chat");
      const uid = user?.uid;
      if (!uid) return;

      const snap = await getDocs(
        query(
          collection(db, "users", uid, "scripts", script.id, "versions"),
          orderBy("versionNumber", "desc"),
          limit(1)
        )
      );

      if (!snap.empty) {
        const data = snap.docs[0].data();
        ui.setActiveUiId(script.id);
        ui.setUiGenerations((prev) =>
          prev.some((g) => g.id === script.id)
            ? prev
            : [
                {
                  id: script.id,
                  uiModuleLua: data.uiModuleLua || data.code,
                  systemsLua: data.systemsLua || "",
                  boardState: data.boardState || null,
                  prompt: script.title,
                  createdAt: Date.now(),
                },
                ...prev,
              ]
        );
        ui.setUiDrawerOpen(true);
      }
    } else {
      setActiveTab("chat");
      notify({ message: "Opening script", type: "info" });
    }
  }, [isPremium, notify, ui, user]);

  const handlePlanUi = useCallback(() => {
    chat.updateChatMode(chat.currentChatId, "ui");
    chat.setChatMode("plan");
    setPrompt("Help me plan a UI: screens, layout, and main components.");
  }, [chat]);

  const handlePlanSystem = useCallback(() => {
    const switched = handleModeChange("system");
    if (!switched) return;
    chat.setChatMode("plan");
    setPrompt("Help me plan a system: services, remotes, and data flow.");
  }, [chat, handleModeChange]);

  const handleToggleActMode = useCallback(async (message) => {
    const isGeneral = chat.activeMode === "general";

    if (isGeneral) {
      const targetMode = inferTargetModeFromMessage(message);
      chat.startNewChat();
      chat.setActiveMode(targetMode);
      chat.setChatMode("act");

      notify({
        message: `Context transferred to ${CHAT_MODES.find((m) => m.id === targetMode)?.label || targetMode}`,
        type: "success",
      });

      const compactContext = buildCompactActContext(
        chat.messages,
        message?.prompt || message?.content || "",
        { maxTurns: 6 }
      );

      const cmd = targetMode === "ui" ? "/ui " : "/logic ";
      await handlePromptSubmit(null, `${cmd}${compactContext}`);
      return;
    }

    chat.setChatMode("act");
    if (message?.projectId && message?.metadata?.type === "ui") {
      await ui.handleRefine(message.prompt || message.content);
      track("artifact_action_used", { action: "act_refine" });
      return;
    }

    await handlePromptSubmit(null, message?.prompt || message?.content || "");
  }, [chat, handlePromptSubmit, notify, track, ui]);

  const handleOpenPreview = useCallback(() => {
    if (!ui.activeUi && !ui.uiGenerations.length) {
      notify({ message: "Generate or open a UI first to use preview", type: "info" });
      return;
    }
    ui.setUiDrawerOpen(true);
    if (isMobile) setMobileTab("preview");
    track("artifact_action_used", { action: "open_preview" });
  }, [isMobile, notify, track, ui]);

  const handleClosePreview = useCallback(() => {
    ui.setUiDrawerOpen(false);
    if (isMobile) setMobileTab("chat");
  }, [isMobile, ui]);

  const handlePreviewToggle = useCallback(() => {
    if (ui.uiDrawerOpen) {
      handleClosePreview();
      return;
    }
    handleOpenPreview();
  }, [handleClosePreview, handleOpenPreview, ui.uiDrawerOpen]);

  return {
    billing: {
      plan,
      planKey,
      totalRemaining,
      subLimit,
      resetsAt,
      isPremium,
      entitlements,
    },
    navigation: {
      navigate,
      location,
    },
    uiState: {
      user,
      isMobile,
      sidebarOpen,
      activeTab,
      mobileTab,
      prompt,
      attachments,
      scripts,
      projectContext,
      architecturePanelOpen,
      teams,
      customModeModalOpen,
      editingCustomMode,
      showSignInNudge,
      showProNudge,
      proNudgeReason,
      codeDrawerOpen,
      codeDrawerData,
      currentTheme,
      activeModeData,
      composerSuggestions,
      currentToast,
      toasts,
    },
    refs: {
      chatEndRef,
    },
    modules: {
      chat,
      ui,
      game,
      scriptManager,
      unified,
      settings,
    },
    handlers: {
      setSidebarOpen,
      setActiveTab,
      setMobileTab,
      setPrompt,
      setAttachments,
      setArchitecturePanelOpen,
      setShowSignInNudge,
      setShowProNudge,
      setProNudgeReason,
      setCustomModeModalOpen,
      setEditingCustomMode,
      setCodeDrawerOpen,
      dismissToast,

      handleSidebarTabChange,
      handlePromptSubmit,
      handleFileUpload,
      handleModeChange,
      handleOpenScript,
      handlePlanUi,
      handlePlanSystem,
      handleToggleActMode,
      handleQuickStart,
      handleInstallCommunityMode,
      handleSaveCustomMode,
      handleOpenPreview,
      handleClosePreview,
      handlePreviewToggle,
      handleUiAudit,
      handleSuggestAssets,
      track,
      notify,
      emitAiEvent,
    },
  };
}

export default useAiWorkspaceController;
