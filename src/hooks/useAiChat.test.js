import { act, renderHook } from "@testing-library/react";
import { useAiChat, waitForAuthoritativeRunJob } from "./useAiChat";
import { auth } from "../firebase";
import { useBilling } from "../context/BillingContext";
import { ensureStreamSession } from "../lib/streamSession";
import { parseCompletedGenerateResult } from "../lib/streamRecovery";
import { onAiEvent } from "../lib/aiEvents";
import { FEATURE_FLAGS } from "../lib/featureFlags";
import { getStudioEnabledPreference } from "../lib/agentSteps";
import { getStudioStatus } from "../lib/studioBridgeApi";
import { doc, getDocs, onSnapshot, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { createAgentV2, extractAgentEvents } from "../lib/agentRuntimeV2Api";

jest.mock("../firebase", () => ({
  auth: {
    currentUser: null,
  },
  db: {},
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
  createAgentV2: jest.fn(),
  extractAgentEvents: jest.fn((value) => value?.events || value?.data?.events || []),
  getAgentEventsV2: jest.fn(),
  getAgentV2: jest.fn(),
  normalizeAgentProjection: jest.fn((value) => value?.agent || value),
}));

jest.mock("../lib/streaming", () => ({
  applyReasoningDelta: jest.fn((state) => state),
  applyStreamActivity: jest.fn((state) => state),
  applyStreamDelta: jest.fn((state) => state),
  createPendingStreamState: jest.fn(() => ({ activitySeq: 0 })),
  formatPendingStreamContent: jest.fn(() => ""),
  getPendingStreamSnapshot: jest.fn((state) => state || {}),
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

describe("useAiChat", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    ensureStreamSession.mockResolvedValue({ token: null });
    parseCompletedGenerateResult.mockReturnValue(null);
    FEATURE_FLAGS.unifiedAgent = false;
    FEATURE_FLAGS.newTaskRuntime = false;
    getStudioEnabledPreference.mockReturnValue(false);
    getStudioStatus.mockReset();
    createAgentV2.mockResolvedValue({ agent: { agentId: "agent-1" } });
    extractAgentEvents.mockImplementation((value) => value?.events || value?.data?.events || []);
    auth.currentUser = null;
  });

  test("keeps a local New Chat without fabricating an agent id when projection is unavailable", async () => {
    const user = { uid: "user_1", getIdToken: jest.fn().mockResolvedValue("token_1") };
    auth.currentUser = user;
    createAgentV2.mockRejectedValueOnce(new Error("runtime disconnected"));
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const settings = {};
    const refreshBilling = jest.fn();
    const notify = jest.fn();
    const { result } = renderHook(() => useAiChat(user, settings, refreshBilling, notify));

    let chatId;
    await act(async () => {
      chatId = await result.current.startNewChat();
    });
    warn.mockRestore();

    expect(chatId).toEqual(expect.any(String));
    const creationCall = setDoc.mock.calls.find(([, payload]) => payload?.chatId === chatId);
    expect(creationCall).toBeTruthy();
    expect(creationCall[1]).toEqual(expect.objectContaining({
      chatId,
      agentRuntimeStatus: "unavailable",
      agentRuntimeError: "runtime disconnected",
    }));
    expect(creationCall[1]).not.toHaveProperty("agentId");
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
        errorCode: null,
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
});
