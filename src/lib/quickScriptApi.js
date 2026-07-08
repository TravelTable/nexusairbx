import { getAuth } from "firebase/auth";
import { BACKEND_URL } from "../config";
import { getProductAnalyticsHeaders } from "./productAnalytics";

function randomKey(prefix = "qs") {
  const id =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  return `${prefix}_${id}`;
}

async function optionalAuthHeaders() {
  const user = getAuth()?.currentUser;
  if (!user) return {};
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

async function parseJsonResponse(res) {
  const payload = await res.json().catch(async () => ({
    ok: false,
    message: await res.text().catch(() => ""),
  }));
  if (res.ok) return payload;

  const err = new Error(payload?.message || payload?.error || `Quick Script request failed (${res.status})`);
  err.status = res.status;
  err.code = payload?.code || payload?.error || "QUICK_SCRIPT_FAILED";
  err.payload = payload;
  err.retryable = payload?.retryable !== false && res.status !== 400 && res.status !== 401 && res.status !== 403;
  err.authRequired = Boolean(payload?.authRequired || res.status === 401 || res.status === 403);
  throw err;
}

export function createQuickScriptIdempotencyKey() {
  return randomKey("quick_script");
}

export async function generateQuickScript({
  prompt,
  priorResult = null,
  idempotencyKey = createQuickScriptIdempotencyKey(),
} = {}) {
  const body = {
    prompt,
    generatorMode: "quick_script",
  };
  if (priorResult && typeof priorResult === "object" && priorResult.code) {
    body.priorResult = priorResult;
  }
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "Idempotency-Key": idempotencyKey,
    ...getProductAnalyticsHeaders(),
    ...(await optionalAuthHeaders()),
  };
  const res = await fetch(`${BACKEND_URL}/api/quick-script/generate`, {
    method: "POST",
    mode: "cors",
    cache: "no-store",
    headers,
    body: JSON.stringify(body),
  });
  return parseJsonResponse(res);
}

export async function claimQuickScriptResult({ anonymousResultId, claimToken } = {}) {
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...getProductAnalyticsHeaders(),
    ...(await optionalAuthHeaders()),
  };
  const res = await fetch(`${BACKEND_URL}/api/quick-script/claim`, {
    method: "POST",
    mode: "cors",
    cache: "no-store",
    headers,
    body: JSON.stringify({ anonymousResultId, claimToken }),
  });
  return parseJsonResponse(res);
}

export async function saveQuickScriptProject({
  prompt,
  result,
  claim,
  idempotencyKey = randomKey("quick_script_save"),
  projectId,
} = {}) {
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "Idempotency-Key": idempotencyKey,
    ...getProductAnalyticsHeaders(),
    ...(await optionalAuthHeaders()),
  };
  const res = await fetch(`${BACKEND_URL}/api/projects/save-quick-script`, {
    method: "POST",
    mode: "cors",
    cache: "no-store",
    headers,
    body: JSON.stringify({
      prompt,
      result,
      claim,
      idempotencyKey,
      projectId,
    }),
  });
  return parseJsonResponse(res);
}

export async function upgradeQuickScriptProjectToAgent({ projectId } = {}) {
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...getProductAnalyticsHeaders(),
    ...(await optionalAuthHeaders()),
  };
  const res = await fetch(`${BACKEND_URL}/api/projects/${encodeURIComponent(projectId)}/upgrade-agent`, {
    method: "POST",
    mode: "cors",
    cache: "no-store",
    headers,
    body: JSON.stringify({}),
  });
  return parseJsonResponse(res);
}
