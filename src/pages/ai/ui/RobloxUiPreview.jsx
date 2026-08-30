import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { applyPreviewActions, indexUiNodes, rgbaFromHex } from "../../../lib/robloxUiPreview";

function udimCss(axis) {
  return `calc(${Number(axis?.scale || 0) * 100}% + ${Number(axis?.offset || 0)}px)`;
}

function assetUrlForNode(node, assets) {
  if (!node?.props?.assetRef) return "";
  return assets.find((asset) => asset.refId === node.props.assetRef)?.previewUrl || "";
}

function tweenFrames(timeline) {
  const value = timeline?.to;
  if (timeline.property === "Scale" && Number.isFinite(Number(value))) {
    return [{ transform: "scale(1)" }, { transform: `scale(${Number(value)})` }];
  }
  if (timeline.property === "Rotation" && Number.isFinite(Number(value))) {
    return [{ rotate: "0deg" }, { rotate: `${Number(value)}deg` }];
  }
  if (/Transparency$/.test(timeline.property) && Number.isFinite(Number(value))) {
    return [{ opacity: 1 }, { opacity: Math.max(0, Math.min(1, 1 - Number(value))) }];
  }
  if (timeline.property === "Size" && value?.x && value?.y) {
    return [{}, { width: udimCss(value.x), height: udimCss(value.y) }];
  }
  if (timeline.property === "Position" && value?.x && value?.y) {
    return [{}, { left: udimCss(value.x), top: udimCss(value.y) }];
  }
  return null;
}

function RobloxPreviewNode({
  node,
  document,
  index,
  runtime,
  transient,
  mode,
  selectedId,
  onSelect,
  onRuntimeChange,
  onManipulationStart,
  parentUsesLayout = false,
}) {
  const elementRef = useRef(null);
  const current = useMemo(
    () => transient?.[node.id] ? { ...node, props: { ...node.props, ...transient[node.id] } } : node,
    [node, transient],
  );
  const override = runtime?.[node.id] || {};
  const children = index.children.get(node.id) || [];
  const isVisible = (override.visible ?? current.props.visible) !== false;
  const isTextNode = ["TextLabel", "TextButton", "TextBox"].includes(current.className);
  const background = current.style?.gradient
    ? `linear-gradient(${Number(current.style.gradient.rotation || 90)}deg, ${current.style.gradient.from}, ${current.style.gradient.to})`
    : rgbaFromHex(current.props.backgroundColor, current.props.backgroundTransparency);
  const style = {
    position: parentUsesLayout ? "relative" : "absolute",
    // Roblox UIListLayout preserves each child's resolved UDim2 size. Flexbox
    // shrinks items by default, which made fixed-width cards collapse on phone
    // previews instead of producing the same scrollable row Studio renders.
    flexShrink: parentUsesLayout ? 0 : undefined,
    left: parentUsesLayout ? "auto" : udimCss(current.props.position?.x),
    top: parentUsesLayout ? "auto" : udimCss(current.props.position?.y),
    width: udimCss(current.props.size?.x),
    height: udimCss(current.props.size?.y),
    transform: parentUsesLayout
      ? undefined
      : `translate(${-Number(current.props.anchorPoint?.x || 0) * 100}%, ${-Number(current.props.anchorPoint?.y || 0) * 100}%) scale(${Number(current.props.uiScale || 1)})`,
    rotate: `${Number(current.props.rotation || 0)}deg`,
    zIndex: Number(current.props.zIndex || 1),
    display: current.layout ? undefined : "flex",
    overflow: current.className === "ScrollingFrame" ? "auto" : current.props.clipsDescendants ? "hidden" : "visible",
    background,
    borderRadius: `${Number(current.style?.cornerRadius || 0)}px`,
    border: current.style?.stroke
      ? `${Number(current.style.stroke.thickness || 1)}px solid ${rgbaFromHex(current.style.stroke.color, current.style.stroke.transparency)}`
      : "0",
    color: rgbaFromHex(current.props.textColor, current.props.textTransparency),
    fontSize: `${Number(current.props.textSize || 18)}px`,
    fontFamily: current.props.font === "Code" ? "var(--nx-font-mono)" : "var(--nx-font-body)",
    textAlign: String(current.props.textXAlignment || "Center").toLowerCase(),
    alignItems: current.props.textYAlignment === "Top" ? "flex-start" : current.props.textYAlignment === "Bottom" ? "flex-end" : "center",
    justifyContent: current.props.textXAlignment === "Left" ? "flex-start" : current.props.textXAlignment === "Right" ? "flex-end" : "center",
    whiteSpace: current.props.textWrapped === false ? "nowrap" : "normal",
    padding: current.style?.padding
      ? `${Number(current.style.padding.top || 0)}px ${Number(current.style.padding.right || 0)}px ${Number(current.style.padding.bottom || 0)}px ${Number(current.style.padding.left || 0)}px`
      : 0,
    ...(current.layout?.type === "list" ? {
      display: "flex",
      flexDirection: current.layout.direction === "horizontal" ? "row" : "column",
      gap: `${Number(current.layout.padding || 0)}px`,
      alignItems: current.layout.horizontalAlignment === "Center" ? "center" : current.layout.horizontalAlignment === "Right" ? "flex-end" : "flex-start",
      justifyContent: current.layout.verticalAlignment === "Center" ? "center" : current.layout.verticalAlignment === "Bottom" ? "flex-end" : "flex-start",
    } : {}),
    ...(current.layout?.type === "grid" ? {
      display: "grid",
      gridTemplateColumns: `repeat(auto-fill, ${udimCss(current.layout.cellSize?.x)})`,
      gridAutoRows: udimCss(current.layout.cellSize?.y),
      gap: `${Number(current.layout.padding || 0)}px`,
    } : {}),
    ...(!isVisible ? { display: "none" } : {}),
  };

  const runTrigger = useCallback((trigger) => {
    const actions = current.interactions?.[trigger] || [];
    if (actions.length) onRuntimeChange((previous) => applyPreviewActions(previous, actions, document));
    (document.screens?.[0]?.timelines || [])
      .filter((timeline) => timeline.targetId === current.id && timeline.trigger === trigger)
      .forEach((timeline) => {
        const frames = tweenFrames(timeline);
        if (!frames || typeof elementRef.current?.animate !== "function") return;
        const reduceMotion = typeof window.matchMedia === "function"
          && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        elementRef.current.animate(frames, {
          duration: reduceMotion ? 1 : Math.max(0, Number(timeline.duration || 0.18)) * 1000,
          easing: timeline.easingStyle === "Linear" ? "linear" : "cubic-bezier(.2,.8,.2,1)",
          fill: "forwards",
        });
      });
  }, [current, document, onRuntimeChange]);

  const content = isTextNode ? String(override.text ?? current.props.text ?? "") : "";
  const imageUrl = assetUrlForNode(current, document.assets || []);
  const isButton = current.className === "TextButton" || current.className === "ImageButton";

  return (
    <div
      ref={elementRef}
      role={isButton ? "button" : undefined}
      tabIndex={mode === "design" || (isButton && mode === "preview") ? 0 : undefined}
      className="roblox-ui-node"
      data-class={current.className}
      data-selected={mode === "design" && selectedId === current.id ? "true" : "false"}
      aria-label={current.accessibilityLabel || current.name}
      style={style}
      onPointerDown={(event) => {
        event.stopPropagation();
        onSelect(current.id);
        if (mode === "design") onManipulationStart(current, event, "move");
      }}
      onClick={(event) => {
        event.stopPropagation();
        if (mode === "preview") runTrigger("Activated");
      }}
      onMouseEnter={() => mode === "preview" && runTrigger("MouseEnter")}
      onMouseLeave={() => mode === "preview" && runTrigger("MouseLeave")}
      onKeyDown={(event) => {
        if (mode === "design" && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onSelect(current.id);
          return;
        }
        if (isButton && mode === "preview" && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          runTrigger("Activated");
        }
      }}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          draggable="false"
          style={{
            opacity: Math.max(0, Math.min(1, 1 - Number(current.props.imageTransparency || 0))),
            objectFit: current.props.scaleType === "Crop" ? "cover" : current.props.scaleType === "Stretch" ? "fill" : "contain",
          }}
        />
      ) : null}
      {current.className === "TextBox" ? (
        <input
          className="roblox-ui-node__textbox"
          value={String(content || "")}
          placeholder={current.props.placeholderText || ""}
          readOnly={mode !== "preview"}
          onFocus={() => mode === "preview" && runTrigger("Focused")}
          onBlur={() => mode === "preview" && runTrigger("FocusLost")}
          onChange={(event) => onRuntimeChange((state) => ({
            ...state,
            [current.id]: { ...state[current.id], text: event.target.value },
          }))}
          onClick={(event) => event.stopPropagation()}
        />
      ) : content ? <span>{content}</span> : null}
      {children.map((child) => (
        <RobloxPreviewNode
          key={child.id}
          node={child}
          document={document}
          index={index}
          runtime={runtime}
          transient={transient}
          mode={mode}
          selectedId={selectedId}
          onSelect={onSelect}
          onRuntimeChange={onRuntimeChange}
          onManipulationStart={onManipulationStart}
          parentUsesLayout={Boolean(current.layout)}
        />
      ))}
      {mode === "design" && selectedId === current.id ? (
        <button
          type="button"
          className="roblox-ui-node__resize"
          aria-label={`Resize ${current.name}`}
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onManipulationStart(current, event, "resize");
          }}
        />
      ) : null}
    </div>
  );
}

export default function RobloxUiPreview({ document, device, mode, selectedId, onSelect, onNodeChange }) {
  const hostRef = useRef(null);
  const manipulationRef = useRef(null);
  const transientRef = useRef({});
  const [scale, setScale] = useState(0.5);
  const [runtime, setRuntime] = useState({});
  const [transient, setTransient] = useState({});
  const index = useMemo(() => indexUiNodes(document), [document]);
  const rootNodes = index.children.get("__root__") || [];

  useEffect(() => setRuntime({}), [document?.revision]);
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    const measure = () => {
      const widthScale = Math.max(0.05, (host.clientWidth - 48) / device.width);
      const heightScale = Math.max(0.05, (host.clientHeight - 128) / device.height);
      setScale(Math.min(1, widthScale, heightScale));
    };
    measure();
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(measure) : null;
    observer?.observe(host);
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [device.height, device.width]);

  const startManipulation = useCallback((node, event, kind) => {
    if (event.button !== 0) return;
    if (typeof window.matchMedia === "function" && window.matchMedia("(max-width: 900px)").matches) return;
    event.preventDefault();
    manipulationRef.current = {
      node,
      kind,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startPosition: node.props.position,
      startSize: node.props.size,
    };
    event.currentTarget?.setPointerCapture?.(event.pointerId);
  }, []);

  useEffect(() => {
    const handleMove = (event) => {
      const active = manipulationRef.current;
      if (!active || event.pointerId !== active.pointerId) return;
      const deltaX = (event.clientX - active.startX) / scale;
      const deltaY = (event.clientY - active.startY) / scale;
      const props = active.kind === "resize"
        ? {
            size: {
              x: { ...active.startSize.x, offset: Math.max(8, Math.round(active.startSize.x.offset + deltaX)) },
              y: { ...active.startSize.y, offset: Math.max(8, Math.round(active.startSize.y.offset + deltaY)) },
            },
          }
        : {
            position: {
              x: { ...active.startPosition.x, offset: Math.round(active.startPosition.x.offset + deltaX) },
              y: { ...active.startPosition.y, offset: Math.round(active.startPosition.y.offset + deltaY) },
            },
          };
      transientRef.current = { [active.node.id]: props };
      setTransient(transientRef.current);
    };
    const handleUp = (event) => {
      const active = manipulationRef.current;
      if (!active || event.pointerId !== active.pointerId) return;
      const patch = transientRef.current[active.node.id];
      manipulationRef.current = null;
      transientRef.current = {};
      setTransient({});
      if (patch) onNodeChange(active.node.id, { props: patch });
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };
  }, [onNodeChange, scale]);

  return (
    <div
      ref={hostRef}
      className="roblox-ui-preview"
      data-mode={mode}
      onPointerDown={() => onSelect(null)}
    >
      <div
        className="roblox-ui-preview__device"
        style={{
          width: device.width,
          height: device.height,
          transform: `scale(${scale})`,
          background: document?.canvas?.backgroundColor || "#101014",
        }}
      >
        <div
          className="roblox-ui-preview__safe-area"
          style={{ top: device.safe.top, right: device.safe.right, bottom: device.safe.bottom, left: device.safe.left }}
          aria-hidden="true"
        />
        {rootNodes.map((node) => (
          <RobloxPreviewNode
            key={node.id}
            node={node}
            document={document}
            index={index}
            runtime={runtime}
            transient={transient}
            mode={mode}
            selectedId={selectedId}
            onSelect={onSelect}
            onRuntimeChange={setRuntime}
            onManipulationStart={startManipulation}
          />
        ))}
        {!rootNodes.length ? (
          <div className="roblox-ui-preview__empty">
            <span>SCREEN GUI</span>
            <strong>Prompt Nexus or add a component</strong>
            <p>The browser renderer will preview supported Roblox layout, interaction, and motion here.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
