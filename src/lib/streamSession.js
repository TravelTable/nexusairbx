import { BACKEND_URL } from "../config";

/**
 * Mint a short-lived HttpOnly SSE session cookie for EventSource streams.
 */
export async function ensureStreamSession(idToken) {
  const res = await fetch(`${BACKEND_URL}/api/stream/session`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      Accept: "application/json",
    },
    credentials: "include",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Stream session failed (${res.status}): ${text}`);
  }
}
