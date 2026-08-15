export const MOBILE_BREAKPOINT = 768;
export const TOUR_VIEWPORT_GUTTER = 12;
export const TOUR_TARGET_GAP = 12;

export function getStepSelectors(step, viewportWidth = window.innerWidth) {
  if (!step) return [];

  const isMobile = viewportWidth < MOBILE_BREAKPOINT;
  const selectors = [];

  if (isMobile && Array.isArray(step.mobileTargets)) {
    selectors.push(...step.mobileTargets);
  }

  if (Array.isArray(step.targets)) {
    selectors.push(...step.targets);
  } else if (step.target) {
    selectors.push(step.target);
  }

  if (!isMobile && Array.isArray(step.desktopTargets)) {
    selectors.push(...step.desktopTargets);
  }

  return [...new Set(selectors.filter(Boolean))];
}

export function isElementVisible(element) {
  if (!element) return false;

  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;

  const style = window.getComputedStyle(element);
  return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
}

export function resolveTourTarget(step, viewportWidth = window.innerWidth, root = document) {
  const selectors = getStepSelectors(step, viewportWidth);

  for (const selector of selectors) {
    const element = root.querySelector(selector);
    if (isElementVisible(element)) {
      return { element, selector };
    }
  }

  return { element: null, selector: null };
}

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
}

/**
 * Keeps the guide close to the control it explains without covering that
 * control or leaving the viewport. The returned coordinates are fixed-position
 * values, so scrolling the workspace never changes document layout.
 */
export function getCollisionSafeTourPosition({
  targetRect = null,
  viewportWidth = window.innerWidth,
  viewportHeight = window.innerHeight,
  tooltipWidth = 340,
  tooltipHeight = 260,
  gutter = TOUR_VIEWPORT_GUTTER,
  gap = TOUR_TARGET_GAP,
} = {}) {
  const availableWidth = Math.max(0, viewportWidth - gutter * 2);
  const availableHeight = Math.max(0, viewportHeight - gutter * 2);
  const width = Math.min(tooltipWidth, availableWidth);
  const height = Math.min(tooltipHeight, availableHeight);
  const maxLeft = viewportWidth - width - gutter;
  const maxTop = viewportHeight - height - gutter;

  if (!targetRect) {
    return {
      placement: "docked",
      left: gutter,
      top: Math.max(gutter, maxTop),
      width,
      maxHeight: availableHeight,
    };
  }

  const target = {
    top: Number(targetRect.top) || 0,
    left: Number(targetRect.left) || 0,
    right: Number(targetRect.right) || 0,
    bottom: Number(targetRect.bottom) || 0,
    width: Number(targetRect.width) || 0,
    height: Number(targetRect.height) || 0,
  };
  const centeredLeft = clamp(
    target.left + target.width / 2 - width / 2,
    gutter,
    maxLeft
  );
  const centeredTop = clamp(
    target.top + target.height / 2 - height / 2,
    gutter,
    maxTop
  );
  const room = {
    top: target.top - gutter,
    right: viewportWidth - target.right - gutter,
    bottom: viewportHeight - target.bottom - gutter,
    left: target.left - gutter,
  };

  if (target.bottom <= viewportHeight * 0.45 && room.bottom >= height + gap) {
    return {
      placement: "bottom",
      left: centeredLeft,
      top: target.bottom + gap,
      width,
      maxHeight: availableHeight,
    };
  }

  if (target.top >= viewportHeight * 0.55 && room.top >= height + gap) {
    return {
      placement: "top",
      left: centeredLeft,
      top: target.top - height - gap,
      width,
      maxHeight: availableHeight,
    };
  }

  if (room.right >= width + gap) {
    return {
      placement: "right",
      left: target.right + gap,
      top: centeredTop,
      width,
      maxHeight: availableHeight,
    };
  }

  if (room.left >= width + gap) {
    return {
      placement: "left",
      left: target.left - width - gap,
      top: centeredTop,
      width,
      maxHeight: availableHeight,
    };
  }

  if (room.bottom >= height + gap) {
    return {
      placement: "bottom",
      left: centeredLeft,
      top: target.bottom + gap,
      width,
      maxHeight: availableHeight,
    };
  }

  if (room.top >= height + gap) {
    return {
      placement: "top",
      left: centeredLeft,
      top: target.top - height - gap,
      width,
      maxHeight: availableHeight,
    };
  }

  return {
    placement: "docked",
    left: gutter,
    top: Math.max(gutter, maxTop),
    width,
    maxHeight: availableHeight,
  };
}
