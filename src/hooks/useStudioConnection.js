import { useCallback, useEffect, useRef, useState } from "react";
import { getRetryDelayMs, isRetryableApiError } from "../lib/apiErrors";
import { getStudioMcpStatus, getStudioStatus } from "../lib/studioBridgeApi";
import { normalizeStudioConnectionSnapshot } from "../lib/studioConnection";

const CONNECTED_IDLE_POLL_MS = 15000;
const RECOVERING_POLL_MS = 5000;
const UPDATE_RECOVERY_POLL_MS = 5000;
const HIDDEN_MIN_POLL_MS = 60000;

export { isStudioSessionLive } from "../lib/studioConnection";

export function getStudioStatusPollDelay({
  connected = false,
  updateRequired = false,
  hidden = false,
  retryAfterMs = 0,
} = {}) {
  const baseDelay = updateRequired
    ? UPDATE_RECOVERY_POLL_MS
    : connected
      ? CONNECTED_IDLE_POLL_MS
      : RECOVERING_POLL_MS;
  const retryDelay = Number.isFinite(Number(retryAfterMs)) ? Number(retryAfterMs) : 0;
  const delay = Math.max(baseDelay, retryDelay);
  return hidden ? Math.max(delay, HIDDEN_MIN_POLL_MS) : delay;
}

/**
 * Polls the independent plugin bridge and local MCP transports and presents one
 * backward-compatible connection snapshot. The legacy sessionId always prefers
 * a live plugin session so existing plugin-only workflows stay safe.
 */
export function useStudioConnection() {
  const [snapshot, setSnapshot] = useState(() => normalizeStudioConnectionSnapshot());
  const [loading, setLoading] = useState(true);
  const pluginStatusRef = useRef(null);
  const mcpStatusRef = useRef(null);
  const connectedRef = useRef(false);
  const updateRequiredRef = useRef(false);
  const retryAfterMsRef = useRef(0);
  const retryUntilRef = useRef(0);
  const inFlightRef = useRef(null);
  const refreshRef = useRef(null);
  const mountedRef = useRef(true);

  const refresh = useCallback(async ({ force = true } = {}) => {
    const retryRemainingMs = retryUntilRef.current - Date.now();
    if (!force && retryRemainingMs > 0) {
      retryAfterMsRef.current = retryRemainingMs;
      return null;
    }
    if (inFlightRef.current) return inFlightRef.current;

    const refreshTask = (async () => {
      const results = await Promise.allSettled([getStudioStatus(), getStudioMcpStatus()]);
      let retryAfterMs = 0;

      const applyResult = (result, statusRef) => {
        if (result.status === "fulfilled") {
          statusRef.current = result.value;
          return;
        }
        if (isRetryableApiError(result.reason)) {
          retryAfterMs = Math.max(retryAfterMs, getRetryDelayMs(result.reason, 30000));
          return;
        }
        statusRef.current = null;
      };

      applyResult(results[0], pluginStatusRef);
      applyResult(results[1], mcpStatusRef);

      retryAfterMsRef.current = retryAfterMs;
      retryUntilRef.current = retryAfterMs > 0 ? Date.now() + retryAfterMs : 0;
      const nextSnapshot = normalizeStudioConnectionSnapshot({
        pluginStatus: pluginStatusRef.current,
        mcpStatus: mcpStatusRef.current,
      });
      connectedRef.current = nextSnapshot.connected;
      updateRequiredRef.current = nextSnapshot.compatibility?.status === "update_required";
      if (mountedRef.current) {
        setSnapshot(nextSnapshot);
        setLoading(false);
      }
      return nextSnapshot;
    })();

    inFlightRef.current = refreshTask;
    try {
      return await refreshTask;
    } finally {
      if (inFlightRef.current === refreshTask) inFlightRef.current = null;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    let timer = null;
    let cancelled = false;

    const clearTimer = () => {
      if (timer) {
        window.clearTimeout(timer);
        timer = null;
      }
    };

    const scheduleNext = () => {
      if (cancelled) return;
      const hidden = typeof document !== "undefined" ? document.hidden : false;
      const delay = getStudioStatusPollDelay({
        connected: connectedRef.current,
        updateRequired: updateRequiredRef.current,
        hidden,
        retryAfterMs: retryAfterMsRef.current,
      });
      timer = window.setTimeout(() => {
        Promise.resolve(refreshRef.current?.({ force: false })).finally(scheduleNext);
      }, delay);
    };

    const handleVisibilityChange = () => {
      clearTimer();
      if (typeof document !== "undefined" && !document.hidden) {
        Promise.resolve(refreshRef.current?.({ force: true })).finally(scheduleNext);
        return;
      }
      scheduleNext();
    };

    Promise.resolve(refreshRef.current?.({ force: false })).finally(scheduleNext);

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    return () => {
      cancelled = true;
      clearTimer();
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
    };
  }, []);

  return { ...snapshot, loading, refresh };
}

export default useStudioConnection;
