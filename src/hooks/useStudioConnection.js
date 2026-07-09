import { useCallback, useEffect, useRef, useState } from "react";
import { getRetryDelayMs, isRetryableApiError } from "../lib/apiErrors";
import { getStudioStatus } from "../lib/studioBridgeApi";

const LIVE_IDLE_MS = 45000;
const CONNECTED_IDLE_POLL_MS = 15000;
const RECOVERING_POLL_MS = 5000;
const HIDDEN_MIN_POLL_MS = 60000;

function pickActiveStudioSession(sessions = []) {
  const connected = sessions.filter((session) => session?.status === "connected");
  if (!connected.length) return null;

  const live = connected.find((session) => session.live === true);
  if (live) return live;

  const recentlySeen = connected.find((session) => {
    const lastSeenAt = Number(session?.lastSeenAt || 0);
    return lastSeenAt > 0 && Date.now() - lastSeenAt <= LIVE_IDLE_MS;
  });
  if (recentlySeen) return recentlySeen;

  const notStale = connected.find((session) => session.live !== false);
  return notStale || connected[0] || null;
}

export function isStudioSessionLive(session) {
  if (!session || session.status !== "connected") return false;
  if (session.live === true) return true;
  if (session.live === false) return false;
  const lastSeenAt = Number(session.lastSeenAt || 0);
  if (lastSeenAt > 0 && Date.now() - lastSeenAt <= LIVE_IDLE_MS) return true;
  return session.live !== false;
}

export function getStudioStatusPollDelay({ connected = false, hidden = false, retryAfterMs = 0 } = {}) {
  const baseDelay = connected ? CONNECTED_IDLE_POLL_MS : RECOVERING_POLL_MS;
  const retryDelay = Number.isFinite(Number(retryAfterMs)) ? Number(retryAfterMs) : 0;
  const delay = Math.max(baseDelay, retryDelay);
  return hidden ? Math.max(delay, HIDDEN_MIN_POLL_MS) : delay;
}

/**
 * Polls Studio bridge connection status for unified agent Studio tools.
 */
export function useStudioConnection() {
  const [connected, setConnected] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [collaborators, setCollaborators] = useState([]);
  const [loading, setLoading] = useState(true);
  const connectedRef = useRef(false);
  const retryAfterMsRef = useRef(0);
  const retryUntilRef = useRef(0);
  const inFlightRef = useRef(null);
  const refreshRef = useRef(null);

  const refresh = useCallback(async ({ force = true } = {}) => {
    const retryRemainingMs = retryUntilRef.current - Date.now();
    if (!force && retryRemainingMs > 0) {
      retryAfterMsRef.current = retryRemainingMs;
      return null;
    }
    if (inFlightRef.current) return inFlightRef.current;

    const refreshTask = (async () => {
      try {
        const status = await getStudioStatus();
        const active = pickActiveStudioSession(status.sessions || []);
        const nextConnected = isStudioSessionLive(active);
        retryAfterMsRef.current = 0;
        retryUntilRef.current = 0;
        connectedRef.current = nextConnected;
        setConnected(nextConnected);
        setSessionId(active?.sessionId || active?.id || null);
        setCollaborators(Array.isArray(active?.collaborators) ? active.collaborators : []);
      } catch (err) {
        if (isRetryableApiError(err)) {
          const retryAfterMs = getRetryDelayMs(err, 30000);
          retryAfterMsRef.current = retryAfterMs;
          retryUntilRef.current = Date.now() + retryAfterMs;
          return null;
        }
        retryAfterMsRef.current = 0;
        retryUntilRef.current = 0;
        connectedRef.current = false;
        setConnected(false);
        setSessionId(null);
        setCollaborators([]);
      } finally {
        setLoading(false);
      }
      return null;
    })();

    inFlightRef.current = refreshTask;
    try {
      return await refreshTask;
    } finally {
      if (inFlightRef.current === refreshTask) {
        inFlightRef.current = null;
      }
    }
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
        hidden,
        retryAfterMs: retryAfterMsRef.current,
      });
      timer = window.setTimeout(() => {
        Promise.resolve(refreshRef.current?.({ force: false })).finally(() => {
          scheduleNext();
        });
      }, delay);
    };

    const handleVisibilityChange = () => {
      clearTimer();
      scheduleNext();
    };

    Promise.resolve(refreshRef.current?.({ force: false })).finally(() => {
      scheduleNext();
    });

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

  return { connected, sessionId, collaborators, loading, refresh };
}

export default useStudioConnection;
