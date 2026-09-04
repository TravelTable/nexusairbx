import {
  SUGGESTED_MODEL_IDS,
  isSuggestedModelId,
  pickSuggestedModels,
  suggestedModelRank,
} from "./suggestedModels";

export {
  SUGGESTED_MODEL_IDS,
  isSuggestedModelId,
  pickSuggestedModels,
  suggestedModelRank,
};

export const LEGACY_NEXUS_FREE_MODEL = "nexus-free-auto";
export const DEFAULT_FREE_MODEL = "google/gemini-3.6-flash";
export const DEFAULT_PRO_MODEL = "openai/gpt-5-mini";
export const NEXUS_AGENT_LOGO = "/logo192.png";

export const MODEL_ID_ALIASES = Object.freeze({
  "nexus-free-auto": DEFAULT_FREE_MODEL,
  "deepseek-free": DEFAULT_FREE_MODEL,
  "nexus-4": "openai/gpt-5.4",
  "nexus-3": "openai/gpt-5.4",
  "gpt-4o": "openai/gpt-4o",
  "gpt-4o-mini": "openai/gpt-4o-mini",
  "gpt-4.1": "openai/gpt-4.1",
  "gpt-4.1-mini": "openai/gpt-4.1-mini",
});

export const MODEL_ALIAS_LABELS = Object.freeze({
  "nexus-free-auto": "Gemini 3.6 Flash",
  "deepseek-free": "Gemini 3.6 Flash",
  "nexus-4": "Nexus",
  "nexus-3": "Nexus",
  "gpt-4o": "GPT-4o",
  "gpt-4o-mini": "GPT-4o mini",
  "gpt-4.1": "GPT-4.1",
  "gpt-4.1-mini": "GPT-4.1 mini",
});

export const PROVIDER_ORDER = [
  "nexus",
  "openai",
  "anthropic",
  "google",
  "xai",
  "deepseek",
  "meta",
  "mistral",
  "alibaba",
  "cohere",
  "moonshotai",
  "zai",
  "other",
];

export const PROVIDER_LABELS = Object.freeze({
  nexus: "Nexus",
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
  xai: "xAI",
  deepseek: "DeepSeek",
  meta: "Meta",
  mistral: "Mistral",
  alibaba: "Alibaba",
  cohere: "Cohere",
  moonshotai: "Moonshot",
  zai: "Z.AI",
  other: "Other",
});

export const LOBE_PROVIDER_KEYS = Object.freeze({
  nexus: "nexus",
  openai: "openai",
  anthropic: "anthropic",
  google: "google",
  deepseek: "deepseek",
  xai: "xai",
  meta: "meta",
  mistral: "mistral",
  alibaba: "alibaba",
});

export function providerLabel(provider) {
  const key = String(provider || "other").trim().toLowerCase();
  if (PROVIDER_LABELS[key]) return PROVIDER_LABELS[key];
  return key
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function resolveLobeProviderKey(provider) {
  const key = String(provider || "other").toLowerCase();
  return LOBE_PROVIDER_KEYS[key] || null;
}

export function isNexusAgentModel({ provider, modelId } = {}) {
  const id = String(modelId || "").trim();
  const key = String(provider || "").toLowerCase();
  return key === "nexus" || id === LEGACY_NEXUS_FREE_MODEL;
}

const FREE_MODEL_IDS = new Set([
  DEFAULT_FREE_MODEL,
  ...Object.keys(MODEL_ID_ALIASES).filter(
    (key) => MODEL_ID_ALIASES[key] === DEFAULT_FREE_MODEL
  ),
]);

export function normalizeModelId(id) {
  const raw = String(id || "").trim();
  if (!raw) return raw;
  return MODEL_ID_ALIASES[raw] || raw;
}

export function isFreeDefaultModel(id) {
  const normalized = normalizeModelId(id);
  return (
    FREE_MODEL_IDS.has(id) ||
    FREE_MODEL_IDS.has(normalized) ||
    normalized === DEFAULT_FREE_MODEL
  );
}

export function isModelSelectable(
  model,
  { isPremium, isStarterOrAbove = false } = {}
) {
  if (!model?.id) return false;
  if (model.status === "deprecated" || model.pricingConfigured === false) return false;

  const paid = Boolean(isPremium || isStarterOrAbove);
  if (paid) return model.availableToPaid !== false;
  return model.availableToFree === true || model.id === DEFAULT_FREE_MODEL;
}

export function sortModelsInGroup(list) {
  return [...list].sort((a, b) => {
    const scoreDiff =
      Number(b.recommendationScore || 0) - Number(a.recommendationScore || 0);
    if (scoreDiff !== 0) return scoreDiff;
    if (Boolean(a.isNew) !== Boolean(b.isNew)) return b.isNew ? 1 : -1;
    const usageDiff =
      Number(a.usageMultiplier || 1) - Number(b.usageMultiplier || 1);
    if (usageDiff !== 0) return usageDiff;
    return String(a.name).localeCompare(String(b.name));
  });
}

export function groupModelsByProvider(models) {
  const groups = {};
  for (const model of models || []) {
    const key = model.provider || "other";
    (groups[key] = groups[key] || []).push(model);
  }
  for (const key of Object.keys(groups)) groups[key] = sortModelsInGroup(groups[key]);
  return groups;
}

export function providerRank(provider) {
  const index = PROVIDER_ORDER.indexOf(provider);
  return index === -1 ? PROVIDER_ORDER.length : index;
}

export function sortProviderEntries(grouped) {
  return Object.entries(grouped).sort(([a], [b]) => {
    const rankDiff = providerRank(a) - providerRank(b);
    return rankDiff !== 0 ? rankDiff : a.localeCompare(b);
  });
}

export function resolveFreeDefaultFromCatalog(modelCatalog = []) {
  return (
    modelCatalog.find((model) => model.id === DEFAULT_FREE_MODEL)?.id || DEFAULT_FREE_MODEL
  );
}
