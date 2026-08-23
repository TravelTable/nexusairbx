const STORAGE_KEY = "nexusrbx:generation-intents";
const ACTIVE_INTENT_KEY = "nexusrbx:active-generation-intent";
const DEFAULT_TTL_MS = 30 * 60 * 1000;
const MAX_STORED_INTENTS = 5;

export const GENERATION_INTENT_MODES = Object.freeze({
  AGENT: "agent_build",
  SCRIPT: "quick_script",
  ASSET: "asset",
});

export function normalizeGenerationIntentMode(mode, fallback = GENERATION_INTENT_MODES.AGENT) {
  const value = String(mode || "").trim().toLowerCase();
  if (value === "agent" || value === "agent_build") return GENERATION_INTENT_MODES.AGENT;
  if (value === "script" || value === "quick_script") return GENERATION_INTENT_MODES.SCRIPT;
  if (value === "asset") return GENERATION_INTENT_MODES.ASSET;
  return fallback;
}

export function creationModeFromIntent(mode) {
  const normalized = normalizeGenerationIntentMode(mode);
  if (normalized === GENERATION_INTENT_MODES.SCRIPT) return "script";
  if (normalized === GENERATION_INTENT_MODES.ASSET) return "asset";
  return "agent";
}

function getStorage() {
  if (typeof window === "undefined") return null;
  try {
    const storage = window.sessionStorage;
    const probe = "__nexusrbx_generation_intent_probe__";
    storage.setItem(probe, "1");
    storage.removeItem(probe);
    return storage;
  } catch (_) {
    return null;
  }
}

function nowMs() {
  return Date.now();
}

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `intent_${Math.random().toString(36).slice(2)}_${nowMs().toString(36)}`;
}

function readAll(storage = getStorage()) {
  if (!storage) return {};
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (_) {
    return {};
  }
}

function writeAll(intents, storage = getStorage()) {
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(intents || {}));
    return true;
  } catch (_) {
    return false;
  }
}

function pruneIntents(intents, now = nowMs()) {
  const active = Object.values(intents || {})
    .filter((intent) => intent && intent.expiresAt > now && intent.status !== "consumed")
    .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
    .slice(0, MAX_STORED_INTENTS);

  return active.reduce((acc, intent) => {
    acc[intent.id] = intent;
    return acc;
  }, {});
}

export function createGenerationIntent({
  prompt,
  mode = GENERATION_INTENT_MODES.AGENT,
  source = "homepage",
  ttlMs = DEFAULT_TTL_MS,
} = {}) {
  const trimmedPrompt = String(prompt || "").trim();
  if (!trimmedPrompt) {
    throw new Error("Type a prompt before generating.");
  }

  const storage = getStorage();
  if (!storage) {
    throw new Error("Your browser could not store the prompt handoff. Try again or use a different browser setting.");
  }

  const createdAt = nowMs();
  const intent = {
    id: createId(),
    prompt: trimmedPrompt,
    mode: normalizeGenerationIntentMode(mode),
    source: String(source || "homepage"),
    status: "pending",
    createdAt,
    expiresAt: createdAt + ttlMs,
  };

  const next = pruneIntents({ ...readAll(storage), [intent.id]: intent }, createdAt);
  if (!writeAll(next, storage)) {
    throw new Error("Your browser could not store the prompt handoff. Try again.");
  }
  storage.setItem(ACTIVE_INTENT_KEY, intent.id);
  return { ...intent, mode: normalizeGenerationIntentMode(intent.mode) };
}

export function restoreGenerationIntent(intentId = null) {
  const storage = getStorage();
  if (!storage) return null;

  const activeId = intentId || storage.getItem(ACTIVE_INTENT_KEY);
  if (!activeId) return null;

  const now = nowMs();
  const intents = pruneIntents(readAll(storage), now);
  const intent = intents[activeId] || null;
  writeAll(intents, storage);

  if (!intent) {
    if (storage.getItem(ACTIVE_INTENT_KEY) === activeId) {
      storage.removeItem(ACTIVE_INTENT_KEY);
    }
    return null;
  }

  storage.setItem(ACTIVE_INTENT_KEY, intent.id);
  return { ...intent, mode: normalizeGenerationIntentMode(intent.mode) };
}

export function getActiveGenerationIntentId() {
  const storage = getStorage();
  return storage?.getItem(ACTIVE_INTENT_KEY) || null;
}

export function consumeGenerationIntent(intentId) {
  const storage = getStorage();
  if (!storage || !intentId) return false;

  const intents = readAll(storage);
  if (!intents[intentId]) return false;
  delete intents[intentId];
  writeAll(intents, storage);

  if (storage.getItem(ACTIVE_INTENT_KEY) === intentId) {
    storage.removeItem(ACTIVE_INTENT_KEY);
  }
  return true;
}

export function clearGenerationIntentsForTests() {
  const storage = getStorage();
  if (!storage) return;
  storage.removeItem(STORAGE_KEY);
  storage.removeItem(ACTIVE_INTENT_KEY);
}
