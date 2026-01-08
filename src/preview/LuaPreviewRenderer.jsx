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
      <div className="h-full flex items-center justify-center text-red-500">
        Invalid Lua (no UI manifest)
      </div>
    );
  }

  const items = Array.isArray(board.items) ? board.items : [];

  const canvasW = board.canvasSize?.w || 1280;
  const canvasH = board.canvasSize?.h || 720;
  const scale = box.w && box.h ? Math.min(box.w / canvasW, box.h / canvasH, 1) : 1;

  return (
    <div ref={outerRef} className="w-full h-full flex items-center justify-center">
      <div
        className="relative bg-zinc-900 overflow-hidden"
        style={{
          width: canvasW,
          height: canvasH,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          borderRadius: 12,
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
  const style = {
    position: "absolute",
    left: item.x,
    top: item.y,
    width: item.w,
    height: item.h,
    zIndex: item.zIndex || 1,
    borderRadius: item.radius || 0,
    background: item.fill || "#111827",
    border: item.stroke
      ? `${item.strokeWidth || 1}px solid ${item.strokeColor || "#334155"}`
      : "none",
    color: item.textColor || "#e5e7eb",
    display: item.visible === false ? "none" : "flex",
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: interactive ? "auto" : "none",
    userSelect: "none",
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
          transition: "transform 120ms ease",
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
