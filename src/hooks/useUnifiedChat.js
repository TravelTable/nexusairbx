import { useCallback, useMemo, useRef, useState } from "react";
import {
  addDoc,
  collection,
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
import { getStudioEnabledPreference } from "../lib/agentSteps";
import { getStudioStatus } from "../lib/studioBridgeApi";
import {
  getStudioConnectionType,
  getStudioSessionId,
  selectStudioSession,
} from "../lib/studioConnection";
import {
  describeChatAttachments,
  messageToConversationEntry,
  normalizeChatAttachments,
} from "../lib/chatAttachments";

function seedOrchestrationStream(stage = "Understanding your task...") {
  return applyStreamActivity(createPendingStreamState(), {
    type: "stage",
    text: stage,
    status: stage,
  });
}

function buildOrchestrationPending(state, stage) {
  return {
    role: "assistant",
    content: "",
    stage,
    streamState: getPendingStreamSnapshot(state),
  };
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
  const [flowBusyChats, setFlowBusyChats] = useState({}); // chatId -> bool
  const [orchestrationPendingByChat, setOrchestrationPendingByChat] = useState({});
  const orchestrationStreamRef = useRef({});
  const newChatPromiseRef = useRef(null);
  const submitLocksRef = useRef({});
  const setFlowBusyForChat = useCallback((chatId, value) => {
    if (!chatId) return;
    setFlowBusyChats((prev) => {
      if (Boolean(prev[chatId]) === Boolean(value)) return prev;
      return { ...prev, [chatId]: value };
    });
  }, []);

  const flowBusy = !!flowBusyChats[chat.currentChatId];

  const publishOrchestrationStage = useCallback((chatId, label) => {
    if (!chatId || !label) return;
    orchestrationStreamRef.current[chatId] = applyStreamActivity(
      orchestrationStreamRef.current[chatId] || createPendingStreamState(),
      {
        id: `stage-${stageSlug(label)}`,
        type: "stage",
        text: label,
        status: label,
      }
    );
    const pending = {
      role: "assistant",
      content: "",
      stage: label,
      streamState: getPendingStreamSnapshot(orchestrationStreamRef.current[chatId]),
    };
    setOrchestrationPendingByChat((prev) => ({ ...prev, [chatId]: pending }));
  }, []);

  const beginOrchestrationPending = useCallback((chatId) => {
    const state = seedOrchestrationStream();
    orchestrationStreamRef.current[chatId] = state;
    setOrchestrationPendingByChat((prev) => ({
      ...prev,
      [chatId]: buildOrchestrationPending(state, "Understanding your task..."),
    }));
  }, []);

  const clearOrchestrationPending = useCallback((chatId) => {
    if (!chatId) return;
    delete orchestrationStreamRef.current[chatId];
    setOrchestrationPendingByChat((prev) => {
      if (!prev[chatId]) return prev;
      const next = { ...prev };
      delete next[chatId];
      return next;
    });
  }, []);

  const isGenerating = chat.isGenerating || flowBusy;

  const pendingMessage = useMemo(() => {
    if (chat.pendingMessage) return chat.pendingMessage;
    if (flowBusy && chat.currentChatId) {
      return orchestrationPendingByChat[chat.currentChatId]
        || buildOrchestrationPending(seedOrchestrationStream(), "Understanding your task...");
    }
    return null;
  }, [chat.pendingMessage, chat.currentChatId, flowBusy, orchestrationPendingByChat]);

  const generationStage = useMemo(() => {
    if (chat.generationStage) return chat.generationStage;
    if (flowBusy) {
      return orchestrationPendingByChat[chat.currentChatId]?.stage || "Understanding your task...";
    }
    return "";
  }, [chat.generationStage, chat.currentChatId, flowBusy, orchestrationPendingByChat]);

  // Chats with any in-flight work (orchestration or generation) — for sidebar badges.
  const generatingChatIds = useMemo(() => {
    const set = new Set(chat.generatingChatIds || []);
    Object.keys(flowBusyChats).forEach((id) => {
      if (flowBusyChats[id]) set.add(id);
    });
    return Array.from(set);
  }, [chat.generatingChatIds, flowBusyChats]);

  // Ensure a chat exists, returning its id (creating + opening if needed).
  const ensureChat = useCallback(
    async (titleSeed) => {
      let activeChatId = chat.currentChatId;
      if (!activeChatId) {
        if (!newChatPromiseRef.current) {
          newChatPromiseRef.current = (async () => {
            const seed = String(titleSeed || "New chat");
            const newChatRef = await addDoc(collection(db, "users", user.uid, "chats"), {
              title: seed.slice(0, 30) + (seed.length > 30 ? "..." : ""),
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            chat.openChatById(newChatRef.id);
            return newChatRef.id;
          })().finally(() => {
            newChatPromiseRef.current = null;
          });
        }
        activeChatId = await newChatPromiseRef.current;
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

  const writeOrchestrationResult = useCallback(
    async (activeChatId, requestId, decision, originPrompt, attachments) => {
      const attMeta = normalizeChatAttachments(attachments);

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
          classification: decision.classification || "script",
          aiSummary: decision.aiSummary || "",
          aiSteps: Array.isArray(decision.aiSteps) ? decision.aiSteps : [],
          aiAssumptions: Array.isArray(decision.aiAssumptions) ? decision.aiAssumptions : [],
          planMarkdown: decision.planMarkdown || "",
          planSteps: Array.isArray(decision.planSteps) ? decision.planSteps : [],
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
    async (activeChatId, classification, prompt, attachments, baseArtifact = null) => {
      const requestId = uuidv4();
      await chat.handleSubmit(prompt, activeChatId, requestId, null, true, attachments, baseArtifact);
    },
    [chat]
  );

  const approvePlanInternal = useCallback(
    async (message, baseArtifact = null) => {
      if (!user || !message?.planId) return;
      if (isGenerating) return;

      const activeChatId = chat.currentChatId;
      if (!activeChatId) return;

      await approveWorkflowPlan(message.planId);
      void trackProductEvent("plan_approved", {
        generator_mode: chat.activeMode || "agent",
        output_type: message.classification || "script",
        prompt_category: categorizePrompt(message.originPrompt || ""),
      }, { dedupeKey: `plan_approved:${message.planId}` });
      await updateDoc(
        doc(db, "users", user.uid, "chats", activeChatId, "messages", message.id),
        { stage: "plan_approved", updatedAt: serverTimestamp() }
      );
      await runGeneration(
        activeChatId,
        message.classification || "script",
        message.originPrompt || "",
        message.attachments || [],
        baseArtifact
      );
    },
    [user, isGenerating, chat.currentChatId, chat.activeMode, runGeneration]
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
      });

      const studioEnabled = FEATURE_FLAGS.unifiedAgent && getStudioEnabledPreference();
      let studioSessionId = null;
      let studioConnectionType = null;
      if (studioEnabled) {
        try {
          const studioStatus = await getStudioStatus();
          const sessions = studioStatus.sessions || [];
          const activeSession = selectStudioSession(sessions);
          studioSessionId = getStudioSessionId(activeSession);
          studioConnectionType = activeSession
            ? getStudioConnectionType(activeSession)
            : null;
          if (studioSessionId) {
            chat.setPendingForChat(activeChatId, (prev) =>
              prev ? { ...prev, stage: "Reading Studio project..." } : prev
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
          chat.setPendingForChat(activeChatId, (prev) => (prev ? { ...prev, content: snapshot, stage: "" } : prev));
        }
      } catch (err) {
        throw err instanceof Error ? err : new Error(String(err || "Ask request failed"));
      } finally {
        chat.setPendingForChat(activeChatId, null);
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
      if (isGenerating) return;

      const submitLockKey = chat.currentChatId || "__new_chat__";
      if (submitLocksRef.current[submitLockKey]) return;
      submitLocksRef.current[submitLockKey] = true;
      try {
        const titleSeed = prompt || describeChatAttachments(currentAttachments) || "New chat";
        const pendingPlan = [...(chat.messages || [])]
          .reverse()
          .find((m) => m?.stage === "plan" && m.planId);
        if (pendingPlan && isExplicitPlanApproval(prompt)) {
          try {
            await approvePlanInternal(pendingPlan, baseArtifact);
          } catch (err) {
            console.error("Approve/generate error:", err);
            notify?.({ message: err?.message || "Build failed. You can try again.", type: "error" });
          }
          return;
        }

        const requestId = uuidv4();
        let activeChatId = chat.currentChatId;

        // Agent & Debug: Cursor-style. No orchestration, no plan card, no canned
        // stage labels — hand straight to the streaming generation, which emits the
        // model's raw thinking and streams files into the workspace live.
        if (mode === "agent" || mode === "debug") {
          // Conversational gate: don't build files on greetings, questions, or
          // vague chit-chat. Classify locally (zero latency) and only divert
          // non-build messages through the orchestrate flow, which returns a
          // conversation reply or an "Implement it / Discuss first" clarify card.
          // Clear build requests fall through to the fast direct-build path.
          const intent = classifyUserIntent(prompt);
          const conversationalOnly =
            mode === "debug"
              // Debug: keep it narrow so pasted errors / "why is X nil" still fix.
              ? ["GREETING", "GENERAL_QUESTION", "CANCELLATION"].includes(intent)
              : !isImplementationIntent(intent) && !isExplicitPlanApproval(prompt);

          if (prompt && conversationalOnly) {
            try {
              activeChatId = await ensureChat(titleSeed);
              setFlowBusyForChat(activeChatId, true);
              beginOrchestrationPending(activeChatId);
              await writeUserMessage(activeChatId, requestId, prompt, currentAttachments);

              publishOrchestrationStage(activeChatId, "Thinking...");
              const decision = await orchestrate({
                prompt,
                history: chat.messages,
                attachments: currentAttachments,
                mode,
                gameSpec: effectiveGameSpec,
              });

              publishOrchestrationStage(activeChatId, "Preparing response...");
              await writeOrchestrationResult(
                activeChatId,
                requestId,
                decision,
                prompt,
                currentAttachments
              );
            } catch (err) {
              console.error("Conversation error:", err);
              notify?.({ message: err?.message || "Could not respond. You can try again.", type: "error" });
            } finally {
              setFlowBusyForChat(activeChatId, false);
              clearOrchestrationPending(activeChatId);
            }
            return;
          }

          try {
            activeChatId = await ensureChat(titleSeed);
            // existingRequestId=null lets the generation hook write the user
            // message itself, so there is exactly one user bubble.
            await chat.handleSubmit(
              prompt,
              activeChatId,
              null,
              mode,
              true,
              currentAttachments,
              baseArtifact
            );
          } catch (err) {
            console.error("Generation error:", err);
            notify?.({ message: err?.message || "Build failed. You can try again.", type: "error" });
          }
          return;
        }

        // Plan & Ask: keep the orchestrate -> (clarify/plan/conversation) flow.
        try {
          activeChatId = await ensureChat(titleSeed);
          setFlowBusyForChat(activeChatId, true);
          beginOrchestrationPending(activeChatId);
          await writeUserMessage(activeChatId, requestId, prompt, currentAttachments);

          if (mode === "ask") {
            await handleAskSubmit(prompt, currentAttachments, activeChatId, requestId);
            return;
          }

          publishOrchestrationStage(activeChatId, "Analyzing request...");
          const decision = await orchestrate({
            prompt,
            history: chat.messages,
            attachments: currentAttachments,
            mode,
            gameSpec: effectiveGameSpec,
          });

          publishOrchestrationStage(activeChatId, "Preparing response...");
          await writeOrchestrationResult(
            activeChatId,
            requestId,
            decision,
            prompt,
            currentAttachments
          );

        } catch (err) {
          console.error("Orchestration error:", err);
          notify?.({ message: err?.message || "Could not start the build", type: "error" });
        } finally {
          setFlowBusyForChat(activeChatId, false);
          clearOrchestrationPending(activeChatId);
        }
      } finally {
        delete submitLocksRef.current[submitLockKey];
      }
    },
    [
      user,
      isGenerating,
      onSignInNudge,
      ensureChat,
      setFlowBusyForChat,
      beginOrchestrationPending,
      publishOrchestrationStage,
      clearOrchestrationPending,
      chat,
      approvePlanInternal,
      writeUserMessage,
      writeOrchestrationResult,
      handleAskSubmit,
      effectiveGameSpec,
      notify,
    ]
  );

  // Stage 2 (clarify): user answers the questions; re-orchestrate (now produces a plan).
  const submitClarifyAnswers = useCallback(
    async (message, answers) => {
      if (!user || !message) return;
      if (isGenerating) return;

      const prompt = message.originPrompt || "";
      const attachments = message.attachments || [];
      const requestId = uuidv4();
      const activeChatId = chat.currentChatId;
      if (!activeChatId) return;
      setFlowBusyForChat(activeChatId, true);
      beginOrchestrationPending(activeChatId);
      try {

        const answerText = Object.entries(answers || {})
          .filter(([, v]) => v != null && String(v).trim() !== "")
          .map(([k, v]) => `${k}: ${v}`)
          .join("\n");
        if (answerText) await writeUserMessage(activeChatId, requestId, answerText);

        await updateDoc(
          doc(db, "users", user.uid, "chats", activeChatId, "messages", message.id),
          { stage: "clarify_answered", answers: answers || {}, updatedAt: serverTimestamp() }
        );

        publishOrchestrationStage(activeChatId, "Analyzing request...");
        const decision = await orchestrate({
          prompt,
          answers,
          history: chat.messages,
          attachments,
          gameSpec: effectiveGameSpec,
        });

        publishOrchestrationStage(activeChatId, "Preparing response...");
        await writeOrchestrationResult(activeChatId, requestId, decision, prompt, attachments);
      } catch (err) {
        console.error("Clarify error:", err);
        notify?.({ message: err?.message || "Could not continue", type: "error" });
      } finally {
        setFlowBusyForChat(activeChatId, false);
        clearOrchestrationPending(activeChatId);
      }
    },
    [user, isGenerating, chat.currentChatId, chat.messages, effectiveGameSpec, writeUserMessage, writeOrchestrationResult, setFlowBusyForChat, beginOrchestrationPending, publishOrchestrationStage, clearOrchestrationPending, notify]
  );

  // Stage 3 (plan): user approves the plan -> generate.
  const approvePlan = useCallback(
    async (message, baseArtifact = null) => {
      try {
        await approvePlanInternal(message, baseArtifact);
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
    async (message, refinePrompt, workspaceArtifact = null) => {
      if (!user || !refinePrompt) return;
      if (isGenerating) return;

      const activeChatId = chat.currentChatId;
      if (!activeChatId) return;

      try {
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
          workspaceArtifact
        );
      } catch (err) {
        console.error("Refine error:", err);
        notify?.({ message: err?.message || "Refine failed. You can try again.", type: "error" });
      }
    },
    [user, isGenerating, chat.currentChatId, runGeneration, notify]
  );

  return {
    ...chat,
    isGenerating,
    pendingMessage,
    generationStage,
    generatingChatIds,
    handleSubmit,
    submitClarifyAnswers,
    approvePlan,
    refineArtifact,
  };
}
