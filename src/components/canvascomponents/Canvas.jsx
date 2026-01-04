import React, { useMemo, useRef } from "react";
import CanvasGrid from "./CanvasGrid";
import CanvasItem from "./CanvasItem";

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

  onSelectItem,
  onClearSelection,

  onPointerMove,
  onPointerUp,
}) {
  const canvasRef = useRef(null);

  // Sort by ZIndex (Roblox-style layering)
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => (a.zIndex || 1) - (b.zIndex || 1));
  }, [items]);

  function handleBackgroundPointerDown() {
    onClearSelection?.();
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
        }}
      >
        {/* Grid overlay */}
        <CanvasGrid
          enabled={showGrid}
          snap={snapToGrid}
        />

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
              <div style={{ fontWeight: 900, fontSize: 18 }}>
                Roblox UI Canvas
              </div>
              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>
                Add UI elements to place them exactly like Studio.
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
      </div>
    </div>
  );
}
