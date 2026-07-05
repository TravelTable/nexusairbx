export function normalizeSelectedExampleIds(value, { maxIds = 12 } = {}) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const normalized = [];
  value.forEach((item) => {
    const id = String(item || "").trim().toLowerCase();
    if (!id || seen.has(id)) return;
    seen.add(id);
    normalized.push(id.slice(0, 120));
  });
  return normalized.slice(0, maxIds);
}

export function buildExampleContextRequest(source = {}) {
  return {
    useExamples: Boolean(source?.useExamples),
    selectedExampleIds: normalizeSelectedExampleIds(source?.selectedExampleIds),
  };
}
