import { BACKEND_URL } from "../config";

function randomSessionId() {
  return `ai_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

export function createAiTelemetryClient({
  getToken,
  fetchImpl = fetch,
  backendUrl = BACKEND_URL,
  batchSize = 10,
  flushIntervalMs = 5000,
  enabled = true,
  sessionId = randomSessionId(),
}) {
  let queue = [];
  let inFlight = false;

  const postEvents = async () => {
    if (!enabled || inFlight || queue.length === 0) return 0;

    const batch = queue.slice(0, batchSize);
    inFlight = true;

    try {
      const token = typeof getToken === "function" ? await getToken() : null;
      if (!token) {
        return 0;
      }

      const res = await fetchImpl(`${backendUrl}/api/ui-builder/ai/telemetry`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ events: batch }),
      });

      if (res.ok) {
        queue = queue.slice(batch.length);
        return batch.length;
      }
    } catch (err) {
      // Best-effort telemetry only.
    } finally {
      inFlight = false;
    }

    return 0;
  };

  const timer = enabled ? setInterval(() => { void postEvents(); }, flushIntervalMs) : null;

  const track = (event) => {
    if (!enabled || !event?.event) return;

    queue.push({
      ...event,
      sessionId,
      ts: Number(event.ts || Date.now()),
    });

    if (queue.length >= batchSize) {
      void postEvents();
    }
  };

  const flush = async () => {
    if (!enabled) return;

    while (queue.length > 0) {
      const sent = await postEvents();
      if (sent === 0) break;
    }
  };

  const destroy = async () => {
    if (timer) clearInterval(timer);
    await flush();
  };

  return {
    track,
    flush,
    destroy,
    getSessionId: () => sessionId,
  };
}

export default createAiTelemetryClient;
