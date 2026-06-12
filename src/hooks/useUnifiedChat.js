import { useCallback, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { v4 as uuidv4 } from "uuid";
import { useAiChat } from "./useAiChat";
import { orchestrate, approveWorkflowPlan } from "../lib/workflowApi";

const THINKING_PLACEHOLDER = {
  role: "assistant",
  content: "",
  thought: "Understanding your task...",
  prompt: "",
  stage: "Understanding your task...",
};

/**
 * Linear product loop for the code-first /ai workspace:
 *   Task -> Orchestrate (Clarify OR Plan) -> Approve -> Generate multi-file artifact -> Review -> Refine
 *
 * handleSubmit only ever orchestrates. Generation is triggered exclusively by
 * approving a plan, which now ALWAYS runs the artifact job worker (script,
 * project, and ui all produce a normalized multi-file Roblox artifact).
 */
export function useUnifiedChat(user, settings, refreshBilling, notify, options = {}) {
  const { onSignInNudge } = options;

  const chat = useAiChat(user, settings, refreshBilling, notify);

  const [flowBusy, setFlowBusy] = useState(false);

  const isGenerating = chat.isGenerating || flowBusy;

  const pendingMessage = useMemo(() => {
    if (chat.pendingMessage) return chat.pendingMessage;
    if (flowBusy) return THINKING_PLACEHOLDER;
    return null;
  }, [chat.pendingMessage, flowBusy]);

  const generationStage = useMemo(() => {
    if (chat.generationStage) return chat.generationStage;
    if (flowBusy) return "Understanding your task...";
    return "";
  }, [chat.generationStage, flowBusy]);

  // Ensure a chat exists, returning its id (creating + opening if needed).
  const ensureChat = useCallback(
    async (titleSeed) => {
      let activeChatId = chat.currentChatId;
      if (!activeChatId) {
        const newChatRef = await addDoc(collection(db, "users", user.uid, "chats"), {
          title: titleSeed.slice(0, 30) + (titleSeed.length > 30 ? "..." : ""),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        activeChatId = newChatRef.id;
        chat.openChatById(activeChatId);
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
    async (activeChatId, requestId, content) => {
      await setDoc(
        doc(db, "users", user.uid, "chats", activeChatId, "messages", `${requestId}-user`),
        { role: "user", content, createdAt: serverTimestamp(), requestId }
      );
      await touchChat(activeChatId, content);
    },
    [user, touchChat]
  );

  const writeOrchestrationResult = useCallback(
    async (activeChatId, requestId, decision, originPrompt, attachments) => {
      const attMeta = (attachments || []).map((a) => ({
        name: a.name,
        type: a.type,
        data: a.data,
        isImage: a.isImage,
      }));

      if (decision.status === "needs_clarification") {
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
          planSteps: Array.isArray(decision.planSteps) ? decision.planSteps : [],
          originPrompt,
          attachments: attMeta,
          createdAt: serverTimestamp(),
          requestId,
        }
      );
      await touchChat(activeChatId, decision.aiSummary || "Build plan ready");
    },
    [user, touchChat]
  );

  // Dispatch generation for an approved plan. All classifications now run the
  // artifact job worker in "act" mode to produce a multi-file Roblox artifact.
  const runGeneration = useCallback(
    async (activeChatId, classification, prompt, attachments) => {
      const requestId = uuidv4();
      await chat.handleSubmit(prompt, activeChatId, requestId, null, true, attachments);
    },
    [chat]
  );

  // Stage 1: every prompt goes through orchestration first.
  const handleSubmit = useCallback(
    async (currentPrompt, currentAttachments = []) => {
      const prompt = (currentPrompt || "").trim();
      if (!prompt && currentAttachments.length === 0) {
        if (!user && onSignInNudge) onSignInNudge();
        return;
      }
      if (!user) {
        onSignInNudge?.();
        return;
      }
      if (isGenerating) return;

      const requestId = uuidv4();
      setFlowBusy(true);
      try {
        const activeChatId = await ensureChat(prompt || "New build");
        await writeUserMessage(activeChatId, requestId, prompt);

        const decision = await orchestrate({
          prompt,
          history: chat.messages,
          attachments: currentAttachments,
        });

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
        setFlowBusy(false);
      }
    },
    [
      user,
      isGenerating,
      onSignInNudge,
      ensureChat,
      writeUserMessage,
      writeOrchestrationResult,
      chat.messages,
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
      setFlowBusy(true);
      try {
        const activeChatId = chat.currentChatId;
        if (!activeChatId) return;

        const answerText = Object.entries(answers || {})
          .filter(([, v]) => v != null && String(v).trim() !== "")
          .map(([k, v]) => `${k}: ${v}`)
          .join("\n");
        if (answerText) await writeUserMessage(activeChatId, requestId, answerText);

        await updateDoc(
          doc(db, "users", user.uid, "chats", activeChatId, "messages", message.id),
          { stage: "clarify_answered", answers: answers || {}, updatedAt: serverTimestamp() }
        );

        const decision = await orchestrate({
          prompt,
          answers,
          history: chat.messages,
          attachments,
        });

        await writeOrchestrationResult(activeChatId, requestId, decision, prompt, attachments);
      } catch (err) {
        console.error("Clarify error:", err);
        notify?.({ message: err?.message || "Could not continue", type: "error" });
      } finally {
        setFlowBusy(false);
      }
    },
    [user, isGenerating, chat.currentChatId, chat.messages, writeUserMessage, writeOrchestrationResult, notify]
  );

  // Stage 3 (plan): user approves the plan -> generate.
  const approvePlan = useCallback(
    async (message) => {
      if (!user || !message?.planId) return;
      if (isGenerating) return;

      const activeChatId = chat.currentChatId;
      if (!activeChatId) return;

      try {
        await approveWorkflowPlan(message.planId);
        await updateDoc(
          doc(db, "users", user.uid, "chats", activeChatId, "messages", message.id),
          { stage: "plan_approved", updatedAt: serverTimestamp() }
        );
        await runGeneration(
          activeChatId,
          message.classification || "script",
          message.originPrompt || "",
          message.attachments || []
        );
      } catch (err) {
        console.error("Approve/generate error:", err);
        notify?.({ message: err?.message || "Build failed. You can try again.", type: "error" });
      }
    },
    [user, isGenerating, chat.currentChatId, runGeneration, notify]
  );

  // Stage 5 (refine): re-run generation with a refinement instruction, passing
  // the existing generated files as context so the agent EDITS rather than
  // regenerates everything from scratch.
  const refineArtifact = useCallback(
    async (message, refinePrompt) => {
      if (!user || !refinePrompt) return;
      if (isGenerating) return;

      const activeChatId = chat.currentChatId;
      if (!activeChatId) return;

      try {
        const existingFiles = Array.isArray(message?.files) && message.files.length
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
          fileAttachments
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
    handleSubmit,
    submitClarifyAnswers,
    approvePlan,
    refineArtifact,
  };
}
