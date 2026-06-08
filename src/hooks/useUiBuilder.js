import { useState, useCallback, useEffect } from "react";
import { 
  doc, 
  collection, 
  setDoc, 
  serverTimestamp, 
  addDoc 
} from "firebase/firestore";
import { db } from "../firebase";
import { v4 as uuidv4 } from "uuid";
import { aiPipeline, aiPipelineStream, aiRefineLua, exportLua } from "../lib/uiBuilderApi";
import { cryptoRandomId } from "../lib/versioning";
import { formatNumber } from "../lib/aiUtils";
import { AI_EVENTS, onAiEvent } from "../lib/aiEvents";

export function useUiBuilder(user, settings, refreshBilling, notify) {
  const [uiGenerations, setUiGenerations] = useState([]);
  const [activeUiId, setActiveUiId] = useState(null);
  const [uiIsGenerating, setUiIsGenerating] = useState(false);
  const [uiDrawerOpen, setUiDrawerOpen] = useState(false);
  const [generationStage, setGenerationStage] = useState("");
  const [pendingMessage, setPendingMessage] = useState(null);

  // Listen for UI generation completion from the chat stream
  useEffect(() => {
    const handleUiGenerated = (e) => {
      const data = e.detail;
      if (data.projectId) {
        const entry = { 
          id: data.projectId, 
          createdAt: Date.now(), 
          prompt: data.title || "Generated UI", 
          uiModuleLua: data.uiModuleLua || data.content, // Fallback for old data
          systemsLua: data.systemsLua || "",
          files: Array.isArray(data.files) ? data.files : [],
          versionNumber: data.versionNumber 
        };
        setUiGenerations((prev) => [entry, ...(prev || [])]);
        setActiveUiId(data.projectId);
      }
    };
    const unbind = onAiEvent(AI_EVENTS.UI_GENERATED, handleUiGenerated);
    return () => unbind();
  }, []);

  const activeUi = uiGenerations.find((g) => g.id === activeUiId) || uiGenerations[0] || null;

  const refreshLua = useCallback(async (boardState) => {
    if (!user || !boardState) return;
    try {
      const token = await user.getIdToken();
      const data = await exportLua({ token, boardState });
      if (data.lua && activeUiId) {
        setUiGenerations(prev => prev.map(g => g.id === activeUiId ? { ...g, uiModuleLua: data.lua, boardState } : g));
      }
    } catch (e) {
      notify({ message: "Failed to update Lua code", type: "error" });
    }
  }, [user, activeUiId, notify]);

  const handleRefine = useCallback(async (instruction, existingRequestId = null, attachments = []) => {
    if (!activeUi?.uiModuleLua || !user) return;
    setUiIsGenerating(true);
    try {
      const token = await user.getIdToken();
      
      let enhancedInstruction = instruction;
      if (activeUi.uiModuleLua.includes("rbxassetid://") && !activeUi.uiModuleLua.includes("rbxassetid://0")) {
        enhancedInstruction += " (IMPORTANT: Preserve all existing rbxassetid links, do not revert them to placeholders)";
      }

      const data = await aiRefineLua({
        token,
        lua: activeUi.uiModuleLua,
        instruction: enhancedInstruction,
        boardState: activeUi.boardState,
        attachments: attachments.map(a => ({ name: a.name, type: a.type, data: a.data, isImage: a.isImage }))
      });

      if (data.uiModuleLua || data.lua) {
        const id = cryptoRandomId();
        setUiGenerations((prev) => [
          { 
            id, 
            uiModuleLua: data.uiModuleLua || data.lua, 
            systemsLua: data.systemsLua || "",
            boardState: data.boardState || activeUi.boardState,
            prompt: `Refine: ${instruction}`, 
            createdAt: Date.now() 
          },
          ...prev,
        ]);
        setActiveUiId(id);
        const tokenMsg = data.tokensConsumed ? ` (${formatNumber(data.tokensConsumed)} tokens used)` : "";
        notify({ message: `UI refined successfully${tokenMsg}`, type: "success" });
        refreshBilling();
      }
    } catch (e) {
      notify({ message: "Refinement failed", type: "error" });
    } finally {
      setUiIsGenerating(false);
    }
  }, [activeUi, user, notify, refreshBilling]);

  const handleGenerateUiPreview = async (prompt, currentChatId, setCurrentChatId, specs = null, existingRequestId = null, attachments = []) => {
    const content = prompt.trim();
    if (!content && attachments.length === 0) return;
    if (!user) return;

    setUiIsGenerating(true);
    setPendingMessage({ role: "assistant", content: "", type: "ui", prompt: content });
    setGenerationStage("Planning Layout...");
    
    let activeChatId = currentChatId;
    const requestId = existingRequestId || uuidv4();
    const tempId = `stream-${requestId}`;
    let tempCreated = false;

    try {
      const token = await user.getIdToken();
      const canvasSize = settings.uiCanvasSize || { w: 1280, h: 720 };
      const maxItems = Number(settings.uiMaxItems || 45);

      if (!activeChatId) {
        const newChatRef = await addDoc(collection(db, "users", user.uid, "chats"), {
          title: content.slice(0, 30) + (content.length > 30 ? "..." : ""),
          activeMode: "ui",
          createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
        });
        activeChatId = newChatRef.id;
        setCurrentChatId(activeChatId);
      }

      if (!existingRequestId) {
        const userMsgRef = doc(db, "users", user.uid, "chats", activeChatId, "messages", `${requestId}-user`);
        await setDoc(userMsgRef, { role: "user", content: content, createdAt: serverTimestamp(), requestId });
      }

      // Persist the final artifact and reconcile the in-memory list (replacing the
      // streaming placeholder, if any). Shared by the streaming + fallback paths.
      const saveUiResult = async (data, { replaceId } = {}) => {
        const { boardState, uiModuleLua, systemsLua, tokensConsumed, warnings } = data;

        const scriptId = cryptoRandomId();
        const resultTitle = content.slice(0, 30) + " (UI)";

        await setDoc(doc(db, "users", user.uid, "scripts", scriptId), {
          title: resultTitle, chatId: activeChatId, type: "ui", updatedAt: serverTimestamp(), createdAt: serverTimestamp(),
        });

        const versionId = uuidv4();
        await setDoc(doc(db, "users", user.uid, "scripts", scriptId, "versions", versionId), {
          uiModuleLua: uiModuleLua || "",
          systemsLua: systemsLua || "",
          title: resultTitle,
          versionNumber: 1,
          createdAt: serverTimestamp(),
        });

        const assistantMsgRef = doc(db, "users", user.uid, "chats", activeChatId, "messages", `${requestId}-assistant`);
        await setDoc(assistantMsgRef, {
          role: "assistant",
          content: "",
          uiModuleLua: uiModuleLua || "",
          systemsLua: systemsLua || "",
          projectId: scriptId,
          versionNumber: 1,
          metadata: {
            type: "ui",
            seed: requestId,
            validationWarnings: warnings || [],
          },
          createdAt: serverTimestamp(),
          requestId,
        });

        const entry = { id: scriptId, requestId, createdAt: Date.now(), prompt: content, boardState, uiModuleLua, systemsLua };
        setUiGenerations((prev) => [
          entry,
          ...prev.filter(g => g.requestId !== requestId && g.id !== replaceId),
        ]);
        setActiveUiId(scriptId);

        const tokenMsg = tokensConsumed ? ` (${formatNumber(tokensConsumed)} tokens used)` : "";
        notify({ message: `UI generated and saved.${tokenMsg}`, type: "success" });
        refreshBilling();
      };

      // Progressive streaming path. Skipped when attachments are present (the
      // stream endpoint doesn't accept them). Falls back to POST on any error
      // before completion.
      const canStream = attachments.length === 0;
      let streamedDone = false;

      if (canStream) {
        setUiGenerations((prev) => [
          { id: tempId, requestId, createdAt: Date.now(), prompt: content, boardState: { canvasSize, items: [] }, uiModuleLua: "", systemsLua: "", streaming: true },
          ...prev.filter(g => g.requestId !== requestId),
        ]);
        tempCreated = true;
        setActiveUiId(tempId);
        setUiDrawerOpen(true);

        try {
          await new Promise((resolve, reject) => {
            aiPipelineStream({
              token,
              prompt: content,
              canvasSize,
              maxItems,
              gameSpec: settings.gameSpec || "",
              maxSystemsTokens: settings.uiMaxSystemsTokens,
              onStage: (d) => setGenerationStage(d?.message || ""),
              onPartialBoard: (bs) => {
                if (!bs) return;
                setUiGenerations((prev) => prev.map(g => g.id === tempId ? { ...g, boardState: bs } : g));
              },
              onBoardState: (bs) => {
                if (!bs) return;
                setUiGenerations((prev) => prev.map(g => g.id === tempId ? { ...g, boardState: bs } : g));
              },
              onDone: async (data) => {
                try {
                  await saveUiResult(data, { replaceId: tempId });
                  streamedDone = true;
                  resolve();
                } catch (err) {
                  reject(err);
                }
              },
              onError: (err) => reject(new Error(err?.message || "UI streaming failed")),
            }).catch(reject);
          });
        } catch (streamErr) {
          console.error("UI stream failed, falling back to POST pipeline:", streamErr);
          setUiGenerations((prev) => prev.filter(g => g.id !== tempId));
          tempCreated = false;
        }
      }

      // Non-streaming fallback: attachments present, or streaming failed pre-done.
      if (!streamedDone) {
        setGenerationStage("Planning Layout...");
        let data;
        try {
          data = await aiPipeline({
            token,
            prompt: content,
            canvasSize,
            maxItems,
            gameSpec: settings.gameSpec || "",
            maxSystemsTokens: settings.uiMaxSystemsTokens,
            attachments: attachments.map(a => ({ name: a.name, type: a.type, data: a.data, isImage: a.isImage }))
          });
        } catch (err) {
          console.error("AI Pipeline error:", err);
          throw new Error(err.message || "UI generation request failed");
        }
        await saveUiResult(data, { replaceId: tempId });
      }

      setUiIsGenerating(false);
      setPendingMessage(null);
      setGenerationStage("");
      setUiDrawerOpen(true);

    } catch (e) {
      if (tempCreated) setUiGenerations((prev) => prev.filter(g => g.id !== tempId));
      notify({ message: e?.message || "UI generation failed", type: "error" });
      setUiIsGenerating(false);
      setPendingMessage(null);
      setGenerationStage("");
    }
  };

  const updateActiveUi = useCallback((updates) => {
    if (!activeUiId) return;
    setUiGenerations(prev => prev.map(g => {
      if (g.id === activeUiId) {
        return { ...g, ...updates };
      }
      return g;
    }));
  }, [activeUiId]);

  return {
    uiGenerations,
    setUiGenerations,
    activeUiId,
    setActiveUiId,
    uiIsGenerating,
    setUiIsGenerating,
    uiDrawerOpen,
    setUiDrawerOpen,
    generationStage,
    setGenerationStage,
    pendingMessage,
    setPendingMessage,
    activeUi,
    handleRefine,
    handleGenerateUiPreview,
    refreshLua,
    updateActiveUi
  };
}
