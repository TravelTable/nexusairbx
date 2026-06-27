const DEFAULT_PRERENDER_ICON_LIMIT = 150;

function prerenderIconLimit() {
  const parsed = Number(process.env.PRERENDER_ICON_LIMIT || DEFAULT_PRERENDER_ICON_LIMIT);
  if (!Number.isFinite(parsed) || parsed < 0) return DEFAULT_PRERENDER_ICON_LIMIT;
  return Math.floor(parsed);
}

function selectPrerenderIcons(icons = [], limit = prerenderIconLimit()) {
  if (!Array.isArray(icons) || limit <= 0) return [];
  return icons.slice(0, limit);
}

function isPrerenderedIconId(id, icons = [], limit = prerenderIconLimit()) {
  const normalized = String(id || "").trim();
  if (!normalized) return false;
  return selectPrerenderIcons(icons, limit).some((icon) => icon.id === normalized);
}

module.exports = {
  DEFAULT_PRERENDER_ICON_LIMIT,
  isPrerenderedIconId,
  prerenderIconLimit,
  selectPrerenderIcons,
};
