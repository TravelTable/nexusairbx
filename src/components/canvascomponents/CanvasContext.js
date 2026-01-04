import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

const CanvasContext = createContext(null);

const GRID = 10;

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function snap(n, enabled) {
  if (!enabled) return n;
  return Math.round(n / GRID) * GRID;
}

function uid() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return `id_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

export function CanvasProvider({
  children,
  initialCanvasSize = { w: 1280, h: 720 },
}) {
  const [canvasSize, setCanvasSize] = useState(initialCanvasSize);
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);

  const dragRef = useRef({
    mode: null,
    id: null,
    startX: 0,
    startY: 0,
    origin: null,
  });

  const addItem = useCallback((item) => {
    setItems((prev) => [
      ...prev,
      {
        id: uid(),
        zIndex: prev.length + 1,
        visible: true,
        locked: false,
        ...item,
      },
    ]);
  }, []);

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

  const beginMove = useCallback((id, startX, startY) => {
    const it = items.find((x) => x.id === id);
    if (!it || it.locked) return;

    dragRef.current = {
      mode: "move",
      id,
      startX,
      startY,
      origin: { x: it.x, y: it.y, w: it.w, h: it.h },
    };
  }, [items]);

  const beginResize = useCallback((id, startX, startY) => {
    const it = items.find((x) => x.id === id);
    if (!it || it.locked) return;

    dragRef.current = {
      mode: "resize",
      id,
      startX,
      startY,
      origin: { x: it.x, y: it.y, w: it.w, h: it.h },
    };
  }, [items]);

  const onPointerMove = useCallback((x, y) => {
    const st = dragRef.current;
    if (!st.mode || !st.id) return;

    const dx = x - st.startX;
    const dy = y - st.startY;

    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== st.id) return it;

        if (st.mode === "move") {
          const nx = snap(st.origin.x + dx, snapToGrid);
          const ny = snap(st.origin.y + dy, snapToGrid);

          return {
            ...it,
            x: clamp(nx, 0, canvasSize.w - it.w),
            y: clamp(ny, 0, canvasSize.h - it.h),
          };
        }

        if (st.mode === "resize") {
          const nw = snap(st.origin.w + dx, snapToGrid);
          const nh = snap(st.origin.h + dy, snapToGrid);

          return {
            ...it,
            w: clamp(nw, 60, canvasSize.w - it.x),
            h: clamp(nh, 40, canvasSize.h - it.y),
          };
        }

        return it;
      })
    );
  }, [canvasSize, snapToGrid]);

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

  const value = {
    canvasSize,
    setCanvasSize,
    showGrid,
    setShowGrid,
    snapToGrid,
    setSnapToGrid,
    items,
    addItem,
    updateItem,
    deleteSelected,
    selectedId,
    selectedItem,
    selectItem,
    clearSelection,
    beginMove,
    beginResize,
    onPointerMove,
    endPointerAction,
    bringToFront,
    sendToBack,
  };

  return (
    <CanvasContext.Provider value={value}>
      {children}
    </CanvasContext.Provider>
  );
}

export function useCanvas() {
  const ctx = useContext(CanvasContext);
  if (!ctx) {
    throw new Error("useCanvas must be used inside <CanvasProvider>");
  }
  return ctx;
}
