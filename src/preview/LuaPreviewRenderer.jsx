import React, {
  useLayoutEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
  useEffect,
} from "react";
import { extractUiManifestFromLua } from "../lib/extractUiManifestFromLua";
import { robloxThumbnailUrl } from "../lib/uiBuilderApi";
import {
  buildTree,
  resolveUDim2,
  udimToCss,
  resolveAnchor,
  resolveFill,
  resolveTextColor,
  resolveFont,
  resolveRadius,
  resolvePadding,
  resolveLayout,
  parseColor,
  toNum,
} from "./robloxLayout";

export const PREVIEW_DEVICES = {
  pc: { name: "PC / Console", w: 1280, h: 720, icon: "Monitor" },
  tablet: { name: "Tablet", w: 1024, h: 768, icon: "Tablet" },
  phone: { name: "Phone", w: 812, h: 375, icon: "Smartphone" },
  portrait: { name: "Phone (Portrait)", w: 375, h: 812, icon: "Smartphone" },
};

// Roblox reserves a ~36px strip at the top of the screen for the topbar (chat,
// leaderboard, etc.). UIs with IgnoreGuiInset=true can render underneath it, so
// we draw it as an informational overlay in canvas units.
const TOPBAR_INSET = 36;

export default function LuaPreviewRenderer({
  lua,
  boardState,
  interactive = false,
  onAction,
  device = "pc",
  editMode = false,
  onUpdateItem,
  showSafeArea = true,
}) {
  const outerRef = useRef(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  // Client-side simulation state (no backend): visibility overrides driven by
  // interaction rules (modal toggles / tab switching where the manifest expresses them).
  const [visOverrides, setVisOverrides] = useState({});

  useLayoutEffect(() => {
    if (!outerRef.current) return;
    const measure = () => {
      if (outerRef.current) {
        const { width, height } = outerRef.current.getBoundingClientRect();
        if (width > 0 && height > 0) setBox({ w: width, h: height });
      }
    };
    measure();

    if (typeof ResizeObserver === "undefined") {
      const timer = setInterval(measure, 1000);
      return () => clearInterval(timer);
    }
    const ro = new ResizeObserver(measure);
    ro.observe(outerRef.current);
    const timers = [300, 600, 1200].map((ms) => setTimeout(measure, ms));
    return () => {
      ro.disconnect();
      timers.forEach(clearTimeout);
    };
  }, []);

  // Reset interaction state when the underlying UI changes.
  useEffect(() => {
    setVisOverrides({});
  }, [boardState, lua]);

  const board = useMemo(() => {
    if (boardState) return boardState;
    return extractUiManifestFromLua(lua);
  }, [lua, boardState]);

  const items = useMemo(() => (Array.isArray(board?.items) ? board.items : []), [board]);
  const tokens = board?.tokens || {};

  const deviceConfig = PREVIEW_DEVICES[device] || PREVIEW_DEVICES.pc;
  // Render at the TRUE device resolution; the manifest's own canvasSize is only a
  // hint for authored coordinates, so we honor the selected device frame.
  const canvasW = deviceConfig.w;
  const canvasH = deviceConfig.h;

  const tree = useMemo(() => buildTree(items), [items]);

  // Base (manifest) visibility per id, so ToggleVisible flips the real state.
  const baseVisible = useMemo(() => {
    const m = {};
    items.forEach((it, i) => {
      const id = it && it.id != null ? String(it.id) : `__auto_${i}`;
      m[id] = it?.visible !== false;
    });
    return m;
  }, [items]);

  const applyRule = useCallback(
    (rule) => {
      if (!rule || typeof rule !== "object") return;
      const targetId = rule.targetId != null ? String(rule.targetId) : null;
      if (!targetId) return;
      setVisOverrides((prev) => {
        const next = { ...prev };
        const current = prev[targetId] !== undefined ? prev[targetId] : baseVisible[targetId] !== false;
        if (rule.type === "ToggleVisible") next[targetId] = !current;
        else if (rule.type === "SetVisible") next[targetId] = rule.value === undefined ? true : rule.value === true;
        else if (rule.type === "SetHidden") next[targetId] = false;
        return next;
      });
    },
    [baseVisible]
  );

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
      </div>
    );
  }

  // Scale the WHOLE canvas to fit its container (letterboxed/centered) instead of
  // zooming onto a content bounding box.
  const isReady = box.w > 0 && box.h > 0;
  const canvasScale = isReady ? Math.min(box.w / canvasW, box.h / canvasH) : 0.5;

  // TODO(progressive-render): stream boardState as it generates so the preview
  // fills in live. This requires coordinating with the backend SSE pipeline
  // (GET /api/ui-builder/ai/pipeline/stream), owned by another agent. For now we
  // render the final boardState in one pass.

  const ctx = {
    interactive,
    editMode,
    onAction,
    onUpdateItem,
    canvasScale,
    tokens,
    visOverrides,
    applyRule,
  };

  const isPhone = device === "phone" || device === "portrait";
  const isPortrait = device === "portrait";

  return (
    <div
      ref={outerRef}
      className="w-full h-full flex items-center justify-center bg-[#050505] overflow-hidden relative min-h-[300px]"
    >
      <div className="absolute top-2 left-2 text-[10px] text-white/20 pointer-events-none z-10">
        {items.length} items | {canvasW}x{canvasH} | Fit: {Math.round(canvasScale * 100)}%
      </div>

      <div
        className={`relative transition-opacity duration-500 ${isReady ? "opacity-100" : "opacity-0"}`}
        style={{
          width: canvasW,
          height: canvasH,
          transform: `scale(${canvasScale})`,
          transformOrigin: "center center",
          flexShrink: 0,
          background: "#0D0D0D",
          borderRadius: 14,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.15)",
          boxShadow: "0 0 80px rgba(0,0,0,0.8)",
          pointerEvents: isReady ? "auto" : "none",
        }}
      >
        {tree.roots.map((node) => (
          <PreviewNode key={node.__id} node={node} ctx={ctx} parentLayout={null} />
        ))}

        {/* Roblox topbar inset + mobile safe-area overlay (subtle, toggleable) */}
        {showSafeArea && (
          <SafeAreaOverlay
            canvasW={canvasW}
            canvasH={canvasH}
            isPhone={isPhone}
            isPortrait={isPortrait}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Subtle overlay showing the Roblox topbar reserved strip and (on phones) the
 * notch / safe-area, so UIs that render underneath are visually obvious.
 */
function SafeAreaOverlay({ canvasW, canvasH, isPhone, isPortrait }) {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 99999 }}
      aria-hidden
    >
      {/* Roblox topbar inset */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: TOPBAR_INSET,
          background:
            "repeating-linear-gradient(45deg, rgba(0,245,212,0.05) 0px, rgba(0,245,212,0.05) 6px, rgba(0,245,212,0.10) 6px, rgba(0,245,212,0.10) 12px)",
          borderBottom: "1px dashed rgba(0,245,212,0.35)",
        }}
      >
        <span
          style={{
            position: "absolute",
            right: 6,
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: 11,
            letterSpacing: 1,
            fontWeight: 700,
            color: "rgba(0,245,212,0.6)",
          }}
        >
          ROBLOX TOPBAR
        </span>
      </div>

      {/* Mobile notch (portrait) */}
      {isPortrait && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: canvasW * 0.42,
            height: 28,
            background: "rgba(0,0,0,0.85)",
            borderBottomLeftRadius: 18,
            borderBottomRightRadius: 18,
          }}
        />
      )}

      {/* Mobile side safe-areas (landscape phone) */}
      {isPhone && !isPortrait && (
        <>
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: 0,
              width: 44,
              borderRight: "1px dashed rgba(155,93,229,0.30)",
              background: "linear-gradient(90deg, rgba(0,0,0,0.25), transparent)",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              right: 0,
              width: 44,
              borderLeft: "1px dashed rgba(155,93,229,0.30)",
              background: "linear-gradient(270deg, rgba(0,0,0,0.25), transparent)",
            }}
          />
        </>
      )}
    </div>
  );
}

/** Build a CSS background (solid + optional gradient) for a node. */
function buildBackground(node, tokens, isContainer) {
  const fill = resolveFill(node, tokens);
  let background = fill;

  if (!background) {
    if (isContainer && (node.type || "").toLowerCase() === "frame") {
      background = "rgba(255,255,255,0.04)";
    } else {
      background = null; // transparent (text labels/buttons default to transparent)
    }
  }

  const g = node.gradient;
  if (g && typeof g === "object") {
    const stops = Array.isArray(g.stops) && g.stops.length >= 2 ? g.stops : null;
    const robloxRot = toNum(g.rotation, 90);
    const cssAngle = robloxRot + 90; // Roblox 0deg = horizontal L->R = CSS 90deg
    if (stops) {
      const parts = stops
        .map((s) => {
          const c = parseColor(s.color || s.colour);
          if (!c) return null;
          const pos = s.position != null ? `${toNum(s.position) * 100}%` : "";
          return `${c} ${pos}`.trim();
        })
        .filter(Boolean);
      if (parts.length >= 2) background = `linear-gradient(${cssAngle}deg, ${parts.join(", ")})`;
    } else if (g.color1 && g.color2) {
      const c1 = parseColor(g.color1);
      const c2 = parseColor(g.color2);
      if (c1 && c2) background = `linear-gradient(${cssAngle}deg, ${c1} 0%, ${c2} 100%)`;
    }
  }

  return background;
}

const TYPE_ALIASES = {
  monetizationbutton: "textbutton",
};

function PreviewNode({ node, ctx, parentLayout }) {
  const elRef = useRef(null);
  const [hover, setHover] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [focused, setFocused] = useState(false);
  const [drag, setDrag] = useState(null);

  const { interactive, editMode, onAction, onUpdateItem, canvasScale, tokens, visOverrides, applyRule } = ctx;

  const rawType = String(node.type || "Frame").toLowerCase();
  const type = TYPE_ALIASES[rawType] || rawType;
  const isContainer = type === "frame" || type === "scrollingframe" || type === "viewportframe";

  const { pos, size } = useMemo(() => resolveUDim2(node), [node]);
  const anchor = useMemo(() => resolveAnchor(node), [node]);
  const layout = useMemo(() => resolveLayout(node.layout), [node.layout]);
  const padding = useMemo(() => resolvePadding(node.padding), [node.padding]);
  const font = useMemo(() => resolveFont(node), [node]);

  // Visibility: explicit overrides (from interactions) win over manifest value.
  const overridden = visOverrides[node.__id];
  const visible = overridden !== undefined ? overridden : node.visible !== false;

  // Drag-to-nudge (editMode). Converts screen px deltas back to canvas/parent units.
  const handleMouseDown = useCallback(
    (e) => {
      if (!editMode) return;
      e.stopPropagation();
      setDrag({ x: e.clientX, y: e.clientY });
    },
    [editMode]
  );

  const handleMouseMove = useCallback(
    (e) => {
      if (!drag) return;
      const dxScreen = e.clientX - drag.x;
      const dyScreen = e.clientY - drag.y;
      const scale = canvasScale || 1;
      // Layout boxes are NOT affected by the canvas CSS transform, so parent
      // clientWidth/Height are already in canvas units.
      const parentEl = elRef.current?.parentElement;
      const parentW = parentEl?.clientWidth || 0;
      const parentH = parentEl?.clientHeight || 0;
      const dxCanvas = dxScreen / scale;
      const dyCanvas = dyScreen / scale;

      const nextX =
        pos.x.scale !== 0 && parentW
          ? toNum(node.x) + dxCanvas / parentW
          : toNum(node.x) + dxCanvas;
      const nextY =
        pos.y.scale !== 0 && parentH
          ? toNum(node.y) + dyCanvas / parentH
          : toNum(node.y) + dyCanvas;

      onUpdateItem?.(node.__id, { x: nextX, y: nextY });
      setDrag({ x: e.clientX, y: e.clientY });
    },
    [drag, canvasScale, pos.x.scale, pos.y.scale, node.x, node.y, node.__id, onUpdateItem]
  );

  const handleMouseUp = useCallback(() => setDrag(null), []);

  useEffect(() => {
    if (!drag) return undefined;
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [drag, handleMouseMove, handleMouseUp]);

  // Whether this node participates in a parent layout (flow) instead of absolute.
  const inGridFlow = parentLayout?.kind === "grid";
  const inListFlow = parentLayout?.kind === "list";
  const inFlow = inGridFlow || inListFlow;

  const radius = resolveRadius(node.radius);
  const background = buildBackground(node, tokens, isContainer);

  const strokeColor = parseColor(node.strokeColor);
  const hasStroke = node.stroke === true;
  const strokeWidth = hasStroke ? Math.max(1, toNum(node.strokeWidth, 2)) : 0;
  const strokeTransparency = node.strokeTransparency != null ? toNum(node.strokeTransparency) : 0;

  const clip = node.clipsDescendants === true || type === "scrollingframe";

  // Text alignment.
  const xAlign = String(node.textXAlignment || node.horizontalAlignment || "Center");
  const yAlign = String(node.textYAlignment || node.verticalAlignment || "Center");
  const justify =
    xAlign === "Left" ? "flex-start" : xAlign === "Right" ? "flex-end" : "center";
  const alignItems =
    yAlign === "Top" ? "flex-start" : yAlign === "Bottom" ? "flex-end" : "center";
  const textAlign = xAlign === "Left" ? "left" : xAlign === "Right" ? "right" : "center";

  // Font sizing (TextScaled approximation fills the box height).
  let fontSize = toNum(node.fontSize, 14);
  if (node.textScaled === true) {
    fontSize = Math.max(8, (size.h.offset || 24) * 0.5);
  }

  const baseStyle = {
    boxSizing: "border-box",
    zIndex: Math.floor(toNum(node.zIndex, 1)),
    display: visible ? "flex" : "none",
    alignItems,
    justifyContent: justify,
    color: resolveTextColor(node, tokens),
    fontFamily: font.family,
    fontWeight: font.weight,
    fontSize,
    textAlign,
    borderRadius: radius,
    background: background || "transparent",
    opacity: node.opacity != null ? Math.max(0, Math.min(1, toNum(node.opacity, 1))) : 1,
    overflow: clip ? (type === "scrollingframe" ? "auto" : "hidden") : "visible",
    userSelect: "none",
  };

  // Stroke via outline so it doesn't affect box sizing.
  if (strokeWidth > 0) {
    baseStyle.boxShadow = `0 0 0 ${strokeWidth}px ${
      strokeColor || "rgba(148,163,184,0.6)"
    }`;
    if (strokeTransparency > 0) baseStyle.outlineColor = "transparent";
  }

  // Positioning: absolute (default) vs in-flow (parent has UIListLayout/Grid).
  if (inFlow) {
    baseStyle.position = "relative";
    if (inGridFlow) {
      baseStyle.width = `${parentLayout.cellX}px`;
      baseStyle.height = `${parentLayout.cellY}px`;
      baseStyle.flexShrink = 0;
    } else {
      baseStyle.width = udimToCss(size.w);
      baseStyle.height = udimToCss(size.h);
      baseStyle.flexShrink = 0;
    }
  } else {
    baseStyle.position = "absolute";
    baseStyle.left = udimToCss(pos.x);
    baseStyle.top = udimToCss(pos.y);
    baseStyle.width = udimToCss(size.w);
    baseStyle.height = udimToCss(size.h);
    if (anchor.x || anchor.y) {
      baseStyle.transform = `translate(${-anchor.x * 100}%, ${-anchor.y * 100}%)`;
    }
  }

  // Container layout (UIListLayout / UIGridLayout) + UIPadding.
  const containerStyle = { ...baseStyle };
  if (layout) {
    Object.assign(containerStyle, layout.style);
  } else if (isContainer || node.__children.length > 0) {
    // Children are absolutely positioned within this container.
    containerStyle.display = visible ? "block" : "none";
    containerStyle.position = baseStyle.position;
  }
  if (padding) {
    containerStyle.paddingTop = padding.top;
    containerStyle.paddingBottom = padding.bottom;
    containerStyle.paddingLeft = padding.left;
    containerStyle.paddingRight = padding.right;
  }

  // Interaction visuals (hover/press) for buttons.
  const isButton = type === "textbutton" || type === "imagebutton";
  const interactiveStyle =
    isButton && interactive && !editMode
      ? {
          transition: "transform 120ms ease, filter 120ms ease",
          transform: `${baseStyle.transform ? baseStyle.transform + " " : ""}scale(${
            pressed ? 0.96 : hover ? 1.03 : 1
          })`,
          filter: pressed ? "brightness(0.9)" : hover ? "brightness(1.08)" : "none",
        }
      : {};

  const editStyle = editMode
    ? {
        outline: "2px dashed #00f5d4",
        outlineOffset: -1,
        cursor: drag ? "grabbing" : "grab",
      }
    : {};

  const fireClick = () => {
    if (!interactive || editMode) return;
    onAction?.({ type: "click", id: node.__id, label: node.text || node.name || "Button" });
    if (node.interactions?.OnClick) applyRule(node.interactions.OnClick);
  };

  const children = node.__children.map((child) => (
    <PreviewNode key={child.__id} node={child} ctx={ctx} parentLayout={layout} />
  ));

  // --- Render per element type ---

  if (type === "textbutton") {
    return (
      <button
        ref={elRef}
        type="button"
        style={{ ...containerStyle, ...interactiveStyle, ...editStyle, padding: padding ? undefined : 6, cursor: editMode ? editStyle.cursor : interactive ? "pointer" : "default" }}
        onMouseDown={handleMouseDown}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => {
          setHover(false);
          setPressed(false);
        }}
        onMouseDownCapture={() => interactive && !editMode && setPressed(true)}
        onMouseUp={() => setPressed(false)}
        onClick={fireClick}
      >
        {node.text || node.name || "Button"}
        {children}
      </button>
    );
  }

  if (type === "textbox") {
    return (
      <input
        ref={elRef}
        style={{
          ...baseStyle,
          justifyContent: "flex-start",
          textAlign: "left",
          padding: 8,
          outline: "none",
          border: focused ? "1px solid #00f5d4" : baseStyle.boxShadow ? undefined : "1px solid rgba(255,255,255,0.12)",
          background: background || "rgba(255,255,255,0.06)",
        }}
        disabled={!interactive || editMode}
        defaultValue={node.text || ""}
        placeholder={node.placeholderText || node.placeholder || "Type..."}
        onMouseDown={handleMouseDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => {
          if (!interactive) return;
          onAction?.({
            type: "input",
            id: node.__id,
            label: node.placeholderText || node.placeholder || "TextBox",
            value: e.target.value,
          });
        }}
      />
    );
  }

  if (type === "imagelabel" || type === "imagebutton") {
    const imageIdStr = String(node.imageId || "");
    let src = null;
    if (imageIdStr.startsWith("http")) {
      src = imageIdStr;
    } else {
      const match = imageIdStr.match(/(\d{5,})/);
      src = match ? robloxThumbnailUrl({ assetId: match[1] }) : null;
    }
    return (
      <div
        ref={elRef}
        style={{
          ...containerStyle,
          ...interactiveStyle,
          ...editStyle,
          cursor: editMode ? editStyle.cursor : type === "imagebutton" && interactive ? "pointer" : "default",
        }}
        onMouseDown={handleMouseDown}
        onMouseEnter={() => type === "imagebutton" && setHover(true)}
        onMouseLeave={() => {
          setHover(false);
          setPressed(false);
        }}
        onClick={fireClick}
      >
        {src ? (
          <img
            src={src}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "contain", pointerEvents: "none" }}
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[10px] text-white/30 border border-dashed border-white/10">
            no image
          </div>
        )}
        {children}
      </div>
    );
  }

  if (type === "textlabel") {
    return (
      <div ref={elRef} style={{ ...containerStyle, ...editStyle, padding: padding ? undefined : 4, whiteSpace: node.textWrapped === false ? "nowrap" : "normal" }} onMouseDown={handleMouseDown}>
        <span style={{ pointerEvents: "none" }}>{node.text}</span>
        {children}
      </div>
    );
  }

  // Frame / ScrollingFrame / ViewportFrame / fallback container
  return (
    <div ref={elRef} style={{ ...containerStyle, ...editStyle }} onMouseDown={handleMouseDown}>
      {type === "viewportframe" && node.__children.length === 0 && (
        <div className="w-full h-full flex items-center justify-center text-[10px] text-white/25">
          3D Viewport
        </div>
      )}
      {children}
    </div>
  );
}
