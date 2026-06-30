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
