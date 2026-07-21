import { authedFetch } from "./billing";

export async function orchestrate({ prompt, answers = null, history = [], attachments = [], mode = "agent", gameSpec = "" }) {
  const res = await authedFetch("/api/ai/orchestrate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      answers,
      history,
      mode,
      gameSpec,
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
  const res = await authedFetch(`/api/ai/plan/${planId}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ version, hash }),
  });
  if (!res.ok) throw new Error("Failed to approve plan");
  return res.json();
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
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Failed to approve agent step");
  }
  return res.json();
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
