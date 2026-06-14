import { useCallback, useEffect, useState } from "react";
import { getStudioStatus } from "../lib/studioBridgeApi";

/**
 * Polls Studio bridge connection status for unified agent Studio tools.
 */
export function useStudioConnection(pollMs = 15000) {
  const [connected, setConnected] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const status = await getStudioStatus();
      const active = (status.sessions || []).find((s) => s.status === "connected") || null;
      setConnected(Boolean(active));
      setSessionId(active?.sessionId || active?.id || null);
    } catch (_) {
      setConnected(false);
      setSessionId(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    if (pollMs <= 0) return undefined;
    const timer = window.setInterval(refresh, pollMs);
    return () => window.clearInterval(timer);
  }, [pollMs, refresh]);

  return { connected, sessionId, loading, refresh };
}

export default useStudioConnection;
