import { useLayoutEffect } from "react";

export const AI_PAGE_ZOOM = 0.8;

function supportsCssZoom() {
  return Boolean(window.CSS?.supports?.("zoom", "1"));
}

/**
 * Fits `.ai-page` to the visual viewport at the fixed 80% density. The layout
 * always uses reciprocal viewport dimensions; browsers without native CSS
 * zoom receive the same result through a top-left transform fallback.
 */
export default function useAiPageZoom(pageRef) {
  useLayoutEffect(() => {
    const el = pageRef?.current;
    if (!el || typeof window === "undefined") return undefined;

    const nativeZoomSupported = supportsCssZoom();

    const apply = () => {
      const vv = window.visualViewport;
      const width = vv?.width ?? window.innerWidth;
      const height = vv?.height ?? window.innerHeight;
      const nextZoom = AI_PAGE_ZOOM;

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
    window.addEventListener("resize", apply);
    window.visualViewport?.addEventListener("resize", apply);
    window.visualViewport?.addEventListener("scroll", apply);
    return () => {
      window.removeEventListener("resize", apply);
      window.visualViewport?.removeEventListener("resize", apply);
      window.visualViewport?.removeEventListener("scroll", apply);
    };
  }, [pageRef]);
}
