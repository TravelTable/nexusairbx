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

const BACKEND_URL =
  process.env.REACT_APP_BACKEND_URL || "https://nexusrbx-backend-production.up.railway.app";

/**
 * Deterministic utils (so the same prompt/requestId produces the same catalog order)
 */
function hashStringToSeed(str) {
  // FNV-1a 32-bit
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle(arr, seedStr) {
  const a = Array.isArray(arr) ? [...arr] : [];
  const rng = mulberry32(hashStringToSeed(String(seedStr || "")));
  // Fisher–Yates
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function isPlainObject(v) {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function sanitizeBoardState(raw, { maxItems = 45 } = {}) {
  let bs = raw;

  // Unwrap if nested like { boardState: {...} }
  if (isPlainObject(bs) && isPlainObject(bs.boardState)) bs = bs.boardState;

  const warnings = [];
  if (!isPlainObject(bs)) {
    return { boardState: { items: [] }, warnings: ["boardState is not an object"] };
  }

  const items = Array.isArray(bs.items) ? bs.items : [];
  if (!Array.isArray(bs.items)) warnings.push("boardState.items was not an array");

  const cleanedItems = [];
  for (const it of items) {
    if (!isPlainObject(it)) continue;

    // Minimal required shape
    const hasId = typeof it.id === "string" && it.id.trim().length > 0;
    const hasType = typeof it.type === "string" && it.type.trim().length > 0;

    // Coordinates: allow either numbers (scale or pixels). Just require finite.
    const coords = ["x", "y", "w", "h"];
    const coordsOk = coords.every((k) => Number.isFinite(Number(it[k])));

    if (!hasId || !hasType || !coordsOk) continue;

    // Normalize numbers
    const normalized = {
      ...it,
      id: it.id.trim(),
      type: it.type.trim(),
      x: Number(it.x),
      y: Number(it.y),
      w: Number(it.w),
      h: Number(it.h),
    };

    cleanedItems.push(normalized);
    if (cleanedItems.length >= maxItems) break;
  }

  if (cleanedItems.length !== items.length) {
    warnings.push(`Dropped ${items.length - cleanedItems.length} invalid item(s)`);
  }

  return {
    boardState: {
      ...bs,
      items: cleanedItems,
    },
    warnings,
  };
}

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
      
      // Fetch contextual icons
      let contextualCatalog = specs?.catalog || [];
      try {
        const params = new URLSearchParams();
        params.append("search", content.split(' ').slice(0, 5).join(' '));
        params.append("limit", "25");
        const res = await fetch(`${BACKEND_URL}/api/icons/market?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (data.icons && data.icons.length > 0) {
            const firestoreIcons = data.icons.map(icon => ({
              name: icon.name,
              iconId: icon.imageUrl,
              url: icon.imageUrl, // Ensure url is present for backend
              style: icon.style,
              category: icon.category
            }));
            contextualCatalog = [...contextualCatalog, ...firestoreIcons];
          }
        }
        
        // Deduplicate by iconId/url and shuffle deterministically (seeded)
        const seen = new Set();
        contextualCatalog = contextualCatalog.filter((icon) => {
          const id = icon.iconId || icon.url;
          if (!id) return false;
          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        });

        // Stable shuffle per request so “same requestId => same icons order”
        contextualCatalog = seededShuffle(contextualCatalog, requestId);

      } catch (e) {
        console.warn("Failed to fetch contextual icons:", e);
      }

      const canvasSize = settings.uiCanvasSize || { w: 1280, h: 720 };
      const maxItems = Number(settings.uiMaxItems || 45);
      let themeHint = {
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

      if (!existingRequestId) {
        const userMsgRef = doc(db, "users", user.uid, "chats", activeChatId, "messages", `${requestId}-user`);
        await setDoc(userMsgRef, { role: "user", content: content, createdAt: serverTimestamp(), requestId });
      }

      setGenerationStage("Analyzing Components...");
      const stageTimer = setTimeout(() => setGenerationStage("Writing Luau Code..."), 3000);

      const pipe = await aiPipeline({
        token,
        prompt: `${content} (IMPORTANT: Use the provided icons from the catalog where appropriate.)`,
        canvasSize,
        themeHint,
        maxItems,
        gameSpec: settings.gameSpec || "",
        maxSystemsTokens: settings.uiMaxSystemsTokens,
        catalog: contextualCatalog,
        animations: specs?.animations || "",
        customTheme: specs?.theme || null,
        platforms: specs?.platforms || ["pc"],
        variations: settings.uiVariations || 1,

        // NEW: multi-pass polish loop to fight bland first drafts
        refinerPasses: Number(settings.uiRefinerPasses ?? 2),
        refinerStyle: settings.uiRefinerStyle || "punchy",
      });

      // Handle variations if returned
      const mainResult = pipe.variations ? pipe.variations[0] : pipe;
      const otherVariations = pipe.variations ? pipe.variations.slice(1) : [];

      // Update themeHint with dynamic colors if available
      const specColors = mainResult?.plan?.colors || mainResult?.boardState?.colors;
      if (specColors) {
        themeHint = {
          ...themeHint,
          bg: specColors.primary || themeHint.bg,
          panel: specColors.secondary || themeHint.panel,
          accent: specColors.accent || themeHint.accent,
        };
      }

      clearTimeout(stageTimer);
      setGenerationStage("Finalizing UI...");

      let boardState = mainResult?.boardState;
      if (!boardState) throw new Error("No boardState returned");

      const lua = mainResult?.lua || "";
      if (!lua) throw new Error("No Lua returned");

      // Sanitize boardState so we don't persist garbage
      const sanitized = sanitizeBoardState(boardState, { maxItems });
      boardState = sanitized.boardState;

      if (!Array.isArray(boardState.items) || boardState.items.length === 0) {
        throw new Error(
          `Generated UI is invalid/empty after validation. ${sanitized.warnings.join(" ")}`
        );
      }

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
          variations: otherVariations,
          seed: requestId,
          validationWarnings: sanitized?.warnings || [],
        },
        createdAt: serverTimestamp(),
        requestId,
      });

      const entry = { id: scriptId, createdAt: Date.now(), prompt: content, boardState, lua, variations: otherVariations };
      setUiGenerations((prev) => [entry, ...(prev || [])]);
      setActiveUiId(scriptId);
      
      // Ensure we stay in chat and scroll to the new UI card
      setUiDrawerOpen(false); 
      
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
