import { act, renderHook } from "@testing-library/react";
import { useAiChat } from "./useAiChat";
import { auth } from "../firebase";
import { useBilling } from "../context/BillingContext";
import { ensureStreamSession } from "../lib/streamSession";
import { parseCompletedGenerateResult } from "../lib/streamRecovery";
import { onAiEvent } from "../lib/aiEvents";
import { FEATURE_FLAGS } from "../lib/featureFlags";
import { getStudioEnabledPreference } from "../lib/agentSteps";
import { getStudioStatus } from "../lib/studioBridgeApi";
import { doc, getDocs, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";

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
    auth.currentUser = null;
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
      "uses an MCP-only session without enabling plugin auto-push",
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
        targetPlaceId: "place_1",
        autoPushToStudio: false,
      },
    ],
    [
      "prefers Local MCP for hybrid runs when both providers serve the same place",
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
        targetPlaceId: "place_1",
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
});
