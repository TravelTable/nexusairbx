import { BACKEND_URL } from "../config";

const pending = new Map();
const DEFAULT_DELAY_MS = 2500;

export function scheduleDeferredClientLog({
  key,
  source,
  message,
  metadata,
  delayMs = DEFAULT_DELAY_MS,
  backendUrl = BACKEND_URL,
}) {
  if (!key || !source || !message) return;
  if (pending.has(key)) return;

  const timer = setTimeout(() => {
    pending.delete(key);
    void fetch(`${backendUrl}/api/client-log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source,
        message: String(message).slice(0, 500),
        metadata: metadata || undefined,
      }),
      keepalive: true,
    }).catch(() => {});
  }, delayMs);

  pending.set(key, timer);
}

export function cancelDeferredClientLog(key) {
  const timer = pending.get(key);
  if (!timer) return;
  clearTimeout(timer);
  pending.delete(key);
}
