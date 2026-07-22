import { act, renderHook, waitFor } from "@testing-library/react";
import {
  TaskRuntimeError,
  getTask,
  getTaskEvents,
  listTasks,
  retryTask,
  streamTaskEvents,
} from "../lib/taskRuntimeApi";
import { FEATURE_FLAGS } from "../lib/featureFlags";
import useTaskRuntime, {
  getAuthorizedTaskActions,
  getTaskRuntimeStorageKey,
  isTaskTerminal,
  mergeTaskEvents,
} from "./useTaskRuntime";

jest.mock("../lib/featureFlags", () => {
  const flags = { newTaskRuntime: true };
  return { __esModule: true, default: flags, FEATURE_FLAGS: flags };
});

jest.mock("../lib/taskRuntimeApi", () => {
  const actual = jest.requireActual("../lib/taskRuntimeApi");
  return {
    ...actual,
    createTask: jest.fn(),
    listTasks: jest.fn(),
    getTask: jest.fn(),
    getTaskEvents: jest.fn(),
    streamTaskEvents: jest.fn(),
    cancelTask: jest.fn(),
    amendTask: jest.fn(),
    approveTask: jest.fn(),
    retryTask: jest.fn(),
  };
});

function memoryStorage() {
  const values = new Map();
  return {
    getItem: jest.fn((key) => values.get(key) || null),
    setItem: jest.fn((key, value) => values.set(key, String(value))),
    removeItem: jest.fn((key) => values.delete(key)),
  };
}

function runningTask(overrides = {}) {
  return {
    taskId: "task_1",
    status: "running",
    eventSequence: 2,
    currentStepId: "step_1",
    steps: [{ stepId: "step_1", description: "Create the spawn", status: "running", attemptCount: 1 }],
    ...overrides,
  };
}

function keepStreamOpen() {
  streamTaskEvents.mockImplementation((_taskId, { signal }) => new Promise((resolve, reject) => {
    const abort = () => {
      const reason = new Error("aborted");
      reason.name = "AbortError";
      reject(reason);
    };
    if (signal?.aborted) abort();
    else signal?.addEventListener?.("abort", abort, { once: true });
  }));
}

describe("useTaskRuntime helpers", () => {
  test("queued is not terminal and event sequences are deduplicated", () => {
    expect(isTaskTerminal("queued")).toBe(false);
    expect(isTaskTerminal("succeeded")).toBe(true);

    const events = mergeTaskEvents(
      [{ eventId: "event_2", sequence: 2, payload: { safeMessage: "first" } }],
      [
        { eventId: "duplicate", sequence: 2, payload: { safeMessage: "duplicate" } },
        { eventId: "event_3", sequence: 3, payload: { safeMessage: "next" } },
      ]
    );
    expect(events.map((event) => event.eventId)).toEqual(["event_2", "event_3"]);
  });

  test("actions fail closed unless the server explicitly projects authorization", () => {
    expect(getAuthorizedTaskActions({ status: "failed" })).toEqual({
      cancel: false,
      amend: false,
      approve: false,
      retry: false,
    });
    expect(getAuthorizedTaskActions({
      status: "failed",
      actions: { retry: { allowed: true }, cancel: false },
      allowedActions: ["amend"],
    })).toEqual({
      cancel: false,
      amend: true,
      approve: false,
      retry: true,
    });
  });
});

describe("useTaskRuntime", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    FEATURE_FLAGS.newTaskRuntime = true;
    FEATURE_FLAGS.newPlanningMode = false;
    listTasks.mockResolvedValue({ tasks: [] });
    getTask.mockResolvedValue({ task: runningTask() });
    getTaskEvents.mockResolvedValue({
      events: [{ eventId: "event_2", taskId: "task_1", sequence: 2, payload: { safeMessage: "Task restored." } }],
      lastSequence: 2,
    });
    retryTask.mockResolvedValue({ task: runningTask({ allowedActions: ["retry"] }) });
    keepStreamOpen();
  });

  test("keeps Plan Mode execution observable when the standalone runtime flag is staged off", async () => {
    FEATURE_FLAGS.newTaskRuntime = false;
    FEATURE_FLAGS.newPlanningMode = true;

    const { result } = renderHook(() => useTaskRuntime({ taskId: "task_1" }));

    await waitFor(() => expect(result.current.enabled).toBe(true));
    await waitFor(() => expect(result.current.connectionState).toBe("live"));
    expect(getTask).toHaveBeenCalledWith("task_1");
  });

  test("restores the durable task pointer before opening a resumed event stream", async () => {
    const storage = memoryStorage();
    const storageKey = getTaskRuntimeStorageKey({ userId: "user_1", projectId: "project_1", chatId: "chat_1" });
    storage.setItem(storageKey, JSON.stringify({ taskId: "task_1" }));

    const { result } = renderHook(() => useTaskRuntime({
      userId: "user_1",
      projectId: "project_1",
      chatId: "chat_1",
      storage,
    }));

    expect(storage.removeItem).not.toHaveBeenCalledWith(storageKey);
    await waitFor(() => expect(result.current.task?.taskId).toBe("task_1"));
    await waitFor(() => expect(result.current.connectionState).toBe("live"));

    expect(listTasks).not.toHaveBeenCalled();
    expect(getTask).toHaveBeenCalledWith("task_1");
    expect(getTaskEvents).toHaveBeenCalledWith("task_1", { afterSequence: 0 });
    expect(streamTaskEvents).toHaveBeenCalledWith("task_1", expect.objectContaining({ afterSequence: 2 }));
    expect(result.current.events).toHaveLength(1);
  });

  test("deduplicates replayed SSE events and advances the cursor", async () => {
    let streamOptions;
    streamTaskEvents.mockImplementation((_taskId, options) => {
      streamOptions = options;
      return new Promise((_resolve, reject) => {
        options.signal?.addEventListener?.("abort", () => {
          const reason = new Error("aborted");
          reason.name = "AbortError";
          reject(reason);
        }, { once: true });
      });
    });

    const { result } = renderHook(() => useTaskRuntime({ taskId: "task_1" }));
    await waitFor(() => expect(result.current.connectionState).toBe("live"));

    await act(async () => {
      await streamOptions.onEvent({
        eventId: "event_3",
        taskId: "task_1",
        sequence: 3,
        payload: { safeMessage: "Spawn created." },
      });
      await streamOptions.onEvent({
        eventId: "event_3_replay",
        taskId: "task_1",
        sequence: 3,
        payload: { safeMessage: "Replay." },
      });
    });

    expect(result.current.events.map((event) => event.sequence)).toEqual([2, 3]);
    expect(result.current.lastSequence).toBe(3);
  });

  test("falls back to ledger polling when the live stream disconnects", async () => {
    streamTaskEvents.mockRejectedValue(new TaskRuntimeError("Stream disconnected", {
      code: "STREAM_DISCONNECTED",
      retryable: true,
    }));

    const { result } = renderHook(() => useTaskRuntime({ taskId: "task_1", pollIntervalMs: 60_000 }));

    await waitFor(() => expect(result.current.connectionState).toBe("polling"));
    expect(result.current.error).toMatchObject({ code: "STREAM_DISCONNECTED", retryable: true });
    expect(result.current.task?.taskId).toBe("task_1");
  });

  test("executes retry only when the server authorizes it", async () => {
    getTask.mockResolvedValue({ task: runningTask({ status: "failed", allowedActions: ["retry"] }) });
    const { result } = renderHook(() => useTaskRuntime({ taskId: "task_1" }));
    await waitFor(() => expect(result.current.authorizedActions.retry).toBe(true));

    await act(async () => {
      await result.current.retry({ stepId: "step_1" }, { requestId: "req_retry" });
    });

    expect(retryTask).toHaveBeenCalledWith(
      "task_1",
      { stepId: "step_1" },
      { requestId: "req_retry" }
    );
  });

  test("rejects a client action that was not server-authorized", async () => {
    getTask.mockResolvedValue({ task: runningTask({ status: "failed", allowedActions: [] }) });
    const { result } = renderHook(() => useTaskRuntime({ taskId: "task_1" }));
    await waitFor(() => expect(result.current.task?.status).toBe("failed"));

    let caught;
    await act(async () => {
      try {
        await result.current.retry({ stepId: "step_1" });
      } catch (reason) {
        caught = reason;
      }
    });

    expect(caught).toMatchObject({ code: "TASK_ACTION_NOT_ALLOWED" });
    expect(retryTask).not.toHaveBeenCalled();
  });
});
