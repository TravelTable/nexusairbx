const DEFAULT_PLACE_ID_LIMIT = 80;

export function normalizeRobloxPlaceId(value, limit = DEFAULT_PLACE_ID_LIMIT) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim().slice(0, limit);
  return !normalized || normalized === "0" ? null : normalized;
}

export function isUsableRobloxPlaceId(value) {
  return normalizeRobloxPlaceId(value) !== null;
}
