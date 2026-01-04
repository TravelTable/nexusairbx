import React from "react";
import SelectionOutline from "./SelectionOutline";
import ResizeHandle from "./ResizeHandle";
import { useCanvas } from "./CanvasContext";

/**
 * CanvasItem
 * - Renders ONE Roblox UI instance
 * - Starts MOVE on pointer down
 * - Starts RESIZE on resize handle pointer down
 * - All math/state lives in CanvasContext
 */
export default function CanvasItem({ item, selected, canvasRef }) {
  const {
    selectItem,
    beginMove,
    beginResize,
  } = useCanvas();

  const {
    id,
    type,
    name,
    x,
    y,
    w,
    h,
    fill,
    radius,
    stroke,
    strokeColor,
    strokeWidth,
    text,
    textColor,
    fontSize,
    imageId,
    locked,
    visible,
  } = item;

  if (!visible) return null;

  function getLocalPoint(e) {
    const rect = canvasRef?.current?.getBoundingClientRect();
    const left = rect?.left ?? 0;
    const top = rect?.top ?? 0;
    return {
      px: e.clientX - left,
      py: e.clientY - top,
    };
  }

  function handlePointerDown(e) {
    e.preventDefault();
    e.stopPropagation();
    if (locked) return;

    // select first
    selectItem(id, e);

    // start move using canvas-local pointer coords
    const { px, py } = getLocalPoint(e);
    beginMove(id, px, py);

    // keep receiving move events even if pointer leaves the element
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }

  function handleResizePointerDown(e) {
    e.preventDefault();
    e.stopPropagation();
    if (locked) return;

    // select first
    selectItem(id, e);

    // start resize using canvas-local pointer coords
    const { px, py } = getLocalPoint(e);
    beginResize(id, px, py);

    // capture pointer
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }

  return (
    <div
      onPointerDown={handlePointerDown}
      title={`${type} • ${name}`}
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        background: fill,
        borderRadius: radius,
        border: stroke ? `${strokeWidth}px solid ${strokeColor}` : "none",
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: locked ? "not-allowed" : "grab",
        userSelect: "none",
        touchAction: "none", // important for pointer drag on touch devices
      }}
    >
      {/* Selection outline */}
      {selected && <SelectionOutline />}

      {/* Content */}
      {type === "TextLabel" || type === "TextButton" ? (
        <div
          style={{
            width: "100%",
            padding: 10,
            textAlign: "center",
            color: textColor,
            fontSize,
            fontWeight: type === "TextButton" ? 800 : 700,
            pointerEvents: "none",
            lineHeight: 1.2,
            whiteSpace: "pre-wrap",
          }}
        >
          {text || (type === "TextButton" ? "Button" : "TextLabel")}
        </div>
      ) : null}

      {type === "ImageLabel" ? (
        <div
          style={{
            width: "100%",
            height: "100%",
            position: "relative",
            overflow: "hidden",
            pointerEvents: "none",
          }}
        >
          {/* Placeholder preview (later we can render actual images) */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))",
              display: "grid",
              placeItems: "center",
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.85, textAlign: "center", padding: 10 }}>
              <div style={{ fontWeight: 800 }}>ImageLabel</div>
              <div style={{ opacity: 0.7, marginTop: 4 }}>
                {imageId || "Missing ImageId"}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {type === "Frame" ? (
        <div
          style={{
            fontSize: 12,
            opacity: 0.8,
            pointerEvents: "none",
            textAlign: "center",
          }}
        >
          <div style={{ fontWeight: 800 }}>{name || "Frame"}</div>
          <div style={{ opacity: 0.7 }}>Frame</div>
        </div>
      ) : null}

      {/* Resize handle (only when selected + not locked) */}
      {selected && !locked && (
        <ResizeHandle onPointerDown={handleResizePointerDown} />
      )}
    </div>
  );
}
