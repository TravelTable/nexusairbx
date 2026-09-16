export const NEXUS_AUTO_STORAGE_KEY = "nexus:auto-preferences:v1";
export const NEXUS_AUTO_PREFERENCES_EVENT = "nexus:auto-preferences-change";
export const NEXUS_AUTO_MODES = Object.freeze([
  { id: "economy", label: "Economy", description: "Prefer the lowest-cost model capable of completing the task well." },
  { id: "balanced", label: "Balanced", description: "Balance coding quality, reliability, speed, and credit usage.", recommended: true },
  { id: "max", label: "Max", description: "Prefer the strongest available models, even when they use more credits." },
]);
export const DEFAULT_NEXUS_AUTO_PREFERENCES = Object.freeze({ mode: "balanced" });
let sessionPreferences = { ...DEFAULT_NEXUS_AUTO_PREFERENCES };
let unsavedSessionPreferences = false;

const normalizeProviders = (value) => Array.isArray(value)
  ? [...new Set(value.filter((provider) => typeof provider === "string")
    .map((provider) => provider.trim().toLowerCase()).filter((provider) => /^[a-z0-9_-]{1,64}$/.test(provider)))].sort()
  : undefined;

export function normalizeNexusAutoPreferences(value = {}) {
  const input = value && typeof value === "object" ? value : {};
  const preferences = { mode: NEXUS_AUTO_MODES.some(({ id }) => id === input.mode) ? input.mode : "balanced" };
  // Empty means no providers permitted. Omission means all providers permitted.
  for (const key of ["allowedProviders", "preferredProviders"]) {
    const providers = normalizeProviders(input[key]);
    if (providers) preferences[key] = providers;
  }
  if (input.creditCeiling !== "" && input.creditCeiling != null) {
    const ceiling = Number(input.creditCeiling);
    if (Number.isSafeInteger(ceiling) && ceiling >= 0) preferences.creditCeiling = ceiling;
  }
  return preferences;
}

export function readNexusAutoPreferences() {
  if (unsavedSessionPreferences) return sessionPreferences;
  try {
    sessionPreferences = normalizeNexusAutoPreferences(JSON.parse(window.localStorage.getItem(NEXUS_AUTO_STORAGE_KEY)));
    return sessionPreferences;
  } catch {
    return sessionPreferences;
  }
}

export function writeNexusAutoPreferences(value) {
  const preferences = normalizeNexusAutoPreferences(value);
  sessionPreferences = preferences;
  try {
    window.localStorage.setItem(NEXUS_AUTO_STORAGE_KEY, JSON.stringify(preferences));
    unsavedSessionPreferences = false;
  } catch {
    // Preferences still apply for this session when device storage is unavailable.
    unsavedSessionPreferences = true;
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(NEXUS_AUTO_PREFERENCES_EVENT, { detail: preferences }));
  }
  return preferences;
}
