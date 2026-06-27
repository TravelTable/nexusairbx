const PREFERRED_ORIGIN = "https://www.nexusrbx.com";
const MIN_RELATED_ICONS = 2;
const MIN_DESCRIPTION_LENGTH = 40;
const MIN_INDEXABLE_CATEGORY_ICONS = 8;
const MAX_RELATED_NAVIGATION_CANDIDATES = 12;

const ICON_INDEXABILITY_RULES = Object.freeze({
  stablePublicId: "stable public ID and URL",
  publicVisibility: "public visibility",
  accessibleImage: "accessible absolute image URL",
  usefulName: "unique useful name",
  usefulDescription: "useful description",
  category: "category",
  style: "style information",
  relatedNavigation: "related icons or meaningful navigation",
  canonical: "single canonical URL",
  moderation: "no deletion or moderation restriction",
});

function text(value) {
  return String(value || "").trim();
}

function cleanIconName(name) {
  return text(name)
    .replace(/^[-_.\s]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function canonicalIconPath(id) {
  return `/icons/${encodeURIComponent(text(id))}`;
}

function canonicalIconUrl(id) {
  return `${PREFERRED_ORIGIN}${canonicalIconPath(id)}`;
}

function isStablePublicId(id) {
  return /^[A-Za-z0-9_-]{8,}$/.test(text(id));
}

function isPublicIcon(icon = {}) {
  if (icon.visibility && icon.visibility !== "public") return false;
  if (icon.status && !["public", "published", "active", "approved"].includes(String(icon.status).toLowerCase())) return false;
  if (icon.isPublic === false || icon.public === false || icon.private === true || icon.isPrivate === true) return false;
  if (icon.ownerOnly === true || icon.unlisted === true) return false;
  return true;
}

function isDeletedOrRestricted(icon = {}) {
  if (icon.deleted || icon.isDeleted || icon.deletedAt || icon.removedAt) return true;
  if (icon.moderationRestricted || icon.moderationBlocked || icon.blocked || icon.hidden) return true;
  const moderation = String(icon.moderationStatus || icon.reviewStatus || "").toLowerCase();
  return ["rejected", "blocked", "removed", "deleted", "quarantined"].includes(moderation);
}

function isAccessibleImageUrl(imageUrl) {
  try {
    const url = new URL(text(imageUrl));
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function isUsefulName(name) {
  const cleaned = cleanIconName(name);
  if (cleaned.length < 3) return false;
  if (/^(icon|image|asset|untitled|new icon|roblox icon|ui icon)$/i.test(cleaned)) return false;
  return /[a-z0-9]/i.test(cleaned);
}

function buildIconDescription(icon = {}) {
  const explicit = text(icon.description || icon.summary || icon.caption || icon.altText);
  if (explicit.length >= MIN_DESCRIPTION_LENGTH) return explicit;

  const name = cleanIconName(icon.name);
  const category = text(icon.category) || "Roblox";
  const style = text(icon.style) || "game";
  if (!name || !category || !style) return "";
  return `${name} is a ${style} ${category} icon for Roblox UI, inventory, HUD, and in-game interface work in NexusRBX.`;
}

function normalizedNameKey(name) {
  return cleanIconName(name)
    .toLowerCase()
    .replace(/\b(icon|image|asset)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isUsefulDescription(icon = {}) {
  const description = buildIconDescription(icon);
  if (description.length < MIN_DESCRIPTION_LENGTH) return false;
  if (/^(icon|image|asset)$/i.test(description)) return false;
  return /[a-z0-9]/i.test(description);
}

function isRelatedNavigationCandidate(icon = {}) {
  return isStablePublicId(icon.id)
    && isPublicIcon(icon)
    && !isDeletedOrRestricted(icon)
    && isAccessibleImageUrl(icon.imageUrl)
    && isUsefulName(icon.name)
    && Boolean(text(icon.category) || text(icon.style));
}

function meaningfulRelatedIcons(icon, allIcons = []) {
  const category = text(icon.category).toLowerCase();
  const style = text(icon.style).toLowerCase();
  return allIcons
    .filter((candidate) => candidate && candidate.id !== icon.id)
    .filter(isRelatedNavigationCandidate)
    .filter((candidate) => {
      const candidateCategory = text(candidate.category).toLowerCase();
      const candidateStyle = text(candidate.style).toLowerCase();
      return (category && candidateCategory === category) || (style && candidateStyle === style);
    })
    .sort((a, b) => cleanIconName(a.name).localeCompare(cleanIconName(b.name)) || text(a.id).localeCompare(text(b.id)));
}

function buildRelatedIconMap(icons = []) {
  const byCategory = new Map();
  const byStyle = new Map();

  for (const icon of icons) {
    if (!isRelatedNavigationCandidate(icon)) continue;
    const category = text(icon.category).toLowerCase();
    const style = text(icon.style).toLowerCase();
    if (category) {
      if (!byCategory.has(category)) byCategory.set(category, []);
      byCategory.get(category).push(icon);
    }
    if (style) {
      if (!byStyle.has(style)) byStyle.set(style, []);
      byStyle.get(style).push(icon);
    }
  }

  const sortIconList = (items) => items.sort((a, b) => cleanIconName(a.name).localeCompare(cleanIconName(b.name)) || text(a.id).localeCompare(text(b.id)));
  for (const items of byCategory.values()) sortIconList(items);
  for (const items of byStyle.values()) sortIconList(items);

  const relatedById = new Map();
  for (const icon of icons) {
    const related = new Map();
    const category = text(icon.category).toLowerCase();
    const style = text(icon.style).toLowerCase();
    const addCandidates = (candidates = []) => {
      for (const candidate of candidates) {
        if (related.size >= MAX_RELATED_NAVIGATION_CANDIDATES) break;
        if (candidate.id !== icon.id) related.set(text(candidate.id), candidate);
      }
    };
    addCandidates(byCategory.get(category));
    addCandidates(byStyle.get(style));
    relatedById.set(text(icon.id), [...related.values()]);
  }
  return relatedById;
}

function iconLastmod(icon = {}) {
  const raw = icon.updatedAt || icon.modifiedAt || icon.publishedAt || icon.createdAt;
  const value = typeof raw === "number" ? raw : Number(raw);
  const date = Number.isFinite(value) ? new Date(value) : raw ? new Date(raw) : null;
  if (!date || Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function publicIconRecord(icon, allIcons = [], relatedIcons = null) {
  const related = (relatedIcons || meaningfulRelatedIcons(icon, allIcons)).slice(0, 6);
  return {
    id: text(icon.id),
    name: cleanIconName(icon.name),
    description: buildIconDescription(icon),
    category: text(icon.category),
    style: text(icon.style),
    imageUrl: text(icon.imageUrl),
    tags: Array.isArray(icon.tags) ? icon.tags.map(text).filter(Boolean).sort() : [],
    lastmod: iconLastmod(icon),
    canonical: canonicalIconUrl(icon.id),
    path: canonicalIconPath(icon.id),
    relatedIcons: related.map((item) => ({
      id: text(item.id),
      name: cleanIconName(item.name),
      path: canonicalIconPath(item.id),
      imageUrl: text(item.imageUrl),
    })),
  };
}

function evaluateIconIndexability(icon = {}, allIcons = [], relatedIcons = null) {
  const reasons = [];
  const related = relatedIcons || meaningfulRelatedIcons(icon, allIcons);

  if (!isStablePublicId(icon.id)) reasons.push("unstable_id");
  if (!isPublicIcon(icon)) reasons.push("not_public");
  if (isDeletedOrRestricted(icon)) reasons.push("deleted_or_restricted");
  if (!isAccessibleImageUrl(icon.imageUrl)) reasons.push("missing_accessible_image");
  if (!isUsefulName(icon.name)) reasons.push("thin_or_duplicate_name");
  if (!text(icon.category)) reasons.push("missing_category");
  if (!text(icon.style)) reasons.push("missing_style");
  if (!isUsefulDescription(icon)) reasons.push("missing_useful_description");
  if (related.length < MIN_RELATED_ICONS) reasons.push("insufficient_related_navigation");

  return {
    indexable: reasons.length === 0,
    reasons,
    icon: reasons.length === 0 ? publicIconRecord(icon, allIcons, related) : null,
  };
}

function buildIconQualityReport(icons = []) {
  const sorted = [...icons].filter(Boolean).sort((a, b) => text(a.id).localeCompare(text(b.id)));
  const relatedById = buildRelatedIconMap(sorted);
  const seenCanonicals = new Set();
  const seenNameKeys = new Set();
  const qualifiedSources = [];
  const excluded = [];

  for (const icon of sorted) {
    const evaluation = evaluateIconIndexability(icon, sorted, relatedById.get(text(icon.id)) || []);
    const canonical = icon?.id ? canonicalIconUrl(icon.id) : "";
    const nameKey = normalizedNameKey(icon?.name);
    if (evaluation.indexable && seenCanonicals.has(canonical)) {
      evaluation.indexable = false;
      evaluation.reasons.push("duplicate_canonical");
      evaluation.icon = null;
    }
    if (evaluation.indexable && nameKey && seenNameKeys.has(nameKey)) {
      evaluation.indexable = false;
      evaluation.reasons.push("thin_or_duplicate_name");
      evaluation.icon = null;
    }

    if (evaluation.indexable) {
      seenCanonicals.add(canonical);
      if (nameKey) seenNameKeys.add(nameKey);
      qualifiedSources.push(icon);
    } else {
      excluded.push({
        id: text(icon?.id) || "(missing id)",
        name: cleanIconName(icon?.name),
        reasons: evaluation.reasons,
      });
    }
  }

  const finalRelatedById = buildRelatedIconMap(qualifiedSources);
  const qualified = [];
  for (const icon of qualifiedSources) {
    const related = finalRelatedById.get(text(icon.id)) || [];
    if (related.length < MIN_RELATED_ICONS) {
      excluded.push({
        id: text(icon?.id) || "(missing id)",
        name: cleanIconName(icon?.name),
        reasons: ["insufficient_related_navigation"],
      });
      continue;
    }
    qualified.push(publicIconRecord(icon, qualifiedSources, related));
  }

  const exclusionCounts = excluded.reduce((acc, item) => {
    for (const reason of item.reasons) acc[reason] = (acc[reason] || 0) + 1;
    return acc;
  }, {});

  return {
    qualified,
    excluded,
    exclusionCounts,
    totals: {
      input: sorted.length,
      qualified: qualified.length,
      excluded: excluded.length,
    },
  };
}

function iconRouteStatusFromRecord(icon, allIcons = []) {
  if (!icon) return "missing";
  if (isDeletedOrRestricted(icon)) return "gone";
  return evaluateIconIndexability(icon, allIcons).indexable ? "indexable" : "noindex";
}

function buildMarketplaceCategoryReport(qualifiedIcons = []) {
  const counts = new Map();
  for (const icon of qualifiedIcons) {
    const category = text(icon.category);
    if (!category) continue;
    counts.set(category, (counts.get(category) || 0) + 1);
  }

  const indexable = [];
  const excluded = [];
  [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0])).forEach(([category, count]) => {
    const item = { category, count };
    if (count >= MIN_INDEXABLE_CATEGORY_ICONS) indexable.push(item);
    else excluded.push({ ...item, reason: "insufficient_qualified_inventory" });
  });

  return { indexable, excluded };
}

function marketplaceFilterIndexability(filters = {}, qualifiedIcons = []) {
  const activeFilters = Object.entries(filters)
    .filter(([, value]) => value != null && String(value).trim() !== "");
  if (activeFilters.length === 0) {
    return { indexable: false, reason: "marketplace_index_is_application_route" };
  }
  if (activeFilters.length > 1 || filters.query || filters.search || filters.style || filters.page) {
    return { indexable: false, reason: "filter_permutation" };
  }
  if (!filters.category) return { indexable: false, reason: "filter_permutation" };

  const normalizedCategory = text(filters.category).toLowerCase();
  const count = qualifiedIcons.filter((icon) => text(icon.category).toLowerCase() === normalizedCategory).length;
  return count >= MIN_INDEXABLE_CATEGORY_ICONS
    ? { indexable: true, reason: "qualified_category", count }
    : { indexable: false, reason: "insufficient_qualified_inventory", count };
}

module.exports = {
  ICON_INDEXABILITY_RULES,
  MIN_INDEXABLE_CATEGORY_ICONS,
  MIN_RELATED_ICONS,
  MAX_RELATED_NAVIGATION_CANDIDATES,
  PREFERRED_ORIGIN,
  buildIconDescription,
  buildIconQualityReport,
  buildMarketplaceCategoryReport,
  buildRelatedIconMap,
  canonicalIconPath,
  canonicalIconUrl,
  cleanIconName,
  evaluateIconIndexability,
  iconRouteStatusFromRecord,
  iconLastmod,
  isDeletedOrRestricted,
  marketplaceFilterIndexability,
  publicIconRecord,
};
