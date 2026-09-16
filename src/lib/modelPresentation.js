import { isCatalogModelAvailable, providerLabel } from "./modelProviders";
export { isCatalogModelAvailable } from "./modelProviders";

export const MODEL_SECTION_LABELS = Object.freeze({
  latest: "Latest",
  recommended: "Recommended",
  efficient: "Fast & Efficient",
  more: "More Models",
});
export const MODEL_SEARCH_THRESHOLD = 8;
export const DEFAULT_NEW_MODEL_DAYS = 30;
const BADGE_LABELS = new Set([
  "NEW", "FRONTIER", "RECOMMENDED", "BEST VALUE", "FAST", "LONG CONTEXT",
  "POPULAR", "TRENDING", "COMPLEX CODING", "DEEP REASONING", "ECONOMY",
]);

export function isRecentModel(model, { now = Date.now(), newBadgeDays = DEFAULT_NEW_MODEL_DAYS } = {}) {
  const timestamps = [model?.releasedAt, model?.majorUpdateAt]
    .map((value) => value ? Date.parse(value) : NaN).filter(Number.isFinite);
  const latest = timestamps.length ? Math.max(...timestamps) : NaN;
  return Number.isFinite(latest) && latest <= now && now - latest < Math.max(0, newBadgeDays) * 86_400_000;
}

export function modelBadges(model, options) {
  const badges = (Array.isArray(model.badges) ? model.badges : [])
    .map((badge) => String(badge).toUpperCase()).filter((badge) => BADGE_LABELS.has(badge) && badge !== "NEW");
  // Never let cached NEW flags or a permanent curated badge outlive its date.
  if (isRecentModel(model, options)) badges.unshift("NEW");
  if (model.recommended && !badges.includes("RECOMMENDED")) badges.push("RECOMMENDED");
  return [...new Set(badges)].slice(0, 2);
}

function capabilities(model) {
  return Array.isArray(model.capabilities) ? model.capabilities : [];
}

export function modelCreditUsage(model) {
  const labels = { low: "Low", medium: "Medium", high: "High", "very-high": "Very high" };
  const level = model?.creditUsage?.level;
  return labels[level] ? { level, label: labels[level] } : { level: "unknown", label: "Estimate on request" };
}

export function presentModel(model, options) {
  const badges = modelBadges(model, options);
  const isNew = badges.includes("NEW");
  const hasSection = Object.prototype.hasOwnProperty.call(MODEL_SECTION_LABELS, model.section);
  let section = hasSection ? model.section : "more";
  // A recent model remains in More Models unless Nexus has evidence to feature it.
  if (section === "latest" && !isNew) section = model.recommended ? "recommended" : "more";
  if (!hasSection && model.isFeatured && isNew) section = "latest";
  if (!model.section && model.recommended) section = "recommended";
  const contextWindow = Number(model.contextWindow || model.contextLength) || null;
  const strengths = Array.isArray(model.strengths) ? model.strengths.filter((value) => typeof value === "string") : [];
  return {
    ...model,
    name: model.displayName || model.name || model.id,
    description: model.description || strengths.slice(0, 2).join(" · ") || "Available for your next request",
    badges, section, contextWindow, strengths,
    creditUsage: modelCreditUsage(model),
    searchableText: [model.displayName, model.name, model.id, model.provider, providerLabel(model.provider),
      model.description, ...strengths, ...capabilities(model)].filter(Boolean).join(" ").toLowerCase(),
  };
}

export function matchesModelFilter(model, { query = "", filter = "all", provider = "all" } = {}) {
  if (query && !model.searchableText.includes(query.trim().toLowerCase())) return false;
  if (provider !== "all" && model.provider !== provider) return false;
  if (filter === "recommended") return model.recommended || model.section === "recommended" || model.badges.includes("RECOMMENDED");
  if (filter === "latest") return model.badges.includes("NEW");
  if (filter === "low") return model.creditUsage.level === "low";
  if (filter === "fast") return model.badges.includes("FAST") || model.characteristics?.speed >= 0.8;
  if (filter === "context") return model.contextWindow >= 200_000;
  return true;
}

/** Server rankings are the authority; the client only orders and groups rows. */
export function createModelSections(models = [], options = {}) {
  const { query, filter, provider, rankBy } = options;
  const seen = new Set();
  const list = models.filter(isCatalogModelAvailable).filter((model) => {
    if (seen.has(model.id)) return false;
    seen.add(model.id);
    return true;
  }).map((model) => presentModel(model, options))
    .filter((model) => matchesModelFilter(model, { query, filter, provider }))
    .sort((a, b) => {
      const sectionOrder = Object.keys(MODEL_SECTION_LABELS);
      const sectionDifference = sectionOrder.indexOf(a.section) - sectionOrder.indexOf(b.section);
      if (sectionDifference) return sectionDifference;
      if (!rankBy && a.section === "latest" && b.section === "latest") {
        const latest = (model) => Math.max(Date.parse(model.releasedAt) || 0, Date.parse(model.majorUpdateAt) || 0);
        const recency = latest(b) - latest(a);
        if (recency) return recency;
      }
      const dimension = rankBy || (a.section === "efficient" && b.section === "efficient" ? "bestValue" : "overall");
      const difference = (Number(b.rankings?.[dimension]) || 0) - (Number(a.rankings?.[dimension]) || 0);
      return difference || a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
    });
  return Object.entries(MODEL_SECTION_LABELS).map(([id, label]) => ({
    id, label, models: list.filter((model) => model.section === id),
  })).filter((section) => section.models.length);
}

export function formatContextWindow(value) {
  const size = Number(value);
  if (!(size > 0)) return "Not published";
  return size >= 1_000_000 ? `${Number((size / 1_000_000).toFixed(1))}M tokens` : `${Math.round(size / 1_000)}K tokens`;
}
