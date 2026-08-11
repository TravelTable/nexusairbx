import {
  APPEARANCE_BOOTSTRAP_SCRIPT,
  applyResolvedAppearanceTheme,
  normalizeAppearanceTheme,
  readStoredAppearanceTheme,
  resolveAppearanceTheme,
  subscribeToAppearanceTheme,
} from "./appearanceTheme";
import { SETTINGS_STORAGE_KEY } from "./settingsSchema";

function media(matches = false) {
  return jest.fn(() => ({ matches }));
}

describe("appearance theme", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.style.colorScheme = "";
  });

  test("normalizes missing and unsupported preferences to system", () => {
    expect(normalizeAppearanceTheme()).toBe("system");
    expect(normalizeAppearanceTheme("neon")).toBe("system");
    expect(normalizeAppearanceTheme("light")).toBe("light");
  });

  test("resolves system using the operating-system preference", () => {
    expect(resolveAppearanceTheme("system", media(true))).toBe("dark");
    expect(resolveAppearanceTheme("system", media(false))).toBe("light");
    expect(resolveAppearanceTheme("dark", media(false))).toBe("dark");
  });

  test("reads the theme from the existing settings storage object", () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ theme: "light" }));
    expect(readStoredAppearanceTheme()).toBe("light");
    localStorage.setItem(SETTINGS_STORAGE_KEY, "not-json");
    expect(readStoredAppearanceTheme()).toBe("system");
  });

  test("applies the resolved theme and browser color", () => {
    const meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);
    expect(applyResolvedAppearanceTheme("light", { documentObject: document, matchMedia: media(true) })).toBe("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(document.documentElement.style.colorScheme).toBe("light");
    expect(meta.getAttribute("content")).toBe("#f5f5f7");
    meta.remove();
  });

  test("system subscriptions react to media changes and clean up", () => {
    const listeners = new Set();
    const mediaQuery = {
      matches: false,
      addEventListener: jest.fn((_name, listener) => listeners.add(listener)),
      removeEventListener: jest.fn((_name, listener) => listeners.delete(listener)),
    };
    const windowObject = { matchMedia: jest.fn(() => mediaQuery) };
    const onChange = jest.fn();
    const unsubscribe = subscribeToAppearanceTheme("system", onChange, { windowObject, documentObject: document });
    expect(onChange).toHaveBeenLastCalledWith("light");
    mediaQuery.matches = true;
    listeners.forEach((listener) => listener());
    expect(onChange).toHaveBeenLastCalledWith("dark");
    unsubscribe();
    expect(listeners.size).toBe(0);
  });

  test("the first-paint bootstrap applies stored appearance before hydration", () => {
    const root = { dataset: {}, style: {} };
    const meta = { setAttribute: jest.fn() };
    const mediaListeners = [];
    const mediaQuery = {
      matches: true,
      addEventListener: jest.fn((_event, listener) => mediaListeners.push(listener)),
    };
    const storageListeners = [];
    const runBootstrap = new Function(
      "localStorage",
      "matchMedia",
      "document",
      "addEventListener",
      APPEARANCE_BOOTSTRAP_SCRIPT
    );

    runBootstrap(
      { getItem: jest.fn(() => JSON.stringify({ theme: "light" })) },
      jest.fn(() => mediaQuery),
      {
        documentElement: root,
        querySelectorAll: jest.fn(() => [meta]),
      },
      jest.fn((_event, listener) => storageListeners.push(listener))
    );

    expect(root.dataset.theme).toBe("light");
    expect(root.style.colorScheme).toBe("light");
    expect(meta.setAttribute).toHaveBeenCalledWith("content", "#f5f5f7");
    expect(mediaQuery.addEventListener).toHaveBeenCalledWith("change", expect.any(Function));
    expect(storageListeners).toHaveLength(1);
  });
});
