/**
 * Pure helpers for faithfully translating a NexusRBX UI manifest (boardState)
 * into a Roblox-accurate CSS/React layout.
 *
 * MANIFEST SHAPE (see backend/src/lib/uiBuilder.js exportBoardStateToLua):
 *   boardState = {
 *     canvasSize: { w, h },
 *     tokens: { colors: { Primary, Surface, Text, TextMuted, ... }, typography: {...} },
 *     items: [ item, ... ],
 *     displayOrder?, safeAreaCompatibility?
 *   }
 *   item = {
 *     id, name, type,                          // Frame|TextLabel|TextButton|ImageLabel|ImageButton|TextBox|ScrollingFrame|ViewportFrame|MonetizationButton
 *     parentId,                                // <-- nesting: references another item's id (flat list + parent refs)
 *     useScale,                                // single flag: x/y/w/h are scale (0..1) vs offset (px)
 *     x, y, w, h,                              // UDim2 components (scale OR offset, per useScale)
 *     anchorPoint?,                            // {x,y} | [x,y] | anchorX/anchorY (defensive)
 *     colorRole, fill, gradient,               // background
 *     radius, stroke, strokeColor, strokeWidth,
 *     zIndex, visible, opacity,
 *     text, textColor, textRole, fontSize, font, fontRole, textWrapped, textScaled,
 *     textXAlignment?, textYAlignment?,
 *     placeholder|placeholderText,
 *     imageId, aspectRatio,
 *     layout: { type:"List"|"Grid", fillDirection, horizontalAlignment, verticalAlignment, padding, cellSizeX, cellSizeY },
 *     padding: { top, bottom, left, right },
 *     clipsDescendants?, automaticSize?, sizeConstraint?,
 *     scrollBarThickness?, scrollingDirection?,
 *     interactions: { OnClick: { type:"ToggleVisible"|"SetVisible"|"SetHidden", targetId, value } }
 *   }
 *
 * ASSUMPTION (documented): nesting is expressed as a FLAT items[] array where a
 * child points at its container via `parentId`. Items with no (or an unresolved)
 * parentId are treated as direct children of the ScreenGui (canvas root). This
 * matches the backend exporter, which parents nodes by `parentId` and falls back
 * to `gui` otherwise.
 */

const SPACING_TOKENS = { XS: 4, S: 8, M: 16, L: 24, XL: 32 };
const RADIUS_TOKENS = { S: 4, M: 8, L: 12, Full: 9999 };

export function toNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Convert a Roblox-ish color (Color3.fromRGB / Color3.new / rgba() / hex / token)
 * into a CSS color string. Returns null when nothing usable is provided.
 */
export function parseColor(color) {
  if (color == null) return null;
  const s = String(color).trim();
  if (!s || s.toLowerCase() === "transparent") return null;

  const rgbMatch = s.match(/fromRGB\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
  if (rgbMatch) return `rgb(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]})`;

  const newMatch = s.match(/new\s*\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)/i);
  if (newMatch) {
    return `rgb(${Math.round(parseFloat(newMatch[1]) * 255)}, ${Math.round(
      parseFloat(newMatch[2]) * 255
    )}, ${Math.round(parseFloat(newMatch[3]) * 255)})`;
  }

  if (s.startsWith("rgb")) return s;
  if (s.startsWith("#")) return s;
  if (/^[0-9a-f]{6}$/i.test(s)) return `#${s}`;
  return s;
}

/** Resolve a background color honoring token roles + raw fill. */
export function resolveFill(item, tokens) {
  const role = item.colorRole;
  if (role && role !== "Custom" && tokens?.colors?.[role]) {
    return parseColor(tokens.colors[role]);
  }
  return parseColor(item.fill);
}

/** Resolve a text color honoring textRole tokens + raw textColor. */
export function resolveTextColor(item, tokens) {
  if (item.textRole) {
    const key = item.textRole === "Muted" ? "TextMuted" : "Text";
    if (tokens?.colors?.[key]) return parseColor(tokens.colors[key]);
  }
  return parseColor(item.textColor) || "#e5e7eb";
}

const FONT_MAP = {
  Gotham: "'Inter', sans-serif",
  GothamBold: "'Inter', sans-serif",
  GothamBlack: "'Inter', sans-serif",
  GothamMedium: "'Inter', sans-serif",
  SourceSans: "'Inter', sans-serif",
  SourceSansBold: "'Inter', sans-serif",
  Code: "'JetBrains Mono', monospace",
  FredokaOne: "'Fredoka One', cursive",
  LuckiestGuy: "'Luckiest Guy', cursive",
  Bangers: "'Bangers', cursive",
  Arcade: "'Press Start 2P', cursive",
};

export function resolveFont(item) {
  const font = item.font || (item.fontRole === "Heading" ? "GothamBold" : "Gotham");
  return {
    family: FONT_MAP[font] || FONT_MAP.Gotham,
    weight:
      /Bold|Black|Heading/i.test(String(font)) || item.fontRole === "Heading"
        ? 700
        : 400,
  };
}

export function resolveRadius(radius) {
  if (radius == null) return 0;
  if (typeof radius === "string" && RADIUS_TOKENS[radius] != null) {
    return RADIUS_TOKENS[radius];
  }
  return Math.max(0, toNum(radius));
}

/** Resolve a padding value that may be a spacing token name or a number. */
function resolveSpacing(v, fallback = 0) {
  if (typeof v === "string" && SPACING_TOKENS[v] != null) return SPACING_TOKENS[v];
  return toNum(v, fallback);
}

export function resolvePadding(padding) {
  if (!padding || typeof padding !== "object") return null;
  return {
    top: resolveSpacing(padding.top),
    bottom: resolveSpacing(padding.bottom),
    left: resolveSpacing(padding.left),
    right: resolveSpacing(padding.right),
  };
}

/** anchorPoint -> { x, y } in 0..1, defensive about shape. */
export function resolveAnchor(item) {
  const a = item.anchorPoint;
  if (Array.isArray(a)) return { x: toNum(a[0]), y: toNum(a[1]) };
  if (a && typeof a === "object") return { x: toNum(a.x ?? a[0]), y: toNum(a.y ?? a[1]) };
  if (item.anchorX != null || item.anchorY != null) {
    return { x: toNum(item.anchorX), y: toNum(item.anchorY) };
  }
  return { x: 0, y: 0 };
}

/**
 * Read one UDim axis as { scale, offset }. Supports:
 *  - object form: item[key] = { scale, offset }
 *  - number + useScale (single flag) or per-axis override flags.
 */
function readAxis(item, key, baseScale) {
  const raw = item[key];
  if (raw && typeof raw === "object") {
    return { scale: toNum(raw.scale), offset: toNum(raw.offset) };
  }
  const n = toNum(raw);
  const overrides = {
    x: ["useScaleX", "useScalePosition", "useScale"],
    y: ["useScaleY", "useScalePosition", "useScale"],
    w: ["useScaleW", "useScaleSize", "useScale"],
    h: ["useScaleH", "useScaleSize", "useScale"],
  }[key];
  let isScale = baseScale;
  for (const f of overrides) {
    if (typeof item[f] === "boolean") {
      isScale = item[f];
      break;
    }
  }
  return isScale ? { scale: n, offset: 0 } : { scale: 0, offset: n };
}

/**
 * Resolve full UDim2 position + size for an item.
 * Each part is { scale, offset } so an element can mix scale + offset per axis.
 */
export function resolveUDim2(item) {
  const baseScale = item.useScale === true;
  const size = {
    w: readAxis(item, "w", baseScale),
    h: readAxis(item, "h", baseScale),
  };
  // Default a missing/zero size to sensible offsets so nothing collapses to 0px.
  if (size.w.scale === 0 && size.w.offset === 0 && item.w == null) size.w = { scale: 0, offset: 200 };
  if (size.h.scale === 0 && size.h.offset === 0 && item.h == null) size.h = { scale: 0, offset: 100 };
  return {
    pos: { x: readAxis(item, "x", baseScale), y: readAxis(item, "y", baseScale) },
    size,
  };
}

/** Turn a { scale, offset } part into a CSS length, mixing via calc() when needed. */
export function udimToCss(part) {
  const scale = part.scale || 0;
  const offset = part.offset || 0;
  const hasScale = scale !== 0;
  const hasOffset = offset !== 0;
  if (hasScale && hasOffset) return `calc(${scale * 100}% + ${offset}px)`;
  if (hasScale) return `${scale * 100}%`;
  return `${offset}px`;
}

const ALIGN_MAP = {
  Left: "flex-start",
  Right: "flex-end",
  Center: "center",
  Top: "flex-start",
  Bottom: "flex-end",
  Start: "flex-start",
  End: "flex-end",
};

/**
 * Build CSS for a container that has a UIListLayout / UIGridLayout, so children
 * flow instead of being absolutely positioned (matching Roblox layout behavior).
 * Returns null when the item has no layout.
 */
export function resolveLayout(layout) {
  if (!layout || typeof layout !== "object" || !layout.type) return null;
  const type = String(layout.type);
  const hAlign = ALIGN_MAP[layout.horizontalAlignment] || "center";
  const vAlign = ALIGN_MAP[layout.verticalAlignment] || "center";

  if (type === "Grid") {
    const cellX = toNum(layout.cellSizeX, 100);
    const cellY = toNum(layout.cellSizeY, 100);
    const gap = resolveSpacing(layout.padding, 8);
    return {
      kind: "grid",
      cellX,
      cellY,
      style: {
        display: "grid",
        gridTemplateColumns: `repeat(auto-fill, ${cellX}px)`,
        gridAutoRows: `${cellY}px`,
        gap: `${gap}px`,
        justifyContent: hAlign,
        alignContent: vAlign,
      },
    };
  }

  // UIListLayout (default Vertical)
  const horizontal = String(layout.fillDirection || "Vertical") === "Horizontal";
  const gap = resolveSpacing(layout.padding, 0);
  return {
    kind: "list",
    horizontal,
    style: {
      display: "flex",
      flexDirection: horizontal ? "row" : "column",
      flexWrap: "nowrap",
      gap: `${gap}px`,
      // Main axis runs along fillDirection; cross axis is the other one.
      justifyContent: horizontal ? hAlign : vAlign,
      alignItems: horizontal ? vAlign : hAlign,
    },
  };
}

/**
 * Build a parent/child tree from the flat items[] array using `parentId`.
 * Returns { roots } where each node carries `__id` and `__children`.
 * Children are sorted by ZIndex (stable -> manifest order preserved on ties).
 */
export function buildTree(items) {
  const list = Array.isArray(items) ? items : [];
  const byId = new Map();
  list.forEach((it, idx) => {
    const id = it && it.id != null ? String(it.id) : `__auto_${idx}`;
    byId.set(id, { ...it, __id: id, __children: [] });
  });

  const roots = [];
  byId.forEach((node) => {
    const pid = node.parentId != null ? String(node.parentId) : null;
    if (pid && pid !== node.__id && byId.has(pid)) {
      byId.get(pid).__children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortFn = (a, b) => (toNum(a.zIndex, 1) - toNum(b.zIndex, 1));
  const sortRec = (arr) => {
    arr.sort(sortFn);
    arr.forEach((n) => sortRec(n.__children));
  };
  sortRec(roots);

  return { roots };
}
