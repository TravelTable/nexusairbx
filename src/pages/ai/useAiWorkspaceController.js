import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

import { appCheckReady as firebaseAppCheckReady, auth, db } from "../../firebase";
import { useBilling } from "../../context/BillingContext";
import { useSettings } from "../../context/SettingsContext";
import { useUnifiedChat } from "../../hooks/useUnifiedChat";
import { useArtifactWorkspace } from "../../hooks/useArtifactWorkspace";
import { resolveGameSpecForPrompt } from "../../lib/gameProfile";
import { useAiScripts } from "../../hooks/useAiScripts";
import { CHAT_MODES } from "../../components/ai/chatConstants";
import { BACKEND_URL } from "../../config";
import { authedFetch } from "../../lib/billing";
import { isRetryableApiError, readJsonResponse, withApiRetryCooldown } from "../../lib/apiErrors";
import { FEATURE_FLAGS } from "../../lib/featureFlags";
import {
  approveAgentStep,
  cancelAgentRun,
  getAgentRun,
  restoreAgentRun,
  restoreChatCheckpoint,
  selectAgentStudioTarget,
} from "../../lib/workflowApi";
import {
  CHAT_OPERATION_STATUS,
  ChatOperationCoordinator,
} from "../../lib/chatOperationCoordinator";
import {
  AgentRuntimeUnavailableError,
  cancelAgentRunV2,
  getAgentRunV2,
} from "../../lib/agentRuntimeV2Api";
import {
  getStudioApplyMode,
  getStudioEnabledPreference,
  setStudioApplyMode,
  setStudioEnabledPreference,
  upsertAgentStep,
} from "../../lib/agentSteps";
import { useStudioConnection } from "../../hooks/useStudioConnection";
import { applyArtifactToStudio, getStudioStatus } from "../../lib/studioBridgeApi";
import {
  getStudioConnectionType,
  getStudioSessionId,
  isStudioSessionLive,
  STUDIO_CONNECTION_TYPES,
} from "../../lib/studioConnection";
import {
  buildProjectBindingPayloadFromIdentity,
  buildStudioTargetPreference,
  canBindStudioTargetToProject,
  evaluateStudioPlaceGate,
  evaluateStudioSubmissionPreflight,
  normalizeStudioTargetOption,
  readChatStudioPreference,
  targetingOptionsFromStatus,
} from "../../lib/studioPlaceBinding";
import { restoreFailedPromptDraft } from "../../lib/promptDraftRecovery";
import {
  findOrCreateProjectBinding,
  getProjectBinding,
  projectBindingRecoveryMessage,
  PROJECT_RESOLUTION_STATES,
} from "../../lib/projectBindingsApi";
import {
  isFirestorePermissionDenied,
  resolveAwaitingStudioTargetRunId,
  resumeStudioTargetSelection,
} from "../../lib/studioTargetSelection";
import { AI_EVENTS, emitAiEvent, onAiEvent } from "../../lib/aiEvents";
import { useAiNotifications } from "./useAiNotifications";
import { useStarterPromo } from "../../hooks/useStarterPromo";
import {
  getRobloxOAuthStatus,
  beginCreatorStoreReauthorization,
  isCreatorStoreReadAuthorized,
  readPendingRobloxAction,
  clearPendingRobloxAction,
} from "../../lib/robloxOAuthApi";
import { useProjectAssets } from "../../hooks/useProjectAssets";
import { useRobloxImageUpload, isRobloxDecalImage } from "../../hooks/useRobloxImageUpload";
import { useWorkspaceArtifactPersistence } from "../../hooks/useWorkspaceArtifactPersistence";
import { createImprovePromptError, formatImprovePromptErrorMessage } from "../../lib/aiPromptErrors";
import {
  consumeGenerationIntent,
  restoreGenerationIntent,
} from "../../lib/generationIntent";
import { resolveInitialGeneratorMode } from "../../lib/experiments";
import { categorizePrompt, trackProductEvent } from "../../lib/productAnalytics";
import {
  createQuickScriptIdempotencyKey,
  generateQuickScript,
  claimQuickScriptResult,
  saveQuickScriptProject,
  upgradeQuickScriptProjectToAgent,
} from "../../lib/quickScriptApi";
import {
  loadQuickScriptSession,
  saveQuickScriptSession,
  quickScriptResultToAgentPrompt,
  normalizeQuickScriptResult,
} from "../../lib/quickScriptSession";
import { buildBaseArtifactSnapshot } from "../../lib/artifactState";
import {
  PENDING_AUTH_ACTIONS,
  actionLabel,
  clearCompletedPendingAuthAction,
  completePendingAuthAction,
  consumeExpiredPendingAuthAction,
  createPendingAuthAction,
  markPendingAuthActionInProgress,
  readCompletedPendingAuthAction,
  readPendingAuthAction,
} from "../../lib/pendingAuthAction";
import { normalizeChatAttachments } from "../../lib/chatAttachments";
import {
  sanitizeChatWritePayload,
  sanitizeTranscriptMessagePayload,
} from "../../lib/firestorePayloads";
import { normalizeRobloxPlaceId } from "../../lib/robloxPlaceId";
import { normalizeAuthoritativeRunStatus } from "../../lib/runCancellation";

const MODE_COLORS = {
  general: { primary: "var(--ds-accent)", secondary: "var(--ds-plan)" },
  ui: { primary: "var(--ds-accent)", secondary: "var(--ds-plan)" },
  logic: { primary: "var(--ds-plan)", secondary: "var(--ds-info)" },
  system: { primary: "var(--ds-info)", secondary: "var(--ds-accent)" },
  animator: { primary: "var(--ds-plan)", secondary: "var(--ds-warning)" },
  data: { primary: "var(--ds-warning)", secondary: "var(--ds-info)" },
  performance: { primary: "var(--ds-accent)", secondary: "var(--ds-info)" },
  security: { primary: "var(--ds-danger)", secondary: "var(--ds-plan)" },
};

const TERMINAL_CHAT_RUN_STATUSES = new Set([
  "succeeded",
  "completed",
  "failed",
  "cancelled",
  "canceled",
  "blocked",
  "iteration_limit",
  "timed_out",
]);

function isTerminalChatRunStatus(status) {
  return TERMINAL_CHAT_RUN_STATUSES.has(String(status || "").toLowerCase());
}

async function waitForAgentRunTerminal(runId, { attempts = 20, readRun = getAgentRun } = {}) {
  let latest = null;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      latest = await readRun(runId);
      if (isTerminalChatRunStatus(latest?.run?.status)) return latest;
    } catch (error) {
      // Cancellation is already idempotently registered. A transient status
      // read must not let the stopped operation regain transcript ownership.
    }
    await new Promise((resolve) => {
      setTimeout(resolve, Math.min(300 + (attempt * 100), 1200));
    });
  }
  return latest;
}

async function cancelCoordinatedAgentRun(operation, chatId = null) {
  const runId = String(operation?.runId || "").trim();
  if (!runId) return null;
  const operationId = String(operation?.id || `run:${runId}`);
  try {
    const result = await cancelAgentRunV2(runId, {
      reason: "user_cancelled",
      idempotencyKey: `${operationId}:cancel`,
      chatId: chatId || operation?.chatId || null,
    });
    await waitForAgentRunTerminal(runId, { readRun: getAgentRunV2 });
    return result;
  } catch (error) {
    const isUnavailable = error instanceof AgentRuntimeUnavailableError;
    const isMissingRun = error?.status === 404;
    if (!isUnavailable && !isMissingRun) throw error;
  }

  const result = await cancelAgentRun(runId, {
    idempotencyKey: `${operationId}:cancel:legacy`,
    chatId: chatId || operation?.chatId || null,
  });
  await waitForAgentRunTerminal(runId);
  return result;
}

function quickScriptKind(scriptType = "") {
  const type = String(scriptType || "").toLowerCase();
  if (type.includes("local")) return "client";
  if (type.includes("module")) return "module";
  if (type === "script" || type.includes("server")) return "server";
  return null;
}

function quickScriptArtifact(result) {
  if (
    !result?.code
    || result?.validation?.status === "blocked"
    || !["Script", "LocalScript", "ModuleScript"].includes(result?.scriptType)
    || !String(result?.studioLocation || "").trim()
  ) return null;
  const title = result.title || "Quick";
  const targetPath = String(result.targetPath || "").replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  const name = result.scriptName
    || targetPath.split("/").filter(Boolean).pop()
    || title.replace(/[^a-z0-9_-]+/gi, "_").replace(/^_+|_+$/g, "")
    || "QuickScript";
  const kind = quickScriptKind(result.scriptType);
  return {
    artifactId: `quick-script:${Date.now()}`,
    title,
    summary: "Focused Luau script generated by Quick.",
    files: [
      {
        id: "quick-script-file",
        name,
        path: targetPath || `${result.studioLocation}/${name}`,
        placement: result.studioLocation,
        className: result.scriptType,
        kind,
        language: "luau",
        content: result.code || "",
      },
    ],
  };
}

function downloadText(filename, text) {
  const blob = new Blob([text || ""], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function useAiWorkspaceController() {
  const {
    plan,
    totalRemaining,
    subRemaining,
    paygRemaining,
    subLimit,
    resetsAt,
    refresh: refreshBilling,
    loading: billingLoading,
    error: billingError,
    entitlements,
    isPremium,
    isStarterOrAbove,
    isAdmin,
    unlimitedTokens,
    devOverride,
    flags,
    dailyUsage,
    includedUsage,
    premiumBalance,
    isFreeUsagePlan,
  } = useBilling();
  const { settings, updateSettings } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [appCheckError, setAppCheckError] = useState(null);
  const [scripts, setScripts] = useState([]);
  const [scriptsLimit] = useState(50);
  const [activeTab, setActiveTab] = useState("chat");
  // Mobile tabs: chat | files | code | details (no preview).
  const [mobileTab, setMobileTab] = useState("chat");
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth < 1024 : false);
  const [sidebarOpen, setSidebarOpen] = useState(typeof window !== "undefined" ? window.innerWidth > 1024 : true);

  const [prompt, setPrompt] = useState("");
  const [rewindTarget, setRewindTarget] = useState(null); // { messageId, mode }
  const [generatorMode, setGeneratorModeState] = useState(() => (
    resolveInitialGeneratorMode({ restoredSession: loadQuickScriptSession() })
  ));
  const [quickScript, setQuickScript] = useState(() => {
    const restored = loadQuickScriptSession();
    const restoredResult = restored?.result ? normalizeQuickScriptResult(restored.result, restored?.prompt || "") : null;
    return {
      prompt: restored?.prompt || "",
      status: restored?.status || "idle",
      stage: restored?.stage || "Ready",
      result: restoredResult,
      error: restored?.error || null,
      claim: restored?.claim || null,
      anonymous: Boolean(restored?.anonymous),
      idempotencyKey: restored?.idempotencyKey || null,
      source: restored?.source || "direct",
      projectId: restored?.projectId || restored?.project?.projectId || null,
      project: restored?.project || null,
      updatedAt: restored?.updatedAt || Date.now(),
    };
  });
  const [isImproving, setIsImproving] = useState(false);
  const [refineTarget, setRefineTarget] = useState(null);
  const [showSignInNudge, setShowSignInNudge] = useState(false);
  const [signInNudgeReason, setSignInNudgeReason] = useState("");
  const [showProNudge, setShowProNudge] = useState(false);
  const [proNudgeReason, setProNudgeReason] = useState("");
  const [projectContext, setProjectContext] = useState(null);
  const [architecturePanelOpen, setArchitecturePanelOpen] = useState(false);
  const [teams, setTeams] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [codeDrawerOpen, setCodeDrawerOpen] = useState(false);
  const [codeDrawerData, setCodeDrawerData] = useState({ code: "", title: "", explanation: "" });
  const [pendingGenerationIntent, setPendingGenerationIntent] = useState(null);
  const [studioEnabled, setStudioEnabled] = useState(() => getStudioEnabledPreference());
  const [studioApplyMode, setStudioApplyModeState] = useState(() => getStudioApplyMode());
  const [robloxStatus, setRobloxStatus] = useState(null);
  const [robloxLoading, setRobloxLoading] = useState(false);
  const [assetLibraryOpen, setAssetLibraryOpen] = useState(false);
  const [approvingStepId, setApprovingStepId] = useState(null);
  const [selectingStudioTargetId, setSelectingStudioTargetId] = useState(null);
  const [studioPlacePickerOpen, setStudioPlacePickerOpen] = useState(false);
  // Optimistic place label for empty/new chats (no Firestore chat doc yet).
  const [optimisticStudioPlacePreference, setOptimisticStudioPlacePreference] = useState(null);
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
    } catch (err) {
      if (!isRetryableApiError(err)) {
        setRobloxStatus({ connected: false });
      }
    } finally {
      setRobloxLoading(false);
    }
  }, [user]);

  const chatEndRef = useRef(null);
  const pageViewTrackedRef = useRef(false);
  const restoredIntentIdRef = useRef(null);
  const autoIntentInFlightRef = useRef(null);
  const pendingAuthResumeRef = useRef(null);
  const pendingRobloxResumeRef = useRef(false);
  const runQuickScriptRef = useRef(null);
  const chatOperationCoordinatorRef = useRef(null);
  if (!chatOperationCoordinatorRef.current) {
    chatOperationCoordinatorRef.current = new ChatOperationCoordinator();
  }
  const [, setChatOperationRevision] = useState(0);

  useEffect(() => (
    chatOperationCoordinatorRef.current.subscribe(() => {
      setChatOperationRevision((revision) => revision + 1);
    })
  ), []);

  const {
    notify: queueNotify,
    toasts,
    currentToast,
    dismissToast,
  } = useAiNotifications();

  const notify = useCallback((payload) => {
    queueNotify(payload || {});
  }, [queueNotify]);

  const planKey = plan?.toLowerCase() || "free";

  const unified = useUnifiedChat(user, settings, refreshBilling, notify, {
    authReady,
    onSignInNudge: () => {
      createPendingAuthAction({
        action: PENDING_AUTH_ACTIONS.CHAT_SUBMIT,
        returnPath: "/ai",
        workspace: "agent_build",
        source: "agent_build_prompt",
        payload: {
          prompt,
          attachments: normalizeChatAttachments(attachments),
          chatMode: settings?.chatMode || "agent",
          modelVersion: settings?.modelVersion || "",
          generatorMode: "agent_build",
          promptCategory: categorizePrompt(prompt),
          actionLabel: actionLabel(PENDING_AUTH_ACTIONS.CHAT_SUBMIT),
        },
      });
      setSignInNudgeReason("Sign up to continue this workspace conversation and keep your generated work attached to your account.");
      setShowSignInNudge(true);
    },
    isPremium,
    isStarterOrAbove,
  });

  const starterPromo = useStarterPromo({
    blocking: false,
    isFreeUsagePlan,
    isSubscriber: isStarterOrAbove,
    dailyUsage,
    includedUsage,
    user,
    isGenerating: unified.isGenerating,
  });

  const chat = unified;
  const chatOperationKey = chat.currentChatId || "draft";
  const chatOperationState = chatOperationCoordinatorRef.current.snapshot(chatOperationKey);
  const scriptManager = useAiScripts(user, notify, { authReady });
  const selectedAssetProjectId = chat.currentChatId || null;
  const projectAssets = useProjectAssets(selectedAssetProjectId, {
    enabled: Boolean(user && selectedAssetProjectId),
    notify,
  });

  const robloxImageUpload = useRobloxImageUpload({
    user,
    robloxStatus,
    currentChatId: chat.currentChatId,
    openChatById: chat.openChatById,
    onRefreshProjectAssets: projectAssets.refresh,
    notify,
    onSignInRequired: () => setShowSignInNudge(true),
  });

  const workspace = useArtifactWorkspace(chat.messages, {
    isGenerating: unified.isGenerating,
    generationStage: unified.generationStage,
    pendingMessage: unified.pendingMessage,
    projectSnapshot: chatProjectSnapshot,
  });

  useEffect(() => {
    const pendingRun = unified.pendingMessage || workspace.agentRun || null;
    const runId = String(pendingRun?.runId || pendingRun?.id || "").trim();
    const rawStatus = pendingRun?.runStatus || pendingRun?.status || pendingRun?.metadata?.runState;
    const terminalStatus = normalizeAuthoritativeRunStatus(rawStatus, pendingRun);
    const chatId = chat.currentChatId;
    if (!chatId || !runId) return;

    const coordinator = chatOperationCoordinatorRef.current;
    const requestId = String(
      pendingRun?.operationId
      || pendingRun?.requestId
      || pendingRun?.clientMessageId
      || pendingRun?.metadata?.requestId
      || ""
    ).trim();
    const cancellationMarker = requestId
      ? (chat.messages || []).find((message) => (
          String(message?.requestId || "").trim() === requestId
          && message?.stage === "canceled"
          && message?.metadata?.cancellationPending === true
        ))
      : null;
    const cancelProjectedRun = async (operation) => {
      unified.cancelCurrentFlow?.();
      await cancelCoordinatedAgentRun(operation, chatId);
      await unified.reconcileCancelledRun?.(operation.runId, {
        chatId,
        requestId: operation.id,
      });
    };
    if (cancellationMarker && requestId) {
      if (terminalStatus === "canceled") {
        void unified.reconcileCancelledRun?.(runId, { chatId, requestId });
        coordinator.reconcile(chatId, { ...pendingRun, runId, status: rawStatus });
        return;
      }
      if (!terminalStatus) {
        coordinator.rememberCancellation({
          id: requestId,
          chatId,
          type: "submit",
          prompt: pendingRun?.prompt || "",
          onCancel: cancelProjectedRun,
        });
        coordinator.hydrate({
          id: requestId,
          chatId,
          type: "submit",
          status: CHAT_OPERATION_STATUS.RUNNING,
          prompt: pendingRun?.prompt || "",
          runId,
          onCancel: cancelProjectedRun,
        });
        return;
      }
    }
    if (terminalStatus) {
      coordinator.reconcile(chatId, { ...pendingRun, runId, status: rawStatus });
      return;
    }
    if (!unified.isGenerating && !rawStatus) return;
    if (coordinator.snapshot(chatId).active) return;

    coordinator.hydrate({
      id: pendingRun?.operationId || pendingRun?.requestId || `hydrated:${runId}`,
      chatId,
      type: "submit",
      status: CHAT_OPERATION_STATUS.RUNNING,
      prompt: pendingRun?.prompt || "",
      runId,
      onCancel: cancelProjectedRun,
    });
  }, [
    chat.currentChatId,
    unified,
    unified.isGenerating,
    unified.pendingMessage,
    workspace.agentRun,
    chat.messages,
  ]);
  const {
    isGenerating: unifiedIsGenerating,
    handleSubmit: submitUnifiedPrompt,
  } = unified;

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

  const track = useCallback((event, metadata = {}, options = {}) => {
    void trackProductEvent(event, {
      surface: "ai_page",
      generator_mode: metadata.generator_mode || (generatorMode === "quick_script" ? "quick_script" : chat.activeMode),
      ...metadata,
    }, options);
  }, [chat.activeMode, generatorMode]);

  const setGeneratorMode = useCallback((mode, source = "manual") => {
    const normalized = mode === "agent_build" ? "agent_build" : "quick_script";
    setGeneratorModeState((prev) => {
      if (prev === normalized) return prev;
      void trackProductEvent("generator_mode_selected", {
        surface: "ai_page",
        generator_mode: normalized,
        source,
      });
      return normalized;
    });
  }, []);

  useEffect(() => {
    saveQuickScriptSession({
      generatorMode,
      prompt: quickScript.prompt,
      status: quickScript.status === "generating" ? "idle" : quickScript.status,
      stage: quickScript.status === "generating" ? "Ready to retry" : quickScript.stage,
      result: quickScript.result,
      error: quickScript.error,
      claim: quickScript.claim,
      anonymous: quickScript.anonymous,
      idempotencyKey: quickScript.idempotencyKey,
      source: quickScript.source,
      projectId: quickScript.projectId,
      project: quickScript.project,
    });
  }, [generatorMode, quickScript]);

  useEffect(() => {
    if (pageViewTrackedRef.current) return;
    pageViewTrackedRef.current = true;
    track("ai_workspace_viewed", { landing_page: "/ai" }, { dedupeKey: "ai_workspace_viewed" });
  }, [track]);

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
    let cancelled = false;
    firebaseAppCheckReady.then(({ available, disabled, error }) => {
      if (cancelled) return;
      setAppCheckError(
        available || disabled
          ? null
          : (error || new Error("Firebase App Check is unavailable."))
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let disposed = false;
    let authChangeId = 0;

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      const changeId = ++authChangeId;
      setAuthReady(false);

      if (!firebaseUser) {
        setUser(null);
        setAuthReady(true);
        return;
      }

      // A user object alone is not sufficient proof that Firestore has a
      // usable credential. Refresh the ID token before exposing this user to
      // any Firestore hook, without logging the token itself.
      void firebaseUser.getIdToken(true)
        .then(() => {
          if (disposed || changeId !== authChangeId) return;
          setUser(firebaseUser);
          setAuthReady(true);
        })
        .catch((error) => {
          if (disposed || changeId !== authChangeId) return;
          console.error("Firebase Auth token unavailable", {
            code: error?.code,
            message: error?.message,
          });
          setUser(null);
          setAuthReady(true);
        });
    });

    return () => {
      disposed = true;
      unsubscribe();
    };
  }, []);

  // A restored Firebase session can take a moment to be verified on a fresh
  // /ai load. Clear a nudge that may have been opened while that session was
  // still resolving, rather than leaving a signed-in user behind a stale gate.
  useEffect(() => {
    if (!authReady || !user) return;
    setShowSignInNudge(false);
    setSignInNudgeReason("");
  }, [authReady, user]);

  useEffect(() => {
    refreshRobloxStatus();
  }, [refreshRobloxStatus]);

  useEffect(() => {
    if (!authReady || !user) {
      setScripts([]);
      return;
    }

    const q = query(
      collection(db, "users", user.uid, "scripts"),
      orderBy("updatedAt", "desc"),
      limit(scriptsLimit)
    );

    let cancelled = false;
    getDocs(q)
      .then((snap) => {
        if (cancelled) return;
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          updatedAt: d.data().updatedAt?.toMillis?.() || Date.now(),
          createdAt: d.data().createdAt?.toMillis?.() || Date.now(),
        }));
        setScripts(list);
      })
      .catch(() => {
        if (!cancelled) notify({ message: "Failed to load scripts library", type: "error" });
      });

    return () => {
      cancelled = true;
    };
  }, [authReady, user, scriptsLimit, notify, scriptManager.libraryRevision]);

  useEffect(() => {
    if (!authReady || !user?.uid || auth.currentUser?.uid !== user.uid || !chat.currentChatId) {
      setChatProjectSnapshot(null);
      return undefined;
    }

    const ref = doc(db, "users", user.uid, "chats", chat.currentChatId, "project", "current");
    let cancelled = false;
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (cancelled || auth.currentUser?.uid !== user.uid) return;
        setChatProjectSnapshot(snap.exists() ? { id: snap.id, ...snap.data() } : null);
      },
      () => {
        if (cancelled) return;
        setChatProjectSnapshot(null);
      }
    );
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [authReady, user?.uid, chat.currentChatId]);

  useEffect(() => {
    if (!location?.state || typeof location.state !== "object") return;

    const nextState = { ...location.state };
    let shouldReplace = false;

    if (location.state.generationIntentId) {
      const intentId = location.state.generationIntentId;
      const intent = restoreGenerationIntent(intentId);
      if (intent) {
        restoredIntentIdRef.current = intent.id;
        setPrompt(intent.prompt);
        setPendingGenerationIntent(intent);
        setGeneratorMode(intent.mode === "agent_build" || intent.mode === "agent" ? "agent_build" : "quick_script", "generation_intent");
        void trackProductEvent("generation_intent_restored", {
          surface: "ai_page",
          source: intent.source,
          mode: intent.mode,
          prompt_length: intent.prompt.length,
          prompt_category: categorizePrompt(intent.prompt),
        });
      }
      delete nextState.generationIntentId;
      shouldReplace = true;
    }

    if (location.state.initialPrompt) {
      setPrompt(location.state.initialPrompt);
      setGeneratorMode(location.state.generatorMode === "agent_build" ? "agent_build" : "quick_script", "location_state");
      delete nextState.initialPrompt;
      delete nextState.aiResult;
      delete nextState.generatorMode;
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
  }, [location, navigate, setGeneratorMode]);

  useEffect(() => {
    if (pendingGenerationIntent || restoredIntentIdRef.current) return;

    const intent = restoreGenerationIntent();
    if (!intent) return;

    restoredIntentIdRef.current = intent.id;
    setPrompt(intent.prompt);
    setPendingGenerationIntent(intent);
    setGeneratorMode(intent.mode === "agent_build" || intent.mode === "agent" ? "agent_build" : "quick_script", "generation_intent");
    void trackProductEvent("generation_intent_restored", {
      surface: "ai_page",
      source: intent.source,
      mode: intent.mode,
      prompt_length: intent.prompt.length,
      prompt_category: categorizePrompt(intent.prompt),
    });
  }, [pendingGenerationIntent, setGeneratorMode]);

  useEffect(() => {
    const unbindStartDraft = onAiEvent(AI_EVENTS.START_DRAFT, (event) => {
      const projectId = String(event?.detail?.projectId || "").trim();
      void chat.startNewChat({ projectId: projectId || null });
      setActiveTab("chat");
    });

    const unbindOpenCodeDrawer = onAiEvent(AI_EVENTS.OPEN_CODE_DRAWER, (e) => {
      const { code, title, explanation } = e.detail || {};
      if (!code) return;
      setCodeDrawerData({ code: code || "", title: title || "", explanation: explanation || "" });
      setCodeDrawerOpen(true);
    });

    const unbindSaveScript = onAiEvent(AI_EVENTS.SAVE_SCRIPT, async (e) => {
      if (!isStarterOrAbove) {
        starterPromo.notifyStarterGate("Saved Creations");
        return;
      }

      const { name, code } = e.detail || {};
      await scriptManager.handleCreateScript(name, code, "logic", chat.currentChatId, chat.currentChatMeta?.projectId || null);
      notify({ message: `Saved ${name} to creations`, type: "success" });
      track("project_saved", { output_type: "script" });
    });

    return () => {
      unbindStartDraft();
      unbindOpenCodeDrawer();
      unbindSaveScript();
    };
  }, [chat, isStarterOrAbove, notify, scriptManager, track, starterPromo]);

  useEffect(() => {
    if (!authReady || !user?.uid || auth.currentUser?.uid !== user.uid) {
      setProjectContext(null);
      setTeams([]);
      return undefined;
    }

    const uid = user.uid;
    let cancelled = false;
    const unsubUser = onSnapshot(doc(db, "users", uid), (snap) => {
      if (cancelled || auth.currentUser?.uid !== uid) return;
      if (snap.exists()) {
        setProjectContext(snap.data().projectContext || null);
      }
    });

    const fetchTeams = async () => {
      try {
        const data = await withApiRetryCooldown("user:teams", "Failed to load teams.", async () => {
          const res = await authedFetch("/api/user/teams", { noCache: true });
          return readJsonResponse(res, "Failed to load teams.");
        });
        if (!cancelled && auth.currentUser?.uid === uid) setTeams(data.teams || []);
      } catch (e) {
        // best-effort
      }
    };

    fetchTeams();
    return () => {
      cancelled = true;
      unsubUser();
    };
  }, [authReady, user?.uid]);

  useEffect(() => {
    const pluginSessionId = getStudioSessionId(studioConnection.pluginSession);
    if (!user || !studioConnection.pluginConnected || !pluginSessionId) return;
    if (settings?.lastAuthorizedStudioSessionId === pluginSessionId) return;
    updateSettings({
      studioAutoPushEnabled: true,
      studioAutoPushPolicy: settings?.studioAutoPushPolicy || "after_validation",
      lastAuthorizedStudioSessionId: pluginSessionId,
    }).catch(() => {});
  }, [
    user,
    studioConnection.pluginConnected,
    studioConnection.pluginSession,
    settings?.lastAuthorizedStudioSessionId,
    settings?.studioAutoPushPolicy,
    updateSettings,
  ]);

  useEffect(() => {
    if (!user || studioConnection.loading) return;
    const savedSessionId = settings?.lastAuthorizedStudioSessionId;
    if (!savedSessionId) return;
    if (
      studioConnection.pluginConnected &&
      getStudioSessionId(studioConnection.pluginSession) === savedSessionId
    ) return;

    getStudioStatus()
      .then(({ sessions }) => {
        const stillExists = (sessions || []).some((session) => (
          getStudioSessionId(session) === savedSessionId &&
          getStudioConnectionType(session) === STUDIO_CONNECTION_TYPES.PLUGIN_BRIDGE &&
          isStudioSessionLive(session)
        ));
        if (!stillExists) {
          updateSettings({ lastAuthorizedStudioSessionId: null }).catch(() => {});
        }
      })
      .catch(() => {});
  }, [
    user,
    studioConnection.loading,
    studioConnection.pluginConnected,
    studioConnection.pluginSession,
    settings?.lastAuthorizedStudioSessionId,
    updateSettings,
  ]);

  const studioPlaceOptions = useMemo(
    () => targetingOptionsFromStatus(studioConnection),
    [studioConnection]
  );
  const chatStudioPreference = useMemo(
    () => readChatStudioPreference(chat.currentChatMeta),
    [chat.currentChatMeta]
  );

  // Keep optimistic preference across empty-chat → first-chat creation; only drop it
  // when switching between existing chats or once Firestore meta matches.
  const previousChatIdRef = useRef(chat.currentChatId);
  useEffect(() => {
    const previousChatId = previousChatIdRef.current;
    previousChatIdRef.current = chat.currentChatId;
    if (
      previousChatId != null &&
      chat.currentChatId != null &&
      previousChatId !== chat.currentChatId
    ) {
      setOptimisticStudioPlacePreference(null);
    }
  }, [chat.currentChatId]);

  useEffect(() => {
    if (!optimisticStudioPlacePreference || !chatStudioPreference) return;
    const sameTarget =
      (optimisticStudioPlacePreference.targetId &&
        chatStudioPreference.targetId === optimisticStudioPlacePreference.targetId) ||
      (optimisticStudioPlacePreference.placeId &&
        chatStudioPreference.placeId === optimisticStudioPlacePreference.placeId);
    if (sameTarget) setOptimisticStudioPlacePreference(null);
  }, [chatStudioPreference, optimisticStudioPlacePreference]);

  const storedStudioPlacePreference = optimisticStudioPlacePreference || chatStudioPreference;
  // Persist only the user's opaque selection, but always rehydrate it from the
  // current connection snapshot before readiness/run submission. Session ids,
  // target attestation, and capability evidence are volatile and must not be
  // treated as durable browser authority.
  const effectiveStudioPlacePreference = useMemo(() => {
    if (!storedStudioPlacePreference) return null;
    const targetId = String(
      storedStudioPlacePreference.targetId || storedStudioPlacePreference.studioTargetId || ""
    ).trim();
    const matchingLiveTarget = targetId
      ? studioPlaceOptions.find((option) => (
          option?.id === targetId || option?.studioTargetId === targetId
        ))
      : null;
    return matchingLiveTarget
      ? { ...storedStudioPlacePreference, ...matchingLiveTarget }
      : storedStudioPlacePreference;
  }, [storedStudioPlacePreference, studioPlaceOptions]);

  const ensureStudioProjectBinding = useCallback(async (option) => {
    const target = normalizeStudioTargetOption(option) || option;
    const placeId = normalizeRobloxPlaceId(target?.placeId || target?.targetPlaceId);
    const universeId = String(target?.universeId || "").trim();
    if (!placeId || !universeId) {
      throw new Error("Publish this Studio place to Roblox before selecting it for Agent Build.");
    }
    const result = await findOrCreateProjectBinding(buildProjectBindingPayloadFromIdentity({
      title: target?.experienceName || target?.placeName || target?.label,
      placeId,
      universeId,
      studioTargetId: target?.studioTargetId || target?.id,
      studioTargetLabel: target?.label,
    }));
    const project = result?.project || null;
    const projectId = String(project?.projectId || result?.projectId || "").trim();
    if (!projectId) throw new Error("The selected Studio place could not be linked to a workspace project.");
    return { project, projectId };
  }, []);

  const bindChatStudioPlace = useCallback(async (option) => {
    const preference = buildStudioTargetPreference(option);
    if (!preference || !user) return null;
    try {
      const binding = await ensureStudioProjectBinding(option);
      if (chat.currentChatId) {
        await chat.assertCanWrite();
        await updateDoc(doc(db, "users", user.uid, "chats", chat.currentChatId), sanitizeChatWritePayload({
          studioTargetPreference: {
            ...preference,
            updatedAt: serverTimestamp(),
          },
          projectId: binding.projectId,
          updatedAt: serverTimestamp(),
        }));
      }
      const boundPreference = { ...preference, projectId: binding.projectId };
      setOptimisticStudioPlacePreference(boundPreference);
      return boundPreference;
    } catch (error) {
      notify({ message: error?.message || "Could not select this Studio place.", type: "error" });
      setStudioPlacePickerOpen(true);
      return null;
    }
  }, [chat, ensureStudioProjectBinding, notify, user]);

  const cancelRewind = useCallback(() => {
    setRewindTarget(null);
  }, []);

  const executePromptOperation = useCallback(async (e, overridePrompt = null, submissionOptions = {}) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault();

    const operationSignal = submissionOptions?.operationSignal || null;
    const assertOperationActive = () => {
      if (!operationSignal?.aborted) return;
      throw operationSignal.reason instanceof Error
        ? operationSignal.reason
        : new DOMException("The operation was stopped.", "AbortError");
    };
    assertOperationActive();

    const currentPrompt = (overridePrompt ?? prompt).trim();
    const currentAttachments = Array.isArray(submissionOptions?.attachmentsOverride)
      ? [...submissionOptions.attachmentsOverride]
      : [...attachments];
    const hasProjectAssets = projectAssets.assets.length > 0;

    if (!currentPrompt && currentAttachments.length === 0 && !hasProjectAssets) return;

    const promptToSend =
      currentPrompt || (hasProjectAssets ? "Use the attached Roblox assets in this project." : "");

    if (activeTab !== "chat") setActiveTab("chat");
    if (isMobile) setMobileTab("chat");

    const canUseQuickScript = !refineTarget && currentAttachments.length === 0 && !hasProjectAssets;
    if (canUseQuickScript && generatorMode === "quick_script") {
      setGeneratorMode("quick_script", user ? "free_workspace_submit" : "anonymous_workspace_submit");
      setPrompt("");
      return runQuickScriptRef.current?.(promptToSend, {
        source: user ? "free_workspace_submit" : "anonymous_workspace_submit",
      });
    }

    // Agent Build, attachments, and saved workspace features need an account.
    if (!user) {
      createPendingAuthAction({
        action: PENDING_AUTH_ACTIONS.CHAT_SUBMIT,
        returnPath: "/ai",
        workspace: generatorMode,
        source: "chat_submit",
        payload: {
          prompt: currentPrompt,
          attachments: normalizeChatAttachments(currentAttachments),
          chatMode: settings?.chatMode || "agent",
          modelVersion: settings?.modelVersion || "",
          generatorMode,
          promptCategory: categorizePrompt(currentPrompt),
          actionLabel: actionLabel(PENDING_AUTH_ACTIONS.CHAT_SUBMIT),
        },
      });
      setSignInNudgeReason("Create a free account to use Agent Build, attachments, and saved workspace features. Quick Script stays available without an account.");
      setShowSignInNudge(true);
      return;
    }

    let runtimeProjectId = String(
      submissionOptions?.projectId
      || chat.currentChatMeta?.projectId
      || effectiveStudioPlacePreference?.projectId
      || ""
    ).trim() || null;
    let studioTargetPreference = submissionOptions?.studioTargetPreference || effectiveStudioPlacePreference;
    if (
      studioEnabled &&
      studioConnection.connected &&
      ["agent", "debug"].includes(String(settings?.chatMode || chat.activeMode || "agent").toLowerCase())
    ) {
      let options = studioPlaceOptions;
      if (!options.length) {
        try {
          const status = await getStudioStatus();
          assertOperationActive();
          options = targetingOptionsFromStatus(status);
        } catch (error) {
          if (operationSignal?.aborted) throw error;
          options = [];
        }
      }
      const gate = evaluateStudioPlaceGate({
        studioEnabled: true,
        connected: Boolean(studioConnection.connected),
        requirePlugin: false,
        preference: studioTargetPreference,
        options,
      });
      if (gate.status === "needs_selection") {
        const selectionMessage = options.some(canBindStudioTargetToProject)
          ? "Choose which Studio place this chat should edit before sending."
          : "Publish an open Studio place to Roblox before using Agent Build.";
        notify({
          message: selectionMessage,
          type: "error",
        });
        setStudioPlacePickerOpen(true);
        throw new Error(selectionMessage);
      }
      if (gate.status === "ready") {
        studioTargetPreference = buildStudioTargetPreference(gate.target) || studioTargetPreference;
        const binding = await bindChatStudioPlace(gate.target);
        assertOperationActive();
        if (!binding?.projectId) throw new Error("The selected Studio place could not be linked.");
        runtimeProjectId = binding.projectId;
      }
    }

    if (runtimeProjectId) {
      try {
        const resolution = await getProjectBinding(runtimeProjectId);
        assertOperationActive();
        if (resolution?.state === PROJECT_RESOLUTION_STATES.MISSING) {
          const staleProjectId = runtimeProjectId;
          runtimeProjectId = null;
          const shouldClearChatProject =
            Boolean(chat.currentChatId)
            && chat.currentChatMeta?.projectId === staleProjectId;
          if (typeof chat.setCurrentChatMeta === "function" && shouldClearChatProject) {
            chat.setCurrentChatMeta((prev) => (
              prev && prev.projectId === staleProjectId
                ? { ...prev, projectId: null }
                : prev
            ));
          }
          if (user && shouldClearChatProject) {
            try {
              await chat.assertCanWrite();
              await updateDoc(
                doc(db, "users", user.uid, "chats", chat.currentChatId),
                sanitizeChatWritePayload({
                  projectId: null,
                  updatedAt: serverTimestamp(),
                })
              );
            } catch (_) {
              /* non-fatal: submit can continue without the binding */
            }
          }
        } else {
          const recoveryMessage = projectBindingRecoveryMessage(resolution);
          if (recoveryMessage) {
            notify({ message: recoveryMessage, type: "info" });
          }
        }
      } catch (error) {
        notify({
          message: error?.message || "This workspace project is not available.",
          type: "error",
        });
        throw error;
      }
    }

    // Build this once after all project/Studio repair has completed. Refine and
    // first-generation must submit the same effective identity inputs so a
    // retry cannot bind one idempotency key to two different agent payloads.
    const {
      attachmentsOverride: _attachmentsOverride,
      rewindFromMessageId: submissionRewindId,
      rewindMode: submissionRewindMode,
      ...restSubmissionOptions
    } = submissionOptions || {};
    const activeRewind = submissionRewindId
      ? {
          messageId: String(submissionRewindId),
          mode: submissionRewindMode === "after" ? "after" : "replace",
        }
      : rewindTarget;
    const effectiveSubmissionOptions = {
      ...restSubmissionOptions,
      ...(studioTargetPreference ? { studioTargetPreference } : {}),
      projectId: runtimeProjectId,
      studioConnected: Boolean(studioConnection.connected),
      targeting: {
        projectId: runtimeProjectId,
        studioConnected: Boolean(studioConnection.connected),
        studioTarget: studioTargetPreference || null,
      },
      ...(activeRewind?.messageId
        ? {
            rewindFromMessageId: activeRewind.messageId,
            rewindMode: activeRewind.mode === "after" ? "after" : "replace",
          }
        : {}),
    };

    if (refineTarget) {
      const target = refineTarget;
      setRefineTarget(null);
      const ok = await unified.refineArtifact(
        target,
        currentPrompt,
        workspace.projectArtifactSnapshot,
        {
          ...effectiveSubmissionOptions,
          refineMode: studioConnection.pluginConnected ? "studio" : "workspace",
        }
      );
      if (!ok) setRefineTarget(target);
      return;
    }

    if (user) {
      track("prompt_submitted", {
        attachment_count: currentAttachments.length,
        prompt_length: promptToSend.length,
        prompt_category: categorizePrompt(promptToSend),
      });
    }

    await unified.handleSubmit(
      promptToSend,
      currentAttachments,
      workspace.projectArtifactSnapshot,
      effectiveSubmissionOptions
    );
  }, [
    user,
    prompt,
    attachments,
    projectAssets.assets,
    activeTab,
    isMobile,
    refineTarget,
    rewindTarget,
    unified,
    workspace.projectArtifactSnapshot,
    track,
    generatorMode,
    settings?.chatMode,
    settings?.modelVersion,
    setGeneratorMode,
    studioEnabled,
    studioConnection.connected,
    studioConnection.pluginConnected,
    studioPlaceOptions,
    effectiveStudioPlacePreference,
    bindChatStudioPlace,
    chat,
    notify,
  ]);

  const handlePromptSubmit = useCallback((e, overridePrompt = null, submissionOptions = {}) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault();

    const currentPrompt = String(overridePrompt ?? prompt ?? "").trim();
    const currentAttachments = Array.isArray(submissionOptions?.attachmentsOverride)
      ? [...submissionOptions.attachmentsOverride]
      : [...attachments];
    const hasProjectAssets = projectAssets.assets.length > 0;
    if (!currentPrompt && currentAttachments.length === 0 && !hasProjectAssets) return undefined;

    // Quick Script and the sign-in gate do not create a chat operation. Their
    // existing local lifecycle remains independent from Agent chat queues.
    const canUseQuickScript = !refineTarget && currentAttachments.length === 0 && !hasProjectAssets;
    if (!user || (canUseQuickScript && generatorMode === "quick_script")) {
      return executePromptOperation(e, overridePrompt, submissionOptions);
    }

    const studioPreflight = evaluateStudioSubmissionPreflight({
      studioEnabled,
      connected: studioConnection.connected,
      mode: settings?.chatMode || chat.activeMode || "agent",
      preference: submissionOptions?.studioTargetPreference || effectiveStudioPlacePreference,
      options: studioPlaceOptions,
    });
    if (studioPreflight.status === "blocked") {
      notify({ message: studioPreflight.message, type: "error" });
      setStudioPlacePickerOpen(true);
      return undefined;
    }

    const coordinator = chatOperationCoordinatorRef.current;
    const operationId = String(submissionOptions?.operationId || uuidv4());
    const operationType = String(submissionOptions?.operationType || "submit");
    const draftRevision = String(
      submissionOptions?.draftRevision
      || `${operationType}:${operationId}`
    );
    const sourceChatKey = chat.currentChatId || "draft";
    const promptToSend = currentPrompt
      || (hasProjectAssets ? "Use the attached Roblox assets in this project." : "");
    const checkpointMetadata = submissionOptions?.checkpointMetadata || null;

    const admission = coordinator.admit({
      id: operationId,
      chatId: sourceChatKey,
      type: operationType,
      prompt: promptToSend,
      attachments: currentAttachments,
      draftRevision,
      checkpointMetadata,
      interrupt: submissionOptions?.interrupt === true,
      retainOnFailure: operationType === "retry",
      onCancel: async (operation) => {
        unified.cancelCurrentFlow?.();
        if (!operation?.runId) {
          await unified.persistPendingCancellation?.({
            chatId: operation?.chatId || chat.currentChatId || null,
            requestId: operation?.id || operationId,
          });
          return;
        }
        try {
          await cancelCoordinatedAgentRun(
            operation,
            operation.chatId || chat.currentChatId || null,
          );
        } catch (error) {
          // A local abort has already fenced the transcript. Reconciliation can
          // recover the server terminal state after a transient cancel failure.
          const message = String(error?.message || "").toLowerCase();
          if (!message.includes("already") && !message.includes("not found")) throw error;
        }
        await unified.reconcileCancelledRun?.(operation.runId, {
          chatId: operation.chatId || chat.currentChatId || null,
          requestId: operation.id,
        });
      },
    }, async (operation) => {
      const effectiveOptions = {
        ...submissionOptions,
        attachmentsOverride: currentAttachments,
        operationId,
        operationSignal: operation.signal,
        clientMessageId: operationId,
        idempotencyKey: operationId,
        onChatReady: (nextChatId) => operation.rekey(nextChatId),
        onRunId: (runId) => {
          operation.setRunId(runId);
          operation.update({ status: CHAT_OPERATION_STATUS.RUNNING });
        },
        onOperationStatus: (status) => operation.update({ status }),
      };

      if (operationType === "retry" && checkpointMetadata?.targetRunId) {
        operation.update({ status: CHAT_OPERATION_STATUS.RESTORING });
        await restoreChatCheckpoint({
          chatId: chat.currentChatId,
          targetRunId: checkpointMetadata.targetRunId,
          transcriptPivot: checkpointMetadata.transcriptPivot || null,
          signal: operation.signal,
          idempotencyKey: `${operationId}:restore`,
        });
        if (operation.signal.aborted) {
          throw new DOMException("The operation was stopped.", "AbortError");
        }
        operation.update({ status: CHAT_OPERATION_STATUS.PREPARING });
        delete effectiveOptions.rewindFromMessageId;
        delete effectiveOptions.rewindMode;
      }

      return executePromptOperation(null, promptToSend, effectiveOptions);
    });

    const clearedComposerDraft = !admission.duplicate && overridePrompt == null;
    if (clearedComposerDraft) {
      setPrompt("");
      setAttachments([]);
      setRewindTarget(null);
      setStudioPlacePickerOpen(false);
    }
    if (!clearedComposerDraft) return admission.promise;
    return admission.promise.catch((error) => {
      restoreFailedPromptDraft({
        prompt: currentPrompt,
        attachments: currentAttachments,
        setPrompt,
        setAttachments,
      });
      throw error;
    });
  }, [
    attachments,
    chat.currentChatId,
    chat.activeMode,
    effectiveStudioPlacePreference,
    executePromptOperation,
    generatorMode,
    notify,
    projectAssets.assets.length,
    prompt,
    refineTarget,
    settings?.chatMode,
    studioConnection.connected,
    studioEnabled,
    studioPlaceOptions,
    unified,
    user,
  ]);

  const recordPendingAuthGate = useCallback((actionType, source = "quick_script_gate") => {
    const currentPrompt = quickScript.prompt || prompt;
    const pending = createPendingAuthAction({
      action: actionType,
      returnPath: "/ai",
      workspace: generatorMode,
      source,
      payload: {
        quickScriptResultId: quickScript.claim?.anonymousResultId || "",
        quickScriptClaimAvailable: Boolean(quickScript.claim?.anonymousResultId && quickScript.claim?.claimToken),
        studioConnected: Boolean(studioConnection.pluginConnected),
        generatorMode,
        promptCategory: categorizePrompt(currentPrompt),
        actionLabel: actionLabel(actionType),
      },
    });
    setSignInNudgeReason(`Sign up to ${actionLabel(actionType)}. Your generated code and prompt will stay in this workspace.`);
    track("signin_nudge_viewed", {
      generator_mode: generatorMode,
      prompt_category: categorizePrompt(currentPrompt),
      gated_action: actionType,
      pending_action_id: pending.id,
    }, { dedupeKey: `signin_nudge:${pending.id}` });
    return pending;
  }, [
    generatorMode,
    prompt,
    quickScript.claim?.anonymousResultId,
    quickScript.claim?.claimToken,
    quickScript.prompt,
    studioConnection.pluginConnected,
    track,
  ]);

  const runQuickScript = useCallback(async (overridePrompt = null, options = {}) => {
    const currentPrompt = String(overridePrompt ?? prompt ?? quickScript.prompt ?? "").trim();
    if (!currentPrompt) {
      notify({ message: "Type a prompt before generating", type: "info" });
      return null;
    }
    if (quickScript.status === "generating") return null;
    if (!user && quickScript.result?.code && !options.retry) {
      recordPendingAuthGate(PENDING_AUTH_ACTIONS.RESTRICTED_GENERATION, "quick_script_additional_generation");
      setShowSignInNudge(true);
      return null;
    }

    const idempotencyKey = options.retry && quickScript.idempotencyKey
      ? quickScript.idempotencyKey
      : createQuickScriptIdempotencyKey();
    const source = options.source || quickScript.source || "direct";
    const startedAt = Date.now();

    setGeneratorMode("quick_script", source);
    setPrompt(currentPrompt);
    setAttachments([]);
    if (activeTab !== "chat") setActiveTab("chat");
    if (isMobile) setMobileTab("chat");
    setQuickScript((prev) => ({
      ...prev,
      prompt: currentPrompt,
      status: "generating",
      stage: "Generating focused Luau...",
      error: null,
      idempotencyKey,
      source,
    }));
    track("generation_started", {
      generator_mode: "quick_script",
      output_type: "luau_script",
      prompt_length: currentPrompt.length,
      prompt_category: categorizePrompt(currentPrompt),
      source,
    }, { dedupeKey: `quick_script_started:${idempotencyKey}` });

    try {
      const priorResult = quickScript.result?.code && !options.retry
        ? quickScript.result
        : null;
      const response = await generateQuickScript({
        prompt: currentPrompt,
        priorResult,
        idempotencyKey,
      });
      const next = {
        prompt: currentPrompt,
        status: "succeeded",
        stage: response?.result?.validation?.status === "adjusted"
          ? "Result ready · script context adjusted"
          : response?.anonymous ? "Anonymous result ready" : "Result ready",
        result: response?.result
          ? normalizeQuickScriptResult(response.result, currentPrompt)
          : null,
        error: null,
        claim: response?.claim || null,
        anonymous: Boolean(response?.anonymous),
        idempotencyKey,
        source,
        projectId: null,
        project: null,
        updatedAt: Date.now(),
      };
      setQuickScript(next);
      track("generation_completed", {
        generator_mode: "quick_script",
        output_type: "luau_script",
        prompt_category: categorizePrompt(currentPrompt),
        generation_latency_ms: Date.now() - startedAt,
        anonymous: Boolean(response?.anonymous),
      }, { dedupeKey: `quick_script_completed:${idempotencyKey}` });
      if (options.intentId) consumeGenerationIntent(options.intentId);
      if (user) refreshBilling?.();
      return response;
    } catch (err) {
      const code = err?.code || err?.payload?.code || "QUICK_SCRIPT_FAILED";
      const nextStatus = code === "AGENT_BUILD_RECOMMENDED" ? "needs_agent_build" : "failed";
      const error = {
        code,
        message: err?.message || "Quick generation failed. Please try again.",
        retryable: err?.retryable !== false,
        authRequired: Boolean(err?.authRequired),
        status: err?.status || null,
        recommendedMode: err?.payload?.recommendedMode || null,
        reasons: err?.payload?.reasons || [],
      };
      setQuickScript((prev) => ({
        ...prev,
        prompt: currentPrompt,
        status: nextStatus,
        stage: nextStatus === "needs_agent_build" ? "Agent Build recommended" : "Generation failed",
        error,
        idempotencyKey,
        source,
      }));
      track("generation_failed", {
        generator_mode: "quick_script",
        output_type: "luau_script",
        prompt_category: categorizePrompt(currentPrompt),
        error_category: code,
      }, { dedupeKey: `quick_script_failed:${idempotencyKey}:${code}` });
      if (options.intentId && nextStatus !== "failed") consumeGenerationIntent(options.intentId);
      return null;
    }
  }, [
    activeTab,
    isMobile,
    notify,
    prompt,
    quickScript.prompt,
    quickScript.source,
    quickScript.status,
    quickScript.idempotencyKey,
    quickScript.result,
    recordPendingAuthGate,
    refreshBilling,
    setGeneratorMode,
    track,
    user,
  ]);

  useEffect(() => {
    runQuickScriptRef.current = runQuickScript;
    return () => {
      runQuickScriptRef.current = null;
    };
  }, [runQuickScript]);

  useEffect(() => {
    if (!pendingGenerationIntent) return;

    // Do not treat the initial `user === null` as an anonymous session. Firebase
    // restores persisted credentials asynchronously, and a restored prompt must
    // wait for that result before deciding whether to run or show the sign-in gate.
    if (!authReady) return;

    if (pendingGenerationIntent.mode === "quick_script") {
      if (quickScript.status === "generating" || autoIntentInFlightRef.current === pendingGenerationIntent.id) return;
      const intent = pendingGenerationIntent;
      autoIntentInFlightRef.current = intent.id;
      setPendingGenerationIntent(null);
      runQuickScript(intent.prompt, {
        source: intent.source || "generation_intent",
        intentId: intent.id,
      }).finally(() => {
        if (autoIntentInFlightRef.current === intent.id) {
          autoIntentInFlightRef.current = null;
        }
      });
      return;
    }

    if (!user) {
      setShowSignInNudge(true);
      return;
    }

    if (unifiedIsGenerating || autoIntentInFlightRef.current === pendingGenerationIntent.id) return;

    let cancelled = false;
    const intent = pendingGenerationIntent;
    autoIntentInFlightRef.current = intent.id;

    const runIntent = async () => {
      try {
        if (activeTab !== "chat") setActiveTab("chat");
        if (isMobile) setMobileTab("chat");
        setPrompt("");
        setAttachments([]);
        setPendingGenerationIntent(null);
        consumeGenerationIntent(intent.id);
        await submitUnifiedPrompt(
          intent.prompt,
          [],
          workspace.projectArtifactSnapshot,
          { mode: intent.mode || "agent", source: "generation_intent", intentId: intent.id }
        );
      } catch (err) {
        if (!cancelled) {
          setPendingGenerationIntent(intent);
          setPrompt(intent.prompt);
          notify({ message: err?.message || "Could not start the saved prompt", type: "error" });
        }
      } finally {
        if (!cancelled && autoIntentInFlightRef.current === intent.id) {
          autoIntentInFlightRef.current = null;
        }
      }
    };

    void runIntent();
    return () => {
      cancelled = true;
    };
  }, [
    pendingGenerationIntent,
    authReady,
    quickScript.status,
    quickScript.result?.code,
    runQuickScript,
    user,
    unifiedIsGenerating,
    submitUnifiedPrompt,
    workspace.projectArtifactSnapshot,
    activeTab,
    isMobile,
    notify,
  ]);

  useWorkspaceArtifactPersistence(workspace.activeArtifactSnapshot, {
    // Streamed artifacts are provisional until the Studio run finishes. Persisting
    // an intermediate stream can make the backend treat the same run as a
    // competing project edit and abort the refinement with a false conflict.
    enabled: Boolean(
      user && !unifiedIsGenerating && workspace.activeArtifactSnapshot?.artifactId,
    ),
    debounceMs: 400,
    source: "workspace",
  });

  const handleStartRefine = useCallback((message) => {
    setRefineTarget(message || null);
    setActiveTab("chat");
    if (isMobile) setMobileTab("chat");
  }, [isMobile]);

  const cancelRefine = useCallback(() => setRefineTarget(null), []);

  const handleOpenArtifact = useCallback((message) => {
    if (message?.id) workspace.openArtifact(message.id);
    if (isMobile) setMobileTab("code");
  }, [workspace, isMobile]);

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
        body: JSON.stringify({ prompt: current, gameSpec: resolveGameSpecForPrompt(settings?.gameSpec) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw createImprovePromptError(res, data);
      }
      const improved = (data?.improvedPrompt || "").trim();
      if (improved && improved !== current) {
        setPrompt(improved);
        notify({ message: "Prompt improved — review and edit before sending", type: "success" });
      } else {
        notify({ message: "Prompt already looks good", type: "info" });
      }
    } catch (err) {
      notify({
        message: formatImprovePromptErrorMessage(err),
        type: "error",
      });
    } finally {
      setIsImproving(false);
    }
  }, [prompt, user, isImproving, settings, notify]);

  const handleQuickStart = useCallback(async (item) => {
    const promptText = typeof item === "string" ? item : item?.prompt || "";
    await handlePromptSubmit(null, promptText);
  }, [handlePromptSubmit]);

  const handleEditPlan = useCallback((message) => {
    setPrompt(message?.originPrompt || "");
  }, []);

  const handleFileUpload = useCallback(async (e) => {
    const files = Array.from(e.target.files || []);
    if (e.target) e.target.value = "";
    if (!files.length) return;

    const imageFiles = files.filter((file) => file.type?.startsWith("image/") || isRobloxDecalImage(file));
    const textFiles = files.filter((file) => !file.type?.startsWith("image/") && !isRobloxDecalImage(file));

    if (imageFiles.length) {
      await robloxImageUpload.uploadImages(imageFiles);
    }

    textFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachments((prev) => [
          ...prev,
          {
            name: file.name,
            type: file.type,
            size: file.size,
            data: reader.result,
            isImage: false,
          },
        ]);
      };
      reader.readAsText(file);
    });
  }, [robloxImageUpload]);

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

  const handleOpenAssetLibrary = useCallback(async () => {
    if (!user) {
      setShowSignInNudge(true);
      return;
    }
    if (robloxStatus?.connected !== true) {
      notify({ message: "Connect Roblox before selecting assets", type: "info" });
      return;
    }
    if (!isCreatorStoreReadAuthorized(robloxStatus)) {
      notify({ message: "Reauthorize Roblox to browse your assets.", type: "info" });
      beginCreatorStoreReauthorization("/ai").catch((err) => {
        notify({ message: err?.message || "Failed to start Roblox reauthorization.", type: "error" });
      });
      return;
    }

    // Asset selection is also a valid first action. Create the draft chat now
    // so selected assets have a durable project to attach to before the first
    // prompt is submitted.
    if (!selectedAssetProjectId) {
      try {
        await unified.ensureChat("New chat");
      } catch (err) {
        notify({ message: err?.message || "Could not create a chat for these assets", type: "error" });
        return;
      }
    }
    setAssetLibraryOpen(true);
  }, [notify, robloxStatus, selectedAssetProjectId, unified, user]);

  const handleConfirmProjectAssets = useCallback(async (assets) => {
    await projectAssets.attachAssets(assets);
  }, [projectAssets]);

  const syncAgentRunSteps = useCallback(
    async (runId, fallbackStep = null, fallbackRun = null) => {
      if (!runId || !user) return;
      let steps = fallbackStep ? [fallbackStep] : [];
      let run = fallbackRun;
      try {
        const result = await getAgentRun(runId);
        run = result?.run || run;
        steps = Array.isArray(run?.steps) ? run.steps : steps;
      } catch (_) {
        // The approving/restoring call already succeeded; stale UI is non-fatal.
      }

      if (!run && !steps.length) return;

      const normalizedRunStatus = run
        ? normalizeAuthoritativeRunStatus(run.status, run) || run.status
        : null;
      const runWasCancelled = normalizedRunStatus === "canceled";
      const runPatch = run ? {
        runStatus: normalizedRunStatus,
        targetSelection: run.targetSelection || null,
        studioPlaceName: run.placeName || null,
        errorCode: run.errorCode || run.blocker?.code || run.error?.code || null,
        errorDetails: run.errorDetails || run.blocker?.details || run.error?.details || null,
        recovery: run.recovery || run.blocker?.recovery || run.error?.recovery || null,
        stage: runWasCancelled
          ? "Stopped"
          : run.status === "awaiting_studio_target"
          ? "Waiting for your Studio project choice"
          : run.summary || (run.placeName ? `Continuing in ${run.placeName}...` : undefined),
      } : {};

      if (unified.setPendingMessage) {
        unified.setPendingMessage((prev) => {
          if (!prev?.runId || prev.runId !== runId) return prev;
          return {
            ...prev,
            ...runPatch,
            steps,
            runId,
            ...(runWasCancelled ? {
              content: "Generation canceled.",
              pending: false,
              stage: "canceled",
              metadata: { ...(prev.metadata || {}), runState: "canceled" },
            } : {}),
          };
        });
      }

      const targetMessage = [...(chat.messages || [])]
        .reverse()
        .find((m) => m.role === "assistant" && m.runId === runId);
      if (targetMessage?.id && chat.currentChatId) {
        await chat.assertCanWrite();
        await updateDoc(doc(db, "users", user.uid, "chats", chat.currentChatId, "messages", targetMessage.id), sanitizeTranscriptMessagePayload({
          steps,
          runId,
          ...(run ? {
            runStatus: normalizedRunStatus,
            targetSelection: run.targetSelection || null,
            studioPlaceName: run.placeName || null,
            errorCode: run.errorCode || run.blocker?.code || run.error?.code || null,
            errorDetails: run.errorDetails || run.blocker?.details || run.error?.details || null,
            recovery: run.recovery || run.blocker?.recovery || run.error?.recovery || null,
            ...(runWasCancelled ? {
              content: "Generation canceled.",
              pending: false,
              stage: "canceled",
              metadata: { ...(targetMessage.metadata || {}), runState: "canceled" },
            } : {}),
          } : {}),
        })).catch(() => {});
      }
    },
    [chat, unified, user]
  );

  const handleSelectStudioTarget = useCallback(
    async (option) => {
      const runId = resolveAwaitingStudioTargetRunId({
        pendingMessage: unified.pendingMessage,
        agentRun: workspace.agentRun,
      });
      const targetId = typeof option === "string"
        ? option
        : option?.id || option?.targetId || option?.studioTargetId;
      if (!targetId || !user || selectingStudioTargetId) return false;
      // Choosing an exact live target is an explicit Studio action. Keep the
      // execution preference in lockstep with that choice so the subsequent
      // submit cannot discard the target's project binding and fall back to
      // the legacy artifact route.
      handleStudioEnabledChange(true);
      setSelectingStudioTargetId(targetId);
      // Paint the chip immediately so empty chats (no Firestore doc yet) still show the place.
      const immediatePreference = buildStudioTargetPreference(
        typeof option === "string" ? { id: option } : option
      );
      if (immediatePreference) setOptimisticStudioPlacePreference(immediatePreference);
      try {
        const { preference, bindError, result, resumed } = await resumeStudioTargetSelection({
          option,
          runId,
          bindPreference: bindChatStudioPlace,
          selectTarget: selectAgentStudioTarget,
        });
        const bindDenied = isFirestorePermissionDenied(bindError);
        if (!resumed) {
          if (!preference) {
            setOptimisticStudioPlacePreference(null);
            setStudioPlacePickerOpen(true);
            if (bindError) {
              notify({
                message: bindError?.message || "Could not select this Studio place.",
                type: "error",
              });
            }
            return false;
          }
          setStudioPlacePickerOpen(false);
          if (bindDenied) {
            notify({
              message: "Could not save this place to the chat, but you can still send with it selected.",
              type: "info",
            });
          } else {
            const label = preference?.label || immediatePreference?.label;
            notify({
              message: label ? `This chat will edit ${label}` : "Studio place selected for this chat",
              type: "success",
            });
          }
          return true;
        }
        await syncAgentRunSteps(runId, null, result?.run || null);
        if (result?.conflict) {
          setOptimisticStudioPlacePreference(null);
          setStudioPlacePickerOpen(true);
          notify({
            message: result?.message || "That Studio project is no longer available. Choose another project to continue.",
            type: "error",
          });
          return false;
        } else {
          setStudioPlacePickerOpen(false);
          notify({
            message: result?.run?.placeName
              ? `Continuing in ${result.run.placeName}`
              : "Continuing in Studio",
            type: "success",
          });
          if (bindDenied) {
            notify({
              message: "Could not save this place preference to the chat (permissions).",
              type: "info",
            });
          }
          return true;
        }
      } catch (err) {
        setOptimisticStudioPlacePreference(null);
        setStudioPlacePickerOpen(true);
        notify({ message: err?.message || "Could not continue in that Studio project", type: "error" });
        return false;
      } finally {
        setSelectingStudioTargetId(null);
      }
    },
    [
      bindChatStudioPlace,
      handleStudioEnabledChange,
      notify,
      selectingStudioTargetId,
      syncAgentRunSteps,
      unified.pendingMessage,
      user,
      workspace.agentRun,
    ]
  );

  const handleApproveStep = useCallback(
    async (step) => {
      const runId = unified.pendingMessage?.runId || workspace.agentRun?.runId;
      if (!runId || !step?.id || !user) return;
      setApprovingStepId(step.id);
      try {
        const projectId = String(
          unified.pendingMessage?.projectId || workspace.agentRun?.projectId || chat.currentChatMeta?.projectId || ""
        ).trim();
        if (projectId) {
          const resolution = await getProjectBinding(projectId);
          if (resolution?.state === PROJECT_RESOLUTION_STATES.MISSING) {
            const shouldClearChatProject =
              Boolean(chat.currentChatId)
              && chat.currentChatMeta?.projectId === projectId;
            if (typeof chat.setCurrentChatMeta === "function" && shouldClearChatProject) {
              chat.setCurrentChatMeta((prev) => (
                prev && prev.projectId === projectId
                  ? { ...prev, projectId: null }
                  : prev
              ));
            }
            if (shouldClearChatProject) {
              try {
                await chat.assertCanWrite();
                await updateDoc(
                  doc(db, "users", user.uid, "chats", chat.currentChatId),
                  sanitizeChatWritePayload({
                    projectId: null,
                    updatedAt: serverTimestamp(),
                  })
                );
              } catch (_) {
                /* non-fatal */
              }
            }
          } else {
            const recoveryMessage = projectBindingRecoveryMessage(resolution);
            if (recoveryMessage) {
              setStudioPlacePickerOpen(true);
              throw new Error(recoveryMessage);
            }
          }
        }
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
    [unified, workspace.agentRun?.runId, workspace.agentRun?.projectId, chat, user, syncAgentRunSteps, notify]
  );

  const handleRestoreRun = useCallback(
    (runId, transcriptPivot = null) => {
      if (!runId || !user) return undefined;
      const coordinator = chatOperationCoordinatorRef.current;
      const chatId = chat.currentChatId || "draft";
      const pivotKey = String(transcriptPivot?.messageId || transcriptPivot?.id || "run");
      const operationId = uuidv4();
      const restoreRevision = `restore:${runId}:${pivotKey}`;
      const admission = coordinator.admit({
        id: operationId,
        chatId,
        type: "restore",
        draftRevision: restoreRevision,
        checkpointMetadata: { targetRunId: runId, transcriptPivot },
        interrupt: true,
        onCancel: async (operation) => {
          unified.cancelCurrentFlow?.();
          if (operation?.runId) {
            await cancelCoordinatedAgentRun(
              operation,
              operation.chatId || chat.currentChatId || null,
            );
            await unified.reconcileCancelledRun?.(operation.runId, {
              chatId: operation.chatId || chat.currentChatId || null,
              requestId: operation.id,
            });
          }
        },
      }, async ({ signal }) => {
        setRestoringRun(true);
        try {
          const result = chat.currentChatId
            ? await restoreChatCheckpoint({
                chatId: chat.currentChatId,
                targetRunId: runId,
                transcriptPivot,
                signal,
                idempotencyKey: operationId,
              })
            : await restoreAgentRun(runId, {
                signal,
                idempotencyKey: operationId,
                chatId: chat.currentChatId || null,
              });
          await syncAgentRunSteps(runId, result?.step || null);
          coordinator.pause(chat.currentChatId || chatId, CHAT_OPERATION_STATUS.STOPPED);
          notify({ message: "Checkpoint restored", type: "success" });
          return result;
        } catch (err) {
          notify({ message: err?.message || "Could not restore snapshots", type: "error" });
          throw err;
        } finally {
          setRestoringRun(false);
        }
      });
      return admission.promise;
    },
    [chat.currentChatId, user, unified, syncAgentRunSteps, notify]
  );

  const stopChatOperation = useCallback(() => (
    chatOperationCoordinatorRef.current.stop(chat.currentChatId || "draft")
  ), [chat.currentChatId]);

  const resumeChatQueue = useCallback(() => (
    chatOperationCoordinatorRef.current.resume(chat.currentChatId || "draft")
  ), [chat.currentChatId]);

  const sendNextChatOperation = useCallback(() => (
    chatOperationCoordinatorRef.current.sendNext(chat.currentChatId || "draft")
  ), [chat.currentChatId]);

  const removeQueuedChatOperation = useCallback((operationId) => (
    chatOperationCoordinatorRef.current.removeQueued(chat.currentChatId || "draft", operationId)
  ), [chat.currentChatId]);

  const gateQuickScriptAction = useCallback((action) => {
    if (user) return true;
    const pending = recordPendingAuthGate(action, "quick_script_action");
    track("gated_action_attempted", {
      generator_mode: "quick_script",
      gated_action: action,
      prompt_category: categorizePrompt(quickScript.prompt || prompt),
      pending_action_id: pending.id,
    }, { dedupeKey: `quick_script_gate:${pending.id}` });
    setShowSignInNudge(true);
    return false;
  }, [prompt, quickScript.prompt, recordPendingAuthGate, track, user]);

  const handleQuickScriptCopy = useCallback(async () => {
    const code = quickScript.result?.code || "";
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      track("code_copied", {
        generator_mode: "quick_script",
        output_type: "luau_script",
      }, { dedupeKey: `quick_script_copy:${quickScript.idempotencyKey || ""}` });
      notify({ message: "Quick copied", type: "success" });
    } catch (_) {
      notify({ message: "Could not copy code", type: "error" });
    }
  }, [notify, quickScript.idempotencyKey, quickScript.result, track]);

  const handleQuickScriptSave = useCallback(async () => {
    const result = quickScript.result;
    if (!result?.code || !gateQuickScriptAction(PENDING_AUTH_ACTIONS.SAVE_PROJECT)) return;
    try {
      const saved = await saveQuickScriptProject({
        prompt: quickScript.prompt || prompt,
        result,
        claim: quickScript.claim,
        idempotencyKey: quickScript.idempotencyKey ? `${quickScript.idempotencyKey}:save` : undefined,
        projectId: quickScript.projectId,
      });
      const savedProjectId = saved.projectId || saved.project?.projectId || quickScript.projectId || null;
      setQuickScript((prev) => ({
        ...prev,
        projectId: savedProjectId,
        project: saved.project || prev.project || null,
        claim: saved.claimedAnonymous ? null : prev.claim,
        anonymous: saved.claimedAnonymous ? false : prev.anonymous,
        stage: "Saved to projects",
        updatedAt: Date.now(),
      }));
      track("project_saved", {
        generator_mode: "quick_script",
        output_type: "luau_script",
        has_project: Boolean(savedProjectId),
      }, { dedupeKey: `quick_script_saved:${savedProjectId || quickScript.idempotencyKey || ""}` });
      notify({ message: "Quick saved to projects", type: "success" });
    } catch (err) {
      notify({ message: err?.message || "Could not save Quick", type: "error" });
    }
  }, [
    gateQuickScriptAction,
    notify,
    prompt,
    quickScript.claim,
    quickScript.idempotencyKey,
    quickScript.projectId,
    quickScript.prompt,
    quickScript.result,
    track,
  ]);

  const handleQuickScriptExport = useCallback(() => {
    const result = quickScript.result;
    if (!result?.code || !gateQuickScriptAction(PENDING_AUTH_ACTIONS.EXPORT_PROJECT)) return;
    const filename = `${(result.title || "QuickScript").replace(/[^a-z0-9_-]+/gi, "_")}.lua`;
    downloadText(filename, result.code);
    track("artifact_downloaded", {
      generator_mode: "quick_script",
      output_type: "luau_script",
      download_type: "single_file",
    }, { dedupeKey: `quick_script_export:${quickScript.idempotencyKey || ""}` });
  }, [gateQuickScriptAction, quickScript.idempotencyKey, quickScript.result, track]);

  const handleQuickScriptStudioPush = useCallback(async () => {
    const result = quickScript.result;
    if (!result?.code || !gateQuickScriptAction(PENDING_AUTH_ACTIONS.PUSH_TO_STUDIO)) return;
    if (
      result?.validation?.status === "blocked"
      || !["Script", "LocalScript", "ModuleScript"].includes(result?.scriptType)
      || !String(result?.studioLocation || "").trim()
    ) {
      notify({ message: "This script is blocked until its class and Studio location pass validation", type: "error" });
      return;
    }
    const pluginSessionId = getStudioSessionId(studioConnection.pluginSession);
    if (!studioConnection.pluginConnected || !pluginSessionId) {
      notify({ message: "Connect the NexusRBX Studio Plugin before pushing this script", type: "info" });
      return;
    }
    const artifact = quickScriptArtifact(result);
    if (!artifact) {
      notify({ message: "This script cannot be pushed because its Studio context is incomplete", type: "error" });
      return;
    }
    try {
      const queued = await applyArtifactToStudio({
        artifact: buildBaseArtifactSnapshot(artifact),
        sessionId: pluginSessionId,
      });
      track("quick_script_studio_push_queued", {
        generator_mode: "quick_script",
        output_type: "luau_script",
      }, { dedupeKey: `quick_script_studio:${queued?.commandId || quickScript.idempotencyKey || ""}` });
      notify({ message: "Queued Quick Studio push", type: "success" });
    } catch (err) {
      notify({ message: err?.message || "Could not push Quick to Studio", type: "error" });
    }
  }, [
    gateQuickScriptAction,
    notify,
    quickScript.idempotencyKey,
    quickScript.result,
    studioConnection.pluginConnected,
    studioConnection.pluginSession,
    track,
  ]);

  const handleQuickScriptContinueEditing = useCallback(() => {
    const current = quickScript.prompt || prompt;
    if (!user) {
      gateQuickScriptAction(PENDING_AUTH_ACTIONS.CONTINUE_EDITING);
      return;
    }
    setPrompt(current);
    setGeneratorMode("quick_script", "continue_editing");
    track("quick_script_edit_started", {
      generator_mode: "quick_script",
      prompt_category: categorizePrompt(current),
    });
  }, [gateQuickScriptAction, prompt, quickScript.prompt, setGeneratorMode, track, user]);

  const handleQuickScriptOpenAgentBuild = useCallback(async () => {
    const sourcePrompt = quickScript.prompt || prompt;
    const agentPrompt = quickScriptResultToAgentPrompt(sourcePrompt, quickScript.result);
    track("quick_script_opened_as_agent_build", {
      generator_mode: "agent_build",
      prompt_category: categorizePrompt(sourcePrompt),
      has_quick_script_result: Boolean(quickScript.result?.code),
    });
    if (!user) {
      gateQuickScriptAction(PENDING_AUTH_ACTIONS.UPGRADE_TO_AGENT_BUILD);
      return;
    }
    if (quickScript.projectId) {
      try {
        const upgraded = await upgradeQuickScriptProjectToAgent({ projectId: quickScript.projectId });
        setQuickScript((prev) => ({
          ...prev,
          projectId: upgraded.project?.projectId || prev.projectId,
          project: upgraded.project || prev.project,
          updatedAt: Date.now(),
        }));
        track("quick_script_upgraded_to_agent", {
          generator_mode: "agent_build",
          previous_mode: upgraded.previousMode || "quick_script",
          has_project: true,
        }, { dedupeKey: `quick_script_agent_upgrade:${quickScript.projectId}` });
      } catch (err) {
        notify({
          message: err?.message || "Could not update the saved project yet; opening Agent Build with the preserved context.",
          type: "error",
        });
      }
    }
    setGeneratorMode("agent_build", "quick_script_upgrade");
    setPrompt(agentPrompt);
    await handlePromptSubmit(null, agentPrompt);
  }, [
    gateQuickScriptAction,
    handlePromptSubmit,
    notify,
    prompt,
    quickScript.projectId,
    quickScript.prompt,
    quickScript.result,
    setGeneratorMode,
    track,
    user,
  ]);

  const handleAuthRequired = useCallback((actionType = PENDING_AUTH_ACTIONS.RESTRICTED_GENERATION, source = "workspace_gate") => {
    recordPendingAuthGate(actionType, source);
    setShowSignInNudge(true);
  }, [recordPendingAuthGate]);

  useEffect(() => {
    const expired = consumeExpiredPendingAuthAction();
    if (!expired) return;
    track("pending_action_expired", {
      generator_mode: expired.workspace || generatorMode,
      gated_action: expired.action,
      prompt_category: expired.payload?.promptCategory,
    }, { dedupeKey: `pending_expired:${expired.id}` });
    notify({
      message: `Your sign-in action expired. The workspace is still here; click ${actionLabel(expired.action)} again to continue.`,
      type: "info",
      duration: 7000,
    });
  }, [generatorMode, notify, track]);

  useEffect(() => {
    if (!user) return;
    const completed = readCompletedPendingAuthAction();
    if (!completed || pendingAuthResumeRef.current === `completed:${completed.id}`) return;
    pendingAuthResumeRef.current = `completed:${completed.id}`;
    clearCompletedPendingAuthAction(completed.id);
  }, [user]);

  useEffect(() => {
    if (!user || pendingRobloxResumeRef.current) return;
    const pending = readPendingRobloxAction();
    if (!pending) return;
    pendingRobloxResumeRef.current = true;
    clearPendingRobloxAction();
    const resumeRobloxAction = async () => {
      await refreshRobloxStatus();
      if (pending.requiresFileReselect) {
        notify({
          message:
            "Roblox authorization is ready. Select your local files again to continue the upload.",
          type: "info",
          duration: 8000,
        });
        return;
      }
      if (pending.type === "creator_store_search") {
        notify({
          message: "Roblox authorization is ready. Continue your Creator Store search.",
          type: "success",
          duration: 6000,
        });
        return;
      }
      notify({
        message: "Roblox authorization is ready. Continue your Roblox action.",
        type: "success",
        duration: 6000,
      });
    };
    void resumeRobloxAction();
  }, [notify, user, refreshRobloxStatus]);

  useEffect(() => {
    if (!user) return;
    const pending = readPendingAuthAction();
    if (!pending || pendingAuthResumeRef.current === pending.id) return;

    const inProgress = markPendingAuthActionInProgress(pending.id);
    if (!inProgress) return;
    pendingAuthResumeRef.current = pending.id;

    let cancelled = false;

    const resume = async () => {
      track("pending_action_restored", {
        generator_mode: pending.workspace || generatorMode,
        gated_action: pending.action,
        prompt_category: pending.payload?.promptCategory,
      }, { dedupeKey: `pending_restored:${pending.id}` });

      let claimed = false;
      if (quickScript.claim?.anonymousResultId && quickScript.claim?.claimToken) {
        try {
          await claimQuickScriptResult({
            anonymousResultId: quickScript.claim.anonymousResultId,
            claimToken: quickScript.claim.claimToken,
          });
          claimed = true;
          track("anonymous_project_claimed", {
            generator_mode: "quick_script",
            output_type: "luau_script",
          }, { dedupeKey: `anonymous_claimed:${quickScript.claim.anonymousResultId}` });
        } catch (err) {
          if (!["QUICK_SCRIPT_ALREADY_CLAIMED"].includes(String(err?.code || ""))) {
            notify({ message: err?.message || "Could not claim the anonymous Quick result", type: "error" });
          }
        }
      }

      if (cancelled) return;

      let outcome = "completed";
      try {
        switch (pending.action) {
          case PENDING_AUTH_ACTIONS.SAVE_PROJECT:
            await handleQuickScriptSave();
            break;
          case PENDING_AUTH_ACTIONS.EXPORT_PROJECT:
            handleQuickScriptExport();
            break;
          case PENDING_AUTH_ACTIONS.PUSH_TO_STUDIO:
            if (studioConnection.pluginConnected) {
              await handleQuickScriptStudioPush();
            } else {
              outcome = "needs_studio_pairing";
              notify({
                message: "Sign-in restored your Studio push. Pair Studio, then press Studio again to apply it.",
                type: "info",
                duration: 8000,
              });
            }
            break;
          case PENDING_AUTH_ACTIONS.CONTINUE_EDITING:
            handleQuickScriptContinueEditing();
            break;
          case PENDING_AUTH_ACTIONS.UPGRADE_TO_AGENT_BUILD:
            await handleQuickScriptOpenAgentBuild();
            break;
          case PENDING_AUTH_ACTIONS.CHAT_SUBMIT: {
            const resumedPrompt = String(pending.payload?.prompt || "").trim();
            const resumedAttachments = normalizeChatAttachments(pending.payload?.attachments);
            const resumedMode = pending.payload?.chatMode || settings?.chatMode || "agent";
            const resumedModel = pending.payload?.modelVersion || "";
            if (resumedModel && resumedModel !== settings?.modelVersion) {
              await updateSettings({ modelVersion: resumedModel });
            }
            setActiveTab("chat");
            if (isMobile) setMobileTab("chat");
            setPrompt("");
            setAttachments([]);
            if (resumedPrompt || resumedAttachments.length) {
              await unified.handleSubmit(
                resumedPrompt,
                resumedAttachments,
                workspace.projectArtifactSnapshot,
                { mode: resumedMode }
              );
            } else {
              outcome = "restored";
              notify({
                message: "Sign-in restored your workspace. Add a prompt to continue.",
                type: "success",
                duration: 7000,
              });
            }
            break;
          }
          case PENDING_AUTH_ACTIONS.RESTRICTED_GENERATION:
            await runQuickScript(quickScript.prompt || prompt, { source: "pending_auth_resume" });
            break;
          default:
            outcome = "restored";
            notify({
              message: `Sign-in restored your workspace. Click ${actionLabel(pending.action)} to continue.`,
              type: "success",
              duration: 7000,
            });
            break;
        }
        completePendingAuthAction(pending.id, {
          resumedOutcome: outcome,
          quickScriptClaimAvailable: claimed,
        });
        track("pending_action_completed", {
          generator_mode: pending.workspace || generatorMode,
          gated_action: pending.action,
          prompt_category: pending.payload?.promptCategory,
          resumed_outcome: outcome,
        }, { dedupeKey: `pending_completed:${pending.id}` });
        if (outcome === "completed") {
          notify({
            message: `Sign-in complete. Resumed ${actionLabel(pending.action)}.`,
            type: "success",
            duration: 6000,
          });
        }
      } catch (err) {
        completePendingAuthAction(pending.id, { resumedOutcome: "failed" });
        notify({ message: err?.message || `Could not resume ${actionLabel(pending.action)}`, type: "error" });
      }
    };

    void resume();
    return () => {
      cancelled = true;
    };
  }, [
    generatorMode,
    handleQuickScriptContinueEditing,
    handleQuickScriptExport,
    handleQuickScriptOpenAgentBuild,
    handleQuickScriptSave,
    handleQuickScriptStudioPush,
    isMobile,
    notify,
    prompt,
    quickScript.claim,
    quickScript.prompt,
    runQuickScript,
    settings?.chatMode,
    settings?.modelVersion,
    studioConnection.pluginConnected,
    track,
    unified,
    updateSettings,
    user,
    workspace.projectArtifactSnapshot,
  ]);

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
    isStarterOrAbove,
    isAdmin,
      unlimitedTokens,
      devOverride,
      flags,
      entitlements,
      dailyUsage,
      includedUsage,
      premiumBalance,
      isFreeUsagePlan,
      billingLoading,
      billingError,
    },
    starterPromo,
    navigation: {
      navigate,
      location,
    },
    uiState: {
      user,
      authReady,
      appCheckError: appCheckError?.message || null,
      isMobile,
      sidebarOpen,
      activeTab,
      mobileTab,
      generatorMode,
      quickScript,
      prompt,
      isImproving,
      refineTarget,
      rewindTarget,
      attachments,
      robloxImageUploading: robloxImageUpload.uploading,
      robloxImageUploads: robloxImageUpload.activeUploads,
      scripts,
      projectContext,
      architecturePanelOpen,
      teams,
      showSignInNudge,
      signInNudgeReason,
      showProNudge,
      proNudgeReason,
      codeDrawerOpen,
      codeDrawerData,
      currentTheme,
      activeModeData,
      currentToast,
      toasts,
      chatOperationState,
    },
    refs: {
      chatEndRef,
    },
    modules: {
      chat,
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
      setRewindTarget,
      cancelRewind,
      setGeneratorMode,
      setAttachments,
      setArchitecturePanelOpen,
      setShowSignInNudge,
      setShowProNudge,
      setProNudgeReason,
      setCodeDrawerOpen,
      dismissToast,
      updateSettings,

      handlePromptSubmit,
      stopChatOperation,
      resumeChatQueue,
      sendNextChatOperation,
      removeQueuedChatOperation,
      runQuickScript,
      handleQuickScriptCopy,
      handleQuickScriptSave,
      handleQuickScriptExport,
      handleQuickScriptStudioPush,
      handleQuickScriptContinueEditing,
      handleQuickScriptOpenAgentBuild,
      handleAuthRequired,
      onApprovePlan: (message, submissionOptions = {}) => (
        unified.approvePlan(message, workspace.projectArtifactSnapshot, submissionOptions)
      ),
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
      handleSelectStudioTarget,
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
      ...studioConnection,
      enabled: studioEnabled,
      applyMode: studioApplyMode,
      autoPushEnabled: Boolean(settings?.studioAutoPushEnabled),
      autoPushPolicy: settings?.studioAutoPushPolicy || "after_validation",
      lastAuthorizedSessionId: settings?.lastAuthorizedStudioSessionId || null,
      approvingStepId,
      selectingStudioTargetId,
      restoringRun,
      unifiedAgent: FEATURE_FLAGS.unifiedAgent,
      placeOptions: studioPlaceOptions,
      placePreference: effectiveStudioPlacePreference,
      placePickerOpen: studioPlacePickerOpen,
      setPlacePickerOpen: setStudioPlacePickerOpen,
      bindPlace: bindChatStudioPlace,
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
      assetLibraryAvailable: Boolean(
        user && robloxStatus?.connected === true && isCreatorStoreReadAuthorized(robloxStatus)
      ),
      assetLibraryDisabledReason: !user
        ? "Sign in before selecting Roblox assets."
        : robloxStatus?.connected !== true
            ? "Connect Roblox before selecting assets."
            : !isCreatorStoreReadAuthorized(robloxStatus)
              ? "Reauthorize Roblox to browse your assets."
              : "",
      uploadStatus: projectAssets.uploadStatus,
      refresh: refreshRobloxStatus,
      refreshProjectAssets: projectAssets.refresh,
    },
  };
}

export default useAiWorkspaceController;
