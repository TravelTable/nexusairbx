// Legacy compatibility export. Suggestions are calculated from the live catalog.
export const SUGGESTED_MODEL_IDS = Object.freeze([]);

let latestSuggestedRank = new Map();

function scoreModel(model) {
  if (!model?.id) return Number.NEGATIVE_INFINITY;
  if (
    model.status === "deprecated" ||
    model.availableToPaid === false ||
    model.pricingConfigured === false
  ) {
    return Number.NEGATIVE_INFINITY;
  }

  let score = Number(model.recommendationScore) || 0;
  if (model.recommended) score += 10;
  if (model.isNew) score += 1;

  const uses = new Set(model.recommendedFor || []);
  if (uses.has("coding")) score += 2;
  if (uses.has("reasoning")) score += 1;
  if (uses.has("fast")) score += 0.5;

  const multiplier = Number(model.usageMultiplier ?? model.creditMultiplier);
  if (Number.isFinite(multiplier)) {
    if (multiplier <= 1) score += 1;
    else if (multiplier >= 4) score -= 1;
  }
  return score;
}

export function pickSuggestedModels(models = [], limit = 6) {
  const list = (Array.isArray(models) ? models : [])
    .filter((model) => Number.isFinite(scoreModel(model)))
    .sort((a, b) => {
      const scoreDiff = scoreModel(b) - scoreModel(a);
      return scoreDiff !== 0 ? scoreDiff : String(a.name).localeCompare(String(b.name));
    })
    .slice(0, Math.max(1, Number(limit) || 6));

  latestSuggestedRank = new Map(list.map((model, index) => [model.id, index]));
  return list;
}

export function suggestedModelRank(id) {
  return latestSuggestedRank.get(String(id || "")) ?? Number.POSITIVE_INFINITY;
}

export function isSuggestedModelId(id) {
  return latestSuggestedRank.has(String(id || ""));
}
