import { useLayoutEffect, useState } from "react";

export const AI_PAGE_ZOOM_KEY = "nexus.ai.pageZoom";
export const AI_PAGE_ZOOM_VERSION_KEY = "nexus.ai.pageZoomVersion";
export const DEFAULT_AI_PAGE_ZOOM = 0.75;
export const AI_PAGE_ZOOM_OPTIONS = [0.75, 0.85, 1];
const AI_PAGE_ZOOM_STORAGE_VERSION = "2";

function readStoredZoom(initialZoom) {
  if (typeof window === "undefined") return initialZoom;
  try {
    const raw = Number(window.localStorage.getItem(AI_PAGE_ZOOM_KEY));
    if (Number.isFinite(raw) && raw >= 0.7 && raw <= 1.25) {
      const version = window.localStorage.getItem(AI_PAGE_ZOOM_VERSION_KEY);
      // 85% was the previous automatic default. Move that legacy value once,
      // while keeping an 85% choice made after this migration.
      if (version !== AI_PAGE_ZOOM_STORAGE_VERSION && raw === 0.85) {
        return DEFAULT_AI_PAGE_ZOOM;
      }
      return raw;
    }
  } catch {
    /* ignore */
  }
  return initialZoom;
}

function supportsCssZoom() {
  return Boolean(window.CSS?.supports?.("zoom", "1"));
}

/**
 * Fits `.ai-page` to the visual viewport at the selected density. The layout
 * always uses reciprocal viewport dimensions; browsers without native CSS
 * zoom receive the same result through a top-left transform fallback.
 */
export default function useAiPageZoom(pageRef, initialZoom = DEFAULT_AI_PAGE_ZOOM) {
  const [zoom, setZoom] = useState(() => {
    const stored = readStoredZoom(initialZoom);
    return Number.isFinite(stored) ? stored : initialZoom;
  });

  useLayoutEffect(() => {
    const el = pageRef?.current;
    if (!el || typeof window === "undefined") return undefined;

    const nativeZoomSupported = supportsCssZoom();

    const apply = () => {
      const vv = window.visualViewport;
      const width = vv?.width ?? window.innerWidth;
      const height = vv?.height ?? window.innerHeight;
      const nextZoom = Number(zoom) || DEFAULT_AI_PAGE_ZOOM;

      el.style.setProperty("--ai-zoom", String(nextZoom));
      el.style.transformOrigin = "top left";
      el.style.width = `${width / nextZoom}px`;
      el.style.height = `${height / nextZoom}px`;

      if (nativeZoomSupported) {
        el.style.zoom = String(nextZoom);
        el.style.transform = "";
      } else {
        el.style.zoom = "1";
        el.style.transform = `scale(${nextZoom})`;
      }
    };

    apply();
    try {
      window.localStorage.setItem(AI_PAGE_ZOOM_KEY, String(zoom));
      window.localStorage.setItem(AI_PAGE_ZOOM_VERSION_KEY, AI_PAGE_ZOOM_STORAGE_VERSION);
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
