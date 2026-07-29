import { act, renderHook, waitFor } from "@testing-library/react";
import { resolveResultUrl, useAiChat, waitForAuthoritativeRunJob } from "./useAiChat";
import { auth } from "../firebase";
import { useBilling } from "../context/BillingContext";
import { ensureStreamSession } from "../lib/streamSession";
import { parseCompletedGenerateResult } from "../lib/streamRecovery";
import { onAiEvent } from "../lib/aiEvents";
import { FEATURE_FLAGS } from "../lib/featureFlags";
import { getStudioEnabledPreference } from "../lib/agentSteps";
import { getStudioStatus } from "../lib/studioBridgeApi";
import { doc, getDocs, onSnapshot, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import {
  applyStreamActivity,
  createPendingStreamState,
  getPendingStreamSnapshot,
} from "../lib/streaming";
import {
  cancelAgentRunV2,
  extractAgentEvents,
  getAgentEventsV2,
  getAgentV2,
  getRuntimeCapabilitiesV2,
  resolveChatAgentProjectionV2,
  selectAgentRuntimeRoute,
} from "../lib/agentRuntimeV2Api";

jest.mock("../firebase", () => ({
  auth: {
    currentUser: null,
  },
  db: {},
}));

jest.mock("../lib/verifiedFirestoreUser", () => ({
  requireVerifiedFirestoreUser: jest.fn((user) => Promise.resolve(user)),
}));

jest.mock("firebase/firestore", () => ({
  addDoc: jest.fn(),
  collection: jest.fn((...segments) => ({ segments })),
  deleteDoc: jest.fn(),
  doc: jest.fn((...segments) => ({ segments })),
  getDocs: jest.fn(() => Promise.resolve({
    docs: [],
  })),
  limit: jest.fn(),
  limitToLast: jest.fn(),
  onSnapshot: jest.fn(() => jest.fn()),
  orderBy: jest.fn(),
  query: jest.fn((...segments) => ({ segments })),
  serverTimestamp: jest.fn(() => "timestamp"),
  setDoc: jest.fn(() => Promise.resolve()),
  updateDoc: jest.fn(() => Promise.resolve()),
  writeBatch: jest.fn(),
}));

jest.mock("../lib/streamSession", () => ({
  ensureStreamSession: jest.fn(),
}));

jest.mock("../lib/streamRecovery", () => ({
  RECOVERY_WALL_TIMEOUT_MS: 10_000,
  buildStreamUrl: jest.fn(() => "http://localhost/stream"),
  formatRecoveryStage: jest.fn(() => "Recovering"),
  parseCompletedGenerateResult: jest.fn(() => null),
  pollJobResult: jest.fn(),
  updateSeqFromPayload: jest.fn((seq) => seq),
}));

jest.mock("../lib/featureFlags", () => ({
  FEATURE_FLAGS: {
    rawReasoning: false,
    streamV2: false,
    unifiedAgent: false,
    newTaskRuntime: false,
  },
}));

jest.mock("../lib/agentSteps", () => ({
  getStudioApplyMode: jest.fn(() => "manual"),
  getStudioEnabledPreference: jest.fn(() => false),
  normalizeToolStep: jest.fn((step) => step),
  upsertAgentStep: jest.fn((steps, step) => [...steps, step]),
}));

jest.mock("../lib/gameProfile", () => ({
  resolveGameSpecForPrompt: jest.fn((value) => value || null),
}));

jest.mock("../lib/studioBridgeApi", () => ({
  getStudioStatus: jest.fn(),
}));

jest.mock("../lib/workflowApi", () => ({
  getAgentRun: jest.fn(),
}));

jest.mock("../lib/agentRuntimeV2Api", () => ({
  AgentRuntimeUnavailableError: class AgentRuntimeUnavailableError extends Error {},
  cancelAgentRunV2: jest.fn(() => Promise.resolve({ run: { status: "cancelled" } })),
  extractAgentEvents: jest.fn((value) => value?.events || value?.data?.events || []),
  getAgentEventsV2: jest.fn(),
  getAgentV2: jest.fn(),
  getRuntimeCapabilitiesV2: jest.fn(() => Promise.resolve(null)),
  normalizeAgentProjection: jest.fn((value) => value?.agent || value),
  resolveChatAgentProjectionV2: jest.fn(),
  selectAgentRuntimeRoute: jest.fn(() => "unknown"),
}));

jest.mock("../lib/streaming", () => ({
  applyReasoningDelta: jest.fn((state) => state || { activitySeq: 0 }),
  applyStreamActivity: jest.fn((state) => state || { activitySeq: 0 }),
  applyStreamDelta: jest.fn((state) => state || { activitySeq: 0 }),
  createPendingStreamState: jest.fn(() => ({ activitySeq: 0, files: [] })),
  formatPendingStreamContent: jest.fn(() => ""),
  getPendingStreamSnapshot: jest.fn((state) => ({ files: [], ...(state || {}) })),
}));

jest.mock("../lib/streamMetrics", () => ({
  emitStreamMetric: jest.fn(),
}));

jest.mock("../lib/streamEngagement", () => ({
  createIdlePulseController: jest.fn(() => ({
    dispose: jest.fn(),
    notifyActivity: jest.fn(),
    start: jest.fn(),
  })),
  stageSlug: jest.fn((label) => String(label || "").toLowerCase()),
}));

jest.mock("../lib/aiEvents", () => ({
  AI_EVENTS: {
    APPLY_CODE_PATCH: "apply_code_patch",
  },
  emitAiEvent: jest.fn(),
  onAiEvent: jest.fn(() => jest.fn()),
}));

jest.mock("../context/BillingContext", () => ({
  useBilling: jest.fn(),
}));

jest.mock("../lib/billingErrors", () => ({
  ...jest.requireActual("../lib/billingErrors"),
  insufficientTokensToast: jest.fn(() => ({
    message: "Out of tokens",
    type: "error",
  })),
  isInsufficientTokensError: jest.fn(() => false),
}));

function latestMessagesSnapshotCallback() {
  const calls = [...onSnapshot.mock.calls].reverse();
  const subscription = calls.find(([target]) => (
    Array.isArray(target?.segments)
    && target.segments.some((segment) => (
      Array.isArray(segment?.segments) && segment.segments.includes("messages")
    ))
  ));
  // The messages listener is installed after the chat metadata listener.
  // Keep the fallback resilient to Firestore mock shapes that do not retain
  // the nested collection reference.
  return subscription?.[1] || calls[0]?.[1] || null;
}

function openChatWithMessages(result, messages, chatId = "chat_recovery") {
  act(() => {
    result.current.openChatById(chatId);
  });
  const snapshotCallback = latestMessagesSnapshotCallback();
  if (!snapshotCallback) throw new Error("Messages subscription was not created.");
  act(() => {
    snapshotCallback({
      docs: messages.map(({ id, ...data }) => ({
        id,
        data: () => data,
      })),
    });
  });
}

describe("resolveResultUrl", () => {
  test("does not treat an opaque job UUID as a fetch path", () => {
    const jobId = "cd289c08-978a-4d5a-bd8d-993be4302929";

    expect(resolveResultUrl(jobId, jobId)).toContain(
      `/api/generate/result?jobId=${encodeURIComponent(jobId)}`
    );
    expect(resolveResultUrl(jobId, jobId)).not.toMatch(new RegExp(`/${jobId}$`));
  });

  test("preserves supported absolute and API result URLs", () => {
    expect(resolveResultUrl("job_1", "https://results.example.test/job_1"))
      .toBe("https://results.example.test/job_1");
    expect(resolveResultUrl("job_1", "/api/generate/result?jobId=job_1"))
      .toContain("/api/generate/result?jobId=job_1");
    expect(resolveResultUrl("job_1", "api/generate/result?jobId=job_1"))
      .toContain("/api/generate/result?jobId=job_1");
  });
});

describe("useAiChat", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cancelAgentRunV2.mockResolvedValue({ run: { status: "cancelled" } });
    useBilling.mockReturnValue({
      plan: "FREE",
      totalRemaining: 10,
      unlimitedTokens: false,
    });
    doc.mockImplementation((...segments) => ({ segments }));
    getDocs.mockResolvedValue({ docs: [] });
    onSnapshot.mockImplementation(() => jest.fn());
    serverTimestamp.mockImplementation(() => "timestamp");
    setDoc.mockImplementation(() => Promise.resolve());
    updateDoc.mockImplementation(() => Promise.resolve());
    onAiEvent.mockImplementation(() => jest.fn());
    createPendingStreamState.mockImplementation(() => ({ activitySeq: 0, files: [] }));
    applyStreamActivity.mockImplementation((state) => state || { activitySeq: 0, files: [] });
    getPendingStreamSnapshot.mockImplementation((state) => ({ files: [], ...(state || {}) }));
    ensureStreamSession.mockResolvedValue({ token: null });
    parseCompletedGenerateResult.mockReturnValue(null);
    FEATURE_FLAGS.unifiedAgent = false;
    FEATURE_FLAGS.newTaskRuntime = false;
    getStudioEnabledPreference.mockReturnValue(false);
    getStudioStatus.mockReset();
    getRuntimeCapabilitiesV2.mockResolvedValue({
      executionOwner: "canonical_task_runtime",
      canonicalAgentRuns: { enabled: true, requiresProject: true },
      legacyGeneration: { enabled: true },
    });
    selectAgentRuntimeRoute.mockImplementation((capabilities, { projectId } = {}) => {
      if (!capabilities) return "unknown";
      if (capabilities.executionOwner !== "canonical_task_runtime"
        || capabilities.canonicalAgentRuns?.enabled !== true) return "legacy";
      if (capabilities.canonicalAgentRuns?.requiresProject === true && !projectId) return "legacy";
      return "canonical";
    });
    resolveChatAgentProjectionV2.mockImplementation(({ chatId, projectId }) => ({
      agent: { agentId: "agent-1", chatId, projectId },
      resolution: "resolved",
    }));
    extractAgentEvents.mockImplementation((value) => value?.events || value?.data?.events || []);
    getAgentV2.mockReset();
    auth.currentUser = null;
  });

  test("keeps a projectless New Chat on legacy execution without fabricating an agent id", async () => {
    const user = { uid: "user_1", getIdToken: jest.fn().mockResolvedValue("token_1") };
    auth.currentUser = user;
    const settings = {};
    const refreshBilling = jest.fn();
    const notify = jest.fn();
    const { result } = renderHook(() => useAiChat(user, settings, refreshBilling, notify));

    let chatId;
    await act(async () => {
      chatId = await result.current.startNewChat();
    });
    expect(chatId).toEqual(expect.any(String));
    const creationCall = setDoc.mock.calls.find(([, payload]) => payload?.chatId === chatId);
    expect(creationCall).toBeTruthy();
    expect(creationCall[1]).toEqual(expect.objectContaining({
      chatId,
      projectId: null,
    }));
    expect(creationCall[1]).not.toHaveProperty("agentId");
    expect(creationCall[1]).not.toHaveProperty("agentRuntimeStatus");
    expect(creationCall[1]).not.toHaveProperty("agentRuntimeError");
    expect(resolveChatAgentProjectionV2).not.toHaveBeenCalled();
  });

  test("finalizes a completed assistant message without rewriting createdAt", async () => {
    const user = {
      uid: "user_1",
      getIdToken: jest.fn().mockResolvedValue("token_1"),
    };
    auth.currentUser = user;
    const notify = jest.fn();
    const completed = {
      title: "Fly GUI",
      explanation: "Generated a fly GUI",
      files: [{ path: "ReplicatedStorage/FlyConfig", content: "return {}" }],
      runId: "run_1",
    };
    parseCompletedGenerateResult.mockReturnValue(completed);
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        headers: { get: () => "application/json" },
        json: async () => ({
          jobId: "job_1",
          resultUrl: "/api/generate/result?jobId=job_1",
          runId: "run_1",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        headers: { get: () => "application/json" },
        json: async () => ({ status: "done", result: completed }),
      });

    const { result } = renderHook(() => useAiChat(user, { chatMode: "agent" }, jest.fn(), notify));

    await act(async () => {
      await result.current.handleSubmit(
        "hi make a fly gui",
        "chat_1",
        "req_finalize",
        "agent",
        true
      );
    });

    const terminalWrites = [
      ...setDoc.mock.calls.map((args) => ({ fn: "setDoc", args })),
      ...updateDoc.mock.calls.map((args) => ({ fn: "updateDoc", args })),
    ].filter(({ args: [ref, payload] }) => (
      Array.isArray(ref?.segments)
      && ref.segments.includes("req_finalize-assistant")
      && payload?.pending === false
      && payload?.title === "Fly GUI"
    ));

    expect(terminalWrites).toHaveLength(1);
    const [{ fn, args }] = terminalWrites;
    const [, payload, options] = args;
    expect(payload).not.toHaveProperty("createdAt");
    expect(payload).toEqual(expect.objectContaining({
      pending: false,
      title: "Fly GUI",
      jobId: "job_1",
      runId: "run_1",
      requestId: "req_finalize",
    }));
    if (fn === "setDoc") {
      expect(options).toEqual({ merge: true });
    } else {
      expect(fn).toBe("updateDoc");
    }
  });

  test("persists an assistant failure when result recovery fails without a run id", async () => {
    const user = {
      uid: "user_1",
      getIdToken: jest.fn().mockResolvedValue("token_1"),
    };
    auth.currentUser = user;
    const notify = jest.fn();

    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        headers: { get: () => "application/json" },
        json: async () => ({
          jobId: "job_1",
          resultUrl: "/api/generate/result?jobId=job_1",
          runId: null,
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: { get: () => "application/json" },
        json: async () => ({
          code: "GENERATION_FAILED",
          message: "Worker crashed",
        }),
      });

    const { result } = renderHook(() => useAiChat(user, { chatMode: "agent" }, jest.fn(), notify));

    let thrown = null;
    await act(async () => {
      try {
        await result.current.handleSubmit(
          "Build a round system",
          "chat_1",
          "req_1",
          "agent",
          true
        );
      } catch (error) {
        thrown = error;
      }
    });

    expect(thrown).toBeInstanceOf(Error);
    expect(thrown.message).toBe("Worker crashed");
    expect(setDoc).toHaveBeenCalledWith(
      expect.objectContaining({
        segments: expect.arrayContaining(["req_1-assistant"]),
      }),
      expect.objectContaining({
        jobId: "job_1",
        pending: true,
        requestId: "req_1",
        role: "assistant",
      }),
      { merge: true }
    );
    expect(updateDoc).toHaveBeenCalledWith(
      expect.objectContaining({
        segments: expect.arrayContaining(["req_1-assistant"]),
      }),
      expect.objectContaining({
        error: "Worker crashed",
        errorCode: "GENERATION_FAILED",
        pending: false,
        stage: "failed",
      })
    );
  });

  test.each([
    [
      "uses an MCP-only session without inferring a Studio target",
      [{
        id: "mcp_1",
        connectionType: "mcp_local",
        status: "connected",
        live: true,
        connectorLive: true,
        mcpServerAvailable: true,
        placeId: "place_1",
        lastSeenAt: 200,
      }],
      {
        studioSessionId: "mcp_1",
        studioConnectionType: "mcp_local",
        routingMode: "hybrid",
        targetPlaceId: null,
        autoPushToStudio: false,
      },
    ],
    [
      "prefers Local MCP transport without inferring a target from matching place ids",
      [
        {
          id: "mcp_1",
          connectionType: "mcp_local",
          status: "connected",
          live: true,
          connectorLive: true,
          mcpServerAvailable: true,
          placeId: "place_1",
          lastSeenAt: 200,
        },
        {
          id: "plugin_1",
          connectionType: "plugin_bridge",
          status: "connected",
          live: true,
          studio: { placeId: "place_1" },
          lastSeenAt: 100,
        },
      ],
      {
        studioSessionId: "mcp_1",
        studioConnectionType: "mcp_local",
        routingMode: "hybrid",
        targetPlaceId: null,
        autoPushToStudio: false,
      },
    ],
    [
      "does not infer a target when live providers report different places",
      [
        {
          id: "mcp_1",
          connectionType: "mcp_local",
          status: "connected",
          live: true,
          connectorLive: true,
          mcpServerAvailable: true,
          placeId: "place_1",
        },
        {
          id: "plugin_2",
          connectionType: "plugin_bridge",
          status: "connected",
          live: true,
          studio: { placeId: "place_2" },
        },
      ],
      {
        studioSessionId: "mcp_1",
        studioConnectionType: "mcp_local",
        routingMode: "hybrid",
        targetPlaceId: null,
        autoPushToStudio: false,
      },
    ],
  ])("%s", async (_, sessions, expectedStudioContext) => {
    FEATURE_FLAGS.unifiedAgent = true;
    getStudioEnabledPreference.mockReturnValue(true);
    getStudioStatus.mockResolvedValue({ sessions });
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      headers: { get: () => "application/json" },
      json: async () => ({
        code: "GENERATION_FAILED",
        message: "Stop after request capture",
      }),
    });

    const user = {
      uid: "user_1",
      getIdToken: jest.fn().mockResolvedValue("token_1"),
    };
    auth.currentUser = user;
    const { result } = renderHook(() => useAiChat(
      user,
      { chatMode: "agent", studioAutoPushEnabled: true },
      jest.fn(),
      jest.fn()
    ));

    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    try {
      let submission;
      act(() => {
        submission = result.current.handleSubmit(
          "Inspect my project",
          "chat_1",
          "req_studio_context",
          "agent",
          true
        );
      });
      await submission;
    } finally {
      consoleError.mockRestore();
    }

    const [, request] = global.fetch.mock.calls[0];
    expect(JSON.parse(request.body)).toEqual(expect.objectContaining({
      studioEnabled: true,
      ...expectedStudioContext,
    }));
  });

  test("uses the artifact request as the only task intake and binds its top-level task id", async () => {
    FEATURE_FLAGS.newTaskRuntime = true;
    const user = {
      uid: "user_1",
      getIdToken: jest.fn().mockResolvedValue("token_1"),
    };
    auth.currentUser = user;
    const onTaskAccepted = jest.fn();
    // Stop immediately after intake; this test owns only the artifact request
    // contract and task binding, not assistant persistence or stream recovery.
    setDoc.mockRejectedValueOnce(new Error("Stop after task acceptance"));
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      headers: { get: () => "application/json" },
      json: async () => ({
        jobId: "job_task",
        taskId: "task_accepted",
        resultUrl: "/api/generate/result?jobId=job_task",
        runId: null,
      }),
    });

    const { result } = renderHook(() => useAiChat(
      user,
      { chatMode: "agent" },
      jest.fn(),
      jest.fn(),
    ));

    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    try {
      await result.current.handleSubmit(
        "Build a round system",
        "chat_1",
        "req_task",
        "agent",
        true,
        [],
        null,
        {
          projectId: " project_1 ",
          activeTaskId: " task_active ",
          showPlan: true,
          onTaskAccepted,
        },
      );
    } finally {
      consoleError.mockRestore();
    }

    const artifactCalls = global.fetch.mock.calls.filter(([url, request]) => (
      String(url).includes("/api/generate/artifact") && request?.method === "POST"
    ));
    expect(artifactCalls).toHaveLength(1);
    expect(global.fetch.mock.calls.some(([url]) => String(url).includes("/api/tasks"))).toBe(false);
    const [, artifactRequest] = artifactCalls[0];
    expect(artifactRequest.headers["Idempotency-Key"]).toBe("chat-req_task");
    expect(JSON.parse(artifactRequest.body)).toEqual(expect.objectContaining({
      requestId: "req_task",
      chatId: "chat_1",
      projectId: "project_1",
      activeTaskId: "task_active",
      showPlan: true,
    }));
    expect(onTaskAccepted).toHaveBeenCalledTimes(1);
    expect(onTaskAccepted).toHaveBeenCalledWith("task_accepted");
  });

  test("omits task intake fields and callbacks when the feature flag is disabled", async () => {
    const user = {
      uid: "user_1",
      getIdToken: jest.fn().mockResolvedValue("token_1"),
    };
    auth.currentUser = user;
    const onTaskAccepted = jest.fn();
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      headers: { get: () => "application/json" },
      json: async () => ({
        code: "GENERATION_FAILED",
        message: "Stop after request capture",
      }),
    });

    const { result } = renderHook(() => useAiChat(
      user,
      { chatMode: "agent" },
      jest.fn(),
      jest.fn(),
    ));

    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    try {
      await result.current.handleSubmit(
        "Build a round system",
        "chat_1",
        "req_legacy",
        "agent",
        true,
        [],
        null,
        {
          projectId: "project_1",
          activeTaskId: "task_active",
          showPlan: true,
          onTaskAccepted,
        },
      );
    } finally {
      consoleError.mockRestore();
    }

    const requestBody = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(requestBody).not.toHaveProperty("projectId");
    expect(requestBody).not.toHaveProperty("activeTaskId");
    expect(requestBody).not.toHaveProperty("showPlan");
    expect(onTaskAccepted).not.toHaveBeenCalled();
  });

  test("waits for queued admission and the backend-assigned job before attaching", async () => {
    const getEvents = jest.fn().mockResolvedValue({
      lastSequence: 12,
      events: [{
        sequence: 12,
        type: "run.admitted",
        payload: { runId: "run-queued" },
      }],
    });
    const getAgent = jest.fn()
      .mockResolvedValueOnce({
        agent: { agentId: "agent-1" },
        runs: [{ runId: "run-queued", status: "running", jobId: null }],
      })
      .mockResolvedValueOnce({
        agent: { agentId: "agent-1" },
        runs: [{ runId: "run-queued", status: "running", jobId: "job-queued" }],
      });
    const waitForPoll = jest.fn().mockResolvedValue();

    const run = await waitForAuthoritativeRunJob({
      agentId: "agent-1",
      runId: "run-queued",
      getEvents,
      getAgent,
      wait: waitForPoll,
    });

    expect(run).toEqual(expect.objectContaining({
      runId: "run-queued",
      jobId: "job-queued",
    }));
    expect(getEvents).toHaveBeenCalledTimes(1);
    expect(getEvents).toHaveBeenCalledWith(0);
    expect(getAgent).toHaveBeenCalledTimes(2);
    expect(waitForPoll).toHaveBeenCalledTimes(1);
  });

  test("finds the backend job from projection when the admitted event was missed", async () => {
    const getEvents = jest.fn().mockResolvedValue({ events: [] });
    const getAgent = jest.fn().mockResolvedValue({
      runs: [{
        runId: "run-projected",
        status: "running",
        jobId: "job-projected",
      }],
    });
    const waitForPoll = jest.fn();

    const run = await waitForAuthoritativeRunJob({
      agentId: "agent-1",
      runId: "run-projected",
      getEvents,
      getAgent,
      wait: waitForPoll,
    });

    expect(run).toEqual(expect.objectContaining({
      runId: "run-projected",
      jobId: "job-projected",
    }));
    expect(getEvents).toHaveBeenCalledTimes(1);
    expect(getAgent).toHaveBeenCalledTimes(1);
    expect(waitForPoll).not.toHaveBeenCalled();
  });

  test("checks projection after a bounded events request times out", async () => {
    jest.useFakeTimers();
    try {
      const getEvents = jest.fn(() => new Promise(() => {}));
      const getAgent = jest.fn().mockResolvedValue({
        runs: [{
          runId: "run-after-event-timeout",
          status: "running",
          jobId: "job-after-event-timeout",
        }],
      });
      const pendingRun = waitForAuthoritativeRunJob({
        agentId: "agent-1",
        runId: "run-after-event-timeout",
        timeoutMs: 30_000,
        getEvents,
        getAgent,
        wait: jest.fn(),
      });

      await Promise.resolve();
      jest.advanceTimersByTime(10_000);
      await Promise.resolve();
      await Promise.resolve();

      await expect(pendingRun).resolves.toEqual(expect.objectContaining({
        runId: "run-after-event-timeout",
        jobId: "job-after-event-timeout",
      }));
      expect(getEvents).toHaveBeenCalledTimes(1);
      expect(getAgent).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  test("keeps a queued run alive across a transient events disconnect", async () => {
    const getEvents = jest.fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({
        data: {
          lastSequence: 21,
          events: [{
            sequence: 21,
            type: "run.admitted",
            payload: { runId: "run-reconnect" },
          }],
        },
      });
    const getAgent = jest.fn().mockResolvedValue({
      runs: [{ runId: "run-reconnect", status: "running", jobId: "job-reconnect" }],
    });
    const onStatus = jest.fn();

    await expect(waitForAuthoritativeRunJob({
      agentId: "agent-1",
      runId: "run-reconnect",
      onStatus,
      getEvents,
      getAgent,
      wait: jest.fn().mockResolvedValue(),
    })).resolves.toEqual(expect.objectContaining({ jobId: "job-reconnect" }));

    expect(onStatus).toHaveBeenCalledWith("Queued — reconnecting...");
    expect(getEvents).toHaveBeenNthCalledWith(2, 0);
  });

  test("returns a durable failed state when a queued run terminates before job assignment", async () => {
    const getAgent = jest.fn();

    const run = await waitForAuthoritativeRunJob({
      agentId: "agent-1",
      runId: "run-failed",
      getEvents: jest.fn().mockResolvedValue({
        events: [{
          sequence: 1,
          type: "run.failed",
          payload: {
            runId: "run-failed",
            code: "WORKER_FAILED",
            error: "Worker failed",
          },
        }],
      }),
      getAgent,
      wait: jest.fn(),
    });

    expect(run).toEqual(expect.objectContaining({
      agentId: "agent-1",
      runId: "run-failed",
      status: "failed",
      terminal: true,
      code: "WORKER_FAILED",
    }));
    expect(getAgent).not.toHaveBeenCalled();
  });

  test("hands a queued run to the background at the admission deadline", async () => {
    let currentTime = 0;
    const waitForPoll = jest.fn(async (delayMs) => {
      currentTime += delayMs;
    });

    const run = await waitForAuthoritativeRunJob({
      agentId: "agent-1",
      runId: "run-timeout",
      timeoutMs: 100,
      now: () => currentTime,
      getEvents: jest.fn().mockResolvedValue({ events: [] }),
      getAgent: jest.fn(),
      wait: waitForPoll,
    });

    expect(run).toEqual(expect.objectContaining({
      agentId: "agent-1",
      runId: "run-timeout",
      status: "background",
      terminal: true,
      reason: "admission_timeout",
    }));
    expect(waitForPoll).toHaveBeenCalled();
  });

  test("aborts queued admission even when an events request is blocked", async () => {
    const controller = new AbortController();
    const pendingRun = waitForAuthoritativeRunJob({
      agentId: "agent-1",
      runId: "run-aborted",
      signal: controller.signal,
      timeoutMs: 10_000,
      getEvents: jest.fn(() => new Promise(() => {})),
      getAgent: jest.fn(),
      wait: jest.fn(),
    });

    controller.abort();

    await expect(pendingRun).rejects.toMatchObject({
      name: "AbortError",
      code: "ABORT_ERR",
    });
  });

  test("bounds a blocked jobless projection and keeps retrying it", async () => {
    jest.useFakeTimers();
    let unmount = null;
    try {
      const user = {
        uid: "user_1",
        getIdToken: jest.fn().mockResolvedValue("token_1"),
      };
      auth.currentUser = user;
      getAgentV2.mockImplementation(() => new Promise(() => {}));
      const hook = renderHook(() => useAiChat(
        user,
        { chatMode: "agent" },
        jest.fn(),
        jest.fn(),
      ));
      unmount = hook.unmount;

      await openChatWithMessages(hook.result, [{
        id: "queued-message",
        role: "assistant",
        content: "",
        pending: true,
        stage: "Queued",
        requestId: "request-queued",
        agentId: "agent-queued",
        runId: "run-queued",
        metadata: { mode: "agent", runState: "queued" },
      }]);

      expect(getAgentV2).toHaveBeenCalledTimes(1);
      act(() => {
        jest.advanceTimersByTime(10_001);
      });
      await Promise.resolve();
      await Promise.resolve();
      act(() => {
        jest.advanceTimersByTime(1_500);
      });
      await Promise.resolve();
      await Promise.resolve();

      expect(getAgentV2.mock.calls.length).toBeGreaterThanOrEqual(2);
    } finally {
      unmount?.();
      jest.useRealTimers();
    }
  });

  test("hands a jobless run to the background and continues canonical recovery", async () => {
    jest.useFakeTimers();
    let unmount = null;
    try {
      const user = {
        uid: "user_1",
        getIdToken: jest.fn().mockResolvedValue("token_1"),
      };
      auth.currentUser = user;
      getAgentV2.mockResolvedValue({
        runs: [{
          runId: "run-background",
          status: "queued",
          jobId: null,
        }],
      });
      const hook = renderHook(() => useAiChat(
        user,
        { chatMode: "agent" },
        jest.fn(),
        jest.fn(),
      ));
      unmount = hook.unmount;

      await openChatWithMessages(hook.result, [{
        id: "background-message",
        role: "assistant",
        content: "",
        pending: true,
        stage: "Queued",
        requestId: "request-background",
        agentId: "agent-background",
        runId: "run-background",
        metadata: { mode: "agent", runState: "queued" },
      }]);

      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      act(() => {
        jest.advanceTimersByTime(12 * 60 * 1_000);
      });
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      expect(updateDoc).toHaveBeenCalledWith(
        expect.objectContaining({
          segments: expect.arrayContaining(["background-message"]),
        }),
        expect.objectContaining({
          pending: false,
          stage: "background",
          metadata: expect.objectContaining({ runState: "background" }),
        }),
      );

      const callsAtHandoff = getAgentV2.mock.calls.length;
      act(() => {
        jest.advanceTimersByTime(30_000);
      });
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      expect(getAgentV2.mock.calls.length).toBeGreaterThan(callsAtHandoff);
    } finally {
      unmount?.();
      jest.useRealTimers();
    }
  });

  test("persists canonical terminal output when a jobless run completes", async () => {
    const user = {
      uid: "user_1",
      getIdToken: jest.fn().mockResolvedValue("token_1"),
    };
    auth.currentUser = user;
    getAgentV2.mockResolvedValue({
      runs: [{
        runId: "run-terminal",
        status: "completed",
        jobId: null,
        terminalDetails: {
          assetToolExecution: {
            message: "The Studio changes were applied.",
            receipts: [{
              summary: "Created ServerScriptService/RoundManager.",
            }],
          },
        },
      }],
    });
    const hook = renderHook(() => useAiChat(
      user,
      { chatMode: "agent" },
      jest.fn(),
      jest.fn(),
    ));

    await openChatWithMessages(hook.result, [{
      id: "terminal-message",
      role: "assistant",
      content: "",
      pending: true,
      stage: "Queued",
      requestId: "request-terminal",
      agentId: "agent-terminal",
      runId: "run-terminal",
      metadata: { mode: "agent", runState: "queued" },
    }]);

    await waitFor(() => {
      expect(updateDoc).toHaveBeenCalledWith(
        expect.objectContaining({
          segments: expect.arrayContaining(["terminal-message"]),
        }),
        expect.objectContaining({
          title: "Studio task completed",
          summary: expect.stringContaining("Created ServerScriptService/RoundManager."),
          pending: false,
          stage: "completed",
          agentId: "agent-terminal",
          runId: "run-terminal",
          metadata: expect.objectContaining({ runState: "completed" }),
        }),
      );
    });
    const terminalWrite = updateDoc.mock.calls.find(([, payload]) => (
      payload?.title === "Studio task completed"
    ));
    expect(terminalWrite[1].summary).toContain("The Studio changes were applied.");
    hook.unmount();
  });

  test("cancels the canonical server run when a queued submission is stopped", async () => {
    const user = {
      uid: "user_1",
      getIdToken: jest.fn().mockResolvedValue("token_1"),
    };
    auth.currentUser = user;
    const controller = new AbortController();
    getAgentEventsV2.mockImplementation(() => {
      controller.abort();
      return Promise.resolve({ events: [] });
    });
    const { result } = renderHook(() => useAiChat(
      user,
      { chatMode: "agent" },
      jest.fn(),
      jest.fn(),
    ));

    let submission;
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    try {
      act(() => {
        submission = result.current.handleSubmit(
          "Build a round system",
          "chat_1",
          "req_cancel_canonical",
          "agent",
          true,
          [],
          null,
          {
            authoritativeSignal: controller.signal,
            authoritativeRun: {
              authoritativeExecution: true,
              executionDisposition: "queued",
              run: {
                agentId: "agent_1",
                runId: "run_cancel_me",
                status: "queued",
                jobId: null,
              },
            },
          },
        );
      });
      await submission;
    } finally {
      consoleError.mockRestore();
    }

    expect(getAgentEventsV2).toHaveBeenCalled();
    expect(cancelAgentRunV2).toHaveBeenCalledTimes(1);
    expect(cancelAgentRunV2).toHaveBeenCalledWith("run_cancel_me", {
      reason: "user_cancelled",
    });
    expect(setDoc).toHaveBeenCalledWith(
      expect.objectContaining({
        segments: expect.arrayContaining(["req_cancel_canonical-assistant"]),
      }),
      expect.objectContaining({
        content: "Generation canceled.",
        pending: false,
        runId: "run_cancel_me",
        stage: "canceled",
      }),
      { merge: true },
    );
  });
});
