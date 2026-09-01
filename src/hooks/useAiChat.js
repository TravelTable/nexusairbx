import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { 
  doc, 
  collection, 
  query, 
  orderBy, 
  where,
  limit,
  limitToLast, 
  onSnapshot, 
  serverTimestamp, 
  writeBatch, 
  setDoc, 
  updateDoc, 
  addDoc,
  getDoc,
  getDocs
} from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import {
  cancelAgentRunV2,
  extractAgentEvents,
  getAgentEventsV2,
  getAgentRunV2,
  getAgentV2,
} from "../lib/agentRuntimeV2Api";
import { auth, db, firebaseConfig } from "../firebase";
import { BACKEND_URL } from "../config";
import { authedFetch } from "../lib/billing";
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
import {
  sanitizeChatWritePayload,
  sanitizeTranscriptMessagePayload,
} from "../lib/firestorePayloads";
import { requireVerifiedFirestoreUser } from "../lib/verifiedFirestoreUser";
import {
  isServerConfirmedUserCancellation,
  normalizeAuthoritativeRunStatus,
} from "../lib/runCancellation";
import {
  mergeMessagesById,
  normalizeRewindMode,
  selectMessagesToRemove,
} from "../lib/chatTranscriptRewind";
import { normalizeChatMode } from "../lib/chatModes";

const STREAM_MAX_RETRIES = 3;
const RESULT_MAX_POLLS = 45;
const RESULT_POLL_BASE_MS = 1000;
const CUSTOM_MODES_LIST_LIMIT = 50;
const CHAT_INITIAL_HISTORY_LIMIT = 50;
const CHAT_LIVE_TAIL_LIMIT = 20;
const CLEAR_CHAT_MESSAGE_LIMIT = 200;
const PENDING_RUN_POLL_MS = 30_000;
const QUEUED_RUN_POLL_MS = 1500;

function optionalWallTimeout(rawValue, fallbackMs) {
  if (rawValue === undefined || rawValue === null || String(rawValue).trim() === "") {
    return fallbackMs;
  }
  const parsed = Number(rawValue);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallbackMs;
}

const QUEUED_RUN_WALL_TIMEOUT_MS = Number(
  process.env.REACT_APP_QUEUED_RUN_WALL_TIMEOUT_MS || 3 * 60 * 1000
);
const PENDING_RUN_RECOVERY_WALL_TIMEOUT_MS = optionalWallTimeout(
  process.env.REACT_APP_PENDING_RUN_RECOVERY_WALL_TIMEOUT_MS,
  12 * 60 * 1000
);
const AUTHORITATIVE_RUN_RECOVERY_REQUEST_TIMEOUT_MS = Number(
  process.env.REACT_APP_AUTHORITATIVE_RUN_RECOVERY_REQUEST_TIMEOUT_MS || 10_000
);
const AUTHORITATIVE_TASK_COMPLETION_WALL_TIMEOUT_MS = Number(
  process.env.REACT_APP_AUTHORITATIVE_TASK_COMPLETION_WALL_TIMEOUT_MS || 12 * 60 * 1000
);

const delay = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

function isAutoExecutingMode(mode) {
  return ["agent", "debug", "act"].includes(String(mode || "").trim());
}

function createAbortError() {
  const error = new Error("Generation canceled.");
  error.name = "AbortError";
  error.code = "ABORT_ERR";
  return error;
}

function createProjectRequiredError() {
  const error = new Error("Open a project before starting a chat.");
  error.code = "PROJECT_REQUIRED";
  return error;
}

function isAbortError(error) {
  return error?.name === "AbortError" || error?.code === "ABORT_ERR";
}

function throwIfAborted(signal) {
  if (signal?.aborted) throw createAbortError();
}

function normalizeTerminalRunStatus(status, evidence = null) {
  return normalizeAuthoritativeRunStatus(status, evidence);
}

function statusCopyForAuthoritativeRun(status) {
  switch (String(status || "").trim().toLowerCase()) {
    case "running":
      return "Running in Studio...";
    case "waiting_studio":
    case "awaiting_studio_reconnect":
      return "Waiting for Studio...";
    case "awaiting_studio_target":
      return "Waiting for Studio target...";
    case "waiting_user":
    case "waiting_for_approval":
      return "Waiting for approval...";
    case "verifying":
      return "Verifying Studio changes...";
    default:
      return null;
  }
}

function findAuthoritativeRun(projection, runId) {
  const runs = projection?.runs || projection?.agent?.runs || [];
  return (Array.isArray(runs) ? runs : []).find((candidate) => (
    String(candidate?.runId || candidate?.id || "") === String(runId || "")
  )) || null;
}

const TERMINAL_STUDIO_TASK_SUCCESS_STATUSES = new Set([
  "completed",
  "done",
  "manual_verification_required",
  "succeeded",
  "success",
]);

export function hasTerminalStudioTaskSuccess(payload = {}) {
  const candidates = [
    payload?.taskResult,
    payload?.result?.taskResult,
    payload?.run?.taskResult,
    payload?.result?.run?.taskResult,
    payload?.terminalDetails?.taskResult,
    payload?.result?.terminalDetails?.taskResult,
  ];
  return candidates.some((candidate) => {
    if (!candidate || typeof candidate !== "object") return false;
    const status = String(
      candidate.status
      || candidate.structuredStatus
      || candidate.state
      || candidate.terminalStatus
      || ""
    ).trim().toLowerCase();
    return TERMINAL_STUDIO_TASK_SUCCESS_STATUSES.has(status);
  });
}

export function shouldStartPendingRecovery(message, isGenerating) {
  if (!message) return false;
  const runState = String(message?.metadata?.runState || message?.stage || "").trim().toLowerCase();
  const isDurableBackgroundHandoff = message.pending === false && runState === "background";
  return !isGenerating || isDurableBackgroundHandoff;
}

export function shouldReadAuthoritativeRunDuringRecovery(runId, resultPayload) {
  return Boolean(runId) && !hasTerminalStudioTaskSuccess(resultPayload);
}

export function readPendingAgentRun(runId) {
  return String(runId || "").startsWith("agent_run_v2_")
    ? getAgentRunV2(runId)
    : getAgentRun(runId);
}

export async function waitForAuthoritativeTaskCompletion({
  runId,
  readRun = readPendingAgentRun,
  waitForNext = delay,
  onProgress = null,
  signal = null,
  pollMs = 1500,
  timeoutMs = AUTHORITATIVE_TASK_COMPLETION_WALL_TIMEOUT_MS,
  requestTimeoutMs = AUTHORITATIVE_RUN_RECOVERY_REQUEST_TIMEOUT_MS,
  now = () => Date.now(),
}) {
  const normalizedRunId = String(runId || "").trim();
  if (!normalizedRunId) return null;

  const boundedTimeoutMs = Number.isFinite(Number(timeoutMs)) && Number(timeoutMs) > 0
    ? Number(timeoutMs)
    : AUTHORITATIVE_TASK_COMPLETION_WALL_TIMEOUT_MS;
  const boundedRequestTimeoutMs = Number.isFinite(Number(requestTimeoutMs)) && Number(requestTimeoutMs) > 0
    ? Number(requestTimeoutMs)
    : AUTHORITATIVE_RUN_RECOVERY_REQUEST_TIMEOUT_MS;
  const deadline = now() + boundedTimeoutMs;
  let lastRun = null;

  while (true) {
    throwIfAborted(signal);
    const remainingMs = deadline - now();
    if (remainingMs <= 0) {
      return { run: lastRun, terminalStatus: "background", timedOut: true };
    }

    let snapshot;
    try {
      snapshot = await raceAuthoritativeOperation(
        () => readRun(normalizedRunId),
        {
          signal,
          timeoutMs: Math.min(boundedRequestTimeoutMs, remainingMs),
        }
      );
    } catch (error) {
      if (error?.code !== "ADMISSION_TIMEOUT") throw error;
      if (now() >= deadline) {
        return { run: lastRun, terminalStatus: "background", timedOut: true };
      }
      await waitForNext(Math.min(
        Math.max(1, Number(pollMs) || 1500),
        Math.max(1, deadline - now())
      ));
      continue;
    }
    throwIfAborted(signal);
    const run = snapshot?.run || snapshot || null;
    if (!run) return null;
    lastRun = run;
    onProgress?.(run);
    const terminalStatus = normalizeTerminalRunStatus(run.status, run);
    if (terminalStatus) return { run, terminalStatus };
    await waitForNext(Math.min(
      Math.max(1, Number(pollMs) || 1500),
      Math.max(1, deadline - now())
    ));
  }
}

function findAuthoritativeRunOutput(run) {
  const candidates = [
    run?.summary,
    run?.result,
    run?.output,
    run?.generationResult,
    run?.artifact,
    run?.terminalDetails?.result,
    run?.terminalDetails?.output,
    run?.terminalDetails?.artifact,
  ];
  const usefulKeys = [
    "title",
    "explanation",
    "summary",
    "thought",
    "content",
    "code",
    "artifactId",
    "plan",
    "options",
    "files",
    "steps",
    "setupSteps",
    "testingSteps",
    "securityNotes",
    "warnings",
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return { summary: candidate.trim() };
    }
    if (
      candidate
      && typeof candidate === "object"
      && usefulKeys.some((key) => candidate[key] !== undefined && candidate[key] !== null)
    ) {
      return candidate;
    }
  }

  const assetToolExecution = run?.terminalDetails?.assetToolExecution || run?.assetToolExecution;
  if (assetToolExecution && typeof assetToolExecution === "object") {
    const details = [
      assetToolExecution.message,
      assetToolExecution.resolution,
      ...(Array.isArray(assetToolExecution.receipts)
        ? assetToolExecution.receipts.flatMap((receipt) => [
            receipt?.summary,
            receipt?.message,
            receipt?.resolution,
          ])
        : []),
    ]
      .map((value) => String(value || "").trim())
      .filter((value, index, values) => value && values.indexOf(value) === index);
    if (details.length) {
      return {
        title: "Studio task completed",
        summary: details.join("\n"),
      };
    }
  }

  return null;
}

function terminalRunResult({ agentId, runId, status, payload = {}, reason = null }) {
  return {
    ...(payload && typeof payload === "object" ? payload : {}),
    agentId,
    runId,
    status,
    terminal: true,
    ...(reason ? { reason } : {}),
  };
}

function raceAuthoritativeOperation(operation, { signal, timeoutMs }) {
  throwIfAborted(signal);
  if (timeoutMs <= 0) {
    const error = new Error("Queued run admission timed out.");
    error.code = "ADMISSION_TIMEOUT";
    return Promise.reject(error);
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      signal?.removeEventListener?.("abort", handleAbort);
      callback(value);
    };
    const handleAbort = () => finish(reject, createAbortError());
    const timeoutId = setTimeout(() => {
      const error = new Error("Queued run admission timed out.");
      error.code = "ADMISSION_TIMEOUT";
      finish(reject, error);
    }, timeoutMs);

    signal?.addEventListener?.("abort", handleAbort, { once: true });
    Promise.resolve()
      .then(operation)
      .then((value) => finish(resolve, value), (error) => finish(reject, error));
  });
}

export async function waitForAuthoritativeRunJob({
  agentId,
  runId,
  onStatus,
  getEvents = getAgentEventsV2,
  getAgent = getAgentV2,
  wait = delay,
  signal = null,
  timeoutMs = QUEUED_RUN_WALL_TIMEOUT_MS,
  now = () => Date.now(),
}) {
  let afterSequence = 0;
  let admitted = false;
  let reconnecting = false;
  const boundedTimeoutMs = Number.isFinite(Number(timeoutMs)) && Number(timeoutMs) > 0
    ? Number(timeoutMs)
    : QUEUED_RUN_WALL_TIMEOUT_MS;
  const deadline = now() + boundedTimeoutMs;

  while (true) {
    throwIfAborted(signal);
    const remainingMs = deadline - now();
    if (remainingMs <= 0) {
      return terminalRunResult({
        agentId,
        runId,
        status: "background",
        reason: "admission_timeout",
      });
    }
    reconnecting = false;
    let projectedStatusReported = false;

    try {
      if (!admitted) {
        const eventsAfterSequence = afterSequence;
        try {
          const envelope = await raceAuthoritativeOperation(
            () => getEvents(eventsAfterSequence),
            {
              signal,
              timeoutMs: Math.min(
                AUTHORITATIVE_RUN_RECOVERY_REQUEST_TIMEOUT_MS,
                remainingMs
              ),
            }
          );
          const events = extractAgentEvents(envelope);
          const explicitLastSequence = Number(envelope?.lastSequence ?? envelope?.data?.lastSequence);
          if (Number.isFinite(explicitLastSequence)) afterSequence = Math.max(afterSequence, explicitLastSequence);
          for (const event of events) {
            const sequence = Number(event?.sequence ?? event?.seq);
            if (Number.isFinite(sequence)) afterSequence = Math.max(afterSequence, sequence);
            if (String(event?.payload?.runId || "") !== runId) continue;
            if (event.type === "run.admitted") admitted = true;
            const terminalStatus = normalizeTerminalRunStatus(
              String(event.type || "").replace("run.", ""),
              event.payload
            );
            if (terminalStatus) {
              let authoritativePayload = event.payload;
              const terminalProjectionRemainingMs = deadline - now();
              if (terminalProjectionRemainingMs > 0) {
                try {
                  const projection = await raceAuthoritativeOperation(
                    () => getAgent(agentId),
                    {
                      signal,
                      timeoutMs: Math.min(
                        AUTHORITATIVE_RUN_RECOVERY_REQUEST_TIMEOUT_MS,
                        terminalProjectionRemainingMs
                      ),
                    }
                  );
                  const projectedRun = findAuthoritativeRun(projection, runId);
                  if (projectedRun) {
                    authoritativePayload = {
                      ...(event.payload && typeof event.payload === "object" ? event.payload : {}),
                      ...projectedRun,
                    };
                  }
                } catch (error) {
                  if (isAbortError(error)) throw error;
                  // The terminal event is still durable evidence. A temporary
                  // projection failure must not make the client spin forever.
                }
              }
              return terminalRunResult({
                agentId,
                runId,
                status: terminalStatus,
                payload: authoritativePayload,
              });
            }
          }
        } catch (error) {
          if (isAbortError(error)) throw error;
          if (error?.code !== "ADMISSION_TIMEOUT") throw error;
          reconnecting = true;
          onStatus?.("Queued — reconnecting...");
          // Event retention is finite, so a timed-out event request must not
          // prevent the canonical projection from revealing admission.
          throwIfAborted(signal);
        }
      }

      const projectionRemainingMs = deadline - now();
      if (projectionRemainingMs > 0) {
        try {
          const projection = await raceAuthoritativeOperation(
            () => getAgent(agentId),
            {
              signal,
              timeoutMs: Math.min(
                AUTHORITATIVE_RUN_RECOVERY_REQUEST_TIMEOUT_MS,
                projectionRemainingMs
              ),
            }
          );
          const run = findAuthoritativeRun(projection, runId);
          const jobId = String(run?.jobId || "").trim();
          if (jobId) return run;
          const terminalStatus = normalizeTerminalRunStatus(run?.status, run);
          if (terminalStatus) {
            return terminalRunResult({
              agentId,
              runId,
              status: terminalStatus,
              payload: run,
            });
          }
          const projectedStatus = statusCopyForAuthoritativeRun(run?.status);
          if (projectedStatus) {
            projectedStatusReported = true;
            onStatus?.(projectedStatus);
          }
        } catch (error) {
          if (isAbortError(error)) throw error;
          if (error?.code !== "ADMISSION_TIMEOUT") throw error;
          reconnecting = true;
          onStatus?.("Queued — reconnecting...");
        }
      }

      if (!reconnecting && !projectedStatusReported) {
        onStatus?.(admitted ? "Starting admitted run..." : "Queued");
      }
    } catch (error) {
      if (isAbortError(error)) throw error;
      reconnecting = true;
      onStatus?.("Queued — reconnecting...");
    }
    const waitMs = Math.min(QUEUED_RUN_POLL_MS, Math.max(0, deadline - now()));
    if (waitMs <= 0) continue;
    await raceAuthoritativeOperation(
      () => wait(waitMs),
      { signal, timeoutMs: Math.max(1, deadline - now()) }
    ).catch((error) => {
      if (isAbortError(error)) throw error;
      if (error?.code !== "ADMISSION_TIMEOUT") throw error;
    });
    if (reconnecting) onStatus?.("Queued");
  }
}
// Absolute frontend backstop: if the stream never delivers a terminal event
// (done/error) within this window, poll once for a result and otherwise hand the
// job off to the background so the UI can never spin/pulse forever.
const GENERATION_WALL_TIMEOUT_MS = optionalWallTimeout(
  process.env.REACT_APP_GENERATION_WALL_TIMEOUT_MS,
  12 * 60 * 1000
);

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function mergeChatMessages(...messageSets) {
  return mergeMessagesById(...messageSets);
}

export function resolveResultUrl(jobId, resultUrl) {
  if (resultUrl && /^https?:\/\//i.test(resultUrl)) return resultUrl;
  if (resultUrl && resultUrl.startsWith("/")) return `${BACKEND_URL}${resultUrl}`;
  if (resultUrl && /^api\//i.test(resultUrl)) return `${BACKEND_URL}/${resultUrl}`;
  return `${BACKEND_URL}/api/generate/result?jobId=${encodeURIComponent(jobId)}`;
}

function buildAssistantMessagePayload(data, { requestId, jobId, currentMode, isAutoExecuting }) {
  const userCancelled = isServerConfirmedUserCancellation(data);
  const payload = {
    role: "assistant",
    content: userCancelled ? "Generation canceled." : "",
    explanation: data?.explanation || "",
    summary: data?.summary || "",
    thought: data?.thought || "",
    code: data?.content || data?.code || "",
    title: data?.title || "",
    projectId: data?.projectId || null,
    versionNumber: data?.versionNumber || 1,
    pending: false,
    stage: userCancelled ? "canceled" : "completed",
    isAutoExecuting,
    updatedAt: serverTimestamp(),
    metadata: {
      ...(data?.metadata || {}),
      mode: currentMode,
      type: data?.artifactType || data?.metadata?.type || null,
      qaReport: data?.qaReport || null,
      runState: userCancelled
        ? "canceled"
        : data?.runState || data?.metadata?.runState || "succeeded",
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
  const [activeMode, setActiveMode] = useState(() => normalizeChatMode(settings?.chatMode));
  const [customModes, setCustomModes] = useState([]);
  const [firestoreAccessError, setFirestoreAccessError] = useState(null);
  // Generation state is keyed by the *originating* chat id so that a generation
  // started in one chat keeps running (and rendering) in that chat even after
  // the user navigates to a different chat. The UI consumes only the slice that
  // belongs to the currently open chat (derived below).
  const [generatingChats, setGeneratingChats] = useState({}); // chatId -> requestId -> bool
  const [pendingMessages, setPendingMessages] = useState({}); // chatId -> requestId -> pendingMessage
  const [generationStages, setGenerationStages] = useState({}); // chatId -> requestId -> string
  const [tasks, setTasks] = useState([]);
  const [currentTaskId, setCurrentTaskId] = useState(null);
  const [chatMode, setChatMode] = useState("plan"); // "plan" | "act"

  // Synchronous mirror of active run identities. A chat may own more than one
  // request at once; requestId (not chatId) is the concurrency boundary.
  const generatingRef = useRef({});
  const assertCanWrite = useCallback(
    () => requireVerifiedFirestoreUser(user, auth.currentUser),
    [user]
  );

  // Live values for the currently open chat (what the UI renders).
  const pendingMessagesForCurrentChat = useMemo(
    () => currentChatId ? Object.values(pendingMessages[currentChatId] || {}).filter(Boolean) : [],
    [currentChatId, pendingMessages]
  );
  const isGenerating = currentChatId
    ? Object.values(generatingChats[currentChatId] || {}).some(Boolean)
    : false;
  const pendingMessage = pendingMessagesForCurrentChat[pendingMessagesForCurrentChat.length - 1] || null;
  const generationStage = pendingMessage?.requestId
    ? generationStages[currentChatId]?.[pendingMessage.requestId] || pendingMessage.stage || ""
    : "";

  // Chat ids that currently have an in-flight generation (for sidebar badges).
  const generatingChatIds = useMemo(
    () => Object.keys(generatingChats).filter((id) => (
      Object.values(generatingChats[id] || {}).some(Boolean)
    )),
    [generatingChats]
  );

  const setPendingForChat = useCallback((chatId, updater, requestId = "__legacy__") => {
    if (!chatId) return;
    setPendingMessages((prev) => {
      const chatPending = prev[chatId] || {};
      const cur = chatPending[requestId] ?? null;
      const next = typeof updater === "function" ? updater(cur) : updater;
      if (next === cur) return prev;
      const nextChatPending = { ...chatPending };
      if (next == null) delete nextChatPending[requestId];
      else nextChatPending[requestId] = { ...next, requestId: next.requestId || requestId };
      const result = { ...prev };
      if (Object.keys(nextChatPending).length) result[chatId] = nextChatPending;
      else delete result[chatId];
      return result;
    });
  }, []);

  const setStageForChat = useCallback((chatId, value, requestId = "__legacy__") => {
    if (!chatId) return;
    setGenerationStages((prev) => {
      const chatStages = prev[chatId] || {};
      if (chatStages[requestId] === value) return prev;
      const nextChatStages = { ...chatStages };
      if (!value) delete nextChatStages[requestId];
      else nextChatStages[requestId] = value;
      const result = { ...prev };
      if (Object.keys(nextChatStages).length) result[chatId] = nextChatStages;
      else delete result[chatId];
      return result;
    });
  }, []);

  const setGeneratingForChat = useCallback((chatId, value, requestId = "__legacy__") => {
    if (!chatId) return;
    const runKey = `${chatId}:${requestId}`;
    if (value) generatingRef.current[runKey] = true;
    else delete generatingRef.current[runKey];
    setGeneratingChats((prev) => {
      const chatRuns = prev[chatId] || {};
      if (Boolean(chatRuns[requestId]) === Boolean(value)) return prev;
      const nextChatRuns = { ...chatRuns };
      if (value) nextChatRuns[requestId] = true;
      else delete nextChatRuns[requestId];
      const result = { ...prev };
      if (Object.keys(nextChatRuns).length) result[chatId] = nextChatRuns;
      else delete result[chatId];
      return result;
    });
  }, []);

  // Update the pending message for the currently open chat (used by interactive
  // UI like "approve step"). Generation internals use setPendingForChat directly.
  const setPendingMessage = useCallback(
    (updater) => setPendingForChat(
      currentChatId,
      updater,
      pendingMessage?.requestId || "__legacy__"
    ),
    [setPendingForChat, currentChatId, pendingMessage?.requestId]
  );

  const persistPendingCancellation = useCallback(async ({ chatId = null, requestId = null } = {}) => {
    const targetChatId = String(chatId || currentChatId || "").trim();
    const normalizedRequestId = String(requestId || "").trim();
    if (!targetChatId || !normalizedRequestId || targetChatId === "draft") return false;
    const messageId = `${normalizedRequestId}-assistant`;
    const payload = {
      id: messageId,
      role: "assistant",
      content: "Generation canceled.",
      pending: false,
      stage: "canceled",
      requestId: normalizedRequestId,
      metadata: {
        runState: "canceled",
        cancellationPending: true,
      },
    };
    setPendingForChat(targetChatId, null, normalizedRequestId);
    setStageForChat(targetChatId, "", normalizedRequestId);
    setGeneratingForChat(targetChatId, false, normalizedRequestId);
    if (targetChatId === currentChatId) {
      setMessages((current) => {
        const index = current.findIndex((message) => message?.id === messageId);
        if (index < 0) return [...current, payload];
        const next = [...current];
        next[index] = { ...next[index], ...payload };
        return next;
      });
    }
    if (!user?.uid || auth.currentUser?.uid !== user.uid) return true;
    await setDoc(
      doc(db, "users", user.uid, "chats", targetChatId, "messages", messageId),
      sanitizeTranscriptMessagePayload({
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
      { merge: true },
    );
    return true;
  }, [
    currentChatId,
    setGeneratingForChat,
    setPendingForChat,
    setStageForChat,
    user?.uid,
  ]);

  const reconcileCancelledRun = useCallback(async (runId, { chatId = null, requestId = null } = {}) => {
    const normalizedRunId = String(runId || "").trim();
    const targetChatId = String(chatId || currentChatId || "").trim();
    const normalizedRequestId = String(requestId || "").trim();
    if (!normalizedRunId || !targetChatId) return false;

    const matchesRun = (message) => {
      const messageRunId = String(
        message?.runId
        || message?.metadata?.runId
        || ""
      ).trim();
      if (messageRunId === normalizedRunId) return true;
      return Boolean(
        normalizedRequestId
        && !messageRunId
        && String(message?.requestId || "").trim() === normalizedRequestId
      );
    };
    const pendingEntries = Object.values(pendingMessages[targetChatId] || {})
      .filter((message) => message && matchesRun(message));
    const transcriptEntries = targetChatId === currentChatId
      ? (messages || []).filter(matchesRun)
      : [];
    let matchingEntries = [...pendingEntries, ...transcriptEntries].filter(
      (message, index, entries) => {
        const identity = message?.id || message?.requestId || `${normalizedRunId}:${index}`;
        return entries.findIndex((candidate, candidateIndex) => (
          (candidate?.id || candidate?.requestId || `${normalizedRunId}:${candidateIndex}`) === identity
        )) === index;
      }
    );

    const terminalize = (message) => ({
      ...message,
      content: "Generation canceled.",
      pending: false,
      stage: "canceled",
      runId: normalizedRunId,
      metadata: {
        ...(message?.metadata || {}),
        runState: "canceled",
      },
    });
    const fallbackMessageId = normalizedRequestId ? `${normalizedRequestId}-assistant` : null;
    if (!matchingEntries.length && fallbackMessageId) {
      matchingEntries = [{
        id: fallbackMessageId,
        role: "assistant",
        content: "",
        pending: true,
        requestId: normalizedRequestId,
        runId: normalizedRunId,
        metadata: { runState: "running" },
      }];
    }

    pendingEntries.forEach((message) => {
      const requestId = message?.requestId || "__legacy__";
      setPendingForChat(targetChatId, null, requestId);
      setStageForChat(targetChatId, "", requestId);
      setGeneratingForChat(targetChatId, false, requestId);
    });
    if (normalizedRequestId && !pendingEntries.length) {
      setPendingForChat(targetChatId, null, normalizedRequestId);
      setStageForChat(targetChatId, "", normalizedRequestId);
      setGeneratingForChat(targetChatId, false, normalizedRequestId);
    }
    if (targetChatId === currentChatId) {
      setMessages((current) => {
        const hasMatchingMessage = current.some(matchesRun);
        const next = current.map((message) => (
          matchesRun(message) ? terminalize(message) : message
        ));
        if (!hasMatchingMessage && matchingEntries[0]) {
          const terminal = terminalize(matchingEntries[0]);
          if (!next.some((message) => message?.id === terminal.id)) next.push(terminal);
        }
        return next;
      });
    }

    if (!user?.uid || auth.currentUser?.uid !== user.uid) return true;
    const persistedEntries = matchingEntries
      .map((message) => (
        message?.id || !fallbackMessageId ? message : { ...message, id: fallbackMessageId }
      ))
      .filter((message) => message?.id)
      .filter((message, index, entries) => (
        entries.findIndex((candidate) => candidate.id === message.id) === index
      ));
    if (!persistedEntries.length) return true;
    const writes = await Promise.allSettled(persistedEntries.map((message) => (
      setDoc(
        doc(db, "users", user.uid, "chats", targetChatId, "messages", message.id),
        sanitizeTranscriptMessagePayload({
          ...terminalize(message),
          ...(message?.createdAt ? {} : { createdAt: serverTimestamp() }),
          updatedAt: serverTimestamp(),
        }),
        { merge: true }
      )
    )));
    const rejected = writes.find((result) => result.status === "rejected");
    if (rejected) {
      console.warn("Could not persist the cancelled run transcript state.", rejected.reason);
    }
    return true;
  }, [
    currentChatId,
    messages,
    pendingMessages,
    setGeneratingForChat,
    setPendingForChat,
    setStageForChat,
    user?.uid,
  ]);

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
        await assertCanWrite();
        const msgRef = doc(db, "users", uid, "chats", currentChatId, "messages", messageId);
        await updateDoc(msgRef, sanitizeTranscriptMessagePayload({
          code: code,
          updatedAt: serverTimestamp(),
          patchApplied: true
        }));
        recordChatMessageWrite({ reason: "assistant_code_patch" });
        notify?.({ message: "Optimization applied successfully!", type: "success" });
      } catch (err) {
        console.error("Failed to apply patch:", err);
        notify?.({ message: "Failed to apply optimization", type: "error" });
      }
    };
    const unbind = onAiEvent(AI_EVENTS.APPLY_CODE_PATCH, handleApplyPatch);
    return () => unbind();
  }, [authReady, user?.uid, currentChatId, notify, assertCanWrite]);

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

  // Auth must be ready before these owner-scoped reads run. App Check is telemetry-only here.
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

    chatUnsubRef.current = onSnapshot(
      doc(db, "users", uid, "chats", chatId),
      (snap) => {
        if (!isActive()) return;
        const data = snap.exists() ? { id: snap.id, ...snap.data() } : null;
        setCurrentChatMeta(data || null);
        if (data?.activeMode) {
          setActiveMode(normalizeChatMode(data.activeMode));
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
        .find((m) => {
          const runState = String(m?.metadata?.runState || m?.stage || "").trim().toLowerCase();
          const hasRecoverableJob = Boolean(
            m.jobId && (m.pending || runState === "background")
          );
          const hasRecoverableCanonicalRun = Boolean(
            !m.jobId
            && m.agentId
            && m.runId
            && (m.pending || runState === "queued" || runState === "background")
          );
          return m.role === "assistant"
            && m.id
            && (hasRecoverableJob || hasRecoverableCanonicalRun);
        }) || null,
    [messages]
  );
  const pendingRecoveryRef = useRef(null);
  useEffect(() => {
    pendingRecoveryRef.current = pendingRecoveryMessage;
  }, [pendingRecoveryMessage]);

  useEffect(() => {
    const uid = user?.uid;
    const pending = pendingRecoveryRef.current;
    if (
      !authReady
      || !uid
      || auth.currentUser?.uid !== uid
      || !currentChatId
      || !shouldStartPendingRecovery(pending, isGenerating)
    ) return;

    let cancelled = false;
    let stopped = false;
    let pollInFlight = false;
    let intervalId = null;
    let wallTimerId = null;
    let backgroundHandoffInFlight = false;
    let recoveryController = new AbortController();
    const pendingRef = doc(db, "users", uid, "chats", currentChatId, "messages", pending.id);
    const chatRef = doc(db, "users", uid, "chats", currentChatId);

    const clearRecoveryTimers = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      if (wallTimerId) {
        clearTimeout(wallTimerId);
        wallTimerId = null;
      }
    };

    const stopPolling = () => {
      stopped = true;
      clearRecoveryTimers();
    };

    const handoffRecoveryToBackground = async (
      currentPending,
      { keepRecovering = false } = {}
    ) => {
      if (cancelled || backgroundHandoffInFlight) return;
      backgroundHandoffInFlight = true;
      clearRecoveryTimers();
      recoveryController.abort();
      if (keepRecovering) {
        recoveryController = new AbortController();
      } else {
        stopped = true;
      }
      const backgroundPayload = {
        pending: false,
        stage: "background",
        updatedAt: serverTimestamp(),
        metadata: {
          ...(currentPending?.metadata || {}),
          runState: "background",
        },
      };
      pendingRecoveryRef.current = {
        ...currentPending,
        ...backgroundPayload,
      };
      await updateDoc(pendingRef, sanitizeTranscriptMessagePayload(backgroundPayload)).catch(() => {});
      if (!cancelled) {
        setMessages((current) => current.map((message) => (
          message.id === currentPending.id
            ? {
                ...message,
                pending: false,
                stage: "background",
                metadata: {
                  ...(message.metadata || currentPending.metadata || {}),
                  runState: "background",
                },
              }
            : message
        )));
      }
      if (keepRecovering && !cancelled && !stopped) {
        intervalId = setInterval(pollPendingRun, PENDING_RUN_POLL_MS);
      }
    };

    const pollPendingRun = async () => {
      if (cancelled || stopped || pollInFlight) return;
      pollInFlight = true;
      try {
        let currentPending = pendingRecoveryRef.current || pending;
        if (!currentPending) return;
        const activeUser = auth.currentUser;
        if (!activeUser || activeUser.uid !== user?.uid) return;

        if (!currentPending.jobId) {
          throwIfAborted(recoveryController.signal);
          const projection = await raceAuthoritativeOperation(
            () => getAgentV2(currentPending.agentId),
            {
              signal: recoveryController.signal,
              timeoutMs: AUTHORITATIVE_RUN_RECOVERY_REQUEST_TIMEOUT_MS,
            }
          );
          if (cancelled || stopped) return;
          const authoritativeRun = findAuthoritativeRun(projection, currentPending.runId);
          if (!authoritativeRun) return;

          const terminalStatus = normalizeTerminalRunStatus(authoritativeRun.status, authoritativeRun);
          if (terminalStatus) {
            const failureMessage = typeof authoritativeRun.error === "string"
              ? authoritativeRun.error
              : authoritativeRun.error?.message
                || authoritativeRun.message
                || "The queued run failed before generation started.";
            const contentByStatus = {
              completed: "Run completed.",
              failed: failureMessage,
              canceled: "Generation canceled.",
            };
            const authoritativeOutput = terminalStatus === "completed"
              ? findAuthoritativeRunOutput(authoritativeRun)
              : null;
            const completedPayload = authoritativeOutput
              ? buildAssistantMessagePayload(authoritativeOutput, {
                  requestId: currentPending.requestId,
                  jobId: null,
                  currentMode: currentPending.metadata?.mode || currentPending.mode || chatMode,
                  isAutoExecuting: Boolean(
                    currentPending.isAutoExecuting
                    || isAutoExecutingMode(currentPending.metadata?.mode || currentPending.mode || chatMode)
                  ),
                })
              : null;
            const terminalPayload = completedPayload
              ? {
                  ...completedPayload,
                  agentId: currentPending.agentId,
                  runId: currentPending.runId,
                  metadata: {
                    ...(currentPending.metadata || {}),
                    ...(completedPayload.metadata || {}),
                    runState: "succeeded",
                  },
                }
              : {
                  content: contentByStatus[terminalStatus],
                  pending: false,
                  stage: terminalStatus,
                  agentId: currentPending.agentId,
                  runId: currentPending.runId,
                  ...(terminalStatus === "failed" ? {
                    error: failureMessage,
                    errorCode: authoritativeRun.errorCode
                      || authoritativeRun.code
                      || authoritativeRun.error?.code
                      || "GENERATION_FAILED",
                  } : {}),
                  metadata: {
                    ...(currentPending.metadata || {}),
                    runState: terminalStatus,
                  },
                  updatedAt: serverTimestamp(),
                };
            const persisted = await updateDoc(
              pendingRef,
              sanitizeTranscriptMessagePayload(terminalPayload)
            ).then(() => true).catch(() => false);
            if (persisted) {
              recordChatMessageWrite({
                reason: terminalStatus === "completed"
                  ? "assistant_terminal_success"
                  : "assistant_terminal_failure",
              });
              setMessages((current) => current.map((message) => (
                message.id === currentPending.id
                  ? {
                      ...message,
                      ...terminalPayload,
                    }
                  : message
              )));
              stopPolling();
            }
            return;
          }

          const attachedJobId = String(authoritativeRun.jobId || "").trim();
          if (!attachedJobId) return;
          const attachedResultUrl = String(
            authoritativeRun.resultUrl || authoritativeRun.result_url || ""
          ).trim();
          const attachedRunState = String(authoritativeRun.status || "running")
            .trim()
            .toLowerCase();
          const attachedPending = {
            ...currentPending,
            content: "",
            jobId: attachedJobId,
            ...(attachedResultUrl ? { resultUrl: attachedResultUrl } : {}),
            pending: true,
            stage: attachedRunState === "admitted" ? "Starting admitted run..." : "Working...",
            metadata: {
              ...(currentPending.metadata || {}),
              runState: attachedRunState || "running",
            },
          };
          const attached = await updateDoc(pendingRef, sanitizeTranscriptMessagePayload({
            content: attachedPending.content,
            jobId: attachedPending.jobId,
            ...(attachedResultUrl ? { resultUrl: attachedResultUrl } : {}),
            agentId: currentPending.agentId,
            runId: currentPending.runId,
            pending: true,
            stage: attachedPending.stage,
            metadata: attachedPending.metadata,
            updatedAt: serverTimestamp(),
          })).then(() => true).catch(() => false);
          if (!attached) return;
          recordChatMessageWrite({
            jobId: attachedJobId,
            reason: "assistant_recovery_attach",
          });
          currentPending = attachedPending;
          pendingRecoveryRef.current = attachedPending;
          setMessages((current) => current.map((message) => (
            message.id === attachedPending.id ? attachedPending : message
          )));
        }

        const token = await activeUser.getIdToken();
        if (cancelled || stopped) return;
        throwIfAborted(recoveryController.signal);
        const res = await fetch(resolveResultUrl(currentPending.jobId, currentPending.resultUrl), {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          signal: recoveryController.signal,
        });
        if (cancelled || stopped) return;
        const contentType = res.headers.get("content-type") || "";
        const body = contentType.includes("application/json")
          ? await res.json().catch(() => ({}))
          : {};
        if (cancelled || stopped) return;

        const billingFailure = parseApiErrorPayload(body);
        if (billingFailure || res.status === 402) {
          const persisted = await updateDoc(pendingRef, sanitizeTranscriptMessagePayload({
            pending: false,
            stage: "failed",
            errorCode: "INSUFFICIENT_TOKENS",
            error: billingFailure?.message || body?.message || "You're out of tokens.",
            metadata: {
              ...(currentPending.metadata || {}),
              runState: "failed",
            },
            updatedAt: serverTimestamp(),
          })).then(() => true).catch(() => false);
          if (persisted) {
            recordChatMessageWrite({ jobId: currentPending.jobId, reason: "assistant_recovery_failure" });
            finishChatWriteMetrics(currentPending.jobId, "error");
            stopPolling();
          }
          return;
        }

        if (shouldReadAuthoritativeRunDuringRecovery(currentPending.runId, body)) {
          const runResult = await raceAuthoritativeOperation(
            () => readPendingAgentRun(currentPending.runId),
            {
              signal: recoveryController.signal,
              timeoutMs: AUTHORITATIVE_RUN_RECOVERY_REQUEST_TIMEOUT_MS,
            }
          );
          if (cancelled || stopped) return;
          const authoritativeRun = runResult?.run || runResult || null;
          if (authoritativeRun) {
            const steps = Array.isArray(authoritativeRun.steps)
              ? authoritativeRun.steps.map(normalizeToolStep)
              : [];
            const lastStep = steps[steps.length - 1];
            const terminalStatus = normalizeTerminalRunStatus(
              authoritativeRun.status,
              authoritativeRun
            );
            const stage = authoritativeRun.summary
              || lastStep?.label
              || lastStep?.type
              || statusCopyForAuthoritativeRun(authoritativeRun.status)
              || authoritativeRun.status
              || currentPending.stage
              || "Working...";

            setMessages((current) => current.map((message) => (
              message.id === currentPending.id
                ? {
                    ...message,
                    steps: steps.length ? steps : message.steps,
                    stage,
                    runStatus: authoritativeRun.status || message.runStatus,
                    metadata: {
                      ...(message.metadata || currentPending.metadata || {}),
                      // Keep the message selected by recovery until both the
                      // authoritative Studio run and the result payload finish.
                      runState: "background",
                    },
                  }
                : message
            )));

            // Ordinarily a completed generation response only means model output
            // exists. A terminal taskResult is stronger evidence: it is written
            // after Studio has finished and must win over a stale outer run record.
            if (!terminalStatus && !hasTerminalStudioTaskSuccess(body)) return;
            if (terminalStatus && terminalStatus !== "completed") {
              const canceled = terminalStatus === "canceled";
              const failureMessage = typeof authoritativeRun.error === "string"
                ? authoritativeRun.error
                : authoritativeRun.error?.message
                  || authoritativeRun.summary
                  || (canceled ? "Generation canceled." : "Studio could not finish the task.");
              const terminalPayload = {
                pending: false,
                stage: canceled ? "canceled" : "failed",
                ...(canceled ? { content: failureMessage } : {
                  error: failureMessage,
                  errorCode: authoritativeRun.failureCode
                    || authoritativeRun.errorCode
                    || authoritativeRun.error?.code
                    || "STUDIO_TASK_FAILED",
                }),
                metadata: {
                  ...(currentPending.metadata || {}),
                  runState: canceled ? "canceled" : "failed",
                },
                updatedAt: serverTimestamp(),
              };
              const persisted = await updateDoc(
                pendingRef,
                sanitizeTranscriptMessagePayload(terminalPayload)
              ).then(() => true).catch(() => false);
              if (persisted) {
                recordChatMessageWrite({
                  jobId: currentPending.jobId,
                  reason: "assistant_recovery_failure",
                });
                finishChatWriteMetrics(currentPending.jobId, canceled ? "canceled" : "error");
                setMessages((current) => current.map((message) => (
                  message.id === currentPending.id
                    ? { ...message, ...terminalPayload }
                    : message
                )));
                stopPolling();
              }
              return;
            }
          }
        }

        if (res.status === 202) return;

        let data = null;
        try {
          data = parseCompletedGenerateResult(body);
        } catch (err) {
          const persisted = await updateDoc(pendingRef, sanitizeTranscriptMessagePayload({
            pending: false,
            stage: "failed",
            errorCode: err?.code || null,
            error: err?.message || `Generation failed (${res.status})`,
            metadata: {
              ...(currentPending.metadata || {}),
              runState: "failed",
            },
            updatedAt: serverTimestamp(),
          })).then(() => true).catch(() => false);
          if (persisted) {
            recordChatMessageWrite({ jobId: currentPending.jobId, reason: "assistant_recovery_failure" });
            finishChatWriteMetrics(currentPending.jobId, "error");
            stopPolling();
          }
          return;
        }
        if (!data) {
          if (!res.ok) {
            const persisted = await updateDoc(pendingRef, sanitizeTranscriptMessagePayload({
              pending: false,
              stage: "failed",
              errorCode: body?.code || null,
              error: body?.message || body?.error || `Generation failed (${res.status})`,
              metadata: {
                ...(currentPending.metadata || {}),
                runState: "failed",
              },
              updatedAt: serverTimestamp(),
            })).then(() => true).catch(() => false);
            if (persisted) {
              recordChatMessageWrite({ jobId: currentPending.jobId, reason: "assistant_recovery_failure" });
              finishChatWriteMetrics(currentPending.jobId, "error");
              stopPolling();
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
          isAutoExecuting: Boolean(currentPending.isAutoExecuting || isAutoExecutingMode(currentMode)),
        });
        if (data?.runId || currentPending.runId) msgPayload.runId = data?.runId || currentPending.runId;
        await updateDoc(pendingRef, sanitizeTranscriptMessagePayload(msgPayload));
        recordChatMessageWrite({ jobId: currentPending.jobId, reason: "assistant_recovery_success" });
        finishChatWriteMetrics(currentPending.jobId, "done");
        await updateDoc(chatRef, sanitizeChatWritePayload({
          updatedAt: serverTimestamp(),
          lastMessage: (currentPending.prompt || data?.title || "Studio agent run").slice(0, 50),
        })).catch(() => {});
        refreshBilling?.();
        emitAiEvent("JOB_COMPLETE", { jobId: currentPending.jobId });
        stopPolling();
      } catch (err) {
        if (!cancelled && !isAbortError(err) && err?.code !== "ADMISSION_TIMEOUT") {
          console.warn("Failed to recover pending agent run:", err?.message || err);
        }
      } finally {
        pollInFlight = false;
      }
    };

    pollPendingRun();
    intervalId = setInterval(
      pollPendingRun,
      pending.jobId ? PENDING_RUN_POLL_MS : QUEUED_RUN_POLL_MS
    );
    if (PENDING_RUN_RECOVERY_WALL_TIMEOUT_MS > 0) {
      wallTimerId = setTimeout(() => {
        const currentPending = pendingRecoveryRef.current || pending;
        if (!cancelled && !stopped && currentPending) {
          void handoffRecoveryToBackground(currentPending, {
            keepRecovering: !currentPending.jobId,
          });
        }
      }, PENDING_RUN_RECOVERY_WALL_TIMEOUT_MS);
    }
    return () => {
      cancelled = true;
      recoveryController.abort();
      stopPolling();
    };
  }, [
    authReady,
    user?.uid,
    currentChatId,
    pendingRecoveryMessage?.id,
    pendingRecoveryMessage?.jobId,
    pendingRecoveryMessage?.runId,
    pendingRecoveryMessage?.agentId,
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
    try {
      await assertCanWrite();
    } catch (error) {
      notify?.({ message: error?.message, type: "error" });
      return;
    }

    if (!unlimitedTokens && totalRemaining <= 0) {
      notify(insufficientTokensToast(planKey));
      return;
    }

    const requestedMode = modeOverride || (actNow ? "agent" : chatMode);
    const currentMode = requestedMode === "act" ? "agent" : requestedMode;
    const requestId = existingRequestId || uuidv4();
    const authoritativeEnvelope = submissionOptions?.authoritativeRun;
    const authoritativeSignal = submissionOptions?.authoritativeSignal || null;
    const authoritativeDecision = authoritativeEnvelope?.decision
      || authoritativeEnvelope?.run?.decision
      || null;

    let activeChatId = existingChatId || currentChatId;
    let activeAssistantRef = null;
    let activeGenerationJobId = null;
    let activeGenerationRunId = String(authoritativeEnvelope?.run?.runId || "").trim() || null;
    let canonicalCancelRequest = null;

    const requestCanonicalCancellation = () => {
      if (!authoritativeEnvelope || !activeGenerationRunId) return Promise.resolve(null);
      if (!canonicalCancelRequest) {
        canonicalCancelRequest = Promise.resolve(cancelAgentRunV2(activeGenerationRunId, {
          reason: "user_cancelled",
          idempotencyKey: `${submissionOptions?.idempotencyKey || requestId}:cancel`,
          chatId: activeChatId,
        })).catch((error) => {
          console.warn("Could not confirm server-side run cancellation.", error);
          return null;
        });
      }
      return canonicalCancelRequest;
    };

    const expertMode = modeOverride || normalizeChatMode(activeMode || settings?.chatMode);

    // Setters bound to the originating chat. `activeChatId` is a `let` that may be
    // assigned below (new chat); these closures always read its latest value, so
    // generation state lands in the chat it started in regardless of navigation.
    const runStreamKey = (chatId) => `${chatId}:${requestId}`;
    const setPending = (updater) => setPendingForChat(activeChatId, updater, requestId);
    const setStage = (value) => setStageForChat(activeChatId, value, requestId);
    const setBusy = (value) => setGeneratingForChat(activeChatId, value, requestId);

    const publishGenerationStage = (chatId, label, { id, status, extraPending } = {}) => {
      if (!label || !chatId) return;
      const streamKey = runStreamKey(chatId);
      streamStatesRef.current[streamKey] = applyStreamActivity(
        streamStatesRef.current[streamKey] || createPendingStreamState(),
        {
          id: id || `stage-${stageSlug(label)}`,
          type: "stage",
          status: status || label,
          text: label,
        }
      );
      const snapshot = getPendingStreamSnapshot(streamStatesRef.current[streamKey]);
      setStageForChat(chatId, label, requestId);
      setPendingForChat(chatId, (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          stage: label,
          streamState: snapshot,
          streamStatus: null,
          ...(extraPending || {}),
        };
      }, requestId);
    };

    const beginGenerationState = (chatId) => {
      setGeneratingForChat(chatId, true, requestId);
      const initialState = applyStreamActivity(createPendingStreamState(), {
        type: "stage",
        text: "Analyzing Request...",
        status: "Analyzing Request...",
      });
      streamStatesRef.current[runStreamKey(chatId)] = initialState;
      setPendingForChat(chatId, {
        role: "assistant",
        content: "",
        type: "chat",
        prompt: displayContent,
        mode: currentMode,
        requestId,
        stage: "Analyzing Request...",
        ...(authoritativeDecision ? { decision: authoritativeDecision } : {}),
        streamState: getPendingStreamSnapshot(initialState),
      }, requestId);
      setStageForChat(chatId, "Analyzing Request...", requestId);
    };

    if (activeChatId) beginGenerationState(activeChatId);

    try {
      if (!activeChatId) {
        const selectedProjectId = String(submissionOptions?.projectId || "").trim();
        if (!selectedProjectId) throw createProjectRequiredError();
        const newChatPayload = {
          title: displayContent.slice(0, 30) + (displayContent.length > 30 ? "..." : ""),
          activeMode: expertMode,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        newChatPayload.projectId = selectedProjectId;
        const newChatRef = await addDoc(
          collection(db, "users", user.uid, "chats"),
          sanitizeChatWritePayload(newChatPayload)
        );
        activeChatId = newChatRef.id;
        openChatById(activeChatId);
        beginGenerationState(activeChatId);
      }

      if (!existingRequestId) {
        const userMsgRef = doc(db, "users", user.uid, "chats", activeChatId, "messages", `${requestId}-user`);
        await setDoc(userMsgRef, sanitizeTranscriptMessagePayload({
          role: "user",
          content: displayContent,
          ...(normalizedAttachments.length ? { attachments: normalizedAttachments } : {}),
          createdAt: serverTimestamp(),
          requestId,
        }));
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
      let jobData;
      if (authoritativeEnvelope?.run?.runId) {
        jobData = authoritativeEnvelope.run;
      } else {
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
          studioEnabled,
          applyMode: getStudioApplyMode(),
          routingMode: "hybrid",
          autoPushToStudio:
            autoPushToStudio,
          autoPushPolicy,
          baseArtifact,
          ...(submissionOptions?.isRefinement ? { isRefinement: true } : {}),
          ...(submissionOptions?.baseArtifactRef
            ? { baseArtifactRef: submissionOptions.baseArtifactRef }
            : {}),
          ...(submissionOptions?.parentJobId
            ? { parentJobId: submissionOptions.parentJobId }
            : {}),
          ...(submissionOptions?.approvedPlan ? {
            approvedPlan: {
              planId: submissionOptions.approvedPlan.planId,
              version: submissionOptions.approvedPlan.version,
              hash: submissionOptions.approvedPlan.hash,
            },
          } : {}),
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
                if (activeChatId) delete streamStatesRef.current[runStreamKey(activeChatId)];
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
        jobData = await jobRes.json();
      }
      const runtimeDecision = authoritativeDecision || jobData?.decision || null;
      let jobId = typeof jobData.jobId === "string" ? jobData.jobId.trim() : "";
      const acceptedTaskId = typeof jobData.taskId === "string" ? jobData.taskId.trim() : "";
      const immediateTerminalStatus = !jobId
        ? normalizeTerminalRunStatus(jobData?.status, jobData)
        : null;
      if (immediateTerminalStatus === "failed" || immediateTerminalStatus === "canceled") {
        const userCancelled = immediateTerminalStatus === "canceled";
        const rawMessage = userCancelled
          ? "Generation canceled."
          : formatUserFacingError(jobData);
        const terminalMessage = String(rawMessage || "Generation failed").trim().slice(0, 1000);
        const terminalCode = userCancelled
          ? "user_cancelled"
          : String(
              jobData?.failureCode
              || jobData?.errorCode
              || jobData?.code
              || jobData?.error?.code
              || "GENERATION_FAILED"
            ).trim().slice(0, 120);
        const assistantMsgRef = doc(
          db,
          "users",
          user.uid,
          "chats",
          activeChatId,
          "messages",
          `${requestId}-assistant`,
        );
        activeAssistantRef = assistantMsgRef;
        await setDoc(assistantMsgRef, sanitizeTranscriptMessagePayload({
          role: "assistant",
          content: terminalMessage,
          pending: false,
          stage: userCancelled ? "canceled" : "failed",
          requestId,
          ...(jobData?.runId ? { runId: jobData.runId } : {}),
          ...(acceptedTaskId ? { taskId: acceptedTaskId } : {}),
          ...(runtimeDecision ? { decision: runtimeDecision } : {}),
          ...(userCancelled ? {} : {
            error: terminalMessage,
            errorCode: terminalCode,
          }),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          metadata: {
            mode: currentMode,
            type: null,
            runState: userCancelled ? "canceled" : "failed",
          },
        }), { merge: true });
        recordChatMessageWrite({
          reason: userCancelled
            ? "assistant_terminal_canceled"
            : "assistant_terminal_failure",
        });
        const terminalError = new Error(terminalMessage);
        terminalError.code = terminalCode;
        terminalError.serverPayload = jobData;
        throw terminalError;
      }
      const runtimeTaskAccepted = !authoritativeEnvelope
        && FEATURE_FLAGS.newTaskRuntime
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

      const joblessAuthoritativeRun = Boolean(
        authoritativeEnvelope
        && !jobId
        && String(jobData?.runId || "").trim()
      );
      if (joblessAuthoritativeRun) {
        const joblessAgentId = String(
          jobData.agentId
          || authoritativeEnvelope?.agentId
          || authoritativeEnvelope?.agent?.agentId
          || ""
        ).trim();
        const joblessRunId = String(jobData.runId || "").trim();
        const joblessStage = jobData.queuePosition != null
          && Number.isFinite(Number(jobData.queuePosition))
          && Number(jobData.queuePosition) > 0
          ? `Queued (position ${Number(jobData.queuePosition)})`
          : statusCopyForAuthoritativeRun(jobData.status) || "Queued";
        const joblessAssistantRef = doc(
          db,
          "users",
          user.uid,
          "chats",
          activeChatId,
          "messages",
          `${requestId}-assistant`,
        );
        publishGenerationStage(activeChatId, joblessStage, {
          extraPending: {
            runId: joblessRunId,
            ...(joblessAgentId ? { agentId: joblessAgentId } : {}),
            taskId: acceptedTaskId || null,
            queuePosition: jobData.queuePosition || null,
            ...(runtimeDecision ? { decision: runtimeDecision } : {}),
          },
        });
        await setDoc(joblessAssistantRef, sanitizeTranscriptMessagePayload({
          role: "assistant",
          content: "",
          stage: joblessStage,
          pending: true,
          requestId,
          runId: joblessRunId,
          ...(joblessAgentId ? { agentId: joblessAgentId } : {}),
          ...(acceptedTaskId ? { taskId: acceptedTaskId } : {}),
          ...(jobData.queuePosition ? { queuePosition: jobData.queuePosition } : {}),
          ...(runtimeDecision ? { decision: runtimeDecision } : {}),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          metadata: {
            mode: currentMode,
            type: null,
            runState: String(jobData.status || "queued").trim().toLowerCase() || "queued",
          },
        }), { merge: true });

        const persistJoblessTerminalState = async (
          status,
          error = null,
          authoritativeRun = null
        ) => {
          const copyByStatus = {
            completed: "Run completed.",
            failed: "The Studio run failed before a generation job was attached.",
            canceled: "Generation canceled.",
            background: "Still working in the background. Results will appear when ready.",
          };
          const copy = copyByStatus[status] || copyByStatus.failed;
          const authoritativeOutput = status === "completed"
            ? findAuthoritativeRunOutput(authoritativeRun)
            : null;
          const completedPayload = authoritativeOutput
            ? buildAssistantMessagePayload(authoritativeOutput, {
                requestId,
                jobId: null,
                currentMode,
                isAutoExecuting: isAutoExecutingMode(currentMode),
              })
            : null;
          const terminalPayload = completedPayload
            ? {
                ...completedPayload,
                role: "assistant",
                requestId,
                runId: joblessRunId,
                ...(joblessAgentId ? { agentId: joblessAgentId } : {}),
                ...(acceptedTaskId ? { taskId: acceptedTaskId } : {}),
                ...(runtimeDecision ? { decision: runtimeDecision } : {}),
                metadata: {
                  ...(completedPayload.metadata || {}),
                  mode: currentMode,
                  runState: "succeeded",
                },
                updatedAt: serverTimestamp(),
              }
            : {
                role: "assistant",
                content: copy,
                pending: false,
                stage: status,
                requestId,
                runId: joblessRunId,
                ...(joblessAgentId ? { agentId: joblessAgentId } : {}),
                ...(acceptedTaskId ? { taskId: acceptedTaskId } : {}),
                ...(runtimeDecision ? { decision: runtimeDecision } : {}),
                ...(error ? {
                  error: formatUserFacingError(error),
                  errorCode: error?.code || "GENERATION_FAILED",
                } : {}),
                updatedAt: serverTimestamp(),
                metadata: { mode: currentMode, type: null, runState: status },
              };
          await setDoc(
            joblessAssistantRef,
            sanitizeTranscriptMessagePayload(terminalPayload),
            { merge: true }
          );
          recordChatMessageWrite({
            reason: status === "completed"
              ? "assistant_terminal_success"
              : status === "background"
                ? "assistant_background_handoff"
                : "assistant_terminal_failure",
          });
          setBusy(false);
          setPending(null);
          setStage("");
          delete streamStatesRef.current[runStreamKey(activeChatId)];
        };

        try {
          jobData = await waitForAuthoritativeRunJob({
            agentId: joblessAgentId,
            runId: joblessRunId,
            signal: authoritativeSignal,
            onStatus: (nextStage) => publishGenerationStage(activeChatId, nextStage, {
              extraPending: {
                runId: joblessRunId,
                ...(joblessAgentId ? { agentId: joblessAgentId } : {}),
                taskId: acceptedTaskId || null,
              },
            }),
          });
        } catch (error) {
          if (isAbortError(error)) {
            void requestCanonicalCancellation();
            await persistJoblessTerminalState("canceled");
            return;
          }
          await persistJoblessTerminalState("failed", error);
          throw error;
        }

        if (jobData?.terminal && !jobData?.jobId) {
          const terminalStatus = normalizeTerminalRunStatus(jobData.status, jobData) || "background";
          await persistJoblessTerminalState(
            terminalStatus,
            terminalStatus === "failed" ? jobData : null,
            jobData,
          );
          if (terminalStatus === "background") {
            notify?.({
              type: "info",
              message: "The run is still working in the background. Results will appear when ready.",
            });
          }
          return;
        }
        jobId = String(jobData.jobId || "").trim();
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
          await setDoc(assistantMsgRef, sanitizeTranscriptMessagePayload({
            role: "assistant",
            content: waitingCopy,
            stage: jobData.waitingUser ? "Awaiting confirmation" : "Task update",
            pending: false,
            requestId,
            ...(acceptedTaskId ? { taskId: acceptedTaskId } : {}),
            ...(runtimeDecision ? { decision: runtimeDecision } : {}),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }), { merge: true });
          setBusy(false);
          setPending(null);
          setStage("");
          if (activeChatId) delete streamStatesRef.current[runStreamKey(activeChatId)];
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
      activeAssistantRef = assistantMsgRef;
      activeGenerationJobId = jobId;
      activeGenerationRunId = agentRunId;

      publishGenerationStage(activeChatId, "Generating...", {
        extraPending: {
          steps: [],
          runId: agentRunId,
          ...(runtimeDecision ? { decision: runtimeDecision } : {}),
        },
      });
      await setDoc(assistantMsgRef, sanitizeTranscriptMessagePayload({
        role: "assistant",
        content: "",
        stage: "Generating...",
        pending: true,
        requestId,
        jobId,
        ...(acceptedTaskId ? { taskId: acceptedTaskId } : {}),
        ...(agentRunId ? { runId: agentRunId } : {}),
        ...(runtimeDecision ? { decision: runtimeDecision } : {}),
        isAutoExecuting: isAutoExecutingMode(currentMode),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        metadata: {
          mode: currentMode,
          type: null,
          runState: "running",
        },
        steps: [],
      }), { merge: true });
      recordChatMessageWrite({ jobId, reason: "assistant_initial" });

      publishGenerationStage(activeChatId, "Connecting...");
      throwIfAborted(authoritativeSignal);
      const initialStreamSession = await raceAuthoritativeOperation(
        () => ensureStreamSession(token, { retries: 1 }),
        { signal: authoritativeSignal, timeoutMs: 30_000 }
      ).catch((error) => {
        if (isAbortError(error)) throw error;
        return { token: null };
      });
      throwIfAborted(authoritativeSignal);

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
        const isAutoExecuting = isAutoExecutingMode(currentMode);
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
        let detachAuthoritativeAbort = () => {};
        const progressPersistence = createChatProgressPersistence({
          key: `${user.uid}/${activeChatId}/${requestId}-assistant`,
          persist: async (progress) => {
            await updateDoc(assistantMsgRef, sanitizeTranscriptMessagePayload({
              ...progress,
              updatedAt: serverTimestamp(),
            }));
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
          const snapshot = getPendingStreamSnapshot(streamStatesRef.current[runStreamKey(activeChatId)]);
          const pendingContent = formatPendingStreamContent(streamStatesRef.current[runStreamKey(activeChatId)]);
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
          streamStatesRef.current[runStreamKey(activeChatId)] = applyStreamActivity(
            streamStatesRef.current[runStreamKey(activeChatId)],
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
          if (finalized) return false;
          throwIfAborted(authoritativeSignal);
          let lookup;
          try {
            lookup = await raceAuthoritativeOperation(
              async () => {
                const res = await fetch(resultUrl, {
                  headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                  },
                  ...(authoritativeSignal ? { signal: authoritativeSignal } : {}),
                });
                const contentType = res.headers.get("content-type") || "";
                const data = contentType.includes("application/json")
                  ? await res.json().catch(() => ({}))
                  : {};
                return { res, data };
              },
              {
                signal: authoritativeSignal,
                timeoutMs: AUTHORITATIVE_RUN_RECOVERY_REQUEST_TIMEOUT_MS,
              }
            );
          } catch (error) {
            // A stalled result lookup is not a terminal run failure. Let the
            // reconnect/poll/background recovery path remain authoritative.
            if (error?.code === "ADMISSION_TIMEOUT") return false;
            throw error;
          }
          if (finalized) return false;
          const { res, data } = lookup;
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
          if (finalized) return;
          finalized = true;
          receivedDone = true;
          eventSource?.close?.();
          detachAuthoritativeAbort();
          const userCancelled = isServerConfirmedUserCancellation(err);
          const friendlyMessage = userCancelled ? "Generation canceled." : formatUserFacingError(err);
          emitStreamMetric("error", {
            jobId,
            tag,
            message: friendlyMessage,
            retries: retryCount,
          });
          progressPersistence.cancel();
          updateDoc(assistantMsgRef, sanitizeTranscriptMessagePayload({
            pending: false,
            stage: userCancelled ? "canceled" : "failed",
            ...(userCancelled ? {} : {
              errorCode: err?.code || null,
              error: friendlyMessage,
            }),
            ...(userCancelled ? { content: friendlyMessage } : {}),
            metadata: {
              mode: currentMode,
              type: null,
              runState: userCancelled ? "canceled" : "failed",
            },
            updatedAt: serverTimestamp(),
          }))
            .then(() => recordChatMessageWrite({
              jobId,
              reason: userCancelled ? "assistant_terminal_canceled" : "assistant_terminal_failure",
            }))
            .catch(() => {})
            .finally(() => finishChatWriteMetrics(jobId, userCancelled ? "canceled" : "error"));
          setBusy(false);
          if (streamFlushTimer) clearTimeout(streamFlushTimer);
          stopIdlePulse();
          clearWallTimer();
          setPending(null);
          setStage("");
          delete streamStatesRef.current[runStreamKey(activeChatId)];
          const publicError = new Error(friendlyMessage);
          publicError.code = userCancelled ? "user_cancelled" : err?.code || "GENERATION_FAILED";
          reject(publicError);
        };

        const handoffRecoveryTimeout = ({
          metricMessage = "Recovery wall timeout; background poll continues",
          notificationMessage = "Connection lost — still working in the background. Results will appear when ready.",
        } = {}) => {
          if (finalized) return;
          finalized = true;
          receivedDone = true;
          detachAuthoritativeAbort();
          emitStreamMetric("error", {
            jobId,
            tag: "timeout",
            message: metricMessage,
            retries: retryCount,
          });
          eventSource?.close?.();
          progressPersistence.cancel();
          updateDoc(assistantMsgRef, sanitizeTranscriptMessagePayload({
            pending: false,
            stage: "background",
            jobId,
            requestId,
            ...(agentRunId ? { runId: agentRunId } : {}),
            metadata: {
              mode: currentMode,
              type: null,
              runState: "background",
            },
            updatedAt: serverTimestamp(),
          }))
            .then(() => recordChatMessageWrite({ jobId, reason: "assistant_background_handoff" }))
            .catch(() => {});
          notify?.({
            type: "info",
            message: notificationMessage,
          });
          setBusy(false);
          if (streamFlushTimer) clearTimeout(streamFlushTimer);
          stopIdlePulse();
          clearWallTimer();
          setPending(null);
          setStage("");
          delete streamStatesRef.current[runStreamKey(activeChatId)];
          resolve();
        };

        const startWallTimer = () => {
          clearWallTimer();
          if (GENERATION_WALL_TIMEOUT_MS <= 0) return;
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
          detachAuthoritativeAbort();
          progressPersistence.cancel();

          const message = payload.message || insufficientTokensToast(planKey).message;
          emitStreamMetric("error", {
            jobId,
            tag: "billing",
            message,
            retries: retryCount,
          });

          const failurePersisted = await setDoc(assistantMsgRef, sanitizeTranscriptMessagePayload({
            role: "assistant",
            content: "",
            pending: false,
            stage: "failed",
            errorCode: "INSUFFICIENT_TOKENS",
            error: message,
            requestId,
            jobId,
            ...(agentRunId ? { runId: agentRunId } : {}),
            metadata: {
              mode: currentMode,
              type: null,
              runState: "failed",
            },
            updatedAt: serverTimestamp(),
          }), { merge: true }).then(() => true).catch(() => false);
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
          delete streamStatesRef.current[runStreamKey(activeChatId)];
          resolve();
        };

        const finalizeWithData = async (data, source = "done") => {
          if (finalized) return;
          receivedDone = true;
          eventSource?.close?.();
          try {
            if (agentRunId) {
              publishStage("Generation complete — applying and verifying...", {
                id: "stage-task-continuation",
                status: "running",
              });
              const authoritativeCompletion = await waitForAuthoritativeTaskCompletion({
                runId: agentRunId,
                signal: authoritativeSignal,
                onProgress: (run) => {
                  const steps = Array.isArray(run?.steps)
                    ? run.steps.map(normalizeToolStep)
                    : [];
                  for (const step of steps) {
                    recordStreamActivity({
                      type: "tool_step",
                      id: step.id ? `tool-${step.id}` : undefined,
                      status: step.status,
                      text: step.label || step.type,
                      stepType: step.type,
                      path: step.result?.path || "",
                    }, false);
                  }
                  const nextStage = run.summary
                    || statusCopyForAuthoritativeRun(run.status)
                    || "Applying and verifying in Studio...";
                  publishStage(nextStage, {
                    id: `stage-${stageSlug(nextStage)}`,
                    status: run.status,
                  });
                  setPending((previous) => previous ? {
                    ...previous,
                    steps: steps.length ? steps : previous.steps,
                    runId: run.runId || run.id || previous.runId || agentRunId,
                    runStatus: run.status || previous.runStatus,
                    stage: nextStage,
                    targetSelection: Object.prototype.hasOwnProperty.call(run, "targetSelection")
                      ? run.targetSelection
                      : previous.targetSelection,
                    metadata: {
                      ...(previous.metadata || {}),
                      runState: run.status || previous.metadata?.runState || "running",
                    },
                  } : previous);
                },
              });
              if (authoritativeCompletion) {
                const { run, terminalStatus } = authoritativeCompletion;
                if (terminalStatus === "background") {
                  handoffRecoveryTimeout({
                    metricMessage: "Studio apply/verification timeout; background poll continues",
                    notificationMessage:
                      "Studio is taking longer than expected — continuing in the background. Results will appear when ready.",
                  });
                  return;
                }
                if (terminalStatus !== "completed") {
                  const taskError = new Error(
                    run?.error?.message
                    || run?.error
                    || run?.summary
                    || `The task ${terminalStatus}.`
                  );
                  taskError.code = run?.failureCode
                    || run?.errorCode
                    || run?.error?.code
                    || `TASK_${String(terminalStatus).toUpperCase()}`;
                  throw taskError;
                }
                const authoritativeSteps = Array.isArray(run?.steps)
                  ? run.steps.map(normalizeToolStep)
                  : [];
                data = {
                  ...data,
                  ...(run?.summary ? { summary: run.summary } : {}),
                  ...(authoritativeSteps.length ? { steps: authoritativeSteps } : {}),
                  runId: run?.runId || run?.id || data?.runId || agentRunId,
                  runState: run?.status || data?.runState || "succeeded",
                };
              }
            }

            finalized = true;
            detachAuthoritativeAbort();
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
            // Do not rewrite createdAt: validMessageUpdate forbids changing it, and
            // a full setDoc overwrite would also delete it — both yield permission-denied.
            if (data?.runId || agentRunId) msgPayload.runId = data?.runId || agentRunId;

            await updateDoc(assistantMsgRef, sanitizeTranscriptMessagePayload(msgPayload));
            recordChatMessageWrite({ jobId, reason: "assistant_terminal_success" });

            await updateDoc(doc(db, "users", user.uid, "chats", activeChatId), sanitizeChatWritePayload({
              updatedAt: serverTimestamp(),
              lastMessage: displayContent.slice(0, 50),
            }));

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
            delete streamStatesRef.current[runStreamKey(activeChatId)];
          } catch (error) {
            finalized = false;
            receivedDone = false;
            throw error;
          }
        };

        const cancelAuthoritativeRun = () => {
          if (finalized) return;
          finalized = true;
          receivedDone = true;
          void requestCanonicalCancellation();
          eventSource?.close?.();
          detachAuthoritativeAbort();
          progressPersistence.cancel();
          void setDoc(assistantMsgRef, sanitizeTranscriptMessagePayload({
            role: "assistant",
            content: "Generation canceled.",
            pending: false,
            stage: "canceled",
            requestId,
            jobId,
            ...(agentRunId ? { runId: agentRunId } : {}),
            ...(runtimeDecision ? { decision: runtimeDecision } : {}),
            metadata: {
              mode: currentMode,
              type: null,
              runState: "canceled",
            },
            updatedAt: serverTimestamp(),
          }), { merge: true })
            .then(() => recordChatMessageWrite({ jobId, reason: "assistant_terminal_failure" }))
            .catch(() => {})
            .finally(() => finishChatWriteMetrics(jobId, "canceled"));
          setBusy(false);
          if (streamFlushTimer) clearTimeout(streamFlushTimer);
          stopIdlePulse();
          clearWallTimer();
          setPending(null);
          setStage("");
          delete streamStatesRef.current[runStreamKey(activeChatId)];
          resolve();
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
                if (!finalized && !authoritativeSignal?.aborted) {
                  connect({ refreshSession: true });
                }
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
              fetchImpl: (url, options = {}) => fetch(url, {
                ...options,
                ...(authoritativeSignal ? { signal: authoritativeSignal } : {}),
              }),
              waitImpl: (milliseconds) => raceAuthoritativeOperation(
                () => wait(milliseconds),
                {
                  signal: authoritativeSignal,
                  timeoutMs: milliseconds + 1000,
                }
              ),
              onPending: applyRecoveryStage,
            });
            await finalizeWithData(recovered, "fallback");
            resolve();
          } catch (fallbackErr) {
            if (isAbortError(fallbackErr)) {
              cancelAuthoritativeRun();
              return;
            }
            if (isInsufficientTokensError(fallbackErr)) {
              await failInsufficientTokens(fallbackErr);
              return;
            }
            if (fallbackErr?.code === "RECOVERY_TIMEOUT") {
              handoffRecoveryTimeout();
              return;
            }
            const terminalError =
              fallbackErr instanceof Error
                ? fallbackErr
                : rawError instanceof Error
                  ? rawError
                  : new Error("Generation failed");
            failAndReject(terminalError, terminalError.code || "network");
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
            const errorMessage = data?.message
              || (typeof data?.error === "string" ? data.error : data?.error?.message);
            const failureCode = data?.failureCode
              || data?.errorCode
              || data?.code
              || data?.error?.failureCode
              || data?.error?.errorCode
              || data?.error?.code;
            if (failureCode || errorMessage) {
              eventSource?.close?.();
              const terminalError = new Error(errorMessage || "Generation failed");
              terminalError.code = failureCode || "GENERATION_FAILED";
              terminalError.details = data?.details || data?.workspaceConflict || null;
              terminalError.serverPayload = data;
              failAndReject(terminalError, terminalError.code);
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
              streamStatesRef.current[runStreamKey(activeChatId)] = applyReasoningDelta(
                streamStatesRef.current[runStreamKey(activeChatId)],
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
              streamStatesRef.current[runStreamKey(activeChatId)] = applyStreamDelta(
                streamStatesRef.current[runStreamKey(activeChatId)],
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
          if (finalized || authoritativeSignal?.aborted) return false;
          try {
            const session = await ensureStreamSession(token, { retries: 1 });
            if (finalized || authoritativeSignal?.aborted) return false;
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
          if (finalized || authoritativeSignal?.aborted) {
            if (authoritativeSignal?.aborted) cancelAuthoritativeRun();
            return;
          }
          eventSource?.close?.();
          const sessionOk = streamSessionToken && !refreshSession
            ? true
            : await mintStreamSession();
          if (finalized || authoritativeSignal?.aborted) {
            if (authoritativeSignal?.aborted) cancelAuthoritativeRun();
            return;
          }
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
            getActivitySeq: () => streamStatesRef.current[runStreamKey(activeChatId)]?.activitySeq || 0,
            getContext: () => ({ studioConnected: Boolean(studioEnabled) }),
          });
          idlePulse.start();
        };

        if (authoritativeSignal) {
          const onAbort = () => cancelAuthoritativeRun();
          authoritativeSignal.addEventListener("abort", onAbort, { once: true });
          detachAuthoritativeAbort = () => {
            authoritativeSignal.removeEventListener("abort", onAbort);
          };
          if (authoritativeSignal.aborted) {
            cancelAuthoritativeRun();
            return;
          }
        }

        startWallTimer();
        if (sseSessionUnavailable) {
          recoverFromStreamFailure();
        } else {
          connect();
        }
      });

    } catch (e) {
      if (isAbortError(e)) {
        void requestCanonicalCancellation();
        if (activeAssistantRef) {
          const canceledPersisted = await setDoc(activeAssistantRef, sanitizeTranscriptMessagePayload({
            role: "assistant",
            content: "Generation canceled.",
            pending: false,
            stage: "canceled",
            requestId,
            ...(activeGenerationJobId ? { jobId: activeGenerationJobId } : {}),
            ...(activeGenerationRunId ? { runId: activeGenerationRunId } : {}),
            ...(authoritativeDecision ? { decision: authoritativeDecision } : {}),
            metadata: {
              mode: currentMode,
              type: null,
              runState: "canceled",
            },
            updatedAt: serverTimestamp(),
          }), { merge: true }).then(() => true).catch(() => false);
          if (canceledPersisted) {
            recordChatMessageWrite({
              jobId: activeGenerationJobId,
              reason: "assistant_terminal_failure",
            });
            finishChatWriteMetrics(activeGenerationJobId, "canceled");
          }
        }
      } else {
        console.error(e);
      }
      if (isInsufficientTokensError(e)) {
        notify(insufficientTokensToast(planKey));
      } else if (!isAbortError(e)) {
        notify({ message: formatUserFacingError(e), type: "error" });
      }
      setBusy(false);
      setPending(null);
      setStage("");
      if (activeChatId) delete streamStatesRef.current[runStreamKey(activeChatId)];
    }
  };

  const handleDeleteChat = async (chatId) => {
    if (!authReady || !user?.uid || auth.currentUser?.uid !== user.uid || !chatId) return;
    try {
      const response = await authedFetch(`/api/user/data/chats/${encodeURIComponent(chatId)}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message || "The chat could not be deleted");
      }
      // Drop any in-flight generation state tied to the deleted chat.
      Object.keys(generatingRef.current).forEach((key) => {
        if (key.startsWith(`${chatId}:`)) delete generatingRef.current[key];
      });
      Object.keys(streamStatesRef.current).forEach((key) => {
        if (key.startsWith(`${chatId}:`)) delete streamStatesRef.current[key];
      });
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
      throw err;
    }
  };

  const handleRenameChat = async (chatId, title) => {
    const nextTitle = String(title || "").trim();
    if (!authReady || !user?.uid || auth.currentUser?.uid !== user.uid || !chatId || !nextTitle) {
      return { ok: false, error: "Sign in and enter a chat title before renaming." };
    }
    try {
      await assertCanWrite();
      await updateDoc(doc(db, "users", user.uid, "chats", chatId), sanitizeChatWritePayload({
        title: nextTitle,
        updatedAt: serverTimestamp(),
      }));
      if (currentChatId === chatId) {
        setCurrentChatMeta((current) => current ? { ...current, title: nextTitle } : current);
      }
      notify({ message: "Chat renamed", type: "success" });
      return { ok: true, title: nextTitle };
    } catch (err) {
      const message = err?.message || "Failed to rename chat";
      notify({ message, type: "error" });
      return { ok: false, error: message };
    }
  };

  const handleMoveChat = async (chatId, projectId = null) => {
    if (!authReady || !user?.uid || auth.currentUser?.uid !== user.uid || !chatId) return;
    const nextProjectId = String(projectId || "").trim() || null;
    try {
      await assertCanWrite();
      await updateDoc(doc(db, "users", user.uid, "chats", chatId), sanitizeChatWritePayload({
        projectId: nextProjectId,
        updatedAt: serverTimestamp(),
      }));
      if (currentChatId === chatId) {
        setCurrentChatMeta((current) => current ? { ...current, projectId: nextProjectId } : current);
      }
      notify({ message: nextProjectId ? "Chat moved to project" : "Chat moved to General", type: "success" });
    } catch (err) {
      notify({ message: err?.message || "Failed to move chat", type: "error" });
    }
  };

  const handleClearChat = async () => {
    if (!authReady || !user?.uid || auth.currentUser?.uid !== user.uid || !currentChatId) return;
    try {
      await assertCanWrite();
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

  /**
   * Truncate the durable transcript at a pivot message (Cursor-style rewind).
   * mode "after" keeps the pivot; "replace" deletes the pivot and everything after.
   */
  const rewindTranscript = useCallback(async (messageId, mode = "after") => {
    const pivotId = String(messageId || "").trim();
    const rewindMode = normalizeRewindMode(mode);
    if (!authReady || !user?.uid || auth.currentUser?.uid !== user.uid || !currentChatId) {
      throw new Error("Cannot rewind without an active chat.");
    }
    if (!pivotId) throw new Error("Cannot rewind without a message id.");

    await assertCanWrite();
    const messagesRef = collection(db, "users", user.uid, "chats", currentChatId, "messages");

    let pivot = (messages || []).find((message) => message?.id === pivotId) || null;
    if (!pivot) {
      const pivotSnap = await getDoc(doc(messagesRef, pivotId));
      if (!pivotSnap.exists()) {
        throw new Error("That message is no longer in this chat.");
      }
      pivot = { id: pivotSnap.id, ...pivotSnap.data() };
    }

    let candidateDocs = [];
    if (pivot.createdAt != null) {
      const snap = await getDocs(query(
        messagesRef,
        orderBy("createdAt", "asc"),
        where("createdAt", ">=", pivot.createdAt),
        limit(CLEAR_CHAT_MESSAGE_LIMIT)
      ));
      candidateDocs = snap.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
    } else {
      const snap = await getDocs(query(
        messagesRef,
        orderBy("createdAt", "asc"),
        limitToLast(CLEAR_CHAT_MESSAGE_LIMIT)
      ));
      candidateDocs = snap.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
    }

    const ordered = mergeChatMessages(messages, candidateDocs, [pivot]);
    const { kept, removed, pivot: resolvedPivot } = selectMessagesToRemove(
      ordered,
      pivotId,
      rewindMode
    );
    if (!resolvedPivot) {
      throw new Error("That message is no longer in this chat.");
    }

    const removeIds = removed.map((message) => message.id).filter(Boolean);
    if (removeIds.length) {
      setMessages((current) => current.filter((message) => !removeIds.includes(message.id)));
      for (let offset = 0; offset < removeIds.length; offset += 400) {
        const chunk = removeIds.slice(offset, offset + 400);
        const batch = writeBatch(db);
        chunk.forEach((id) => {
          batch.delete(doc(messagesRef, id));
        });
        await batch.commit();
      }
    }

    const keptFromState = (messages || []).filter((message) => !removeIds.includes(message.id));
    // Prefer the partitioned kept list (includes any Firestore-only prefix docs
    // that were present in the merge) but fall back to filtered local state.
    const keptMessages = kept.length || !removeIds.length
      ? kept
      : keptFromState;

    return {
      kept: keptMessages,
      removed,
      pivot: resolvedPivot,
      mode: rewindMode,
    };
  }, [assertCanWrite, authReady, currentChatId, messages, user?.uid]);

  const startNewChat = useCallback(async ({ projectId = null } = {}) => {
    if (!authReady || !user?.uid || auth.currentUser?.uid !== user.uid) return null;
    await assertCanWrite();
    const selectedProjectId = String(projectId || "").trim();
    if (!selectedProjectId) throw createProjectRequiredError();
    const chatId = uuidv4();
    const draftId = uuidv4();
    const payload = {
      title: "New chat",
      activeMode: "agent",
      lifecycle: "draft",
      draftId,
      chatId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      projectId: selectedProjectId,
    };
    const persistedPayload = sanitizeChatWritePayload(payload);
    await setDoc(doc(db, "users", user.uid, "chats", chatId), persistedPayload);
    closeChatSubscriptions();
    setCurrentChatId(chatId);
    setCurrentChatMeta({ id: chatId, ...persistedPayload });
    setMessages([]);
    setActiveMode("agent");
    setTasks([]);
    setCurrentTaskId(null);
    openChatById(chatId);
    return chatId;
  }, [authReady, user?.uid, assertCanWrite, closeChatSubscriptions, openChatById]);

  const updateChatMode = useCallback(async (chatId, mode) => {
    const uid = user?.uid;
    const normalizedMode = normalizeChatMode(mode);

    if (!authReady || !uid || auth.currentUser?.uid !== uid) {
      setActiveMode(normalizedMode);
      return;
    }

    // Update local state immediately for snappy UI
    setActiveMode(normalizedMode);

    if (chatId) {
      try {
        await assertCanWrite();
        await updateDoc(doc(db, "users", uid, "chats", chatId), sanitizeChatWritePayload({
          activeMode: normalizedMode,
          updatedAt: serverTimestamp(),
        }));
      } catch (err) {
        console.error("Failed to update chat mode in Firestore:", err);
        notify?.({ message: err?.message || "Failed to persist chat mode", type: "error" });
      }
    }
  }, [authReady, user?.uid, assertCanWrite, notify]);

  return {
    messages,
    currentChatId,
    currentChatMeta,
    isGenerating,
    pendingMessage,
    generationStage,
    pendingMessages: pendingMessagesForCurrentChat,
    pendingMessagesByChat: pendingMessages,
    generatingRunsByChat: generatingChats,
    generatingChatIds,
    setPendingForChat,
    setStageForChat,
    setGeneratingForChat,
    reconcileCancelledRun,
    persistPendingCancellation,
    assertCanWrite,
    openChatById,
    handleSubmit,
    handleDeleteChat,
    handleRenameChat,
    handleMoveChat,
    handleClearChat,
    rewindTranscript,
    startNewChat,
    setPendingMessage,
    setCurrentChatId,
    setCurrentChatMeta,
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
