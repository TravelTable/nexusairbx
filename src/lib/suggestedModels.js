// Legacy compatibility exports. Recommendation policy belongs to the server.
export const SUGGESTED_MODEL_IDS = Object.freeze([]);
let latestSuggestedRank = new Map();

export function isFlagshipCodingModel(model = {}) {
  return model.frontier === true || (model.badges || []).includes("FRONTIER");
}

export function pickSuggestedModels(models = [], limit = 6) {
  const list = (Array.isArray(models) ? models : [])
    .filter((model) => model?.id && model.pricingConfigured === true && model.availableToPaid !== false &&
      !["deprecated", "disabled", "unavailable", "removed"].includes(model.status) &&
      !["disabled", "unavailable", "removed"].includes(model.availability) &&
      (model.recommended === true || model.section === "recommended" || (model.badges || []).includes("RECOMMENDED")))
    .sort((a, b) => {
      const difference = Number(b.rankings?.overall ?? b.recommendationScore ?? 0) - Number(a.rankings?.overall ?? a.recommendationScore ?? 0);
      return difference || String(a.displayName || a.name || a.id).localeCompare(String(b.displayName || b.name || b.id)) || a.id.localeCompare(b.id);
    }).slice(0, Math.max(1, Number(limit) || 6));
  latestSuggestedRank = new Map(list.map((model, index) => [model.id, index]));
  return list;
}

export function suggestedModelRank(id) {
  return latestSuggestedRank.get(String(id || "")) ?? Number.POSITIVE_INFINITY;
}

export function isSuggestedModelId(id) {
  return latestSuggestedRank.has(String(id || ""));
}
