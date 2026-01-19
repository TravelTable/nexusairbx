import { useState, useCallback } from "react";
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

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "https://nexusrbx-backend-production.up.railway.app";

export function useUiBuilder(user, settings, refreshBilling, notify) {
  const [uiGenerations, setUiGenerations] = useState([]);
  const [activeUiId, setActiveUiId] = useState(null);
  const [uiIsGenerating, setUiIsGenerating] = useState(false);
  const [uiDrawerOpen, setUiDrawerOpen] = useState(false);
  const [generationStage, setGenerationStage] = useState("");
  const [pendingMessage, setPendingMessage] = useState(null);

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

  const handleGenerateUiPreview = async (prompt, currentChatId, setCurrentChatId, specs = null) => {
    const content = prompt.trim();
    if (!content || !user) return;

    setUiIsGenerating(true);
    setPendingMessage({ role: "assistant", content: "", type: "ui", prompt: content });
    setGenerationStage("Planning Layout...");
    
    let activeChatId = currentChatId;
    const requestId = uuidv4();

    try {
      const token = await user.getIdToken();
      
      // Fetch contextual icons
      let contextualCatalog = specs?.catalog || [];
      try {
        const params = new URLSearchParams();
        params.append("search", content.split(' ').slice(0, 3).join(' '));
        params.append("limit", "15");
        const res = await fetch(`${BACKEND_URL}/api/icons/market?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (data.icons && data.icons.length > 0) {
            const firestoreIcons = data.icons.map(icon => ({
              name: icon.name,
              iconId: icon.imageUrl,
              style: icon.style,
              category: icon.category
            }));
            contextualCatalog = [...contextualCatalog, ...firestoreIcons];
          }
        }
      } catch (e) {
        console.warn("Failed to fetch contextual icons:", e);
      }

      const canvasSize = settings.uiCanvasSize || { w: 1280, h: 720 };
      const maxItems = Number(settings.uiMaxItems || 45);
      const themeHint = {
        bg: "#020617", panel: "#0b1220", border: "#334155", text: "#e5e7eb",
        muted: settings.uiThemeMuted || "#a1a1aa", primary: settings.uiThemePrimary || "#00f5d4",
        secondary: settings.uiThemeSecondary || "#9b5de5", accent: settings.uiThemeAccent || "#f15bb5",
        radius: "12px", font: settings.uiThemeFont || "Poppins, Roboto, sans-serif",
      };

      if (!activeChatId) {
        const newChatRef = await addDoc(collection(db, "users", user.uid, "chats"), {
          title: content.slice(0, 30) + (content.length > 30 ? "..." : ""),
          createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
        });
        activeChatId = newChatRef.id;
        setCurrentChatId(activeChatId);
      }

      const userMsgRef = doc(db, "users", user.uid, "chats", activeChatId, "messages", `${requestId}-user`);
      await setDoc(userMsgRef, { role: "user", content: content, createdAt: serverTimestamp(), requestId });

      setGenerationStage("Analyzing Components...");
      const stageTimer = setTimeout(() => setGenerationStage("Writing Luau Code..."), 3000);

      const pipe = await aiPipeline({
        token, 
        prompt: `${content} (IMPORTANT: Use the provided icons from the catalog where appropriate.)`, 
        canvasSize, themeHint, maxItems,
        gameSpec: settings.gameSpec || "", maxSystemsTokens: settings.uiMaxSystemsTokens,
        catalog: contextualCatalog, animations: specs?.animations || "", customTheme: specs?.theme || null,
        platforms: specs?.platforms || ["pc"],
      });

      clearTimeout(stageTimer);
      setGenerationStage("Finalizing UI...");

      const boardState = pipe?.boardState;
      if (!boardState) throw new Error("No boardState returned");
      const lua = pipe?.lua || "";
      if (!lua) throw new Error("No Lua returned");

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
        role: "assistant", content: "", code: lua, projectId: scriptId, versionNumber: 1,
        metadata: { type: "ui" }, createdAt: serverTimestamp(), requestId,
      });

      const entry = { id: scriptId, createdAt: Date.now(), prompt: content, boardState, lua };
      setUiGenerations((prev) => [entry, ...(prev || [])]);
      setActiveUiId(scriptId);
      setUiDrawerOpen(true);
      
      const tokenMsg = pipe?.tokensConsumed ? ` (${formatNumber(pipe.tokensConsumed)} tokens used)` : "";
      notify({ message: `UI generated and saved.${tokenMsg}`, type: "success" });
      refreshBilling();
    } catch (e) {
      notify({ message: e?.message || "UI generation failed", type: "error" });
    } finally {
      setUiIsGenerating(false);
      setPendingMessage(null);
      setGenerationStage("");
    }
  };

  return {
    uiGenerations,
    setUiGenerations,
    activeUiId,
    setActiveUiId,
    uiIsGenerating,
    uiDrawerOpen,
    setUiDrawerOpen,
    generationStage,
    pendingMessage,
    activeUi,
    handleRefine,
    handleGenerateUiPreview,
    refreshLua
  };
}
