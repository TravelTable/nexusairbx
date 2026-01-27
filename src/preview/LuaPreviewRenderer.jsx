import React, { useLayoutEffect, useRef, useState, useMemo } from "react";
import { extractUiManifestFromLua } from "../lib/extractUiManifestFromLua";
import { robloxThumbnailUrl } from "../lib/uiBuilderApi";

export default function LuaPreviewRenderer({ lua, boardState, interactive = false, onAction }) {
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

  const board = useMemo(() => {
    if (boardState) return boardState;
    // Fallback to parsing Lua only if boardState is missing
    return extractUiManifestFromLua(lua);
  }, [lua, boardState]);

  const items = useMemo(() => (Array.isArray(board?.items) ? board.items : []), [board]);
  
  const canvasW = Number(board?.canvasSize?.w) || 1280;
  const canvasH = Number(board?.canvasSize?.h) || 720;

  // --- SMART ZOOM LOGIC ---
  // Calculate the bounding box of all visible items to "zoom in" on the content
  const bounds = useMemo(() => {
    if (items.length === 0) return { x: 0, y: 0, w: canvasW, h: canvasH };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    items.forEach(it => {
      if (it.visible === false) return;
      const ix = parseFloat(it.x) || 0;
      const iy = parseFloat(it.y) || 0;
      const iw = parseFloat(it.w) || 0;
      const ih = parseFloat(it.h) || 0;
      minX = Math.min(minX, ix);
      minY = Math.min(minY, iy);
      maxX = Math.max(maxX, ix + iw);
      maxY = Math.max(maxY, iy + ih);
    });
    
    // Add some padding around the content (40px)
    const padding = 40;
    const bx = Math.max(0, minX - padding);
    const by = Math.max(0, minY - padding);
    const bw = Math.min(canvasW, (maxX - minX) + (padding * 2));
    const bh = Math.min(canvasH, (maxY - minY) + (padding * 2));
    
    return { x: bx, y: by, w: bw, h: bh };
  }, [items, canvasW, canvasH]);

  if (!lua && !boardState) {
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
        <button 
          onClick={() => console.log("RAW LUA:", lua)}
          className="mt-4 px-3 py-1 text-[10px] bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded uppercase tracking-wider font-bold"
        >
          Log Raw Lua to Console
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-zinc-400 p-6 text-center bg-zinc-500/5 rounded-lg border border-zinc-500/10">
        <div className="font-bold mb-1 text-sm">Empty UI Manifest</div>
        <div className="text-[11px] opacity-70 max-w-[220px]">
          The Lua code contains a manifest, but it has no UI elements to display.
        </div>
        <div className="mt-4 p-2 bg-black/40 rounded border border-white/5 text-[10px] font-mono text-left max-w-full overflow-auto">
          <div className="text-zinc-500 mb-1">Debug Info</div>
          <div className="text-zinc-300">Canvas: {board.canvasSize?.w}x{board.canvasSize?.h}</div>
          <div className="text-zinc-300">Items: {items.length}</div>
          <button 
            onClick={() => console.log("MANIFEST DATA:", board)}
            className="mt-2 text-[#00f5d4] hover:underline"
          >
            Inspect Manifest in Console
          </button>
        </div>
      </div>
    );
  }
  
  // Sort items by ZIndex to ensure correct stacking (higher ZIndex on top)
  const sortedItems = [...items].sort((a, b) => (Number(a.zIndex) || 0) - (Number(b.zIndex) || 0));

  // Scale based on the content bounds instead of the full canvas
  const scale = box.w > 0 && box.h > 0 
    ? Math.min(box.w / bounds.w, box.h / bounds.h, 1.0) 
    : 0.5; 
  
  const isReady = box.w > 0 && box.h > 0;

  return (
    <div ref={outerRef} className="w-full h-full flex items-center justify-center bg-[#050505] overflow-hidden relative min-h-[300px]">
      {/* Debug Info */}
      <div className="absolute top-2 left-2 text-[10px] text-white/20 pointer-events-none z-10">
        {items.length} items | {canvasW}x{canvasH} | Zoom: {Math.round(scale * 100)}%
      </div>

      <div
        className={`relative bg-[#0D0D0D] shadow-[0_0_80px_rgba(0,0,0,0.8)] transition-all duration-700 ${isReady ? 'opacity-100 scale-100' : 'opacity-60 scale-95'}`}
        style={{
          width: canvasW,
          height: canvasH,
          // Center the content bounds in the view
          transform: `scale(${scale}) translate(${(canvasW / 2 - (bounds.x + bounds.w / 2))}px, ${(canvasH / 2 - (bounds.y + bounds.h / 2))}px)`,
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

/**
 * Helper to convert Roblox-style color strings or hex to CSS colors
 */
function parseColor(color) {
  if (!color) return null;
  const s = String(color).trim();
  
  // Handle Color3.fromRGB(r, g, b)
  const rgbMatch = s.match(/fromRGB\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
  if (rgbMatch) {
    return `rgb(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]})`;
  }
  
  // Handle Color3.new(r, g, b)
  const newMatch = s.match(/new\s*\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)/i);
  if (newMatch) {
    return `rgb(${Math.round(parseFloat(newMatch[1]) * 255)}, ${Math.round(parseFloat(newMatch[2]) * 255)}, ${Math.round(parseFloat(newMatch[3]) * 255)})`;
  }

  // Handle rgba(r, g, b, a)
  if (s.startsWith("rgba")) return s;
  
  // Handle hex
  if (s.startsWith("#")) return s;
  
  return s;
}

function PreviewNode({ item, interactive, onAction }) {
  const x = parseFloat(item.x) || 0;
  const y = parseFloat(item.y) || 0;
  const w = parseFloat(item.w) || 0;
  const h = parseFloat(item.h) || 0;

  const type = String(item.type || "").toLowerCase();
  const fillColor = parseColor(item.fill);
  const strokeColor = parseColor(item.strokeColor);
  const textColor = parseColor(item.textColor);

  // Font Mapping
  const fontMap = {
    "Gotham": "'Inter', sans-serif",
    "GothamBold": "'Inter', sans-serif",
    "GothamBlack": "'Inter', sans-serif",
    "FredokaOne": "'Fredoka One', cursive",
    "LuckiestGuy": "'Luckiest Guy', cursive",
    "Bangers": "'Bangers', cursive",
    "Arcade": "'Press Start 2P', cursive"
  };
  const fontFamily = fontMap[item.font] || fontMap["Gotham"];

  // Gradient Support
  let background = fillColor || (type === "frame" ? "rgba(255,255,255,0.05)" : "#111827");
  if (item.gradient && item.gradient.color1 && item.gradient.color2) {
    const c1 = parseColor(item.gradient.color1);
    const c2 = parseColor(item.gradient.color2);
    background = `linear-gradient(180deg, ${c1} 0%, ${c2} 100%)`;
  }

  const style = {
    position: "absolute",
    left: x,
    top: y,
    width: w,
    height: h,
    zIndex: Number(item.zIndex) || 1,
    borderRadius: Number(item.radius) || 0,
    background: background,
    border: item.stroke
      ? `${Number(item.strokeWidth) || 1}px solid ${strokeColor || "rgba(255,255,255,0.2)"}`
      : (type === "frame" ? "1px solid rgba(255,255,255,0.1)" : "none"),
    color: textColor || "#ffffff",
    display: item.visible === false ? "none" : "flex",
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: interactive ? "auto" : "none",
    userSelect: "none",
    fontSize: Number(item.fontSize) || 14,
    fontFamily: fontFamily,
    fontWeight: item.font?.includes("Bold") ? "bold" : "normal",
    overflow: "hidden",
    textAlign: "center",
    padding: 4,
    boxSizing: "border-box",
    boxShadow: type === "textbutton" ? "0 4px 14px rgba(0,0,0,0.4)" : "none",
    opacity: item.opacity !== undefined ? Number(item.opacity) : 1,
  };

  if (type === "textlabel") {
    return <div style={style}>{item.text}</div>;
  }

  if (type === "frame" || type === "scrollingframe") {
    return (
      <div style={{ ...style, alignItems: "flex-start", justifyContent: "flex-start" }}>
        {/* Frames are containers */}
      </div>
    );
  }

  if (type === "textbutton" || type === "monetizationbutton") {
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

  if ((item.type === "ImageLabel" || item.type === "ImageButton") && item.imageId) {
    const imageIdStr = String(item.imageId || "");
    let src = null;
    
    if (imageIdStr.startsWith("http")) {
      // Direct URL (temporary asset from Firestore/AI)
      src = imageIdStr;
    } else {
      // Roblox Asset ID
      const match = imageIdStr.match(/(\d{5,})/);
      src = match ? robloxThumbnailUrl({ assetId: match[1] }) : null;
    }

    return (
      <div 
        style={{
          ...style,
          cursor: item.type === "ImageButton" && interactive ? "pointer" : "default"
        }}
        onClick={() => {
          if (item.type === "ImageButton" && interactive) {
            onAction?.({
              type: "click",
              id: item.id,
              label: item.name || "ImageButton",
            });
          }
        }}
      >
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
