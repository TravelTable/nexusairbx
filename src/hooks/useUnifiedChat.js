import { useCallback, useMemo } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { v4 as uuidv4 } from "uuid";
import { useAiChat } from "./useAiChat";
import { useUiBuilder } from "./useUiBuilder";
import { useAgent } from "./useAgent";

const AGENT_PLACEHOLDER = {
  role: "assistant",
  content: "",
  thought: "Nexus is thinking...",
  prompt: "",
};

/**
 * Single source of truth for "generating" and "pending" state across chat, UI, and agent.
 * AiPage and ChatView should consume only isGenerating, pendingMessage, generationStage from this hook.
 *
 * Dual-stream behavior: the backend has two flows — (1) POST /api/generate/artifact + GET /api/generate/stream
 * for chat/agent, and (2) UI pipeline (e.g. /api/ui-builder/ai/pipeline/stream) for UI generation. A single
 * user request can trigger both (e.g. /ui triggers UI + chat in parallel). This hook merges their
 * generating/pending state so the client always shows one "working" and one "done" state per request.
 */
export function useUnifiedChat(user, settings, refreshBilling, notify, options = {}) {
  const {
    onSuggestAssets,
    onUiAudit,
    onSignInNudge,
    getModeLabel = (id) => id,
  } = options;

  const chat = useAiChat(user, settings, refreshBilling, notify);
  const ui = useUiBuilder(user, settings, refreshBilling, notify);
  const agent = useAgent(user, notify, refreshBilling);

  const isGenerating =
    chat.isGenerating || ui.uiIsGenerating || agent.isThinking;

  const pendingMessage = useMemo(() => {
    if (chat.pendingMessage) return chat.pendingMessage;
    if (ui.pendingMessage) return ui.pendingMessage;
    if (agent.isThinking) return AGENT_PLACEHOLDER;
    return null;
  }, [chat.pendingMessage, ui.pendingMessage, agent.isThinking]);

  const generationStage = useMemo(() => {
    if (chat.generationStage) return chat.generationStage;
    if (ui.generationStage) return ui.generationStage;
    if (agent.isThinking) return "Nexus is thinking...";
    return "";
  }, [chat.generationStage, ui.generationStage, agent.isThinking]);

  const handleSubmit = useCallback(
    async (currentPrompt, currentAttachments = [], submitOptions = {}) => {
      const prompt = (currentPrompt || "").trim();
      if (!prompt && currentAttachments.length === 0) {
        if (!user && onSignInNudge) onSignInNudge();
        return;
      }
      if (!user) {
        if (onSignInNudge) onSignInNudge();
        return;
      }

      let effectiveMode = chat.activeMode;
      const commandMap = {
        "/ui": "ui",
        "/audit": "security",
        "/optimize": "performance",
        "/logic": "logic",
      };
      for (const [cmd, mode] of Object.entries(commandMap)) {
        if (prompt.startsWith(cmd)) {
          effectiveMode = mode;
          chat.updateChatMode(chat.currentChatId, mode);
          break;
        }
      }

      const requestId = uuidv4();
      let activeChatId = chat.currentChatId;

      try {
        // Create chat doc first, then open it (race-free: next send uses this id)
        if (!activeChatId) {
          const newChatRef = await addDoc(
            collection(db, "users", user.uid, "chats"),
            {
              title: prompt.slice(0, 30) + (prompt.length > 30 ? "..." : ""),
              activeMode: effectiveMode,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            }
          );
          activeChatId = newChatRef.id;
          chat.openChatById(activeChatId);
        }

        chat.setPendingMessage({
          role: "assistant",
          content: "",
          type: "chat",
          prompt,
          mode: chat.chatMode,
          attachments: currentAttachments,
        });

        const p = prompt.toLowerCase();
        const isUiRequest =
          p.startsWith("/ui") ||
          ["build ui", "menu", "screen", "hud", "shop", "layout", "frame"].some(
            (k) => p.includes(k)
          );
        const isRefineRequest =
          p.startsWith("refine:") ||
          p.startsWith("tweak:") ||
          p.includes("refine ui");

        if (isUiRequest && !isRefineRequest) {
          const uiPromise = ui.handleGenerateUiPreview(
            prompt.replace(/^\/ui\s*/i, ""),
            activeChatId,
            chat.setCurrentChatId,
            null,
            requestId,
            currentAttachments
          );
          const chatPromise = chat.handleSubmit(
            prompt,
            activeChatId,
            requestId,
            null,
            false,
            currentAttachments
          );
          await Promise.all([uiPromise, chatPromise]);
          return;
        }

        if (isRefineRequest) {
          if (!ui.activeUi?.lua) {
            await ui.handleGenerateUiPreview(
              prompt.replace(/^(refine|tweak):\s*/i, ""),
              activeChatId,
              chat.setCurrentChatId,
              null,
              requestId,
              currentAttachments
            );
          } else {
            await ui.handleRefine(
              prompt.replace(/^(refine|tweak):\s*/i, ""),
              null,
              currentAttachments
            );
          }
          return;
        }

        const data = await agent.sendMessage(
          prompt,
          activeChatId,
          chat.setCurrentChatId,
          requestId,
          effectiveMode,
          chat.chatMode,
          currentAttachments,
          chat.messages
        );

        if (!data) {
          notify({
            message: "Agent didn't respond. Sending as chat instead.",
            type: "info",
          });
          await chat.handleSubmit(
            prompt,
            activeChatId,
            requestId,
            null,
            false,
            currentAttachments
          );
          return;
        }

        if (data.suggestedMode) {
          chat.updateChatMode(activeChatId, data.suggestedMode);
          const modeLabel = getModeLabel(data.suggestedMode);
          notify({
            message: `Switched to ${modeLabel} for this task.`,
            type: "info",
          });
        }

        switch (data.action) {
          case "pipeline":
            await Promise.all([
              ui.handleGenerateUiPreview(
                data.parameters?.prompt || prompt,
                activeChatId,
                chat.setCurrentChatId,
                data.parameters?.specs || null,
                requestId
              ),
              chat.handleSubmit(prompt, activeChatId, requestId),
            ]);
            break;
          case "refine":
            if (!ui.activeUi?.lua) {
              await ui.handleGenerateUiPreview(
                data.parameters?.instruction || prompt,
                activeChatId,
                chat.setCurrentChatId,
                data.parameters?.specs || null,
                requestId
              );
            } else {
              await ui.handleRefine(data.parameters?.instruction || prompt);
            }
            break;
          case "suggest_assets":
            if (onSuggestAssets) {
              await onSuggestAssets(data.parameters?.prompt || prompt, ui);
            }
            await chat.handleSubmit(prompt, activeChatId, requestId);
            break;
          case "lint":
            if (onUiAudit) await onUiAudit(ui);
            await chat.handleSubmit(prompt, activeChatId, requestId);
            break;
          case "plan":
            chat.setTasks(data.tasks || []);
            await chat.handleSubmit(prompt, activeChatId, requestId);
            break;
          case "code":
            await chat.handleSubmit(
              data.parameters?.prompt || prompt,
              activeChatId,
              requestId,
              null,
              false,
              currentAttachments
            );
            break;
          default:
            await chat.handleSubmit(prompt, activeChatId, requestId);
        }
      } catch (err) {
        console.error("Routing error:", err);
        notify({
          message: err?.message || "Generation failed. You can try again.",
          type: "error",
        });
        try {
          await chat.handleSubmit(prompt, activeChatId, requestId);
        } catch (fallbackErr) {
          console.error("Fallback chat submit failed:", fallbackErr);
          notify({
            message: "Generation failed. You can try again.",
            type: "error",
          });
        }
      }
    },
    [
      user,
      chat,
      ui,
      agent,
      notify,
      onSuggestAssets,
      onUiAudit,
      onSignInNudge,
      getModeLabel,
    ]
  );

  return {
    ...chat,
    isGenerating,
    pendingMessage,
    generationStage,
    handleSubmit,
    ui,
    agent,
  };
}
