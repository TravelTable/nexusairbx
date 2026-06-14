import { authedFetch } from "./billing";

async function readJsonOrThrow(res, fallbackMessage) {
  const text = await res.text().catch(() => "");
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (_) {
    data = null;
  }
  if (!res.ok) {
    throw new Error(data?.error || text || fallbackMessage);
  }
  return data || {};
}

export async function saveWorkspaceArtifact(snapshot, source = "workspace") {
  const res = await authedFetch("/api/artifacts/workspace", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...(snapshot || {}), source }),
  });
  return readJsonOrThrow(res, "Failed to save workspace artifact");
}

export async function getWorkspaceArtifact(artifactId) {
  const res = await authedFetch(`/api/artifacts/workspace/${encodeURIComponent(artifactId)}`, {
    method: "GET",
    noCache: true,
  });
  return readJsonOrThrow(res, "Failed to load workspace artifact");
}
