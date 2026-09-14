const LOOPBACK = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

export const MOCK_RUNS_ENABLED_KEY = "nexusrbx:dev:mock-runs-enabled";

export function isLocalDevToolsHost(locationObject = typeof window !== "undefined" ? window.location : null) {
  if (!locationObject) return false;
  return LOOPBACK.has(String(locationObject.hostname || "").toLowerCase());
}

export function readMockRunsEnabled(storage = typeof localStorage !== "undefined" ? localStorage : null) {
  if (!storage) return false;
  try {
    return storage.getItem(MOCK_RUNS_ENABLED_KEY) === "1";
  } catch (_) {
    return false;
  }
}

export function writeMockRunsEnabled(enabled, storage = typeof localStorage !== "undefined" ? localStorage : null) {
  if (!storage) return;
  try {
    if (enabled) storage.setItem(MOCK_RUNS_ENABLED_KEY, "1");
    else storage.removeItem(MOCK_RUNS_ENABLED_KEY);
  } catch (_) {
    /* ignore quota / private mode */
  }
}
