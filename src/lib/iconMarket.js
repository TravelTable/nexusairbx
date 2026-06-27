export function isMacOsMetadataArtifact(icon = {}) {
  const tags = Array.isArray(icon.tags)
    ? icon.tags.map((tag) => String(tag).trim().toLowerCase())
    : [];
  if (tags.includes("__macosx")) return true;

  const name = String(icon.name || "").trim();
  if (name === ".DS_Store") return true;
  if (/^\.\s/.test(name) || /^\._/.test(name)) return true;
  return false;
}

export function isMarketplaceEligible(icon = {}) {
  if (!icon || typeof icon !== "object") return false;
  if (isMacOsMetadataArtifact(icon)) return false;
  if (!icon.imageUrl || !/^https?:\/\//i.test(String(icon.imageUrl))) return false;
  return true;
}

export function filterMarketplaceIcons(icons = []) {
  return icons.filter(isMarketplaceEligible);
}
