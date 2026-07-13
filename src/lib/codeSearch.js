const DEFAULT_MATCH_LIMIT = 10000;

export function findLiteralMatches(text, query, limit = DEFAULT_MATCH_LIMIT) {
  const source = String(text || "");
  const needle = String(query || "");
  const maxMatches = Number.isFinite(limit) && limit > 0
    ? Math.floor(limit)
    : DEFAULT_MATCH_LIMIT;

  if (!needle) return [];

  const sourceLower = source.toLowerCase();
  const needleLower = needle.toLowerCase();
  const matches = [];
  let fromIndex = 0;

  while (matches.length < maxMatches) {
    const start = sourceLower.indexOf(needleLower, fromIndex);
    if (start === -1) break;
    const end = start + needle.length;
    matches.push({ start, end });
    fromIndex = end;
  }

  return matches;
}

