import { act, renderHook } from "@testing-library/react";

import useAiPageZoom, {
  AI_PAGE_ZOOM_KEY,
  AI_PAGE_ZOOM_VERSION_KEY,
  DEFAULT_AI_PAGE_ZOOM,
} from "./useAiPageZoom";

const originalCssDescriptor = Object.getOwnPropertyDescriptor(window, "CSS");
const originalVisualViewportDescriptor = Object.getOwnPropertyDescriptor(window, "visualViewport");

function installCssZoomSupport(supported) {
  Object.defineProperty(window, "CSS", {
    configurable: true,
    value: { supports: jest.fn(() => supported) },
  });
}

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

function renderZoomHook(initialZoom) {
  const page = document.createElement("div");
  document.body.appendChild(page);
  const pageRef = { current: page };
  const hook = renderHook(() => useAiPageZoom(pageRef, initialZoom));
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
  window.localStorage.clear();
  installCssZoomSupport(true);
  installVisualViewport();
});

afterEach(() => {
  if (originalCssDescriptor) {
    Object.defineProperty(window, "CSS", originalCssDescriptor);
  } else {
    delete window.CSS;
  }
  if (originalVisualViewportDescriptor) {
    Object.defineProperty(window, "visualViewport", originalVisualViewportDescriptor);
  } else {
    delete window.visualViewport;
  }
  document.body.innerHTML = "";
});

test("defaults to 75% and fills the viewport with reciprocal native-zoom sizing", () => {
  const hook = renderZoomHook();

  expect(DEFAULT_AI_PAGE_ZOOM).toBe(0.75);
  expect(hook.result.current.zoom).toBe(0.75);
  expect(hook.page.style.width).toBe("1280px");
  expect(hook.page.style.height).toBe("960px");
  expect(hook.page.style.zoom).toBe("0.75");
  expect(hook.page.style.transform).toBe("");
  expect(window.localStorage.getItem(AI_PAGE_ZOOM_KEY)).toBe("0.75");
  expect(window.localStorage.getItem(AI_PAGE_ZOOM_VERSION_KEY)).toBe("2");

  hook.dispose();
});

test("uses the same reciprocal sizing with a transform fallback", () => {
  installCssZoomSupport(false);
  const hook = renderZoomHook();

  expect(hook.page.style.width).toBe("1280px");
  expect(hook.page.style.height).toBe("960px");
  expect(hook.page.style.zoom).toBe("1");
  expect(hook.page.style.transform).toBe("scale(0.75)");
  expect(hook.page.style.transformOrigin).toBe("top left");

  hook.dispose();
});

test("recalculates dimensions when the visual viewport changes", () => {
  const viewport = window.visualViewport;
  const hook = renderZoomHook();

  viewport.width = 1200;
  viewport.height = 900;
  act(() => viewport.dispatch("resize"));

  expect(hook.page.style.width).toBe("1600px");
  expect(hook.page.style.height).toBe("1200px");

  hook.dispose();
});

test("migrates a legacy automatic 85% value once and then preserves an explicit 85% choice", () => {
  window.localStorage.setItem(AI_PAGE_ZOOM_KEY, "0.85");
  const first = renderZoomHook();

  expect(first.result.current.zoom).toBe(0.75);
  expect(window.localStorage.getItem(AI_PAGE_ZOOM_KEY)).toBe("0.75");

  act(() => first.result.current.setZoom(0.85));
  expect(window.localStorage.getItem(AI_PAGE_ZOOM_KEY)).toBe("0.85");
  first.dispose();

  const second = renderZoomHook();
  expect(second.result.current.zoom).toBe(0.85);
  second.dispose();
});

test.each([0.75, 1])("preserves a legacy saved %p choice", (savedZoom) => {
  window.localStorage.setItem(AI_PAGE_ZOOM_KEY, String(savedZoom));
  const hook = renderZoomHook();

  expect(hook.result.current.zoom).toBe(savedZoom);
  expect(window.localStorage.getItem(AI_PAGE_ZOOM_KEY)).toBe(String(savedZoom));

  hook.dispose();
});
