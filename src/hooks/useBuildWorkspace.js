import { useCallback, useEffect, useMemo, useState } from "react";
import { createBuildWorkspaceState, reduceBuildWorkspace } from "../lib/buildWorkspaceState";
import { getBuildWorkspaceSnapshot, readBuildWorkspaceFile } from "../lib/buildWorkspaceApi";

// Full canonical snapshots include all output kinds. Their server projection
// sequence is never inferred from a filtered subset of the task event log.
export default function useBuildWorkspace({ taskId, chatId, projectId, runId = "", enabled = true }) {
  const scope = useMemo(() => ({ taskId, chatId, projectId, ...(runId ? { runId } : {}) }), [taskId, chatId, projectId, runId]);
  const scopeKey = JSON.stringify(scope);
  const [record, setRecord] = useState({ key: "", state: null, error: "" });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!enabled || !taskId || !chatId || !projectId) return undefined;
    const controller = new AbortController();
    let timer;
    let pinnedScope = scope;
    const refresh = async () => {
      try {
        const response = await getBuildWorkspaceSnapshot(pinnedScope, { signal: controller.signal });
        if (controller.signal.aborted) return;
        const snapshot = response.snapshot || response;
        if (snapshot.waitingForRun === true) {
          setRecord(previous => ({ key: scopeKey, state: previous.key === scopeKey ? previous.state : null, error: "", waitingForRun: true }));
          return;
        }
        if (!["taskId", "chatId", "projectId"].every(key => snapshot.scope?.[key] === scope[key])
          || (pinnedScope.runId && snapshot.scope?.runId !== pinnedScope.runId)) throw new Error("The saved output belongs to a different build. Reopen this build.");
        pinnedScope = snapshot.scope;
        setRecord(previous => {
          const current = previous.key === scopeKey && previous.state?.scope.runId === snapshot.scope.runId ? previous.state : createBuildWorkspaceState(snapshot.scope);
          const state = reduceBuildWorkspace(current, { ...snapshot, type: "snapshot" });
          return { key: scopeKey, state: { ...state, connection: "connected" }, error: "" };
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        // A server-confirmed replacement run is resolved from the task mapping,
        // never guessed from a Studio, job, or lifecycle identifier.
        if (error.status === 409) pinnedScope = scope;
        setRecord(previous => ({ key: scopeKey, state: previous.key === scopeKey && previous.state
          ? { ...previous.state, connection: "reconnecting" } : null, error: error.message || "Saved build outputs could not be loaded." }));
      } finally {
        if (!controller.signal.aborted) timer = setTimeout(refresh, 2000);
      }
    };
    refresh();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [scope, scopeKey, enabled, taskId, chatId, projectId, retry]);
  const state = record.key === scopeKey ? record.state : null;
  const exactScope = state?.scope;
  const readFile = useCallback((reference, options) => {
    if (!exactScope) return Promise.reject(new Error("The build output connection is not ready."));
    return readBuildWorkspaceFile(exactScope, reference, options);
  }, [exactScope]);
  return { scopeKey, state, items: state ? Object.values(state.items) : [], readFile,
    connection: state?.connection || (record.key === scopeKey && record.waitingForRun ? "waiting" : taskId ? "loading" : "connected"),
    error: record.key === scopeKey ? record.error : "", reconnect: () => setRetry(value => value + 1) };
}
