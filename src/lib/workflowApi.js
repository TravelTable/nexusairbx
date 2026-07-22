import { authedFetch } from "./billing";
import { readJsonResponse } from "./apiErrors";

export class WorkflowApiError extends Error {
  constructor(message, { status = 0, code = "workflow_request_failed", payload = null } = {}) {
    super(message);
    this.name = "WorkflowApiError";
    this.status = status;
    this.code = code;
    this.payload = payload;
  }
}

async function workflowRequest(path, { method = "GET", body, signal } = {}) {
  const res = await authedFetch(path, {
    method,
    signal,
    ...(body === undefined ? {} : {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  });
  const payload = await res.json().catch(async () => ({ message: await res.text().catch(() => "") }));
  if (!res.ok) {
    const nestedError = payload?.error;
    const message = typeof payload?.message === "string" && payload.message.trim()
      ? payload.message
      : typeof nestedError === "string" && nestedError.trim()
        ? nestedError
        : typeof nestedError?.message === "string" && nestedError.message.trim()
          ? nestedError.message
          : "The plan could not be updated.";
    const code = payload?.code
      || (nestedError && typeof nestedError === "object" ? nestedError.code : null)
      || "workflow_request_failed";
    throw new WorkflowApiError(
      message,
      { status: res.status, code, payload }
    );
  }
  return payload;
}

function validateObjectResponse(payload, operation) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new WorkflowApiError(`The ${operation} response was not valid.`, {
      code: "invalid_workflow_response",
      payload,
    });
  }
  return payload;
}

const planPath = (planId, suffix = "") =>
  `/api/ai/plans/${encodeURIComponent(planId)}${suffix}`;

function legacyPlanPath(planId, suffix = "") {
  return `/api/ai/plan/${encodeURIComponent(planId)}${suffix}`;
}

function getPlanPathCandidates(planId, suffix = "") {
  return [planPath(planId, suffix), legacyPlanPath(planId, suffix)];
}

async function workflowRequestWithFallback(paths, options) {
  const pathList = Array.isArray(paths) ? paths : [paths];
  let lastError;
  for (const path of pathList) {
    try {
      return await workflowRequest(path, options);
    } catch (error) {
      if (!(error instanceof WorkflowApiError) || error.status !== 404) throw error;
      lastError = error;
    }
  }
  throw lastError;
}

export async function orchestrate({
  prompt,
  answers = null,
  history = [],
  attachments = [],
  mode = "agent",
  gameSpec = "",
  projectId = null,
  studioConnected = false,
  studioTarget = null,
  targeting = null,
  templateId = null,
}) {
  const res = await authedFetch("/api/ai/orchestrate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      answers,
      history,
      mode,
      gameSpec,
      projectId,
      studioConnected: Boolean(studioConnected),
      studioTarget,
      templateId,
      targeting: targeting || {
        projectId,
        studioTarget,
        studioConnected: Boolean(studioConnected),
      },
      attachments: (attachments || []).map((a) => ({ name: a.name, type: a.type })),
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to orchestrate task");
  }
  return res.json();
}

export async function approveWorkflowPlan(planId, { version, hash } = {}) {
  return validateObjectResponse(await workflowRequestWithFallback(
    getPlanPathCandidates(planId, "/approve"),
    {
      method: "POST",
      body: { version, hash },
    },
  ), "plan approval");
}

/** Fetch the latest structured, versioned plan. */
export function getWorkflowPlan(planId, { signal } = {}) {
  return workflowRequestWithFallback(getPlanPathCandidates(planId), { signal })
    .then((payload) => validateObjectResponse(payload, "plan"));
}

/** Apply concurrency-fenced plan editor operations. */
export function updateWorkflowPlan(planId, { version, hash, operations }, { signal } = {}) {
  return workflowRequestWithFallback(getPlanPathCandidates(planId), {
    method: "PATCH",
    signal,
    body: { version, hash, operations },
  }).then((payload) => validateObjectResponse(payload, "plan update"));
}

/** Regenerate one unlocked section without changing the rest of the plan. */
export function regenerateWorkflowPlanSection(planId, sectionId, { version, hash, instruction = "" } = {}) {
  return workflowRequestWithFallback(
    getPlanPathCandidates(planId, `/sections/${encodeURIComponent(sectionId)}/regenerate`),
    {
    method: "POST",
    body: { version, hash, instruction },
    },
  ).then((payload) => validateObjectResponse(payload, "section regeneration"));
}

/** Run server-owned targeting, capability, permission, and specificity checks. */
export function checkWorkflowPlanReadiness(planId, {
  version,
  hash,
  projectId,
  studioConnected,
  studioTarget,
  targeting,
} = {}) {
  return workflowRequestWithFallback(getPlanPathCandidates(planId, "/readiness"), {
    method: "POST",
    body: {
      version,
      hash,
      projectId: projectId || null,
      studioConnected: Boolean(studioConnected),
      studioTarget: studioTarget || null,
      targeting: targeting || {
        projectId: projectId || null,
        studioConnected: Boolean(studioConnected),
        studioTarget: studioTarget || null,
      },
    },
  }).then((payload) => validateObjectResponse(payload, "readiness"));
}

export function getWorkflowPlanVersions(planId, { signal } = {}) {
  return workflowRequestWithFallback(getPlanPathCandidates(planId, "/versions"), { signal }).then((payload) => {
    if (Array.isArray(payload)) return payload;
    return validateObjectResponse(payload, "plan history");
  });
}

export function restoreWorkflowPlanVersion(
  planId,
  { version, hash, sourceVersion, sourceHash } = {},
) {
  return workflowRequestWithFallback(getPlanPathCandidates(planId, "/restore"), {
    method: "POST",
    body: {
      version,
      hash,
      sourceVersion,
      sourceHash,
    },
  }).then((payload) => validateObjectResponse(payload, "plan restore"));
}

/** Ask about the plan. Proposed operations are explicit and never auto-applied. */
export function askWorkflowPlan(planId, { version, hash, question, projectId } = {}) {
  return workflowRequestWithFallback(getPlanPathCandidates(planId, "/ask"), {
    method: "POST",
    body: { version, hash, question, projectId: projectId || null },
  }).then((payload) => validateObjectResponse(payload, "plan answer"));
}

/** Compile and start execution from this exact trusted plan version. */
export function executeWorkflowPlan(planId, { version, hash } = {}) {
  return workflowRequestWithFallback(getPlanPathCandidates(planId, "/execute"), {
    method: "POST",
    // The server reloads targeting and all execution context from this
    // concurrency-fenced plan. Browser copies are never execution authority.
    body: { version, hash },
  }).then((payload) => validateObjectResponse(payload, "plan execution"));
}

export async function verifyRobloxReadiness({ lua, manifest }) {
  const res = await authedFetch("/api/ai/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lua, manifest }),
  });
  if (!res.ok) throw new Error("Verification failed");
  return res.json();
}

/** Fetch persisted status/steps for a unified agent run. */
export async function getAgentRun(runId) {
  const res = await authedFetch(`/api/ai/agent/${encodeURIComponent(runId)}`, {
    method: "GET",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Failed to fetch agent run");
  }
  return res.json();
}

/** Approve a Studio tool step awaiting user confirmation (unified agent run). */
export async function approveAgentStep(runId, stepId) {
  const res = await authedFetch(`/api/ai/agent/${encodeURIComponent(runId)}/approve-step`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stepId }),
  });
  return readJsonResponse(res, "Failed to approve agent step");
}

/** Bind a paused unified agent run to an explicitly confirmed Studio target choice. */
export async function selectAgentStudioTarget(runId, target) {
  const selected = typeof target === "string" ? { id: target } : (target || {});
  const targetId = String(selected.id || selected.targetId || selected.studioTargetId || "").trim();
  const res = await authedFetch(`/api/ai/agent/${encodeURIComponent(runId)}/studio-target`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      targetId,
      studioTargetId: targetId,
      targetPlaceId: selected.placeId || selected.targetPlaceId || null,
      studioTargetConfirmed: true,
    }),
  });
  const payload = await res.json().catch(() => ({}));
  if (res.status === 409) return { ...payload, conflict: true };
  if (!res.ok) throw new Error(payload?.message || "Could not continue in that Studio project");
  return payload;
}

/** Queue snapshot restore for all snapshots captured during a unified agent run. */
export async function restoreAgentRun(runId) {
  const res = await authedFetch(`/api/ai/agent/${encodeURIComponent(runId)}/restore`, {
    method: "POST",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Failed to restore agent run snapshots");
  }
  return res.json();
}

/** Cancel a unified agent run. */
export async function cancelAgentRun(runId) {
  const res = await authedFetch(`/api/ai/agent/${encodeURIComponent(runId)}/cancel`, {
    method: "POST",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Failed to cancel agent run");
  }
  return res.json();
}
