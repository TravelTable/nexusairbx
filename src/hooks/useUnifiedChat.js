import { useCallback, useMemo, useRef, useState } from "react";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { BACKEND_URL } from "../config";
import { v4 as uuidv4 } from "uuid";
import { useAiChat } from "./useAiChat";
import {
  orchestrate,
  approveWorkflowPlan,
  checkWorkflowPlanReadiness,
  getChatOperationStatus,
  startPlanExecution,
} from "../lib/workflowApi";
import { isExplicitPlanApproval } from "../lib/planApproval";
import {
  classifyExecutionIntent,
  classifyUserIntent,
  explicitlyDisablesStudioContext,
  isImplementationIntent,
} from "../lib/intentClassifier";
import { applyStreamActivity, createPendingStreamState, getPendingStreamSnapshot } from "../lib/streaming";
import { stageSlug } from "../lib/streamEngagement";
import { resolveGameSpecForPrompt } from "../lib/gameProfile";
import { categorizePrompt, trackProductEvent } from "../lib/productAnalytics";
import { FEATURE_FLAGS } from "../lib/featureFlags";
import { studioPreferencesToRuntime } from "../lib/studioPreferences";
import { getStudioStatus } from "../lib/studioBridgeApi";
import {
  getStudioConnectionType,
  getStudioSessionId,
  selectMcpStudioSession,
  selectPluginStudioSession,
} from "../lib/studioConnection";
import { describeChatAttachments, messageToConversationEntry, normalizeChatAttachments } from "../lib/chatAttachments";
import { normalizeRewindMode, shouldWriteUserMessageAfterRewind } from "../lib/chatTranscriptRewind";
import {
  AgentRuntimeUnavailableError,
  OperationRecoveryPendingError,
  createAgentRunV2,
  getRuntimeCapabilitiesV2,
  normalizeAgentProjection,
  resolveChatAgentProjectionV2,
  selectAgentRuntimeRoute,
} from "../lib/agentRuntimeV2Api";
import { reconcileAssistantTurns } from "../lib/assistantTurnIdentity";
import { getProjectBinding, PROJECT_RESOLUTION_STATES, projectBindingRecoveryMessage } from "../lib/projectBindingsApi";
import {
  sanitizeChatWritePayload,
  sanitizeFirestoreValue,
  sanitizeTranscriptMessagePayload,
} from "../lib/firestorePayloads";

const DRAFT_CHAT_KEY = "__draft__";

function readinessBlockers(value) {
  const payload = value?.payload || value || {};
  const readiness = payload?.readiness || payload?.details || payload;
  if (Array.isArray(readiness?.blockers)) return readiness.blockers;
  if (Array.isArray(readiness?.issues)) {
    return readiness.issues.filter((issue) =>
      ["blocker", "critical", "error"].includes(String(issue?.severity || "").toLowerCase())
    );
  }
  return [];
}

function blockedPlanNotification(planId, value) {
  const blockers = readinessBlockers(value);
  const primary = blockers[0] || {};
  const title = String(primary.title || "Plan needs attention").trim();
  const explanation = String(primary.message || title || "The plan is not ready to execute.").trim();
  const suggestedFix = String(primary.suggestedFix?.label || primary.fix?.label || "").trim();
  const remaining = blockers.length > 1
    ? ` ${blockers.length - 1} more blocking issue${blockers.length === 2 ? "" : "s"} remain.`
    : "";
  return {
    id: `plan-readiness-${String(planId || "current")}`,
    type: "error",
    title,
    message: `${explanation}${suggestedFix ? ` Next: ${suggestedFix}.` : ""}${remaining}`,
    duration: 8000,
  };
}

export function reconcileUnifiedPendingMessages(generationPending = [], orchestrationPending = []) {
  return reconcileAssistantTurns([
    ...(generationPending || []).map((turn) => ({
      turn,
      source: "generation",
    })),
    ...(orchestrationPending || []).map((turn) => ({
      turn,
      source: "orchestration",
    })),
  ]);
}

function chatMessageText(message) {
  for (const value of [message?.content, message?.prompt, message?.explanation]) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function decisionStage(decision) {
  switch (String(decision?.action || "").trim()) {
    case "clarify":
      return "Needs input";
    case "recover":
      return "Recovering";
    case "block":
    case "refuse":
      return "Blocked";
    case "answer":
    case "inspect":
      return "Read-only";
    case "plan":
      return "Planning";
    default:
      return "Starting";
  }
}

function decisionMessage(decision) {
  const nextAction = String(decision?.nextAction || "").trim();
  if (nextAction) return nextAction;
  const reason = Array.isArray(decision?.reasons)
    ? decision.reasons.find((entry) => typeof entry === "string" && entry.trim())
    : null;
  return reason?.trim() || "This request cannot start yet.";
}

async function resolveStudioContextSession(studioEnabled) {
  if (!studioEnabled) {
    return { studioSessionId: null, studioConnectionType: null };
  }
  const studioStatus = await getStudioStatus();
  const sessions = studioStatus.sessions || [];
  const activeSession =
    selectMcpStudioSession(sessions, { capability: "readProject" }) ||
    selectPluginStudioSession(sessions, { compatibleOnly: true });
  return {
    studioSessionId: getStudioSessionId(activeSession),
    studioConnectionType: activeSession ? getStudioConnectionType(activeSession) : null,
  };
}

/**
 * A short approval such as "just start" is executable only when it can inherit
 * a concrete earlier request. Keep the terse user turn in the transcript, but
 * give both runtimes the actual task so they cannot lose it during handoff.
 */
export function resolveImplementationPrompt(prompt, messages = []) {
  const normalizedPrompt = String(prompt || "").trim();
  if (!normalizedPrompt || !isExplicitPlanApproval(normalizedPrompt)) {
    return normalizedPrompt;
  }
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role !== "user") continue;
    const candidate = chatMessageText(message);
    if (!candidate || isExplicitPlanApproval(candidate)) continue;
    if (!isImplementationIntent(classifyUserIntent(candidate))) continue;
    return [
      "Implement the following request now. Infer safe defaults instead of asking optional questions:",
      candidate,
    ].join("\n\n");
  }
  return normalizedPrompt;
}

/**
 * Resolve a chat/message project id for planning and generation.
 * Stale or deleted bindings soft-miss to null so orchestrate can continue
 * without a project instead of hard-failing OWNERSHIP_MISMATCH.
 */
async function resolveOwnedProjectId(projectId) {
  const normalizedProjectId = String(projectId || "").trim();
  if (!normalizedProjectId) {
    return { projectId: null, resolution: null, recoveryMessage: null };
  }
  const resolution = await getProjectBinding(normalizedProjectId);
  if (resolution?.state === PROJECT_RESOLUTION_STATES.MISSING) {
    return {
      projectId: null,
      resolution,
      recoveryMessage: null,
      clearedStaleProjectId: normalizedProjectId,
    };
  }
  return {
    projectId: normalizedProjectId,
    resolution,
    recoveryMessage: projectBindingRecoveryMessage(resolution),
  };
}

function seedOrchestrationStream(stage = "Understanding your task...") {
  return applyStreamActivity(createPendingStreamState(), {
    type: "stage",
    text: stage,
    status: stage,
  });
}

function buildOrchestrationPending(state, stage, metadata = {}) {
  return {
    role: "assistant",
    content: "",
    stage,
    streamState: getPendingStreamSnapshot(state),
    ...metadata,
  };
}

function buildRuntimeSettings(settings = {}, gameSpec = null) {
  const studioRuntime = studioPreferencesToRuntime(settings);
  const normalized = {
    modelVersion: String(settings?.modelVersion || ""),
    creativity: Number.isFinite(Number(settings?.creativity)) ? Number(settings.creativity) : 0.7,
    codeStyle: String(settings?.codeStyle || "optimized"),
    verbosity: String(settings?.verbosity || "concise"),
    codingStandards: String(settings?.codingStandards || ""),
    gameSpec: String(gameSpec || ""),
    enableGameWizard: settings?.enableGameWizard !== false,
    showThinking: settings?.showThinking !== false,
    studioAutoPushEnabled: studioRuntime.autoPushToStudio,
    studioAutoPushPolicy: studioRuntime.autoPushPolicy,
    studioApplyPolicy: studioRuntime.applyPolicy,
    studioValidationMode: studioRuntime.validationMode,
    studioSafetyMode: studioRuntime.safetyMode,
    robloxAssetUploadsEnabled: settings?.robloxAssetUploadsEnabled === true,
    allowPlaceholderAssets: settings?.allowPlaceholderAssets === true,
    useExamples: settings?.useExamples === true,
  };
  if (Array.isArray(settings?.selectedExampleIds)) {
    normalized.selectedExampleIds = settings.selectedExampleIds.map(String).slice(0, 12);
  }
  return normalized;
}

function normalizeApprovedPlanReference(value) {
  if (!value || typeof value !== "object") return null;
  const planId = String(value.planId || "").trim();
  const hash = String(value.hash || value.planHash || "").trim();
  const version = Number(value.version);
  if (!planId || !hash || !Number.isInteger(version) || version < 1) return null;
  return { planId, version, hash };
}

function buildWorkflowTargeting(submissionOptions = {}, fallbackTargeting = {}) {
  const supplied =
    submissionOptions?.targeting && typeof submissionOptions.targeting === "object" ? submissionOptions.targeting : {};
  const fallback = fallbackTargeting && typeof fallbackTargeting === "object" ? fallbackTargeting : {};
  const projectId = submissionOptions?.projectId ?? supplied.projectId ?? fallback.projectId ?? null;
  const studioConnected =
    submissionOptions?.studioConnected ?? supplied.studioConnected ?? fallback.studioConnected ?? false;
  return {
    projectId: projectId == null || projectId === "" ? null : String(projectId),
    studioConnected: Boolean(studioConnected),
  };
}

function runtimeAutoPushPolicy(settings = {}) {
  return studioPreferencesToRuntime(settings).autoPushPolicy;
}

function isLegacyRuntimeOwnershipError(error) {
  return (
    error?.status === 503 &&
    error?.payload?.code === "CAPABILITY_UNSUPPORTED" &&
    error?.payload?.details?.runtimeOwner === "legacy_agent_adapter"
  );
}

function isAbortError(error) {
  return error?.name === "AbortError" || error?.code === "ABORT_ERR";
}

function isOutcomeUnknownError(error) {
  return error?.outcomeUnknown === true
    || String(error?.category || "").toLowerCase() === "outcome_unknown"
    || String(error?.code || "").toUpperCase() === "OPERATION_RECOVERY_PENDING";
}

const EXPECTED_USER_ACTION_ERROR_CODES = new Set([
  "PROJECT_REQUIRED",
  "STUDIO_LIVE_RUNTIME_REQUIRED",
]);

function isExpectedUserActionError(error) {
  return EXPECTED_USER_ACTION_ERROR_CODES.has(String(error?.code || "").trim());
}

function throwIfAborted(signal) {
  if (!signal?.aborted) return;
  const error = new Error("Generation canceled.");
  error.name = "AbortError";
  error.code = "ABORT_ERR";
  throw error;
}

/**
 * Linear product loop for the code-first /ai workspace:
 *   Task -> Orchestrate (Clarify OR Plan) -> Approve -> Generate multi-file artifact -> Review -> Refine
 *
 * handleSubmit only ever orchestrates. Generation is triggered exclusively by
 * approving a plan, which now ALWAYS runs the artifact job worker (script,
 * project, and ui all produce a normalized multi-file Roblox artifact).
 */
export function useUnifiedChat(user, settings, refreshBilling, notify, options = {}) {
  const { onSignInNudge, authReady = true } = options;
  const effectiveGameSpec = useMemo(() => resolveGameSpecForPrompt(settings?.gameSpec), [settings?.gameSpec]);

  const chat = useAiChat(user, settings, refreshBilling, notify, { authReady });

  // The pre-generation "flow" phase (orchestration / Ask streaming) is tracked
  // per originating chat, mirroring how useAiChat scopes the generation phase.
  const [flowBusyChats, setFlowBusyChats] = useState({}); // chatId -> requestId -> bool
  const [orchestrationPendingByChat, setOrchestrationPendingByChat] = useState({}); // chatId -> requestId -> pending
  const orchestrationStreamRef = useRef({});
  const submitLocksRef = useRef({});
  const flowAbortControllersRef = useRef({});
  const setFlowBusyForChat = useCallback((chatId, requestId, value) => {
    if (!chatId) return;
    setFlowBusyChats((prev) => {
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

  const currentFlowChatKey = chat.currentChatId || DRAFT_CHAT_KEY;
  const flowBusy = Object.values(flowBusyChats[currentFlowChatKey] || {}).some(Boolean);

  const publishOrchestrationStage = useCallback((chatId, requestId, label) => {
    if (!chatId || !label) return;
    const streamKey = `${chatId}:${requestId}`;
    orchestrationStreamRef.current[streamKey] = applyStreamActivity(
      orchestrationStreamRef.current[streamKey] || createPendingStreamState(),
      {
        id: `stage-${stageSlug(label)}`,
        type: "stage",
        text: label,
        status: label,
      }
    );
    setOrchestrationPendingByChat((prev) => ({
      ...prev,
      [chatId]: {
        ...(prev[chatId] || {}),
        [requestId]: buildOrchestrationPending(orchestrationStreamRef.current[streamKey], label, {
          requestId,
          prompt: prev[chatId]?.[requestId]?.prompt,
        }),
      },
    }));
  }, []);

  const beginOrchestrationPending = useCallback((chatId, requestId, prompt = "", stage = "Understanding your task...") => {
    const state = seedOrchestrationStream(stage);
    orchestrationStreamRef.current[`${chatId}:${requestId}`] = state;
    setOrchestrationPendingByChat((prev) => ({
      ...prev,
      [chatId]: {
        ...(prev[chatId] || {}),
        [requestId]: buildOrchestrationPending(state, stage, {
          requestId,
          prompt,
        }),
      },
    }));
  }, []);

  const clearOrchestrationPending = useCallback((chatId, requestId) => {
    if (!chatId) return;
    delete orchestrationStreamRef.current[`${chatId}:${requestId}`];
    setOrchestrationPendingByChat((prev) => {
      if (!prev[chatId]?.[requestId]) return prev;
      const chatPending = { ...prev[chatId] };
      delete chatPending[requestId];
      const result = { ...prev };
      if (Object.keys(chatPending).length) result[chatId] = chatPending;
      else delete result[chatId];
      return result;
    });
  }, []);

  const moveFlowUiToChat = useCallback((fromChatId, toChatId, requestId) => {
    if (!fromChatId || !toChatId || fromChatId === toChatId) return;
    const fromStreamKey = `${fromChatId}:${requestId}`;
    const toStreamKey = `${toChatId}:${requestId}`;
    if (orchestrationStreamRef.current[fromStreamKey]) {
      orchestrationStreamRef.current[toStreamKey] = orchestrationStreamRef.current[fromStreamKey];
      delete orchestrationStreamRef.current[fromStreamKey];
    }
    setFlowBusyChats((prev) => {
      const sourceRuns = prev[fromChatId] || {};
      if (!sourceRuns[requestId]) return prev;
      const nextSourceRuns = { ...sourceRuns };
      delete nextSourceRuns[requestId];
      const next = {
        ...prev,
        [toChatId]: {
          ...(prev[toChatId] || {}),
          [requestId]: true,
        },
      };
      if (Object.keys(nextSourceRuns).length) next[fromChatId] = nextSourceRuns;
      else delete next[fromChatId];
      return next;
    });
    setOrchestrationPendingByChat((prev) => {
      const pending = prev[fromChatId]?.[requestId];
      if (!pending) return prev;
      const sourcePending = { ...(prev[fromChatId] || {}) };
      delete sourcePending[requestId];
      const next = {
        ...prev,
        [toChatId]: {
          ...(prev[toChatId] || {}),
          [requestId]: pending,
        },
      };
      if (Object.keys(sourcePending).length) next[fromChatId] = sourcePending;
      else delete next[fromChatId];
      return next;
    });
  }, []);

  const createFlowAbortController = useCallback((chatId, requestId, externalSignal = null) => {
    const controller = new AbortController();
    const abortFromExternal = () => controller.abort();
    if (externalSignal?.aborted) controller.abort();
    else
      externalSignal?.addEventListener?.("abort", abortFromExternal, {
        once: true,
      });
    flowAbortControllersRef.current[`${chatId}:${requestId}`] = {
      chatId,
      requestId,
      controller,
      externalSignal,
      abortFromExternal,
    };
    return controller;
  }, []);

  const releaseFlowAbortController = useCallback((chatId, requestId) => {
    const flow = flowAbortControllersRef.current[`${chatId}:${requestId}`];
    flow?.externalSignal?.removeEventListener?.("abort", flow.abortFromExternal);
    delete flowAbortControllersRef.current[`${chatId}:${requestId}`];
  }, []);

  const cancelCurrentFlow = useCallback(() => {
    const currentChatId = chat.currentChatId || DRAFT_CHAT_KEY;
    const activeFlows = Object.values(flowAbortControllersRef.current).filter((flow) => flow.chatId === currentChatId);
    activeFlows.forEach(({ chatId, requestId, controller }) => {
      controller.abort();
      delete flowAbortControllersRef.current[`${chatId}:${requestId}`];
      setFlowBusyForChat(chatId, requestId, false);
      clearOrchestrationPending(chatId, requestId);
      if (chatId !== DRAFT_CHAT_KEY) chat.setPendingForChat(chatId, null, requestId);
    });
    return activeFlows.length > 0;
  }, [chat, clearOrchestrationPending, setFlowBusyForChat]);

  const isGenerating = chat.isGenerating || flowBusy;

  const pendingMessages = useMemo(
    () =>
      reconcileUnifiedPendingMessages(
        chat.pendingMessages,
        Object.values(orchestrationPendingByChat[currentFlowChatKey] || {}).filter(Boolean)
      ),
    [chat.pendingMessages, currentFlowChatKey, orchestrationPendingByChat]
  );
  const pendingMessage = pendingMessages[pendingMessages.length - 1] || null;

  const generationStage = useMemo(() => {
    if (chat.generationStage) return chat.generationStage;
    if (flowBusy) {
      return pendingMessage?.stage || "Understanding your task...";
    }
    return "";
  }, [chat.generationStage, flowBusy, pendingMessage?.stage]);

  // Chats with any in-flight work (orchestration or generation) — for sidebar badges.
  const generatingChatIds = useMemo(() => {
    const set = new Set(chat.generatingChatIds || []);
    Object.keys(flowBusyChats).forEach((id) => {
      if (id !== DRAFT_CHAT_KEY && Object.values(flowBusyChats[id] || {}).some(Boolean)) set.add(id);
    });
    return Array.from(set);
  }, [chat.generatingChatIds, flowBusyChats]);

  // Ensure a chat exists, returning its id (creating + opening if needed).
  const ensureChat = useCallback(
    async (titleSeed, { projectId = null } = {}) => {
      let activeChatId = chat.currentChatId;
      if (!activeChatId) {
        activeChatId = await chat.startNewChat({ projectId });
        const seed = String(titleSeed || "New chat");
        if (activeChatId && seed !== "New chat") {
          await updateDoc(
            doc(db, "users", user.uid, "chats", activeChatId),
            sanitizeChatWritePayload({
              title: seed.slice(0, 30) + (seed.length > 30 ? "..." : ""),
              lifecycle: "active",
              updatedAt: serverTimestamp(),
            })
          );
        }
      }
      return activeChatId;
    },
    [chat, user]
  );

  const touchChat = useCallback(
    async (activeChatId, lastMessage) => {
      try {
        await updateDoc(
          doc(db, "users", user.uid, "chats", activeChatId),
          sanitizeChatWritePayload({
            lastMessage: String(lastMessage || "").slice(0, 140),
            updatedAt: serverTimestamp(),
          })
        );
      } catch (_) {
        // non-fatal: the message itself is already written
      }
    },
    [user]
  );

  const writeUserMessage = useCallback(
    async (activeChatId, requestId, content, attachments = []) => {
      const normalizedAttachments = normalizeChatAttachments(attachments);
      const displayContent = content || describeChatAttachments(normalizedAttachments) || "Attached file(s)";
      await setDoc(
        doc(db, "users", user.uid, "chats", activeChatId, "messages", `${requestId}-user`),
        sanitizeTranscriptMessagePayload({
          role: "user",
          content: displayContent,
          ...(normalizedAttachments.length ? { attachments: normalizedAttachments } : {}),
          createdAt: serverTimestamp(),
          requestId,
        })
      );
      await touchChat(activeChatId, displayContent);
    },
    [user, touchChat]
  );

  const ensureRuntimeAgentProjection = useCallback(
    async (activeChatId, submitOptions = {}, { required = false } = {}) => {
      try {
        const projectId = submitOptions.projectId || null;
        let capabilities = null;
        try {
          capabilities = await getRuntimeCapabilitiesV2();
        } catch (error) {
          if (!(error instanceof AgentRuntimeUnavailableError)) throw error;
        }
        if (selectAgentRuntimeRoute(capabilities, { projectId }) === "legacy") {
          return null;
        }
        const storedAgentId = chat.currentChatId === activeChatId ? chat.currentChatMeta?.agentId : null;
        const resolved = await resolveChatAgentProjectionV2({
          chatId: activeChatId,
          projectId,
          storedAgentId,
          allowLegacyCreate: capabilities == null,
        });
        const agent = normalizeAgentProjection(resolved);
        if (!agent?.agentId) throw new Error("Agent runtime did not return an agent id");
        return agent;
      } catch (error) {
        console.warn("Could not refresh the v2 agent projection.", error);
        if (required) throw error;
        return null;
      }
    },
    [chat.currentChatId, chat.currentChatMeta?.agentId]
  );

  const persistLaunchCheckpoint = useCallback(
    async ({
      activeChatId,
      requestId,
      operationId,
      launchOperationId,
      agentId,
      mode,
      stage,
      runId = null,
    }) => {
      if (!user?.uid || !activeChatId || !requestId) return;
      const ref = doc(
        db,
        "users",
        user.uid,
        "chats",
        activeChatId,
        "messages",
        `${requestId}-assistant`
      );
      const existing = await getDoc(ref);
      const metadata = {
        mode,
        type: null,
        runState: runId ? "planning" : "launching",
        launchRecoveryVersion: 1,
      };
      await setDoc(
        ref,
        sanitizeTranscriptMessagePayload({
          role: "assistant",
          content: "",
          pending: true,
          stage: stage || (runId ? "Planning..." : "Starting durable run..."),
          requestId,
          operationId,
          launchOperationId,
          agentId,
          ...(runId ? { runId } : {}),
          ...(existing.exists() ? {} : { createdAt: serverTimestamp() }),
          updatedAt: serverTimestamp(),
          metadata,
        }),
        { merge: true }
      );
    },
    [user?.uid]
  );

  const launchAuthoritativeRun = useCallback(
    async ({
      activeChatId,
      requestId,
      prompt,
      mode,
      attachments = [],
      baseArtifact = null,
      submissionOptions = {},
      conversationMessages = null,
      signal = null,
      onRunId = null,
    }) => {
      throwIfAborted(signal);
      let capabilities = null;
      try {
        capabilities = await getRuntimeCapabilitiesV2();
      } catch (error) {
        if (!(error instanceof AgentRuntimeUnavailableError)) throw error;
      }
      throwIfAborted(signal);
      const runtimeRoute = selectAgentRuntimeRoute(capabilities, {
        projectId: submissionOptions.projectId,
      });
      const studioRuntime = studioPreferencesToRuntime(settings);
      const targeting = buildWorkflowTargeting(submissionOptions);
      const studioEnabled = studioRuntime.studioEnabled && targeting.studioConnected;
      const executionIntent = classifyExecutionIntent(prompt, {
        studioEnabled,
        generatorMode: submissionOptions.generatorMode || "agent_build",
      });
      const requiresLiveRuntime = ["inspect", "live_build", "live_fix", "playtest", "quick_script"].includes(
        executionIntent
      );
      const launchLegacyGeneration = () => {
        if (requiresLiveRuntime) {
          const error = new Error(
            "This request requires the live Studio command runtime. NexusRBX will not replace it with a generated artifact."
          );
          error.code = "STUDIO_LIVE_RUNTIME_REQUIRED";
          error.executionIntent = executionIntent;
          throw error;
        }
        if (capabilities && capabilities.legacyGeneration?.enabled !== true) {
          throw new Error("No executable generation transport is currently available.");
        }
        const legacySubmissionOptions = { ...submissionOptions };
        delete legacySubmissionOptions.authoritativeRun;
        delete legacySubmissionOptions.authoritativeSignal;
        return chat.handleSubmit(
          prompt,
          activeChatId,
          requestId,
          mode === "debug" ? "debug" : "agent",
          true,
          attachments,
          baseArtifact,
          legacySubmissionOptions
        );
      };
      if (runtimeRoute === "legacy") return launchLegacyGeneration();

      const agent = await ensureRuntimeAgentProjection(activeChatId, submissionOptions, { required: true });
      throwIfAborted(signal);
      if (!agent) return launchLegacyGeneration();
      const operationId = String(
        submissionOptions.operationId || submissionOptions.idempotencyKey || requestId
      ).trim();
      const launchOperationId = `${operationId}:agent`;
      const autoPushToStudio = studioEnabled && studioRuntime.autoPushToStudio;
      const approvedPlan = normalizeApprovedPlanReference(submissionOptions.approvedPlan);
      let runtimeEnvelope;
      try {
        throwIfAborted(signal);
        await persistLaunchCheckpoint({
          activeChatId,
          requestId,
          operationId,
          launchOperationId,
          agentId: agent.agentId,
          mode,
          stage: "Starting durable run...",
        });
        runtimeEnvelope = await createAgentRunV2({
          chatId: activeChatId,
          agentId: agent.agentId,
          idempotencyKey: launchOperationId,
          signal,
          prompt,
          mode,
          projectId: submissionOptions.projectId || agent.projectId,
          attachments: normalizeChatAttachments(attachments),
          settings: buildRuntimeSettings(settings, effectiveGameSpec),
          conversation: (conversationMessages || chat.messages || [])
            .slice(-10)
            .map(messageToConversationEntry)
            .filter(Boolean),
          baseArtifact: baseArtifact || null,
          ...(submissionOptions.isRefinement ? { isRefinement: true } : {}),
          ...(submissionOptions.baseArtifactRef ? { baseArtifactRef: submissionOptions.baseArtifactRef } : {}),
          ...(submissionOptions.parentJobId ? { parentJobId: submissionOptions.parentJobId } : {}),
          generatorMode: "agent_build",
          executionIntent,
          studioEnabled,
          applyMode: studioRuntime.applyMode,
          routingMode: studioEnabled ? "hybrid" : "cloud",
          autoPushToStudio,
          autoPushPolicy: runtimeAutoPushPolicy(settings),
          targeting,
          ...(approvedPlan ? { approvedPlan } : {}),
          chatMode: mode === "debug" ? "debug" : "agent",
          selectedExampleIds: Array.isArray(submissionOptions.selectedExampleIds)
            ? submissionOptions.selectedExampleIds
            : [],
          showPlan: submissionOptions.showPlan === true,
        });
        // The server may accept and create the durable run while the user is
        // clicking Stop. Publish its authoritative id before honoring the local
        // abort so the coordinator can deliver the retained cancellation intent
        // instead of orphaning a live run behind a stopped composer.
        const authoritativeRunId = runtimeEnvelope?.run?.runId || null;
        if (authoritativeRunId) {
          onRunId?.(authoritativeRunId);
          await persistLaunchCheckpoint({
            activeChatId,
            requestId,
            operationId,
            launchOperationId,
            agentId: agent.agentId,
            mode,
            runId: authoritativeRunId,
            stage: runtimeEnvelope?.run?.status === "planning" ? "Planning..." : "Starting run...",
          });
        }
        throwIfAborted(signal);
      } catch (error) {
        if (
          (typeof OperationRecoveryPendingError === "function"
            && error instanceof OperationRecoveryPendingError)
          || error?.code === "OPERATION_RECOVERY_PENDING"
        ) {
          await persistLaunchCheckpoint({
            activeChatId,
            requestId,
            operationId,
            launchOperationId,
            agentId: agent.agentId,
            mode,
            stage: "Reconnecting to the accepted run...",
          });
          notify?.({
            type: "info",
            message: "The run may already be starting. Nexus is reconnecting instead of launching it again.",
          });
          return {
            ok: true,
            pending: true,
            operationPending: true,
            operationId: launchOperationId,
            agentId: agent.agentId,
          };
        }
        if (!FEATURE_FLAGS.legacyAgentFallback || !isLegacyRuntimeOwnershipError(error)) {
          throw error;
        }

        return launchLegacyGeneration();
      }
      if (runtimeEnvelope?.operationPending === true) {
        return runtimeEnvelope;
      }
      if (!runtimeEnvelope?.run?.runId) {
        const decision = runtimeEnvelope?.decision || null;
        if (!decision) {
          throw new Error("The durable agent runtime did not return a decision.");
        }
        const content = decisionMessage(decision);
        await setDoc(
          doc(db, "users", user.uid, "chats", activeChatId, "messages", `${requestId}-assistant`),
          sanitizeTranscriptMessagePayload({
            role: "assistant",
            content,
            explanation: content,
            stage: decisionStage(decision),
            pending: false,
            requestId,
            decision,
            executionDisposition: runtimeEnvelope.executionDisposition || null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            metadata: {
              mode: decision.effectiveMode || mode,
              type: "decision",
            },
          }),
          { merge: true }
        );
        await touchChat(activeChatId, content);
        return runtimeEnvelope;
      }
      await chat.handleSubmit(
        prompt,
        activeChatId,
        requestId,
        mode === "debug" ? "debug" : "agent",
        true,
        attachments,
        baseArtifact,
        {
          ...submissionOptions,
          authoritativeRun: runtimeEnvelope,
          authoritativeSignal: signal,
        }
      );
      return runtimeEnvelope;
    },
    [chat, effectiveGameSpec, ensureRuntimeAgentProjection, notify, persistLaunchCheckpoint, settings, touchChat, user]
  );

  const writeOrchestrationResult = useCallback(
    async (activeChatId, requestId, decision, originPrompt, attachments, submissionContext = {}) => {
      const attMeta = normalizeChatAttachments(attachments);
      const structuredPlanCandidate =
        decision?.structuredPlan || decision?.plan?.structuredPlan || decision?.plan || null;
      const structuredPlan =
        structuredPlanCandidate &&
        typeof structuredPlanCandidate === "object" &&
        !Array.isArray(structuredPlanCandidate)
          ? structuredPlanCandidate
          : null;
      const planTargeting =
        structuredPlan?.targeting && typeof structuredPlan.targeting === "object" ? structuredPlan.targeting : {};
      const targeting = buildWorkflowTargeting(
        {
          targeting: decision?.targeting || planTargeting,
          projectId: decision?.projectId ?? planTargeting.projectId ?? submissionContext.projectId,
          studioConnected:
            decision?.studioConnected ?? planTargeting.studioConnected ?? submissionContext.studioConnected,
        },
        buildWorkflowTargeting(submissionContext)
      );
      const decisionEnvelope = decision?.decision || decision?.chatDecision || null;

      if (decision.status === "conversation") {
        const text = decision.message || "";
        await setDoc(
          doc(db, "users", user.uid, "chats", activeChatId, "messages", `${requestId}-assistant`),
          sanitizeTranscriptMessagePayload({
            role: "assistant",
            stage: "conversation",
            intent: decision.intent || null,
            content: text,
            explanation: text,
            ...(decisionEnvelope ? { decision: decisionEnvelope } : {}),
            createdAt: serverTimestamp(),
            requestId,
            ...(decisionEnvelope ? { decision: decisionEnvelope } : {}),
          })
        );
        await touchChat(activeChatId, text || "Conversation");
        return;
      }

      if (decision.status === "needs_clarification") {
        void trackProductEvent(
          "clarification_requested",
          {
            generator_mode: chat.activeMode || "agent",
            prompt_category: categorizePrompt(originPrompt),
            attachment_count: attachments?.length || 0,
          },
          { dedupeKey: `clarify:${activeChatId}:${requestId}` }
        );
        await setDoc(
          doc(db, "users", user.uid, "chats", activeChatId, "messages", `${requestId}-clarify`),
          sanitizeTranscriptMessagePayload({
            role: "assistant",
            stage: "clarify",
            questions: decision.questions || [],
            originPrompt,
            attachments: attMeta,
            projectId: targeting.projectId,
            studioConnected: targeting.studioConnected,
            targeting,
            requestMode: submissionContext.mode || "plan",
            templateId: decision.templateId || submissionContext.templateId || null,
            createdAt: serverTimestamp(),
            requestId,
          })
        );
        await touchChat(activeChatId, "Needs a few details…");
        return;
      }

      await setDoc(
        doc(db, "users", user.uid, "chats", activeChatId, "messages", `${requestId}-plan`),
        sanitizeTranscriptMessagePayload({
          role: "assistant",
          stage: "plan",
          planId: decision.planId,
          planVersion: decision.planVersion || 1,
          planHash: decision.planHash || "",
          classification: decision.classification || "script",
          aiSummary: decision.aiSummary || "",
          aiSteps: Array.isArray(decision.aiSteps) ? decision.aiSteps : [],
          aiAssumptions: Array.isArray(decision.aiAssumptions) ? decision.aiAssumptions : [],
          planMarkdown: decision.planMarkdown || "",
          planSteps: Array.isArray(decision.planSteps) ? decision.planSteps : [],
          structuredPlan,
          capabilities: Array.isArray(decision.capabilities)
            ? decision.capabilities
            : Array.isArray(structuredPlan?.capabilities)
              ? structuredPlan.capabilities
              : [],
          clarificationAnswers: decision.clarificationAnswers || structuredPlan?.clarificationAnswers || null,
          templateId: decision.templateId || structuredPlan?.templateId || submissionContext.templateId || null,
          projectId: targeting.projectId,
          studioConnected: targeting.studioConnected,
          targeting,
          originPrompt,
          attachments: attMeta,
          ...(decisionEnvelope ? { decision: decisionEnvelope } : {}),
          createdAt: serverTimestamp(),
          requestId,
        })
      );
      void trackProductEvent(
        "plan_displayed",
        {
          generator_mode: chat.activeMode || "agent",
          output_type: decision.classification || "script",
          prompt_category: categorizePrompt(originPrompt),
        },
        {
          dedupeKey: `plan:${activeChatId}:${requestId}:${decision.planId || ""}`,
        }
      );
      await touchChat(activeChatId, decision.aiSummary || "Build plan ready");
    },
    [user, touchChat, chat.activeMode]
  );

  // Dispatch generation for an approved plan. The backend owns the sole
  // canonical agent -> act mapping at its execution boundary.
  const runGeneration = useCallback(
    async (activeChatId, classification, prompt, attachments, baseArtifact = null, submissionOptions = {}) => {
      const requestId = uuidv4();
      const flowController = createFlowAbortController(activeChatId, requestId);
      try {
        await launchAuthoritativeRun({
          activeChatId,
          requestId,
          prompt,
          mode: "agent",
          attachments,
          baseArtifact,
          submissionOptions,
          signal: flowController.signal,
        });
      } finally {
        releaseFlowAbortController(activeChatId, requestId);
      }
    },
    [createFlowAbortController, launchAuthoritativeRun, releaseFlowAbortController]
  );

  const approvePlanInternal = useCallback(
    async (message, baseArtifact = null, submissionOptions = {}) => {
      if (!user || !message?.planId) return;
      const activeChatId = chat.currentChatId;
      if (!activeChatId) return;
      await chat.assertCanWrite();

      const ownedProject = await resolveOwnedProjectId(
        submissionOptions.projectId || message.projectId || message.targeting?.projectId
      );
      if (ownedProject.recoveryMessage) {
        notify?.({ message: ownedProject.recoveryMessage, type: "info" });
      }
      const effectiveSubmissionOptions = {
        ...submissionOptions,
        projectId: ownedProject.projectId,
      };

      const version = message.planVersion ?? message.version ?? message.structuredPlan?.version ?? 1;
      const planHash = message.planHash || message.hash || message.structuredPlan?.hash || undefined;

      if (FEATURE_FLAGS.newPlanningMode) {
        const readiness = await checkWorkflowPlanReadiness(message.planId, {
          version,
          hash: planHash,
          projectId: effectiveSubmissionOptions.projectId,
          studioConnected: Boolean(message.targeting?.studioConnected),
          targeting: {
            projectId: effectiveSubmissionOptions.projectId,
            studioConnected: Boolean(message.targeting?.studioConnected),
          },
        });
        const blockers = readinessBlockers(readiness);
        if (readiness?.canExecute === false || readiness?.ready === false || blockers.length > 0) {
          notify?.(blockedPlanNotification(message.planId, readiness));
          return { blocked: true, readiness };
        }

        let execution;
        try {
          execution = await startPlanExecution(message.planId, version, planHash);
        } catch (error) {
          if (error?.code === "PLAN_NOT_READY") {
            notify?.(blockedPlanNotification(message.planId, error));
            return { blocked: true, readiness: error?.payload?.details || null };
          }
          throw error;
        }
        const executionStatus =
          String(
            execution?.status ||
            execution?.plan?.status ||
            execution?.lifecycle?.run?.status ||
            ""
          )
            .trim()
            .toLowerCase();

        if (
          executionStatus === "failed" ||
          executionStatus === "cancelled"
        ) {
          const error = new Error(
            executionStatus === "failed"
              ? "The plan execution failed before Nexus could attach a canonical task."
              : "The plan execution was cancelled."
          );

          error.code =
            executionStatus === "failed"
              ? "PLAN_EXECUTION_FAILED"
              : "PLAN_EXECUTION_CANCELLED";

          error.execution =
            execution;

          throw error;
        }

        // Only accept an actual Task identity.
        // Never reinterpret a plan lifecycle runId as taskId.
        const task =
          execution?.task ||
          execution?.execution?.task ||
          null;

        const taskId =
          task?.taskId ||
          task?.id ||
          execution?.taskId ||
          execution?.execution?.taskId ||
          "";

        if (!taskId) {
          const error = new Error(
            "NexusRBX did not return a canonical execution task."
          );

          error.code =
            "PLAN_EXECUTION_TASK_MISSING";

          error.details = {
            executionRunId:
              execution?.execution?.runId ||
              execution?.lifecycle?.run?.runId ||
              null,

            status:
              executionStatus || null,
          };

          error.execution =
            execution;

          throw error;
        }
        effectiveSubmissionOptions.onTaskAccepted?.(task || taskId);
        void trackProductEvent(
          "plan_approved",
          {
            generator_mode: chat.activeMode || "agent",
            output_type: message.classification || "script",
            prompt_category: categorizePrompt(message.originPrompt || ""),
          },
          {
            dedupeKey: `plan_approved:${message.planId}:${version}:${planHash || ""}`,
          }
        );
        try {
          await updateDoc(
            doc(db, "users", user.uid, "chats", activeChatId, "messages", message.id),
            sanitizeTranscriptMessagePayload({
              stage: "plan_approved",
              taskId,
              updatedAt: serverTimestamp(),
            })
          );
        } catch (error) {
          console.warn("Could not persist the structured-plan execution marker.", error);
        }
        return execution;
      }

      const approval = await approveWorkflowPlan(message.planId, {
        version,
        hash: planHash,
      });
      void trackProductEvent(
        "plan_approved",
        {
          generator_mode: chat.activeMode || "agent",
          output_type: message.classification || "script",
          prompt_category: categorizePrompt(message.originPrompt || ""),
        },
        { dedupeKey: `plan_approved:${message.planId}` }
      );
      // The server approval is authoritative. Persisting this UI marker is
      // useful, but must not prevent generation when an older deployed ruleset
      // rejects an otherwise valid transcript update.
      try {
        await updateDoc(
          doc(db, "users", user.uid, "chats", activeChatId, "messages", message.id),
          sanitizeTranscriptMessagePayload({
            stage: "plan_approved",
            updatedAt: serverTimestamp(),
          })
        );
      } catch (error) {
        console.warn("Could not persist approved-plan marker; continuing with generation.", error);
      }
      await runGeneration(
        activeChatId,
        message.classification || "script",
        message.originPrompt || "",
        message.attachments || [],
        baseArtifact,
        {
          ...effectiveSubmissionOptions,
          approvedPlan: approval.approvedPlan || {
            planId: message.planId,
            version,
            hash: planHash || "",
          },
        }
      );
      return approval;
    },
    [user, chat, runGeneration, notify]
  );

  // ASK mode: read-only conversational streaming. No orchestrate, no plan, no job.
  const handleAskSubmit = useCallback(
    async (
      prompt,
      attachments,
      activeChatId,
      requestId,
      signal,
      conversationMessages = null,
      idempotencyKey = requestId,
      submissionOptions = {}
    ) => {
      throwIfAborted(signal);
      const token = await user.getIdToken();
      throwIfAborted(signal);
      const normalizedAttachments = normalizeChatAttachments(attachments);
      const requestPrompt =
        prompt || describeChatAttachments(normalizedAttachments) || "Please review the attached file(s).";
      chat.setPendingForChat(
        activeChatId,
        {
          role: "assistant",
          content: "",
          type: "chat",
          prompt: requestPrompt,
          stage: "Thinking...",
        },
        requestId
      );

      const studioEnabled =
        FEATURE_FLAGS.unifiedAgent && !explicitlyDisablesStudioContext(requestPrompt);
      let studioSessionId = null;
      let studioConnectionType = null;
      if (studioEnabled) {
        try {
          const studioTarget = await resolveStudioContextSession(studioEnabled);
          studioSessionId = studioTarget.studioSessionId;
          studioConnectionType = studioTarget.studioConnectionType;
          if (studioSessionId) {
            chat.setPendingForChat(
              activeChatId,
              (prev) => (prev ? { ...prev, stage: "Reading Studio project..." } : prev),
              requestId
            );
          }
        } catch (_) {
          /* non-fatal: Ask still works without Studio */
        }
      }

      const conversationSource = Array.isArray(conversationMessages) ? conversationMessages : chat.messages || [];
      let full = "";
      try {
        const res = await fetch(`${BACKEND_URL}/api/ai/chat`, {
          method: "POST",
          signal,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "Idempotency-Key": String(idempotencyKey),
          },
          body: JSON.stringify({
            chatId: activeChatId,
            projectId: String(submissionOptions?.projectId || "").trim() || null,
            prompt: requestPrompt,
            attachments: normalizedAttachments,
            modelVersion: settings?.modelVersion || "",
            gameSpec: effectiveGameSpec,
            conversation: conversationSource.slice(-10).map(messageToConversationEntry).filter(Boolean),
            studioEnabled: studioEnabled && Boolean(studioSessionId),
            studioSessionId,
            studioConnectionType,
          }),
        });
        if (!res.ok || !res.body) {
          const text = await res.text().catch(() => "");
          throw new Error(text || "Ask request failed");
        }
        if (res.status === 202) {
          await res.json().catch(() => ({}));
          let operation = null;
          while (!operation || operation.status === "in_progress") {
            throwIfAborted(signal);
            await new Promise((resolve, reject) => {
              const timer = window.setTimeout(resolve, 250);
              signal?.addEventListener(
                "abort",
                () => {
                  window.clearTimeout(timer);
                  reject(new DOMException("The operation was stopped.", "AbortError"));
                },
                { once: true }
              );
            });
            operation = (await getChatOperationStatus(idempotencyKey, { signal }))?.operation || null;
          }
          if (operation.status !== "completed") {
            throw new Error(operation.error?.message || "Ask request failed");
          }
          full = String(operation.result?.body || "");
          chat.setPendingForChat(
            activeChatId,
            (prev) => (prev ? { ...prev, content: full, stage: "" } : prev),
            requestId
          );
        } else {
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let streaming = true;
          while (streaming) {
            const { done, value } = await reader.read();
            if (done) {
              streaming = false;
              break;
            }
            full += decoder.decode(value, { stream: true });
            const snapshot = full;
            chat.setPendingForChat(
              activeChatId,
              (prev) => (prev ? { ...prev, content: snapshot, stage: "" } : prev),
              requestId
            );
          }
        }
      } catch (err) {
        throw err instanceof Error ? err : new Error(String(err || "Ask request failed"));
      } finally {
        chat.setPendingForChat(activeChatId, null, requestId);
      }
      if (!full.trim()) {
        throw new Error("The assistant returned an empty response. Please try again.");
      }
      const text = full.trim();
      await setDoc(
        doc(db, "users", user.uid, "chats", activeChatId, "messages", `${requestId}-assistant`),
        sanitizeTranscriptMessagePayload({
          role: "assistant",
          content: text,
          explanation: text,
          createdAt: serverTimestamp(),
          requestId,
        })
      );
      await touchChat(activeChatId, text);
      refreshBilling?.();
    },
    [user, chat, effectiveGameSpec, settings?.modelVersion, touchChat, refreshBilling]
  );

  // Stage 1: route by operating mode.
  //  - ask   -> conversational stream (read-only)
  //  - plan  -> orchestrate (may clarify) -> plan card -> user approves
  //  - agent -> orchestrate (may clarify) -> plan card -> user approves
  //  - debug -> same as agent, with debug framing
  const handleSubmit = useCallback(
    async (currentPrompt, currentAttachments = [], baseArtifact = null, options = {}) => {
      const prompt = (currentPrompt || "").trim();
      const mode = options?.mode || chat.activeMode || "agent";
      if (!prompt && currentAttachments.length === 0) {
        if (!user && onSignInNudge) {
          void trackProductEvent(
            "signin_nudge_viewed",
            {
              landing_page: "/ai",
              generator_mode: mode,
              prompt_category: "empty",
            },
            { dedupeKey: `signin_nudge:empty:${mode}` }
          );
          onSignInNudge();
        }
        return;
      }
      if (!user) {
        void trackProductEvent(
          "signin_nudge_viewed",
          {
            landing_page: "/ai",
            generator_mode: mode,
            prompt_category: categorizePrompt(prompt),
          },
          { dedupeKey: `signin_nudge:${prompt.slice(0, 40)}:${mode}` }
        );
        onSignInNudge?.();
        return;
      }
      const requestId = options?.clientMessageId || uuidv4();
      const submitLockKey = requestId;
      if (submitLocksRef.current[submitLockKey]) return;
      const propagateOperationError = Boolean(
        options?.operationId || options?.operationSignal || options?.propagateErrors
      );
      // This lock and AbortController are intentionally allocated before the
      // first await. Rapid keyboard/mouse events cannot both enter preflight,
      // and Stop can cancel auth/project/Studio preparation immediately.
      submitLocksRef.current[submitLockKey] = true;
      let flowChatId = chat.currentChatId || DRAFT_CHAT_KEY;
      const flowController = createFlowAbortController(flowChatId, requestId, options?.operationSignal || null);
      setFlowBusyForChat(flowChatId, requestId, true);
      beginOrchestrationPending(
        flowChatId,
        requestId,
        prompt,
        mode === "agent" || mode === "debug" ? "Starting your request..." : "Understanding your task..."
      );
      const bindFlowToChat = (nextChatId) => {
        if (!nextChatId || nextChatId === flowChatId) return;
        const previousChatId = flowChatId;
        const previousKey = `${flowChatId}:${requestId}`;
        const entry = flowAbortControllersRef.current[previousKey];
        delete flowAbortControllersRef.current[previousKey];
        flowChatId = nextChatId;
        moveFlowUiToChat(previousChatId, nextChatId, requestId);
        if (entry) {
          entry.chatId = nextChatId;
          flowAbortControllersRef.current[`${flowChatId}:${requestId}`] = entry;
        }
      };
      try {
        throwIfAborted(flowController.signal);
        try {
          await chat.assertCanWrite();
          throwIfAborted(flowController.signal);
        } catch (error) {
          if (!isAbortError(error)) notify?.({ message: error?.message, type: "error" });
          if (propagateOperationError) throw error;
          return;
        }
        let ownedProject;
        try {
          ownedProject = await resolveOwnedProjectId(options?.projectId);
          throwIfAborted(flowController.signal);
        } catch (err) {
          if (!isAbortError(err)) {
            console.error("Project validation error:", err);
            notify?.({
              message: err?.message || "This project is not available.",
              type: "error",
            });
          }
          if (propagateOperationError) throw err;
          return;
        }
        if (ownedProject.recoveryMessage) {
          notify?.({ message: ownedProject.recoveryMessage, type: "info" });
        }
        const {
          operationSignal: _operationSignal,
          onChatReady,
          onRunId,
          onOperationStatus,
          ...transportOptions
        } = options || {};
        const effectiveOptions = {
          ...transportOptions,
          projectId: ownedProject.projectId,
          idempotencyKey: options?.idempotencyKey || `run-${requestId}`,
        };
        const titleSeed = prompt || describeChatAttachments(currentAttachments) || "New chat";
        const pendingPlan = [...(chat.messages || [])].reverse().find((m) => m?.stage === "plan" && m.planId);
        if (pendingPlan && isExplicitPlanApproval(prompt)) {
          try {
            await approvePlanInternal(pendingPlan, baseArtifact, effectiveOptions);
          } catch (err) {
            console.error("Approve/generate error:", err);
            notify?.({
              message: err?.message || "Build failed. You can try again.",
              type: "error",
            });
            if (propagateOperationError) throw err;
          }
          return;
        }

        let activeChatId = chat.currentChatId;
        let historyForRun = chat.messages || [];
        let writeUserTurn = true;
        const rewindFromMessageId = String(options?.rewindFromMessageId || "").trim();
        if (rewindFromMessageId) {
          if (typeof chat.rewindTranscript !== "function") {
            const error = new Error("Cannot rewind this chat right now.");
            notify?.({ message: error.message, type: "error" });
            if (propagateOperationError) throw error;
            return;
          }
          try {
            throwIfAborted(flowController.signal);
            const rewindMode = normalizeRewindMode(options?.rewindMode);
            const rewindResult = await chat.rewindTranscript(rewindFromMessageId, rewindMode);
            throwIfAborted(flowController.signal);
            historyForRun = Array.isArray(rewindResult?.kept) ? rewindResult.kept : [];
            writeUserTurn = shouldWriteUserMessageAfterRewind(
              rewindResult?.mode || rewindMode,
              rewindResult?.pivot?.role
            );
          } catch (err) {
            console.error("Rewind error:", err);
            notify?.({
              message: err?.message || "Could not rewind the chat.",
              type: "error",
            });
            if (propagateOperationError) throw err;
            return;
          }
        }
        // When regenerating without writing a new user doc, the tip user turn is
        // already in historyForRun. Strip it from conversation so it matches the
        // normal submit shape (prior turns + current prompt).
        let conversationMessages = historyForRun;
        if (!writeUserTurn) {
          const lastKept = historyForRun[historyForRun.length - 1];
          if (lastKept?.role === "user") {
            conversationMessages = historyForRun.slice(0, -1);
          }
        }
        const implementationPrompt = resolveImplementationPrompt(prompt, conversationMessages);

        // Agent & Debug always go to the authoritative decision service. It may
        // execute, recover, clarify, or block without the frontend changing mode.
        if (mode === "agent" || mode === "debug") {
          try {
            activeChatId = await ensureChat(titleSeed, effectiveOptions);
            bindFlowToChat(activeChatId);
            onChatReady?.(activeChatId);
            throwIfAborted(flowController.signal);
            if (writeUserTurn) {
              await writeUserMessage(activeChatId, requestId, prompt, currentAttachments);
              throwIfAborted(flowController.signal);
            }
            onOperationStatus?.("Running");
            const userIntent = classifyUserIntent(implementationPrompt);
            // A question stays conversational even when Agent is selected and
            // the chat already has a project. Project context enriches the
            // answer; it must not turn a question into an execution request.
            if (!isImplementationIntent(userIntent)) {
              publishOrchestrationStage(activeChatId, requestId, "Preparing a response...");
              await handleAskSubmit(
                implementationPrompt,
                currentAttachments,
                activeChatId,
                requestId,
                flowController.signal,
                conversationMessages,
                effectiveOptions.idempotencyKey,
                effectiveOptions
              );
              return;
            }
            if (!effectiveOptions.projectId) {
              const projectError = new Error(
                "Choose a project before Agent starts development work. Ask remains available for questions and discussion."
              );
              projectError.code = "PROJECT_REQUIRED";
              throw projectError;
            }
            publishOrchestrationStage(activeChatId, requestId, "Preparing the agent runtime...");
            const runtimeEnvelope = await launchAuthoritativeRun({
              activeChatId,
              requestId,
              prompt: implementationPrompt,
              mode,
              attachments: currentAttachments,
              baseArtifact,
              submissionOptions: effectiveOptions,
              conversationMessages,
              signal: flowController.signal,
              onRunId,
            });
            if (runtimeEnvelope?.operationPending === true) {
              const recoveryError = new OperationRecoveryPendingError({
                operationId: runtimeEnvelope.operationId || effectiveOptions.idempotencyKey,
              });
              recoveryError.details = {
                operationId: runtimeEnvelope.operationId || effectiveOptions.idempotencyKey,
                agentId: runtimeEnvelope.agentId || null,
              };
              throw recoveryError;
            }
            return runtimeEnvelope;
          } catch (err) {
            if (!isAbortError(err) && !isOutcomeUnknownError(err)) {
              const expectedUserActionError = isExpectedUserActionError(err);
              if (!expectedUserActionError) {
                console.error("Generation error:", err);
              }
              if (typeof notify === "function") {
                notify({
                  message: err?.message || "Build failed. You can try again.",
                  type: "error",
                });
                if (expectedUserActionError && err && typeof err === "object") {
                  err.userNotificationEmitted = true;
                }
              }
            }
            if (propagateOperationError) throw err;
          }
          return;
        }

        // Plan & Ask: keep the orchestrate -> (clarify/plan/conversation) flow.
        try {
          activeChatId = await ensureChat(titleSeed, effectiveOptions);
          bindFlowToChat(activeChatId);
          onChatReady?.(activeChatId);
          throwIfAborted(flowController.signal);
          if (writeUserTurn) {
            await writeUserMessage(activeChatId, requestId, prompt, currentAttachments);
            throwIfAborted(flowController.signal);
          }
          await ensureRuntimeAgentProjection(activeChatId, effectiveOptions);
          throwIfAborted(flowController.signal);
          onOperationStatus?.("Running");

          if (mode === "ask") {
            await handleAskSubmit(
              prompt,
              currentAttachments,
              activeChatId,
              requestId,
              flowController.signal,
              conversationMessages,
              effectiveOptions.idempotencyKey,
              effectiveOptions
            );
            return;
          }

          publishOrchestrationStage(activeChatId, requestId, "Analyzing request...");
          const workflowTargeting = buildWorkflowTargeting(effectiveOptions);
          const decision = await orchestrate({
            chatId: activeChatId,
            prompt,
            history: conversationMessages,
            attachments: currentAttachments,
            mode,
            gameSpec: effectiveGameSpec,
            projectId: workflowTargeting.projectId,
            studioConnected: workflowTargeting.studioConnected,
            targeting: workflowTargeting,
            templateId: effectiveOptions.templateId || null,
            idempotencyKey: effectiveOptions.idempotencyKey,
            signal: flowController.signal,
          });

          publishOrchestrationStage(activeChatId, requestId, "Preparing response...");
          await writeOrchestrationResult(activeChatId, requestId, decision, prompt, currentAttachments, {
            ...effectiveOptions,
            mode,
            targeting: workflowTargeting,
          });
        } catch (err) {
          if (!isAbortError(err)) {
            console.error("Orchestration error:", err);
            notify?.({
              message: err?.message || "Could not start the build",
              type: "error",
            });
          }
          if (propagateOperationError) throw err;
        }
      } finally {
        setFlowBusyForChat(flowChatId, requestId, false);
        clearOrchestrationPending(flowChatId, requestId);
        releaseFlowAbortController(flowChatId, requestId);
        delete submitLocksRef.current[submitLockKey];
      }
    },
    [
      user,
      onSignInNudge,
      ensureChat,
      setFlowBusyForChat,
      beginOrchestrationPending,
      publishOrchestrationStage,
      clearOrchestrationPending,
      moveFlowUiToChat,
      createFlowAbortController,
      releaseFlowAbortController,
      chat,
      approvePlanInternal,
      writeUserMessage,
      ensureRuntimeAgentProjection,
      launchAuthoritativeRun,
      writeOrchestrationResult,
      handleAskSubmit,
      effectiveGameSpec,
      notify,
    ]
  );

  // Stage 2 (clarify): user answers the questions; re-orchestrate (now produces a plan).
  const submitClarifyAnswers = useCallback(
    async (message, answers, submissionOptions = {}) => {
      if (!user || !message) return;
      const prompt = message.originPrompt || "";
      const attachments = message.attachments || [];
      const activeChatId = chat.currentChatId;
      if (!activeChatId) return;
      const submitLockKey = `clarify:${activeChatId}:${message.id}`;
      if (submitLocksRef.current[submitLockKey]) return;
      const requestId = submissionOptions.operationId || uuidv4();
      submitLocksRef.current[submitLockKey] = true;
      const flowController = createFlowAbortController(
        activeChatId,
        requestId,
        submissionOptions.operationSignal || null
      );
      const workflowTargeting = buildWorkflowTargeting(
        {
          ...submissionOptions,
          projectId: submissionOptions.projectId ?? message.projectId,
          studioConnected: submissionOptions.studioConnected ?? message.studioConnected,
          targeting: {
            ...(message.targeting && typeof message.targeting === "object" ? message.targeting : {}),
            ...(submissionOptions.targeting && typeof submissionOptions.targeting === "object"
              ? submissionOptions.targeting
              : {}),
          },
        },
        message.targeting
      );
      setFlowBusyForChat(activeChatId, requestId, true);
      try {
        throwIfAborted(flowController.signal);
        await chat.assertCanWrite();
        throwIfAborted(flowController.signal);
        const ownedProject = await resolveOwnedProjectId(workflowTargeting.projectId);
        throwIfAborted(flowController.signal);
        if (ownedProject.recoveryMessage) {
          notify?.({ message: ownedProject.recoveryMessage, type: "info" });
        }
        const effectiveTargeting = {
          ...workflowTargeting,
          projectId: ownedProject.projectId,
        };

        const answerText = Object.entries(answers || {})
          .filter(([, value]) =>
            Array.isArray(value)
              ? value.some((entry) => String(entry || "").trim() !== "")
              : value != null && String(value).trim() !== ""
          )
          .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : value}`)
          .join("\n");
        beginOrchestrationPending(activeChatId, requestId, answerText);
        if (answerText) await writeUserMessage(activeChatId, requestId, answerText);

        await updateDoc(
          doc(db, "users", user.uid, "chats", activeChatId, "messages", message.id),
          sanitizeTranscriptMessagePayload({
            stage: "clarify_answered",
            answers: sanitizeFirestoreValue(answers || {}),
            updatedAt: serverTimestamp(),
          })
        );

        publishOrchestrationStage(activeChatId, requestId, "Analyzing request...");
        const decision = await orchestrate({
          chatId: activeChatId,
          prompt,
          answers,
          history: chat.messages,
          attachments,
          mode: message.requestMode || "plan",
          gameSpec: effectiveGameSpec,
          projectId: effectiveTargeting.projectId,
          studioConnected: effectiveTargeting.studioConnected,
          targeting: effectiveTargeting,
          templateId: message.templateId || submissionOptions.templateId || null,
          idempotencyKey: submissionOptions.idempotencyKey || requestId,
          signal: flowController.signal,
        });

        publishOrchestrationStage(activeChatId, requestId, "Preparing response...");
        await writeOrchestrationResult(activeChatId, requestId, decision, prompt, attachments, {
          ...submissionOptions,
          mode: message.requestMode || "plan",
          templateId: message.templateId || submissionOptions.templateId || null,
          targeting: effectiveTargeting,
          ...effectiveTargeting,
        });
      } catch (err) {
        if (!isAbortError(err)) {
          console.error("Clarify error:", err);
          notify?.({
            message: err?.message || "Could not continue",
            type: "error",
          });
        }
      } finally {
        releaseFlowAbortController(activeChatId, requestId);
        setFlowBusyForChat(activeChatId, requestId, false);
        clearOrchestrationPending(activeChatId, requestId);
        delete submitLocksRef.current[submitLockKey];
      }
    },
    [
      user,
      chat,
      effectiveGameSpec,
      writeUserMessage,
      writeOrchestrationResult,
      setFlowBusyForChat,
      beginOrchestrationPending,
      publishOrchestrationStage,
      clearOrchestrationPending,
      createFlowAbortController,
      releaseFlowAbortController,
      notify,
    ]
  );

  // Stage 3 (plan): user approves the plan -> generate.
  const approvePlan = useCallback(
    async (message, baseArtifact = null, submissionOptions = {}) => {
      try {
        await approvePlanInternal(message, baseArtifact, submissionOptions);
      } catch (err) {
        console.error("Approve/generate error:", err);
        notify?.({
          message: err?.message || "Build failed. You can try again.",
          type: "error",
        });
      }
    },
    [approvePlanInternal, notify]
  );

  // Stage 5 (refine): re-run generation with a refinement instruction against the
  // server-owned workspace revision (isRefinement + baseArtifactRef). Do not
  // duplicate project files as Lua attachments — the backend loads the base.
  const refineArtifact = useCallback(
    async (message, refinePrompt, workspaceArtifact = null, submissionOptions = {}) => {
      if (!user || !refinePrompt) return false;
      const activeChatId = chat.currentChatId;
      if (!activeChatId) return false;

      try {
        const ownedProject = await resolveOwnedProjectId(submissionOptions.projectId || message?.projectId);
        if (ownedProject.recoveryMessage) {
          notify?.({ message: ownedProject.recoveryMessage, type: "info" });
        }
        const existingFiles =
          Array.isArray(workspaceArtifact?.files) && workspaceArtifact.files.length
            ? workspaceArtifact.files
            : Array.isArray(message?.files) && message.files.length
              ? message.files
              : message?.code
                ? [{ name: message.title || "Script", content: message.code }]
                : [];

        const artifactId =
          workspaceArtifact?.artifactId || workspaceArtifact?.id || message?.artifactId || message?.projectId || null;
        const revision = workspaceArtifact?.revision || message?.revision || null;

        if (!artifactId && existingFiles.length === 0) {
          notify?.({
            message: "Nothing to refine yet. Generate a project first, then refine it.",
            type: "error",
          });
          return false;
        }

        const baseArtifactRef = {
          ...(artifactId ? { artifactId: String(artifactId) } : {}),
          ...(revision ? { revision: String(revision) } : {}),
          chatId: activeChatId,
          ...(message?.jobId ? { parentJobId: String(message.jobId) } : {}),
        };

        const augmentedPrompt =
          existingFiles.length || artifactId
            ? `You are refining an existing multi-file Roblox project. Apply this change:\n\n${refinePrompt}\n\nPrefer surgical edits to existing files when possible. Return workspace file operations (<patch> when enabled, otherwise <file> upserts) rather than dumping Luau as chat markdown. Modify only what's necessary and keep unaffected files intact, preserving their structure and placement.`
            : refinePrompt;

        const effectiveSubmissionOptions = {
          ...submissionOptions,
          projectId: ownedProject.projectId,
          isRefinement: true,
          baseArtifactRef,
          parentJobId: message?.jobId || submissionOptions.parentJobId || null,
          refineMode: submissionOptions.refineMode || null,
        };

        // Pass workspace snapshot as a hint only; server resolves the sealed base.
        await runGeneration(
          activeChatId,
          message?.classification || "project",
          augmentedPrompt,
          [],
          workspaceArtifact ||
            (existingFiles.length
              ? {
                  artifactId: artifactId || undefined,
                  revision: revision || undefined,
                  title: message?.title || workspaceArtifact?.title || "Project",
                  files: existingFiles,
                }
              : null),
          effectiveSubmissionOptions
        );
        return true;
      } catch (err) {
        console.error("Refine error:", err);
        const refineCode = err?.details?.refineCode || err?.code || null;
        const messageText =
          refineCode === "REFINE_BASE_REQUIRED"
            ? "Refine needs a saved workspace project. Generate or open a project first."
            : refineCode === "REFINE_BASE_REVISION_MISMATCH" || refineCode === "REFINE_NEEDS_REBASE"
              ? "The project changed. Reload and refine against the latest revision."
              : err?.message || "Refine failed. You can try again.";
        notify?.({ message: messageText, type: "error" });
        return false;
      }
    },
    [user, chat.currentChatId, runGeneration, notify]
  );

  return {
    ...chat,
    isGenerating,
    pendingMessage,
    pendingMessages,
    generationStage,
    generatingChatIds,
    ensureChat,
    handleSubmit,
    submitClarifyAnswers,
    approvePlan,
    refineArtifact,
    cancelCurrentFlow,
  };
}
