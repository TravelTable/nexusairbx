import { SETTINGS_STORAGE_KEY } from "./settingsSchema";

export const APPEARANCE_THEMES = Object.freeze(["system", "dark", "light"]);
export const DEFAULT_APPEARANCE_THEME = "system";
export const DARK_THEME_COLOR = "#0b0b0c";
export const LIGHT_THEME_COLOR = "#f7f7f4";

export function normalizeAppearanceTheme(value) {
  return APPEARANCE_THEMES.includes(value) ? value : DEFAULT_APPEARANCE_THEME;
}

function browserMatchMedia() {
  return typeof window !== "undefined" ? window.matchMedia?.bind(window) : undefined;
}

function browserDocument() {
  return typeof document !== "undefined" ? document : undefined;
}

export function systemPrefersDark(matchMedia = browserMatchMedia()) {
  try {
    return Boolean(matchMedia?.("(prefers-color-scheme: dark)")?.matches);
  } catch {
    return true;
  }
}

export function resolveAppearanceTheme(preference, matchMedia = browserMatchMedia()) {
  const normalized = normalizeAppearanceTheme(preference);
  if (normalized === "system") return systemPrefersDark(matchMedia) ? "dark" : "light";
  return normalized;
}

export function readStoredAppearanceTheme(
  storage = typeof window !== "undefined" ? window.localStorage : undefined
) {
  try {
    const raw = storage?.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_APPEARANCE_THEME;
    return normalizeAppearanceTheme(JSON.parse(raw)?.theme);
  } catch {
    return DEFAULT_APPEARANCE_THEME;
  }
}

export function applyResolvedAppearanceTheme(
  preference,
  {
    documentObject = browserDocument(),
    matchMedia = browserMatchMedia(),
  } = {}
) {
  const resolved = resolveAppearanceTheme(preference, matchMedia);
  const root = documentObject?.documentElement;
  if (!root) return resolved;

  root.dataset.theme = resolved;
  root.style.colorScheme = resolved;
  const themeColor = resolved === "dark" ? DARK_THEME_COLOR : LIGHT_THEME_COLOR;
  documentObject
    .querySelectorAll?.('meta[name="theme-color"]')
    .forEach((node) => node.setAttribute("content", themeColor));
  return resolved;
}

export function subscribeToAppearanceTheme(
  preference,
  onChange,
  {
    windowObject = typeof window !== "undefined" ? window : undefined,
    documentObject = browserDocument(),
  } = {}
) {
  if (!windowObject) return () => {};
  const normalized = normalizeAppearanceTheme(preference);
  const media = windowObject.matchMedia?.("(prefers-color-scheme: dark)");
  const apply = () => {
    const resolved = applyResolvedAppearanceTheme(normalized, {
      documentObject,
      matchMedia: windowObject.matchMedia?.bind(windowObject),
    });
    onChange?.(resolved);
  };
  apply();
  if (normalized !== "system" || !media) return () => {};

  media.addEventListener?.("change", apply);
  if (!media.addEventListener) media.addListener?.(apply);
  return () => {
    media.removeEventListener?.("change", apply);
    if (!media.removeEventListener) media.removeListener?.(apply);
  };
}

// Kept as a self-contained string so the Next static export can run it before
// React hydration. public/index.html contains the equivalent minimal bootstrap.
export const APPEARANCE_BOOTSTRAP_SCRIPT = `(() => {
  const key = "${SETTINGS_STORAGE_KEY}";
  const allowed = new Set(["system", "dark", "light"]);
  const read = () => {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "{}").theme;
      return allowed.has(value) ? value : "system";
    } catch { return "system"; }
  };
  const resolve = (value) => value === "system"
    ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : value;
  const apply = () => {
    const theme = resolve(read());
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    const color = theme === "dark" ? "${DARK_THEME_COLOR}" : "${LIGHT_THEME_COLOR}";
    document.querySelectorAll('meta[name="theme-color"]').forEach((node) => node.setAttribute("content", color));
  };
  apply();
  matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", apply);
  addEventListener("storage", (event) => { if (event.key === key) apply(); });
})();`;
