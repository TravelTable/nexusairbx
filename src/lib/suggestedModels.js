/**
 * Curated Pro model picker order. Keep in sync with shared/suggestedModels.js
 * and backend/shared/suggestedModels.js.
 */
export const SUGGESTED_MODEL_IDS = Object.freeze([
  "anthropic/claude-sonnet-5",
  "anthropic/claude-opus-5",
  "openai/gpt-5.6-terra",
  "google/gemini-3.1-pro-preview",
  "google/gemini-3.6-flash",
  "openai/gpt-5-mini",
  "deepseek/deepseek-v4-flash",
]);

const SUGGESTED_MODEL_RANK = Object.freeze(
  Object.fromEntries(SUGGESTED_MODEL_IDS.map((id, index) => [id, index]))
);

export function suggestedModelRank(id) {
  const rank = SUGGESTED_MODEL_RANK[String(id || "")];
  return Number.isInteger(rank) ? rank : Number.POSITIVE_INFINITY;
}

export function isSuggestedModelId(id) {
  return Object.prototype.hasOwnProperty.call(SUGGESTED_MODEL_RANK, String(id || ""));
}

export function pickSuggestedModels(models = []) {
  const byId = new Map((Array.isArray(models) ? models : []).map((model) => [model.id, model]));
  return SUGGESTED_MODEL_IDS.map((id) => byId.get(id)).filter(Boolean);
}
