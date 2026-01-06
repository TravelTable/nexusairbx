import React, { useMemo, useRef } from "react";
import CanvasGrid from "./CanvasGrid";
import CanvasItem from "./CanvasItem";
import { useCanvas } from "./CanvasContext";

/**
 * Canvas
 * - Roblox ScreenGui–accurate viewport
 * - Renders UI items
 * - Owns pointer space (pixel-perfect)
 *
 * DOES NOT:
 * - know about AI
 * - know about behaviors
 * - talk to server
 */

export default function Canvas({
  width = 1280,
  height = 720,

  items = [],
  selectedId = null,

  showGrid = true,
  snapToGrid = true,

  overlay = null,

  onSelectItem,
  onClearSelection,

  onPointerMove,
  onPointerUp,
}) {
  const canvasRef = useRef(null);
  const { setSelectedImageId, selectedItem } = useCanvas();

  // Sort by ZIndex (Roblox-style layering)
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => (a.zIndex || 1) - (b.zIndex || 1));
  }, [items]);

  function handleBackgroundPointerDown() {
    onClearSelection?.();
  }

  function handleKeyDown(e) {
    const isMac = navigator.platform.toLowerCase().includes("mac");
    const mod = isMac ? e.metaKey : e.ctrlKey;

    if (mod && (e.key === "i" || e.key === "I")) {
      e.preventDefault();
      if (!selectedItem || selectedItem.type !== "ImageLabel") {
        alert("Select an ImageLabel first.");
        return;
      }
      const current = selectedItem.imageId || "";
      const raw = prompt(
        "Paste Roblox Image ID or URL (examples: 12345, rbxassetid://12345, https://www.roblox.com/asset/?id=12345)",
        current
      );
      if (raw == null) return;
      setSelectedImageId(raw);
    }
  }

  function handlePaste(e) {
    if (!selectedItem || selectedItem.type !== "ImageLabel") return;
    const text = e.clipboardData?.getData("text/plain");
    if (!text) return;
    const t = text.trim();
    const looksRelevant =
      /^\d+$/.test(t) ||
      t.startsWith("rbxassetid://") ||
      t.includes("roblox.com") ||
      t.includes("asset/?id=") ||
      t.includes("id=");
    if (!looksRelevant) return;
    e.preventDefault();
    setSelectedImageId(t);
  }

  return (
    <div
      style={{
        flex: 1,
        padding: 16,
        overflow: "auto",
        background: "#020617",
      }}
    >
      <div
        ref={canvasRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerDown={handleBackgroundPointerDown}
        style={{
          width,
          height,
          margin: "0 auto",
          position: "relative",
          background: "rgba(2,6,23,0.65)",
          borderRadius: 14,
          border: "1px solid rgba(148,163,184,0.25)",
          boxShadow: "0 10px 40px rgba(0,0,0,0.35)",
          userSelect: "none",
          outline: "none",
        }}
      >
        {/* Grid overlay */}
        <CanvasGrid enabled={showGrid} snap={snapToGrid} />

        {/* ScreenGui size badge */}
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
          ScreenGui {width}×{height}
        </div>

        {/* Empty state */}
        {items.length === 0 && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              opacity: 0.85,
              pointerEvents: "none",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div style={{ fontWeight: 900, fontSize: 18 }}>Roblox UI Canvas</div>
              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>
                Add UI elements to place them exactly like Studio.
              </div>
              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 10 }}>
                Tip: Select an ImageLabel and press <b>Ctrl/Cmd + I</b> or paste an ID.
              </div>
            </div>
          </div>
        )}

        {/* Render UI items */}
        {sortedItems.map((item) => (
          <CanvasItem
            key={item.id}
            item={item}
            selected={item.id === selectedId}
            canvasRef={canvasRef}
            onSelect={onSelectItem}
          />
        ))}

        {/* Overlay (preview modals etc) */}
        {overlay}
      </div>
    </div>
  );
}
