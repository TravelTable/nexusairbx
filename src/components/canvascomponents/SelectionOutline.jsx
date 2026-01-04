import React from "react";

/**
 * SelectionOutline
 * - Visual selection box
 * - Roblox Studio–style highlight
 * - Pointer-events disabled
 */

export default function SelectionOutline() {
  return (
    <div
      style={{
        position: "absolute",
        inset: -2,
        borderRadius: 8,
        border: "2px solid rgba(59,130,246,0.9)",
        boxShadow:
          "0 0 0 1px rgba(59,130,246,0.35), 0 6px 18px rgba(59,130,246,0.25)",
        pointerEvents: "none",
        zIndex: 9999,
      }}
    />
  );
}
