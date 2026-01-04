// src/pages/UiBuilderPage.jsx
import React, { useRef } from "react";
import { CanvasProvider, useCanvas } from "@/components/canvascomponents/CanvasContext";
import CanvasGrid from "@/components/canvascomponents/CanvasGrid";
import CanvasItem from "@/components/canvascomponents/CanvasItem";

export default function UiBuilderPage() {
  return (
    <CanvasProvider initialCanvasSize={{ w: 1280, h: 720 }}>
      <UiBuilderPageInner />
    </CanvasProvider>
  );
}

function UiBuilderPageInner() {
  const canvasRef = useRef(null);

  const {
    canvasSize,
    setCanvasSize,
    items,
    selectedId,
    selectedItem,
    showGrid,
    setShowGrid,
    snapToGrid,
    setSnapToGrid,
    addItem,
    clearSelection,
    onPointerMove,
    endPointerAction,
  } = useCanvas();

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

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#0b1020", color: "#e5e7eb" }}>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, borderBottom: "1px solid rgba(148,163,184,0.2)" }}>
        <div style={{ fontWeight: 700, letterSpacing: 0.2 }}>Roblox UI Builder</div>

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
        {/* Left: Palette */}
        <div style={{ borderRight: "1px solid rgba(148,163,184,0.2)", padding: 12, overflow: "auto" }}>
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
            <CanvasGrid enabled={showGrid} />

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
                Selected: <b>{selectedItem.type}</b> — {selectedItem.name}
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
