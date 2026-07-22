import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  askWorkflowPlan,
  checkWorkflowPlanReadiness,
  executeWorkflowPlan,
  getWorkflowPlan,
  getWorkflowPlanVersions,
  regenerateWorkflowPlanSection,
  restoreWorkflowPlanVersion,
  updateWorkflowPlan,
  WorkflowApiError,
} from "../lib/workflowApi";
import {
  addPlanSectionItem,
  createPlanSyncOperations,
  createReplaceSectionOperation,
  findLatestPlanMessage,
  loadPlanDraft,
  normalizeReadiness,
  normalizeWorkflowPlan,
  planDraftStorageKey,
  removePlanSectionItem,
  reorderPlanSectionItem,
  savePlanDraft,
  setPlanSectionLock,
  updatePlanSection,
  updatePlanSectionItem,
} from "../lib/workflowPlan";

const AUTOSAVE_DELAY_MS = 500;

const planFromResponse = (response, fallback) => {
  const payload = response?.plan && typeof response.plan === "object"
    ? {
      ...response.plan,
      planId: response.planId || response.plan.planId,
      version: response.version ?? response.plan.version,
      hash: response.hash || response.plan.hash,
      status: response.status || response.plan.status,
    }
    : response;
  return normalizeWorkflowPlan(payload, fallback);
};

const withServerIdentity = (current, serverPlan) => ({
  ...current,
  planId: serverPlan.planId || current.planId,
  version: serverPlan.version || current.version,
  hash: serverPlan.hash || current.hash,
  status: serverPlan.status || current.status,
});

const mergeQueuedOperation = (operations, operation) => {
  if (["replace_section", "set_section_lock"].includes(operation.type)) {
    return [
      ...operations.filter((entry) => !(entry.type === operation.type && entry.sectionId === operation.sectionId)),
      operation,
    ];
  }
  return [...operations, operation];
};

export default function usePlanWorkspace({
  enabled = true,
  messages = [],
  userId = "guest",
  chatId = "chat",
  projectId = "",
  studioConnected = false,
  studioTarget = null,
  onExecute,
  notify,
} = {}) {
  const sourceMessage = useMemo(() => findLatestPlanMessage(messages), [messages]);
  const sourcePlan = useMemo(
    () => (sourceMessage ? normalizeWorkflowPlan(sourceMessage, sourceMessage) : null),
    [sourceMessage]
  );
  const planId = sourcePlan?.planId || "";
  const storageKey = useMemo(() => planDraftStorageKey({ userId, chatId, planId }), [userId, chatId, planId]);

  const [plan, setPlan] = useState(sourcePlan);
  const [loadState, setLoadState] = useState(sourcePlan ? "loading" : "empty");
  const [loadError, setLoadError] = useState(null);
  const [saveStatus, setSaveStatus] = useState("saved");
  const [saveError, setSaveError] = useState(null);
  const [readiness, setReadiness] = useState(() => normalizeReadiness(
    {},
    sourcePlan,
    { projectId, studioConnected, studioTarget }
  ));
  const [readinessLoading, setReadinessLoading] = useState(false);
  const [versions, setVersions] = useState([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [versionsError, setVersionsError] = useState(null);
  const [restoringVersion, setRestoringVersion] = useState(null);
  const [restoreError, setRestoreError] = useState(null);
  const [editingLocked, setEditingLocked] = useState(false);
  const [regeneratingSectionId, setRegeneratingSectionId] = useState(null);
  const [askState, setAskState] = useState({ status: "idle", question: "", answer: "", proposedOperations: [], error: null });
  const [executionState, setExecutionState] = useState({ status: "idle", result: null, error: null });

  const planRef = useRef(sourcePlan);
  const pendingOperationsRef = useRef([]);
  const saveTimerRef = useRef(null);
  const activeSaveRef = useRef(null);
  const flushRef = useRef(null);
  const mountedRef = useRef(false);
  const readinessRef = useRef(readiness);
  const mutationLockRef = useRef(false);

  const storeReadiness = useCallback((next) => {
    readinessRef.current = next;
    if (mountedRef.current) setReadiness(next);
  }, []);

  const acquireEditingLock = useCallback(() => {
    if (mutationLockRef.current) return false;
    mutationLockRef.current = true;
    if (mountedRef.current) setEditingLocked(true);
    return true;
  }, []);

  const releaseEditingLock = useCallback(() => {
    mutationLockRef.current = false;
    if (mountedRef.current) setEditingLocked(false);
  }, []);

  const storePlan = useCallback((next, metadata = {}) => {
    planRef.current = next;
    if (mountedRef.current) setPlan(next);
    savePlanDraft(storageKey, next, metadata);
  }, [storageKey]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      mutationLockRef.current = false;
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    const handleOffline = () => setLoadState((current) => (current === "empty" ? current : "reconnecting"));
    const handleOnline = () => {
      setLoadState((current) => (current === "reconnecting" ? "ready" : current));
      flushRef.current?.();
    };
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return undefined;
    pendingOperationsRef.current = [];
    setSaveStatus("saved");
    setSaveError(null);
    setLoadError(null);
    setVersions([]);
    setVersionsError(null);
    setRestoreError(null);
    setRestoringVersion(null);
    setReadinessLoading(false);

    if (!sourcePlan) {
      storePlan(null);
      storeReadiness(normalizeReadiness({ status: "unchecked" }, null, {
        projectId,
        studioConnected,
        studioTarget,
      }));
      setLoadState("empty");
      return undefined;
    }

    const cached = loadPlanDraft(storageKey);
    const cachedPlan = cached?.plan ? normalizeWorkflowPlan(cached.plan, sourceMessage) : null;
    const recoverInitial = cachedPlan?.planId === sourcePlan.planId
      && (cachedPlan.version > sourcePlan.version || (cachedPlan.version === sourcePlan.version && cached?.dirty))
    const initialPlan = recoverInitial ? cachedPlan : sourcePlan;
    pendingOperationsRef.current = recoverInitial && cached?.dirty
      ? createPlanSyncOperations(initialPlan)
      : [];
    setSaveStatus(pendingOperationsRef.current.length ? "dirty" : "saved");
    storePlan(initialPlan, { recovered: recoverInitial, dirty: recoverInitial && Boolean(cached?.dirty) });
    storeReadiness(normalizeReadiness({ status: "unchecked" }, initialPlan, {
      projectId,
      studioConnected,
      studioTarget,
    }));

    if (!sourcePlan.planId) {
      setLoadState(cachedPlan ? "recovered" : "ready");
      return undefined;
    }

    const controller = new AbortController();
    setLoadState("loading");
    getWorkflowPlan(sourcePlan.planId, { signal: controller.signal })
      .then((response) => {
        if (controller.signal.aborted) return;
        const serverPlan = planFromResponse(response, sourceMessage);
        const draft = loadPlanDraft(storageKey);
        const localPlan = draft?.plan ? normalizeWorkflowPlan(draft.plan, sourceMessage) : null;
        const recoverLocal = localPlan?.planId === serverPlan.planId
          && (localPlan.version > serverPlan.version || (localPlan.version === serverPlan.version && draft?.dirty));
        pendingOperationsRef.current = recoverLocal && draft?.dirty
          ? createPlanSyncOperations(localPlan)
          : [];
        setSaveStatus(pendingOperationsRef.current.length ? "dirty" : "saved");
        storePlan(recoverLocal ? localPlan : serverPlan, {
          recovered: recoverLocal,
          dirty: Boolean(recoverLocal && draft?.dirty),
        });
        setLoadState(recoverLocal ? "recovered" : "ready");
        storeReadiness(normalizeReadiness({ status: "unchecked" }, recoverLocal ? localPlan : serverPlan, {
          projectId,
          studioConnected,
          studioTarget,
        }));
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setLoadError(error);
        setLoadState(recoverInitial ? "recovered" : navigator.onLine === false ? "reconnecting" : "error");
      });
    return () => controller.abort();
  }, [enabled, projectId, sourceMessage, sourcePlan, storageKey, storePlan, storeReadiness, studioConnected, studioTarget]);

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      saveTimerRef.current = null;
      flushRef.current?.();
    }, AUTOSAVE_DELAY_MS);
  }, []);

  const invalidateReadiness = useCallback((current = planRef.current) => {
    storeReadiness(normalizeReadiness({ status: "stale" }, current, {
      projectId,
      studioConnected,
      studioTarget,
    }));
  }, [projectId, storeReadiness, studioConnected, studioTarget]);

  const queueOperation = useCallback((operation) => {
    pendingOperationsRef.current = mergeQueuedOperation(pendingOperationsRef.current, operation);
    setSaveStatus("dirty");
    setSaveError(null);
    savePlanDraft(storageKey, planRef.current, { dirty: true });
    invalidateReadiness();
    scheduleSave();
  }, [invalidateReadiness, scheduleSave, storageKey]);

  const flushEdits = useCallback(async () => {
    if (!planRef.current?.planId || pendingOperationsRef.current.length === 0) return planRef.current;
    if (activeSaveRef.current) {
      await activeSaveRef.current;
      if (pendingOperationsRef.current.length) return flushEdits();
      return planRef.current;
    }

    const operations = pendingOperationsRef.current;
    pendingOperationsRef.current = [];
    const requestPlan = planRef.current;
    setSaveStatus("saving");
    const promise = updateWorkflowPlan(requestPlan.planId, {
      version: requestPlan.version,
      hash: requestPlan.hash,
      operations,
    })
      .then((response) => {
        const serverPlan = planFromResponse(response, sourceMessage);
        if (pendingOperationsRef.current.length) {
          storePlan(withServerIdentity(planRef.current, serverPlan), { dirty: true });
          setSaveStatus("dirty");
          scheduleSave();
        } else {
          storePlan(serverPlan, { dirty: false });
          setSaveStatus("saved");
        }
        setLoadState("ready");
        setSaveError(null);
        return planRef.current;
      })
      .catch((error) => {
        pendingOperationsRef.current = [...operations, ...pendingOperationsRef.current];
        setSaveStatus(error instanceof WorkflowApiError && error.status === 409 ? "conflict" : "error");
        setSaveError(error);
        if (navigator.onLine === false) setLoadState("reconnecting");
        savePlanDraft(storageKey, planRef.current, { dirty: true });
        throw error;
      })
      .finally(() => {
        if (activeSaveRef.current === promise) activeSaveRef.current = null;
      });
    activeSaveRef.current = promise;
    return promise;
  }, [scheduleSave, sourceMessage, storageKey, storePlan]);

  // Keep the autosave timer pointed at the newest flush function.
  useEffect(() => {
    flushRef.current = () => flushEdits().catch(() => {});
    return () => {
      flushRef.current = null;
    };
  }, [flushEdits]);

  // Re-apply recovered edits before readiness or execution can use a stale
  // server plan. Failed syncs remain queued and retry on the next online event.
  useEffect(() => {
    if (loadState === "recovered" && pendingOperationsRef.current.length) {
      flushRef.current?.();
    }
  }, [loadState]);

  const replaceSection = useCallback((sectionId, value) => {
    const current = planRef.current;
    if (mutationLockRef.current || !current || current.locks?.[sectionId]) return;
    const next = updatePlanSection(current, sectionId, value);
    storePlan(next, { dirty: true });
    queueOperation(createReplaceSectionOperation(next, sectionId));
  }, [queueOperation, storePlan]);

  const updateItem = useCallback((sectionId, itemId, patch) => {
    const current = planRef.current;
    if (mutationLockRef.current || !current || current.locks?.[sectionId]) return;
    const next = updatePlanSectionItem(current, sectionId, itemId, patch);
    storePlan(next, { dirty: true });
    queueOperation(createReplaceSectionOperation(next, sectionId));
  }, [queueOperation, storePlan]);

  const addItem = useCallback((sectionId) => {
    const current = planRef.current;
    if (mutationLockRef.current || !current || current.locks?.[sectionId]) return;
    const next = addPlanSectionItem(current, sectionId, { title: "", details: "" });
    storePlan(next, { dirty: true });
    queueOperation(createReplaceSectionOperation(next, sectionId));
  }, [queueOperation, storePlan]);

  const removeItem = useCallback((sectionId, itemId) => {
    const current = planRef.current;
    if (mutationLockRef.current || !current || current.locks?.[sectionId]) return;
    const next = removePlanSectionItem(current, sectionId, itemId);
    storePlan(next, { dirty: true });
    queueOperation(createReplaceSectionOperation(next, sectionId));
  }, [queueOperation, storePlan]);

  const reorderItem = useCallback((sectionId, itemId, direction) => {
    const current = planRef.current;
    if (mutationLockRef.current || !current || current.locks?.[sectionId]) return;
    const next = reorderPlanSectionItem(current, sectionId, itemId, direction);
    if (next === current) return;
    storePlan(next, { dirty: true });
    queueOperation(createReplaceSectionOperation(next, sectionId));
  }, [queueOperation, storePlan]);

  const setSectionLocked = useCallback((sectionId, locked) => {
    const current = planRef.current;
    if (mutationLockRef.current || !current) return;
    const next = setPlanSectionLock(current, sectionId, locked);
    storePlan(next, { dirty: true });
    queueOperation({ type: "set_section_lock", sectionId, locked: Boolean(locked) });
  }, [queueOperation, storePlan]);

  const regenerateSection = useCallback(async (sectionId, instruction = "") => {
    const current = planRef.current;
    if (mutationLockRef.current || !current?.planId || current.locks?.[sectionId]) return null;
    if (!acquireEditingLock()) return null;
    setRegeneratingSectionId(sectionId);
    try {
      const latest = await flushEdits();
      const response = await regenerateWorkflowPlanSection(latest.planId, sectionId, {
        version: latest.version,
        hash: latest.hash,
        instruction,
      });
      const next = planFromResponse(response, sourceMessage);
      storePlan(next, { dirty: false });
      setSaveStatus("saved");
      invalidateReadiness(next);
      return next;
    } catch (error) {
      setSaveError(error);
      notify?.({ type: "error", message: error?.message || "That section could not be regenerated." });
      throw error;
    } finally {
      setRegeneratingSectionId(null);
      releaseEditingLock();
    }
  }, [acquireEditingLock, flushEdits, invalidateReadiness, notify, releaseEditingLock, sourceMessage, storePlan]);

  const markReadinessUnavailable = useCallback((current) => {
    const local = normalizeReadiness({ status: "error" }, current, { projectId, studioConnected, studioTarget });
    const unavailableIssue = {
      id: "readiness-unavailable",
      code: "readiness_unavailable",
      severity: "blocker",
      title: "Readiness check unavailable",
      message: "NexusRBX could not confirm that this plan is safe to execute.",
      suggestedFix: {
        action: "retry_readiness",
        label: "Retry the readiness check when the connection is restored.",
      },
      sectionId: null,
      affectedStepIds: [],
    };
    const blockers = local.blockers.some((issue) => issue.id === unavailableIssue.id)
      ? local.blockers
      : [...local.blockers, unavailableIssue];
    const unavailable = {
      ...local,
      status: "error",
      ready: false,
      canExecute: false,
      checkedAt: null,
      blockers,
      issues: [...blockers, ...local.warnings],
    };
    storeReadiness(unavailable);
    notify?.({ type: "error", message: "Could not confirm readiness. Execution remains paused." });
    return unavailable;
  }, [notify, projectId, storeReadiness, studioConnected, studioTarget]);

  const requestReadiness = useCallback(async (current) => {
    if (!current) {
      const unchecked = normalizeReadiness({ status: "unchecked" }, null, {
        projectId,
        studioConnected,
        studioTarget,
      });
      storeReadiness(unchecked);
      return unchecked;
    }
    setReadinessLoading(true);
    storeReadiness(normalizeReadiness({ status: "checking" }, current, {
      projectId,
      studioConnected,
      studioTarget,
    }));
    try {
      const response = current.planId
        ? await checkWorkflowPlanReadiness(current.planId, {
          version: current.version,
          hash: current.hash,
          projectId,
          studioConnected,
          studioTarget,
          targeting: {
            projectId: projectId || null,
            studioConnected: Boolean(studioConnected),
            studioTarget: studioTarget || null,
          },
        })
        : { issues: [] };
      const normalized = normalizeReadiness(response, current, { projectId, studioConnected, studioTarget });
      storeReadiness(normalized);
      return normalized;
    } catch (_) {
      return markReadinessUnavailable(current);
    } finally {
      setReadinessLoading(false);
    }
  }, [markReadinessUnavailable, projectId, storeReadiness, studioConnected, studioTarget]);

  const checkReadiness = useCallback(async () => {
    if (!acquireEditingLock()) return readinessRef.current;
    try {
      const current = await flushEdits();
      return await requestReadiness(current);
    } catch (_) {
      return markReadinessUnavailable(planRef.current);
    } finally {
      releaseEditingLock();
    }
  }, [acquireEditingLock, flushEdits, markReadinessUnavailable, releaseEditingLock, requestReadiness]);

  const loadVersions = useCallback(async () => {
    const currentPlanId = planRef.current?.planId;
    if (!currentPlanId) return [];
    setVersionsLoading(true);
    setVersionsError(null);
    try {
      const response = await getWorkflowPlanVersions(currentPlanId);
      const next = Array.isArray(response) ? response : response.versions || [];
      setVersions(next);
      return next;
    } catch (error) {
      setVersionsError(error);
      throw error;
    } finally {
      setVersionsLoading(false);
    }
  }, []);

  const restoreVersion = useCallback(async (version, hash) => {
    if (mutationLockRef.current || !planRef.current?.planId || !acquireEditingLock()) return null;
    setRestoringVersion(`${version}:${hash || ""}`);
    setRestoreError(null);
    try {
      const current = await flushEdits();
      const response = await restoreWorkflowPlanVersion(current.planId, {
        version: current.version,
        hash: current.hash,
        sourceVersion: version,
        sourceHash: hash,
      });
      const next = planFromResponse(response, sourceMessage);
      pendingOperationsRef.current = [];
      storePlan(next, { dirty: false });
      setSaveStatus("saved");
      invalidateReadiness(next);
      await loadVersions().catch(() => {});
      return next;
    } catch (error) {
      setRestoreError(error);
      notify?.({ type: "error", message: error?.message || "That plan version could not be restored." });
      throw error;
    } finally {
      setRestoringVersion(null);
      releaseEditingLock();
    }
  }, [acquireEditingLock, flushEdits, invalidateReadiness, loadVersions, notify, releaseEditingLock, sourceMessage, storePlan]);

  const askQuestion = useCallback(async (question) => {
    const trimmed = String(question || "").trim();
    if (!trimmed || !planRef.current?.planId) return null;
    const current = await flushEdits();
    setAskState({ status: "asking", question: trimmed, answer: "", proposedOperations: [], error: null });
    try {
      const response = await askWorkflowPlan(current.planId, {
        version: current.version,
        hash: current.hash,
        question: trimmed,
        projectId,
      });
      const next = {
        status: "answered",
        question: trimmed,
        answer: String(response.answer || response.message || ""),
        proposedOperations: Array.isArray(response.proposedOperations) ? response.proposedOperations : [],
        error: null,
      };
      setAskState(next);
      return next;
    } catch (error) {
      setAskState({ status: "error", question: trimmed, answer: "", proposedOperations: [], error });
      throw error;
    }
  }, [flushEdits, projectId]);

  const applyProposedOperations = useCallback(async () => {
    const operations = askState.proposedOperations;
    if (mutationLockRef.current || !operations.length || !planRef.current?.planId || !acquireEditingLock()) return null;
    try {
      const current = await flushEdits();
      const response = await updateWorkflowPlan(current.planId, {
        version: current.version,
        hash: current.hash,
        operations,
      });
      const next = planFromResponse(response, sourceMessage);
      storePlan(next, { dirty: false });
      setSaveStatus("saved");
      invalidateReadiness(next);
      setAskState((state) => ({ ...state, status: "applied", proposedOperations: [] }));
      return next;
    } finally {
      releaseEditingLock();
    }
  }, [acquireEditingLock, askState.proposedOperations, flushEdits, invalidateReadiness, releaseEditingLock, sourceMessage, storePlan]);

  const execute = useCallback(async () => {
    if (!acquireEditingLock()) return null;
    setExecutionState({ status: "checking", result: null, error: null });
    try {
      const current = await flushEdits();
      if (!current?.planId) throw new Error("Create a plan before executing it.");
      const checked = await requestReadiness(current);
      if (checked.status !== "checked" || !checked.canExecute || checked.blockers.length) {
        setExecutionState({ status: "blocked", result: null, error: null });
        return { blocked: true, readiness: checked };
      }
      setExecutionState({ status: "starting", result: null, error: null });
      const result = await executeWorkflowPlan(current.planId, {
        version: current.version,
        hash: current.hash,
      });
      setExecutionState({ status: "started", result, error: null });
      await onExecute?.({
        result,
        plan: current,
        sourceMessage,
        projectId,
        studioConnected: Boolean(studioConnected),
        studioTarget,
      });
      return result;
    } catch (error) {
      setExecutionState({ status: "error", result: null, error });
      notify?.({ type: "error", message: error?.message || "The plan could not start." });
      throw error;
    } finally {
      releaseEditingLock();
    }
  }, [acquireEditingLock, flushEdits, notify, onExecute, projectId, releaseEditingLock, requestReadiness, sourceMessage, studioConnected, studioTarget]);

  const retrySave = useCallback(async () => {
    if (saveStatus === "conflict" && planRef.current?.planId) {
      try {
        const response = await getWorkflowPlan(planRef.current.planId);
        const serverPlan = planFromResponse(response, sourceMessage);
        storePlan(withServerIdentity(planRef.current, serverPlan), { dirty: true });
      } catch (_) {
        // Keep the recovered local draft and let the fenced retry report the error.
      }
    }
    return flushEdits();
  }, [flushEdits, saveStatus, sourceMessage, storePlan]);

  return {
    sourceMessage,
    plan,
    loadState,
    loadError,
    saveStatus,
    saveError,
    readiness,
    readinessLoading,
    versions,
    versionsLoading,
    versionsError,
    restoringVersion,
    restoreError,
    editingLocked,
    regeneratingSectionId,
    askState,
    executionState,
    replaceSection,
    updateItem,
    addItem,
    removeItem,
    reorderItem,
    setSectionLocked,
    regenerateSection,
    checkReadiness,
    loadVersions,
    restoreVersion,
    askQuestion,
    applyProposedOperations,
    execute,
    flushEdits,
    retrySave,
  };
}
