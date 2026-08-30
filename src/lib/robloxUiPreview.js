export const UI_DEVICE_PRESETS = Object.freeze({
  desktop: { id: "desktop", label: "Desktop", width: 1280, height: 720, safe: { top: 24, right: 24, bottom: 24, left: 24 } },
  tablet: { id: "tablet", label: "Tablet", width: 1024, height: 768, safe: { top: 28, right: 24, bottom: 28, left: 24 } },
  phoneLandscape: { id: "phoneLandscape", label: "Phone landscape", width: 812, height: 375, safe: { top: 18, right: 44, bottom: 18, left: 44 } },
  phonePortrait: { id: "phonePortrait", label: "Phone portrait", width: 375, height: 812, safe: { top: 44, right: 18, bottom: 34, left: 18 } },
});

export function resolveUiAxis(axis, parentSize) {
  return Number(axis?.scale || 0) * Number(parentSize || 0) + Number(axis?.offset || 0);
}

export function resolveUiNodeRect(node, parentWidth, parentHeight) {
  const width = resolveUiAxis(node?.props?.size?.x, parentWidth);
  const height = resolveUiAxis(node?.props?.size?.y, parentHeight);
  const anchorX = Number(node?.props?.anchorPoint?.x || 0);
  const anchorY = Number(node?.props?.anchorPoint?.y || 0);
  return {
    x: resolveUiAxis(node?.props?.position?.x, parentWidth) - width * anchorX,
    y: resolveUiAxis(node?.props?.position?.y, parentHeight) - height * anchorY,
    width,
    height,
  };
}

export function rgbaFromHex(hex, transparency = 0) {
  const safe = /^#[0-9a-f]{6}$/i.test(String(hex || "")) ? String(hex) : "#ffffff";
  const red = Number.parseInt(safe.slice(1, 3), 16);
  const green = Number.parseInt(safe.slice(3, 5), 16);
  const blue = Number.parseInt(safe.slice(5, 7), 16);
  return `rgba(${red}, ${green}, ${blue}, ${Math.max(0, Math.min(1, 1 - Number(transparency || 0)))})`;
}

export function indexUiNodes(document) {
  const nodes = document?.screens?.[0]?.nodes || [];
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const children = new Map();
  nodes.forEach((node) => {
    const parentId = node.parentId || "__root__";
    if (!children.has(parentId)) children.set(parentId, []);
    children.get(parentId).push(node);
  });
  children.forEach((entries) => entries.sort((a, b) => Number(a.order || 0) - Number(b.order || 0)));
  return { byId, children };
}

export function applyPreviewActions(runtime, actions, document) {
  const next = { ...(runtime || {}) };
  const nodes = document?.screens?.[0]?.nodes || [];
  (actions || []).forEach((action) => {
    if (action.type === "setState" && action.key) {
      next.__state = { ...(next.__state || {}), [action.key]: action.value };
      return;
    }
    if (action.type === "emitHook" && action.hook) {
      next.__lastHook = action.hook;
      return;
    }
    if (!action.targetId) return;
    const current = next[action.targetId] || {};
    const source = nodes.find((node) => node.id === action.targetId);
    if (action.type === "setVisible") next[action.targetId] = { ...current, visible: action.value === true };
    if (action.type === "toggleVisible") next[action.targetId] = { ...current, visible: !(current.visible ?? source?.props?.visible ?? true) };
    if (action.type === "openModal") next[action.targetId] = { ...current, visible: true };
    if (action.type === "closeModal") next[action.targetId] = { ...current, visible: false };
    if (action.type === "setText") next[action.targetId] = { ...current, text: String(action.value ?? "") };
    if (action.type === "selectTab") {
      const target = nodes.find((node) => node.id === action.targetId);
      nodes.filter((node) => node.parentId === target?.parentId).forEach((node) => {
        next[node.id] = { ...(next[node.id] || {}), visible: node.id === action.targetId };
      });
    }
  });
  return next;
}
