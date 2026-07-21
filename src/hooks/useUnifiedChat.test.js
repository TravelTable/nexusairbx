import { act, renderHook } from "@testing-library/react";
import { TextDecoder as NodeTextDecoder } from "util";
import { setDoc } from "firebase/firestore";
import { useUnifiedChat } from "./useUnifiedChat";
import { useAiChat } from "./useAiChat";
import { trackProductEvent } from "../lib/productAnalytics";
import { FEATURE_FLAGS } from "../lib/featureFlags";
import { getStudioApplyMode, getStudioEnabledPreference } from "../lib/agentSteps";
import { getStudioStatus } from "../lib/studioBridgeApi";
import { resolveGameSpecForPrompt } from "../lib/gameProfile";
import { orchestrate } from "../lib/workflowApi";
import { classifyUserIntent, isImplementationIntent } from "../lib/intentClassifier";
import {
  createAgentRunV2,
  createAgentV2,
  normalizeAgentProjection,
} from "../lib/agentRuntimeV2Api";

jest.mock("../firebase", () => ({
  db: {},
}));

jest.mock("firebase/firestore", () => ({
  addDoc: jest.fn(),
  collection: jest.fn(),
  doc: jest.fn(() => ({})),
  serverTimestamp: jest.fn(() => "timestamp"),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
}));

jest.mock("./useAiChat", () => ({
  useAiChat: jest.fn(),
}));

jest.mock("../lib/workflowApi", () => ({
  approveWorkflowPlan: jest.fn(),
  orchestrate: jest.fn(),
}));

jest.mock("../lib/planApproval", () => ({
  isExplicitPlanApproval: jest.fn(() => false),
}));

jest.mock("../lib/intentClassifier", () => ({
  classifyUserIntent: jest.fn(() => "IMPLEMENTATION"),
  isImplementationIntent: jest.fn(() => true),
}));

jest.mock("../lib/streaming", () => ({
  applyStreamActivity: jest.fn((state) => state),
  createPendingStreamState: jest.fn(() => ({})),
  getPendingStreamSnapshot: jest.fn((state) => state),
}));

jest.mock("../lib/streamEngagement", () => ({
  stageSlug: jest.fn((label) => String(label || "").toLowerCase()),
}));

jest.mock("../lib/gameProfile", () => ({
  resolveGameSpecForPrompt: jest.fn((value) => value || null),
}));

jest.mock("../lib/productAnalytics", () => ({
  categorizePrompt: jest.fn(() => "build_request"),
  trackProductEvent: jest.fn(),
}));

jest.mock("../lib/featureFlags", () => ({
  FEATURE_FLAGS: {
    unifiedAgent: false,
  },
}));

jest.mock("../lib/agentSteps", () => ({
  getStudioApplyMode: jest.fn(() => "manual_review"),
  getStudioEnabledPreference: jest.fn(() => false),
}));

jest.mock("../lib/studioBridgeApi", () => ({
  getStudioStatus: jest.fn(),
}));

jest.mock("../lib/agentRuntimeV2Api", () => ({
  createAgentRunV2: jest.fn(),
  createAgentV2: jest.fn(),
  normalizeAgentProjection: jest.fn((value) => value?.agent || value),
}));

jest.mock("./useStudioConnection", () => ({
  isStudioSessionLive: jest.fn(() => false),
}));

describe("useUnifiedChat", () => {
  const chatHandleSubmit = jest.fn();
  const originalFetch = global.fetch;
  const originalTextDecoder = global.TextDecoder;

  beforeEach(() => {
    jest.clearAllMocks();
    FEATURE_FLAGS.unifiedAgent = false;
    getStudioEnabledPreference.mockReturnValue(false);
    getStudioApplyMode.mockReturnValue("manual_review");
    resolveGameSpecForPrompt.mockImplementation((value) => value || null);
    classifyUserIntent.mockReturnValue("IMPLEMENTATION");
    isImplementationIntent.mockReturnValue(true);
    createAgentV2.mockResolvedValue({
      agent: { agentId: "agent-1", projectId: "project_1" },
    });
    normalizeAgentProjection.mockImplementation((value) => value?.agent || value);
    createAgentRunV2.mockResolvedValue({
      run: {
        runId: "run-1",
        agentId: "agent-1",
        jobId: "job-1",
        status: "running",
      },
      authoritativeExecution: true,
      executionDisposition: "launched",
    });
    global.TextDecoder = NodeTextDecoder;
    useAiChat.mockReturnValue({
      activeMode: "agent",
      currentChatId: null,
      generatingChatIds: [],
      generationStage: "",
      handleSubmit: chatHandleSubmit,
      isGenerating: false,
      messages: [],
      openChatById: jest.fn(),
      pendingMessage: null,
      setPendingForChat: jest.fn(),
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    global.TextDecoder = originalTextDecoder;
  });

  test("nudges sign-in instead of submitting when a signed-out user enters a prompt", async () => {
    const onSignInNudge = jest.fn();

    const { result } = renderHook(() =>
      useUnifiedChat(null, {}, jest.fn(), jest.fn(), { onSignInNudge })
    );

    await act(async () => {
      await result.current.handleSubmit("Build a lobby system", []);
    });

    expect(onSignInNudge).toHaveBeenCalledTimes(1);
    expect(chatHandleSubmit).not.toHaveBeenCalled();
    expect(trackProductEvent).toHaveBeenCalledWith(
      "signin_nudge_viewed",
      expect.objectContaining({
        generator_mode: "agent",
        landing_page: "/ai",
      }),
      expect.objectContaining({
        dedupeKey: expect.stringContaining("signin_nudge:"),
      })
    );
  });

  test("sends the exact selected MCP session and transport type for Ask mode", async () => {
    FEATURE_FLAGS.unifiedAgent = true;
    getStudioEnabledPreference.mockReturnValue(true);
    getStudioStatus.mockResolvedValue({
      sessions: [{
        id: "mcp_exact",
        connectionType: "mcp_local",
        status: "connected",
        live: true,
        connectorLive: true,
        mcpServerAvailable: true,
        capabilities: { readProject: true },
      }],
    });
    const setPendingForChat = jest.fn();
    useAiChat.mockReturnValue({
      activeMode: "ask",
      currentChatId: "chat-1",
      generatingChatIds: [],
      generationStage: "",
      handleSubmit: chatHandleSubmit,
      isGenerating: false,
      messages: [],
      openChatById: jest.fn(),
      pendingMessage: null,
      setPendingForChat,
    });
    const reader = {
      read: jest.fn()
        .mockResolvedValueOnce({
          done: false,
          value: Uint8Array.from(Array.from("Studio answer").map((character) => character.charCodeAt(0))),
        })
        .mockResolvedValueOnce({ done: true, value: undefined }),
    };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      body: { getReader: () => reader },
    });
    const user = { uid: "user-1", getIdToken: jest.fn().mockResolvedValue("token") };

    const { result } = renderHook(() =>
      useUnifiedChat(user, {}, jest.fn(), jest.fn())
    );

    await act(async () => {
      await result.current.handleSubmit("What does Main do?", [], null, { mode: "ask" });
    });

    const request = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(request).toEqual(expect.objectContaining({
      studioEnabled: true,
      studioSessionId: "mcp_exact",
      studioConnectionType: "mcp_local",
    }));
    expect(setPendingForChat).toHaveBeenCalled();
    expect(setDoc.mock.calls.some(([, payload]) => (
      payload?.role === "assistant" && payload?.content === "Studio answer"
    ))).toBe(true);
    expect(createAgentRunV2).not.toHaveBeenCalled();
  });

  test("keeps Ask available when the optional runtime projection is disconnected", async () => {
    FEATURE_FLAGS.unifiedAgent = true;
    createAgentV2.mockRejectedValueOnce(new Error("runtime disconnected"));
    const setPendingForChat = jest.fn();
    useAiChat.mockReturnValue({
      activeMode: "ask",
      currentChatId: "chat-1",
      generatingChatIds: [],
      generationStage: "",
      handleSubmit: chatHandleSubmit,
      isGenerating: false,
      messages: [],
      openChatById: jest.fn(),
      pendingMessage: null,
      setPendingForChat,
    });
    const reader = {
      read: jest.fn()
        .mockResolvedValueOnce({
          done: false,
          value: Uint8Array.from(Array.from("Read-only answer").map((character) => character.charCodeAt(0))),
        })
        .mockResolvedValueOnce({ done: true, value: undefined }),
    };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      body: { getReader: () => reader },
    });
    const user = { uid: "user-1", getIdToken: jest.fn().mockResolvedValue("token") };
    const consoleWarn = jest.spyOn(console, "warn").mockImplementation(() => {});

    try {
      const { result } = renderHook(() =>
        useUnifiedChat(user, {}, jest.fn(), jest.fn())
      );

      await act(async () => {
        await result.current.handleSubmit("Explain this architecture", [], null, { mode: "ask" });
      });
    } finally {
      consoleWarn.mockRestore();
    }

    expect(setDoc.mock.calls.some(([, payload]) => payload?.content === "Read-only answer")).toBe(true);
    expect(createAgentRunV2).not.toHaveBeenCalled();
  });

  test("routes conversational Agent prompts through grounded Studio chat instead of generic orchestration", async () => {
    FEATURE_FLAGS.unifiedAgent = true;
    getStudioEnabledPreference.mockReturnValue(true);
    classifyUserIntent.mockReturnValue("GENERAL_QUESTION");
    isImplementationIntent.mockReturnValue(false);
    getStudioStatus.mockResolvedValue({
      sessions: [{
        id: "mcp_agent_exact",
        connectionType: "mcp_local",
        status: "connected",
        live: true,
        connectorLive: true,
        mcpServerAvailable: true,
        capabilities: { readProject: true },
      }],
    });
    const setPendingForChat = jest.fn();
    useAiChat.mockReturnValue({
      activeMode: "agent",
      currentChatId: "chat-1",
      generatingChatIds: [],
      generationStage: "",
      handleSubmit: chatHandleSubmit,
      isGenerating: false,
      messages: [],
      openChatById: jest.fn(),
      pendingMessage: null,
      setPendingForChat,
    });
    const reader = {
      read: jest.fn()
        .mockResolvedValueOnce({
          done: false,
          value: Uint8Array.from(Array.from("Grounded Studio answer").map((character) => character.charCodeAt(0))),
        })
        .mockResolvedValueOnce({ done: true, value: undefined }),
    };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      body: { getReader: () => reader },
    });
    const user = { uid: "user-1", getIdToken: jest.fn().mockResolvedValue("token") };

    const { result } = renderHook(() =>
      useUnifiedChat(user, {}, jest.fn(), jest.fn())
    );

    await act(async () => {
      await result.current.handleSubmit("What files can you see in Studio?", [], null, {
        projectId: "project_1",
        activeTaskId: "task_1",
        showPlan: false,
      });
    });

    const request = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(global.fetch.mock.calls[0][0]).toContain("/api/ai/chat");
    expect(request).toEqual(expect.objectContaining({
      studioEnabled: true,
      studioSessionId: "mcp_agent_exact",
      studioConnectionType: "mcp_local",
    }));
    expect(orchestrate).not.toHaveBeenCalled();
    expect(chatHandleSubmit).not.toHaveBeenCalled();
  });

  test("passes task intake candidates only to direct implementation generation", async () => {
    const taskOptions = {
      projectId: "project_1",
      activeTaskId: "task_1",
      showPlan: false,
      onTaskAccepted: jest.fn(),
    };
    useAiChat.mockReturnValue({
      activeMode: "agent",
      currentChatId: "chat-1",
      generatingChatIds: [],
      generationStage: "",
      handleSubmit: chatHandleSubmit,
      isGenerating: false,
      messages: [],
      openChatById: jest.fn(),
      pendingMessage: null,
      setPendingForChat: jest.fn(),
    });
    const user = { uid: "user-1", getIdToken: jest.fn().mockResolvedValue("token") };

    const { result } = renderHook(() =>
      useUnifiedChat(user, {}, jest.fn(), jest.fn())
    );

    await act(async () => {
      await result.current.handleSubmit("Build a lobby system", [], null, taskOptions);
    });

    expect(chatHandleSubmit).toHaveBeenCalledTimes(1);
    expect(createAgentRunV2).toHaveBeenCalledWith(expect.objectContaining({
      chatId: "chat-1",
      agentId: "agent-1",
      idempotencyKey: expect.stringMatching(/^run-/),
      mode: "act",
      projectId: "project_1",
      prompt: "Build a lobby system",
    }));
    expect(chatHandleSubmit).toHaveBeenCalledWith(
      "Build a lobby system",
      "chat-1",
      expect.any(String),
      "agent",
      true,
      [],
      null,
      expect.objectContaining({
        ...taskOptions,
        authoritativeRun: expect.objectContaining({
          authoritativeExecution: true,
          executionDisposition: "launched",
          run: expect.objectContaining({ runId: "run-1", jobId: "job-1" }),
        }),
      }),
    );
    expect(orchestrate).not.toHaveBeenCalled();
  });

  test("creates a project-scoped agent after a repaired chat binding conflicts with the old projection", async () => {
    useAiChat.mockReturnValue({
      activeMode: "agent",
      currentChatId: "chat-1",
      generatingChatIds: [],
      generationStage: "",
      handleSubmit: chatHandleSubmit,
      isGenerating: false,
      messages: [],
      openChatById: jest.fn(),
      pendingMessage: null,
      setPendingForChat: jest.fn(),
    });
    createAgentV2
      .mockRejectedValueOnce(Object.assign(new Error("Idempotency conflict"), {
        payload: { code: "IDEMPOTENCY_CONFLICT" },
      }))
      .mockResolvedValueOnce({ agent: { agentId: "agent-2", projectId: "project_2" } });
    const user = { uid: "user-1", getIdToken: jest.fn().mockResolvedValue("token") };

    const { result } = renderHook(() =>
      useUnifiedChat(user, {}, jest.fn(), jest.fn())
    );

    await act(async () => {
      await result.current.handleSubmit("Build a lobby system", [], null, {
        projectId: "project_2",
      });
    });

    expect(createAgentV2).toHaveBeenNthCalledWith(1, {
      chatId: "chat-1",
      projectId: "project_2",
      idempotencyKey: "agent-chat-1",
    });
    expect(createAgentV2).toHaveBeenNthCalledWith(2, {
      chatId: "chat-1",
      projectId: "project_2",
      idempotencyKey: "agent-chat-1-project_2",
    });
    expect(createAgentRunV2).toHaveBeenCalledWith(expect.objectContaining({
      agentId: "agent-2",
      projectId: "project_2",
    }));
  });

  test("sends the complete server-owned execution input for an authoritative Studio run", async () => {
    getStudioEnabledPreference.mockReturnValue(true);
    getStudioApplyMode.mockReturnValue("manual_review");
    const baseArtifact = { artifactId: "artifact-1", files: [{ path: "src/Main.lua" }] };
    useAiChat.mockReturnValue({
      activeMode: "agent",
      currentChatId: "chat-1",
      generatingChatIds: [],
      generationStage: "",
      handleSubmit: chatHandleSubmit,
      isGenerating: false,
      messages: [{ role: "assistant", content: "Existing context" }],
      openChatById: jest.fn(),
      pendingMessage: null,
      setPendingForChat: jest.fn(),
    });
    const settings = {
      modelVersion: "nexus-free-auto",
      creativity: 0.4,
      codeStyle: "safe",
      verbosity: "balanced",
      codingStandards: "Use strict types",
      gameSpec: "Round-based game",
      studioAutoPushEnabled: true,
      studioAutoPushPolicy: "manual_review",
      useExamples: true,
      selectedExampleIds: ["example-1"],
    };
    const user = { uid: "user-1", getIdToken: jest.fn().mockResolvedValue("token") };
    const { result } = renderHook(() => useUnifiedChat(user, settings, jest.fn(), jest.fn()));

    await act(async () => {
      await result.current.handleSubmit("Fix the round manager", [], baseArtifact, {
        clientMessageId: "request-full-input",
        projectId: "project_1",
        selectedExampleIds: ["example-1"],
        approvedPlan: {
          planId: "plan-1",
          version: 2,
          hash: "plan-hash",
          ignoredCallerField: "must not cross the boundary",
        },
        mode: "debug",
      });
    });

    expect(createAgentRunV2).toHaveBeenCalledWith(expect.objectContaining({
      chatId: "chat-1",
      agentId: "agent-1",
      prompt: "Fix the round manager",
      mode: "debug",
      projectId: "project_1",
      generatorMode: "agent_build",
      studioEnabled: true,
      applyMode: "manual_review",
      routingMode: "hybrid",
      autoPushToStudio: true,
      autoPushPolicy: "manual_only",
      chatMode: "debug",
      settings: expect.objectContaining({
        modelVersion: "nexus-free-auto",
        gameSpec: "Round-based game",
        studioAutoPushEnabled: true,
      }),
      conversation: [expect.objectContaining({ role: "assistant" })],
      baseArtifact,
      approvedPlan: { planId: "plan-1", version: 2, hash: "plan-hash" },
      selectedExampleIds: ["example-1"],
    }));
  });

  test("passes a queued authoritative run through without launching a second run", async () => {
    createAgentRunV2.mockResolvedValueOnce({
      run: {
        runId: "run-queued",
        agentId: "agent-1",
        jobId: null,
        status: "queued",
        queuePosition: 2,
      },
      authoritativeExecution: true,
      executionDisposition: "queued",
    });
    useAiChat.mockReturnValue({
      activeMode: "agent",
      currentChatId: "chat-1",
      generatingChatIds: [],
      generationStage: "",
      handleSubmit: chatHandleSubmit,
      isGenerating: false,
      messages: [],
      openChatById: jest.fn(),
      pendingMessage: null,
      setPendingForChat: jest.fn(),
    });
    const user = { uid: "user-1", getIdToken: jest.fn().mockResolvedValue("token") };
    const { result } = renderHook(() => useUnifiedChat(user, {}, jest.fn(), jest.fn()));

    await act(async () => {
      await result.current.handleSubmit("Build two systems", [], null, {
        clientMessageId: "request-queued",
        projectId: "project_1",
      });
    });

    expect(createAgentRunV2).toHaveBeenCalledTimes(1);
    expect(chatHandleSubmit).toHaveBeenCalledTimes(1);
    expect(chatHandleSubmit.mock.calls[0][7]).toEqual(expect.objectContaining({
      authoritativeRun: expect.objectContaining({
        executionDisposition: "queued",
        run: expect.objectContaining({ runId: "run-queued", jobId: null }),
      }),
    }));
  });
});
