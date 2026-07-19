import { TextDecoder as NodeTextDecoder } from "util";
import { authedFetch } from "./billing";
import FEATURE_FLAGS from "./featureFlags";
import {
  TaskRuntimeError,
  amendTask,
  approveTask,
  cancelTask,
  createTask,
  getTask,
  getTaskEvents,
  listTasks,
  retryTask,
  streamTaskEvents,
} from "./taskRuntimeApi";

jest.mock("./billing", () => ({ authedFetch: jest.fn() }));
jest.mock("./featureFlags", () => {
  const flags = { newTaskRuntime: true };
  return { __esModule: true, default: flags, FEATURE_FLAGS: flags };
});

function response(data, { ok = true, status = 200, headers = {} } = {}) {
  const normalizedHeaders = Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value])
  );
  return {
    ok,
    status,
    headers: { get: (name) => normalizedHeaders[String(name).toLowerCase()] || null },
    text: jest.fn().mockResolvedValue(data === null ? "" : JSON.stringify(data)),
  };
}

function sseResponse(chunks) {
  let index = 0;
  return {
    ok: true,
    status: 200,
    headers: { get: () => null },
    body: {
      getReader: () => ({
        read: jest.fn(async () => {
          if (index >= chunks.length) return { done: true, value: undefined };
          const value = Buffer.from(chunks[index]);
          index += 1;
          return { done: false, value };
        }),
        releaseLock: jest.fn(),
      }),
    },
  };
}

describe("taskRuntimeApi", () => {
  beforeAll(() => {
    if (!global.TextDecoder) global.TextDecoder = NodeTextDecoder;
  });

  beforeEach(() => {
    FEATURE_FLAGS.newTaskRuntime = true;
    authedFetch.mockReset();
  });

  test("fails closed before making a request when the runtime flag is disabled", async () => {
    FEATURE_FLAGS.newTaskRuntime = false;

    await expect(getTask("task_1")).rejects.toMatchObject({
      code: "TASK_RUNTIME_DISABLED",
      status: 404,
    });
    expect(authedFetch).not.toHaveBeenCalled();
  });

  test("creates a task with mutation identity headers and normalizes projections", async () => {
    authedFetch.mockResolvedValue(response({
      task: { taskId: "task_1", status: "ACCEPTED", eventSequence: 2 },
      steps: [{ stepId: "step_1", status: "pending" }],
      allowedActions: ["cancel"],
      replayed: false,
    }));

    const result = await createTask({ intent: "Build a lobby" });

    expect(result.task).toMatchObject({
      taskId: "task_1",
      status: "accepted",
      eventSequence: 2,
      steps: [{ stepId: "step_1", status: "pending" }],
      allowedActions: ["cancel"],
    });
    expect(authedFetch).toHaveBeenCalledWith("/api/tasks", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ intent: "Build a lobby" }),
      headers: expect.objectContaining({
        "Content-Type": "application/json",
        "Idempotency-Key": expect.any(String),
        "X-Request-ID": expect.any(String),
      }),
    }));
  });

  test("normalizes list, task, and cursor-based event responses", async () => {
    authedFetch
      .mockResolvedValueOnce(response({ tasks: [{ id: "task_1", status: "RUNNING" }], nextCursor: "next" }))
      .mockResolvedValueOnce(response({ task: { id: "task_1", status: "VERIFYING" } }))
      .mockResolvedValueOnce(response({
        events: [
          { eventId: "event_3", sequence: 3, eventType: "step.started", payload: {} },
          { eventId: "event_2", sequence: 2, eventType: "step.ready", payload: {} },
        ],
        eventSequence: 3,
      }));

    await expect(listTasks({ activeOnly: true, limit: 20 })).resolves.toMatchObject({
      tasks: [{ taskId: "task_1", status: "running" }],
      nextCursor: "next",
    });
    await expect(getTask("task_1")).resolves.toMatchObject({
      task: { taskId: "task_1", status: "verifying" },
    });
    await expect(getTaskEvents("task_1", { afterSequence: 1, limit: 50 })).resolves.toMatchObject({
      events: [{ sequence: 2 }, { sequence: 3 }],
      lastSequence: 3,
    });

    expect(authedFetch.mock.calls[0][0]).toBe("/api/tasks?activeOnly=true&limit=20");
    expect(authedFetch.mock.calls[1][0]).toBe("/api/tasks/task_1");
    expect(authedFetch.mock.calls[2][0]).toBe("/api/tasks/task_1/events?afterSequence=1&limit=50");
  });

  test.each([
    ["cancel", cancelTask, {}],
    ["amend", amendTask, { instruction: "Keep the existing spawn." }],
    ["approve", approveTask, { stepId: "step_1" }],
    ["retry", retryTask, { stepId: "step_1" }],
  ])("posts the %s action to the canonical route", async (action, method, payload) => {
    authedFetch.mockResolvedValue(response({ task: { taskId: "task_1", status: "running" } }));

    await method("task_1", payload, { idempotencyKey: `idem_${action}`, requestId: `req_${action}` });

    expect(authedFetch).toHaveBeenCalledWith(`/api/tasks/task_1/${action}`, expect.objectContaining({
      method: "POST",
      body: JSON.stringify(payload),
      headers: expect.objectContaining({
        "Idempotency-Key": `idem_${action}`,
        "X-Request-ID": `req_${action}`,
      }),
    }));
  });

  test("turns a backend typed error into safe UI copy", async () => {
    authedFetch.mockResolvedValue(response({
      error: {
        code: "STUDIO_DISCONNECTED",
        message: "Error: socket secret\n    at internal.js:10:1",
        retryable: true,
        requestId: "req_support_1",
      },
    }, { ok: false, status: 409 }));

    const promise = getTask("task_1");
    await expect(promise).rejects.toBeInstanceOf(TaskRuntimeError);
    await expect(promise).rejects.toMatchObject({
      code: "STUDIO_DISCONNECTED",
      summary: "Reconnect Roblox Studio to continue this task.",
      requestId: "req_support_1",
    });
  });

  test("parses SSE frames and resumes after the supplied sequence", async () => {
    authedFetch.mockResolvedValue(sseResponse([
      ": keepalive\n\n",
      "id: 8\nevent: step.progress\ndata: {\"eventId\":\"event_8\",\"taskId\":\"task_1\",\"sequence\":8,\"payload\":{\"safeMessage\":\"Created the spawn.\"}}\n\n",
      "id: 9\ndata: {\"eventId\":\"event_9\",\"taskId\":\"task_1\",\"sequence\":9,\"eventType\":\"task.verifying\",\"payload\":{}}\n\n",
    ]));
    const onEvent = jest.fn();

    await expect(streamTaskEvents("task_1", { afterSequence: 7, onEvent })).resolves.toEqual({ lastSequence: 9 });

    expect(authedFetch).toHaveBeenCalledWith("/api/tasks/task_1/events?afterSequence=7", expect.objectContaining({
      headers: { Accept: "text/event-stream" },
    }));
    expect(onEvent).toHaveBeenNthCalledWith(1, expect.objectContaining({
      eventId: "event_8",
      sequence: 8,
      eventType: "step.progress",
    }));
    expect(onEvent).toHaveBeenNthCalledWith(2, expect.objectContaining({ sequence: 9 }));
  });
});
