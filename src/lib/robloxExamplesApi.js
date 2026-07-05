import { BACKEND_URL } from "../config";

async function parseJsonResponse(res) {
  const payload = await res.json().catch(async () => ({
    ok: false,
    message: await res.text().catch(() => ""),
  }));
  if (res.ok) return payload;

  const err = new Error(payload?.message || payload?.error || `Roblox examples request failed (${res.status})`);
  err.status = res.status;
  err.payload = payload;
  throw err;
}

export async function fetchRobloxExamples() {
  const res = await fetch(`${BACKEND_URL}/api/roblox-examples`, {
    method: "GET",
    mode: "cors",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  return parseJsonResponse(res);
}
