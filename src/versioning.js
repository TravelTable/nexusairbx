// Canonical version shape for the FE

export function normalizeServerVersion(v = {}) {
  const createdAtMs =
    typeof v.createdAt === "number"
      ? v.createdAt
      : Date.parse(v.createdAt ?? "") || Date.now();
  return {
    id: String(v.id ?? v.versionId ?? cryptoRandomId()),
    projectId: String(v.projectId ?? ""),
    title: String(v.title ?? "Script"),
    explanation: String(v.explanation ?? ""),
    code: String(v.code ?? ""),
    versionNumber: Number(v.versionNumber ?? v.version ?? 1), // canonical
    createdAtMs,
  };
}

export function sortDesc(a, b) {
  return (b.versionNumber || 0) - (a.versionNumber || 0);
}

export function nextVersionNumber(history = []) {
  if (!Array.isArray(history) || history.length === 0) return 1;
  const max = Math.max(...history.map(v => Number(v.versionNumber || 0)));
  return Number.isFinite(max) ? max + 1 : 1;
}

export function cryptoRandomId() {
  if (typeof self !== "undefined" && self.crypto?.randomUUID) {
    return self.crypto.randomUUID();
  }
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 10);
}
