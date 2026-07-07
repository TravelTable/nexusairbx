import { useCallback, useEffect, useState } from "react";
import { getStudioStatus } from "../lib/studioBridgeApi";

const LIVE_IDLE_MS = 45000;

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

/**
 * Polls Studio bridge connection status for unified agent Studio tools.
 */
export function useStudioConnection(pollMs = 5000) {
  const [connected, setConnected] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [collaborators, setCollaborators] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const status = await getStudioStatus();
      const active = pickActiveStudioSession(status.sessions || []);
      setConnected(isStudioSessionLive(active));
      setSessionId(active?.sessionId || active?.id || null);
      setCollaborators(Array.isArray(active?.collaborators) ? active.collaborators : []);
    } catch (_) {
      setConnected(false);
      setSessionId(null);
      setCollaborators([]);
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

  return { connected, sessionId, collaborators, loading, refresh };
}

export default useStudioConnection;
