export const DEFAULT_TOOLTIP_SIZE = {
  width: 320,
  height: 190,
};

export const TOOLTIP_GAP = 14;
export const VIEWPORT_MARGIN = 16;
export const MOBILE_BREAKPOINT = 768;

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

export function createSpotlightRect(rect, padding = 6, radius = 12) {
  if (!rect) return null;

  return {
    top: rect.top - padding,
    left: rect.left - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
    radius,
  };
}

function clamp(value, min, max) {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}

function placementOrder(preferred) {
  const fallback = {
    top: ["top", "bottom", "right", "left"],
    bottom: ["bottom", "top", "right", "left"],
    left: ["left", "right", "bottom", "top"],
    right: ["right", "left", "bottom", "top"],
  };

  return fallback[preferred] || fallback.bottom;
}

function getCandidatePosition(placement, rect, tooltipSize, gap) {
  switch (placement) {
    case "top":
      return {
        top: rect.top - gap - tooltipSize.height,
        left: rect.left + rect.width / 2 - tooltipSize.width / 2,
      };
    case "left":
      return {
        top: rect.top + rect.height / 2 - tooltipSize.height / 2,
        left: rect.left - gap - tooltipSize.width,
      };
    case "right":
      return {
        top: rect.top + rect.height / 2 - tooltipSize.height / 2,
        left: rect.right + gap,
      };
    case "bottom":
    default:
      return {
        top: rect.bottom + gap,
        left: rect.left + rect.width / 2 - tooltipSize.width / 2,
      };
  }
}

function fitsViewport(position, tooltipSize, viewport, margin) {
  return (
    position.top >= margin &&
    position.left >= margin &&
    position.top + tooltipSize.height <= viewport.height - margin &&
    position.left + tooltipSize.width <= viewport.width - margin
  );
}

function getArrowStyle(placement, rect, top, left, tooltipSize) {
  const targetCenterX = rect.left + rect.width / 2;
  const targetCenterY = rect.top + rect.height / 2;
  const minArrowOffset = 18;

  if (placement === "top" || placement === "bottom") {
    return {
      side: placement === "top" ? "bottom" : "top",
      offset: clamp(targetCenterX - left, minArrowOffset, tooltipSize.width - minArrowOffset),
    };
  }

  return {
    side: placement === "left" ? "right" : "left",
    offset: clamp(targetCenterY - top, minArrowOffset, tooltipSize.height - minArrowOffset),
  };
}

export function getTooltipPlacement({
  targetRect,
  preferredPosition = "bottom",
  tooltipSize = DEFAULT_TOOLTIP_SIZE,
  viewport = { width: window.innerWidth, height: window.innerHeight },
  gap = TOOLTIP_GAP,
  margin = VIEWPORT_MARGIN,
}) {
  if (!targetRect) return null;

  const safeTooltipSize = {
    width: Math.min(tooltipSize.width || DEFAULT_TOOLTIP_SIZE.width, Math.max(viewport.width - margin * 2, 1)),
    height: tooltipSize.height || DEFAULT_TOOLTIP_SIZE.height,
  };

  let selectedPlacement = preferredPosition;
  let selectedPosition = null;

  for (const placement of placementOrder(preferredPosition)) {
    const position = getCandidatePosition(placement, targetRect, safeTooltipSize, gap);
    if (fitsViewport(position, safeTooltipSize, viewport, margin)) {
      selectedPlacement = placement;
      selectedPosition = position;
      break;
    }
  }

  if (!selectedPosition) {
    selectedPosition = getCandidatePosition(selectedPlacement, targetRect, safeTooltipSize, gap);
  }

  const top = clamp(selectedPosition.top, margin, viewport.height - margin - safeTooltipSize.height);
  const left = clamp(selectedPosition.left, margin, viewport.width - margin - safeTooltipSize.width);

  return {
    top,
    left,
    placement: selectedPlacement,
    width: safeTooltipSize.width,
    arrow: getArrowStyle(selectedPlacement, targetRect, top, left, safeTooltipSize),
  };
}
