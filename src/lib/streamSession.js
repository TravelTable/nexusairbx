import { BACKEND_URL } from "../config";

/**
 * Mint a short-lived SSE session (HttpOnly cookie + query-token fallback for EventSource).
 * @returns {Promise<{ token: string | null }>}
 */
export async function ensureStreamSession(idToken, { retries = 1 } = {}) {
  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
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

      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = await res.json().catch(() => ({}));
        return { token: data?.token || data?.streamToken || null };
      }

      return { token: null };
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
      }
    }
  }

  throw lastError || new Error("Stream session failed");
}
