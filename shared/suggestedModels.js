/**
 * Curated Pro model picker order. Keep in sync with:
 * - src/lib/modelProviders.js (SUGGESTED_MODEL_IDS)
 * - backend/src/routes/models.js (RECOMMENDED_IDS / ranking)
 *
 * Display rows only when the id exists in the live catalog.
 */
const SUGGESTED_MODEL_IDS = Object.freeze([
  "openai/gpt-5-mini",
  "deepseek/deepseek-v4-flash",
  "anthropic/claude-sonnet-4.6",
  "openai/gpt-5.4",
  "google/gemini-2.5-pro",
  "google/gemini-2.5-flash",
]);

const SUGGESTED_MODEL_RANK = Object.freeze(
  Object.fromEntries(SUGGESTED_MODEL_IDS.map((id, index) => [id, index]))
);

function suggestedModelRank(id) {
  const rank = SUGGESTED_MODEL_RANK[String(id || "")];
  return Number.isInteger(rank) ? rank : Number.POSITIVE_INFINITY;
}

function isSuggestedModelId(id) {
  return Object.prototype.hasOwnProperty.call(SUGGESTED_MODEL_RANK, String(id || ""));
}

function pickSuggestedModels(models = []) {
  const byId = new Map((Array.isArray(models) ? models : []).map((model) => [model.id, model]));
  return SUGGESTED_MODEL_IDS.map((id) => byId.get(id)).filter(Boolean);
}

module.exports = {
  SUGGESTED_MODEL_IDS,
  SUGGESTED_MODEL_RANK,
  suggestedModelRank,
  isSuggestedModelId,
  pickSuggestedModels,
};
