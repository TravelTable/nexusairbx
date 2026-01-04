// src/pages/UiBuilderPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * UiBuilderPage (BASE WINDOW)
 * - Visual canvas where users can place "shapes" (Roblox UI primitives)
 * - No server calls yet
 * - No extra feature components yet (we'll build those next as separate components)
 *
 * Primitives here map cleanly to Roblox UI:
 * - Frame
 * - TextLabel
 * - TextButton
 * - ImageLabel (ImageId / rbxassetid://...)
 */

const GRID = 10;

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function snap(n, enabled) {
  if (!enabled) return n;
  return Math.round(n / GRID) * GRID;
}

function uid() {
  // stable enough for UI items
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `id_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function rgbaToHexOrKeep(value) {
  // keep simple: accept #RRGGBB or #RRGGBBAA; fall back as-is
  if (typeof value !== "string") return "#1f2937";
  const v = value.trim();
  if (v.startsWith("#")) return v;
  return "#1f2937";
}

const DEFAULTS_BY_TYPE = {
  Frame: {
    name: "Frame",
    fill: "#111827",
    text: "",
    textColor: "#ffffff",
    fontSize: 16,
    imageId: "",
  },
  TextLabel: {
    name: "TextLabel",
    fill: "#111827",
    text: "TextLabel",
    textColor: "#ffffff",
    fontSize: 18,
    imageId: "",
  },
  TextButton: {
    name: "TextButton",
    fill: "#1f2937",
    text: "Button",
    textColor: "#ffffff",
    fontSize: 18,
    imageId: "",
  },
  ImageLabel: {
    name: "ImageLabel",
    fill: "#0b1220",
    text: "",
    textColor: "#ffffff",
    fontSize: 16,
    imageId: "rbxassetid://",
  },
};

function makeItem(type, canvasW, canvasH) {
  const base = DEFAULTS_BY_TYPE[type] || DEFAULTS_BY_TYPE.Frame;
  const w = type === "TextLabel" ? 220 : type === "TextButton" ? 200 : 240;
  const h = type === "TextLabel" ? 60 : type === "TextButton" ? 60 : 140;

  return {
    id: uid(),
    type,
    name: base.name,
    x: Math.round((canvasW - w) / 2),
    y: Math.round((canvasH - h) / 2),
    w,
    h,
    fill: rgbaToHexOrKeep(base.fill),
    radius: 12,
    stroke: true,
    strokeColor: "#334155",
    strokeWidth: 2,

    text: base.text,
    textColor: rgbaToHexOrKeep(base.textColor),
    fontSize: base.fontSize,

    imageId: base.imageId,

    zIndex: 1,
    visible: true,
    locked: false,
  };
}

function formatAssetId(value) {
  const v = String(value || "").trim();
  if (!v) return "";
  // Allow plain numeric IDs and auto-prefix
  if (/^\d+$/.test(v)) return `rbxassetid://${v}`;
  return v;
}

function CanvasGrid({ enabled }) {
  if (!enabled) return null;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        backgroundImage:
          "linear-gradient(to right, rgba(148,163,184,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.12) 1px, transparent 1px)",
        backgroundSize: `${GRID}px ${GRID}px`,
        pointerEvents: "none",
      }}
    />
  );
}

export default function UiBuilderPage() {
  const canvasRef = useRef(null);

  // base canvas size (we’ll add presets later)
  const [canvasSize, setCanvasSize] = useState({ w: 980, h: 560 });

  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  const [snapToGrid, setSnapToGrid] = useState(true);
  const [showGrid, setShowGrid] = useState(true);

  const selected = useMemo(() => items.find((i) => i.id === selectedId) || null, [items, selectedId]);

  // Drag / resize state (pointer-driven)
  const dragRef = useRef({
    mode: null, // "move" | "resize"
    id: null,
    startX: 0,
    startY: 0,
    origin: null, // {x,y,w,h}
    handle: null, // "se" only for now
  });

  function addPrimitive(type) {
    setItems((prev) => {
      const it = makeItem(type, canvasSize.w, canvasSize.h);
      // Slight stagger so adding multiple doesn’t stack perfectly
      const offset = prev.length * 8;
      it.x = clamp(it.x + offset, 0, Math.max(0, canvasSize.w - it.w));
      it.y = clamp(it.y + offset, 0, Math.max(0, canvasSize.h - it.h));
      it.zIndex = prev.length + 1;
      return [...prev, it];
    });
  }

  function updateSelected(patch) {
    if (!selectedId) return;
    setItems((prev) =>
      prev.map((it) => (it.id === selectedId ? { ...it, ...patch } : it))
    );
  }

  function deleteSelected() {
    if (!selectedId) return;
    setItems((prev) => prev.filter((it) => it.id !== selectedId));
    setSelectedId(null);
  }

  function bringToFront() {
    if (!selectedId) return;
    setItems((prev) => {
      const maxZ = prev.reduce((m, it) => Math.max(m, it.zIndex || 1), 1);
      return prev.map((it) => (it.id === selectedId ? { ...it, zIndex: maxZ + 1 } : it));
    });
  }

  function sendToBack() {
    if (!selectedId) return;
    setItems((prev) => {
      const minZ = prev.reduce((m, it) => Math.min(m, it.zIndex || 1), 1);
      return prev.map((it) => (it.id === selectedId ? { ...it, zIndex: minZ - 1 } : it));
    });
  }

  function onPointerDownItem(e, id) {
    e.preventDefault();
    e.stopPropagation();
    const it = items.find((x) => x.id === id);
    if (!it || it.locked) return;

    setSelectedId(id);

    const rect = canvasRef.current?.getBoundingClientRect();
    const px = e.clientX - (rect?.left || 0);
    const py = e.clientY - (rect?.top || 0);

    dragRef.current = {
      mode: "move",
      id,
      startX: px,
      startY: py,
      origin: { x: it.x, y: it.y, w: it.w, h: it.h },
      handle: null,
    };

    e.currentTarget.setPointerCapture?.(e.pointerId);
  }

  function onPointerDownResize(e, id, handle) {
    e.preventDefault();
    e.stopPropagation();
    const it = items.find((x) => x.id === id);
    if (!it || it.locked) return;

    setSelectedId(id);

    const rect = canvasRef.current?.getBoundingClientRect();
    const px = e.clientX - (rect?.left || 0);
    const py = e.clientY - (rect?.top || 0);

    dragRef.current = {
      mode: "resize",
      id,
      startX: px,
      startY: py,
      origin: { x: it.x, y: it.y, w: it.w, h: it.h },
      handle, // "se"
    };

    e.currentTarget.setPointerCapture?.(e.pointerId);
  }

  function onPointerMoveCanvas(e) {
    const st = dragRef.current;
    if (!st.mode || !st.id) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    const px = e.clientX - (rect?.left || 0);
    const py = e.clientY - (rect?.top || 0);

    const dx = px - st.startX;
    const dy = py - st.startY;

    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== st.id) return it;

        if (st.mode === "move") {
          const nx = snap(st.origin.x + dx, snapToGrid);
          const ny = snap(st.origin.y + dy, snapToGrid);
          const clampedX = clamp(nx, 0, Math.max(0, canvasSize.w - it.w));
          const clampedY = clamp(ny, 0, Math.max(0, canvasSize.h - it.h));
          return { ...it, x: clampedX, y: clampedY };
        }

        if (st.mode === "resize") {
          // Only "se" handle for MVP
          const nw = snap(st.origin.w + dx, snapToGrid);
          const nh = snap(st.origin.h + dy, snapToGrid);
          const minW = 60;
          const minH = 40;
          const clampedW = clamp(nw, minW, Math.max(minW, canvasSize.w - it.x));
          const clampedH = clamp(nh, minH, Math.max(minH, canvasSize.h - it.y));
          return { ...it, w: clampedW, h: clampedH };
        }

        return it;
      })
    );
  }

  function onPointerUpCanvas() {
    dragRef.current = { mode: null, id: null, startX: 0, startY: 0, origin: null, handle: null };
  }

  function onCanvasBackgroundDown() {
    setSelectedId(null);
  }

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedId) deleteSelected();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        // prevent browser find if we add search later
        // e.preventDefault();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedId]);

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => (a.zIndex || 1) - (b.zIndex || 1));
  }, [items]);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#0b1020", color: "#e5e7eb" }}>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, borderBottom: "1px solid rgba(148,163,184,0.2)" }}>
        <div style={{ fontWeight: 700, letterSpacing: 0.2 }}>Roblox UI Builder</div>
        <div style={{ opacity: 0.7, fontSize: 12 }}>Base window (visual placement). Components/features come next.</div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={() => setShowGrid((v) => !v)}
            style={btnStyle("secondary")}
          >
            {showGrid ? "Hide Grid" : "Show Grid"}
          </button>
          <button
            onClick={() => setSnapToGrid((v) => !v)}
            style={btnStyle("secondary")}
          >
            {snapToGrid ? "Snap: On" : "Snap: Off"}
          </button>
          <button
            onClick={() => {}}
            style={btnStyle("primary")}
            disabled
            title="We’ll wire AI generation after components + server updates"
          >
            Generate (AI)
          </button>
        </div>
      </div>

      {/* Main layout */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "260px 1fr 320px", minHeight: 0 }}>
        {/* Left: Palette */}
        <div style={{ borderRight: "1px solid rgba(148,163,184,0.2)", padding: 12, overflow: "auto" }}>
          <Section title="Palette (Drag later)">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button style={btnStyle("secondary")} onClick={() => addPrimitive("Frame")}>+ Frame</button>
              <button style={btnStyle("secondary")} onClick={() => addPrimitive("TextLabel")}>+ TextLabel</button>
              <button style={btnStyle("secondary")} onClick={() => addPrimitive("TextButton")}>+ TextButton</button>
              <button style={btnStyle("secondary")} onClick={() => addPrimitive("ImageLabel")}>+ ImageLabel</button>
            </div>
            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75, lineHeight: 1.4 }}>
              Click to add primitives. Drag to move. Grab the bottom-right handle to resize.
              <br />
              Delete removes selected.
            </div>
          </Section>

          <Section title="Canvas Presets (later)">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <button
                style={btnStyle("secondary")}
                onClick={() => setCanvasSize({ w: 980, h: 560 })}
              >
                Desktop
              </button>
              <button
                style={btnStyle("secondary")}
                onClick={() => setCanvasSize({ w: 760, h: 520 })}
              >
                Tablet
              </button>
              <button
                style={btnStyle("secondary")}
                onClick={() => setCanvasSize({ w: 420, h: 740 })}
              >
                Mobile
              </button>
            </div>
          </Section>

          <Section title="Hierarchy (placeholder)">
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              We’ll build a proper tree view component next (ScreenGui → Frames → children).
            </div>
            <div style={{ marginTop: 10 }}>
              {items.length === 0 ? (
                <div style={{ fontSize: 12, opacity: 0.65 }}>No UI elements yet.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {sortedItems
                    .slice()
                    .reverse()
                    .map((it) => (
                      <button
                        key={it.id}
                        onClick={() => setSelectedId(it.id)}
                        style={{
                          ...btnStyle("ghost"),
                          textAlign: "left",
                          border: it.id === selectedId ? "1px solid rgba(59,130,246,0.65)" : "1px solid rgba(148,163,184,0.18)",
                          background: it.id === selectedId ? "rgba(59,130,246,0.10)" : "rgba(15,23,42,0.35)",
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 700 }}>{it.name || it.type}</div>
                        <div style={{ fontSize: 11, opacity: 0.75 }}>{it.type}</div>
                      </button>
                    ))}
                </div>
              )}
            </div>
          </Section>
        </div>

        {/* Center: Canvas */}
        <div style={{ padding: 16, overflow: "auto" }}>
          <div
            style={{
              width: canvasSize.w,
              height: canvasSize.h,
              margin: "0 auto",
              borderRadius: 14,
              border: "1px solid rgba(148,163,184,0.25)",
              background: "rgba(2,6,23,0.65)",
              position: "relative",
              boxShadow: "0 10px 40px rgba(0,0,0,0.35)",
              userSelect: "none",
            }}
            ref={canvasRef}
            onPointerMove={onPointerMoveCanvas}
            onPointerUp={onPointerUpCanvas}
            onPointerCancel={onPointerUpCanvas}
            onPointerDown={onCanvasBackgroundDown}
          >
            <CanvasGrid enabled={showGrid} />

            {/* Empty state */}
            {items.length === 0 && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "grid",
                  placeItems: "center",
                  opacity: 0.8,
                }}
              >
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontWeight: 800, fontSize: 18 }}>Drop UI here</div>
                  <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>
                    Add primitives from the palette. This canvas is your Roblox ScreenGui preview.
                  </div>
                </div>
              </div>
            )}

            {/* Render items */}
            {sortedItems.map((it) => {
              if (!it.visible) return null;
              const isSelected = it.id === selectedId;

              return (
                <div
                  key={it.id}
                  onPointerDown={(e) => onPointerDownItem(e, it.id)}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (it.type === "TextLabel" || it.type === "TextButton") {
                      const next = prompt("Edit text", it.text || "");
                      if (next !== null) {
                        setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, text: next } : x)));
                      }
                    }
                  }}
                  style={{
                    position: "absolute",
                    left: it.x,
                    top: it.y,
                    width: it.w,
                    height: it.h,
                    borderRadius: it.radius,
                    background: it.fill,
                    border: it.stroke ? `${it.strokeWidth}px solid ${it.strokeColor}` : "none",
                    boxSizing: "border-box",
                    outline: isSelected ? "2px solid rgba(59,130,246,0.8)" : "none",
                    outlineOffset: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    cursor: it.locked ? "not-allowed" : "grab",
                  }}
                  title={`${it.type} • ${it.name}`}
                >
                  {/* Content */}
                  {it.type === "TextLabel" || it.type === "TextButton" ? (
                    <div
                      style={{
                        padding: 10,
                        textAlign: "center",
                        color: it.textColor,
                        fontSize: it.fontSize,
                        fontWeight: it.type === "TextButton" ? 800 : 700,
                        width: "100%",
                        pointerEvents: "none",
                      }}
                    >
                      {it.text || (it.type === "TextLabel" ? "TextLabel" : "Button")}
                    </div>
                  ) : it.type === "ImageLabel" ? (
                    <div style={{ width: "100%", height: "100%", position: "relative" }}>
                      {/* Placeholder image tile */}
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background:
                            "linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
                          display: "grid",
                          placeItems: "center",
                          pointerEvents: "none",
                        }}
                      >
                        <div style={{ fontSize: 12, opacity: 0.85, textAlign: "center", padding: 10 }}>
                          <div style={{ fontWeight: 800 }}>ImageLabel</div>
                          <div style={{ opacity: 0.75, marginTop: 4 }}>
                            {it.imageId ? it.imageId : "Missing ImageId"}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, opacity: 0.8, pointerEvents: "none" }}>
                      <b>{it.name || "Frame"}</b>
                      <div style={{ opacity: 0.7 }}>{it.type}</div>
                    </div>
                  )}

                  {/* Resize handle (SE) */}
                  {isSelected && !it.locked && (
                    <div
                      onPointerDown={(e) => onPointerDownResize(e, it.id, "se")}
                      style={{
                        position: "absolute",
                        right: 4,
                        bottom: 4,
                        width: 14,
                        height: 14,
                        borderRadius: 4,
                        background: "rgba(59,130,246,0.9)",
                        boxShadow: "0 6px 16px rgba(0,0,0,0.25)",
                        cursor: "nwse-resize",
                      }}
                      title="Resize"
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Quick footer */}
          <div style={{ marginTop: 12, display: "flex", justifyContent: "center", gap: 10, opacity: 0.8, fontSize: 12 }}>
            <span>Canvas: {canvasSize.w}×{canvasSize.h}</span>
            <span>•</span>
            <span>Items: {items.length}</span>
            <span>•</span>
            <span>Selected: {selected ? `${selected.type} (${selected.name})` : "None"}</span>
          </div>
        </div>

        {/* Right: Properties */}
        <div style={{ borderLeft: "1px solid rgba(148,163,184,0.2)", padding: 12, overflow: "auto" }}>
          <Section title="Properties">
            {!selected ? (
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                Select an element on the canvas to edit properties.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <Row label="Type">
                  <div style={pillStyle}>{selected.type}</div>
                </Row>

                <Row label="Name">
                  <input
                    value={selected.name || ""}
                    onChange={(e) => updateSelected({ name: e.target.value })}
                    style={inputStyle}
                    placeholder="e.g. MainFrame"
                  />
                </Row>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <Row label="X">
                    <input
                      type="number"
                      value={selected.x}
                      onChange={(e) => updateSelected({ x: clamp(snap(Number(e.target.value) || 0, snapToGrid), 0, canvasSize.w) })}
                      style={inputStyle}
                    />
                  </Row>
                  <Row label="Y">
                    <input
                      type="number"
                      value={selected.y}
                      onChange={(e) => updateSelected({ y: clamp(snap(Number(e.target.value) || 0, snapToGrid), 0, canvasSize.h) })}
                      style={inputStyle}
                    />
                  </Row>
                  <Row label="W">
                    <input
                      type="number"
                      value={selected.w}
                      onChange={(e) => updateSelected({ w: clamp(snap(Number(e.target.value) || 0, snapToGrid), 60, canvasSize.w) })}
                      style={inputStyle}
                    />
                  </Row>
                  <Row label="H">
                    <input
                      type="number"
                      value={selected.h}
                      onChange={(e) => updateSelected({ h: clamp(snap(Number(e.target.value) || 0, snapToGrid), 40, canvasSize.h) })}
                      style={inputStyle}
                    />
                  </Row>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <Row label="Fill">
                    <input
                      value={selected.fill || ""}
                      onChange={(e) => updateSelected({ fill: e.target.value })}
                      style={inputStyle}
                      placeholder="#RRGGBB"
                    />
                  </Row>
                  <Row label="Radius">
                    <input
                      type="number"
                      value={selected.radius}
                      onChange={(e) => updateSelected({ radius: clamp(Number(e.target.value) || 0, 0, 60) })}
                      style={inputStyle}
                    />
                  </Row>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <Row label="Stroke">
                    <select
                      value={selected.stroke ? "on" : "off"}
                      onChange={(e) => updateSelected({ stroke: e.target.value === "on" })}
                      style={inputStyle}
                    >
                      <option value="on">On</option>
                      <option value="off">Off</option>
                    </select>
                  </Row>
                  <Row label="ZIndex">
                    <input
                      type="number"
                      value={selected.zIndex || 1}
                      onChange={(e) => updateSelected({ zIndex: Number(e.target.value) || 1 })}
                      style={inputStyle}
                    />
                  </Row>
                </div>

                {selected.type === "TextLabel" || selected.type === "TextButton" ? (
                  <>
                    <Row label="Text">
                      <input
                        value={selected.text || ""}
                        onChange={(e) => updateSelected({ text: e.target.value })}
                        style={inputStyle}
                      />
                    </Row>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <Row label="TextColor">
                        <input
                          value={selected.textColor || ""}
                          onChange={(e) => updateSelected({ textColor: e.target.value })}
                          style={inputStyle}
                          placeholder="#RRGGBB"
                        />
                      </Row>
                      <Row label="FontSize">
                        <input
                          type="number"
                          value={selected.fontSize || 16}
                          onChange={(e) => updateSelected({ fontSize: clamp(Number(e.target.value) || 16, 10, 48) })}
                          style={inputStyle}
                        />
                      </Row>
                    </div>
                  </>
                ) : null}

                {selected.type === "ImageLabel" ? (
                  <Row label="ImageId">
                    <input
                      value={selected.imageId || ""}
                      onChange={(e) => updateSelected({ imageId: formatAssetId(e.target.value) })}
                      style={inputStyle}
                      placeholder="rbxassetid://123456"
                    />
                  </Row>
                ) : null}

                <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                  <button style={btnStyle("secondary")} onClick={bringToFront}>Bring Front</button>
                  <button style={btnStyle("secondary")} onClick={sendToBack}>Send Back</button>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    style={btnStyle("danger")}
                    onClick={deleteSelected}
                  >
                    Delete
                  </button>
                  <button
                    style={btnStyle("secondary")}
                    onClick={() => updateSelected({ locked: !selected.locked })}
                  >
                    {selected.locked ? "Unlock" : "Lock"}
                  </button>
                  <button
                    style={btnStyle("secondary")}
                    onClick={() => updateSelected({ visible: !selected.visible })}
                  >
                    {selected.visible ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
            )}
          </Section>

          <Section title="Behaviors (placeholder)">
            <div style={{ fontSize: 12, opacity: 0.7, lineHeight: 1.4 }}>
              Next we’ll add no-code behaviors like:
              <ul style={{ margin: "8px 0 0 18px", opacity: 0.9 }}>
                <li>OnClick → Open/Close another element</li>
                <li>OnHover → Animate</li>
                <li>Toggle state & visibility</li>
                <li>Debounce presets</li>
              </ul>
            </div>
          </Section>

          <Section title="Export (placeholder)">
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              After components + server updates, this page will export:
              <ul style={{ margin: "8px 0 0 18px" }}>
                <li>Board JSON (UI blueprint)</li>
                <li>Generated LocalScript versions</li>
              </ul>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

/* ---------------- UI helpers ---------------- */

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 0.4, opacity: 0.9, marginBottom: 10 }}>
        {title}
      </div>
      <div
        style={{
          border: "1px solid rgba(148,163,184,0.18)",
          background: "rgba(15,23,42,0.35)",
          borderRadius: 14,
          padding: 12,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ fontSize: 12, opacity: 0.8 }}>{label}</div>
      {children}
    </div>
  );
}

function btnStyle(variant) {
  const base = {
    padding: "10px 10px",
    borderRadius: 12,
    border: "1px solid rgba(148,163,184,0.20)",
    background: "rgba(2,6,23,0.45)",
    color: "#e5e7eb",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 800,
    outline: "none",
  };

  if (variant === "primary") {
    return {
      ...base,
      background: "rgba(59,130,246,0.85)",
      border: "1px solid rgba(59,130,246,0.55)",
    };
  }
  if (variant === "danger") {
    return {
      ...base,
      background: "rgba(239,68,68,0.85)",
      border: "1px solid rgba(239,68,68,0.55)",
    };
  }
  if (variant === "ghost") {
    return {
      ...base,
      background: "rgba(2,6,23,0.20)",
    };
  }
  // secondary default
  return base;
}

const inputStyle = {
  width: "100%",
  padding: "10px 10px",
  borderRadius: 12,
  border: "1px solid rgba(148,163,184,0.20)",
  background: "rgba(2,6,23,0.45)",
  color: "#e5e7eb",
  outline: "none",
  fontSize: 12,
};

const pillStyle = {
  display: "inline-flex",
  alignItems: "center",
  padding: "8px 10px",
  borderRadius: 999,
  border: "1px solid rgba(148,163,184,0.20)",
  background: "rgba(2,6,23,0.45)",
  fontSize: 12,
  fontWeight: 900,
};
