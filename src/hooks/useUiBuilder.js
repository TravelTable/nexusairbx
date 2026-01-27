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
import { aiPipeline, aiRefineLua, exportLua } from "../lib/uiBuilderApi";
import { cryptoRandomId } from "../lib/versioning";
import { formatNumber } from "../lib/aiUtils";

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
          lua: data.content,
          versionNumber: data.versionNumber 
        };
        setUiGenerations((prev) => [entry, ...(prev || [])]);
        setActiveUiId(data.projectId);
        // setUiDrawerOpen(true); // Removed to prevent premature opening
      }
    };
    window.addEventListener("nexus:uiGenerated", handleUiGenerated);
    return () => window.removeEventListener("nexus:uiGenerated", handleUiGenerated);
  }, []);

  const activeUi = uiGenerations.find((g) => g.id === activeUiId) || uiGenerations[0] || null;

  const refreshLua = useCallback(async (boardState) => {
    if (!user || !boardState) return;
    try {
      const token = await user.getIdToken();
      const data = await exportLua({ token, boardState });
      if (data.lua && activeUiId) {
        setUiGenerations(prev => prev.map(g => g.id === activeUiId ? { ...g, lua: data.lua, boardState } : g));
      }
    } catch (e) {
      notify({ message: "Failed to update Lua code", type: "error" });
    }
  }, [user, activeUiId, notify]);

  const handleRefine = useCallback(async (instruction) => {
    if (!activeUi?.lua || !user) return;
    setUiIsGenerating(true);
    try {
      const token = await user.getIdToken();
      
      let enhancedInstruction = instruction;
      if (activeUi.lua.includes("rbxassetid://") && !activeUi.lua.includes("rbxassetid://0")) {
        enhancedInstruction += " (IMPORTANT: Preserve all existing rbxassetid links, do not revert them to placeholders)";
      }

      const data = await aiRefineLua({
        token,
        lua: activeUi.lua,
        instruction: enhancedInstruction,
      });

      if (data.lua) {
        const id = cryptoRandomId();
        setUiGenerations((prev) => [
          { id, lua: data.lua, prompt: `Refine: ${instruction}`, createdAt: Date.now() },
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

  const handleGenerateUiPreview = async (prompt, currentChatId, setCurrentChatId, specs = null, existingRequestId = null) => {
    const content = prompt.trim();
    if (!content || !user) return;

    setUiIsGenerating(true);
    setPendingMessage({ role: "assistant", content: "", type: "ui", prompt: content });
    setGenerationStage("Planning Layout...");
    
    let activeChatId = currentChatId;
    const requestId = existingRequestId || uuidv4();

    try {
      const token = await user.getIdToken();
      const canvasSize = settings.uiCanvasSize || { w: 1280, h: 720 };
      const maxItems = Number(settings.uiMaxItems || 45);

      if (!activeChatId) {
        const newChatRef = await addDoc(collection(db, "users", user.uid, "chats"), {
          title: content.slice(0, 30) + (content.length > 30 ? "..." : ""),
          createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
        });
        activeChatId = newChatRef.id;
        setCurrentChatId(activeChatId);
      }

      if (!existingRequestId) {
        const userMsgRef = doc(db, "users", user.uid, "chats", activeChatId, "messages", `${requestId}-user`);
        await setDoc(userMsgRef, { role: "user", content: content, createdAt: serverTimestamp(), requestId });
      }

      const data = await aiPipeline({
        token,
        prompt: content,
        canvasSize,
        maxItems,
        gameSpec: settings.gameSpec || "",
        maxSystemsTokens: settings.uiMaxSystemsTokens,
      });

      const { boardState, lua, tokensConsumed, warnings } = data;
      
      const scriptId = cryptoRandomId();
      const resultTitle = content.slice(0, 30) + " (UI)";

      await setDoc(doc(db, "users", user.uid, "scripts", scriptId), {
        title: resultTitle, chatId: activeChatId, type: "ui", updatedAt: serverTimestamp(), createdAt: serverTimestamp(),
      });

      const versionId = uuidv4();
      await setDoc(doc(db, "users", user.uid, "scripts", scriptId, "versions", versionId), {
        code: lua, title: resultTitle, versionNumber: 1, createdAt: serverTimestamp(),
      });

      const assistantMsgRef = doc(db, "users", user.uid, "chats", activeChatId, "messages", `${requestId}-assistant`);
      await setDoc(assistantMsgRef, {
        role: "assistant",
        content: "",
        code: lua,
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

      const entry = { id: scriptId, requestId, createdAt: Date.now(), prompt: content, boardState, lua };
      setUiGenerations((prev) => [entry, ...prev.filter(g => g.requestId !== requestId)]);
      setActiveUiId(scriptId);
      
      const tokenMsg = tokensConsumed ? ` (${formatNumber(tokensConsumed)} tokens used)` : "";
      notify({ message: `UI generated and saved.${tokenMsg}`, type: "success" });
      refreshBilling();
      setUiIsGenerating(false);
      setPendingMessage(null);
      setGenerationStage("");
      setUiDrawerOpen(true); // Open drawer only when fully finished

    } catch (e) {
      notify({ message: e?.message || "UI generation failed", type: "error" });
      setUiIsGenerating(false);
      setPendingMessage(null);
      setGenerationStage("");
    }
  };

  const updateActiveLua = useCallback((newLua) => {
    if (!activeUiId) return;
    setUiGenerations(prev => prev.map(g => g.id === activeUiId ? { ...g, lua: newLua } : g));
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
    updateActiveLua
  };
}
