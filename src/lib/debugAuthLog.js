const INGEST_URL =
  "http://127.0.0.1:7578/ingest/57d6d18f-d552-454d-9136-c39042e05f2e";
const STORAGE_KEY = "nexusrbx:debugAuthLogs";
const MAX_STORED = 40;

function pushStored(entry) {
  try {
    const existing = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "[]");
    const next = Array.isArray(existing) ? existing : [];
    next.push(entry);
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(next.slice(-MAX_STORED))
    );
  } catch (_) {
    // Ignore storage failures.
  }
}

/** Dual-path debug logger for production HTTPS pages. */
export function debugAuthLog({
  hypothesisId,
  location,
  message,
  data = {},
  runId = "pre-fix",
}) {
  const payload = {
    sessionId: "60f10e",
    runId,
    hypothesisId,
    location,
    message,
    data: {
      buildMarker: "debug-60f10e-v2",
      ...data,
    },
    timestamp: Date.now(),
  };

  pushStored(payload);

  try {
    // eslint-disable-next-line no-console
    console.info("[nexus-debug-auth]", message, payload.data);
    if (typeof window !== "undefined") {
      window.__NEXUS_DEBUG_AUTH_LOGS = JSON.parse(
        sessionStorage.getItem(STORAGE_KEY) || "[]"
      );
    }
  } catch (_) {}

  // #region agent log
  fetch(INGEST_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "60f10e",
    },
    body: JSON.stringify(payload),
    mode: "cors",
    keepalive: true,
  }).catch(() => {});
  // #endregion

  try {
    const backendUrl =
      typeof process !== "undefined"
        && process.env
        && process.env.REACT_APP_BACKEND_URL
        ? process.env.REACT_APP_BACKEND_URL
        : "https://api.nexusrbx.com";
    void fetch(`${backendUrl}/api/client-log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "debug-auth",
        message: String(message).slice(0, 500),
        metadata: {
          sessionId: "60f10e",
          hypothesisId,
          location,
          runId,
          ...payload.data,
        },
      }),
      keepalive: true,
    }).catch(() => {});
  } catch (_) {}
}
