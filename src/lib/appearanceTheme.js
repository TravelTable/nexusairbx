import { SETTINGS_STORAGE_KEY } from "./settingsSchema";

export const APPEARANCE_THEMES = Object.freeze(["system", "dark", "light"]);
export const DEFAULT_APPEARANCE_THEME = "system";
export const DARK_THEME_COLOR = "#1a1618";
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
  _preference,
  {
    documentObject = browserDocument(),
    matchMedia: _matchMedia = browserMatchMedia(),
  } = {}
) {
  // Stored preferences remain readable for backwards compatibility, but the
  // rebuilt product intentionally renders as one authored dark environment.
  const resolved = "dark";
  const root = documentObject?.documentElement;
  if (!root) return resolved;

  root.dataset.theme = resolved;
  root.style.colorScheme = resolved;
  documentObject
    .querySelectorAll?.('meta[name="theme-color"]')
    .forEach((node) => node.setAttribute("content", DARK_THEME_COLOR));
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
  const resolved = applyResolvedAppearanceTheme(preference, { documentObject });
  onChange?.(resolved);
  return () => {};
}

// Kept as a self-contained string so the Next static export can run it before
// React hydration. public/index.html contains the equivalent minimal bootstrap.
export const APPEARANCE_BOOTSTRAP_SCRIPT = `(() => {
  document.documentElement.dataset.theme = "dark";
  document.documentElement.style.colorScheme = "dark";
  document.querySelectorAll('meta[name="theme-color"]').forEach((node) => node.setAttribute("content", "${DARK_THEME_COLOR}"));
})();`;
