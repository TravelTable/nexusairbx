import React from "react";
import { extractUiManifestFromLua } from "../lib/extractUiManifestFromLua";

export default function LuaPreviewRenderer({ lua }) {
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

  return (
    <div
      className="relative bg-zinc-900 overflow-hidden"
      style={{
        width: board.canvasSize?.w || 1280,
        height: board.canvasSize?.h || 720,
      }}
    >
      {items.map((item) => (
        <PreviewNode key={item.id} item={item} />
      ))}
    </div>
  );
}

function PreviewNode({ item }) {
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
    pointerEvents: "none",
    userSelect: "none",
  };

  if (item.type === "TextLabel") {
    return <div style={style}>{item.text}</div>;
  }

  if (item.type === "TextButton") {
    return (
      <div style={{ ...style, cursor: "pointer" }}>
        {item.text || "Button"}
      </div>
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
