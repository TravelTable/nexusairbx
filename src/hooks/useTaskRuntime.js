import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FEATURE_FLAGS from "../lib/featureFlags";
import {
  TaskRuntimeError,
  amendTask,
  approveTask,
  cancelTask,
  createTask,
  getTask,
  getTaskEvents,
  listTasks,
  normalizeTask,
  normalizeTaskEvent,
  normalizeTaskRuntimeError,
  retryTask,
  streamTaskEvents,
} from "../lib/taskRuntimeApi";

const STORAGE_PREFIX = "nexus:task-runtime:v1";
const DEFAULT_POLL_INTERVAL_MS = 5000;
const MAX_RETAINED_EVENTS = 500;

export const TERMINAL_TASK_STATUSES = Object.freeze(["succeeded", "failed", "cancelled"]);

export function isTaskTerminal(statusOrTask) {
  const status = typeof statusOrTask === "string" ? statusOrTask : statusOrTask?.status;
  return TERMINAL_TASK_STATUSES.includes(String(status || "").trim().toLowerCase());
}

function firstString(...values) {
  const value = values.find((entry) => (
    (typeof entry === "string" && entry.trim())
    || (typeof entry === "number" && Number.isFinite(entry))
  ));
  return value === undefined || value === null ? "" : String(value);
}

function finiteSequence(value) {
  const sequence = Number(value);
  return Number.isFinite(sequence) && sequence > 0 ? sequence : 0;
}

function safeStorage(storage) {
  if (storage) return storage;
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch (_) {
    return null;
  }
}

export function getTaskRuntimeStorageKey({ userId, projectId, chatId } = {}) {
  const uid = firstString(userId).trim();
  if (!uid) return "";
  return [
    STORAGE_PREFIX,
    encodeURIComponent(uid),
    encodeURIComponent(firstString(projectId).trim() || "all-projects"),
    encodeURIComponent(firstString(chatId).trim() || "all-chats"),
  ].join(":");
}

function readPersistedTaskId(storage, key) {
  if (!storage || !key) return "";
  try {
    const parsed = JSON.parse(storage.getItem(key) || "null");
    if (typeof parsed === "string") return parsed;
    return firstString(parsed?.taskId);
  } catch (_) {
    try {
      return firstString(storage.getItem(key));
    } catch (_storageError) {
      return "";
    }
  }
}

function persistTaskId(storage, key, taskId) {
  if (!storage || !key) return;
  try {
    if (!taskId) storage.removeItem(key);
    else storage.setItem(key, JSON.stringify({ taskId, savedAt: new Date().toISOString() }));
  } catch (_) {
    // Persistence is a reconnect aid; the server ledger remains authoritative.
  }
}

function eventKey(event) {
  const sequence = finiteSequence(event?.sequence);
  if (sequence) return `sequence:${sequence}`;
  const eventId = firstString(event?.eventId, event?.id);
  if (eventId) return `event:${eventId}`;
  return "";
}

export function mergeTaskEvents(current = [], incoming = []) {
  const merged = [];
  const seen = new Set();
  [...(Array.isArray(current) ? current : []), ...(Array.isArray(incoming) ? incoming : [])]
    .map((event) => normalizeTaskEvent(event))
    .forEach((event) => {
      const key = eventKey(event);
      if (key && seen.has(key)) return;
      if (key) seen.add(key);
      merged.push(event);
    });
  merged.sort((a, b) => {
    const aSequence = finiteSequence(a.sequence);
    const bSequence = finiteSequence(b.sequence);
    if (aSequence && bSequence) return aSequence - bSequence;
    if (aSequence) return -1;
    if (bSequence) return 1;
    return String(a.recordedAt || a.occurredAt || "").localeCompare(String(b.recordedAt || b.occurredAt || ""));
  });
  return merged.slice(-MAX_RETAINED_EVENTS);
}

function actionAllowed(value) {
  if (value === true) return true;
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return value.allowed === true || value.authorized === true || value.enabled === true;
}

function addAllowedActions(target, candidate) {
  if (Array.isArray(candidate)) {
    candidate.forEach((entry) => {
      const name = typeof entry === "string" ? entry : firstString(entry?.action, entry?.name, entry?.id);
      if (name && (typeof entry === "string" || actionAllowed(entry))) target.add(name.toLowerCase());
    });
    return;
  }
  if (!candidate || typeof candidate !== "object") return;
  Object.entries(candidate).forEach(([name, value]) => {
    if (actionAllowed(value)) target.add(String(name).toLowerCase());
  });
}

/**
 * Action controls are fail closed: task status alone never grants a mutation.
 * The server must explicitly project each action as allowed.
 */
export function getAuthorizedTaskActions(task) {
  const allowed = new Set();
  [
    task?.allowedActions,
    task?.authorizedActions,
    task?.availableActions,
    task?.actions,
    task?.controls?.allowedActions,
    task?.controls?.actions,
    task?.permissions?.actions,
    task?.authorization?.actions,
  ].forEach((candidate) => addAllowedActions(allowed, candidate));
  return Object.freeze({
    cancel: allowed.has("cancel"),
    amend: allowed.has("amend"),
    approve: allowed.has("approve"),
    retry: allowed.has("retry"),
  });
}

function projectionFromEvent(event, currentTask) {
  const payload = event?.payload && typeof event.payload === "object" ? event.payload : {};
  const projection = payload.task || payload.taskProjection || payload.projection;
  if (projection && typeof projection === "object") return projection;
  if (payload.status || payload.currentStepId || payload.eventSequence) {
    return {
      ...(currentTask || {}),
      ...payload,
      taskId: firstString(payload.taskId, currentTask?.taskId, event?.taskId),
    };
  }
  return null;
}

function selectRestorableTask(tasks) {
  return [...(Array.isArray(tasks) ? tasks : [])]
    .filter((task) => task?.taskId && !isTaskTerminal(task))
    .sort((a, b) => {
      const aTime = Date.parse(a.updatedAt || a.createdAt || 0) || 0;
      const bTime = Date.parse(b.updatedAt || b.createdAt || 0) || 0;
      return bTime - aTime;
    })[0] || null;
}

function unauthorizedActionError(action) {
  return new TaskRuntimeError(`The server has not authorized ${action} for this task.`, {
    code: "TASK_ACTION_NOT_ALLOWED",
    status: 409,
    retryable: false,
  });
}

export function useTaskRuntime({
  user = null,
  userId: suppliedUserId = "",
  projectId = "",
  chatId = "",
  taskId: controlledTaskId = "",
  enabled = true,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
  storage: suppliedStorage = null,
} = {}) {
  const userId = firstString(suppliedUserId, user?.uid);
  const runtimeEnabled = FEATURE_FLAGS.newTaskRuntime && enabled !== false;
  const storage = useMemo(() => safeStorage(suppliedStorage), [suppliedStorage]);
  const storageKey = useMemo(() => getTaskRuntimeStorageKey({ userId, projectId, chatId }), [
    userId,
    projectId,
    chatId,
  ]);
  const [selectedTaskId, setSelectedTaskId] = useState(() => firstString(controlledTaskId));
  const [task, setTask] = useState(null);
  const [events, setEvents] = useState([]);
  const [lastSequence, setLastSequence] = useState(0);
  const [loading, setLoading] = useState(runtimeEnabled);
  const [error, setError] = useState(null);
  const [connectionState, setConnectionState] = useState(runtimeEnabled ? "idle" : "disabled");
  const [busyAction, setBusyAction] = useState("");
  const taskRef = useRef(null);
  const lastSequenceRef = useRef(0);
  const selectedTaskIdRef = useRef(selectedTaskId);
  const selectionScopeRef = useRef(storageKey);

  const applyTask = useCallback((nextTask) => {
    if (!nextTask) return null;
    const rawTask = nextTask?.task || nextTask;
    const definedTask = Object.fromEntries(
      Object.entries(rawTask || {}).filter(([, value]) => value !== undefined)
    );
    const incomingTaskId = firstString(definedTask.taskId, definedTask.id);
    const currentTaskId = firstString(taskRef.current?.taskId);
    const baseTask = incomingTaskId && currentTaskId && incomingTaskId !== currentTaskId
      ? {}
      : (taskRef.current || {});
    const merged = normalizeTask({ ...baseTask, ...definedTask });
    taskRef.current = merged;
    setTask(merged);
    if (merged.taskId) {
      selectedTaskIdRef.current = merged.taskId;
      setSelectedTaskId(merged.taskId);
    }
    const sequence = finiteSequence(merged.eventSequence);
    if (sequence > lastSequenceRef.current) {
      lastSequenceRef.current = sequence;
      setLastSequence(sequence);
    }
    return merged;
  }, []);

  const applyEvents = useCallback((nextEvents, serverSequence = 0) => {
    const normalized = (Array.isArray(nextEvents) ? nextEvents : []).map(normalizeTaskEvent);
    setEvents((current) => mergeTaskEvents(current, normalized));
    normalized.forEach((event) => {
      const sequence = finiteSequence(event.sequence);
      if (sequence > lastSequenceRef.current) lastSequenceRef.current = sequence;
      const projection = projectionFromEvent(event, taskRef.current);
      if (projection) applyTask(projection);
    });
    const sequence = Math.max(
      finiteSequence(serverSequence),
      ...normalized.map((event) => finiteSequence(event.sequence))
    );
    if (sequence > lastSequenceRef.current) lastSequenceRef.current = sequence;
    setLastSequence(lastSequenceRef.current);
  }, [applyTask]);

  useEffect(() => {
    selectedTaskIdRef.current = selectedTaskId;
    // Do not clear a durable pointer during the hook's initial restore pass.
    // Explicit clearTask handles removal when the user dismisses a task.
    if (selectedTaskId && selectionScopeRef.current === storageKey) {
      persistTaskId(storage, storageKey, selectedTaskId);
    }
  }, [selectedTaskId, storage, storageKey]);

  useEffect(() => {
    let cancelled = false;
    selectionScopeRef.current = storageKey;
    const controlled = firstString(controlledTaskId);
    taskRef.current = null;
    lastSequenceRef.current = 0;
    setTask(null);
    setEvents([]);
    setLastSequence(0);
    setError(null);

    if (!runtimeEnabled) {
      setSelectedTaskId("");
      setLoading(false);
      setConnectionState("disabled");
      return () => { cancelled = true; };
    }

    if (controlled) {
      setSelectedTaskId(controlled);
      setLoading(true);
      setConnectionState("connecting");
      return () => { cancelled = true; };
    }

    const persisted = readPersistedTaskId(storage, storageKey);
    if (persisted) {
      setSelectedTaskId(persisted);
      setLoading(true);
      setConnectionState("connecting");
      return () => { cancelled = true; };
    }

    if (!userId) {
      setSelectedTaskId("");
      setLoading(false);
      setConnectionState("idle");
      return () => { cancelled = true; };
    }

    setLoading(true);
    setConnectionState("connecting");
    listTasks({ projectId, chatId, activeOnly: true, limit: 20 })
      .then((result) => {
        if (cancelled) return;
        const restored = selectRestorableTask(result.tasks);
        if (restored) {
          applyTask(restored);
        } else {
          setSelectedTaskId("");
          setLoading(false);
          setConnectionState("idle");
        }
      })
      .catch((reason) => {
        if (cancelled || reason?.name === "AbortError") return;
        setError(normalizeTaskRuntimeError(reason, "Tasks could not be restored."));
        setLoading(false);
        setConnectionState("offline");
      });

    return () => { cancelled = true; };
  }, [
    applyTask,
    chatId,
    controlledTaskId,
    projectId,
    runtimeEnabled,
    storage,
    storageKey,
    userId,
  ]);

  useEffect(() => {
    const taskId = firstString(selectedTaskId);
    if (!runtimeEnabled || !taskId) return undefined;

    let stopped = false;
    let timer = null;
    let streamController = null;

    const clearTimer = () => {
      if (timer !== null) {
        window.clearTimeout(timer);
        timer = null;
      }
    };

    const finishIfTerminal = () => {
      if (!isTaskTerminal(taskRef.current)) return false;
      setLoading(false);
      setConnectionState("settled");
      return true;
    };

    const syncFromLedger = async () => {
      const afterSequence = lastSequenceRef.current;
      const [taskResult, eventResult] = await Promise.all([
        getTask(taskId),
        getTaskEvents(taskId, { afterSequence }),
      ]);
      if (stopped) return;
      applyEvents(eventResult.events, eventResult.lastSequence);
      applyTask(taskResult.task);
      setLoading(false);
      setError(null);
    };

    function schedulePollingFallback() {
      if (stopped || finishIfTerminal()) return;
      setConnectionState("polling");
      clearTimer();
      timer = window.setTimeout(async () => {
        if (stopped) return;
        try {
          await syncFromLedger();
          if (stopped || finishIfTerminal()) return;
          setConnectionState("reconnecting");
          await openLiveStream(false);
        } catch (reason) {
          if (stopped || reason?.name === "AbortError") return;
          setError(normalizeTaskRuntimeError(reason, "Task progress could not be refreshed."));
          schedulePollingFallback();
        }
      }, Math.max(1000, Number(pollIntervalMs) || DEFAULT_POLL_INTERVAL_MS));
    }

    async function openLiveStream(syncFirst = true) {
      if (stopped) return;
      try {
        if (syncFirst) await syncFromLedger();
        if (stopped || finishIfTerminal()) return;
        setConnectionState("live");
        streamController = new AbortController();
        await streamTaskEvents(taskId, {
          afterSequence: lastSequenceRef.current,
          signal: streamController.signal,
          onEvent: (event) => {
            if (stopped) return;
            applyEvents([event]);
            if (isTaskTerminal(taskRef.current)) streamController?.abort();
          },
        });
        if (stopped || finishIfTerminal()) return;
        setConnectionState("reconnecting");
        schedulePollingFallback();
      } catch (reason) {
        if (stopped) return;
        if (reason?.name === "AbortError" && finishIfTerminal()) return;
        setError(normalizeTaskRuntimeError(reason, "Live task progress was interrupted."));
        setConnectionState("reconnecting");
        schedulePollingFallback();
      }
    }

    setLoading(true);
    setConnectionState("connecting");
    openLiveStream(true);

    return () => {
      stopped = true;
      clearTimer();
      streamController?.abort();
    };
  }, [applyEvents, applyTask, pollIntervalMs, runtimeEnabled, selectedTaskId]);

  const refresh = useCallback(async () => {
    const taskId = firstString(selectedTaskIdRef.current);
    if (!runtimeEnabled || !taskId) return null;
    setLoading(true);
    try {
      const taskResult = await getTask(taskId);
      const eventResult = await getTaskEvents(taskId, { afterSequence: lastSequenceRef.current });
      applyEvents(eventResult.events, eventResult.lastSequence);
      applyTask(taskResult.task);
      setError(null);
      setConnectionState(isTaskTerminal(taskResult.task) ? "settled" : "reconnecting");
      return taskResult.task;
    } catch (reason) {
      if (reason?.name === "AbortError") throw reason;
      const normalized = normalizeTaskRuntimeError(reason);
      setError(normalized);
      throw normalized;
    } finally {
      setLoading(false);
    }
  }, [applyEvents, applyTask, runtimeEnabled]);

  const runMutation = useCallback(async (action, operation) => {
    if (!runtimeEnabled) throw new TaskRuntimeError("The durable task runtime is not enabled.", {
      code: "TASK_RUNTIME_DISABLED",
      status: 404,
    });
    setBusyAction(action);
    setError(null);
    try {
      const result = await operation();
      if (result?.task) applyTask(result.task);
      return result;
    } catch (reason) {
      const normalized = normalizeTaskRuntimeError(reason);
      setError(normalized);
      throw normalized;
    } finally {
      setBusyAction("");
    }
  }, [applyTask, runtimeEnabled]);

  const startTask = useCallback((input, options) => runMutation("create", async () => {
    const result = await createTask(input, options);
    setEvents([]);
    lastSequenceRef.current = 0;
    setLastSequence(0);
    applyTask(result.task);
    return result;
  }), [applyTask, runMutation]);

  const requireAuthorized = useCallback((action) => {
    if (!getAuthorizedTaskActions(taskRef.current)[action]) throw unauthorizedActionError(action);
  }, []);

  const cancel = useCallback((payload = {}, options) => runMutation("cancel", () => {
    requireAuthorized("cancel");
    return cancelTask(selectedTaskIdRef.current, payload, options);
  }), [requireAuthorized, runMutation]);

  const amend = useCallback((instructionOrPayload, options) => runMutation("amend", () => {
    requireAuthorized("amend");
    const payload = typeof instructionOrPayload === "string"
      ? { instruction: instructionOrPayload }
      : instructionOrPayload;
    return amendTask(selectedTaskIdRef.current, payload, options);
  }), [requireAuthorized, runMutation]);

  const approve = useCallback((payload = {}, options) => runMutation("approve", () => {
    requireAuthorized("approve");
    return approveTask(selectedTaskIdRef.current, payload, options);
  }), [requireAuthorized, runMutation]);

  const retry = useCallback((payload = {}, options) => runMutation("retry", () => {
    requireAuthorized("retry");
    return retryTask(selectedTaskIdRef.current, payload, options);
  }), [requireAuthorized, runMutation]);

  const selectTask = useCallback((taskOrId) => {
    const nextTask = typeof taskOrId === "object" ? normalizeTask(taskOrId) : null;
    const nextId = firstString(nextTask?.taskId, taskOrId);
    taskRef.current = nextTask;
    lastSequenceRef.current = finiteSequence(nextTask?.eventSequence);
    setTask(nextTask);
    setEvents([]);
    setLastSequence(lastSequenceRef.current);
    setSelectedTaskId(nextId);
    setError(null);
    setConnectionState(nextId ? "connecting" : "idle");
  }, []);

  const clearTask = useCallback(() => {
    taskRef.current = null;
    lastSequenceRef.current = 0;
    setTask(null);
    setEvents([]);
    setLastSequence(0);
    setSelectedTaskId("");
    setError(null);
    setConnectionState(runtimeEnabled ? "idle" : "disabled");
    persistTaskId(storage, storageKey, "");
  }, [runtimeEnabled, storage, storageKey]);

  const authorizedActions = useMemo(() => getAuthorizedTaskActions(task), [task]);

  return {
    enabled: runtimeEnabled,
    taskId: selectedTaskId,
    task,
    events,
    lastSequence,
    loading,
    error,
    connectionState,
    busyAction,
    authorizedActions,
    isTerminal: isTaskTerminal(task),
    startTask,
    selectTask,
    clearTask,
    refresh,
    cancel,
    amend,
    approve,
    retry,
  };
}

export default useTaskRuntime;
