import { authedFetch } from "./billing";
import { withApiRetryCooldown } from "./apiErrors";

const ACTIVE_AGENTS_COOLDOWN_KEY = "agent-runtime-v2:active-agents";
const AGENT_EVENTS_COOLDOWN_KEY = "agent-runtime-v2:events";
const AGENT_POLL_RETRY_MS = 30_000;

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
    error.requestId = res.headers?.get?.("x-request-id") || null;
    error.deploymentId = res.headers?.get?.("x-nexus-deployment")
      || res.headers?.get?.("x-deployment-id")
      || res.headers?.get?.("x-vercel-id")
      || null;
    throw error;
  }
  return payload;
}

function abortError() {
  const error = new Error("The operation was aborted.");
  error.name = "AbortError";
  return error;
}

function waitForPoll(delayMs, signal) {
  if (signal?.aborted) return Promise.reject(abortError());
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener?.("abort", onAbort);
      resolve();
    }, delayMs);
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortError());
    };
    signal?.addEventListener?.("abort", onAbort, { once: true });
  });
}

async function reconcileChatOperation(payload, { signal = null, attempts = 40 } = {}) {
  const initial = payload?.operation;
  if (!initial || initial.status !== "in_progress" || !initial.operationId) return payload;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    await waitForPoll(Math.min(250 + (attempt * 100), 1_000), signal);
    const statusPayload = await request(
      `/api/ai/operations/${encodeURIComponent(initial.operationId)}`,
      { method: "GET", noCache: true, ...(signal ? { signal } : {}) }
    );
    const operation = statusPayload?.operation;
    if (operation?.status === "completed") {
      return operation.result?.body ?? operation.result ?? statusPayload;
    }
    if (operation?.status === "failed" || operation?.status === "cancelled") {
      const error = new Error(operation.error?.message || "The operation did not complete.");
      error.code = operation.error?.code || "OPERATION_FAILED";
      error.status = operation.httpStatus || null;
      throw error;
    }
  }

  const error = new Error("The operation is still running. Its status can be recovered safely.");
  error.code = "OPERATION_RECONCILIATION_TIMEOUT";
  throw error;
}

let runtimeCapabilitiesCache = null;
let runtimeCapabilitiesPromise = null;
const RUNTIME_CAPABILITIES_TTL_MS = 30_000;

export async function getRuntimeCapabilitiesV2({ force = false } = {}) {
  const currentTime = Date.now();
  if (!force && runtimeCapabilitiesCache?.expiresAt > currentTime) {
    return runtimeCapabilitiesCache.value;
  }
  if (!force && runtimeCapabilitiesPromise) return runtimeCapabilitiesPromise;
  runtimeCapabilitiesPromise = request("/api/v2/runtime-capabilities", {
    method: "GET",
    noCache: force,
  }).then((value) => {
    runtimeCapabilitiesCache = {
      value,
      expiresAt: Date.now() + RUNTIME_CAPABILITIES_TTL_MS,
    };
    return value;
  }).finally(() => {
    runtimeCapabilitiesPromise = null;
  });
  return runtimeCapabilitiesPromise;
}

export function selectAgentRuntimeRoute(capabilities, { projectId = null } = {}) {
  if (!capabilities) return "unknown";
  const canonical = capabilities.executionOwner === "canonical_task_runtime"
    && capabilities.canonicalAgentRuns?.enabled === true;
  if (!canonical) return "legacy";
  if (capabilities.canonicalAgentRuns?.requiresProject === true && !String(projectId || "").trim()) {
    return "legacy";
  }
  return "canonical";
}

export function createAgentV2({ chatId, projectId = null, idempotencyKey }) {
  return request("/api/v2/agents", {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey || `agent-${chatId}` },
    body: JSON.stringify({ chatId, projectId: projectId || null }),
  });
}

export function resolveAgentProjectionV2({ chatId, projectId = null }) {
  return request(`/api/v2/chats/${encodeURIComponent(chatId)}/agent-projection`, {
    method: "PUT",
    body: JSON.stringify({ projectId: projectId || null }),
  });
}

export async function createAgentRunV2({
  chatId,
  agentId,
  idempotencyKey,
  signal = null,
  ...body
}) {
  const serializedBody = { ...body, ...(chatId ? { chatId } : {}) };
  delete serializedBody.studioSessionId;
  delete serializedBody.studioConnectionType;

  const payload = await request(
    `/api/v2/agents/${encodeURIComponent(agentId)}/runs`,
    {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
      ...(signal ? { signal } : {}),
      body: JSON.stringify(serializedBody),
    }
  );
  return reconcileChatOperation(payload, { signal });
}

export function getActiveAgentsV2() {
  return withApiRetryCooldown(
    ACTIVE_AGENTS_COOLDOWN_KEY,
    "Agent status is temporarily unavailable.",
    () => request("/api/v2/agents", { method: "GET", noCache: true }),
    { fallbackMs: AGENT_POLL_RETRY_MS }
  );
}

export function getAgentEventsV2(afterSequence = 0) {
  return withApiRetryCooldown(
    AGENT_EVENTS_COOLDOWN_KEY,
    "Agent updates are temporarily unavailable.",
    () => request(`/api/v2/events?afterSequence=${encodeURIComponent(afterSequence)}`, {
      method: "GET",
      noCache: true,
    }),
    { fallbackMs: AGENT_POLL_RETRY_MS }
  );
}

export function getAgentV2(agentId) {
  return request(`/api/v2/agents/${encodeURIComponent(agentId)}`, {
    method: "GET",
    noCache: true,
  });
}

export function getAgentRunV2(runId) {
  return request(`/api/v2/runs/${encodeURIComponent(runId)}`, {
    method: "GET",
    noCache: true,
  });
}

export async function resolveChatAgentProjectionV2({
  chatId,
  projectId = null,
  storedAgentId = null,
  allowLegacyCreate = false,
}) {
  const desiredProjectId = String(projectId || "").trim() || null;
  const candidateAgentId = String(storedAgentId || "").trim() || null;
  if (candidateAgentId) {
    try {
      const stored = normalizeAgentProjection(await getAgentV2(candidateAgentId));
      const storedProjectId = String(stored?.projectId || "").trim() || null;
      if (stored?.chatId === chatId && (!desiredProjectId || storedProjectId === desiredProjectId)) {
        return { agent: stored, resolution: "stored", replayed: true };
      }
    } catch (error) {
      // Missing or foreign projections are stale chat metadata. Authentication,
      // availability, and other ambiguous failures must remain visible.
      if (error?.status !== 404) throw error;
    }
  }

  try {
    return await resolveAgentProjectionV2({ chatId, projectId: desiredProjectId });
  } catch (error) {
    // Temporary compatibility for a frontend-first rollout. Once every backend
    // exposes the natural-identity resolver, callers can remove this branch.
    if (!allowLegacyCreate || !(error instanceof AgentRuntimeUnavailableError)) throw error;
    return createAgentV2({
      chatId,
      projectId: desiredProjectId,
      idempotencyKey: `agent-${chatId}`,
    });
  }
}

export async function cancelAgentRunV2(runId, {
  reason = "user_cancelled",
  idempotencyKey,
  chatId = null,
} = {}) {
  const cancelKey = idempotencyKey || `cancel-${runId}`;
  const payload = await request(`/api/v2/runs/${encodeURIComponent(runId)}/cancel`, {
    method: "POST",
    headers: { "Idempotency-Key": cancelKey },
    body: JSON.stringify({ reason, ...(chatId ? { chatId } : {}) }),
  });
  return reconcileChatOperation(payload);
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
