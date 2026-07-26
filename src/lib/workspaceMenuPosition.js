const DEFAULT_MENU_WIDTH = 400;
const DEFAULT_MENU_MAX_HEIGHT = 520;
const DEFAULT_GUTTER = 8;

export function getWorkspaceMenuHost() {
  if (typeof document === "undefined") return null;
  return document.querySelector(".ai-page") || document.body;
}

export function readWorkspaceHostScale(host) {
  if (!host || typeof window === "undefined") return 1;
  const cssVar = Number(host.style?.getPropertyValue?.("--ai-zoom"));
  if (Number.isFinite(cssVar) && cssVar > 0) return cssVar;
  const zoom = Number(host.style?.zoom || getComputedStyle(host).zoom);
  if (Number.isFinite(zoom) && zoom > 0 && zoom !== 1) return zoom;
  const transform = getComputedStyle(host).transform;
  if (transform && transform !== "none") {
    const match = transform.match(/^matrix\(([-0-9.]+)/);
    const scale = match ? Number(match[1]) : NaN;
    if (Number.isFinite(scale) && scale > 0) return scale;
  }
  return 1;
}

/**
 * Anchor a workspace menu under its trigger.
 * `align: "end"` right-aligns to the trigger; `"start"` left-aligns.
 */
export function computeAnchoredMenuPosition(buttonRect, {
  hostRect = null,
  hostClientWidth = 0,
  hostClientHeight = 0,
  hostScale = 1,
  viewportWidth = typeof window !== "undefined" ? window.innerWidth : DEFAULT_MENU_WIDTH,
  viewportHeight = typeof window !== "undefined" ? window.innerHeight : DEFAULT_MENU_MAX_HEIGHT,
  menuWidth = DEFAULT_MENU_WIDTH,
  menuMaxHeight = DEFAULT_MENU_MAX_HEIGHT,
  gutter = DEFAULT_GUTTER,
  minHeight = 240,
  align = "end",
} = {}) {
  const scale = Number.isFinite(hostScale) && hostScale > 0 ? hostScale : 1;
  const useHost = Boolean(hostRect);
  const alignEnd = align !== "start";

  if (useHost) {
    const width = Math.min(menuWidth, Math.max(160, hostClientWidth - gutter * 2));
    const localLeft = (buttonRect.left - hostRect.left) / scale;
    const localRight = (buttonRect.right - hostRect.left) / scale;
    const localBottom = (buttonRect.bottom - hostRect.top) / scale;
    let left = alignEnd ? localRight - width : localLeft;
    left = Math.min(Math.max(gutter, left), hostClientWidth - width - gutter);
    const top = localBottom + gutter;
    const maxHeight = Math.min(
      menuMaxHeight,
      Math.max(minHeight, hostClientHeight - top - gutter),
    );
    return { top, left, width, maxHeight, strategy: "absolute" };
  }

  const width = Math.min(menuWidth, Math.max(160, viewportWidth - gutter * 2));
  let left = alignEnd ? buttonRect.right - width : buttonRect.left;
  left = Math.min(Math.max(gutter, left), viewportWidth - width - gutter);
  const top = buttonRect.bottom + gutter;
  const maxHeight = Math.min(
    menuMaxHeight,
    Math.max(minHeight, viewportHeight - top - gutter),
  );
  return { top, left, width, maxHeight, strategy: "fixed" };
}

export function resolveAnchoredMenuPosition(button, {
  menuWidth = DEFAULT_MENU_WIDTH,
  menuMaxHeight = DEFAULT_MENU_MAX_HEIGHT,
  gutter = DEFAULT_GUTTER,
  minHeight = 240,
  align = "end",
} = {}) {
  if (!button) return null;
  const buttonRect = button.getBoundingClientRect();
  const host = getWorkspaceMenuHost();
  const hostIsPage = Boolean(host && host !== document.body && host.classList?.contains("ai-page"));

  if (hostIsPage) {
    return computeAnchoredMenuPosition(buttonRect, {
      hostRect: host.getBoundingClientRect(),
      hostClientWidth: host.clientWidth,
      hostClientHeight: host.clientHeight,
      hostScale: readWorkspaceHostScale(host),
      menuWidth,
      menuMaxHeight,
      gutter,
      minHeight,
      align,
    });
  }

  return computeAnchoredMenuPosition(buttonRect, {
    menuWidth,
    menuMaxHeight,
    gutter,
    minHeight,
    align,
  });
}
