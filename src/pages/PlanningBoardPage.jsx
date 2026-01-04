// src/pages/UiBuilderPage.jsx
import React, { useEffect, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import { CanvasProvider, useCanvas } from "@/components/canvascomponents/CanvasContext";
import CanvasGrid from "@/components/canvascomponents/CanvasGrid";
import CanvasItem from "@/components/canvascomponents/CanvasItem";
import {
  listBoards,
  createBoard,
  getBoard,
  getSnapshot,
  createSnapshot,
} from "@/lib/uiBuilderApi";

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
    setItems,
    selectedId,
    setSelectedId,
    selectedItem,
    showGrid,
    setShowGrid,
    snapToGrid,
    setSnapToGrid,
    gridSize,
    addItem,
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
          const snap = await getSnapshot({
            token,
            boardId: selectedBoardId,
            snapshotId: res.board.latestSnapshotId,
          });
          if (snap?.snapshot?.boardState) {
            loadBoardState(snap.snapshot.boardState);
            lastSavedStringRef.current = JSON.stringify(snap.snapshot.boardState);
          }
        } else {
          loadBoardState({
            canvasSize: res.board?.canvasSize,
            settings: res.board?.settings,
            items: [],
            selectedId: null,
          });
          lastSavedStringRef.current = JSON.stringify({});
        }
      } catch (e) {
        console.error("Failed to load board", e);
      } finally {
        setLoadingBoard(false);
      }
    })();
  }, [user, selectedBoardId, loadBoardState]);

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
  }, [user, selectedBoardId, canvasSize, items, selectedId, showGrid, snapToGrid, gridSize]);

  const handlePointerMove = (e) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    const px = e.clientX - (rect?.left || 0);
    const py = e.clientY - (rect?.top || 0);
    onPointerMove(px, py);
  };

  const handlePointerUp = () => {
    endPointerAction();
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

  async function handleCreateBoard() {
    if (!user) return;
    const title = window.prompt("New board title", "Roblox UI Board");
    if (!title) return;
    try {
      setLoadingBoard(true);
      const token = await user.getIdToken();
      const res = await createBoard({ token, title: title.trim(), canvasSize, settings: { showGrid, snapToGrid, gridSize } });
      setSelectedBoardId(res.boardId);
      setSelectedBoard(res.board || null);
      loadBoardState({
        canvasSize: res.board?.canvasSize,
        settings: res.board?.settings,
        items: [],
        selectedId: null,
      });
      lastSavedStringRef.current = JSON.stringify({});
      const list = await listBoards({ token });
      setBoards(list.boards || []);
    } catch (e) {
      console.error("Create board failed", e);
    } finally {
      setLoadingBoard(false);
    }
  }

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#0b1020", color: "#e5e7eb" }}>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, borderBottom: "1px solid rgba(148,163,184,0.2)" }}>
        <div style={{ fontWeight: 700, letterSpacing: 0.2 }}>Roblox UI Builder</div>
        {selectedBoard && (
          <div style={{ fontSize: 12, opacity: 0.85 }}>
            Board: <b>{selectedBoard.title}</b> {selectedBoard.projectId ? `(Project ${selectedBoard.projectId})` : ""}
          </div>
        )}
        <div style={{ fontSize: 12, opacity: 0.65, marginLeft: 8 }}>
          {loadingBoard ? "Loading board..." : saving ? "Saving..." : ""}
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => setShowGrid((v) => !v)} style={btnStyle("secondary")}>
            {showGrid ? "Hide Grid" : "Show Grid"}
          </button>
          <button onClick={() => setSnapToGrid((v) => !v)} style={btnStyle("secondary")}>
            {snapToGrid ? "Snap: On" : "Snap: Off"}
          </button>
          <button style={btnStyle("primary")} disabled title="Wire AI generation later">
            Generate (AI)
          </button>
        </div>
      </div>

      {/* Main layout */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "260px 1fr 320px", minHeight: 0 }}>
        {/* Left: Boards + Palette */}
        <div style={{ borderRight: "1px solid rgba(148,163,184,0.2)", padding: 12, overflow: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
          <Section title="Boards">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button style={btnStyle("secondary")} onClick={handleCreateBoard} disabled={!user || loadingBoard}>
                + New Board
              </button>
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                {loadingBoards ? "Loading boards..." : ""}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
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
                    <div style={{ fontSize: 11, opacity: 0.7 }}>
                      {b.updatedAt ? new Date(b.updatedAt).toLocaleString() : "—"}
                    </div>
                  </button>
                ))}
                {boards.length === 0 && !loadingBoards && (
                  <div style={{ fontSize: 12, opacity: 0.65 }}>No boards yet.</div>
                )}
              </div>
            </div>
          </Section>

          <Section title="Palette">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button style={btnStyle("secondary")} onClick={() => addPrimitive("Frame")}>+ Frame</button>
              <button style={btnStyle("secondary")} onClick={() => addPrimitive("TextLabel")}>+ TextLabel</button>
              <button style={btnStyle("secondary")} onClick={() => addPrimitive("TextButton")}>+ TextButton</button>
              <button style={btnStyle("secondary")} onClick={() => addPrimitive("ImageLabel")}>+ ImageLabel</button>
            </div>
          </Section>

          <Section title="Roblox ScreenGui Sizes">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button style={btnStyle("secondary")} onClick={() => setCanvasSize({ w: 1280, h: 720 })}>Desktop (1280x720)</button>
              <button style={btnStyle("secondary")} onClick={() => setCanvasSize({ w: 1920, h: 1080 })}>Desktop Large (1920x1080)</button>
              <button style={btnStyle("secondary")} onClick={() => setCanvasSize({ w: 1366, h: 768 })}>Laptop (1366x768)</button>
              <button style={btnStyle("secondary")} onClick={() => setCanvasSize({ w: 1024, h: 768 })}>Tablet (1024x768)</button>
              <button style={btnStyle("secondary")} onClick={() => setCanvasSize({ w: 375, h: 812 })}>Mobile Portrait (375x812)</button>
              <button style={btnStyle("secondary")} onClick={() => setCanvasSize({ w: 812, h: 375 })}>Mobile Landscape (812x375)</button>
            </div>
          </Section>
        </div>

        {/* Center: Canvas */}
        <div style={{ padding: 16, overflow: "auto" }}>
          <div
            ref={canvasRef}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onPointerDown={clearSelection}
            style={{
              width: canvasSize.w,
              height: canvasSize.h,
              margin: "0 auto",
              borderRadius: 14,
              border: "1px solid rgba(148,163,184,0.25)",
              background: "rgba(2,6,23,0.65)",
              position: "relative",
              boxShadow: "0 10px 40px rgba(0,0,0,0.35)",
              userSelect: "none",
            }}
          >
            <CanvasGrid enabled={showGrid} size={gridSize} />

            <div
              style={{
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
              }}
            >
              ScreenGui {canvasSize.w}x{canvasSize.h}
            </div>

            {items
              .slice()
              .sort((a, b) => (a.zIndex || 1) - (b.zIndex || 1))
              .map((it) => (
                <CanvasItem
                  key={it.id}
                  item={it}
                  selected={it.id === selectedId}
                  canvasRef={canvasRef}
                />
              ))}
          </div>
        </div>

        {/* Right: Properties (placeholder uses selectedItem) */}
        <div style={{ borderLeft: "1px solid rgba(148,163,184,0.2)", padding: 12, overflow: "auto" }}>
          <Section title="Properties">
            {!selectedItem ? (
              <div style={{ fontSize: 12, opacity: 0.7 }}>Select an element on the canvas to edit properties.</div>
            ) : (
              <div style={{ fontSize: 12, opacity: 0.85 }}>
                Selected: <b>{selectedItem.type}</b> - {selectedItem.name}
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
      <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 0.4, opacity: 0.9, marginBottom: 10 }}>
        {title}
      </div>
      <div
        style={{
          border: "1px solid rgba(148,163,184,0.18)",
          background: "rgba(15,23,42,0.35)",
          borderRadius: 14,
          padding: 12,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function btnStyle(variant) {
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
      background: "rgba(59,130,246,0.85)",
      border: "1px solid rgba(59,130,246,0.55)",
    };
  }
  if (variant === "danger") {
    return {
      ...base,
      background: "rgba(239,68,68,0.85)",
      border: "1px solid rgba(239,68,68,0.55)",
    };
  }
  if (variant === "ghost") {
    return {
      ...base,
      background: "rgba(2,6,23,0.20)",
    };
  }
  return base;
}
