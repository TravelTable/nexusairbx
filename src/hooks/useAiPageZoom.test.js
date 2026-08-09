import { act, renderHook } from "@testing-library/react";

import useAiPageZoom, { AI_PAGE_ZOOM } from "./useAiPageZoom";

const originalVisualViewportDescriptor = Object.getOwnPropertyDescriptor(window, "visualViewport");

function installVisualViewport(width = 960, height = 720) {
  const listeners = new Map();
  const viewport = {
    width,
    height,
    addEventListener: jest.fn((type, listener) => listeners.set(type, listener)),
    removeEventListener: jest.fn((type, listener) => {
      if (listeners.get(type) === listener) listeners.delete(type);
    }),
    dispatch(type) {
      listeners.get(type)?.();
    },
  };

  Object.defineProperty(window, "visualViewport", {
    configurable: true,
    value: viewport,
  });
  return viewport;
}

function renderZoomHook() {
  const page = document.createElement("div");
  document.body.appendChild(page);
  const pageRef = { current: page };
  const hook = renderHook(() => useAiPageZoom(pageRef));
  return {
    ...hook,
    page,
    dispose() {
      hook.unmount();
      page.remove();
    },
  };
}

beforeEach(() => {
  installVisualViewport();
});

afterEach(() => {
  if (originalVisualViewportDescriptor) {
    Object.defineProperty(window, "visualViewport", originalVisualViewportDescriptor);
  } else {
    delete window.visualViewport;
  }
  document.body.innerHTML = "";
});

test("fills the visual viewport at normal scale", () => {
  const hook = renderZoomHook();

  expect(AI_PAGE_ZOOM).toBe(1);
  expect(hook.page.style.width).toBe("960px");
  expect(hook.page.style.height).toBe("720px");
  expect(hook.page.style.zoom).toBe("");
  expect(hook.page.style.transform).toBe("");

  hook.dispose();
});

test("clears stale density styles left by the legacy adapter", () => {
  const page = document.createElement("div");
  page.style.setProperty("--ai-zoom", "0.8");
  page.style.zoom = "0.8";
  page.style.transform = "scale(0.8)";
  page.style.transformOrigin = "top left";
  document.body.appendChild(page);
  const pageRef = { current: page };
  const directHook = renderHook(() => useAiPageZoom(pageRef));
  expect(page.style.getPropertyValue("--ai-zoom")).toBe("");
  expect(page.style.zoom).toBe("");
  expect(page.style.transform).toBe("");
  expect(page.style.transformOrigin).toBe("");

  directHook.unmount();
  page.remove();
});

test("recalculates dimensions when the visual viewport changes", () => {
  const viewport = window.visualViewport;
  const hook = renderZoomHook();

  viewport.width = 1200;
  viewport.height = 900;
  act(() => viewport.dispatch("resize"));

  expect(hook.page.style.width).toBe("1200px");
  expect(hook.page.style.height).toBe("900px");

  hook.dispose();
});
