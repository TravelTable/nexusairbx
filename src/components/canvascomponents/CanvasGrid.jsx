import React from "react";

/**
 * CanvasGrid
 * - Visual grid overlay
 * - Pixel-aligned
 * - Pointer-events disabled
 *
 * This does NOT control snapping logic.
 * Snapping happens in CanvasContext.
 */

const GRID_SIZE = 10;

export default function CanvasGrid({ enabled = true, size = GRID_SIZE }) {
  if (!enabled) return null;

  const grid = Number(size) > 0 ? Number(size) : GRID_SIZE;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        backgroundImage: `
          linear-gradient(
            to right,
            rgba(148,163,184,0.12) 1px,
            transparent 1px
          ),
          linear-gradient(
            to bottom,
            rgba(148,163,184,0.12) 1px,
            transparent 1px
          )
        `,
        backgroundSize: `${grid}px ${grid}px`,
        zIndex: 1,
      }}
    />
  );
}
