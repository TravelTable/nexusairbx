import React, { useLayoutEffect, useRef, useState } from "react";
import { extractUiManifestFromLua } from "../lib/extractUiManifestFromLua";

export default function LuaPreviewRenderer({ lua, interactive = false, onAction }) {
  const outerRef = useRef(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    if (!outerRef.current || typeof ResizeObserver === "undefined") return;
    const el = outerRef.current;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (!r) return;
      setBox({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (!lua) {
    return (
      <div className="h-full flex items-center justify-center text-zinc-500">
        No UI generated yet
      </div>
    );
  }

  const board = extractUiManifestFromLua(lua);
  if (!board) {
    return (
      <div className="h-full flex items-center justify-center text-red-500 p-4 text-center">
        Invalid Lua (no UI manifest found or malformed JSON)
      </div>
    );
  }

  const items = Array.isArray(board.items) ? board.items : [];

  const canvasW = Number(board.canvasSize?.w) || 1280;
  const canvasH = Number(board.canvasSize?.h) || 720;
  
  // Robust scaling: center the canvas and scale it to fit the container
  const scale = box.w && box.h ? Math.min(box.w / canvasW, box.h / canvasH, 1) : 1;

  return (
    <div ref={outerRef} className="w-full h-full flex items-center justify-center bg-black/40 overflow-hidden relative">
      <div
        className="relative bg-zinc-900 shadow-2xl"
        style={{
          width: canvasW,
          height: canvasH,
          transform: `scale(${scale})`,
          transformOrigin: "center center", // Changed from top left to center center
          borderRadius: 12,
          flexShrink: 0,
        }}
      >
        {items.map((item) => (
          <PreviewNode
            key={item.id}
            item={item}
            interactive={interactive}
            onAction={onAction}
          />
        ))}
      </div>
    </div>
  );
}

function PreviewNode({ item, interactive, onAction }) {
  // Ensure coordinates and dimensions are numbers
  const x = Number(item.x) || 0;
  const y = Number(item.y) || 0;
  const w = Number(item.w) || 0;
  const h = Number(item.h) || 0;

  const style = {
    position: "absolute",
    left: x,
    top: y,
    width: w,
    height: h,
    zIndex: Number(item.zIndex) || 1,
    borderRadius: Number(item.radius) || 0,
    background: item.fill || "#111827",
    border: item.stroke
      ? `${Number(item.strokeWidth) || 1}px solid ${item.strokeColor || "#334155"}`
      : "none",
    color: item.textColor || "#e5e7eb",
    display: item.visible === false ? "none" : "flex",
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: interactive ? "auto" : "none",
    userSelect: "none",
    fontSize: Number(item.fontSize) || 14,
    overflow: "hidden",
    textAlign: "center",
    padding: 4,
  };

  if (item.type === "TextLabel") {
    return <div style={style}>{item.text}</div>;
  }

  if (item.type === "TextButton") {
    return (
      <button
        type="button"
        style={{
          ...style,
          cursor: interactive ? "pointer" : "default",
          transition: "transform 120ms ease, background-color 120ms ease",
        }}
        onClick={() => {
          if (!interactive) return;
          onAction?.({
            type: "click",
            id: item.id,
            label: item.text || "Button",
          });
        }}
      >
        {item.text || "Button"}
      </button>
    );
  }

  if (item.type === "TextBox") {
    return (
      <input
        style={{
          ...style,
          justifyContent: "flex-start",
          padding: 8,
          outline: "none",
        }}
        disabled={!interactive}
        placeholder={item.placeholder || "Type..."}
        onChange={(e) => {
          if (!interactive) return;
          onAction?.({
            type: "input",
            id: item.id,
            label: item.placeholder || "TextBox",
            value: e.target.value,
          });
        }}
      />
    );
  }

  if (item.type === "ImageLabel" && item.imageId) {
    const match = String(item.imageId || "").match(/(\d{5,})/);
    const src = match
      ? `https://www.roblox.com/asset-thumbnail/image?assetId=${match[1]}&width=420&height=420&format=png`
      : null;
    return (
      <div style={style}>
        {src ? (
          <img src={src} alt="" className="w-full h-full object-contain" />
        ) : null}
      </div>
    );
  }

  return <div style={style} />;
}
