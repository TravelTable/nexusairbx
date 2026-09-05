// Legacy compatibility export. Suggestions are calculated from the live catalog.
export const SUGGESTED_MODEL_IDS = Object.freeze([]);

let latestSuggestedRank = new Map();

const ECONOMY_MODEL_PATTERN = /\b(flash|mini|nano|haiku|lite|small|economy)\b/i;
const FLAGSHIP_CODING_PATTERNS = [
  /\bcodex\b/i,
  /claude-(?:fable|opus|sonnet)-(?:5|[6-9])(?:[.-]\d+)?/i,
  /gpt-(?:[6-9](?:\.\d+)?(?:-(?:astra|sol|codex|pro))?|5\.(?:3-codex|4(?:-pro)?|5(?:-pro)?|6-(?:astra|sol)))(?:$|[-/])/i,
  /gemini-(?:3(?:\.\d+)?|[4-9](?:\.\d+)?)-(?:pro|deep-think)/i,
  /grok-(?:4|[5-9])(?:\.\d+)?/i,
  /deepseek-(?:v(?:4|[5-9])|r(?:2|[3-9]))(?:$|[-/])/i,
];

export function isFlagshipCodingModel(model = {}) {
  const modelId = String(model.id || "").trim().toLowerCase();
  const identity = `${modelId} ${model.name || ""}`.trim().toLowerCase();
  const normalized = identity.replace(/[-_/]/g, " ");
  if (ECONOMY_MODEL_PATTERN.test(normalized)) return false;
  return FLAGSHIP_CODING_PATTERNS.some((pattern) => pattern.test(modelId));
}

function scoreModel(model) {
  if (!model?.id) return Number.NEGATIVE_INFINITY;
  if (
    model.status === "deprecated" ||
    model.availableToPaid === false ||
    model.pricingConfigured === false
  ) {
    return Number.NEGATIVE_INFINITY;
  }

  const id = `${model.id || ""} ${model.name || ""}`.toLowerCase();
  const uses = new Set((model.recommendedFor || []).map((value) => String(value).toLowerCase()));
  const capabilities = new Set((model.capabilities || []).map((value) => String(value).toLowerCase()));
  const codingSpecialist = /\b(code|coding|coder|codex|devstral|software)\b/i.test(
    id.replace(/[-_/]/g, " ")
  );
  const codingEvidence = uses.has("coding") || capabilities.has("coding") || codingSpecialist;
  if (!codingEvidence || !isFlagshipCodingModel(model)) return Number.NEGATIVE_INFINITY;

  // "Recommended" means strongest coding model, not newest or cheapest. The
  // server owns the main quality score; these signals keep older cached
  // catalogues aligned with the same coding-first contract.
  let score = Number(model.codingRecommendationScore ?? model.recommendationScore) || 0;
  if (uses.has("coding")) score += 20;
  if (capabilities.has("coding")) score += 10;
  if (codingSpecialist) score += 12;
  if (capabilities.has("reasoning") || uses.has("reasoning")) score += 8;
  if (capabilities.has("tools")) score += 8;
  if (model.recommended) score += 2;
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
