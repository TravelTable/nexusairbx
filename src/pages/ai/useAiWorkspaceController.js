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
  doc,
} from "firebase/firestore";

import { auth, db } from "../../firebase";
import { useBilling } from "../../context/BillingContext";
import { useSettings } from "../../context/SettingsContext";
import { useUnifiedChat } from "../../hooks/useUnifiedChat";
import { useArtifactWorkspace } from "../../hooks/useArtifactWorkspace";
import { useGameProfile } from "../../hooks/useGameProfile";
import { useAiScripts } from "../../hooks/useAiScripts";
import { CHAT_MODES } from "../../components/ai/chatConstants";
import { AI_PAGE_V2_ENABLED, BACKEND_URL } from "../../config";
import { FEATURE_FLAGS } from "../../lib/featureFlags";
import { approveAgentStep, restoreAgentRun } from "../../lib/workflowApi";
import {
  getStudioApplyMode,
  getStudioEnabledPreference,
  setStudioApplyMode,
  setStudioEnabledPreference,
  upsertAgentStep,
} from "../../lib/agentSteps";
import { useStudioConnection } from "../../hooks/useStudioConnection";
import { AI_EVENTS, emitAiEvent, onAiEvent } from "../../lib/aiEvents";
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

export function useAiWorkspaceController() {
  const {
    plan,
    totalRemaining,
    subRemaining,
    paygRemaining,
    subLimit,
    resetsAt,
    refresh: refreshBilling,
    entitlements,
    isAdmin,
    unlimitedTokens,
    devOverride,
    flags,
  } = useBilling();
  const { settings, updateSettings } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState(null);
  const [scripts, setScripts] = useState([]);
  const [scriptsLimit] = useState(50);
  const [activeTab, setActiveTab] = useState("chat");
  // Mobile tabs: chat | files | code | details (no preview).
  const [mobileTab, setMobileTab] = useState("chat");
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth < 1024 : false);
  const [sidebarOpen, setSidebarOpen] = useState(typeof window !== "undefined" ? window.innerWidth > 1024 : true);

  const [prompt, setPrompt] = useState("");
  const [isImproving, setIsImproving] = useState(false);
  const [refineTarget, setRefineTarget] = useState(null);
  const [showSignInNudge, setShowSignInNudge] = useState(false);
  const [showProNudge, setShowProNudge] = useState(false);
  const [proNudgeReason, setProNudgeReason] = useState("");
  const [projectContext, setProjectContext] = useState(null);
  const [architecturePanelOpen, setArchitecturePanelOpen] = useState(false);
  const [teams, setTeams] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [codeDrawerOpen, setCodeDrawerOpen] = useState(false);
  const [codeDrawerData, setCodeDrawerData] = useState({ code: "", title: "", explanation: "" });
  const [studioEnabled, setStudioEnabled] = useState(() => getStudioEnabledPreference());
  const [studioApplyMode, setStudioApplyModeState] = useState(() => getStudioApplyMode());
  const [approvingStepId, setApprovingStepId] = useState(null);
  const [restoringRun, setRestoringRun] = useState(false);

  const studioConnection = useStudioConnection();

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

  const unified = useUnifiedChat(user, settings, refreshBilling, notify, {
    onSignInNudge: () => setShowSignInNudge(true),
    isPremium,
  });

  const chat = unified;
  const game = useGameProfile(settings, updateSettings);
  const scriptManager = useAiScripts(user, notify);

  const workspace = useArtifactWorkspace(chat.messages, {
    isGenerating: unified.isGenerating,
    generationStage: unified.generationStage,
    pendingMessage: unified.pendingMessage,
  });

  const activeModeData = useMemo(
    () => CHAT_MODES.find((m) => m.id === chat.activeMode) || CHAT_MODES[0],
    [chat.activeMode]
  );

  const currentTheme = useMemo(
    () => MODE_COLORS[chat.activeMode] || MODE_COLORS.general,
    [chat.activeMode]
  );

  const track = useCallback((event, metadata = {}) => {
    telemetryRef.current?.track({
      event,
      chatId: chat.currentChatId || undefined,
      mode: chat.activeMode,
      surface: "ai_page",
      metadata,
    });
  }, [chat.activeMode, chat.currentChatId]);

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
      (m) => m.role === "assistant" && (m.projectId || m.artifactId || m.code || (Array.isArray(m.files) && m.files.length))
    );
    if (!last || last.id === lastArtifactTrackedRef.current) return;

    lastArtifactTrackedRef.current = last.id;
    track("artifact_generated", {
      artifactType: last.metadata?.type || (Array.isArray(last.files) && last.files.length ? "project" : "script"),
      fileCount: Array.isArray(last.files) ? last.files.length : 1,
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
      if (!code) return;
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

  const handlePromptSubmit = useCallback(async (e, overridePrompt = null) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault();

    const currentPrompt = (overridePrompt ?? prompt).trim();
    const currentAttachments = [...attachments];

    if (!currentPrompt && currentAttachments.length === 0) return;

    if (activeTab !== "chat") setActiveTab("chat");
    if (isMobile) setMobileTab("chat");
    setPrompt("");
    setAttachments([]);

    if (refineTarget) {
      const target = refineTarget;
      setRefineTarget(null);
      track("artifact_action_used", { action: "refine_submit" });
      await unified.refineArtifact(target, currentPrompt);
      return;
    }

    track("prompt_submitted", {
      attachments: currentAttachments.length,
      length: currentPrompt.length,
    });

    await unified.handleSubmit(currentPrompt, currentAttachments);
  }, [
    prompt,
    attachments,
    activeTab,
    isMobile,
    refineTarget,
    unified,
    track,
  ]);

  const handleStartRefine = useCallback((message) => {
    setRefineTarget(message || null);
    setActiveTab("chat");
    if (isMobile) setMobileTab("chat");
  }, [isMobile]);

  const cancelRefine = useCallback(() => setRefineTarget(null), []);

  const handleOpenArtifact = useCallback((message) => {
    if (message?.id) workspace.openArtifact(message.id);
    if (isMobile) setMobileTab("code");
    track("artifact_action_used", { action: "open_in_editor" });
  }, [workspace, isMobile, track]);

  const handleImprovePrompt = useCallback(async () => {
    const current = prompt.trim();
    if (!current) {
      notify({ message: "Type a prompt first to improve it", type: "info" });
      return;
    }
    if (!user) {
      setShowSignInNudge(true);
      return;
    }
    if (isImproving) return;

    setIsImproving(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${BACKEND_URL}/api/ai/improve-prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ prompt: current, gameSpec: settings?.gameSpec || "" }),
      });
      if (!res.ok) throw new Error("Improve prompt request failed");
      const data = await res.json();
      const improved = (data?.improvedPrompt || "").trim();
      if (improved && improved !== current) {
        setPrompt(improved);
        notify({ message: "Prompt improved — review and edit before sending", type: "success" });
        track("prompt_improved", { fromLength: current.length, toLength: improved.length });
      } else {
        notify({ message: "Prompt already looks good", type: "info" });
      }
    } catch (err) {
      notify({ message: "Couldn't improve prompt, try again", type: "error" });
    } finally {
      setIsImproving(false);
    }
  }, [prompt, user, isImproving, settings, notify, track]);

  const handleQuickStart = useCallback(async (item) => {
    const promptText = typeof item === "string" ? item : item?.prompt || "";
    track("quickstart_clicked", { length: promptText.length });
    await handlePromptSubmit(null, promptText);
  }, [handlePromptSubmit, track]);

  const handleEditPlan = useCallback((message) => {
    setPrompt(message?.originPrompt || "");
  }, []);

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

  const handleStudioEnabledChange = useCallback((enabled) => {
    setStudioEnabled(enabled);
    setStudioEnabledPreference(enabled);
  }, []);

  const handleStudioApplyModeChange = useCallback((mode) => {
    setStudioApplyModeState(mode);
    setStudioApplyMode(mode);
  }, []);

  const handleApproveStep = useCallback(
    async (step) => {
      const runId = unified.pendingMessage?.runId || workspace.agentRun?.runId;
      if (!runId || !step?.id || !user) return;
      setApprovingStepId(step.id);
      try {
        const result = await approveAgentStep(runId, step.id);
        const updated = result?.step;
        if (updated && unified.setPendingMessage) {
          unified.setPendingMessage((prev) => {
            if (!prev) return prev;
            return { ...prev, steps: upsertAgentStep(prev.steps || [], updated) };
          });
        }
        notify({ message: "Studio step approved", type: "success" });
      } catch (err) {
        notify({ message: err?.message || "Could not approve step", type: "error" });
      } finally {
        setApprovingStepId(null);
      }
    },
    [unified, workspace.agentRun?.runId, user, notify]
  );

  const handleRestoreRun = useCallback(
    async (runId) => {
      if (!runId || !user || restoringRun) return;
      setRestoringRun(true);
      try {
        await restoreAgentRun(runId);
        notify({ message: "Queued Studio snapshot restore", type: "success" });
      } catch (err) {
        notify({ message: err?.message || "Could not restore snapshots", type: "error" });
      } finally {
        setRestoringRun(false);
      }
    },
    [user, restoringRun, notify]
  );

  return {
    billing: {
      plan,
      planKey,
      totalRemaining,
      subRemaining,
      paygRemaining,
      subLimit,
      resetsAt,
      isPremium,
      isAdmin,
      unlimitedTokens,
      devOverride,
      flags,
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
      isImproving,
      refineTarget,
      attachments,
      scripts,
      projectContext,
      architecturePanelOpen,
      teams,
      showSignInNudge,
      showProNudge,
      proNudgeReason,
      codeDrawerOpen,
      codeDrawerData,
      currentTheme,
      activeModeData,
      currentToast,
      toasts,
    },
    refs: {
      chatEndRef,
    },
    modules: {
      chat,
      game,
      scriptManager,
      unified,
      workspace,
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
      setCodeDrawerOpen,
      dismissToast,
      updateSettings,

      handlePromptSubmit,
      onApprovePlan: unified.approvePlan,
      onClarifySubmit: unified.submitClarifyAnswers,
      onRefineArtifact: unified.refineArtifact,
      handleStartRefine,
      cancelRefine,
      handleOpenArtifact,
      handleImprovePrompt,
      handleEditPlan,
      handleFileUpload,
      handleQuickStart,
      track,
      notify,
      emitAiEvent,

      handleApproveStep,
      handleRestoreRun,
      handleStudioEnabledChange,
      handleStudioApplyModeChange,
    },
    studio: {
      connected: studioConnection.connected,
      loading: studioConnection.loading,
      sessionId: studioConnection.sessionId,
      enabled: studioEnabled,
      applyMode: studioApplyMode,
      approvingStepId,
      restoringRun,
      unifiedAgent: FEATURE_FLAGS.unifiedAgent,
    },
  };
}

export default useAiWorkspaceController;
