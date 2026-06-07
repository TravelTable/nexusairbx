import { authedFetch } from "./billing";

export async function orchestrate({ prompt, answers = null, history = [], attachments = [] }) {
  const res = await authedFetch("/api/ai/orchestrate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      answers,
      history,
      attachments: (attachments || []).map((a) => ({ name: a.name, type: a.type })),
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to orchestrate task");
  }
  return res.json();
}

export async function approveWorkflowPlan(planId) {
  const res = await authedFetch(`/api/ai/plan/${planId}/approve`, { method: "POST" });
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
