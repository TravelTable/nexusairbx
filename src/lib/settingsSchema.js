import { DEFAULT_FREE_MODEL, normalizeModelId } from "./modelProviders";

export const SETTINGS_STORAGE_KEY = "nexusrbx:settings";

export const DEFAULT_SETTINGS = Object.freeze({
  modelVersion: DEFAULT_FREE_MODEL,
  creativity: 0.7,
  codeStyle: "optimized",
  verbosity: "concise",
  codingStandards: "",
  gameSpec: "",
  theme: "dark",
  chatMode: "agent",
  showThinking: true,
  studioAutoPushEnabled: false,
  studioAutoPushPolicy: "after_validation",
  lastAuthorizedStudioSessionId: null,
  robloxAssetUploadsEnabled: false,
  assetPublishingPreference: "auto_explicit_request",
  allowPlaceholderAssets: false,
  useExamples: false,
  selectedExampleIds: Object.freeze([]),
  robloxWritePolicy: Object.freeze({
    assetWrites: "allowed_after_toggle",
    universeWrites: "approval_required",
    groupWrites: "approval_required",
    secretWrites: "approval_required",
    serverActions: "approval_required",
  }),
});

const ALLOWED_KEYS = new Set(Object.keys(DEFAULT_SETTINGS));
const ENUMS = {
  codeStyle: new Set(["optimized", "safe", "verbose"]),
  verbosity: new Set(["concise", "balanced", "detailed"]),
  theme: new Set(["dark", "system"]),
  chatMode: new Set(["agent", "plan", "debug", "ask"]),
  studioAutoPushPolicy: new Set(["after_validation", "manual_review", "off"]),
  assetPublishingPreference: new Set([
    "review_every_asset",
    "auto_explicit_request",
    "always_project_creator",
    "generate_only",
  ]),
};
const WRITE_POLICIES = new Set(["allowed_after_toggle", "approval_required", "disabled"]);
const ROBLOX_WRITE_POLICY_KEYS = new Set(Object.keys(DEFAULT_SETTINGS.robloxWritePolicy));

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function truncateString(value, maxLength) {
  return String(value || "").slice(0, maxLength);
}

function sanitizeValue(key, value, { strict = false } = {}) {
  if (key === "modelVersion") {
    if (typeof value !== "string") {
      if (strict) throw new Error("modelVersion must be a string");
      return DEFAULT_SETTINGS.modelVersion;
    }
    return normalizeModelId(value) || DEFAULT_SETTINGS.modelVersion;
  }

  if (key === "creativity") {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      if (strict) throw new Error("creativity must be a number");
      return DEFAULT_SETTINGS.creativity;
    }
    return Math.min(1, Math.max(0, number));
  }

  if (key === "codingStandards" || key === "gameSpec") {
    if (typeof value !== "string") {
      if (strict) throw new Error(`${key} must be a string`);
      return DEFAULT_SETTINGS[key];
    }
    return truncateString(value, key === "codingStandards" ? 5000 : 8000);
  }

  if (ENUMS[key]) {
    if (!ENUMS[key].has(value)) {
      if (strict) throw new Error(`${key} has an unsupported value`);
      return DEFAULT_SETTINGS[key];
    }
    return value;
  }

  if (["showThinking", "studioAutoPushEnabled", "robloxAssetUploadsEnabled", "allowPlaceholderAssets", "useExamples"].includes(key)) {
    if (typeof value !== "boolean") {
      if (strict) throw new Error(`${key} must be a boolean`);
      return DEFAULT_SETTINGS[key];
    }
    return value;
  }

  if (key === "selectedExampleIds") {
    if (!Array.isArray(value)) {
      if (strict) throw new Error("selectedExampleIds must be an array");
      return [...DEFAULT_SETTINGS.selectedExampleIds];
    }
    const seen = new Set();
    const ids = [];
    value.forEach((item) => {
      const id = truncateString(item, 120).trim().toLowerCase();
      if (!id || seen.has(id)) return;
      seen.add(id);
      ids.push(id);
    });
    return ids.slice(0, 12);
  }

  if (key === "lastAuthorizedStudioSessionId") {
    if (value == null || value === "") return null;
    if (typeof value !== "string") {
      if (strict) throw new Error("lastAuthorizedStudioSessionId must be a string or null");
      return DEFAULT_SETTINGS.lastAuthorizedStudioSessionId;
    }
    return truncateString(value, 160);
  }

  if (key === "robloxWritePolicy") {
    if (!isPlainObject(value)) {
      if (strict) throw new Error("robloxWritePolicy must be an object");
      return { ...DEFAULT_SETTINGS.robloxWritePolicy };
    }
    const next = { ...DEFAULT_SETTINGS.robloxWritePolicy };
    Object.entries(value).forEach(([policyKey, policyValue]) => {
      if (!ROBLOX_WRITE_POLICY_KEYS.has(policyKey)) {
        if (strict) throw new Error(`robloxWritePolicy.${policyKey} is unsupported`);
        return;
      }
      if (!WRITE_POLICIES.has(policyValue)) {
        if (strict) throw new Error(`robloxWritePolicy.${policyKey} has an unsupported value`);
        return;
      }
      next[policyKey] = policyValue;
    });
    return next;
  }

  return DEFAULT_SETTINGS[key];
}

export function normalizeSettings(raw = {}) {
  const source = isPlainObject(raw) ? raw : {};
  const normalized = {
    ...DEFAULT_SETTINGS,
    robloxWritePolicy: { ...DEFAULT_SETTINGS.robloxWritePolicy },
  };

  Object.keys(DEFAULT_SETTINGS).forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      normalized[key] = sanitizeValue(key, source[key], { strict: false });
    }
  });

  return normalized;
}

export function sanitizeSettingsPatch(raw = {}) {
  if (!isPlainObject(raw)) {
    return { patch: {}, invalidKeys: ["settings"] };
  }

  const patch = {};
  const invalidKeys = [];

  Object.entries(raw).forEach(([key, value]) => {
    if (!ALLOWED_KEYS.has(key)) {
      invalidKeys.push(key);
      return;
    }
    try {
      patch[key] = sanitizeValue(key, value, { strict: true });
    } catch {
      invalidKeys.push(key);
    }
  });

  return { patch, invalidKeys };
}

export function mergeSettingsPatch(current, patch) {
  return normalizeSettings({ ...normalizeSettings(current), ...patch });
}
