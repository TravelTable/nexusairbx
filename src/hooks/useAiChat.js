import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { 
  doc, 
  collection, 
  query, 
  orderBy, 
  limit,
  limitToLast, 
  onSnapshot, 
  serverTimestamp, 
  writeBatch, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  addDoc,
  getDocs
} from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import { auth, db, firebaseConfig } from "../firebase";
import { BACKEND_URL } from "../config";
import { ensureStreamSession } from "../lib/streamSession";
import {
  buildStreamUrl,
  formatRecoveryStage,
  parseCompletedGenerateResult,
  pollJobResult,
  RECOVERY_WALL_TIMEOUT_MS,
  updateSeqFromPayload,
} from "../lib/streamRecovery";
import { FEATURE_FLAGS } from "../lib/featureFlags";
import {
  getStudioApplyMode,
  getStudioEnabledPreference,
  normalizeToolStep,
  upsertAgentStep,
} from "../lib/agentSteps";
import { resolveGameSpecForPrompt } from "../lib/gameProfile";
import { getStudioStatus } from "../lib/studioBridgeApi";
import {
  getStudioConnectionType,
  getStudioPlaceId,
  getStudioSessionId,
  isStudioSessionLive,
  selectMcpStudioSession,
  selectPluginStudioSession,
  STUDIO_CONNECTION_TYPES,
} from "../lib/studioConnection";
import { getAgentRun } from "../lib/workflowApi";
import {
  applyStreamActivity,
  applyStreamDelta,
  applyReasoningDelta,
  createPendingStreamState,
  formatPendingStreamContent,
  getPendingStreamSnapshot,
} from "../lib/streaming";
import { emitStreamMetric } from "../lib/streamMetrics";
import { createIdlePulseController, stageSlug } from "../lib/streamEngagement";
import { AI_EVENTS, emitAiEvent, onAiEvent } from "../lib/aiEvents";
import { useBilling } from "../context/BillingContext";
import {
  isInsufficientTokensError,
  insufficientTokensToast,
  parseApiErrorPayload,
  formatUserFacingError,
} from "../lib/billingErrors";
import {
  describeChatAttachments,
  messageToConversationEntry,
  normalizeChatAttachments,
} from "../lib/chatAttachments";
import { createChatProgressPersistence } from "../lib/chatProgressPersistence";
import {
  associateChatMessageWrites,
  finishChatWriteMetrics,
  recordChatMessageWrite,
} from "../lib/clientFirestoreWriteMetrics";

const STREAM_MAX_RETRIES = 3;
const RESULT_MAX_POLLS = 45;
const RESULT_POLL_BASE_MS = 1000;
const CUSTOM_MODES_LIST_LIMIT = 50;
const CHAT_INITIAL_HISTORY_LIMIT = 50;
const CHAT_LIVE_TAIL_LIMIT = 20;
const CLEAR_CHAT_MESSAGE_LIMIT = 200;
const PENDING_RUN_POLL_MS = 30_000;
// Absolute frontend backstop: if the stream never delivers a terminal event
// (done/error) within this window, poll once for a result and otherwise hand the
// job off to the background so the UI can never spin/pulse forever.
const GENERATION_WALL_TIMEOUT_MS = Number(
  process.env.REACT_APP_GENERATION_WALL_TIMEOUT_MS || 12 * 60 * 1000
);

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function messageCreatedAtMillis(message) {
  const value = message?.createdAt;
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (Number.isFinite(value?.seconds)) {
    return (value.seconds * 1000) + Math.floor(Number(value.nanoseconds || 0) / 1_000_000);
  }
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  return Number.MAX_SAFE_INTEGER;
}

function mergeChatMessages(...messageSets) {
  const byId = new Map();
  messageSets.flat().forEach((message) => {
    if (message?.id) byId.set(message.id, message);
  });
  return Array.from(byId.values()).sort((a, b) => (
    messageCreatedAtMillis(a) - messageCreatedAtMillis(b)
  ));
}

function resolveResultUrl(jobId, resultUrl) {
  if (resultUrl && /^https?:\/\//i.test(resultUrl)) return resultUrl;
  if (resultUrl && resultUrl.startsWith("/")) return `${BACKEND_URL}${resultUrl}`;
  if (resultUrl) return `${BACKEND_URL}/${resultUrl.replace(/^\/+/, "")}`;
  return `${BACKEND_URL}/api/generate/result?jobId=${encodeURIComponent(jobId)}`;
}

function buildAssistantMessagePayload(data, { requestId, jobId, currentMode, isAutoExecuting }) {
  const payload = {
    role: "assistant",
    content: "",
    explanation: data?.explanation || "",
    summary: data?.summary || "",
    thought: data?.thought || "",
    code: data?.content || data?.code || "",
    title: data?.title || "",
    projectId: data?.projectId || null,
    versionNumber: data?.versionNumber || 1,
    pending: false,
    isAutoExecuting,
    updatedAt: serverTimestamp(),
    metadata: {
      ...(data?.metadata || {}),
      mode: currentMode,
      type: data?.artifactType || data?.metadata?.type || null,
      qaReport: data?.qaReport || null,
      runState: data?.runState || data?.metadata?.runState || null,
    },
  };

  if (requestId) payload.requestId = requestId;
  if (jobId) payload.jobId = jobId;
  if (data?.artifactId) payload.artifactId = data.artifactId;
  if (data?.options) payload.options = data.options;
  if (data?.plan) payload.plan = data.plan;
  if (Array.isArray(data?.files) && data.files.length) payload.files = data.files;
  if (data?.revision) payload.revision = data.revision;
  if (Array.isArray(data?.setupSteps) && data.setupSteps.length) payload.setupSteps = data.setupSteps;
  if (Array.isArray(data?.testingSteps) && data.testingSteps.length) payload.testingSteps = data.testingSteps;
  if (Array.isArray(data?.securityNotes) && data.securityNotes.length) payload.securityNotes = data.securityNotes;
  if (Array.isArray(data?.warnings) && data.warnings.length) payload.warnings = data.warnings;
  if (Array.isArray(data?.steps) && data.steps.length) payload.steps = data.steps.map(normalizeToolStep);
  if (data?.runId) payload.runId = data.runId;
  return payload;
}

export function useAiChat(user, settings, refreshBilling, notify, { authReady = true } = {}) {
  const { totalRemaining, unlimitedTokens, plan } = useBilling();
  const planKey = String(plan || "FREE").toLowerCase();
  const [messages, setMessages] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [currentChatMeta, setCurrentChatMeta] = useState(null);
  const [activeMode, setActiveMode] = useState(settings?.chatMode || "agent");
  const [customModes, setCustomModes] = useState([]);
  const [firestoreAccessError, setFirestoreAccessError] = useState(null);
  // Generation state is keyed by the *originating* chat id so that a generation
  // started in one chat keeps running (and rendering) in that chat even after
  // the user navigates to a different chat. The UI consumes only the slice that
  // belongs to the currently open chat (derived below).
  const [generatingChats, setGeneratingChats] = useState({}); // chatId -> bool
  const [pendingMessages, setPendingMessages] = useState({}); // chatId -> pendingMessage|null
  const [generationStages, setGenerationStages] = useState({}); // chatId -> string
  const [tasks, setTasks] = useState([]);
  const [currentTaskId, setCurrentTaskId] = useState(null);
  const [chatMode, setChatMode] = useState("plan"); // "plan" | "act"

  // Synchronous mirror of which chats are generating, so we can guard against
  // double-submits without waiting for a state flush.
  const generatingRef = useRef({});

  // Live values for the currently open chat (what the UI renders).
  const isGenerating = !!generatingChats[currentChatId];
  const pendingMessage = (currentChatId && pendingMessages[currentChatId]) || null;
  const generationStage = (currentChatId && generationStages[currentChatId]) || "";

  // Chat ids that currently have an in-flight generation (for sidebar badges).
  const generatingChatIds = useMemo(
    () => Object.keys(generatingChats).filter((id) => generatingChats[id]),
    [generatingChats]
  );

  const setPendingForChat = useCallback((chatId, updater) => {
    if (!chatId) return;
    setPendingMessages((prev) => {
      const cur = prev[chatId] ?? null;
      const next = typeof updater === "function" ? updater(cur) : updater;
      if (next === cur) return prev;
      return { ...prev, [chatId]: next };
    });
  }, []);

  const setStageForChat = useCallback((chatId, value) => {
    if (!chatId) return;
    setGenerationStages((prev) => {
      if (prev[chatId] === value) return prev;
      return { ...prev, [chatId]: value };
    });
  }, []);

  const setGeneratingForChat = useCallback((chatId, value) => {
    if (!chatId) return;
    generatingRef.current[chatId] = value;
    setGeneratingChats((prev) => {
      if (Boolean(prev[chatId]) === Boolean(value)) return prev;
      return { ...prev, [chatId]: value };
    });
  }, []);

  // Update the pending message for the currently open chat (used by interactive
  // UI like "approve step"). Generation internals use setPendingForChat directly.
  const setPendingMessage = useCallback(
    (updater) => setPendingForChat(currentChatId, updater),
    [setPendingForChat, currentChatId]
  );

  const reportedFirestoreFailuresRef = useRef(new Set());
  const reportFirestoreFailure = useCallback((err, { uid, chatId = null, operation }) => {
    const failureKey = [operation, err?.code || "unknown", uid || "none", chatId || "none"].join(":");
    if (reportedFirestoreFailuresRef.current.has(failureKey)) return;
    reportedFirestoreFailuresRef.current.add(failureKey);

    console.error("Firestore request failed", {
      code: err?.code,
      message: err?.message,
      uid,
      chatId,
      projectId: firebaseConfig.projectId,
      authReady,
      emailVerified: auth.currentUser?.emailVerified,
    });

    if (err?.code === "permission-denied") {
      setFirestoreAccessError({ operation, uid, chatId, code: err.code });
      notify?.({
        message: "Your workspace data could not be loaded. Please refresh or sign in again.",
        type: "error",
      });
    } else {
      notify?.({ message: "Failed to load workspace data", type: "error" });
    }
  }, [authReady, notify]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    console.debug("Firebase auth diagnostics", {
      "auth.currentUser?.uid": auth.currentUser?.uid || null,
      "user?.uid": user?.uid || null,
      "auth.currentUser?.emailVerified": auth.currentUser?.emailVerified ?? null,
      "firebaseConfig.projectId": firebaseConfig.projectId,
    });
  }, [authReady, user?.uid]);

  // Listen for code patches (Security/Performance fixes)
  useEffect(() => {
    const handleApplyPatch = async (e) => {
      const { code, messageId } = e.detail;
      const uid = user?.uid;
      if (!authReady || !uid || auth.currentUser?.uid !== uid || !currentChatId || !messageId) return;

      try {
        const msgRef = doc(db, "users", uid, "chats", currentChatId, "messages", messageId);
        await updateDoc(msgRef, {
          code: code,
          updatedAt: serverTimestamp(),
          patchApplied: true
        });
        recordChatMessageWrite({ reason: "assistant_code_patch" });
        notify?.({ message: "Optimization applied successfully!", type: "success" });
      } catch (err) {
        console.error("Failed to apply patch:", err);
        notify?.({ message: "Failed to apply optimization", type: "error" });
      }
    };
    const unbind = onAiEvent(AI_EVENTS.APPLY_CODE_PATCH, handleApplyPatch);
    return () => unbind();
  }, [authReady, user?.uid, currentChatId, notify]);

  const messagesUnsubRef = useRef(null);
  const chatUnsubRef = useRef(null);
  const activeChatRequestRef = useRef(0);
  const closeChatSubscriptions = useCallback(() => {
    activeChatRequestRef.current += 1;
    messagesUnsubRef.current?.();
    chatUnsubRef.current?.();
    messagesUnsubRef.current = null;
    chatUnsubRef.current = null;
  }, []);
  // Streaming buffers keyed by originating chat id.
  const streamStatesRef = useRef({}); // chatId -> pendingStreamState

  // Auth and App Check must both be ready before these owner-scoped reads run.
  useEffect(() => {
    const uid = user?.uid;
    if (!authReady || !uid || auth.currentUser?.uid !== uid) {
      setCustomModes((currentModes) => (
        currentModes.length > 0 ? [] : currentModes
      ));
      return undefined;
    }

    let cancelled = false;
    getDocs(query(
      collection(db, "users", uid, "custom_modes"),
      limit(CUSTOM_MODES_LIST_LIMIT)
    )).then((snap) => {
      if (cancelled) return;
      setCustomModes(snap.docs.map((d) => ({ id: d.id, ...d.data(), isCustom: true })));
    }).catch((err) => {
      if (cancelled) return;
      setCustomModes([]);
      reportFirestoreFailure(err, { uid, operation: "custom-modes-list" });
    });

    return () => {
      cancelled = true;
    };
  }, [authReady, reportFirestoreFailure, user?.uid]);

  useEffect(() => () => closeChatSubscriptions(), [closeChatSubscriptions]);

  useEffect(() => {
    closeChatSubscriptions();
    setCurrentChatId(null);
    setCurrentChatMeta(null);
    setMessages([]);
    setFirestoreAccessError(null);
  }, [authReady, closeChatSubscriptions, user?.uid]);

  const openChatById = useCallback((chatId) => {
    const uid = user?.uid;
    if (!authReady || !uid || auth.currentUser?.uid !== uid || !chatId) return;

    closeChatSubscriptions();
    const requestId = activeChatRequestRef.current;
    const isActive = () => activeChatRequestRef.current === requestId;

    setCurrentChatId(chatId);
    setCurrentChatMeta(null);
    setMessages([]);
    // #region agent log
    fetch('http://127.0.0.1:7578/ingest/57d6d18f-d552-454d-9136-c39042e05f2e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'8a6e57'},body:JSON.stringify({sessionId:'8a6e57',runId:'pre-fix',hypothesisId:'A,C',location:'useAiChat.js:openChatById',message:'openChatById cleared meta',data:{chatId},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

    chatUnsubRef.current = onSnapshot(
      doc(db, "users", uid, "chats", chatId),
      (snap) => {
        if (!isActive()) return;
        const data = snap.exists() ? { id: snap.id, ...snap.data() } : null;
        // #region agent log
        fetch('http://127.0.0.1:7578/ingest/57d6d18f-d552-454d-9136-c39042e05f2e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'8a6e57'},body:JSON.stringify({sessionId:'8a6e57',runId:'pre-fix',hypothesisId:'A,C',location:'useAiChat.js:chatMetaSnapshot',message:'Chat meta snapshot',data:{chatId,exists:snap.exists(),studioPref:data?.studioTargetPreference||null},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        setCurrentChatMeta(data || null);
        if (data?.activeMode) {
          setActiveMode(data.activeMode);
        }
      },
      (err) => {
        if (!isActive()) return;
        setCurrentChatMeta(null);
        reportFirestoreFailure(err, { uid, chatId, operation: "chat-meta-subscription" });
      }
    );

    const messagesRef = collection(db, "users", uid, "chats", chatId, "messages");
    let cancelled = false;
    let liveUnsub = () => {};
    liveUnsub = onSnapshot(
      query(messagesRef, orderBy("createdAt", "asc"), limitToLast(CHAT_LIVE_TAIL_LIMIT)),
      (snap) => {
        if (cancelled || !isActive()) return;
        const liveMessages = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setMessages((current) => mergeChatMessages(current, liveMessages));
      },
      (err) => {
        if (cancelled || !isActive()) return;
        cancelled = true;
        liveUnsub();
        messagesUnsubRef.current = null;
        setMessages([]);
        reportFirestoreFailure(err, { uid, chatId, operation: "messages-live-subscription" });
      }
    );

    getDocs(query(
      messagesRef,
      orderBy("createdAt", "desc"),
      limit(CHAT_INITIAL_HISTORY_LIMIT)
    )).then((snap) => {
      if (cancelled || !isActive()) return;
      const history = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMessages((current) => mergeChatMessages(history, current));
    }).catch((err) => {
      if (cancelled || !isActive()) return;
      reportFirestoreFailure(err, { uid, chatId, operation: "messages-history-list" });
    });

    messagesUnsubRef.current = () => {
      cancelled = true;
      liveUnsub();
    };
  }, [authReady, closeChatSubscriptions, reportFirestoreFailure, user?.uid]);

  const pendingRecoveryMessage = useMemo(
    () =>
      [...(messages || [])]
        .reverse()
        .find((m) => m.role === "assistant" && m.pending && m.jobId && m.id) || null,
    [messages]
  );
  const pendingRecoveryRef = useRef(null);
  useEffect(() => {
    pendingRecoveryRef.current = pendingRecoveryMessage;
  }, [pendingRecoveryMessage]);

  useEffect(() => {
    const uid = user?.uid;
    if (!authReady || !uid || auth.currentUser?.uid !== uid || !currentChatId || isGenerating) return;
    const pending = pendingRecoveryRef.current;
    if (!pending) return;

    let cancelled = false;
    const pendingRef = doc(db, "users", uid, "chats", currentChatId, "messages", pending.id);
    const chatRef = doc(db, "users", uid, "chats", currentChatId);

    const pollPendingRun = async () => {
      try {
        const currentPending = pendingRecoveryRef.current || pending;
        if (!currentPending) return;
        const activeUser = auth.currentUser;
        if (!activeUser || activeUser.uid !== user?.uid) return;
        const token = await activeUser.getIdToken();
        const res = await fetch(resolveResultUrl(currentPending.jobId, currentPending.resultUrl), {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });
        if (cancelled) return;
        const contentType = res.headers.get("content-type") || "";
        const body = contentType.includes("application/json")
          ? await res.json().catch(() => ({}))
          : {};

        if (res.status === 202) {
          if (currentPending.runId) {
            const runResult = await getAgentRun(currentPending.runId);
            if (cancelled) return;
            const steps = Array.isArray(runResult?.run?.steps)
              ? runResult.run.steps.map(normalizeToolStep)
              : [];
            const lastStep = steps[steps.length - 1];
            const stage = lastStep?.label || lastStep?.type || runResult?.run?.status || currentPending.stage || "Working...";
            setMessages((current) => current.map((message) => (
              message.id === currentPending.id ? { ...message, steps, stage } : message
            )));
          }
          return;
        }

        const billingFailure = parseApiErrorPayload(body);
        if (billingFailure || res.status === 402) {
          const persisted = await updateDoc(pendingRef, {
            pending: false,
            stage: "failed",
            errorCode: "INSUFFICIENT_TOKENS",
            error: billingFailure?.message || body?.message || "You're out of tokens.",
            updatedAt: serverTimestamp(),
          }).then(() => true).catch(() => false);
          if (persisted) {
            recordChatMessageWrite({ jobId: currentPending.jobId, reason: "assistant_recovery_failure" });
            finishChatWriteMetrics(currentPending.jobId, "error");
          }
          return;
        }

        let data = null;
        try {
          data = parseCompletedGenerateResult(body);
        } catch (err) {
          const persisted = await updateDoc(pendingRef, {
            pending: false,
            stage: "failed",
            errorCode: err?.code || null,
            error: err?.message || `Generation failed (${res.status})`,
            updatedAt: serverTimestamp(),
          }).then(() => true).catch(() => false);
          if (persisted) {
            recordChatMessageWrite({ jobId: currentPending.jobId, reason: "assistant_recovery_failure" });
            finishChatWriteMetrics(currentPending.jobId, "error");
          }
          return;
        }
        if (!data) {
          if (!res.ok) {
            const persisted = await updateDoc(pendingRef, {
              pending: false,
              stage: "failed",
              errorCode: body?.code || null,
              error: body?.message || body?.error || `Generation failed (${res.status})`,
              updatedAt: serverTimestamp(),
            }).then(() => true).catch(() => false);
            if (persisted) {
              recordChatMessageWrite({ jobId: currentPending.jobId, reason: "assistant_recovery_failure" });
              finishChatWriteMetrics(currentPending.jobId, "error");
            }
            return;
          }
          data = body?.result || body;
        }
        if (data?.status === "pending" || data?.done === false) return;
        const currentMode = currentPending.metadata?.mode || currentPending.mode || chatMode;
        const msgPayload = buildAssistantMessagePayload(data, {
          requestId: currentPending.requestId,
          jobId: currentPending.jobId,
          currentMode,
          isAutoExecuting: Boolean(currentPending.isAutoExecuting || currentMode === "act"),
        });
        if (data?.runId || currentPending.runId) msgPayload.runId = data?.runId || currentPending.runId;
        await updateDoc(pendingRef, msgPayload);
        recordChatMessageWrite({ jobId: currentPending.jobId, reason: "assistant_recovery_success" });
        finishChatWriteMetrics(currentPending.jobId, "done");
        await updateDoc(chatRef, {
          updatedAt: serverTimestamp(),
          lastMessage: (currentPending.prompt || data?.title || "Studio agent run").slice(0, 50),
        }).catch(() => {});
        refreshBilling?.();
        emitAiEvent("JOB_COMPLETE", { jobId: currentPending.jobId });
      } catch (err) {
        console.warn("Failed to recover pending agent run:", err?.message || err);
      }
    };

    pollPendingRun();
    const intervalId = setInterval(pollPendingRun, PENDING_RUN_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [
    authReady,
    user?.uid,
    currentChatId,
    pendingRecoveryMessage?.id,
    pendingRecoveryMessage?.jobId,
    pendingRecoveryMessage?.runId,
    isGenerating,
    chatMode,
    refreshBilling,
  ]);

  const handleSubmit = async (
    prompt,
    existingChatId = null,
    existingRequestId = null,
    modeOverride = null,
    actNow = false,
    attachments = [],
    baseArtifact = null,
    submissionOptions = {}
  ) => {
    const normalizedAttachments = normalizeChatAttachments(attachments);
    const content = String(prompt || "").trim();
    const displayContent = content || describeChatAttachments(normalizedAttachments) || "Attached file(s)";
    const requestPrompt = content || "Please use the attached file(s) for this request.";
    if (!content && normalizedAttachments.length === 0) return;
    if (!authReady || !user?.uid || auth.currentUser?.uid !== user.uid) return;

    if (!unlimitedTokens && totalRemaining <= 0) {
      notify(insufficientTokensToast(planKey));
      return;
    }

    const currentMode = actNow ? "act" : chatMode;
    const requestId = existingRequestId || uuidv4();

    let activeChatId = existingChatId || currentChatId;
    // Block only if THIS chat already has an in-flight generation; other chats
    // are free to generate concurrently.
    if (activeChatId && generatingRef.current[activeChatId]) return;

    const expertMode = modeOverride || activeMode || settings.chatMode || "agent";

    // Setters bound to the originating chat. `activeChatId` is a `let` that may be
    // assigned below (new chat); these closures always read its latest value, so
    // generation state lands in the chat it started in regardless of navigation.
    const setPending = (updater) => setPendingForChat(activeChatId, updater);
    const setStage = (value) => setStageForChat(activeChatId, value);
    const setBusy = (value) => setGeneratingForChat(activeChatId, value);

    const publishGenerationStage = (chatId, label, { id, status, extraPending } = {}) => {
      if (!label || !chatId) return;
      streamStatesRef.current[chatId] = applyStreamActivity(
        streamStatesRef.current[chatId] || createPendingStreamState(),
        {
          id: id || `stage-${stageSlug(label)}`,
          type: "stage",
          status: status || label,
          text: label,
        }
      );
      const snapshot = getPendingStreamSnapshot(streamStatesRef.current[chatId]);
      setStageForChat(chatId, label);
      setPendingForChat(chatId, (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          stage: label,
          streamState: snapshot,
          streamStatus: null,
          ...(extraPending || {}),
        };
      });
    };

    const beginGenerationState = (chatId) => {
      setGeneratingForChat(chatId, true);
      const initialState = applyStreamActivity(createPendingStreamState(), {
        type: "stage",
        text: "Analyzing Request...",
        status: "Analyzing Request...",
      });
      streamStatesRef.current[chatId] = initialState;
      setPendingForChat(chatId, {
        role: "assistant",
        content: "",
        type: "chat",
        prompt: displayContent,
        mode: currentMode,
        requestId,
        stage: "Analyzing Request...",
        streamState: getPendingStreamSnapshot(initialState),
      });
      setStageForChat(chatId, "Analyzing Request...");
    };

    if (activeChatId) beginGenerationState(activeChatId);

    try {
      if (!activeChatId) {
        let selectedProjectId = String(submissionOptions?.projectId || "").trim();
        if (!selectedProjectId) {
          try {
            selectedProjectId = String(localStorage.getItem("nexusrbx.selectedWorkspaceProjectId") || "").trim();
          } catch (_) {
            selectedProjectId = "";
          }
        }
        const newChatPayload = {
          title: displayContent.slice(0, 30) + (displayContent.length > 30 ? "..." : ""),
          activeMode: expertMode,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        if (selectedProjectId) newChatPayload.projectId = selectedProjectId;
        if (submissionOptions?.studioTargetPreference) {
          newChatPayload.studioTargetPreference = submissionOptions.studioTargetPreference;
        } else if (selectedProjectId) {
          try {
            const { getProjectBinding } = await import("../lib/projectBindingsApi");
            const result = await getProjectBinding(selectedProjectId);
            const project = result?.project;
            if (project?.studioTargetId || project?.defaultPlaceId || project?.placeId) {
              newChatPayload.studioTargetPreference = {
                targetId: project.studioTargetId || null,
                placeId: project.defaultPlaceId || project.placeId || null,
                label: project.studioTargetLabel || project.title || "Untitled Studio project",
              };
            }
          } catch (_) {
            /* non-fatal */
          }
        }
        const newChatRef = await addDoc(collection(db, "users", user.uid, "chats"), newChatPayload);
        activeChatId = newChatRef.id;
        openChatById(activeChatId);
        beginGenerationState(activeChatId);
      }

      if (!existingRequestId) {
        const userMsgRef = doc(db, "users", user.uid, "chats", activeChatId, "messages", `${requestId}-user`);
        await setDoc(userMsgRef, {
          role: "user",
          content: displayContent,
          ...(normalizedAttachments.length ? { attachments: normalizedAttachments } : {}),
          createdAt: serverTimestamp(),
          requestId,
        });
        recordChatMessageWrite({ reason: "user_message" });
      }

      publishGenerationStage(activeChatId, "Preparing Job...");
      const token = await user.getIdToken();
      
      const idemKey = `chat-${requestId}`;
      const taskProjectId = FEATURE_FLAGS.newTaskRuntime
        && typeof submissionOptions?.projectId === "string"
        ? submissionOptions.projectId.trim()
        : "";
      const activeTaskId = FEATURE_FLAGS.newTaskRuntime
        && typeof submissionOptions?.activeTaskId === "string"
        ? submissionOptions.activeTaskId.trim()
        : "";
      const showPlan = FEATURE_FLAGS.newTaskRuntime && submissionOptions?.showPlan === true;
      const onTaskAccepted = FEATURE_FLAGS.newTaskRuntime
        && typeof submissionOptions?.onTaskAccepted === "function"
        ? submissionOptions.onTaskAccepted
        : null;
      
      // 1. Create Artifact Job
      const studioEnabled = FEATURE_FLAGS.unifiedAgent && getStudioEnabledPreference();
      const autoPushToStudio = Boolean(settings?.studioAutoPushEnabled);
      const autoPushPolicy = settings?.studioAutoPushPolicy || "after_validation";
      let studioSessionId = null;
      let studioConnectionType = null;
      let studioTargetPlaceId = null;
      if (studioEnabled) {
        try {
          const studioStatus = await getStudioStatus();
          const studioSession =
            selectMcpStudioSession(studioStatus.sessions, { capability: "readProject" }) ||
            selectPluginStudioSession(studioStatus.sessions, { compatibleOnly: true });
          studioSessionId = getStudioSessionId(studioSession);
          studioConnectionType = studioSession
            ? getStudioConnectionType(studioSession)
            : null;
          const liveStudioSessions = (Array.isArray(studioStatus.sessions) ? studioStatus.sessions : [])
            .filter((session) => isStudioSessionLive(session));
          const livePlaceIds = new Set(liveStudioSessions.map(getStudioPlaceId).filter(Boolean));
          const hasUnknownLivePlace = liveStudioSessions.some((session) => !getStudioPlaceId(session));
          studioTargetPlaceId = livePlaceIds.size === 1 && !hasUnknownLivePlace
            ? Array.from(livePlaceIds)[0]
            : null;
        } catch (_) {
          /* non-fatal: codegen still works without Studio */
        }
      }

      const preferredTarget =
        (submissionOptions?.studioTargetPreference && typeof submissionOptions.studioTargetPreference === "object"
          ? submissionOptions.studioTargetPreference
          : null)
        || currentChatMeta?.studioTargetPreference
        || null;
      const preferredTargetId = String(preferredTarget?.targetId || "").trim() || null;
      const preferredPlaceId = String(preferredTarget?.placeId || "").trim() || null;
      const preferredLabel = String(preferredTarget?.label || "").trim() || null;
      // #region agent log
      fetch('http://127.0.0.1:7578/ingest/57d6d18f-d552-454d-9136-c39042e05f2e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'8a6e57'},body:JSON.stringify({sessionId:'8a6e57',runId:'pre-fix',hypothesisId:'B,E',location:'useAiChat.js:persistPreference',message:'Persisting studio preference before job',data:{activeChatId,fromOptions:Boolean(submissionOptions?.studioTargetPreference),fromMeta:Boolean(currentChatMeta?.studioTargetPreference),preferredTargetId,preferredPlaceId,preferredLabel,willWrite:Boolean(preferredTargetId||preferredPlaceId),studioSessionId,studioConnectionType,studioTargetPlaceId},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      if (preferredTargetId || preferredPlaceId) {
        try {
          await updateDoc(doc(db, "users", user.uid, "chats", activeChatId), {
            studioTargetPreference: {
              targetId: preferredTargetId,
              placeId: preferredPlaceId,
              label: preferredLabel || "Untitled Studio project",
              updatedAt: serverTimestamp(),
            },
            updatedAt: serverTimestamp(),
          });
          setCurrentChatMeta((prev) => ({
            ...(prev || {}),
            studioTargetPreference: {
              targetId: preferredTargetId,
              placeId: preferredPlaceId,
              label: preferredLabel || "Untitled Studio project",
            },
          }));
        } catch (_) {
          /* preference persistence is best-effort; createRun still receives explicit fields */
        }
      }

      const jobRes = await fetch(`${BACKEND_URL}/api/generate/artifact`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          Authorization: `Bearer ${token}`,
          "Idempotency-Key": idemKey
        },
        body: JSON.stringify({ 
          prompt: requestPrompt,
          requestId,
          settings: {
            ...settings,
            gameSpec: resolveGameSpecForPrompt(settings?.gameSpec),
          },
          chatId: activeChatId,
          chatMode: expertMode,
          mode: currentMode,
          conversation: messages.slice(-10).map(messageToConversationEntry).filter(Boolean),
          attachments: normalizedAttachments,
          studioEnabled: studioEnabled && Boolean(studioSessionId),
          applyMode: getStudioApplyMode(),
          studioSessionId,
          studioConnectionType,
          routingMode: "hybrid",
          targetPlaceId: preferredPlaceId || studioTargetPlaceId,
          studioTargetId: preferredTargetId,
          studioTargetConfirmed: Boolean(preferredTargetId),
          autoPushToStudio:
            autoPushToStudio &&
            Boolean(studioSessionId) &&
            studioConnectionType === STUDIO_CONNECTION_TYPES.PLUGIN_BRIDGE,
          autoPushPolicy,
          baseArtifact,
          ...(FEATURE_FLAGS.newTaskRuntime ? {
            ...(taskProjectId ? { projectId: taskProjectId } : {}),
            ...(activeTaskId ? { activeTaskId } : {}),
            showPlan,
          } : {}),
        }),
      });
      
      if (!jobRes.ok) {
        let errorMsg = "Failed to create generation job";
        let errorCode = null;
        try {
          const contentType = jobRes.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const errData = await jobRes.json();
            const billingFailure = parseApiErrorPayload(errData);
            if (billingFailure) {
              notify(insufficientTokensToast(planKey));
              setBusy(false);
              setPending(null);
              setStage("");
              if (activeChatId) delete streamStatesRef.current[activeChatId];
              return;
            }
            errorMsg = formatUserFacingError(errData.message || errData.error || errorMsg);
            errorCode = errData.code || null;
          } else {
            const text = await jobRes.text();
            console.error("Server returned non-JSON error:", text);
            errorMsg = `Server Error (${jobRes.status})`;
          }
        } catch (e) {
          console.error("Error parsing error response:", e);
        }
        const err = new Error(errorMsg);
        if (errorCode) err.code = errorCode;
        throw err;
      }
      
      const jobData = await jobRes.json();
      const jobId = typeof jobData.jobId === "string" ? jobData.jobId.trim() : "";
      const acceptedTaskId = typeof jobData.taskId === "string" ? jobData.taskId.trim() : "";
      const runtimeTaskAccepted = FEATURE_FLAGS.newTaskRuntime
        && Boolean(acceptedTaskId)
        && (
          jobData.accepted === false
          || jobData.waitingUser === true
          || jobData.kind === "conversation"
          || jobData.kind === "continuation"
          || jobData.kind === "amendment"
          || (!jobId && jobData.ok !== false)
        );

      if (acceptedTaskId && onTaskAccepted) {
        try {
          onTaskAccepted(acceptedTaskId);
        } catch (error) {
          console.warn("Could not bind accepted task to the workspace runtime.", error);
        }
      }

      if (!jobId) {
        if (runtimeTaskAccepted) {
          const assistantMsgRef = doc(
            db,
            "users",
            user.uid,
            "chats",
            activeChatId,
            "messages",
            `${requestId}-assistant`,
          );
          const waitingCopy = jobData.waitingUser
            ? "I need a confirmation before continuing. Use the task panel to approve, amend, or set a price."
            : jobData.kind === "conversation"
              ? (typeof jobData.classification?.reply === "string" && jobData.classification.reply.trim())
                || "I can help with that in chat without starting a durable task."
              : jobData.requiresAction === "amend"
                ? "I treated that as a change to the active task. Amend or continue from the task panel."
                : jobData.requiresAction === "approve"
                  ? "The active task is ready to continue. Approve it from the task panel when you want execution to resume."
                  : "The durable task runtime accepted this request and is waiting for the next authorized action.";
          await setDoc(assistantMsgRef, {
            role: "assistant",
            content: waitingCopy,
            stage: jobData.waitingUser ? "Awaiting confirmation" : "Task update",
            pending: false,
            requestId,
            ...(acceptedTaskId ? { taskId: acceptedTaskId } : {}),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }, { merge: true });
          setBusy(false);
          setPending(null);
          setStage("");
          if (activeChatId) delete streamStatesRef.current[activeChatId];
          return;
        }
        throw new Error("Failed to create generation job");
      }
      if (!existingRequestId) {
        associateChatMessageWrites({ jobId, reason: "user_message", count: 1 });
      }
      const agentRunId = jobData.runId || null;
      const resultUrl = resolveResultUrl(jobId, jobData.resultUrl);
      const assistantMsgRef = doc(db, "users", user.uid, "chats", activeChatId, "messages", `${requestId}-assistant`);

      publishGenerationStage(activeChatId, "Generating...", { extraPending: { steps: [], runId: agentRunId } });
      await setDoc(assistantMsgRef, {
        role: "assistant",
        content: "",
        stage: "Generating...",
        pending: true,
        requestId,
        jobId,
        ...(acceptedTaskId ? { taskId: acceptedTaskId } : {}),
        ...(agentRunId ? { runId: agentRunId } : {}),
        isAutoExecuting: currentMode === "act",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        metadata: {
          mode: currentMode,
          type: null,
        },
        steps: [],
      }, { merge: true });
      recordChatMessageWrite({ jobId, reason: "assistant_initial" });

      publishGenerationStage(activeChatId, "Connecting...");
      const initialStreamSession = await ensureStreamSession(token, { retries: 1 }).catch(() => ({ token: null }));

      // 2. Connect to stream (tails worker events; auth via HttpOnly cookie + query token)
      return new Promise((resolve, reject) => {
        let eventSource = null;
        let receivedDone = false;
        let finalized = false;
        let recoverInFlight = false;
        let dualStreamAttempted = false;
        let lastSeq = 0;
        let lastStreamCursor = "0-0";
        let streamSessionToken = initialStreamSession?.token || null;
        let sseSessionUnavailable = !streamSessionToken;
        const isAutoExecuting = currentMode === "act";
        let retryCount = 0;
        let streamFlushTimer = null;
        let lastStreamFlushAt = 0;
        const metrics = {
          startedAt: Date.now(),
          firstDeltaAt: null,
          deltaCount: 0,
          usedFallback: false,
        };
        let idlePulse = null;
        let wallTimer = null;
        const progressPersistence = createChatProgressPersistence({
          key: `${user.uid}/${activeChatId}/${requestId}-assistant`,
          persist: async (progress) => {
            await updateDoc(assistantMsgRef, {
              ...progress,
              updatedAt: serverTimestamp(),
            });
            recordChatMessageWrite({ jobId, reason: "assistant_progress_checkpoint" });
          },
          onError: (error) => console.warn("Failed to persist assistant progress checkpoint", error),
        });

        const updateStreamPosition = (data) => {
          lastSeq = updateSeqFromPayload(lastSeq, data);
          if (/^\d+-\d+$/.test(String(data?.streamCursor || ""))) {
            lastStreamCursor = data.streamCursor;
          }
        };

        const clearWallTimer = () => {
          if (wallTimer) {
            clearTimeout(wallTimer);
            wallTimer = null;
          }
        };

        const flushPendingStreamState = () => {
          streamFlushTimer = null;
          lastStreamFlushAt = Date.now();
          const snapshot = getPendingStreamSnapshot(streamStatesRef.current[activeChatId]);
          const pendingContent = formatPendingStreamContent(streamStatesRef.current[activeChatId]);
          setPending((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              content: pendingContent,
              files: snapshot.files || [],
              streamState: snapshot,
              title: snapshot.files?.length ? "Generating Artifact" : prev.title,
            };
          });
        };

        const schedulePendingStreamFlush = (immediate = false) => {
          if (immediate || Date.now() - lastStreamFlushAt >= 40) {
            if (streamFlushTimer) {
              clearTimeout(streamFlushTimer);
              streamFlushTimer = null;
            }
            flushPendingStreamState();
            return;
          }
          if (!streamFlushTimer) {
            streamFlushTimer = setTimeout(flushPendingStreamState, 40);
          }
        };

        const recordStreamActivity = (entry, immediate = true) => {
          streamStatesRef.current[activeChatId] = applyStreamActivity(
            streamStatesRef.current[activeChatId],
            entry
          );
          idlePulse?.notifyActivity();
          schedulePendingStreamFlush(immediate);
        };

        const publishStage = (label, { id, status, streamStatus = null } = {}) => {
          if (!label) return;
          setStage(label);
          recordStreamActivity({
            id: id || `stage-${stageSlug(label)}`,
            type: "stage",
            status: status || label,
            text: label,
          }, false);
          setPending((prev) => {
            if (!prev) return prev;
            return { ...prev, stage: label, streamStatus };
          });
        };

        const stopIdlePulse = () => {
          idlePulse?.dispose();
          idlePulse = null;
        };

        const applyRecoveryStage = (payload) => {
          const label = formatRecoveryStage(payload);
          publishStage(label, { id: "stream-recovering", status: "Recovering", streamStatus: "recovering" });
        };

        const tryFetchCompletedResult = async () => {
          const res = await fetch(resultUrl, {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          });
          const contentType = res.headers.get("content-type") || "";
          const data = contentType.includes("application/json")
            ? await res.json().catch(() => ({}))
            : {};
          const completed = parseCompletedGenerateResult(data);
          if (completed) {
            await finalizeWithData(completed, "result_poll");
            resolve();
            return true;
          }
          if (!res.ok) {
            const err = new Error(data?.message || data?.error || `Failed to fetch result (${res.status})`);
            err.code = data?.code || "RESULT_FETCH_FAILED";
            throw err;
          }
          return false;
        };

        const failAndReject = (err, tag = "network") => {
          const friendlyMessage = formatUserFacingError(err);
          emitStreamMetric("error", {
            jobId,
            tag,
            message: friendlyMessage,
            retries: retryCount,
          });
          progressPersistence.cancel();
          updateDoc(assistantMsgRef, {
            pending: false,
            stage: "failed",
            errorCode: err?.code || null,
            error: friendlyMessage,
            updatedAt: serverTimestamp(),
          })
            .then(() => recordChatMessageWrite({ jobId, reason: "assistant_terminal_failure" }))
            .catch(() => {})
            .finally(() => finishChatWriteMetrics(jobId, "error"));
          setBusy(false);
          if (streamFlushTimer) clearTimeout(streamFlushTimer);
          stopIdlePulse();
          clearWallTimer();
          setPending(null);
          setStage("");
          delete streamStatesRef.current[activeChatId];
          const publicError = new Error(friendlyMessage);
          publicError.code = err?.code || "GENERATION_FAILED";
          reject(publicError);
        };

        const handoffRecoveryTimeout = () => {
          emitStreamMetric("error", {
            jobId,
            tag: "timeout",
            message: "Recovery wall timeout; background poll continues",
            retries: retryCount,
          });
          eventSource?.close?.();
          progressPersistence.cancel();
          updateDoc(assistantMsgRef, {
            pending: true,
            stage: "Still working in background...",
            jobId,
            requestId,
            ...(agentRunId ? { runId: agentRunId } : {}),
            updatedAt: serverTimestamp(),
          })
            .then(() => recordChatMessageWrite({ jobId, reason: "assistant_background_handoff" }))
            .catch(() => {});
          notify?.({
            type: "info",
            message:
              "Connection lost — still working in the background. Results will appear when ready.",
          });
          setBusy(false);
          if (streamFlushTimer) clearTimeout(streamFlushTimer);
          stopIdlePulse();
          clearWallTimer();
          setPending(null);
          setStage("");
          delete streamStatesRef.current[activeChatId];
          resolve();
        };

        const startWallTimer = () => {
          clearWallTimer();
          wallTimer = setTimeout(async () => {
            if (finalized || receivedDone) return;
            try {
              if (await tryFetchCompletedResult()) return;
            } catch (_) {
              /* fall through to background handoff */
            }
            if (finalized || receivedDone) return;
            handoffRecoveryTimeout();
          }, GENERATION_WALL_TIMEOUT_MS);
        };

        const failInsufficientTokens = async (payload = {}) => {
          if (finalized) return;
          finalized = true;
          receivedDone = true;
          eventSource?.close?.();
          progressPersistence.cancel();

          const message = payload.message || insufficientTokensToast(planKey).message;
          emitStreamMetric("error", {
            jobId,
            tag: "billing",
            message,
            retries: retryCount,
          });

          const failurePersisted = await setDoc(assistantMsgRef, {
            role: "assistant",
            content: "",
            pending: false,
            stage: "failed",
            errorCode: "INSUFFICIENT_TOKENS",
            error: message,
            requestId,
            jobId,
            ...(agentRunId ? { runId: agentRunId } : {}),
            updatedAt: serverTimestamp(),
          }, { merge: true }).then(() => true).catch(() => false);
          if (failurePersisted) {
            recordChatMessageWrite({ jobId, reason: "assistant_terminal_failure" });
          }
          finishChatWriteMetrics(jobId, "error");

          refreshBilling();
          notify(insufficientTokensToast(planKey));
          setBusy(false);
          if (streamFlushTimer) clearTimeout(streamFlushTimer);
          stopIdlePulse();
          clearWallTimer();
          setPending(null);
          setStage("");
          delete streamStatesRef.current[activeChatId];
          resolve();
        };

        const finalizeWithData = async (data, source = "done") => {
          if (finalized) return;
          finalized = true;
          progressPersistence.cancel();
          stopIdlePulse();
          clearWallTimer();

          publishStage("Finalizing...");

          const msgPayload = buildAssistantMessagePayload(data, {
            requestId,
            jobId,
            currentMode,
            isAutoExecuting,
          });
          msgPayload.createdAt = serverTimestamp();
          if (data?.runId || agentRunId) msgPayload.runId = data?.runId || agentRunId;

          await setDoc(assistantMsgRef, msgPayload);
          recordChatMessageWrite({ jobId, reason: "assistant_terminal_success" });

          await updateDoc(doc(db, "users", user.uid, "chats", activeChatId), {
            updatedAt: serverTimestamp(),
            lastMessage: displayContent.slice(0, 50),
          });

          emitStreamMetric("complete", {
            jobId,
            source,
            retries: retryCount,
            deltaCount: metrics.deltaCount,
            firstDeltaMs: metrics.firstDeltaAt ? metrics.firstDeltaAt - metrics.startedAt : null,
            totalMs: Date.now() - metrics.startedAt,
            fallbackUsed: metrics.usedFallback,
          });

          refreshBilling();
          emitAiEvent("JOB_COMPLETE", { jobId });
          finishChatWriteMetrics(jobId, "done");
          setBusy(false);
          if (streamFlushTimer) clearTimeout(streamFlushTimer);
          setPending(null);
          setStage("");
          delete streamStatesRef.current[activeChatId];
        };

        const recoverFromStreamFailure = async (rawError = null) => {
          if (finalized || receivedDone || recoverInFlight) return;
          recoverInFlight = true;
          try {
            if (isInsufficientTokensError(rawError)) {
              await failInsufficientTokens(rawError);
              return;
            }

            if (await tryFetchCompletedResult()) return;

            if (retryCount < STREAM_MAX_RETRIES && !sseSessionUnavailable) {
              retryCount += 1;
              emitStreamMetric("retry", { jobId, retryCount });
              const reconnectLabel = "Stream interrupted — reconnecting...";
              publishStage(reconnectLabel, {
                id: "stream-reconnect",
                status: "Reconnecting",
                streamStatus: "reconnecting",
              });
              setTimeout(() => {
                connect({ refreshSession: true });
              }, 1000 * retryCount);
              return;
            }

            metrics.usedFallback = true;
            const recoveringLabel = "Catching up with generation...";
            publishStage(recoveringLabel, {
              id: "stream-recovering",
              status: "Recovering",
              streamStatus: "recovering",
            });
            emitStreamMetric("fallback_start", { jobId });

            if (!dualStreamAttempted && !sseSessionUnavailable) {
              dualStreamAttempted = true;
              connect({ refreshSession: true });
            }

            const recovered = await pollJobResult({
              resultUrl,
              token,
              maxPolls: RESULT_MAX_POLLS,
              pollBaseMs: RESULT_POLL_BASE_MS,
              wallTimeoutMs: RECOVERY_WALL_TIMEOUT_MS,
              waitImpl: wait,
              onPending: applyRecoveryStage,
            });
            await finalizeWithData(recovered, "fallback");
            resolve();
          } catch (fallbackErr) {
            if (isInsufficientTokensError(fallbackErr)) {
              await failInsufficientTokens(fallbackErr);
              return;
            }
            if (fallbackErr?.code === "RECOVERY_TIMEOUT") {
              handoffRecoveryTimeout();
              return;
            }
            const errorMsg = rawError?.message || fallbackErr?.message || "Generation failed";
            failAndReject(new Error(errorMsg), "network");
          } finally {
            recoverInFlight = false;
          }
        };

        const handleStreamErrorEvent = async (event) => {
          if (!event?.data) return false;
          try {
            const data = JSON.parse(event.data);
            if (isInsufficientTokensError(data)) {
              eventSource?.close?.();
              await failInsufficientTokens(data);
              return true;
            }
            if (data?.code && data.retryable === false) {
              eventSource?.close?.();
              failAndReject(new Error(data.message || "Generation failed"), data.code);
              return true;
            }
          } catch (err) {
            console.error("Failed to parse stream error event:", err);
          }
          return false;
        };

        const setupListeners = (es) => {
          es.addEventListener("heartbeat", (e) => {
            try {
              const data = JSON.parse(e.data);
              updateStreamPosition(data);
            } catch (_) {
              /* keepalive only */
            }
          });

          es.addEventListener("stage", (e) => {
            try {
              const data = JSON.parse(e.data);
              updateStreamPosition(data);
              if (data?.message) {
                publishStage(data.message, { id: `stage-${stageSlug(data.message)}` });
                if (agentRunId) {
                  progressPersistence.queue({ stage: data.message });
                }
              }
            } catch (err) {
              console.error("Failed to parse stage:", err);
            }
          });

          es.addEventListener("reasoning_delta", (e) => {
            if (!FEATURE_FLAGS.rawReasoning) return;
            try {
              const data = JSON.parse(e.data);
              updateStreamPosition(data);
              streamStatesRef.current[activeChatId] = applyReasoningDelta(
                streamStatesRef.current[activeChatId],
                data
              );
              idlePulse?.notifyActivity();
              schedulePendingStreamFlush(false);
            } catch (err) {
              console.error("Failed to parse reasoning_delta:", err);
              emitStreamMetric("error", { jobId, tag: "protocol", message: "reasoning_delta_parse_failed" });
            }
          });

          es.addEventListener("delta", (e) => {
            if (!FEATURE_FLAGS.streamV2) return;
            try {
              const data = JSON.parse(e.data);
              updateStreamPosition(data);
              streamStatesRef.current[activeChatId] = applyStreamDelta(
                streamStatesRef.current[activeChatId],
                data
              );
              idlePulse?.notifyActivity();
              metrics.deltaCount += 1;
              if (!metrics.firstDeltaAt) {
                metrics.firstDeltaAt = Date.now();
                emitStreamMetric("first_delta", { jobId, msFromStart: metrics.firstDeltaAt - metrics.startedAt });
              }
              schedulePendingStreamFlush(data.channel === "file_event" && data.event?.event === "file_ready");
            } catch (err) {
              console.error("Failed to parse stream delta:", err);
              emitStreamMetric("error", { jobId, tag: "protocol", message: "delta_parse_failed" });
            }
          });

          es.addEventListener("tool_step", (e) => {
            if (!FEATURE_FLAGS.unifiedAgent) return;
            try {
              const data = JSON.parse(e.data);
              updateStreamPosition(data);
              const step = normalizeToolStep(data.step || data);
              recordStreamActivity({
                type: "tool_step",
                id: step.id ? `tool-${step.id}` : undefined,
                status: step.status,
                text: step.label || step.type,
                stepType: step.type,
                path: step.result?.path || "",
              }, false);
              setPending((prev) => {
                if (!prev) return prev;
                const steps = upsertAgentStep(prev.steps || [], step);
                const waitingForTarget = data.runStatus === "awaiting_studio_target";
                const nextStage = waitingForTarget
                  ? "Waiting for your Studio project choice"
                  : step.label || step.type || prev.stage;
                if (agentRunId) {
                  progressPersistence.queue({
                    steps,
                    runId: data.runId || prev.runId || agentRunId,
                    stage: nextStage,
                  });
                }
                return {
                  ...prev,
                  steps,
                  runId: data.runId || prev.runId || agentRunId,
                  stage: nextStage,
                  runStatus: data.runStatus || prev.runStatus,
                  targetSelection: Object.prototype.hasOwnProperty.call(data, "targetSelection")
                    ? data.targetSelection
                    : prev.targetSelection,
                  errorCode: step.errorCode || data.errorCode || prev.errorCode,
                  errorDetails: step.errorDetails || data.errorDetails || prev.errorDetails,
                  recovery: step.recovery || data.recovery || prev.recovery,
                };
              });
              if (step.label || step.type) {
                publishStage(step.label || step.type, { id: `stage-${stageSlug(step.label || step.type)}` });
              }
            } catch (err) {
              console.error("Failed to parse tool_step:", err);
              emitStreamMetric("error", { jobId, tag: "protocol", message: "tool_step_parse_failed" });
            }
          });

          es.addEventListener("done", async (e) => {
            receivedDone = true;
            try {
              const data = JSON.parse(e.data);
              updateStreamPosition(data);
              es.close();
              await finalizeWithData(data, "done");
              resolve();
            } catch (err) {
              failAndReject(err, "protocol");
            }
          });

          es.addEventListener("error", async (e) => {
            if (finalized || receivedDone) return;
            if (await handleStreamErrorEvent(e)) return;
            es.close();
            emitStreamMetric("error", { jobId, tag: "network", retryCount });
            await recoverFromStreamFailure();
          });
        };

        const mintStreamSession = async () => {
          try {
            const session = await ensureStreamSession(token, { retries: 1 });
            streamSessionToken = session?.token || null;
            sseSessionUnavailable = !streamSessionToken;
            return Boolean(streamSessionToken);
          } catch (err) {
            console.warn("Stream session refresh failed:", err?.message || err);
            streamSessionToken = null;
            sseSessionUnavailable = true;
            return false;
          }
        };

        const connect = async ({ refreshSession = false } = {}) => {
          eventSource?.close?.();
          const sessionOk = streamSessionToken && !refreshSession
            ? true
            : await mintStreamSession();
          if (!sessionOk) {
            emitStreamMetric("error", { jobId, tag: "network", message: "stream_session_unavailable" });
            await recoverFromStreamFailure();
            return;
          }
          const url = buildStreamUrl({
            jobId,
            mode: currentMode,
            afterSeq: lastSeq,
            afterCursor: lastStreamCursor,
            streamToken: streamSessionToken,
          });
          eventSource = new EventSource(url, { withCredentials: true });
          emitStreamMetric("connect", {
            jobId,
            retryCount,
            afterSeq: lastSeq,
            afterCursor: lastStreamCursor,
          });
          setupListeners(eventSource);
          stopIdlePulse();
          idlePulse = createIdlePulseController({
            onPulse: (message) => {
              publishStage(message, { id: "idle-pulse", status: "Working" });
            },
            getActivitySeq: () => streamStatesRef.current[activeChatId]?.activitySeq || 0,
            getContext: () => ({ studioConnected: Boolean(studioSessionId) }),
          });
          idlePulse.start();
        };

        startWallTimer();
        if (sseSessionUnavailable) {
          recoverFromStreamFailure();
        } else {
          connect();
        }
      });

    } catch (e) {
      console.error(e);
      if (isInsufficientTokensError(e)) {
        notify(insufficientTokensToast(planKey));
      } else {
        notify({ message: formatUserFacingError(e), type: "error" });
      }
      setBusy(false);
      setPending(null);
      setStage("");
      if (activeChatId) delete streamStatesRef.current[activeChatId];
    }
  };

  const handleDeleteChat = async (chatId) => {
    if (!authReady || !user?.uid || auth.currentUser?.uid !== user.uid || !chatId) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "chats", chatId));
      // Drop any in-flight generation state tied to the deleted chat.
      delete generatingRef.current[chatId];
      delete streamStatesRef.current[chatId];
      const dropKey = (obj) => {
        if (!(chatId in obj)) return obj;
        const next = { ...obj };
        delete next[chatId];
        return next;
      };
      setGeneratingChats(dropKey);
      setPendingMessages(dropKey);
      setGenerationStages(dropKey);
      if (currentChatId === chatId) {
        setCurrentChatId(null);
        setCurrentChatMeta(null);
        setMessages([]);
      }
      notify({ message: "Chat deleted successfully", type: "success" });
    } catch (err) {
      notify({ message: "Failed to delete chat: " + err.message, type: "error" });
    }
  };

  const handleClearChat = async () => {
    if (!authReady || !user?.uid || auth.currentUser?.uid !== user.uid || !currentChatId) return;
    try {
      const msgsSnap = await getDocs(query(
        collection(db, "users", user.uid, "chats", currentChatId, "messages"),
        orderBy("createdAt", "asc"),
        limitToLast(CLEAR_CHAT_MESSAGE_LIMIT)
      ));
      const batch = writeBatch(db);
      msgsSnap.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      setMessages([]);
      notify({ message: "Conversation cleared", type: "success" });
    } catch (err) {
      notify({ message: "Failed to clear conversation: " + err.message, type: "error" });
    }
  };

  const startNewChat = useCallback(() => {
    closeChatSubscriptions();
    setCurrentChatId(null);
    setCurrentChatMeta(null);
    setMessages([]);
    setActiveMode("agent");
    setTasks([]);
    setCurrentTaskId(null);
  }, [closeChatSubscriptions]);

  const updateChatMode = useCallback(async (chatId, mode) => {
    const uid = user?.uid;
    
    // Pro restriction for specialized modes is enforced in the UI.

    if (!authReady || !uid || auth.currentUser?.uid !== uid) {
      setActiveMode(mode);
      return;
    }
    
    // Update local state immediately for snappy UI
    setActiveMode(mode);

    if (chatId) {
      try {
        await updateDoc(doc(db, "users", uid, "chats", chatId), {
          activeMode: mode,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        console.error("Failed to update chat mode in Firestore:", err);
        notify?.({ message: "Failed to persist chat mode", type: "error" });
      }
    }
  }, [authReady, user?.uid, notify]);

  return {
    messages,
    currentChatId,
    currentChatMeta,
    isGenerating,
    pendingMessage,
    generationStage,
    generatingChatIds,
    setPendingForChat,
    setStageForChat,
    setGeneratingForChat,
    openChatById,
    handleSubmit,
    handleDeleteChat,
    handleClearChat,
    startNewChat,
    setPendingMessage,
    setCurrentChatId,
    activeMode,
    setActiveMode,
    updateChatMode,
    customModes,
    firestoreAccessError,
    tasks,
    setTasks,
    currentTaskId,
    setCurrentTaskId,
    chatMode,
    setChatMode,
    handleShareWithTeam: async (artifactId, type, teamId) => {
      if (!user) return;
      try {
        const token = await user.getIdToken();
        const res = await fetch(`${BACKEND_URL}/api/user/share`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ artifactId, type, teamId }),
        });
        if (res.ok) {
          notify?.({ message: "Artifact shared with team!", type: "success" });
        } else {
          const err = await res.json();
          notify?.({ message: err.error || "Sharing failed", type: "error" });
        }
      } catch (err) {
        console.error("Share error:", err);
        notify?.({ message: "Failed to share artifact", type: "error" });
      }
    }
  };
}
