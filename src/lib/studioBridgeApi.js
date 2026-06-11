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

export async function startStudioPairing() {
  const res = await authedFetch("/api/studio/pair/start", { method: "POST" });
  return readJsonOrThrow(res, "Failed to start Studio pairing");
}

export async function getStudioStatus() {
  const res = await authedFetch("/api/studio/status", { method: "GET", noCache: true });
  return readJsonOrThrow(res, "Failed to load Studio status");
}

export async function pushToStudio({ payload, applyMode = "manual_review", sessionId = null }) {
  const res = await authedFetch("/api/studio/push", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payload, applyMode, sessionId }),
  });
  return readJsonOrThrow(res, "Failed to push to Studio");
}

export async function getStudioCommand(commandId) {
  const res = await authedFetch(`/api/studio/commands/${encodeURIComponent(commandId)}`, {
    method: "GET",
    noCache: true,
  });
  return readJsonOrThrow(res, "Failed to load Studio command");
}
