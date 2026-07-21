import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ACTIVE_AGENT_STATES,
  AgentRuntimeUnavailableError,
  cancelAgentRunV2,
  extractAgentEvents,
  extractAgentList,
  getActiveAgentsV2,
  getAgentEventsV2,
  mergeAgentEvents,
} from "../lib/agentRuntimeV2Api";
import { cancelAgentRun as cancelLegacyAgentRun } from "../lib/workflowApi";

const REFRESH_INTERVAL_MS = 10000;
const EVENT_INTERVAL_MS = 2500;

function newestSequence(payload, fallback) {
  const explicit = Number(
    payload?.lastSequence
      ?? payload?.data?.lastSequence
      ?? payload?.nextSequence
      ?? payload?.sequence
      ?? payload?.cursor
  );
  if (Number.isFinite(explicit)) return Math.max(fallback, explicit);
  return extractAgentEvents(payload).reduce((value, event) => {
    const sequence = Number(event?.sequence ?? event?.seq);
    return Number.isFinite(sequence) ? Math.max(value, sequence) : value;
  }, fallback);
}

export default function useActiveAgents(user, { fallbackChatIds = [] } = {}) {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(Boolean(user));
  const [runtimeAvailable, setRuntimeAvailable] = useState(true);
  const [error, setError] = useState(null);
  const sequenceRef = useRef(0);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const payload = await getActiveAgentsV2();
      setAgents(extractAgentList(payload));
      sequenceRef.current = newestSequence(payload, sequenceRef.current);
      setRuntimeAvailable(true);
      setError(null);
    } catch (err) {
      if (err instanceof AgentRuntimeUnavailableError) setRuntimeAvailable(false);
      else setError(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setAgents([]);
      setLoading(false);
      return undefined;
    }
    void refresh();
    const refreshTimer = window.setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(refreshTimer);
  }, [refresh, user]);

  useEffect(() => {
    if (!user || !runtimeAvailable) return undefined;
    let disposed = false;
    let polling = false;
    const poll = async () => {
      if (polling || disposed) return;
      polling = true;
      try {
        const payload = await getAgentEventsV2(sequenceRef.current);
        if (disposed) return;
        const events = extractAgentEvents(payload);
        setAgents((current) => mergeAgentEvents(current, events));
        sequenceRef.current = newestSequence(payload, sequenceRef.current);
        // Event payloads intentionally contain identifiers and transition data,
        // not a complete agent projection. Refresh after activity so runs,
        // queue positions, and statuses come from the authoritative snapshot.
        if (events.length) await refresh();
      } catch (err) {
        if (!disposed && err instanceof AgentRuntimeUnavailableError) setRuntimeAvailable(false);
      } finally {
        polling = false;
      }
    };
    const timer = window.setInterval(poll, EVENT_INTERVAL_MS);
    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, [refresh, runtimeAvailable, user]);

  const visibleAgents = useMemo(() => {
    if (runtimeAvailable) {
      return agents.filter((agent) => ACTIVE_AGENT_STATES.has(agent.status));
    }
    return fallbackChatIds.map((chatId) => ({
      id: `local-${chatId}`,
      agentId: `local-${chatId}`,
      chatId,
      title: "Active chat",
      status: "running",
      runs: [],
      localFallback: true,
    }));
  }, [agents, fallbackChatIds, runtimeAvailable]);

  const cancelRun = useCallback(async (runId) => {
    try {
      await cancelAgentRunV2(runId);
    } catch (err) {
      if (!(err instanceof AgentRuntimeUnavailableError)) throw err;
      await cancelLegacyAgentRun(runId);
    }
    await refresh();
  }, [refresh]);

  return { agents: visibleAgents, loading, error, runtimeAvailable, refresh, cancelRun };
}
