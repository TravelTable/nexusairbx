import { useLayoutEffect, useState } from "react";

export const AI_PAGE_ZOOM_KEY = "nexus.ai.pageZoom";
export const DEFAULT_AI_PAGE_ZOOM = 0.85;
export const AI_PAGE_ZOOM_OPTIONS = [0.75, 0.85, 1];

function readStoredZoom() {
  if (typeof window === "undefined") return DEFAULT_AI_PAGE_ZOOM;
  try {
    const raw = Number(window.localStorage.getItem(AI_PAGE_ZOOM_KEY));
    if (Number.isFinite(raw) && raw >= 0.7 && raw <= 1.25) return raw;
  } catch {
    /* ignore */
  }
  return DEFAULT_AI_PAGE_ZOOM;
}

function cssZoomAffectsLayout() {
  if (typeof document === "undefined" || !document.body) return false;
  const test = document.createElement("div");
  test.style.cssText = "width:100px;height:100px;zoom:0.5;position:absolute;left:-9999px;top:0;visibility:hidden;";
  document.body.appendChild(test);
  const layoutWidth = test.offsetWidth;
  document.body.removeChild(test);
  // Chrome/Edge: zoom shrinks layout size. If it doesn't, oversized height gets clipped.
  return layoutWidth > 0 && layoutWidth < 90;
}

/**
 * Fits `.ai-page` to the visual viewport while keeping CSS zoom (default 0.85).
 * When zoom affects layout, size is viewport/zoom so the zoomed page fills the screen.
 * When it does not, layout stays viewport-sized so overflow:hidden cannot hide the prompt.
 */
export default function useAiPageZoom(pageRef, initialZoom = DEFAULT_AI_PAGE_ZOOM) {
  const [zoom, setZoom] = useState(() => {
    const stored = readStoredZoom();
    return Number.isFinite(stored) ? stored : initialZoom;
  });

  useLayoutEffect(() => {
    const el = pageRef?.current;
    if (!el || typeof window === "undefined") return undefined;

    const zoomWorks = cssZoomAffectsLayout();

    const apply = () => {
      const vv = window.visualViewport;
      const width = vv?.width ?? window.innerWidth;
      const height = vv?.height ?? window.innerHeight;
      const nextZoom = Number(zoom) || DEFAULT_AI_PAGE_ZOOM;

      el.style.setProperty("--ai-zoom", String(nextZoom));
      el.style.zoom = String(nextZoom);
      el.style.transform = "";
      el.style.transformOrigin = "top left";

      if (zoomWorks) {
        el.style.width = `${width / nextZoom}px`;
        el.style.height = `${height / nextZoom}px`;
      } else {
        // Keep layout inside the shell; zoom is visual-only so the prompt stays on-screen.
        el.style.width = `${width}px`;
        el.style.height = `${height}px`;
      }
    };

    apply();
    try {
      window.localStorage.setItem(AI_PAGE_ZOOM_KEY, String(zoom));
    } catch {
      /* ignore */
    }

    window.addEventListener("resize", apply);
    window.visualViewport?.addEventListener("resize", apply);
    window.visualViewport?.addEventListener("scroll", apply);
    return () => {
      window.removeEventListener("resize", apply);
      window.visualViewport?.removeEventListener("resize", apply);
      window.visualViewport?.removeEventListener("scroll", apply);
    };
  }, [pageRef, zoom]);

  return { zoom, setZoom };
}
