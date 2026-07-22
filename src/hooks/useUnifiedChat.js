import { useCallback, useMemo, useRef, useState } from "react";
import {
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { BACKEND_URL } from "../config";
import { v4 as uuidv4 } from "uuid";
import { useAiChat } from "./useAiChat";
import { orchestrate, approveWorkflowPlan } from "../lib/workflowApi";
import { isExplicitPlanApproval } from "../lib/planApproval";
import { classifyUserIntent, isImplementationIntent } from "../lib/intentClassifier";
import {
  applyStreamActivity,
  createPendingStreamState,
  getPendingStreamSnapshot,
} from "../lib/streaming";
import { stageSlug } from "../lib/streamEngagement";
import { resolveGameSpecForPrompt } from "../lib/gameProfile";
import { categorizePrompt, trackProductEvent } from "../lib/productAnalytics";
import { FEATURE_FLAGS } from "../lib/featureFlags";
import { getStudioApplyMode, getStudioEnabledPreference } from "../lib/agentSteps";
import { getStudioStatus } from "../lib/studioBridgeApi";
import {
  getStudioConnectionType,
  getStudioSessionId,
  selectMcpStudioSession,
  selectPluginStudioSession,
} from "../lib/studioConnection";
import {
  describeChatAttachments,
  messageToConversationEntry,
  normalizeChatAttachments,
} from "../lib/chatAttachments";
import {
  AgentRuntimeUnavailableError,
  createAgentRunV2,
  getRuntimeCapabilitiesV2,
  normalizeAgentProjection,
  resolveChatAgentProjectionV2,
  selectAgentRuntimeRoute,
} from "../lib/agentRuntimeV2Api";
import { reconcileAssistantTurns } from "../lib/assistantTurnIdentity";
import { getProjectBinding } from "../lib/projectBindingsApi";

export function reconcileUnifiedPendingMessages(generationPending = [], orchestrationPending = []) {
  return reconcileAssistantTurns([
    ...(generationPending || []).map((turn) => ({ turn, source: "generation" })),
    ...(orchestrationPending || []).map((turn) => ({ turn, source: "orchestration" })),
  ]);
}

async function validateOwnedProject(projectId) {
  const normalizedProjectId = String(projectId || "").trim();
  if (!normalizedProjectId) return null;
  return getProjectBinding(normalizedProjectId);
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
  const normalized = {
    modelVersion: String(settings?.modelVersion || ""),
    creativity: Number.isFinite(Number(settings?.creativity))
      ? Number(settings.creativity)
      : 0.7,
    codeStyle: String(settings?.codeStyle || "optimized"),
    verbosity: String(settings?.verbosity || "concise"),
    codingStandards: String(settings?.codingStandards || ""),
    gameSpec: String(gameSpec || ""),
    enableGameWizard: settings?.enableGameWizard !== false,
    showThinking: settings?.showThinking !== false,
    studioAutoPushEnabled: settings?.studioAutoPushEnabled === true,
    studioAutoPushPolicy: String(settings?.studioAutoPushPolicy || "after_validation"),
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
  const supplied = submissionOptions?.targeting && typeof submissionOptions.targeting === "object"
    ? submissionOptions.targeting
    : {};
  const fallback = fallbackTargeting && typeof fallbackTargeting === "object"
    ? fallbackTargeting
    : {};
  const projectId = submissionOptions?.projectId
    ?? supplied.projectId
    ?? fallback.projectId
    ?? null;
  const studioTarget = submissionOptions?.studioTarget
    ?? submissionOptions?.studioTargetPreference
    ?? supplied.studioTarget
    ?? fallback.studioTarget
    ?? null;
  const studioConnected = submissionOptions?.studioConnected
    ?? supplied.studioConnected
    ?? fallback.studioConnected
    ?? false;
  return {
    projectId: projectId == null || projectId === "" ? null : String(projectId),
    studioConnected: Boolean(studioConnected),
    studioTarget,
  };
}

function runtimeAutoPushPolicy(settings = {}) {
  const policy = String(settings?.studioAutoPushPolicy || "").trim();
  return policy === "after_validation" || policy === "after_playtest"
    ? policy
    : "manual_only";
}

function isLegacyRuntimeOwnershipError(error) {
  return error?.status === 503
    && error?.payload?.code === "CAPABILITY_UNSUPPORTED"
    && error?.payload?.details?.runtimeOwner === "legacy_agent_adapter";
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
  const effectiveGameSpec = useMemo(
    () => resolveGameSpecForPrompt(settings?.gameSpec),
    [settings?.gameSpec]
  );

  const chat = useAiChat(user, settings, refreshBilling, notify, { authReady });

  // The pre-generation "flow" phase (orchestration / Ask streaming) is tracked
  // per originating chat, mirroring how useAiChat scopes the generation phase.
  const [flowBusyChats, setFlowBusyChats] = useState({}); // chatId -> requestId -> bool
  const [orchestrationPendingByChat, setOrchestrationPendingByChat] = useState({}); // chatId -> requestId -> pending
  const orchestrationStreamRef = useRef({});
  const submitLocksRef = useRef({});
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

  const flowBusy = Object.values(flowBusyChats[chat.currentChatId] || {}).some(Boolean);

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
        [requestId]: buildOrchestrationPending(
          orchestrationStreamRef.current[streamKey],
          label,
          {
            requestId,
            prompt: prev[chatId]?.[requestId]?.prompt,
          }
        ),
      },
    }));
  }, []);

  const beginOrchestrationPending = useCallback((chatId, requestId, prompt = "") => {
    const state = seedOrchestrationStream();
    orchestrationStreamRef.current[`${chatId}:${requestId}`] = state;
    setOrchestrationPendingByChat((prev) => ({
      ...prev,
      [chatId]: {
        ...(prev[chatId] || {}),
        [requestId]: buildOrchestrationPending(state, "Understanding your task...", {
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

  const isGenerating = chat.isGenerating || flowBusy;

  const pendingMessages = useMemo(() => reconcileUnifiedPendingMessages(
    chat.pendingMessages,
    Object.values(orchestrationPendingByChat[chat.currentChatId] || {}).filter(Boolean)
  ), [chat.pendingMessages, chat.currentChatId, orchestrationPendingByChat]);
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
      if (Object.values(flowBusyChats[id] || {}).some(Boolean)) set.add(id);
    });
    return Array.from(set);
  }, [chat.generatingChatIds, flowBusyChats]);

  // Ensure a chat exists, returning its id (creating + opening if needed).
  const ensureChat = useCallback(
    async (titleSeed, { projectId = null, studioTargetPreference = null } = {}) => {
      let activeChatId = chat.currentChatId;
      if (!activeChatId) {
        activeChatId = await chat.startNewChat({ projectId, studioTargetPreference });
        const seed = String(titleSeed || "New chat");
        if (activeChatId && seed !== "New chat") {
          await updateDoc(doc(db, "users", user.uid, "chats", activeChatId), {
            title: seed.slice(0, 30) + (seed.length > 30 ? "..." : ""),
            lifecycle: "active",
            updatedAt: serverTimestamp(),
          });
        }
      }
      return activeChatId;
    },
    [chat, user]
  );

  const touchChat = useCallback(
    async (activeChatId, lastMessage) => {
      try {
        await updateDoc(doc(db, "users", user.uid, "chats", activeChatId), {
          lastMessage: String(lastMessage || "").slice(0, 140),
          updatedAt: serverTimestamp(),
        });
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
        {
          role: "user",
          content: displayContent,
          ...(normalizedAttachments.length ? { attachments: normalizedAttachments } : {}),
          createdAt: serverTimestamp(),
          requestId,
        }
      );
      await touchChat(activeChatId, displayContent);
    },
    [user, touchChat]
  );

  const ensureRuntimeAgentProjection = useCallback(async (
    activeChatId,
    submitOptions = {},
    { required = false } = {}
  ) => {
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
      const storedAgentId = chat.currentChatId === activeChatId
        ? chat.currentChatMeta?.agentId
        : null;
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
  }, [chat.currentChatId, chat.currentChatMeta?.agentId]);

  const launchAuthoritativeRun = useCallback(async ({
    activeChatId,
    requestId,
    prompt,
    mode,
    attachments = [],
    baseArtifact = null,
    submissionOptions = {},
  }) => {
    let capabilities = null;
    try {
      capabilities = await getRuntimeCapabilitiesV2();
    } catch (error) {
      if (!(error instanceof AgentRuntimeUnavailableError)) throw error;
    }
    const runtimeRoute = selectAgentRuntimeRoute(capabilities, {
      projectId: submissionOptions.projectId,
    });
    const launchLegacyGeneration = () => {
      if (capabilities && capabilities.legacyGeneration?.enabled !== true) {
        throw new Error("No executable generation transport is currently available.");
      }
      const legacySubmissionOptions = { ...submissionOptions };
      delete legacySubmissionOptions.authoritativeRun;
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

    const agent = await ensureRuntimeAgentProjection(
      activeChatId,
      submissionOptions,
      { required: true }
    );
    if (!agent) return launchLegacyGeneration();
    const studioEnabled = getStudioEnabledPreference() === true;
    const autoPushToStudio = studioEnabled && settings?.studioAutoPushEnabled === true;
    const approvedPlan = normalizeApprovedPlanReference(submissionOptions.approvedPlan);
    let runtimeEnvelope;
    try {
      runtimeEnvelope = await createAgentRunV2({
        chatId: activeChatId,
        agentId: agent.agentId,
        idempotencyKey: `run-${requestId}`,
        prompt,
        mode,
        projectId: submissionOptions.projectId || agent.projectId,
        attachments: normalizeChatAttachments(attachments),
        settings: buildRuntimeSettings(settings, effectiveGameSpec),
        conversation: (chat.messages || []).slice(-10).map(messageToConversationEntry).filter(Boolean),
        baseArtifact: baseArtifact || null,
        generatorMode: "agent_build",
        studioEnabled,
        applyMode: getStudioApplyMode(),
        routingMode: studioEnabled ? "hybrid" : "cloud",
        autoPushToStudio,
        autoPushPolicy: runtimeAutoPushPolicy(settings),
        ...(approvedPlan ? { approvedPlan } : {}),
        chatMode: mode === "debug" ? "debug" : "agent",
        selectedExampleIds: Array.isArray(submissionOptions.selectedExampleIds)
          ? submissionOptions.selectedExampleIds
          : [],
        showPlan: submissionOptions.showPlan === true,
      });
    } catch (error) {
      if (!FEATURE_FLAGS.legacyAgentFallback || !isLegacyRuntimeOwnershipError(error)) {
        throw error;
      }

      return launchLegacyGeneration();
    }
    if (!runtimeEnvelope?.authoritativeExecution || !runtimeEnvelope?.run?.runId) {
      throw new Error("The durable agent runtime did not accept this executable request.");
    }
    await chat.handleSubmit(
      prompt,
      activeChatId,
      requestId,
      mode === "debug" ? "debug" : "agent",
      true,
      attachments,
      baseArtifact,
      { ...submissionOptions, authoritativeRun: runtimeEnvelope }
    );
    return runtimeEnvelope;
  }, [chat, effectiveGameSpec, ensureRuntimeAgentProjection, settings]);

  const writeOrchestrationResult = useCallback(
    async (activeChatId, requestId, decision, originPrompt, attachments, submissionContext = {}) => {
      const attMeta = normalizeChatAttachments(attachments);
      const structuredPlanCandidate = decision?.structuredPlan
        || decision?.plan?.structuredPlan
        || decision?.plan
        || null;
      const structuredPlan = structuredPlanCandidate && typeof structuredPlanCandidate === "object"
        && !Array.isArray(structuredPlanCandidate)
        ? structuredPlanCandidate
        : null;
      const planTargeting = structuredPlan?.targeting && typeof structuredPlan.targeting === "object"
        ? structuredPlan.targeting
        : {};
      const targeting = buildWorkflowTargeting({
        targeting: decision?.targeting || planTargeting,
        projectId: decision?.projectId ?? planTargeting.projectId ?? submissionContext.projectId,
        studioConnected: decision?.studioConnected
          ?? planTargeting.studioConnected
          ?? submissionContext.studioConnected,
        studioTarget: decision?.studioTarget
          ?? planTargeting.studioTarget
          ?? submissionContext.studioTarget
          ?? submissionContext.studioTargetPreference,
      }, buildWorkflowTargeting(submissionContext));

      if (decision.status === "conversation") {
        const text = decision.message || "";
        await setDoc(
          doc(db, "users", user.uid, "chats", activeChatId, "messages", `${requestId}-assistant`),
          {
            role: "assistant",
            stage: "conversation",
            intent: decision.intent || null,
            content: text,
            explanation: text,
            createdAt: serverTimestamp(),
            requestId,
          }
        );
        await touchChat(activeChatId, text || "Conversation");
        return;
      }

      if (decision.status === "needs_clarification") {
        void trackProductEvent("clarification_requested", {
          generator_mode: chat.activeMode || "agent",
          prompt_category: categorizePrompt(originPrompt),
          attachment_count: attachments?.length || 0,
        }, { dedupeKey: `clarify:${activeChatId}:${requestId}` });
        await setDoc(
          doc(db, "users", user.uid, "chats", activeChatId, "messages", `${requestId}-clarify`),
          {
            role: "assistant",
            stage: "clarify",
            questions: decision.questions || [],
            originPrompt,
            attachments: attMeta,
            projectId: targeting.projectId,
            studioConnected: targeting.studioConnected,
            studioTarget: targeting.studioTarget,
            targeting,
            requestMode: submissionContext.mode || "plan",
            templateId: decision.templateId || submissionContext.templateId || null,
            createdAt: serverTimestamp(),
            requestId,
          }
        );
        await touchChat(activeChatId, "Needs a few details…");
        return;
      }

      await setDoc(
        doc(db, "users", user.uid, "chats", activeChatId, "messages", `${requestId}-plan`),
        {
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
          clarificationAnswers: decision.clarificationAnswers
            || structuredPlan?.clarificationAnswers
            || null,
          templateId: decision.templateId || structuredPlan?.templateId || submissionContext.templateId || null,
          projectId: targeting.projectId,
          studioConnected: targeting.studioConnected,
          studioTarget: targeting.studioTarget,
          targeting,
          originPrompt,
          attachments: attMeta,
          createdAt: serverTimestamp(),
          requestId,
        }
      );
      void trackProductEvent("plan_displayed", {
        generator_mode: chat.activeMode || "agent",
        output_type: decision.classification || "script",
        prompt_category: categorizePrompt(originPrompt),
      }, { dedupeKey: `plan:${activeChatId}:${requestId}:${decision.planId || ""}` });
      await touchChat(activeChatId, decision.aiSummary || "Build plan ready");
    },
    [user, touchChat, chat.activeMode]
  );

  // Dispatch generation for an approved plan. All classifications now run the
  // artifact job worker in "act" mode to produce a multi-file Roblox artifact.
  const runGeneration = useCallback(
    async (
      activeChatId,
      classification,
      prompt,
      attachments,
      baseArtifact = null,
      submissionOptions = {}
    ) => {
      const requestId = uuidv4();
      await launchAuthoritativeRun({
        activeChatId,
        requestId,
        prompt,
        mode: "act",
        attachments,
        baseArtifact,
        submissionOptions,
      });
    },
    [launchAuthoritativeRun]
  );

  const approvePlanInternal = useCallback(
    async (message, baseArtifact = null, submissionOptions = {}) => {
      if (!user || !message?.planId) return;
      const activeChatId = chat.currentChatId;
      if (!activeChatId) return;

      await validateOwnedProject(
        submissionOptions.projectId || message.projectId || message.targeting?.projectId
      );

      const approval = await approveWorkflowPlan(message.planId, {
        version: message.planVersion || 1,
        hash: message.planHash || undefined,
      });
      void trackProductEvent("plan_approved", {
        generator_mode: chat.activeMode || "agent",
        output_type: message.classification || "script",
        prompt_category: categorizePrompt(message.originPrompt || ""),
      }, { dedupeKey: `plan_approved:${message.planId}` });
      // The server approval is authoritative. Persisting this UI marker is
      // useful, but must not prevent generation when an older deployed ruleset
      // rejects an otherwise valid transcript update.
      try {
        await updateDoc(
          doc(db, "users", user.uid, "chats", activeChatId, "messages", message.id),
          { stage: "plan_approved", updatedAt: serverTimestamp() }
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
          ...submissionOptions,
          approvedPlan: approval.approvedPlan || {
            planId: message.planId,
            version: message.planVersion || 1,
            hash: message.planHash || "",
          },
        }
      );
    },
    [user, chat.currentChatId, chat.activeMode, runGeneration]
  );

  // ASK mode: read-only conversational streaming. No orchestrate, no plan, no job.
  const handleAskSubmit = useCallback(
    async (prompt, attachments, activeChatId, requestId) => {
      const token = await user.getIdToken();
      const normalizedAttachments = normalizeChatAttachments(attachments);
      const requestPrompt =
        prompt || describeChatAttachments(normalizedAttachments) || "Please review the attached file(s).";
      chat.setPendingForChat(activeChatId, {
        role: "assistant",
        content: "",
        type: "chat",
        prompt: requestPrompt,
        stage: "Thinking...",
      }, requestId);

      const studioEnabled = FEATURE_FLAGS.unifiedAgent && getStudioEnabledPreference();
      let studioSessionId = null;
      let studioConnectionType = null;
      if (studioEnabled) {
        try {
          const studioStatus = await getStudioStatus();
          const sessions = studioStatus.sessions || [];
          const activeSession =
            selectMcpStudioSession(sessions, { capability: "readProject" }) ||
            selectPluginStudioSession(sessions, { compatibleOnly: true });
          studioSessionId = getStudioSessionId(activeSession);
          studioConnectionType = activeSession
            ? getStudioConnectionType(activeSession)
            : null;
          if (studioSessionId) {
            chat.setPendingForChat(
              activeChatId,
              (prev) => prev ? { ...prev, stage: "Reading Studio project..." } : prev,
              requestId
            );
          }
        } catch (_) {
          /* non-fatal: Ask still works without Studio */
        }
      }

      let full = "";
      try {
        const res = await fetch(`${BACKEND_URL}/api/ai/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            prompt: requestPrompt,
            attachments: normalizedAttachments,
            modelVersion: settings?.modelVersion || "",
            gameSpec: effectiveGameSpec,
            conversation: chat.messages.slice(-10).map(messageToConversationEntry).filter(Boolean),
            studioEnabled: studioEnabled && Boolean(studioSessionId),
            studioSessionId,
            studioConnectionType,
          }),
        });
        if (!res.ok || !res.body) {
          const text = await res.text().catch(() => "");
          throw new Error(text || "Ask request failed");
        }
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
        { role: "assistant", content: text, explanation: text, createdAt: serverTimestamp(), requestId }
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
          void trackProductEvent("signin_nudge_viewed", {
            landing_page: "/ai",
            generator_mode: mode,
            prompt_category: "empty",
          }, { dedupeKey: `signin_nudge:empty:${mode}` });
          onSignInNudge();
        }
        return;
      }
      if (!user) {
        void trackProductEvent("signin_nudge_viewed", {
          landing_page: "/ai",
          generator_mode: mode,
          prompt_category: categorizePrompt(prompt),
        }, { dedupeKey: `signin_nudge:${prompt.slice(0, 40)}:${mode}` });
        onSignInNudge?.();
        return;
      }
      const requestId = options?.clientMessageId || uuidv4();
      const submitLockKey = requestId;
      if (submitLocksRef.current[submitLockKey]) return;
      submitLocksRef.current[submitLockKey] = true;
      try {
        try {
          await validateOwnedProject(options?.projectId);
        } catch (err) {
          console.error("Project validation error:", err);
          notify?.({ message: err?.message || "This project is not available.", type: "error" });
          return;
        }
        const titleSeed = prompt || describeChatAttachments(currentAttachments) || "New chat";
        const pendingPlan = [...(chat.messages || [])]
          .reverse()
          .find((m) => m?.stage === "plan" && m.planId);
        if (pendingPlan && isExplicitPlanApproval(prompt)) {
          try {
            await approvePlanInternal(pendingPlan, baseArtifact, options);
          } catch (err) {
            console.error("Approve/generate error:", err);
            notify?.({ message: err?.message || "Build failed. You can try again.", type: "error" });
          }
          return;
        }

        let activeChatId = chat.currentChatId;

        // Agent & Debug: Cursor-style. No orchestration, no plan card, no canned
        // stage labels — hand straight to the streaming generation, which emits the
        // model's raw thinking and streams files into the workspace live.
        if (mode === "agent" || mode === "debug") {
          // Conversational gate: don't build files on greetings, questions, or
          // vague chit-chat. Use the same read-only Ask path here so Studio-aware
          // questions retain the exact selected session and transport context.
          // Clear build requests fall through to the direct-build path.
          const intent = classifyUserIntent(prompt);
          const conversationalOnly =
            mode === "debug"
              // Debug: keep it narrow so pasted errors / "why is X nil" still fix.
              ? ["GREETING", "GENERAL_QUESTION", "CANCELLATION"].includes(intent)
              : !isImplementationIntent(intent) && !isExplicitPlanApproval(prompt);

          if (prompt && conversationalOnly) {
            try {
              activeChatId = await ensureChat(titleSeed, options);
              setFlowBusyForChat(activeChatId, requestId, true);
              await writeUserMessage(activeChatId, requestId, prompt, currentAttachments);
              await ensureRuntimeAgentProjection(activeChatId, options);
              await handleAskSubmit(prompt, currentAttachments, activeChatId, requestId);
            } catch (err) {
              console.error("Conversation error:", err);
              notify?.({ message: err?.message || "Could not respond. You can try again.", type: "error" });
            } finally {
              setFlowBusyForChat(activeChatId, requestId, false);
            }
            return;
          }

          try {
            activeChatId = await ensureChat(titleSeed, options);
            await writeUserMessage(activeChatId, requestId, prompt, currentAttachments);
            await launchAuthoritativeRun({
              activeChatId,
              requestId,
              prompt,
              mode: mode === "debug" ? "debug" : "act",
              attachments: currentAttachments,
              baseArtifact,
              submissionOptions: options,
            });
          } catch (err) {
            console.error("Generation error:", err);
            notify?.({ message: err?.message || "Build failed. You can try again.", type: "error" });
          }
          return;
        }

        // Plan & Ask: keep the orchestrate -> (clarify/plan/conversation) flow.
        try {
          activeChatId = await ensureChat(titleSeed, options);
          setFlowBusyForChat(activeChatId, requestId, true);
          beginOrchestrationPending(activeChatId, requestId, prompt);
          await writeUserMessage(activeChatId, requestId, prompt, currentAttachments);
          await ensureRuntimeAgentProjection(activeChatId, options);

          if (mode === "ask") {
            await handleAskSubmit(prompt, currentAttachments, activeChatId, requestId);
            return;
          }

          publishOrchestrationStage(activeChatId, requestId, "Analyzing request...");
          const workflowTargeting = buildWorkflowTargeting(options);
          const decision = await orchestrate({
            prompt,
            history: chat.messages,
            attachments: currentAttachments,
            mode,
            gameSpec: effectiveGameSpec,
            projectId: workflowTargeting.projectId,
            studioConnected: workflowTargeting.studioConnected,
            studioTarget: workflowTargeting.studioTarget,
            targeting: workflowTargeting,
            templateId: options.templateId || null,
          });

          publishOrchestrationStage(activeChatId, requestId, "Preparing response...");
          await writeOrchestrationResult(
            activeChatId,
            requestId,
            decision,
            prompt,
            currentAttachments,
            { ...options, mode, targeting: workflowTargeting }
          );

        } catch (err) {
          console.error("Orchestration error:", err);
          notify?.({ message: err?.message || "Could not start the build", type: "error" });
        } finally {
          setFlowBusyForChat(activeChatId, requestId, false);
          clearOrchestrationPending(activeChatId, requestId);
        }
      } finally {
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
      const requestId = uuidv4();
      const activeChatId = chat.currentChatId;
      if (!activeChatId) return;
      const workflowTargeting = buildWorkflowTargeting({
        ...submissionOptions,
        projectId: submissionOptions.projectId ?? message.projectId,
        studioConnected: submissionOptions.studioConnected ?? message.studioConnected,
        studioTarget: submissionOptions.studioTarget
          ?? submissionOptions.studioTargetPreference
          ?? message.studioTarget,
        targeting: {
          ...(message.targeting && typeof message.targeting === "object" ? message.targeting : {}),
          ...(submissionOptions.targeting && typeof submissionOptions.targeting === "object"
            ? submissionOptions.targeting
            : {}),
        },
      }, message.targeting);
      setFlowBusyForChat(activeChatId, requestId, true);
      try {
        await validateOwnedProject(workflowTargeting.projectId);

        const answerText = Object.entries(answers || {})
          .filter(([, value]) => (
            Array.isArray(value)
              ? value.some((entry) => String(entry || "").trim() !== "")
              : value != null && String(value).trim() !== ""
          ))
          .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : value}`)
          .join("\n");
        beginOrchestrationPending(activeChatId, requestId, answerText);
        if (answerText) await writeUserMessage(activeChatId, requestId, answerText);

        await updateDoc(
          doc(db, "users", user.uid, "chats", activeChatId, "messages", message.id),
          { stage: "clarify_answered", answers: answers || {}, updatedAt: serverTimestamp() }
        );

        publishOrchestrationStage(activeChatId, requestId, "Analyzing request...");
        const decision = await orchestrate({
          prompt,
          answers,
          history: chat.messages,
          attachments,
          mode: message.requestMode || "plan",
          gameSpec: effectiveGameSpec,
          projectId: workflowTargeting.projectId,
          studioConnected: workflowTargeting.studioConnected,
          studioTarget: workflowTargeting.studioTarget,
          targeting: workflowTargeting,
          templateId: message.templateId || submissionOptions.templateId || null,
        });

        publishOrchestrationStage(activeChatId, requestId, "Preparing response...");
        await writeOrchestrationResult(
          activeChatId,
          requestId,
          decision,
          prompt,
          attachments,
          {
            ...submissionOptions,
            mode: message.requestMode || "plan",
            templateId: message.templateId || submissionOptions.templateId || null,
            targeting: workflowTargeting,
            ...workflowTargeting,
          }
        );
      } catch (err) {
        console.error("Clarify error:", err);
        notify?.({ message: err?.message || "Could not continue", type: "error" });
      } finally {
        setFlowBusyForChat(activeChatId, requestId, false);
        clearOrchestrationPending(activeChatId, requestId);
      }
    },
    [user, chat.currentChatId, chat.messages, effectiveGameSpec, writeUserMessage, writeOrchestrationResult, setFlowBusyForChat, beginOrchestrationPending, publishOrchestrationStage, clearOrchestrationPending, notify]
  );

  // Stage 3 (plan): user approves the plan -> generate.
  const approvePlan = useCallback(
    async (message, baseArtifact = null, submissionOptions = {}) => {
      try {
        await approvePlanInternal(message, baseArtifact, submissionOptions);
      } catch (err) {
        console.error("Approve/generate error:", err);
        notify?.({ message: err?.message || "Build failed. You can try again.", type: "error" });
      }
    },
    [approvePlanInternal, notify]
  );

  // Stage 5 (refine): re-run generation with a refinement instruction, passing
  // the existing generated files as context so the agent EDITS rather than
  // regenerates everything from scratch.
  const refineArtifact = useCallback(
    async (message, refinePrompt, workspaceArtifact = null, submissionOptions = {}) => {
      if (!user || !refinePrompt) return;
      const activeChatId = chat.currentChatId;
      if (!activeChatId) return;

      try {
        await validateOwnedProject(submissionOptions.projectId || message?.projectId);
        const existingFiles = Array.isArray(workspaceArtifact?.files) && workspaceArtifact.files.length
          ? workspaceArtifact.files
          : Array.isArray(message?.files) && message.files.length
            ? message.files
            : message?.code
              ? [{ name: message.title || "Script", content: message.code }]
            : [];

        const fileAttachments = existingFiles.map((f) => ({
          name: `${f.name || "file"}${/\.lua$/i.test(f.name || "") ? "" : ".lua"}`,
          type: "text/x-lua",
          data: String(f.content || ""),
          isImage: false,
        }));

        const augmentedPrompt = existingFiles.length
          ? `You are refining an existing multi-file Roblox project (its current files are attached). Apply this change:\n\n${refinePrompt}\n\nReturn the full updated set of files. Modify only what's necessary and keep unaffected files intact, preserving their structure and placement.`
          : refinePrompt;

        await runGeneration(
          activeChatId,
          message?.classification || "project",
          augmentedPrompt,
          fileAttachments,
          workspaceArtifact,
          submissionOptions
        );
      } catch (err) {
        console.error("Refine error:", err);
        notify?.({ message: err?.message || "Refine failed. You can try again.", type: "error" });
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
  };
}
