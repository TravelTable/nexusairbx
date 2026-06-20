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
  updateDoc,
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
import { approveAgentStep, getAgentRun, restoreAgentRun } from "../../lib/workflowApi";
import {
  DESTRUCTIVE_TOOL_TYPES,
  getStudioApplyMode,
  getStudioEnabledPreference,
  setStudioApplyMode,
  setStudioEnabledPreference,
  upsertAgentStep,
} from "../../lib/agentSteps";
import { useStudioConnection } from "../../hooks/useStudioConnection";
import { getStudioStatus } from "../../lib/studioBridgeApi";
import { AI_EVENTS, emitAiEvent, onAiEvent } from "../../lib/aiEvents";
import { createAiTelemetryClient } from "../../lib/aiTelemetry";
import { useAiNotifications } from "./useAiNotifications";
import { saveWorkspaceArtifact } from "../../lib/artifactWorkspaceApi";
import { getRobloxOAuthStatus } from "../../lib/robloxOAuthApi";
import { useProjectAssets } from "../../hooks/useProjectAssets";

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
  const [robloxStatus, setRobloxStatus] = useState(null);
  const [robloxLoading, setRobloxLoading] = useState(false);
  const [assetLibraryOpen, setAssetLibraryOpen] = useState(false);
  const [approvingStepId, setApprovingStepId] = useState(null);
  const [restoringRun, setRestoringRun] = useState(false);
  const [chatProjectSnapshot, setChatProjectSnapshot] = useState(null);

  const studioConnection = useStudioConnection();

  const refreshRobloxStatus = useCallback(async () => {
    if (!user) {
      setRobloxStatus(null);
      return;
    }
    setRobloxLoading(true);
    try {
      const status = await getRobloxOAuthStatus();
      setRobloxStatus(status);
    } catch (_) {
      setRobloxStatus({ connected: false });
    } finally {
      setRobloxLoading(false);
    }
  }, [user]);

  const chatEndRef = useRef(null);
  const pageViewTrackedRef = useRef(false);
  const lastArtifactTrackedRef = useRef(null);
  const telemetryRef = useRef(null);
  const firstStudioMutationTrackedRef = useRef(false);

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
  const selectedAssetProjectId = chat.currentChatId || null;
  const projectAssets = useProjectAssets(selectedAssetProjectId, {
    enabled: Boolean(user && selectedAssetProjectId),
    notify,
  });

  const workspace = useArtifactWorkspace(chat.messages, {
    isGenerating: unified.isGenerating,
    generationStage: unified.generationStage,
    pendingMessage: unified.pendingMessage,
    projectSnapshot: chatProjectSnapshot,
  });

  const activeModeData = useMemo(
    () => CHAT_MODES.find((m) => m.id === chat.activeMode) || CHAT_MODES[0],
    [chat.activeMode]
  );

  const assetProjectId = useMemo(() => {
    const latest = [...(chat.messages || [])].reverse().find((m) => m?.projectId || m?.metadata?.projectId);
    return latest?.projectId || latest?.metadata?.projectId || chatProjectSnapshot?.projectId || null;
  }, [chat.messages, chatProjectSnapshot]);

  const currentTheme = useMemo(
    () => MODE_COLORS[chat.activeMode] || MODE_COLORS.general,
    [chat.activeMode]
  );

  const hasAppliedStudioMutation = useMemo(() => {
    const stepLists = [];
    if (Array.isArray(workspace.agentRun?.steps)) stepLists.push(workspace.agentRun.steps);
    if (Array.isArray(unified.pendingMessage?.steps)) stepLists.push(unified.pendingMessage.steps);
    (chat.messages || []).forEach((message) => {
      if (Array.isArray(message?.steps)) stepLists.push(message.steps);
    });
    return stepLists.flat().some(
      (step) => DESTRUCTIVE_TOOL_TYPES.has(String(step?.type || "")) && String(step?.status || "") === "succeeded"
    );
  }, [chat.messages, unified.pendingMessage?.steps, workspace.agentRun?.steps]);

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
    if (!hasAppliedStudioMutation || firstStudioMutationTrackedRef.current) return;
    firstStudioMutationTrackedRef.current = true;
    track("first_studio_mutation_succeeded", {});
  }, [hasAppliedStudioMutation, track]);

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
    refreshRobloxStatus();
  }, [refreshRobloxStatus]);

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
    if (!user || !chat.currentChatId) {
      setChatProjectSnapshot(null);
      return undefined;
    }

    const ref = doc(db, "users", user.uid, "chats", chat.currentChatId, "project", "current");
    return onSnapshot(
      ref,
      (snap) => {
        setChatProjectSnapshot(snap.exists() ? { id: snap.id, ...snap.data() } : null);
      },
      () => {
        setChatProjectSnapshot(null);
      }
    );
  }, [user, chat.currentChatId]);

  useEffect(() => {
    if (!location?.state || typeof location.state !== "object") return;

    const nextState = { ...location.state };
    let shouldReplace = false;

    if (location.state.initialPrompt) {
      setPrompt(location.state.initialPrompt);
      delete nextState.initialPrompt;
      delete nextState.aiResult;
      shouldReplace = true;
    }

    if (!shouldReplace) return;

    const nextKeys = Object.keys(nextState);
    navigate(
      {
        pathname: location.pathname,
        search: location.search,
        hash: location.hash,
      },
      {
        replace: true,
        state: nextKeys.length ? nextState : null,
      }
    );
  }, [location, navigate]);

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

  useEffect(() => {
    if (!user || !studioConnection.connected || !studioConnection.sessionId) return;
    if (settings?.lastAuthorizedStudioSessionId === studioConnection.sessionId) return;
    updateSettings({
      studioAutoPushEnabled: true,
      studioAutoPushPolicy: settings?.studioAutoPushPolicy || "after_validation",
      lastAuthorizedStudioSessionId: studioConnection.sessionId,
    }).catch(() => {});
  }, [
    user,
    studioConnection.connected,
    studioConnection.sessionId,
    settings?.lastAuthorizedStudioSessionId,
    settings?.studioAutoPushPolicy,
    updateSettings,
  ]);

  useEffect(() => {
    if (!user || studioConnection.loading) return;
    const savedSessionId = settings?.lastAuthorizedStudioSessionId;
    if (!savedSessionId) return;
    if (studioConnection.connected && studioConnection.sessionId === savedSessionId) return;

    getStudioStatus()
      .then(({ sessions }) => {
        const stillExists = (sessions || []).some((session) => session.id === savedSessionId);
        if (!stillExists) {
          updateSettings({ lastAuthorizedStudioSessionId: null }).catch(() => {});
        }
      })
      .catch(() => {});
  }, [
    user,
    studioConnection.loading,
    studioConnection.connected,
    studioConnection.sessionId,
    settings?.lastAuthorizedStudioSessionId,
    updateSettings,
  ]);

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
      await unified.refineArtifact(target, currentPrompt, workspace.projectArtifactSnapshot);
      return;
    }

    track("prompt_submitted", {
      attachments: currentAttachments.length,
      length: currentPrompt.length,
    });

    await unified.handleSubmit(currentPrompt, currentAttachments, workspace.projectArtifactSnapshot);
  }, [
    prompt,
    attachments,
    activeTab,
    isMobile,
    refineTarget,
    unified,
    workspace.projectArtifactSnapshot,
    track,
  ]);

  useEffect(() => {
    if (!user || !workspace.activeArtifactSnapshot?.artifactId) return undefined;
    const timer = window.setTimeout(() => {
      saveWorkspaceArtifact(workspace.activeArtifactSnapshot, "workspace").catch(() => {});
    }, 400);
    return () => window.clearTimeout(timer);
  }, [user, workspace.activeArtifactSnapshot]);

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

  const handleStudioAutoPushEnabledChange = useCallback((enabled) => {
    updateSettings({
      studioAutoPushEnabled: Boolean(enabled),
    }).catch(() => {});
  }, [updateSettings]);

  const handleStudioAutoPushPolicyChange = useCallback((policy) => {
    const nextPolicy = ["after_validation", "after_playtest", "manual_only"].includes(policy)
      ? policy
      : "after_validation";
    updateSettings({
      studioAutoPushPolicy: nextPolicy,
    }).catch(() => {});
  }, [updateSettings]);

  const handleRobloxAssetUploadsEnabledChange = useCallback(async (enabled) => {
    if (!selectedAssetProjectId) {
      notify({ message: "Open or create a chat before enabling generated asset uploads", type: "info" });
      return;
    }
    try {
      await projectAssets.setAutoUploadEnabled(Boolean(enabled));
      updateSettings({ robloxAssetUploadsEnabled: Boolean(enabled) }).catch(() => {});
    } catch (_) {
      // The project asset hook already surfaces the backend's typed error.
    }
  }, [notify, projectAssets, selectedAssetProjectId, updateSettings]);

  const handleOpenAssetLibrary = useCallback(() => {
    if (!user) {
      setShowSignInNudge(true);
      return;
    }
    if (!selectedAssetProjectId) {
      notify({ message: "Open or create a chat before selecting assets", type: "info" });
      return;
    }
    if (robloxStatus?.connected !== true) {
      notify({ message: "Connect Roblox before selecting assets", type: "info" });
      return;
    }
    setAssetLibraryOpen(true);
  }, [notify, robloxStatus?.connected, selectedAssetProjectId, user]);

  const handleConfirmProjectAssets = useCallback(async (assets) => {
    await projectAssets.attachAssets(assets);
  }, [projectAssets]);

  const syncAgentRunSteps = useCallback(
    async (runId, fallbackStep = null) => {
      if (!runId || !user) return;
      let steps = fallbackStep ? [fallbackStep] : [];
      try {
        const result = await getAgentRun(runId);
        steps = Array.isArray(result?.run?.steps) ? result.run.steps : steps;
      } catch (_) {
        // The approving/restoring call already succeeded; stale UI is non-fatal.
      }

      if (!steps.length) return;

      if (unified.setPendingMessage) {
        unified.setPendingMessage((prev) => {
          if (!prev?.runId || prev.runId !== runId) return prev;
          return { ...prev, steps, runId };
        });
      }

      const targetMessage = [...(chat.messages || [])]
        .reverse()
        .find((m) => m.role === "assistant" && m.runId === runId);
      if (targetMessage?.id && chat.currentChatId) {
        await updateDoc(doc(db, "users", user.uid, "chats", chat.currentChatId, "messages", targetMessage.id), {
          steps,
          runId,
        }).catch(() => {});
      }
    },
    [chat.currentChatId, chat.messages, unified, user]
  );

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
        await syncAgentRunSteps(runId, updated);
        notify({ message: "Studio step approved", type: "success" });
      } catch (err) {
        notify({ message: err?.message || "Could not approve step", type: "error" });
      } finally {
        setApprovingStepId(null);
      }
    },
    [unified, workspace.agentRun?.runId, user, syncAgentRunSteps, notify]
  );

  const handleRestoreRun = useCallback(
    async (runId) => {
      if (!runId || !user || restoringRun) return;
      setRestoringRun(true);
      try {
        const result = await restoreAgentRun(runId);
        await syncAgentRunSteps(runId, result?.step || null);
        notify({ message: "Queued Studio snapshot restore", type: "success" });
      } catch (err) {
        notify({ message: err?.message || "Could not restore snapshots", type: "error" });
      } finally {
        setRestoringRun(false);
      }
    },
    [user, restoringRun, syncAgentRunSteps, notify]
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
      onApprovePlan: (message) => unified.approvePlan(message, workspace.projectArtifactSnapshot),
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
      handleStudioAutoPushEnabledChange,
      handleStudioAutoPushPolicyChange,
      handleRobloxAssetUploadsEnabledChange,
      handleOpenAssetLibrary,
      handleCloseAssetLibrary: () => setAssetLibraryOpen(false),
      handleConfirmProjectAssets,
      handleRemoveProjectAsset: projectAssets.removeAsset,
    },
    studio: {
      connected: studioConnection.connected,
      loading: studioConnection.loading,
      sessionId: studioConnection.sessionId,
      refresh: studioConnection.refresh,
      enabled: studioEnabled,
      applyMode: studioApplyMode,
      autoPushEnabled: Boolean(settings?.studioAutoPushEnabled),
      autoPushPolicy: settings?.studioAutoPushPolicy || "after_validation",
      lastAuthorizedSessionId: settings?.lastAuthorizedStudioSessionId || null,
      approvingStepId,
      restoringRun,
      unifiedAgent: FEATURE_FLAGS.unifiedAgent,
    },
    roblox: {
      connected: robloxStatus?.connected === true,
      loading: robloxLoading,
      selectedCreator: robloxStatus?.connection?.selectedCreator || null,
      uploadAvailable: Boolean(projectAssets.uploadSettings?.available),
      uploadState: projectAssets.uploadSettings?.state || "disabled",
      uploadDisabledReason: (projectAssets.uploadSettings?.missingRequirements || [])[0]?.message || "",
      assetUploadsEnabled: Boolean(projectAssets.uploadSettings?.enabled),
      status: robloxStatus,
      assetProjectId,
      selectedAssetProjectId,
      selectedAssets: projectAssets.assets,
      projectAssetSaving: projectAssets.saving,
      projectAssetLoading: projectAssets.loading,
      assetLibraryOpen,
      assetLibraryAvailable: Boolean(user && selectedAssetProjectId && robloxStatus?.connected === true),
      assetLibraryDisabledReason: !user
        ? "Sign in before selecting Roblox assets."
        : !selectedAssetProjectId
          ? "Open or create a chat before selecting assets."
          : robloxStatus?.connected !== true
            ? "Connect Roblox before selecting assets."
            : "",
      uploadStatus: projectAssets.uploadStatus,
      refresh: refreshRobloxStatus,
    },
  };
}

export default useAiWorkspaceController;
