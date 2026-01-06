// src/pages/UiBuilderPage.jsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth } from "./firebase";
import { CanvasProvider, useCanvas } from "../components/canvascomponents/CanvasContext";
import CanvasGrid from "../components/canvascomponents/CanvasGrid";
import CanvasItem from "../components/canvascomponents/CanvasItem";
import { useBilling } from "../context/BillingContext";
import PLAN_INFO from "../lib/planInfo";
import { Info } from "lucide-react";
import { listBoards, getBoard, getSnapshot, listSnapshots, createSnapshot, deleteBoard, aiSuggestImageQueries, robloxCatalogSearch } from "../lib/uiBuilderApi";
import { usePlanningBoard } from "../boards/usePlanningBoard";
import { exportToRoblox } from "../lib/exportToRoblox";
import LayersPanel from "../components/canvascomponents/LayersPanel";

const MONETIZATION_KINDS = [
  { value: "DevProduct", label: "Dev Product" },
  { value: "GamePass", label: "Game Pass" },
  { value: "Subscription", label: "Subscription" },
  { value: "CatalogItem", label: "Catalog Item" },
];

export default function UiBuilderPage() {
  return (
    <CanvasProvider initialCanvasSize={{ w: 1280, h: 720 }}>
      <UiBuilderPageInner />
    </CanvasProvider>
  );
}

function UiBuilderPageInner() {
  const canvasRef = useRef(null);
  const saveTimerRef = useRef(null);
  const lastSavedStringRef = useRef("");
  const skipAutosaveRef = useRef(false);
  const navigate = useNavigate();

  const {
    canvasSize,
    setCanvasSize,
    items,
    setItems,

    selectedId,
    setSelectedId,
    selectedItem,

    showGrid,
    setShowGrid,
    snapToGrid,
    setSnapToGrid,
    gridSize,
    setGridSize,

    // Board palette
    palette,
    activeColor,

    // Builder UI (site)
    uiAccent,
    uiDensity,

    addItem,
    updateItem,
    deleteSelected,
    bringToFront,
    sendToBack,

    clearSelection,
    onPointerMove,
    endPointerAction,
    loadBoardState,
    undo,
    redo,
    canUndo,
    canRedo,

    // Preview runtime
    previewMode,
    setPreviewMode,
    renderItems,
    resetPreview,
    lastMutationKind,
    previewMockPurchase,
    closeMockPurchase,
  } = useCanvas();

  const [boards, setBoards] = useState([]);
  const [loadingBoards, setLoadingBoards] = useState(false);
  const [loadingBoard, setLoadingBoard] = useState(false);
  const [selectedBoardId, setSelectedBoardId] = useState(null);
  const [selectedBoard, setSelectedBoard] = useState(null);
  const [snapshots, setSnapshots] = useState([]);
  const [showVersionsModal, setShowVersionsModal] = useState(false);
  const [user, setUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [newPaletteHex, setNewPaletteHex] = useState("#");
  const {
    boardId,
    setBoardId,
    loading: planningLoading,
    initBoard,
    generateWithAI,
    importFromImage: importBoardFromImage,
    enhanceBoard,
    saveSnapshot,
  } = usePlanningBoard();
  useEffect(() => {
    if (selectedBoardId) setBoardId(selectedBoardId);
  }, [selectedBoardId, setBoardId]);
  // --- AI prompt UI (keep in sidebar so it matches main site flow)
  // Codex: could store prompt history per snapshot to build a timeline.
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);

  // --- Screenshot/Image import (image -> UI)
  const [refImageFile, setRefImageFile] = useState(null);
  const [refImageUrl, setRefImageUrl] = useState("");
  const [rightsMode, setRightsMode] = useState("reference"); // "owned" | "reference"
  const [aiImporting, setAiImporting] = useState(false);
  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [aiStatusMessage, setAiStatusMessage] = useState("");
  const aiBusy = aiGenerating || aiImporting || aiSuggesting;
  const aiStatusText = aiStatusMessage || (aiGenerating ? "Generating UI from prompt..." : aiImporting ? "Importing from screenshot..." : aiSuggesting ? "Suggesting image IDs..." : "");
  const [scaffoldOnly, setScaffoldOnly] = useState(false);

  // Canvas overlay controls for matching screenshot to board while editing
  const [showRefOverlay, setShowRefOverlay] = useState(true);
  const [refOverlayOpacity, setRefOverlayOpacity] = useState(0.28);

  // Billing / tokens
  const billing = useBilling();
  const tokensLeft = Math.max(0, Number(billing?.totalRemaining ?? (billing?.subRemaining ?? 0) + (billing?.paygRemaining ?? 0)));
  const tokensLimit = PLAN_INFO[(billing?.plan || "free").toLowerCase()]?.cap ?? tokensLeft;
  const tokenRefreshTime = billing?.resetsAt || null;
  const tokenPlan = (billing?.plan || "free").toLowerCase();
  const tokenLoading = !!billing?.loading;

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u || null));
    return () => unsub();
  }, []);

  const refreshSnapshots = useCallback(async (boardIdToUse = null) => {
    if (!user) return;
    const targetId = boardIdToUse || selectedBoardId;
    if (!targetId) return;
    try {
      const token = await user.getIdToken();
      const res = await listSnapshots({ token, boardId: targetId });
      setSnapshots(res.snapshots || []);
    } catch (e) {
      console.error("Failed to list snapshots", e);
    }
  }, [selectedBoardId, user]);

  useEffect(() => {
    if (!user) {
      setBoards([]);
      setSelectedBoardId(null);
      setSelectedBoard(null);
      setBoardId(null);
      return;
    }
    (async () => {
      setLoadingBoards(true);
      try {
        const token = await user.getIdToken();
        const res = await listBoards({ token });
        setBoards(res.boards || []);
      } catch (e) {
        console.error("Failed to list boards", e);
      } finally {
        setLoadingBoards(false);
      }
    })();
  }, [user]);

  useEffect(() => {
    if (!user || !selectedBoardId) return;
    (async () => {
      setLoadingBoard(true);
      try {
        const token = await user.getIdToken();
        const res = await getBoard({ token, boardId: selectedBoardId });
        setSelectedBoard(res.board || null);

        if (res.board?.latestSnapshotId) {
          const snap = await getSnapshot({ token, boardId: selectedBoardId, snapshotId: res.board.latestSnapshotId });
          if (snap?.snapshot?.boardState) {
            loadBoardState(snap.snapshot.boardState);
            lastSavedStringRef.current = JSON.stringify(snap.snapshot.boardState);
          }
        } else {
          loadBoardState({ canvasSize: res.board?.canvasSize, settings: res.board?.settings, items: [], selectedId: null });
          lastSavedStringRef.current = JSON.stringify({});
        }
        await refreshSnapshots(selectedBoardId);
      } catch (e) {
        console.error("Failed to load board", e);
      } finally {
        setLoadingBoard(false);
      }
    })();
  }, [user, selectedBoardId, loadBoardState, refreshSnapshots]);
  useEffect(() => {
    if (!selectedBoardId) setSnapshots([]);
  }, [selectedBoardId]);

  // Autosave snapshots
  useEffect(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (!user || !selectedBoardId) return;

    const state = {
      canvasSize,
      items,
      selectedId,
      settings: {
        gridSize,
        showGrid,
        snapToGrid,

        // Palette
        palette,
        activeColor,

        // Builder UI (site)
        uiAccent,
        uiDensity,
      },
    };

    const serialized = JSON.stringify(state);
    if (serialized === lastSavedStringRef.current) return;
    if (lastMutationKind === "undo" || lastMutationKind === "redo") return;
    if (skipAutosaveRef.current) {
      skipAutosaveRef.current = false;
      return;
    }

    saveTimerRef.current = setTimeout(async () => {
      try {
        setSaving(true);
        const token = await user.getIdToken();
        await createSnapshot({ token, boardId: selectedBoardId, boardState: state });
        lastSavedStringRef.current = serialized;
        refreshSnapshots(selectedBoardId);
      } catch (e) {
        console.error("Autosave failed", e);
      } finally {
        setSaving(false);
      }
    }, 800);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [user, selectedBoardId, canvasSize, items, selectedId, showGrid, snapToGrid, gridSize, palette, activeColor, uiAccent, uiDensity, refreshSnapshots, lastMutationKind]);

  const handlePointerMove = (e) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    const px = e.clientX - (rect?.left || 0);
    const py = e.clientY - (rect?.top || 0);
    onPointerMove(px, py);
  };

  const handlePointerUp = () => endPointerAction();

  // --- Drag/drop: drop a Roblox image asset id onto the canvas to create an ImageLabel ---
  const handleCanvasDragOver = (e) => {
    if (previewMode) return;
    e.preventDefault();
    try {
      e.dataTransfer.dropEffect = "copy";
    } catch {}
  };

  const handleCanvasDrop = (e) => {
    if (previewMode) return;
    e.preventDefault();
    const raw = e.dataTransfer?.getData("text/plain") || e.dataTransfer?.getData("text") || "";
    const m = String(raw).match(/(\d{5,})/);
    if (!m) return;
    const assetId = m[1];

    const rect = canvasRef.current?.getBoundingClientRect();
    const px = e.clientX - (rect?.left || 0);
    const py = e.clientY - (rect?.top || 0);

    const w = 240;
    const h = 140;
    const x = Math.round(Math.max(0, Math.min(canvasSize.w - w, px - w / 2)));
    const y = Math.round(Math.max(0, Math.min(canvasSize.h - h, py - h / 2)));

    addItem({
      type: "ImageLabel",
      name: "ImageLabel",
      x,
      y,
      w,
      h,
      fill: "#111827",
      radius: 12,
      stroke: true,
      strokeColor: "#334155",
      strokeWidth: 2,
      text: "",
      textColor: "#ffffff",
      fontSize: 18,
      imageId: `rbxassetid://${assetId}`,
    });
  };

  const patchSelected = (patch) => {
    if (!selectedItem) return;
    updateItem(selectedItem.id, patch);
  };

  function addPrimitive(type) {
    const base =
      type === "TextLabel"
        ? { w: 220, h: 60, text: "TextLabel" }
        : type === "TextButton"
        ? { w: 200, h: 60, text: "Button", onClick: null }
        : type === "ImageLabel"
        ? { w: 240, h: 140, imageId: "rbxassetid://" }
        : { w: 240, h: 140 };

    addItem({
      type,
      name: type,
      x: Math.round((canvasSize.w - base.w) / 2),
      y: Math.round((canvasSize.h - base.h) / 2),
      w: base.w,
      h: base.h,
      fill: type === "TextButton" ? "#1f2937" : "#111827",
      radius: 12,
      stroke: true,
      strokeColor: "#334155",
      strokeWidth: 2,
      text: base.text || "",
      textColor: "#ffffff",
      fontSize: 18,
      imageId: base.imageId || "",
    });
  }

  function addMonetization(kind, preset = {}) {
    const w = 240;
    const h = 64;
    addItem({
      type: "MonetizationButton",
      name: "MonetizationButton",
      x: Math.round((canvasSize.w - w) / 2),
      y: Math.round((canvasSize.h - h) / 2),
      w,
      h,
      fill: "#14532d",
      radius: 12,
      stroke: true,
      strokeColor: "#22c55e",
      strokeWidth: 2,
      text: preset.text || `Buy (${kind})`,
      textColor: "#ffffff",
      fontSize: 18,
      monetizationKind: kind,
      monetizationId: preset.monetizationId ?? "",
    });
  }

  function handleExportLua() {
    if (!items || !items.length) {
      window.alert("Add at least one element before exporting.");
      return;
    }
    const lua = exportToRoblox({ canvasSize, items });
    downloadText("ui.lua", lua);
  }

  const handleUndo = () => {
    skipAutosaveRef.current = true;
    undo();
  };

  const handleRedo = () => {
    skipAutosaveRef.current = true;
    redo();
  };

  async function handleCreateBoard() {
    if (!user) return;
    const title = window.prompt("New board title", "Roblox UI Board");
    if (!title) return;
    try {
      setLoadingBoard(true);
      const res = await initBoard({
        title: title.trim(),
        canvasSize,
        settings: { showGrid, snapToGrid, gridSize },
      });
      const newId = res?.boardId || res?.board?.id || boardId;
      setSelectedBoardId(newId);
      setBoardId(newId || null);
      setSelectedBoard(res.board || null);
      loadBoardState({ canvasSize: res.board?.canvasSize, settings: res.board?.settings, items: [], selectedId: null });
      lastSavedStringRef.current = JSON.stringify({});
      const token = await user.getIdToken();
      const list = await listBoards({ token });
      setBoards(list.boards || []);
    } catch (e) {
      console.error("Create board failed", e);
    } finally {
      setLoadingBoard(false);
    }
  }

  async function handleDeleteBoard(boardIdToDelete) {
    if (!user || !boardIdToDelete) return;
    const ok = window.confirm("Delete this board? Snapshots will also be removed.");
    if (!ok) return;
    try {
      setLoadingBoard(true);
      const token = await user.getIdToken();
      await deleteBoard({ token, boardId: boardIdToDelete });
      setBoards((prev) => prev.filter((b) => b.id !== boardIdToDelete));

      if (selectedBoardId === boardIdToDelete) {
        setSelectedBoardId(null);
        setBoardId(null);
        setSelectedBoard(null);
        setSnapshots([]);
        loadBoardState({ canvasSize, settings: {}, items: [], selectedId: null });
        lastSavedStringRef.current = JSON.stringify({});
      }
    } catch (e) {
      console.error("Delete board failed", e);
      window.alert(e?.message || "Failed to delete board");
    } finally {
      setLoadingBoard(false);
    }
  }

  // --- AI helpers ---
  /**
   * Extract theme tokens so AI output matches your site.
   * Codex: point this at your main AI page wrapper (e.g., #ai-page-root) and ensure CSS vars exist.
   */
  function getSiteThemeHint() {
    const el = document.documentElement;
    const css = getComputedStyle(el);
    const pick = (name, fallback) => (css.getPropertyValue(name) || "").trim() || fallback;
    return {
      bg: pick("--app-bg", "#0b1020"),
      panel: pick("--card-bg", "rgba(15,23,42,0.35)"),
      border: pick("--border", "rgba(148,163,184,0.20)"),
      text: pick("--text", "#e5e7eb"),
      primary: pick("--primary", "#3b82f6"),
      radius: pick("--radius", "12px"),
      font: pick("--font", "system-ui"),
    };
  }

  /**
   * Hard clamp to keep AI output renderable. Whitelist new props here if you extend CanvasItem.
   */
  function sanitizeBoardState(maybeState) {
    const state = (maybeState && typeof maybeState === "object") ? maybeState : {};
    const safeCanvas = state.canvasSize && typeof state.canvasSize === "object"
      ? { w: Number(state.canvasSize.w) || canvasSize.w, h: Number(state.canvasSize.h) || canvasSize.h }
      : { w: canvasSize.w, h: canvasSize.h };

    const normalizeRobloxImage = (input) => {
      if (input == null) return "";
      const s = String(input).trim();
      if (!s) return "";
      if (/^\d+$/.test(s)) return `rbxassetid://${s}`;
      if (s.startsWith("rbxassetid://")) return s;
      const m = s.match(/asset\/\?id=(\d+)/i) || s.match(/id=(\d+)/i);
      if (m?.[1]) return `rbxassetid://${m[1]}`;
      return s;
    };

    const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
    const allowedTypes = new Set([
      "Frame",
      "TextLabel",
      "TextButton",
      "ImageLabel",
      "Rectangle",
      "Circle",
      "Line",
      "Spacer",
      "Group",
      "MonetizationButton",
    ]);
    const safeItems = Array.isArray(state.items) ? state.items : [];

    const cleanedItems = safeItems
      .filter((it) => it && typeof it === "object")
      .map((it, idx) => {
        const w = Math.max(10, Number(it.w) || 200);
        const h = Math.max(10, Number(it.h) || 100);
        const x = clamp(Number(it.x) || 0, 0, Math.max(0, safeCanvas.w - w));
        const y = clamp(Number(it.y) || 0, 0, Math.max(0, safeCanvas.h - h));
        const appearance = typeof it.appearance === "object" ? it.appearance : {};
        const role = ["ui", "layout", "background"].includes(it.role) ? it.role : "ui";
        const exportable = it.export === false ? false : !(role === "layout" || role === "background");
        const opacity = Number.isFinite(Number(it.opacity)) ? Math.min(1, Math.max(0, Number(it.opacity))) : 1;
        const animations = Array.isArray(it.animations)
          ? it.animations
              .filter((a) => a && typeof a === "object")
              .map((a) => ({
                trigger: String(a.trigger || ""),
                type: String(a.type || ""),
                props: typeof a.props === "object" ? a.props : {},
              }))
          : [];
        let interactions = it.interactions && typeof it.interactions === "object" ? it.interactions : undefined;
        if (!interactions && it.onClick && typeof it.onClick === "object") {
          interactions = { OnClick: it.onClick };
        }

        return {
          id: String(it.id || `ai_${Date.now()}_${idx}`),
          type: allowedTypes.has(it.type) ? it.type : "Frame",
          name: String(it.name || it.type || "Item"),
          x,
          y,
          w,
          h,
          zIndex: Number(it.zIndex) || 1,
          fill: String(it.fill || appearance.fill || "#111827"),
          radius: Number(it.radius || appearance.radius) || 12,
          stroke: typeof it.stroke === "boolean" ? it.stroke : true,
          strokeColor: String(it.strokeColor || appearance.strokeColor || "#334155"),
          strokeWidth: Number(it.strokeWidth || appearance.strokeWidth) || 2,
          text: String(it.text || appearance.text || ""),
          textColor: String(it.textColor || appearance.textColor || "#ffffff"),
          fontSize: Number(it.fontSize || appearance.fontSize) || 18,
          imageId: normalizeRobloxImage(it.imageId || ""),
          opacity,
          role,
          export: exportable,
          notes: typeof it.notes === "string" ? it.notes : undefined,
          animations,
          interactions: interactions || undefined,
          locked: !!it.locked,
          visible: typeof it.visible === "boolean" ? it.visible : true,
        };
      });

    return { canvasSize: safeCanvas, settings: state.settings || {}, items: cleanedItems, selectedId: null };
  }

  /**
   * Enforce: AI does NOT invent asset IDs. Prompt user if any ImageLabel is missing.
   * Codex: swap window.prompt for your modal while keeping logic.
   */
  async function promptForMissingImageIds(boardState) {
    const itemsCopy = boardState.items.map((it) => ({ ...it }));
    for (const it of itemsCopy) {
      const needs = it.type === "ImageLabel" && (!it.imageId || it.imageId.trim() === "" || it.imageId.trim() === "rbxassetid://");
      if (!needs) continue;
      const val = window.prompt(
        `Missing ImageId for "${it.name}" (ImageLabel).\n\nPaste a Roblox asset id like:\nrbxassetid://123456789`,
        "rbxassetid://"
      );
      if (val && val.trim()) it.imageId = val.trim();
    }
    return { ...boardState, items: itemsCopy };
  }

  async function ensureBoardForAI() {
    if (selectedBoardId) return selectedBoardId;
    if (!user) return null;

    try {
      setLoadingBoard(true);
      const title = aiPrompt.trim() ? aiPrompt.trim().slice(0, 60) : "AI Board";
      const res = await initBoard({
        title,
        canvasSize,
        settings: { showGrid, snapToGrid, gridSize },
      });

      const newId = res?.boardId || res?.board?.id || boardId;
      if (newId) {
        setSelectedBoardId(newId);
        setBoardId(newId);
        setSelectedBoard(res.board || null);
        loadBoardState({
          canvasSize: res.board?.canvasSize || canvasSize,
          settings: res.board?.settings || {},
          items: [],
          selectedId: null,
        });
        lastSavedStringRef.current = JSON.stringify({});
        skipAutosaveRef.current = true;
      }

      // Refresh board list for sidebar
      try {
        const token = await user.getIdToken();
        const list = await listBoards({ token });
        setBoards(list.boards || []);
      } catch (e) {
        console.error("List boards after auto-create failed", e);
      }

      return newId;
    } catch (e) {
      console.error("Auto-create board for AI failed", e);
      window.alert(e?.message || "Failed to create a board for AI");
      return null;
    } finally {
      setLoadingBoard(false);
    }
  }

  /**
   * Text prompt -> UI. Codex: extend with "insert into selection" using selected bounds if needed.
   */
  async function handleAIGenerateFromPrompt() {
    if (!user) {
      window.alert("Please sign in before generating.");
      return;
    }
    if (!aiPrompt.trim()) {
      window.alert("Write a prompt first.");
      return;
    }
    if (tokensLeft <= 0) {
      window.alert("AI token limit reached. Please upgrade or wait for reset.");
      return;
    }

    try {
      setAiGenerating(true);
      const ensuredId = await ensureBoardForAI();
      if (!ensuredId) {
        setAiGenerating(false);
        return;
      }
      const themeHint = getSiteThemeHint();
      console.info("[AI] generate start", { boardId: selectedBoardId, prompt: aiPrompt.trim(), canvasSize });

      const boardState = await generateWithAI({
        prompt: aiPrompt.trim(),
        canvasSize,
        themeHint,
        mode: scaffoldOnly ? "scaffold" : "overwrite",
        maxItems: 45,
      });

      const sanitized = sanitizeBoardState(boardState);
      const hydrated = await promptForMissingImageIds(sanitized);
      setCanvasSize(hydrated.canvasSize);
      setItems(hydrated.items || [], { history: true });
      lastSavedStringRef.current = JSON.stringify(hydrated);
      const token = await user.getIdToken();
      await createSnapshot({ token, boardId: selectedBoardId, boardState: hydrated });
    } catch (e) {
      console.error(e);
      window.alert(e?.message || "AI generate failed");
    } finally {
      setAiGenerating(false);
    }
  }

  async function handleAIEnhanceCurrent() {
    if (!user) {
      window.alert("Please sign in before enhancing.");
      return;
    }
    if (!selectedBoardId) {
      window.alert("Select or create a board first.");
      return;
    }
    if (!items || !items.length) {
      window.alert("Add some UI first.");
      return;
    }

    try {
      setAiGenerating(true);
      const themeHint = getSiteThemeHint();
      const current = {
        canvasSize,
        settings: {},
        items,
      };

      const enhancedBoardState = await enhanceBoard({
        boardState: current,
        prompt: aiPrompt?.trim()
          ? `Enhance this UI: ${aiPrompt.trim()}`
          : "Make it feel more premium and polished",
        themeHint,
      });

      if (!enhancedBoardState) return;

      const sanitized = sanitizeBoardState(enhancedBoardState);
      setCanvasSize(sanitized.canvasSize);
      setItems(sanitized.items || [], { history: true });

      lastSavedStringRef.current = JSON.stringify(sanitized);

      const token = await user.getIdToken();
      await createSnapshot({
        token,
        boardId: selectedBoardId,
        boardState: sanitized,
      });
    } catch (e) {
      console.error(e);
      window.alert(e?.message || "AI enhance failed");
    } finally {
      setAiGenerating(false);
    }
  }

  /**
   * Screenshot/Image -> UI with rights-aware modes.
   * rightsMode:
   * - owned: extract more detail (still no invented asset IDs)
   * - reference: structure inspiration only; replace text/logos; apply site theme
   */
  async function handleAIImportFromImage() {
    if (!user) return;
    if (!selectedBoardId) return window.alert("Select or create a board first.");
    if (!refImageFile) return window.alert("Upload an image first.");
    if (tokensLeft <= 0) {
      window.alert("AI token limit reached. Please upgrade or wait for reset.");
      return;
    }

    try {
      setAiImporting(true);
      const themeHint = getSiteThemeHint();

      const boardState = await importBoardFromImage({
        file: refImageFile,
        canvasSize,
        themeHint,
        rightsMode,
        prompt: aiPrompt.trim(),
        mode: "overwrite",
        maxItems: 55,
      });

      const sanitized = sanitizeBoardState(boardState);
      const hydrated = await promptForMissingImageIds(sanitized);
      setCanvasSize(hydrated.canvasSize);
      setItems(hydrated.items || [], { history: true });
      lastSavedStringRef.current = JSON.stringify(hydrated);
      const token = await user.getIdToken();
      await createSnapshot({ token, boardId: selectedBoardId, boardState: hydrated });
    } catch (e) {
      console.error(e);
      window.alert(e?.message || "AI import failed");
    } finally {
      setAiImporting(false);
    }
  }

  async function handleAISuggestAssetIdsForPlaceholders() {
    if (!user) return window.alert("Please sign in.");
    if (!items || !items.length) return window.alert("Add some UI first.");

    try {
      setAiSuggesting(true);
      setAiStatusMessage("Asking AI for search keywords...");

      const token = await user.getIdToken();

      const out = await aiSuggestImageQueries({
        token,
        items,
        boardPrompt: aiPrompt || "",
      });

      const suggestions = Array.isArray(out?.suggestions) ? out.suggestions : [];
      if (!suggestions.length) {
        window.alert("No ImageLabel placeholders found.");
        return;
      }

      for (const s of suggestions) {
        const itemId = String(s?.itemId || "");
        const queries = Array.isArray(s?.queries) ? s.queries : [];
        if (!itemId || !queries.length) continue;

        const target = items.find((it) => String(it.id) === itemId);
        if (!target) continue;

        let picked = null;
        for (const q of queries) {
          setAiStatusMessage(`Searching catalog: ${q}`);
          const search = await robloxCatalogSearch({ keyword: q, limit: 10 });
          const results = Array.isArray(search?.results) ? search.results : [];
          if (!results.length) continue;

          const lines = results
            .slice(0, 10)
            .map((it, idx) => `${idx + 1}. ${it.name} (id: ${it.id})`)
            .join("\n");

          const answer = window.prompt(
            `Pick an image for:\n${target.name || "ImageLabel"}\n\nSearch: ${q}\n\n${lines}\n\nEnter 1-10 to apply, or Cancel to skip:`,
            "1"
          );

          if (!answer) {
            picked = null;
            break;
          }
          const n = Number(answer);
          if (Number.isFinite(n) && n >= 1 && n <= Math.min(10, results.length)) {
            picked = results[n - 1];
            break;
          }
        }

        if (picked?.id) {
          updateItem(itemId, { imageId: `rbxassetid://${picked.id}` });
        }
      }
    } catch (e) {
      console.error(e);
      window.alert(e?.message || "Suggest image IDs failed");
    } finally {
      setAiSuggesting(false);
      setAiStatusMessage("");
    }
  }

  async function handleLoadSnapshot(snapshotId, { restore = false } = {}) {
    if (!user || !selectedBoardId || !snapshotId) return;
    try {
      setLoadingBoard(true);
      const token = await user.getIdToken();
      const res = await getSnapshot({ token, boardId: selectedBoardId, snapshotId });
      const boardState = res?.snapshot?.boardState;
      if (!boardState) return window.alert("Snapshot has no board state");

      const sanitized = sanitizeBoardState(boardState);
      skipAutosaveRef.current = true;
      setCanvasSize(sanitized.canvasSize);
      setItems(sanitized.items || [], { history: !!restore });
      lastSavedStringRef.current = JSON.stringify(sanitized);

      if (restore) {
        await createSnapshot({ token, boardId: selectedBoardId, boardState: sanitized });
        refreshSnapshots(selectedBoardId);
      }
    } catch (e) {
      console.error("Load snapshot failed", e);
    } finally {
      setLoadingBoard(false);
    }
  }


  return (
    <div style={styles.page}>
      {/* Top bar */}
      <div style={styles.topbar}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {selectedBoard && (
            <div style={styles.boardMeta}>
              Board: <b>{selectedBoard.title}</b> {selectedBoard.projectId ? `(Project ${selectedBoard.projectId})` : ""}
            </div>
          )}
          <div style={styles.status}>{loadingBoard ? "Loading..." : saving ? "Saving..." : ""}</div>
          {aiBusy && (
            <div style={styles.loadingPill}>
              <Spinner />
              <span>{aiStatusText || "Working..."}</span>
            </div>
          )}
        </div>

        <div style={styles.topbarActions}>
          {user && (
            <div style={{ minWidth: 260 }}>
              <TokenBar tokensLeft={tokensLeft} tokensLimit={tokensLimit} resetsAt={tokenRefreshTime} plan={tokenPlan} loading={tokenLoading} />
            </div>
          )}
          <button onClick={handleUndo} style={btnStyle("secondary")} disabled={!canUndo || aiBusy || loadingBoard}>
            Undo
          </button>
          <button onClick={handleRedo} style={btnStyle("secondary")} disabled={!canRedo || aiBusy || loadingBoard}>
            Redo
          </button>
          <button onClick={() => setShowGrid((v) => !v)} style={btnStyle("secondary")}>
            {showGrid ? "Hide Grid" : "Show Grid"}
          </button>
          <button onClick={() => setSnapToGrid((v) => !v)} style={btnStyle("secondary")}>
            {snapToGrid ? "Snap: On" : "Snap: Off"}
          </button>
          <button
            onClick={() => {
              setPreviewMode((v) => !v);
              resetPreview?.();
              clearSelection?.();
            }}
            style={btnStyle(previewMode ? "primary" : "secondary")}
            title="Preview Mode lets you click buttons and see interactions without editing the board."
          >
            {previewMode ? "Preview: On" : "Preview: Off"}
          </button>
          <button
            onClick={() => resetPreview?.()}
            style={btnStyle("secondary")}
            disabled={!previewMode}
            title="Reset preview runtime back to the designed state"
          >
            Reset Preview
          </button>
          <button
            style={btnStyle("primary", uiAccent)}
            onClick={handleAIGenerateFromPrompt}
            disabled={!user || !selectedBoardId || aiBusy}
            title={!selectedBoardId ? "Select a board first" : aiBusy ? "AI request in progress" : "Generate UI from your prompt"}
          >
            {aiBusy ? "Working..." : "Generate (AI)"}
          </button>
          <button
            style={btnStyle("secondary")}
            onClick={handleAIEnhanceCurrent}
            disabled={!user || !selectedBoardId || aiBusy || !items.length}
            title="Polish the current UI (spacing, hierarchy, styles) while keeping item IDs unchanged"
          >
            {aiBusy ? "Working..." : "Enhance (AI)"}
          </button>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#d1d5db" }}>
            <input
              type="checkbox"
              checked={scaffoldOnly}
              onChange={(e) => setScaffoldOnly(e.target.checked)}
              style={{ width: 14, height: 14 }}
            />
            Scaffolding only
          </label>
          <button
            style={btnStyle("secondary")}
            onClick={handleExportLua}
            disabled={!items.length}
            title="Export current canvas to a Roblox Lua script"
          >
            Export Lua
          </button>
        </div>
      </div>

      {showVersionsModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000,
          }}
        >
          <div
            style={{
              width: "90%",
              maxWidth: 560,
              maxHeight: "80vh",
              overflow: "auto",
              background: "rgba(15,23,42,0.96)",
              border: "1px solid rgba(148,163,184,0.35)",
              borderRadius: 14,
              padding: 16,
              boxShadow: "0 18px 60px rgba(0,0,0,0.4)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontWeight: 800, fontSize: 14 }}>Versions</div>
              <button style={btnStyle("secondary")} onClick={() => setShowVersionsModal(false)}>
                Close
              </button>
            </div>

            {!selectedBoardId ? (
              <div style={{ fontSize: 12, opacity: 0.75 }}>Select a board first.</div>
            ) : snapshots.length === 0 ? (
              <div style={{ fontSize: 12, opacity: 0.75 }}>No versions yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {snapshots.map((s) => (
                  <div
                    key={s.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                      padding: "8px 10px",
                      borderRadius: 10,
                      border: "1px solid rgba(148,163,184,0.2)",
                      background: "rgba(2,6,23,0.45)",
                    }}
                  >
                    <div style={{ fontSize: 12 }}>
                      <div style={{ fontWeight: 800 }}>v{s.snapshotNumber ?? "?"}</div>
                      <div style={{ opacity: 0.7 }}>
                        {s.createdAt ? new Date(s.createdAt).toLocaleString() : "-"}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        style={btnStyle("ghost")}
                        onClick={() => handleLoadSnapshot(s.id, { restore: false })}
                        disabled={loadingBoard || aiBusy}
                      >
                        Load
                      </button>
                      <button
                        style={btnStyle("secondary")}
                        onClick={() => handleLoadSnapshot(s.id, { restore: true })}
                        disabled={loadingBoard || aiBusy}
                      >
                        Restore
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main */}
      <div style={styles.main}>
        {/* Left */}
        <div style={styles.left}>
          <Section title="Boards">
            <button style={btnStyle("secondary")} onClick={handleCreateBoard} disabled={!user || loadingBoard}>
              + New Board
            </button>
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>{loadingBoards ? "Loading boards..." : ""}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
              {boards.map((b) => (
                <div
                  key={b.id}
                  onClick={() => setSelectedBoardId(b.id)}
                  style={{
                    ...btnStyle("ghost"),
                    textAlign: "left",
                    border: b.id === selectedBoardId ? "1px solid rgba(59,130,246,0.65)" : "1px solid rgba(148,163,184,0.18)",
                    background: b.id === selectedBoardId ? "rgba(59,130,246,0.10)" : "rgba(15,23,42,0.35)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                    cursor: "pointer",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800 }}>{b.title}</div>
                    <div style={{ fontSize: 11, opacity: 0.7 }}>{b.updatedAt ? new Date(b.updatedAt).toLocaleString() : "-"}</div>
                  </div>
                  <button
                    style={btnStyle("danger")}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteBoard(b.id);
                    }}
                    disabled={loadingBoard}
                    title="Delete this board"
                  >
                    Delete
                  </button>
                </div>
              ))}
              {boards.length === 0 && !loadingBoards && <div style={{ fontSize: 12, opacity: 0.65 }}>No boards yet.</div>}
            </div>
          </Section>
          <Section title="Versions">
            <button
              style={btnStyle("secondary")}
              onClick={() => setShowVersionsModal(true)}
              disabled={!selectedBoardId || loadingBoard}
              title={!selectedBoardId ? "Select a board first" : "View and restore versions"}
            >
              Open Versions
            </button>
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
              {snapshots.length ? `${snapshots.length} versions` : "No versions yet"}
            </div>
          </Section>

          <Section title="Layers">
            <LayersPanel />
          </Section>

          <Section title="AI Prompt">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder='Describe UI. Example: "Main menu with Play, Settings, Shop. Currency top-right. Dark theme."'
                style={{
                  width: "100%",
                  minHeight: 110,
                  resize: "vertical",
                  borderRadius: 12,
                  border: "1px solid rgba(148,163,184,0.22)",
                  background: "rgba(2,6,23,0.55)",
                  color: "#e5e7eb",
                  padding: 10,
                  outline: "none",
                  fontSize: 12,
                  lineHeight: 1.35,
                }}
              />
              <button
                style={btnStyle("primary")}
                onClick={handleAIGenerateFromPrompt}
                disabled={!user || !selectedBoardId || aiGenerating || !aiPrompt.trim()}
                title={!aiPrompt.trim() ? "Write a prompt first" : "Generate UI"}
              >
                {aiGenerating ? "Generating..." : "Generate from Prompt"}
              </button>
              <button
                style={btnStyle("secondary")}
                onClick={handleAIEnhanceCurrent}
                disabled={!user || !selectedBoardId || aiGenerating || !items.length}
                title="Polish the current UI layout/spacing without changing IDs"
              >
                {aiGenerating ? "Working..." : "Enhance Current UI"}
              </button>
              <button
                style={btnStyle("secondary")}
                onClick={handleAISuggestAssetIdsForPlaceholders}
                disabled={
                  !user ||
                  aiBusy ||
                  !items.some(
                    (it) =>
                      it.type === "ImageLabel" &&
                      (!it.imageId || it.imageId.trim() === "" || it.imageId.trim() === "rbxassetid://")
                  )
                }
                title="AI suggests Roblox catalog items, then you choose which ID to apply"
              >
                {aiBusy ? "Working..." : "Suggest Image IDs (AI)"}
              </button>
            </div>
          </Section>

          <Section title="Screenshot → UI">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  setRefImageFile(f);
                  if (refImageUrl) URL.revokeObjectURL(refImageUrl);
                  setRefImageUrl(f ? URL.createObjectURL(f) : "");
                }}
                style={{ fontSize: 12 }}
              />

              <label style={{ fontSize: 12, opacity: 0.85 }}>
                Mode
                <select
                  value={rightsMode}
                  onChange={(e) => setRightsMode(e.target.value)}
                  style={{
                    width: "100%",
                    marginTop: 6,
                    padding: "10px 10px",
                    borderRadius: 12,
                    border: "1px solid rgba(148,163,184,0.20)",
                    background: "rgba(2,6,23,0.45)",
                    color: "#e5e7eb",
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  <option value="reference">Reference-only (inspired layout)</option>
                  <option value="owned">Owned/Permitted (more faithful import)</option>
                </select>
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <button
                  style={btnStyle("secondary")}
                  onClick={() => setShowRefOverlay((v) => !v)}
                  disabled={!refImageUrl}
                  title="Overlay is only for alignment while editing"
                >
                  {showRefOverlay ? "Hide Overlay" : "Show Overlay"}
                </button>

                <button
                  style={btnStyle("primary")}
                  onClick={handleAIImportFromImage}
                  disabled={!user || !selectedBoardId || aiBusy || !refImageFile}
                  title={!refImageFile ? "Upload an image first" : aiBusy ? "AI request in progress" : "Convert screenshot into board UI"}
                >
                  {aiImporting ? "Importing..." : aiGenerating ? "Waiting for AI..." : "Generate from Screenshot"}
                </button>
              </div>

              <label style={{ fontSize: 12, opacity: 0.85 }}>
                Overlay opacity ({Math.round(refOverlayOpacity * 100)}%)
                <input
                  type="range"
                  min="0"
                  max="0.75"
                  step="0.01"
                  value={refOverlayOpacity}
                  onChange={(e) => setRefOverlayOpacity(Number(e.target.value))}
                  disabled={!refImageUrl}
                  style={{ width: "100%" }}
                />
              </label>

              <div style={{ fontSize: 11, opacity: 0.7 }}>
                Reference-only mode avoids copying text/logos. Owned mode imports more detail.
              </div>
            </div>
          </Section>

          <Section title="Elements">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button style={btnStyle("secondary")} onClick={() => addPrimitive("Frame")}>+ Frame</button>
              <button style={btnStyle("secondary")} onClick={() => addPrimitive("TextLabel")}>+ TextLabel</button>
              <button style={btnStyle("secondary")} onClick={() => addPrimitive("TextButton")}>+ TextButton</button>
              <button style={btnStyle("secondary")} onClick={() => addPrimitive("ImageLabel")}>+ ImageLabel</button>
            </div>
          </Section>
          <Section title="Monetization (Robux)">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button style={btnStyle("secondary")} onClick={() => addMonetization("DevProduct")}>+ Dev Product</button>
              <button style={btnStyle("secondary")} onClick={() => addMonetization("GamePass")}>+ Game Pass</button>
              <button style={btnStyle("secondary")} onClick={() => addMonetization("Subscription")}>+ Subscription</button>
              <button style={btnStyle("secondary")} onClick={() => addMonetization("CatalogItem")}>+ Catalog Item</button>
            </div>
            <div style={{ fontSize: 11, opacity: 0.75, marginTop: 10, lineHeight: 1.3 }}>
              IDs are required. Generator should hard-stop if a Robux button is missing its ID.
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button style={btnStyle("ghost")} onClick={() => addMonetization("DevProduct", { text: "Donate (10R$)" })}>+ Donate</button>
              <button style={btnStyle("ghost")} onClick={() => addMonetization("GamePass", { text: "VIP Pass" })}>+ VIP</button>
            </div>
          </Section>

          <Section title="ScreenGui Sizes">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button style={btnStyle("secondary")} onClick={() => setCanvasSize({ w: 1280, h: 720 })}>Desktop (1280×720)</button>
              <button style={btnStyle("secondary")} onClick={() => setCanvasSize({ w: 1920, h: 1080 })}>Desktop (1920×1080)</button>
              <button style={btnStyle("secondary")} onClick={() => setCanvasSize({ w: 1366, h: 768 })}>Laptop (1366×768)</button>
              <button style={btnStyle("secondary")} onClick={() => setCanvasSize({ w: 1024, h: 768 })}>Tablet (1024×768)</button>
              <button style={btnStyle("secondary")} onClick={() => setCanvasSize({ w: 375, h: 812 })}>Mobile (375×812)</button>
              <button style={btnStyle("secondary")} onClick={() => setCanvasSize({ w: 812, h: 375 })}>Mobile (812×375)</button>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
              <div style={{ fontSize: 11, opacity: 0.75 }}>Grid size</div>
              <input type="number" value={gridSize} onChange={(e) => setGridSize(Math.max(1, Number(e.target.value) || 1))} style={{ ...inputStyle(), width: 90 }} />
            </div>
          </Section>
        </div>

        {/* Center */}
        <div style={styles.center}>
          <div
            ref={canvasRef}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onPointerDown={clearSelection}
            onDragOver={handleCanvasDragOver}
            onDrop={handleCanvasDrop}
            style={{ ...styles.canvas, width: canvasSize.w, height: canvasSize.h }}
          >
            <CanvasGrid enabled={previewMode ? false : showGrid} size={gridSize} />

            {/* Screenshot overlay for alignment (view-only; not persisted) */}
            {refImageUrl && showRefOverlay && (
              <img
                src={refImageUrl}
                alt="Reference overlay"
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "fill",
                  opacity: refOverlayOpacity,
                  pointerEvents: "none",
                  filter: "saturate(0.95) contrast(1.02)",
                }}
              />
            )}

            <div style={styles.canvasBadge}>ScreenGui {canvasSize.w}×{canvasSize.h}</div>

      {(previewMode ? renderItems : items)
        .slice()
        .sort((a, b) => (a.zIndex || 1) - (b.zIndex || 1))
        .map((it) => (
          <CanvasItem key={it.id} item={it} selected={!previewMode && it.id === selectedId} canvasRef={canvasRef} />
        ))}

            {aiBusy && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  background: "rgba(0,0,0,0.42)",
                  backdropFilter: "blur(2px)",
                  borderRadius: 14,
                  zIndex: 50,
                  pointerEvents: "auto",
                  color: "#e5e7eb",
                  textAlign: "center",
                  padding: 16,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 800 }}>
                  <Spinner size={22} thickness={3} />
                  <div>{aiStatusText || "Talking to AI..."}</div>
                </div>
                <div style={{ fontSize: 12, opacity: 0.82 }}>Request sent to the backend. Hang tight.</div>
              </div>
            )}

            {previewMode && previewMockPurchase && (
              <MockPurchaseModal data={previewMockPurchase} onClose={closeMockPurchase} />
            )}
          </div>
        </div>

        {/* Right */}
        <div style={{ borderLeft: "1px solid rgba(148,163,184,0.2)", padding: uiDensity === "compact" ? 10 : 12, overflow: "auto" }}>
          <Section title="Properties">
            {previewMode ? (
              <div style={{ fontSize: 12, opacity: 0.75 }}>
                Preview Mode is ON. Turn it off to edit properties.
              </div>
            ) : !selectedItem ? (
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                Select an element on the canvas to edit properties.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ fontSize: 12, opacity: 0.9 }}>
                  Selected: <b>{selectedItem.type}</b> — {selectedItem.name}
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button style={btnStyle("ghost")} onClick={bringToFront}>Bring Front</button>
                  <button style={btnStyle("ghost")} onClick={sendToBack}>Send Back</button>
                  <button style={btnStyle("danger")} onClick={deleteSelected}>Delete</button>
                </div>

                {/* MVP behavior wiring: only TextButton gets onClick rules */}
                {/* ImageLabel: Roblox Image ID */}
                {selectedItem.type === "ImageLabel" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.9 }}>
                      Roblox Image
                    </div>

                    <label style={{ fontSize: 12, opacity: 0.85 }}>
                      Image Asset ID
                      <input
                        type="text"
                        value={selectedItem.imageId || ""}
                        placeholder="rbxassetid://123456789"
                        onChange={(e) => {
                          const raw = e.target.value;
                          const s = String(raw || "").trim();
                          let normalized = "";

                          if (/^\d+$/.test(s)) normalized = `rbxassetid://${s}`;
                          else if (s.startsWith("rbxassetid://")) normalized = s;
                          else {
                            const m =
                              s.match(/asset\/\?id=(\d+)/i) ||
                              s.match(/id=(\d+)/i);
                            if (m?.[1]) normalized = `rbxassetid://${m[1]}`;
                            else normalized = s;
                          }

                          updateItem(selectedItem.id, { imageId: normalized });
                        }}
                        style={{
                          width: "100%",
                          marginTop: 6,
                          padding: "10px 10px",
                          borderRadius: 12,
                          border: "1px solid rgba(148,163,184,0.20)",
                          background: "rgba(2,6,23,0.45)",
                          color: "#e5e7eb",
                          fontSize: 12,
                          fontWeight: 800,
                          outline: "none",
                        }}
                      />
                    </label>

                    <div style={{ fontSize: 11, opacity: 0.7, lineHeight: 1.35 }}>
                      Paste a Roblox asset ID or URL.
                      <br />
                      Examples:
                      <br />
                      <code>123456789</code>
                      <br />
                      <code>rbxassetid://123456789</code>
                      <br />
                      <code>https://www.roblox.com/asset/?id=123456789</code>
                    </div>

                    {(!selectedItem.imageId ||
                      selectedItem.imageId === "rbxassetid://") && (
                      <div
                        style={{
                          fontSize: 11,
                          padding: "6px 8px",
                          borderRadius: 8,
                          background: "rgba(239,68,68,0.12)",
                          border: "1px solid rgba(239,68,68,0.35)",
                          color: "#fecaca",
                        }}
                      >
                        This ImageLabel has no valid image ID yet.
                      </div>
                    )}
                  </div>
                )}

                {selectedItem.type === "TextButton" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.9 }}>Interaction (OnClick)</div>

                    <label style={{ fontSize: 12, opacity: 0.85 }}>
                      Action
                      <select
                        value={selectedItem.onClick?.type || ""}
                        onChange={(e) => {
                          const nextType = e.target.value || "";
                          updateItem(selectedItem.id, {
                            onClick: nextType ? { ...(selectedItem.onClick || {}), type: nextType } : null,
                          });
                        }}
                        style={{
                          width: "100%",
                          marginTop: 6,
                          padding: "10px 10px",
                          borderRadius: 12,
                          border: "1px solid rgba(148,163,184,0.20)",
                          background: "rgba(2,6,23,0.45)",
                          color: "#e5e7eb",
                          fontSize: 12,
                          fontWeight: 800,
                          outline: "none",
                        }}
                      >
                        <option value="">None</option>
                        <option value="ToggleVisible">Toggle Visible</option>
                        <option value="SetVisible">Set Visible (true)</option>
                        <option value="SetHidden">Set Visible (false)</option>
                      </select>
                    </label>

                    <label style={{ fontSize: 12, opacity: 0.85 }}>
                      Target Element
                      <select
                        value={selectedItem.onClick?.targetId || ""}
                        onChange={(e) => {
                          const targetId = e.target.value || "";
                          const existing = selectedItem.onClick || {};
                          updateItem(selectedItem.id, {
                            onClick: existing?.type ? { ...existing, targetId } : null,
                          });
                        }}
                        style={{
                          width: "100%",
                          marginTop: 6,
                          padding: "10px 10px",
                          borderRadius: 12,
                          border: "1px solid rgba(148,163,184,0.20)",
                          background: "rgba(2,6,23,0.45)",
                          color: "#e5e7eb",
                          fontSize: 12,
                          fontWeight: 800,
                          outline: "none",
                        }}
                      >
                        <option value="">� Select �</option>
                        {items
                          .filter((it) => it.id !== selectedItem.id)
                          .map((it) => (
                            <option key={it.id} value={it.id}>
                              {it.name || it.type} ({it.type})
                            </option>
                          ))}
                      </select>
                    </label>

                    <div style={{ fontSize: 11, opacity: 0.7 }}>
                      Tip: Make a modal by setting it Hidden first, then ToggleVisible it from a button.
                    </div>

                    <button
                      style={btnStyle("secondary")}
                      onClick={() => {
                        const r = selectedItem.onClick;
                        if (!r) return;
                        if (r.type === "SetHidden") {
                          updateItem(selectedItem.id, { onClick: { type: "SetVisible", targetId: r.targetId, value: false } });
                        } else if (r.type === "SetVisible" && r.value === undefined) {
                          updateItem(selectedItem.id, { onClick: { ...r, value: true } });
                        }
                      }}
                    >
                      Normalize Rule
                    </button>
                  </div>
                )}

                {/* Prompt-linked notes (constraints for AI edits) */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.9 }}>AI Notes (constraints)</div>
                  <textarea
                    value={selectedItem.aiNote || ""}
                    onChange={(e) => updateItem(selectedItem.id, { aiNote: e.target.value })}
                    placeholder='Example: "OnClick should open the Shop modal and play a click sound. Ask for SoundId if missing."'
                    style={{
                      width: "100%",
                      minHeight: 90,
                      resize: "vertical",
                      borderRadius: 12,
                      border: "1px solid rgba(148,163,184,0.22)",
                      background: "rgba(2,6,23,0.55)",
                      color: "#e5e7eb",
                      padding: 10,
                      outline: "none",
                      fontSize: 12,
                      lineHeight: 1.35,
                    }}
                  />
                  <div style={{ fontSize: 11, opacity: 0.7 }}>
                    These notes will be passed to AI later as constraints for this element.
                  </div>
                </div>
              </div>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 0.4, opacity: 0.9, marginBottom: 10 }}>{title}</div>
      <div style={styles.card}>{children}</div>
    </div>
  );
}

function formatNumber(num) {
  if (typeof num !== "number" || Number.isNaN(num)) return "0";
  return num.toLocaleString();
}

function formatResetDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function downloadText(filename, content) {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// Token bar borrowed from AI page for visual consistency
function TokenBar({ tokensLeft, tokensLimit, resetsAt, plan, loading }) {
  const percent =
    typeof tokensLeft === "number" && typeof tokensLimit === "number"
      ? Math.max(0, Math.min(100, (tokensLeft / tokensLimit) * 100))
      : 100;
  const planInfo = PLAN_INFO[plan] || PLAN_INFO.free;

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 12, color: "#d1d5db", fontWeight: 600 }}>
          Tokens:{" "}
          <span style={{ color: "#fff", fontWeight: 800 }}>
            {loading ? "..." : typeof tokensLeft === "number" ? formatNumber(tokensLeft) : "∞"}
          </span>{" "}
          <span style={{ color: "#9ca3af" }}>/ {formatNumber(tokensLimit)}</span>
        </div>
        <a
          href="/docs#tokens"
          style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#9b5de5", textDecoration: "underline" }}
          title="How tokens work"
        >
          <Info size={16} />
          How tokens work
        </a>
      </div>
      <div style={{ width: "100%", height: 12, background: "#1f2937", borderRadius: 999, overflow: "hidden", position: "relative" }}>
        <div
          style={{
            height: "100%",
            borderRadius: 999,
            width: `${percent}%`,
            transition: "width 0.4s ease",
            background:
              plan === "team"
                ? "linear-gradient(90deg, #00f5d4 0%, #9b5de5 100%)"
                : plan === "pro"
                ? "linear-gradient(90deg, #9b5de5 0%, #00f5d4 100%)"
                : "#94a3b8",
          }}
        />
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11, color: "#9ca3af" }}>
        <span>{resetsAt ? `Resets on ${formatResetDate(resetsAt)}` : ""}</span>
        <span>{planInfo.capText}</span>
      </div>
    </div>
  );
}

// Simple inline spinner (CSS animation via inline style)
function MockPurchaseModal({ data, onClose }) {
  if (!data) return null;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "grid",
        placeItems: "center",
        zIndex: 99999,
      }}
      onPointerDown={onClose}
    >
      <div
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          width: 360,
          borderRadius: 14,
          background: "rgba(2,6,23,0.92)",
          border: "1px solid rgba(148,163,184,0.25)",
          padding: 14,
          boxShadow: "0 18px 60px rgba(0,0,0,0.5)",
          color: "#e5e7eb",
        }}
      >
        <div style={{ fontWeight: 900, fontSize: 14 }}>Mock Purchase</div>
        <div style={{ fontSize: 12, opacity: 0.8, marginTop: 6 }}>
          This is a testing overlay — it will NOT be exported and is NOT part of your UI.
        </div>

        <div style={{ marginTop: 12, fontSize: 12, opacity: 0.9 }}>
          <div><b>Button:</b> {data.label}</div>
          <div><b>Kind:</b> {data.kind}</div>
          <div><b>ID:</b> {data.id || "(not set)"}</div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button onClick={onClose} style={{ flex: 1 }}>Cancel</button>
          <button
            onClick={() => {
              onClose?.();
              window.alert("Mock purchase success ✅ (no real transaction)");
            }}
            style={{ flex: 1, fontWeight: 800 }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

function Spinner({ size = 14, thickness = 2 }) {
  const dim = Math.max(8, size);
  const ring = Math.max(1, thickness);
  return (
    <div
      style={{
        width: dim,
        height: dim,
        border: `${ring}px solid rgba(255,255,255,0.25)`,
        borderTopColor: "#ffffff",
        borderRadius: "50%",
        animation: "spin 0.9s linear infinite",
      }}
    />
  );
}

function inputStyle() {
  return {
    width: "100%",
    padding: "9px 10px",
    borderRadius: 12,
    border: "1px solid rgba(148,163,184,0.20)",
    background: "rgba(2,6,23,0.35)",
    color: "#e5e7eb",
    outline: "none",
    fontSize: 12,
    fontWeight: 700,
  };
}

function btnStyle(variant, accent = "#3b82f6") {
  const base = {
    padding: "10px 10px",
    borderRadius: 12,
    border: "1px solid rgba(148,163,184,0.20)",
    background: "rgba(2,6,23,0.45)",
    color: "#e5e7eb",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 800,
    outline: "none",
  };

  if (variant === "primary") {
    return {
      ...base,
      background: accent,
      border: `1px solid ${accent}`,
    };
  }

  if (variant === "secondary") {
    return {
      ...base,
      background: "rgba(59,130,246,0.09)",
      border: "1px solid rgba(59,130,246,0.4)",
    };
  }

  if (variant === "ghost") {
    return {
      ...base,
      background: "rgba(2,6,23,0.25)",
      border: "1px solid rgba(148,163,184,0.15)",
      color: "#cbd5e1",
    };
  }

  if (variant === "danger") {
    return {
      ...base,
      background: "rgba(239,68,68,0.18)",
      border: "1px solid rgba(239,68,68,0.55)",
      color: "#fecdd3",
    };
  }

  return base;
}

const styles = {
  page: { height: "100vh", display: "flex", flexDirection: "column", background: "#0b1020", color: "#e5e7eb" },
  topbar: { display: "flex", alignItems: "center", gap: 12, padding: 12, borderBottom: "1px solid rgba(148,163,184,0.2)" },
  boardMeta: { fontSize: 12, opacity: 0.85 },
  status: { fontSize: 12, opacity: 0.65, marginLeft: 8 },
  topbarActions: { marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" },
  loadingPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 8px",
    borderRadius: 999,
    border: "1px solid rgba(59,130,246,0.35)",
    background: "rgba(59,130,246,0.10)",
    fontSize: 12,
    color: "#dbeafe",
  },

  main: { flex: 1, display: "grid", gridTemplateColumns: "280px 1fr 360px", minHeight: 0 },
  left: { borderRight: "1px solid rgba(148,163,184,0.2)", padding: 12, overflow: "auto" },
  center: { padding: 16, overflow: "auto" },
  right: { borderLeft: "1px solid rgba(148,163,184,0.2)", padding: 12, overflow: "auto" },

  card: { border: "1px solid rgba(148,163,184,0.18)", background: "rgba(15,23,42,0.35)", borderRadius: 14, padding: 12 },
  group: { border: "1px solid rgba(148,163,184,0.18)", background: "rgba(2,6,23,0.25)", borderRadius: 14, padding: 12 },

  canvas: {
    margin: "0 auto",
    borderRadius: 14,
    border: "1px solid rgba(148,163,184,0.25)",
    background: "rgba(2,6,23,0.65)",
    position: "relative",
    boxShadow: "0 10px 40px rgba(0,0,0,0.35)",
    userSelect: "none",
  },
  canvasBadge: {
    position: "absolute",
    top: 8,
    right: 10,
    fontSize: 11,
    opacity: 0.75,
    background: "rgba(2,6,23,0.65)",
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(148,163,184,0.25)",
    pointerEvents: "none",
  },

  colorChip: { width: 44, height: 36, border: "none", background: "transparent", padding: 0, cursor: "pointer" },
  swatchGrid: { marginTop: 10, display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8 },
  removeSwatch: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 18,
    height: 18,
    borderRadius: 999,
    border: "1px solid rgba(148,163,184,0.35)",
    background: "rgba(2,6,23,0.85)",
    color: "rgba(226,232,240,0.9)",
    fontWeight: 900,
    fontSize: 11,
    cursor: "pointer",
    lineHeight: "16px",
  },
};

