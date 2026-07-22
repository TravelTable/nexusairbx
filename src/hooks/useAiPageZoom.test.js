import { act, renderHook } from "@testing-library/react";

import useAiPageZoom, { AI_PAGE_ZOOM } from "./useAiPageZoom";

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

test("uses the fixed 80% density and fills the viewport with reciprocal native-zoom sizing", () => {
  const hook = renderZoomHook();

  expect(AI_PAGE_ZOOM).toBe(0.8);
  expect(hook.page.style.width).toBe("1200px");
  expect(hook.page.style.height).toBe("900px");
  expect(hook.page.style.zoom).toBe("0.8");
  expect(hook.page.style.transform).toBe("");

  hook.dispose();
});

test("uses the same reciprocal sizing with a transform fallback", () => {
  installCssZoomSupport(false);
  const hook = renderZoomHook();

  expect(hook.page.style.width).toBe("1200px");
  expect(hook.page.style.height).toBe("900px");
  expect(hook.page.style.zoom).toBe("1");
  expect(hook.page.style.transform).toBe("scale(0.8)");
  expect(hook.page.style.transformOrigin).toBe("top left");

  hook.dispose();
});

test("recalculates dimensions when the visual viewport changes", () => {
  const viewport = window.visualViewport;
  const hook = renderZoomHook();

  viewport.width = 1200;
  viewport.height = 900;
  act(() => viewport.dispatch("resize"));

  expect(hook.page.style.width).toBe("1500px");
  expect(hook.page.style.height).toBe("1125px");

  hook.dispose();
});
