// src/pages/UiBuilderPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import { CanvasProvider, useCanvas } from "../components/canvascomponents/CanvasContext";
import CanvasGrid from "../components/canvascomponents/CanvasGrid";
import CanvasItem from "../components/canvascomponents/CanvasItem";
import { listBoards, createBoard, getBoard, getSnapshot, createSnapshot, aiGenerateBoard } from "../lib/uiBuilderApi";

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

  const {
    canvasSize,
    setCanvasSize,
    items,
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
    setActiveColor,
    addPaletteColor,
    removePaletteColor,
    applyActiveColorToSelected,

    // Builder UI (site)
    uiAccent,
    setUiAccent,
    uiDensity,
    setUiDensity,

    addItem,
    updateItem,
    deleteSelected,
    bringToFront,
    sendToBack,

    clearSelection,
    onPointerMove,
    endPointerAction,
    loadBoardState,
  } = useCanvas();

  const [boards, setBoards] = useState([]);
  const [loadingBoards, setLoadingBoards] = useState(false);
  const [loadingBoard, setLoadingBoard] = useState(false);
  const [selectedBoardId, setSelectedBoardId] = useState(null);
  const [selectedBoard, setSelectedBoard] = useState(null);
  const [user, setUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [newPaletteHex, setNewPaletteHex] = useState("#");

  // AI generate UI
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u || null));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) {
      setBoards([]);
      setSelectedBoardId(null);
      setSelectedBoard(null);
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
      } catch (e) {
        console.error("Failed to load board", e);
      } finally {
        setLoadingBoard(false);
      }
    })();
  }, [user, selectedBoardId, loadBoardState]);

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

    saveTimerRef.current = setTimeout(async () => {
      try {
        setSaving(true);
        const token = await user.getIdToken();
        await createSnapshot({ token, boardId: selectedBoardId, boardState: state });
        lastSavedStringRef.current = serialized;
      } catch (e) {
        console.error("Autosave failed", e);
      } finally {
        setSaving(false);
      }
    }, 800);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [user, selectedBoardId, canvasSize, items, selectedId, showGrid, snapToGrid, gridSize, palette, activeColor, uiAccent, uiDensity]);

  const handlePointerMove = (e) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    const px = e.clientX - (rect?.left || 0);
    const py = e.clientY - (rect?.top || 0);
    onPointerMove(px, py);
  };

  const handlePointerUp = () => endPointerAction();

  const patchSelected = (patch) => {
    if (!selectedItem) return;
    updateItem(selectedItem.id, patch);
  };

  function addPrimitive(type) {
    const base =
      type === "TextLabel"
        ? { w: 220, h: 60, text: "TextLabel" }
        : type === "TextButton"
        ? { w: 200, h: 60, text: "Button" }
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

  async function handleCreateBoard() {
    if (!user) return;
    const title = window.prompt("New board title", "Roblox UI Board");
    if (!title) return;
    try {
      setLoadingBoard(true);
      const token = await user.getIdToken();
      const res = await createBoard({
        token,
        title: title.trim(),
        canvasSize,
        settings: { showGrid, snapToGrid, gridSize },
      });
      setSelectedBoardId(res.boardId);
      setSelectedBoard(res.board || null);
      loadBoardState({ canvasSize: res.board?.canvasSize, settings: res.board?.settings, items: [], selectedId: null });
      lastSavedStringRef.current = JSON.stringify({});
      const list = await listBoards({ token });
      setBoards(list.boards || []);
    } catch (e) {
      console.error("Create board failed", e);
    } finally {
      setLoadingBoard(false);
    }
  }

  // --- AI helpers ---
  function sanitizeBoardState(maybeState) {
    const state = (maybeState && typeof maybeState === "object") ? maybeState : {};
    const safeCanvas = state.canvasSize && typeof state.canvasSize === "object"
      ? { w: Number(state.canvasSize.w) || canvasSize.w, h: Number(state.canvasSize.h) || canvasSize.h }
      : { w: canvasSize.w, h: canvasSize.h };

    const safeSettings = state.settings && typeof state.settings === "object"
      ? {
          ...state.settings,
          gridSize: Number(state.settings.gridSize) || gridSize,
          snapToGrid: typeof state.settings.snapToGrid === "boolean" ? state.settings.snapToGrid : snapToGrid,
          showGrid: typeof state.settings.showGrid === "boolean" ? state.settings.showGrid : showGrid,
        }
      : { gridSize, snapToGrid, showGrid };

    const safeItems = Array.isArray(state.items) ? state.items : [];

    // Keep only keys your renderer already understands
    const cleanedItems = safeItems
      .filter((it) => it && typeof it === "object")
      .map((it) => ({
        id: String(it.id || crypto.randomUUID()),
        type: String(it.type || "Frame"),
        name: String(it.name || it.type || "Item"),
        x: Number(it.x) || 0,
        y: Number(it.y) || 0,
        w: Number(it.w) || 200,
        h: Number(it.h) || 100,
        zIndex: Number(it.zIndex) || 1,
        fill: String(it.fill || "#111827"),
        radius: Number(it.radius) || 12,
        stroke: typeof it.stroke === "boolean" ? it.stroke : true,
        strokeColor: String(it.strokeColor || "#334155"),
        strokeWidth: Number(it.strokeWidth) || 2,
        text: String(it.text || ""),
        textColor: String(it.textColor || "#ffffff"),
        fontSize: Number(it.fontSize) || 18,
        imageId: String(it.imageId || ""),
        locked: !!it.locked,
      }));

    return {
      canvasSize: safeCanvas,
      settings: safeSettings,
      items: cleanedItems,
      selectedId: null,
    };
  }

  async function promptForMissingAssets(boardState) {
    // Ask for ImageIds for ImageLabels with empty/placeholder ImageId
    const itemsCopy = boardState.items.map((it) => ({ ...it }));

    for (let i = 0; i < itemsCopy.length; i++) {
      const it = itemsCopy[i];
      const isImage = it.type === "ImageLabel";
      const missing =
        !it.imageId ||
        it.imageId.trim() === "" ||
        it.imageId.trim() === "rbxassetid://" ||
        it.imageId.trim().endsWith("rbxassetid://");

      if (isImage && missing) {
        const val = window.prompt(
          `Missing ImageId for "${it.name}" (ImageLabel).\n\nPaste a Roblox asset id like:\nrbxassetid://123456789`,
          "rbxassetid://"
        );
        if (val && val.trim()) {
          it.imageId = val.trim();
        }
      }
    }

    return { ...boardState, items: itemsCopy };
  }

  async function handleAIGenerate() {
    if (!user) return;
    if (!selectedBoardId) {
      window.alert("Pick or create a board first.");
      return;
    }
    if (!aiPrompt.trim()) {
      window.alert("Type what UI you want first.");
      return;
    }

    try {
      setAiGenerating(true);
      const token = await user.getIdToken();

      const res = await aiGenerateBoard({
        token,
        prompt: aiPrompt.trim(),
        canvasSize,
      });

      const sanitized = sanitizeBoardState(res?.boardState);
      const hydrated = await promptForMissingAssets(sanitized);

      // Apply to canvas immediately (board JSON is source of truth)
      loadBoardState(hydrated);
      lastSavedStringRef.current = JSON.stringify(hydrated);

      // Optional: create a snapshot immediately so it’s not lost
      await createSnapshot({ token, boardId: selectedBoardId, boardState: hydrated });

      setShowAiModal(false);
      setAiPrompt("");
    } catch (e) {
      console.error("AI generate failed", e);
      window.alert(e?.message || "AI generate failed");
    } finally {
      setAiGenerating(false);
    }
  }

  const selectedLabel = useMemo(() => {
    if (!selectedItem) return "";
    if (selectedItem.type === "MonetizationButton") {
      const kind = selectedItem.monetizationKind || "Robux";
      const id = selectedItem.monetizationId || "(missing id)";
      return `${kind} • ${id}`;
    }
    return selectedItem.type;
  }, [selectedItem]);

  return (
    <div style={styles.page}>
      {/* Top bar */}
      <div style={styles.topbar}>
        <div style={styles.brand}>Roblox UI Builder</div>
        {selectedBoard && (
          <div style={styles.boardMeta}>
            Board: <b>{selectedBoard.title}</b> {selectedBoard.projectId ? `(Project ${selectedBoard.projectId})` : ""}
          </div>
        )}
        <div style={styles.status}>{loadingBoard ? "Loading..." : saving ? "Saving..." : ""}</div>

        <div style={styles.topbarActions}>
          <button onClick={() => setShowGrid((v) => !v)} style={btnStyle("secondary")}>
            {showGrid ? "Hide Grid" : "Show Grid"}
          </button>
          <button onClick={() => setSnapToGrid((v) => !v)} style={btnStyle("secondary")}>
            {snapToGrid ? "Snap: On" : "Snap: Off"}
          </button>
          <button
            style={btnStyle("primary", uiAccent)}
            onClick={() => setShowAiModal(true)}
            disabled={!user || !selectedBoardId || aiGenerating}
            title={!selectedBoardId ? "Select a board first" : "Generate a full UI with AI"}
          >
            {aiGenerating ? "Generating..." : "Generate (AI)"}
          </button>
        </div>
      </div>

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
                <button
                  key={b.id}
                  onClick={() => setSelectedBoardId(b.id)}
                  style={{
                    ...btnStyle("ghost"),
                    textAlign: "left",
                    border: b.id === selectedBoardId ? "1px solid rgba(59,130,246,0.65)" : "1px solid rgba(148,163,184,0.18)",
                    background: b.id === selectedBoardId ? "rgba(59,130,246,0.10)" : "rgba(15,23,42,0.35)",
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 800 }}>{b.title}</div>
                  <div style={{ fontSize: 11, opacity: 0.7 }}>{b.updatedAt ? new Date(b.updatedAt).toLocaleString() : "—"}</div>
                </button>
              ))}
              {boards.length === 0 && !loadingBoards && <div style={{ fontSize: 12, opacity: 0.65 }}>No boards yet.</div>}
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

          <Section title="Colors">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {palette.map((c) => (
                <button
                  key={c}
                  onClick={() => setActiveColor(c)}
                  title={c}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 10,
                    background: c,
                    border: c === activeColor ? `2px solid ${uiAccent}` : "1px solid rgba(148,163,184,0.30)",
                    boxShadow: c === activeColor ? `0 0 0 3px rgba(59,130,246,0.18)` : "none",
                    cursor: "pointer",
                  }}
                />
              ))}
            </div>

            <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
              <input
                value={newPaletteHex}
                onChange={(e) => setNewPaletteHex(e.target.value)}
                placeholder="#rrggbb"
                style={inputStyle()}
              />
              <button
                style={btnStyle("secondary")}
                onClick={() => {
                  const ok = addPaletteColor(newPaletteHex);
                  if (!ok) alert("Invalid color. Use #rrggbb (or #rgb).");
                  setNewPaletteHex("#");
                }}
              >
                Add
              </button>
            </div>

            <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <button style={btnStyle("ghost")} disabled={!selectedItem} onClick={() => applyActiveColorToSelected("fill")}>
                Apply Fill
              </button>
              <button style={btnStyle("ghost")} disabled={!selectedItem} onClick={() => applyActiveColorToSelected("stroke")}>
                Apply Stroke
              </button>
              <button style={btnStyle("ghost")} disabled={!selectedItem} onClick={() => applyActiveColorToSelected("text")}>
                Apply Text
              </button>
            </div>

            <div style={{ marginTop: 10 }}>
              <button
                style={btnStyle("danger")}
                disabled={!activeColor}
                onClick={() => removePaletteColor(activeColor)}
                title="Remove active color from palette"
              >
                Remove Active
              </button>
            </div>
          </Section>

          <Section title="Builder UI">
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
              <div>
                <div style={{ fontSize: 11, opacity: 0.75, marginBottom: 6 }}>Accent</div>
                <input value={uiAccent} onChange={(e) => setUiAccent(e.target.value)} style={inputStyle()} />
              </div>

              <div>
                <div style={{ fontSize: 11, opacity: 0.75, marginBottom: 6 }}>Density</div>
                <select value={uiDensity} onChange={(e) => setUiDensity(e.target.value)} style={inputStyle()}>
                  <option value="comfortable">Comfortable</option>
                  <option value="compact">Compact</option>
                </select>
              </div>
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
            style={{ ...styles.canvas, width: canvasSize.w, height: canvasSize.h }}
          >
            <CanvasGrid enabled={showGrid} size={gridSize} />

            <div style={styles.canvasBadge}>ScreenGui {canvasSize.w}×{canvasSize.h}</div>

            {items
              .slice()
              .sort((a, b) => (a.zIndex || 1) - (b.zIndex || 1))
              .map((it) => (
                <CanvasItem key={it.id} item={it} selected={it.id === selectedId} canvasRef={canvasRef} />
              ))}
          </div>
        </div>

        {/* Right */}
        <div style={{ borderLeft: "1px solid rgba(148,163,184,0.2)", padding: uiDensity === "compact" ? 10 : 12, overflow: "auto" }}>
          <Section title="Properties">
            {!selectedItem ? (
              <div style={{ fontSize: 12, opacity: 0.7 }}>Select an element on the canvas to edit properties.</div>
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

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <label style={labelStyle()}>
                    Name
                    <input
                      value={selectedItem.name || ""}
                      onChange={(e) => updateItem(selectedItem.id, { name: e.target.value })}
                      style={inputStyle()}
                    />
                  </label>

                  <label style={labelStyle()}>
                    ZIndex
                    <input
                      type="number"
                      value={Number(selectedItem.zIndex || 1)}
                      onChange={(e) => updateItem(selectedItem.id, { zIndex: Number(e.target.value || 1) })}
                      style={inputStyle()}
                    />
                  </label>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <label style={labelStyle()}>
                    X
                    <input
                      type="number"
                      value={Number(selectedItem.x || 0)}
                      onChange={(e) => updateItem(selectedItem.id, { x: Number(e.target.value || 0) })}
                      style={inputStyle()}
                    />
                  </label>
                  <label style={labelStyle()}>
                    Y
                    <input
                      type="number"
                      value={Number(selectedItem.y || 0)}
                      onChange={(e) => updateItem(selectedItem.id, { y: Number(e.target.value || 0) })}
                      style={inputStyle()}
                    />
                  </label>
                  <label style={labelStyle()}>
                    W
                    <input
                      type="number"
                      value={Number(selectedItem.w || 0)}
                      onChange={(e) => updateItem(selectedItem.id, { w: Number(e.target.value || 0) })}
                      style={inputStyle()}
                    />
                  </label>
                  <label style={labelStyle()}>
                    H
                    <input
                      type="number"
                      value={Number(selectedItem.h || 0)}
                      onChange={(e) => updateItem(selectedItem.id, { h: Number(e.target.value || 0) })}
                      style={inputStyle()}
                    />
                  </label>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <button
                    style={btnStyle(selectedItem.visible === false ? "danger" : "secondary")}
                    onClick={() => updateItem(selectedItem.id, { visible: !(selectedItem.visible !== false) })}
                  >
                    {selectedItem.visible === false ? "Hidden" : "Visible"}
                  </button>

                  <button
                    style={btnStyle(selectedItem.locked ? "danger" : "secondary")}
                    onClick={() => updateItem(selectedItem.id, { locked: !selectedItem.locked })}
                  >
                    {selectedItem.locked ? "Locked" : "Unlocked"}
                  </button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <label style={labelStyle()}>
                    Fill
                    <input
                      value={selectedItem.fill || ""}
                      onChange={(e) => updateItem(selectedItem.id, { fill: e.target.value })}
                      style={inputStyle()}
                    />
                  </label>

                  <label style={labelStyle()}>
                    Radius
                    <input
                      type="number"
                      value={Number(selectedItem.radius || 0)}
                      onChange={(e) => updateItem(selectedItem.id, { radius: Number(e.target.value || 0) })}
                      style={inputStyle()}
                    />
                  </label>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <button
                    style={btnStyle(selectedItem.stroke ? "secondary" : "ghost")}
                    onClick={() => updateItem(selectedItem.id, { stroke: !selectedItem.stroke })}
                  >
                    {selectedItem.stroke ? "Stroke: On" : "Stroke: Off"}
                  </button>

                  <label style={labelStyle()}>
                    Stroke Width
                    <input
                      type="number"
                      value={Number(selectedItem.strokeWidth || 0)}
                      onChange={(e) => updateItem(selectedItem.id, { strokeWidth: Number(e.target.value || 0), stroke: true })}
                      style={inputStyle()}
                    />
                  </label>

                  <label style={labelStyle()}>
                    Stroke Color
                    <input
                      value={selectedItem.strokeColor || ""}
                      onChange={(e) => updateItem(selectedItem.id, { strokeColor: e.target.value, stroke: true })}
                      style={inputStyle()}
                    />
                  </label>

                  <div />
                </div>

                {(selectedItem.type === "TextLabel" || selectedItem.type === "TextButton") && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <label style={labelStyle()}>
                      Text
                      <input
                        value={selectedItem.text || ""}
                        onChange={(e) => updateItem(selectedItem.id, { text: e.target.value })}
                        style={inputStyle()}
                      />
                    </label>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <label style={labelStyle()}>
                        Text Color
                        <input
                          value={selectedItem.textColor || ""}
                          onChange={(e) => updateItem(selectedItem.id, { textColor: e.target.value })}
                          style={inputStyle()}
                        />
                      </label>

                      <label style={labelStyle()}>
                        Font Size
                        <input
                          type="number"
                          value={Number(selectedItem.fontSize || 18)}
                          onChange={(e) => updateItem(selectedItem.id, { fontSize: Number(e.target.value || 18) })}
                          style={inputStyle()}
                        />
                      </label>
                    </div>
                  </div>
                )}

                {selectedItem.type === "ImageLabel" && (
                  <label style={labelStyle()}>
                    ImageId
                    <input
                      value={selectedItem.imageId || ""}
                      onChange={(e) => updateItem(selectedItem.id, { imageId: e.target.value })}
                      style={inputStyle()}
                    />
                  </label>
                )}
              </div>
            )}
          </Section>
        </div>
      </div>

      {/* AI Modal */}
      {showAiModal && (
        <div
          onMouseDown={() => setShowAiModal(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "grid",
            placeItems: "center",
            zIndex: 999999,
            padding: 16,
          }}
        >
          <div
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              width: "min(720px, 96vw)",
              borderRadius: 16,
              border: "1px solid rgba(148,163,184,0.22)",
              background: "rgba(15,23,42,0.92)",
              boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
              padding: 14,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontWeight: 900, letterSpacing: 0.2 }}>Generate UI with AI</div>
              <div style={{ marginLeft: "auto" }}>
                <button style={btnStyle("ghost")} onClick={() => setShowAiModal(false)}>
                  Close
                </button>
              </div>
            </div>

            <div style={{ fontSize: 12, opacity: 0.75, marginTop: 8 }}>
              Describe what you want. Example: “A main menu with Play, Settings, Shop, and a currency counter top-right.”
            </div>

            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder='e.g. "Shop UI with 6 item cards, buy buttons, and a Robux badge. Use dark theme."'
              style={{
                marginTop: 10,
                width: "100%",
                minHeight: 110,
                resize: "vertical",
                borderRadius: 12,
                border: "1px solid rgba(148,163,184,0.25)",
                background: "rgba(2,6,23,0.55)",
                color: "#e5e7eb",
                padding: 12,
                outline: "none",
                fontSize: 13,
                lineHeight: 1.35,
              }}
            />

            <div style={{ display: "flex", gap: 10, marginTop: 12, justifyContent: "flex-end" }}>
              <button style={btnStyle("secondary")} onClick={() => setShowAiModal(false)} disabled={aiGenerating}>
                Cancel
              </button>
              <button style={btnStyle("primary")} onClick={handleAIGenerate} disabled={aiGenerating || !aiPrompt.trim()}>
                {aiGenerating ? "Generating..." : "Generate onto Board"}
              </button>
            </div>
          </div>
        </div>
      )}
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

function Group({ title, children }) {
  return (
    <div style={styles.group}>
      <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.4, opacity: 0.85, marginBottom: 10 }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{children}</div>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", alignItems: "center", gap: 10 }}>
      <div style={{ fontSize: 11, opacity: 0.75, fontWeight: 800 }}>{label}</div>
      <div>{children}</div>
    </div>
  );
}

function NumberInput({ value, onChange, min = -99999, max = 99999 }) {
  return (
    <input
      type="number"
      value={Number.isFinite(Number(value)) ? Number(value) : 0}
      min={min}
      max={max}
      onChange={(e) => {
        const n = Number(e.target.value);
        if (!Number.isFinite(n)) return;
        onChange?.(n);
      }}
      style={inputStyle()}
    />
  );
}

function ColorInput({ value, onChange }) {
  const safe = isHex(value) ? value : "#111827";
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <input type="color" value={safe} onChange={(e) => onChange?.(e.target.value)} style={styles.colorChip} />
      <input value={value || ""} onChange={(e) => onChange?.(e.target.value)} style={inputStyle()} />
    </div>
  );
}

function isHex(v) {
  return typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v.trim());
}

function labelStyle() {
  return { display: "flex", flexDirection: "column", gap: 6, fontSize: 11, opacity: 0.9 };
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

function textareaStyle() {
  return {
    ...inputStyle(),
    resize: "vertical",
    minHeight: 60,
    fontFamily: "inherit",
  };
}

function selectStyle() {
  return {
    ...inputStyle(),
    cursor: "pointer",
  };
}

function toggleStyle() {
  return {
    display: "flex",
    alignItems: "center",
    fontSize: 12,
    fontWeight: 800,
    opacity: 0.9,
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
    return { ...base, background: accent, border: `1px solid ${accent}` };
  }
  if (variant === "danger") {
    return { ...base, background: "rgba(239,68,68,0.85)", border: "1px solid rgba(239,68,68,0.55)" };
  }
  if (variant === "ghost") {
    return { ...base, background: "rgba(2,6,23,0.20)" };
  }
  return base;
}

const styles = {
  page: { height: "100vh", display: "flex", flexDirection: "column", background: "#0b1020", color: "#e5e7eb" },
  topbar: { display: "flex", alignItems: "center", gap: 12, padding: 12, borderBottom: "1px solid rgba(148,163,184,0.2)" },
  brand: { fontWeight: 700, letterSpacing: 0.2 },
  boardMeta: { fontSize: 12, opacity: 0.85 },
  status: { fontSize: 12, opacity: 0.65, marginLeft: 8 },
  topbarActions: { marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" },

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
