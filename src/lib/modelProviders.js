export const DEFAULT_FREE_MODEL = "deepseek/deepseek-v3.2";
export const DEFAULT_PRO_MODEL = "openai/gpt-5.4";

export const MODEL_ID_ALIASES = Object.freeze({
  "deepseek-free": DEFAULT_FREE_MODEL,
  "nexus-4": DEFAULT_PRO_MODEL,
  "nexus-3": DEFAULT_PRO_MODEL,
});

// Fallback display labels for legacy IDs not yet present in the live catalog.
export const MODEL_ALIAS_LABELS = Object.freeze({
  "deepseek-free": "DeepSeek V3.2",
  "nexus-4": "Nexus (GPT-5.4)",
  "nexus-3": "Nexus (Legacy)",
});

export const PROVIDER_ORDER = [
  "deepseek",
  "openai",
  "anthropic",
  "google",
  "meta",
  "mistral",
  "xai",
  "alibaba",
  "other",
];

export const PROVIDER_LABELS = Object.freeze({
  openai: "OpenAI",
  deepseek: "DeepSeek",
  anthropic: "Anthropic",
  google: "Google",
  xai: "xAI",
  meta: "Meta",
  alibaba: "Alibaba",
  mistral: "Mistral",
  other: "Other",
});

const FREE_MODEL_IDS = new Set([
  DEFAULT_FREE_MODEL,
  ...Object.keys(MODEL_ID_ALIASES).filter((k) => MODEL_ID_ALIASES[k] === DEFAULT_FREE_MODEL),
]);

export function normalizeModelId(id) {
  const raw = String(id || "").trim();
  if (!raw) return raw;
  return MODEL_ID_ALIASES[raw] || raw;
}

export function isFreeDefaultModel(id) {
  const normalized = normalizeModelId(id);
  return FREE_MODEL_IDS.has(id) || FREE_MODEL_IDS.has(normalized) || normalized === DEFAULT_FREE_MODEL;
}

export function sortModelsInGroup(list) {
  return [...list].sort((a, b) => {
    if (!!b.recommended !== !!a.recommended) return b.recommended ? 1 : -1;
    if (a.tier !== b.tier) return a.tier === "free" ? -1 : 1;
    return String(a.name).localeCompare(String(b.name));
  });
}

export function groupModelsByProvider(models) {
  const groups = {};
  for (const m of models) {
    const key = m.provider || "other";
    (groups[key] = groups[key] || []).push(m);
  }
  for (const key of Object.keys(groups)) {
    groups[key] = sortModelsInGroup(groups[key]);
  }
  return groups;
}

export function providerRank(provider) {
  const index = PROVIDER_ORDER.indexOf(provider);
  return index === -1 ? PROVIDER_ORDER.length : index;
}

export function sortProviderEntries(grouped) {
  return Object.entries(grouped).sort(([a], [b]) => {
    const rankDiff = providerRank(a) - providerRank(b);
    if (rankDiff !== 0) return rankDiff;
    return a.localeCompare(b);
  });
}

export function resolveFreeDefaultFromCatalog(modelCatalog = []) {
  return (
    modelCatalog.find((m) => m.id === DEFAULT_FREE_MODEL)?.id
    || modelCatalog.find((m) => m.recommended && m.tier === "free")?.id
    || DEFAULT_FREE_MODEL
  );
}
