import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

const CanvasContext = createContext(null);

const DEFAULT_GRID = 10;

// Deterministic, small default palette. Stored as hex strings on the board.
const DEFAULT_PALETTE = ["#111827", "#1f2937", "#334155", "#3b82f6", "#22c55e", "#ef4444", "#ffffff"];

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function snap(n, enabled, grid = DEFAULT_GRID) {
  if (!enabled) return n;
  const size = Number(grid) > 0 ? Number(grid) : DEFAULT_GRID;
  return Math.round(n / size) * size;
}

function uid() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return `id_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function normalizeHex(input) {
  if (typeof input !== "string") return null;
  let s = input.trim();
  if (!s) return null;
  if (!s.startsWith("#")) s = `#${s}`;
  if (/^#[0-9a-fA-F]{3}$/.test(s)) {
    const r = s[1], g = s[2], b = s[3];
    s = `#${r}${r}${g}${g}${b}${b}`;
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(s)) return null;
  return s.toLowerCase();
}

function uniqHexList(list, limit = 64) {
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const raw of list) {
    const c = normalizeHex(raw);
    if (!c) continue;
    if (out.includes(c)) continue;
    out.push(c);
    if (out.length >= limit) break;
  }
  return out;
}

export function CanvasProvider({
  children,
  initialCanvasSize = { w: 1280, h: 720 },
}) {
  const [canvasSize, setCanvasSize] = useState(initialCanvasSize);
  const [items, _setItems] = useState([]);
  const undoStack = useRef([]);
  const redoStack = useRef([]);
  const MAX_HISTORY = 50;
  const lastMutationRef = useRef("init");

  function setItems(next, { history = true } = {}) {
    _setItems((prev) => {
      if (history) {
        undoStack.current.push(prev);
        if (undoStack.current.length > MAX_HISTORY) {
          undoStack.current.shift();
        }
        redoStack.current = [];
      }
      lastMutationRef.current = history ? "set" : "set-nohistory";
      return typeof next === "function" ? next(prev) : next;
    });
  }

  function undo() {
    if (!undoStack.current.length) return;
    _setItems((current) => {
      redoStack.current.push(current);
      lastMutationRef.current = "undo";
      return undoStack.current.pop();
    });
  }

  function redo() {
    if (!redoStack.current.length) return;
    _setItems((current) => {
      undoStack.current.push(current);
      lastMutationRef.current = "redo";
      return redoStack.current.pop();
    });
  }
  const [selectedId, setSelectedId] = useState(null);
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridSize, setGridSize] = useState(DEFAULT_GRID);

  // --- Preview Runtime (MVP) ---
  // Preview shows “live” interactions without mutating the board JSON.
  const [previewMode, setPreviewMode] = useState(false);
  const [previewOverrides, setPreviewOverrides] = useState(() => ({
    visibleById: {},
    mockPurchase: null, // { kind, id, sourceId, label }
  }));

  // Board-level palette (used for Roblox UI colors)
  const [palette, setPalette] = useState(DEFAULT_PALETTE);
  const [activeColor, setActiveColor] = useState("#3b82f6");

  // Builder UI (this site) customization
  const [uiAccent, setUiAccent] = useState("#3b82f6");
  const [uiDensity, setUiDensity] = useState("comfortable"); // "comfortable" | "compact"

  const dragRef = useRef({
    mode: null,
    id: null,
    startX: 0,
    startY: 0,
    origin: null,
  });

  const addItem = useCallback((item) => {
    const newId = item?.id || uid();
    setItems((prev) => [
      ...prev,
      {
        id: newId,
        zIndex: prev.length + 1,
        visible: true,
        locked: false,
        ...item,
      },
    ]);
    return newId;
  }, []);

  const setItemVisible = useCallback((id, visible) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, visible } : it)));
  }, []);

  const setItemLocked = useCallback((id, locked) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, locked } : it)));
  }, []);

  const setItemParent = useCallback((id, parentId) => {
    if (!id || id === parentId) return;
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, parentId: parentId || null } : it))
    );
  }, []);

  const [collapsedGroups, setCollapsedGroups] = useState({});
  const toggleGroupCollapsed = useCallback((groupId) => {
    if (!groupId) return;
    setCollapsedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  }, []);

  const createGroup = useCallback(
    (name = "Group") => {
      const newId = uid();
      setItems((prev) => {
        const group = {
          id: newId,
          type: "Group",
          name,
          x: 40,
          y: 40,
          w: 240,
          h: 160,
          fill: "rgba(59,130,246,0.08)",
          stroke: true,
          strokeColor: "rgba(59,130,246,0.35)",
          strokeWidth: 1,
          opacity: 0.1,
          role: "layout",
          export: false,
          visible: true,
          locked: false,
          zIndex: prev.length + 1,
        };
        const next = prev.map((it) =>
          selectedId && it.id === selectedId ? { ...it, parentId: newId } : it
        );
        return [...next, group];
      });
      setSelectedId(newId);
      return newId;
    },
    [selectedId]
  );

  const updateItem = useCallback((id, patch) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...patch } : it))
    );
  }, []);

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    setItems((prev) => prev.filter((it) => it.id !== selectedId));
    setSelectedId(null);
  }, [selectedId]);

  const selectItem = useCallback((id, e) => {
    e?.stopPropagation();
    setSelectedId(id);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedId(null);
  }, []);

  const selectedItem = useMemo(
    () => items.find((i) => i.id === selectedId) || null,
    [items, selectedId]
  );

  const addPaletteColor = useCallback((hex) => {
    const c = normalizeHex(hex);
    if (!c) return false;
    setPalette((prev) => uniqHexList([c, ...prev]));
    setActiveColor(c);
    return true;
  }, []);

  const removePaletteColor = useCallback((hex) => {
    const c = normalizeHex(hex);
    if (!c) return;
    setPalette((prev) => prev.filter((x) => x !== c));
    setActiveColor((prev) => (prev === c ? "#3b82f6" : prev));
  }, []);

  const applyActiveColorToSelected = useCallback(
    (target) => {
      if (!selectedId) return;
      const c = normalizeHex(activeColor);
      if (!c) return;

      if (target === "fill") updateItem(selectedId, { fill: c });
      if (target === "stroke") updateItem(selectedId, { strokeColor: c, stroke: true });
      if (target === "text") updateItem(selectedId, { textColor: c });
    },
    [selectedId, activeColor, updateItem]
  );

  const beginMove = useCallback(
    (id, startX, startY) => {
      // In Preview Mode, the canvas is “live” and should not allow dragging.
      if (previewMode) return;

      const it = items.find((x) => x.id === id);
      if (!it || it.locked) return;

      dragRef.current = {
        mode: "move",
        id,
        startX,
        startY,
        origin: { x: it.x, y: it.y, w: it.w, h: it.h },
      };
    },
    [items, previewMode]
  );

  const beginResize = useCallback(
    (id, startX, startY) => {
      // Resizing is edit-only; disable in Preview Mode.
      if (previewMode) return;

      const it = items.find((x) => x.id === id);
      if (!it || it.locked) return;

      dragRef.current = {
        mode: "resize",
        id,
        startX,
        startY,
        origin: { x: it.x, y: it.y, w: it.w, h: it.h },
      };
    },
    [items, previewMode]
  );

  const onPointerMove = useCallback(
    (x, y) => {
      const st = dragRef.current;
      if (!st.mode || !st.id) return;

      const dx = x - st.startX;
      const dy = y - st.startY;

      setItems((prev) =>
        prev.map((it) => {
          if (it.id !== st.id) return it;

          if (st.mode === "move") {
            const nx = snap(st.origin.x + dx, snapToGrid, gridSize);
            const ny = snap(st.origin.y + dy, snapToGrid, gridSize);

            return {
              ...it,
              x: clamp(nx, 0, canvasSize.w - it.w),
              y: clamp(ny, 0, canvasSize.h - it.h),
            };
          }

          if (st.mode === "resize") {
            const nw = snap(st.origin.w + dx, snapToGrid, gridSize);
            const nh = snap(st.origin.h + dy, snapToGrid, gridSize);

            return {
              ...it,
              w: clamp(nw, 60, canvasSize.w - it.x),
              h: clamp(nh, 40, canvasSize.h - it.y),
            };
          }

          return it;
        })
      );
    },
    [canvasSize, snapToGrid, gridSize]
  );

  const endPointerAction = useCallback(() => {
    dragRef.current = {
      mode: null,
      id: null,
      startX: 0,
      startY: 0,
      origin: null,
    };
  }, []);

  const bringToFront = useCallback(() => {
    if (!selectedId) return;
    setItems((prev) => {
      const maxZ = Math.max(...prev.map((i) => i.zIndex || 1));
      return prev.map((it) =>
        it.id === selectedId ? { ...it, zIndex: maxZ + 1 } : it
      );
    });
  }, [selectedId]);

  const sendToBack = useCallback(() => {
    if (!selectedId) return;
    setItems((prev) => {
      const minZ = Math.min(...prev.map((i) => i.zIndex || 1));
      return prev.map((it) =>
        it.id === selectedId ? { ...it, zIndex: minZ - 1 } : it
      );
    });
  }, [selectedId]);

  const loadBoardState = useCallback(
    (boardState = {}) => {
      if (!boardState || typeof boardState !== "object") return;
      undoStack.current = [];
      redoStack.current = [];
      setCollapsedGroups({});

      const nextCanvas = boardState.canvasSize;
      if (
        nextCanvas &&
        Number.isFinite(Number(nextCanvas.w)) &&
        Number.isFinite(Number(nextCanvas.h))
      ) {
        setCanvasSize({ w: Number(nextCanvas.w), h: Number(nextCanvas.h) });
      } else {
        setCanvasSize(initialCanvasSize);
      }
      lastMutationRef.current = "load";

      const settings = boardState.settings || {};
      setShowGrid(typeof settings.showGrid === "boolean" ? settings.showGrid : true);
      setSnapToGrid(typeof settings.snapToGrid === "boolean" ? settings.snapToGrid : true);

      if (Number.isFinite(Number(settings.gridSize)) && Number(settings.gridSize) > 0) {
        setGridSize(Number(settings.gridSize));
      } else {
        setGridSize(DEFAULT_GRID);
      }

      // Palette + active color
      const nextPalette = uniqHexList(settings.palette);
      if (nextPalette.length) setPalette(nextPalette);

      const nextActive = normalizeHex(settings.activeColor);
      if (nextActive) setActiveColor(nextActive);

      // Builder UI
      const nextAccent = normalizeHex(settings.uiAccent);
      if (nextAccent) setUiAccent(nextAccent);

      if (settings.uiDensity === "compact" || settings.uiDensity === "comfortable") {
        setUiDensity(settings.uiDensity);
      }

      const nextItems = Array.isArray(boardState.items) ? boardState.items : [];
      setItems(nextItems, { history: false });

      // Clear preview runtime whenever a board loads so old overlay state doesn’t linger.
      setPreviewOverrides({ visibleById: {} });

      const maybeSelected = boardState.selectedId;
      if (maybeSelected && nextItems.some((it) => it.id === maybeSelected)) {
        setSelectedId(maybeSelected);
      } else {
        setSelectedId(null);
      }
    },
    [initialCanvasSize]
  );

  /**
   * Apply preview overrides (visibility) without mutating source items.
   */
  const renderItems = useMemo(() => {
    if (!previewMode) return items;

    const vis = previewOverrides.visibleById || {};
    return items.map((it) => {
      if (Object.prototype.hasOwnProperty.call(vis, it.id)) {
        return { ...it, visible: !!vis[it.id] };
      }
      return it;
    });
  }, [items, previewMode, previewOverrides]);

  const openMockPurchase = useCallback((payload) => {
    setPreviewOverrides((prev) => ({
      ...prev,
      mockPurchase: payload || { kind: "Robux", id: "", sourceId: "", label: "Purchase" },
    }));
  }, []);

  const closeMockPurchase = useCallback(() => {
    setPreviewOverrides((prev) => ({ ...prev, mockPurchase: null }));
  }, []);

  const resetPreview = useCallback(() => {
    setPreviewOverrides({ visibleById: {}, mockPurchase: null });
  }, []);

  /**
   * Minimal interaction handler (MVP): supports onClick rules on items.
   * Rules:
   *   { type: "ToggleVisible", targetId }
   *   { type: "SetVisible", targetId, value: boolean }
   */
  const triggerItem = useCallback(
    (sourceId, trigger) => {
      if (!previewMode) return;
      if (trigger !== "OnClick") return;

      const src = items.find((x) => x.id === sourceId);
      if (!src) return;

      // Monetization mock modal
      const isMonetization =
        src.type === "MonetizationButton" ||
        !!src.monetizationKind ||
        !!src.monetizationId;
      if (isMonetization) {
        setPreviewOverrides((prev) => ({
          ...prev,
          mockPurchase: {
            kind: src.monetizationKind || "Robux",
            id: src.monetizationId || "",
            sourceId,
            label: src.text || "Purchase",
          },
        }));
        return;
      }

      const rule =
        (src.interactions && src.interactions.OnClick) ||
        src.onClick ||
        null;
      if (!rule || typeof rule !== "object") return;

      const { type, targetId } = rule;
      if (!targetId) return;

      if (type === "ToggleVisible") {
        setPreviewOverrides((prev) => {
          const oldVis = prev.visibleById || {};
          const current = Object.prototype.hasOwnProperty.call(oldVis, targetId)
            ? !!oldVis[targetId]
            : !!(items.find((x) => x.id === targetId)?.visible);

          return {
            ...prev,
            visibleById: {
              ...oldVis,
              [targetId]: !current,
            },
          };
        });
        return;
      }

      if (type === "SetVisible") {
        const value = rule.value === undefined ? true : !!rule.value;
        setPreviewOverrides((prev) => ({
          ...prev,
          visibleById: {
            ...(prev.visibleById || {}),
            [targetId]: value,
          },
        }));
        return;
      }

      if (type === "SetHidden") {
        setPreviewOverrides((prev) => ({
          ...prev,
          visibleById: {
            ...(prev.visibleById || {}),
            [targetId]: false,
          },
        }));
      }
    },
    [items, previewMode]
  );

  const value = {
    canvasSize,
    setCanvasSize,

    showGrid,
    setShowGrid,
    snapToGrid,
    setSnapToGrid,
    gridSize,
    setGridSize,

    // Board colors
    palette,
    setPalette,
    activeColor,
    setActiveColor,
    addPaletteColor,
    removePaletteColor,
    applyActiveColorToSelected,

    // Builder UI (site)
    uiAccent,
    setUiAccent,
    uiDensity,
    setUiDensity,

    // Board truth
    items,
    addItem,
    updateItem,
    deleteSelected,
    setItems,
    undo,
    redo,
    canUndo: undoStack.current.length > 0,
    canRedo: redoStack.current.length > 0,
    setItemVisible,
    setItemLocked,
    setItemParent,
    createGroup,
    collapsedGroups,
    toggleGroupCollapsed,

    selectedId,
    setSelectedId,
    selectedItem,
    selectItem,
    clearSelection,
    beginMove,
    beginResize,
    onPointerMove,
    endPointerAction,
    bringToFront,
    sendToBack,
    loadBoardState,

    // Preview runtime
    previewMode,
    setPreviewMode,
    renderItems,
    triggerItem,
    resetPreview,
    previewMockPurchase: previewOverrides.mockPurchase,
    openMockPurchase,
    closeMockPurchase,

    lastMutationKind: lastMutationRef.current,
  };

  return <CanvasContext.Provider value={value}>{children}</CanvasContext.Provider>;
}

export function useCanvas() {
  const ctx = useContext(CanvasContext);
  if (!ctx) {
    throw new Error("useCanvas must be used inside <CanvasProvider>");
  }
  return ctx;
}
