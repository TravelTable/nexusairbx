import React, { useLayoutEffect, useRef, useState, useMemo } from "react";
import { extractUiManifestFromLua } from "../lib/extractUiManifestFromLua";
import { robloxThumbnailUrl } from "../lib/uiBuilderApi";

export default function LuaPreviewRenderer({ lua, interactive = false, onAction }) {
  const outerRef = useRef(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  // Measure on mount and on resize
  useLayoutEffect(() => {
    if (!outerRef.current) return;
    
    const measure = () => {
      if (outerRef.current) {
        const { width, height } = outerRef.current.getBoundingClientRect();
        if (width > 0 && height > 0) {
          setBox({ w: width, h: height });
        }
      }
    };

    measure();
    
    if (typeof ResizeObserver === "undefined") {
      const timer = setInterval(measure, 1000);
      return () => clearInterval(timer);
    }

    const ro = new ResizeObserver(measure);
    ro.observe(outerRef.current);
    
    // Multiple measurements to catch animation ends
    const timers = [300, 600, 1200, 2500].map(ms => setTimeout(measure, ms));

    return () => {
      ro.disconnect();
      timers.forEach(clearTimeout);
    };
  }, []);

  const board = useMemo(() => extractUiManifestFromLua(lua), [lua]);

  if (!lua) {
    return (
      <div className="h-full flex items-center justify-center text-zinc-500 font-medium">
        No UI generated yet
      </div>
    );
  }

  if (!board) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-red-400 p-6 text-center bg-red-500/5 rounded-lg border border-red-500/20">
        <div className="font-bold mb-1 text-sm">Preview Unavailable</div>
        <div className="text-[11px] opacity-70 max-w-[220px]">
          The Lua code is missing a valid UI manifest or the JSON is malformed.
        </div>
      </div>
    );
  }

  const items = Array.isArray(board.items) ? board.items : [];
  
  // Sort items by ZIndex to ensure correct stacking (higher ZIndex on top)
  const sortedItems = [...items].sort((a, b) => (Number(a.zIndex) || 0) - (Number(b.zIndex) || 0));

  const canvasW = Number(board.canvasSize?.w) || 1280;
  const canvasH = Number(board.canvasSize?.h) || 720;
  
  // Robust scaling: center the canvas and scale it to fit the container.
  // If box is not ready, we use a fallback scale but keep it visible.
  const scale = box.w > 0 && box.h > 0 
    ? Math.min(box.w / canvasW, box.h / canvasH, 0.95) 
    : 0.5; 
  
  const isReady = box.w > 0 && box.h > 0;

  return (
    <div ref={outerRef} className="w-full h-full flex items-center justify-center bg-[#050505] overflow-hidden relative min-h-[300px]">
      <div
        className={`relative bg-[#0D0D0D] shadow-[0_0_80px_rgba(0,0,0,0.8)] transition-all duration-700 ${isReady ? 'opacity-100 scale-100' : 'opacity-30 scale-90'}`}
        style={{
          width: canvasW,
          height: canvasH,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          borderRadius: 12,
          flexShrink: 0,
          border: "1px solid rgba(255,255,255,0.15)",
          pointerEvents: isReady ? "auto" : "none"
        }}
      >
        {sortedItems.map((item) => (
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
      ? `${Number(item.strokeWidth) || 1}px solid ${item.strokeColor || "rgba(255,255,255,0.2)"}`
      : "none",
    color: item.textColor || "#ffffff",
    display: item.visible === false ? "none" : "flex",
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: interactive ? "auto" : "none",
    userSelect: "none",
    fontSize: Number(item.fontSize) || 14,
    overflow: "hidden",
    textAlign: "center",
    padding: 4,
    boxSizing: "border-box",
    boxShadow: item.type === "TextButton" ? "0 2px 10px rgba(0,0,0,0.3)" : "none",
  };

  if (item.type === "TextLabel") {
    return <div style={style}>{item.text}</div>;
  }

  if (item.type === "Frame" || item.type === "ScrollingFrame") {
    return (
      <div style={{ ...style, alignItems: "flex-start", justifyContent: "flex-start" }}>
        {/* Frames are containers */}
      </div>
    );
  }

  if (item.type === "TextButton") {
    return (
      <button
        type="button"
        style={{
          ...style,
          cursor: interactive ? "pointer" : "default",
          transition: "all 150ms ease",
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
    const src = match ? robloxThumbnailUrl({ assetId: match[1] }) : null;
    return (
      <div style={style}>
        {src ? (
          <img 
            src={src} 
            alt="" 
            className="w-full h-full object-contain" 
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        ) : null}
      </div>
    );
  }

  return <div style={style} />;
}
