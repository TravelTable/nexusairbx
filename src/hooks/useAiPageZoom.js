import { useLayoutEffect } from "react";

export const AI_PAGE_ZOOM = 1;

/**
 * Fits `.ai-page` to the visual viewport without changing the user's chosen
 * browser zoom. This keeps the workspace usable when mobile browser chrome or
 * an on-screen keyboard changes the visual viewport dimensions.
 */
export default function useAiPageZoom(pageRef) {
  useLayoutEffect(() => {
    const el = pageRef?.current;
    if (!el || typeof window === "undefined") return undefined;

    const visualViewport = window.visualViewport;

    const apply = () => {
      const width = visualViewport?.width ?? window.innerWidth;
      const height = visualViewport?.height ?? window.innerHeight;

      el.style.removeProperty("--ai-zoom");
      el.style.removeProperty("zoom");
      el.style.zoom = "";
      el.style.removeProperty("transform");
      el.style.removeProperty("transform-origin");
      el.style.width = `${width}px`;
      el.style.height = `${height}px`;
    };

    apply();
    window.addEventListener("resize", apply);
    visualViewport?.addEventListener("resize", apply);
    return () => {
      window.removeEventListener("resize", apply);
      visualViewport?.removeEventListener("resize", apply);
    };
  }, [pageRef]);
}
