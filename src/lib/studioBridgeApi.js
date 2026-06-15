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

export async function applyArtifactToStudio({ artifact, sessionId = null, studioPreconditions = [] }) {
  const res = await authedFetch("/api/studio/apply-artifact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ artifact, sessionId, studioPreconditions }),
  });
  return readJsonOrThrow(res, "Failed to apply artifact to Studio");
}

export async function getStudioCommand(commandId) {
  const res = await authedFetch(`/api/studio/commands/${encodeURIComponent(commandId)}`, {
    method: "GET",
    noCache: true,
  });
  return readJsonOrThrow(res, "Failed to load Studio command");
}

export async function getStudioTools() {
  const res = await authedFetch("/api/studio/tools", { method: "GET", noCache: true });
  return readJsonOrThrow(res, "Failed to load Studio tools");
}

export async function getStudioManifest({ sessionId = null, placeId = null, limit = 500, cursor = "" } = {}) {
  const params = new URLSearchParams();
  if (sessionId) params.set("sessionId", sessionId);
  if (placeId) params.set("placeId", placeId);
  if (limit) params.set("limit", String(limit));
  if (cursor) params.set("cursor", cursor);
  const query = params.toString();
  const res = await authedFetch(`/api/studio/manifest${query ? `?${query}` : ""}`, {
    method: "GET",
    noCache: true,
  });
  return readJsonOrThrow(res, "Failed to load Studio manifest");
}

export async function queueStudioTool({ type, payload = {}, sessionId = null, label = "", applyMode = "manual_review", runId = null, stepId = null }) {
  const res = await authedFetch("/api/studio/tools/queue", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, payload, sessionId, label, applyMode, runId, stepId }),
  });
  return readJsonOrThrow(res, "Failed to queue Studio tool");
}

/** @deprecated Legacy Studio Agent panel — use unified agent run + restoreAgentRun instead. */
export async function startStudioAgent({ goal, chatId = null, sessionId = null }) {
  const res = await authedFetch("/api/studio/agent/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ goal, chatId, sessionId }),
  });
  return readJsonOrThrow(res, "Failed to start Studio agent");
}

/** @deprecated Legacy Studio Agent panel */
export async function getStudioAgentRun(runId) {
  const res = await authedFetch(`/api/studio/agent/${encodeURIComponent(runId)}`, {
    method: "GET",
    noCache: true,
  });
  return readJsonOrThrow(res, "Failed to load Studio agent run");
}

/** @deprecated Legacy Studio Agent panel */
export async function continueStudioAgent(runId) {
  const res = await authedFetch(`/api/studio/agent/${encodeURIComponent(runId)}/continue`, {
    method: "POST",
  });
  return readJsonOrThrow(res, "Failed to continue Studio agent");
}

/** @deprecated Prefer restoreAgentRun from workflowApi for unified runs */
export async function restoreStudioAgent(runId) {
  const res = await authedFetch(`/api/studio/agent/${encodeURIComponent(runId)}/restore`, {
    method: "POST",
  });
  return readJsonOrThrow(res, "Failed to restore Studio snapshots");
}
