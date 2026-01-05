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

    // Preview runtime
    previewMode,
    triggerItem,
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
    // Monetization metadata (optional)
    monetizationKind,
    monetizationId,
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

    // Preview Mode: treat UI as “live” (no drag/resize)
    if (previewMode) {
      if (type === "TextButton") {
        triggerItem?.(id, "OnClick");
      }
      return;
    }

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

  const isTextLike =
    type === "TextLabel" || type === "TextButton" || type === "MonetizationButton";

  const isImageLike = type === "ImageLabel";

  const monetizationBadge =
    type === "MonetizationButton"
      ? `${monetizationKind || "Robux"}${
          monetizationId ? ` • ${monetizationId}` : " • set id"
        }`
      : null;

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
      {isTextLike ? (
        <div
          style={{
            width: "100%",
            height: "100%",
            padding: 10,
            textAlign: "center",
            color: textColor,
            fontSize,
            fontWeight: type === "TextButton" || type === "MonetizationButton" ? 800 : 700,
            pointerEvents: "none",
            lineHeight: 1.2,
            whiteSpace: "pre-wrap",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          {text || (type === "MonetizationButton" ? "Buy" : type === "TextButton" ? "Button" : "TextLabel")}

          {monetizationBadge && (
            <div
              style={{
                position: "absolute",
                left: 8,
                bottom: 8,
                fontSize: 10,
                opacity: 0.9,
                background: "rgba(2,6,23,0.65)",
                border: "1px solid rgba(148,163,184,0.25)",
                borderRadius: 999,
                padding: "3px 8px",
              }}
            >
              {monetizationBadge}
            </div>
          )}
        </div>
      ) : null}

      {isImageLike ? (
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
            }}
          />

          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              fontSize: 12,
              opacity: 0.85,
              padding: 10,
              textAlign: "center",
              color: "rgba(226,232,240,0.9)",
            }}
          >
            <div>
              <div style={{ fontWeight: 900 }}>ImageLabel</div>
              <div style={{ fontSize: 11, opacity: 0.8, marginTop: 6 }}>
                {imageId ? imageId : "rbxassetid://"}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Resize handle */}
      {!previewMode && selected && !locked && <ResizeHandle onPointerDown={handleResizePointerDown} />}
    </div>
  );
}
