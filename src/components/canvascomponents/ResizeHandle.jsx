import React from "react";

/**
 * ResizeHandle
 * - Bottom-right resize grip
 * - Pointer-driven
 * - No logic, just signals intent
 */

export default function ResizeHandle({
  onPointerDown,
  size = 14,
}) {
  return (
    <div
      onPointerDown={(e) => {
        e.stopPropagation();
        onPointerDown?.(e);
      }}
      title="Resize"
      style={{
        position: "absolute",
        right: 4,
        bottom: 4,
        width: size,
        height: size,
        borderRadius: 4,
        background: "rgba(59,130,246,0.95)",
        border: "1px solid rgba(255,255,255,0.65)",
        boxShadow:
          "0 4px 12px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(0,0,0,0.25)",
        cursor: "nwse-resize",
        pointerEvents: "auto",
      }}
    />
  );
}
