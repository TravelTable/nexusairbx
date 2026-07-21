import { authedFetch } from "./billing";

export const ACTIVE_AGENT_STATES = new Set([
  "active",
  "in_progress",
  "running",
  "queued",
  "planning",
  "waiting_user",
  "waiting_studio",
  "awaiting_studio_target",
  "awaiting_approval",
  "waiting_external",
  "reconnecting",
  "verifying",
]);

export const TERMINAL_AGENT_STATES = new Set([
  "completed",
  "failed",
  "cancelled",
]);

export class AgentRuntimeUnavailableError extends Error {
  constructor(message = "Agent runtime v2 is unavailable") {
    super(message);
    this.name = "AgentRuntimeUnavailableError";
    this.code = "agent_runtime_v2_unavailable";
  }
}

async function readJson(res) {
  const text = await res.text().catch(() => "");
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (_) {
    return { message: text };
  }
}

async function request(path, init = {}) {
  const res = await authedFetch(path, {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers || {}),
    },
  });
  const payload = await readJson(res);
  // A 404 can describe a missing/foreign agent, run, or project. Those are
  // valid v2 responses and must not make the client disable the whole runtime.
  // Only an unstructured 404 is treated as evidence that the v2 endpoint itself
  // is unavailable (for compatibility with older backend deployments).
  if (res.status === 501 || (res.status === 404 && !payload?.code)) {
    throw new AgentRuntimeUnavailableError(payload?.message);
  }
  if (!res.ok) {
    const error = new Error(payload?.message || payload?.error || `Agent runtime request failed (${res.status})`);
    error.status = res.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

export function createAgentV2({ chatId, projectId = null, idempotencyKey }) {
  return request("/api/v2/agents", {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey || `agent-${chatId}` },
    body: JSON.stringify({ chatId, projectId: projectId || null }),
  });
}

export function createAgentRunV2({ chatId, agentId, idempotencyKey, ...body }) {
  return request(
    `/api/v2/agents/${encodeURIComponent(agentId)}/runs`,
    {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
      body: JSON.stringify(body),
    }
  );
}

export function getActiveAgentsV2() {
  return request("/api/v2/agents", { method: "GET", noCache: true });
}

export function getAgentEventsV2(afterSequence = 0) {
  return request(`/api/v2/events?afterSequence=${encodeURIComponent(afterSequence)}`, {
    method: "GET",
    noCache: true,
  });
}

export function getAgentV2(agentId) {
  return request(`/api/v2/agents/${encodeURIComponent(agentId)}`, {
    method: "GET",
    noCache: true,
  });
}

export function cancelAgentRunV2(runId, { reason = "user_cancelled", idempotencyKey } = {}) {
  const cancelKey = idempotencyKey || `cancel-${runId}`;
  return request(`/api/v2/runs/${encodeURIComponent(runId)}/cancel`, {
    method: "POST",
    headers: { "Idempotency-Key": cancelKey },
    body: JSON.stringify({ reason }),
  });
}

function unwrapAgentProjection(value) {
  return value?.agent
    || value?.projection
    || value?.payload?.agent
    || value?.payload?.projection
    || value?.payload
    || value?.data?.agent
    || value?.data?.projection
    || value?.data
    || value
    || {};
}

export function normalizeAgentProjection(value) {
  const source = unwrapAgentProjection(value);
  const agentId = source.agentId || source.agent_id || source.id;
  if (!agentId) return null;
  const runs = source.runs || source.activeRuns || [];
  return {
    ...source,
    id: agentId,
    agentId,
    chatId: source.chatId || source.chat_id || source.chat?.id || null,
    title: source.title || source.chatTitle || source.chat?.title || "Untitled agent",
    status: String(source.status || source.state || "idle").toLowerCase(),
    runs: Array.isArray(runs) ? runs : [],
  };
}

export function extractAgentList(payload) {
  const list = payload?.agents
    || payload?.activeAgents
    || payload?.items
    || payload?.data?.agents
    || payload?.data?.activeAgents
    || payload?.data?.items
    || [];
  const agents = (Array.isArray(list) ? list : []).map(normalizeAgentProjection).filter(Boolean);
  const topLevelRuns = payload?.runs || payload?.data?.runs || [];
  if (!Array.isArray(topLevelRuns) || !topLevelRuns.length) return agents;

  const runsByAgent = new Map();
  topLevelRuns.forEach((run) => {
    const agentId = run?.agentId || run?.agent_id;
    if (!agentId) return;
    const current = runsByAgent.get(agentId) || [];
    current.push(run);
    runsByAgent.set(agentId, current);
  });

  return agents.map((agent) => {
    const attached = runsByAgent.get(agent.agentId) || [];
    if (!attached.length) return agent;
    const runs = new Map((agent.runs || []).map((run) => [run.runId || run.id, run]));
    attached.forEach((run) => runs.set(run.runId || run.id, run));
    return { ...agent, runs: Array.from(runs.values()) };
  });
}

export function extractAgentEvents(payload) {
  const events = payload?.events || payload?.items || payload?.data?.events || payload?.data?.items || [];
  return Array.isArray(events) ? events : [];
}

export function mergeAgentEvents(currentAgents, events) {
  const map = new Map((currentAgents || []).map((agent) => [agent.agentId || agent.id, agent]));
  for (const event of events || []) {
    const source = unwrapAgentProjection(event);
    const projection = normalizeAgentProjection(event);
    if (!projection) continue;
    const update = { ...projection };
    if (!("chatId" in source) && !("chat_id" in source) && !source.chat?.id) delete update.chatId;
    if (!("title" in source) && !("chatTitle" in source) && !source.chat?.title) delete update.title;
    if (!("runs" in source) && !("activeRuns" in source)) delete update.runs;
    if (!("status" in source) && !("state" in source)) delete update.status;
    map.set(projection.agentId, { ...(map.get(projection.agentId) || {}), ...update });
  }
  return Array.from(map.values());
}
