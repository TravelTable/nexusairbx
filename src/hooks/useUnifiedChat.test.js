import { act, renderHook } from "@testing-library/react";
import { TextDecoder as NodeTextDecoder } from "util";
import { setDoc } from "firebase/firestore";
import { reconcileUnifiedPendingMessages, useUnifiedChat } from "./useUnifiedChat";
import { useAiChat } from "./useAiChat";
import { trackProductEvent } from "../lib/productAnalytics";
import { FEATURE_FLAGS } from "../lib/featureFlags";
import { getStudioApplyMode, getStudioEnabledPreference } from "../lib/agentSteps";
import { getStudioStatus } from "../lib/studioBridgeApi";
import { resolveGameSpecForPrompt } from "../lib/gameProfile";
import { orchestrate } from "../lib/workflowApi";
import { getProjectBinding } from "../lib/projectBindingsApi";
import { classifyUserIntent, isImplementationIntent } from "../lib/intentClassifier";
import {
  createAgentRunV2,
  getRuntimeCapabilitiesV2,
  normalizeAgentProjection,
  resolveChatAgentProjectionV2,
  selectAgentRuntimeRoute,
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

jest.mock("../lib/projectBindingsApi", () => ({
  getProjectBinding: jest.fn(),
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
    legacyAgentFallback: true,
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
  AgentRuntimeUnavailableError: class AgentRuntimeUnavailableError extends Error {},
  createAgentRunV2: jest.fn(),
  getRuntimeCapabilitiesV2: jest.fn(() => Promise.resolve(null)),
  normalizeAgentProjection: jest.fn((value) => value?.agent || value),
  resolveChatAgentProjectionV2: jest.fn(),
  selectAgentRuntimeRoute: jest.fn(() => "unknown"),
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
    FEATURE_FLAGS.legacyAgentFallback = true;
    FEATURE_FLAGS.unifiedAgent = false;
    getStudioEnabledPreference.mockReturnValue(false);
    getStudioApplyMode.mockReturnValue("manual_review");
    resolveGameSpecForPrompt.mockImplementation((value) => value || null);
    classifyUserIntent.mockReturnValue("IMPLEMENTATION");
    isImplementationIntent.mockReturnValue(true);
    getProjectBinding.mockResolvedValue({
      state: "ready",
      project: { projectId: "project-1" },
    });
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
      assertCanWrite: jest.fn(() => Promise.resolve()),
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

  test("reconciles orchestration and generation pending state for the same request", () => {
    const pendingMessages = reconcileUnifiedPendingMessages(
      [{
        role: "assistant",
        requestId: "req-shared",
        runId: "run-live",
        jobId: "job-live",
        prompt: "Build the lobby",
        stage: "Writing runtime files...",
        targetSelection: { selected: ["ServerScriptService"] },
        streamState: {
          activitySeq: 4,
          activity: [
            { id: "shared-stage", type: "stage", text: "Writing runtime files..." },
            { id: "runtime-file", type: "file_chunk", text: "Writing LobbyService" },
          ],
          files: [{ id: "lobby", path: "ServerScriptService/LobbyService.lua" }],
        },
        steps: [{ id: "write-lobby", label: "Write LobbyService", status: "running" }],
      }],
      [{
        role: "assistant",
        requestId: "req-shared",
        prompt: "Build the lobby",
        stage: "Understanding your task...",
        streamState: {
          activitySeq: 2,
          activity: [
            { id: "shared-stage", type: "stage", text: "Understanding your task..." },
            { id: "orchestration-plan", type: "stage", text: "Planning lobby" },
          ],
        },
      }]
    );

    expect(pendingMessages).toHaveLength(1);
    expect(pendingMessages[0]).toEqual(expect.objectContaining({
      requestId: "req-shared",
      runId: "run-live",
      jobId: "job-live",
      stage: "Writing runtime files...",
      targetSelection: { selected: ["ServerScriptService"] },
      steps: [expect.objectContaining({ id: "write-lobby" })],
    }));
    expect(pendingMessages[0].streamState.activitySeq).toBe(4);
    expect(pendingMessages[0].streamState.activity).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "shared-stage", text: "Writing runtime files..." }),
      expect.objectContaining({ id: "orchestration-plan" }),
      expect.objectContaining({ id: "runtime-file" }),
    ]));
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
      assertCanWrite: jest.fn(() => Promise.resolve()),
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

  test("preserves the selected template through Plan Mode orchestration and clarification storage", async () => {
    const setPendingForChat = jest.fn();
    useAiChat.mockReturnValue({
      activeMode: "plan",
      assertCanWrite: jest.fn(() => Promise.resolve()),
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
    orchestrate.mockResolvedValue({
      status: "needs_clarification",
      questions: [{ id: "scope", question: "Keep the current UI?", options: ["Yes", "No"] }],
    });
    const user = { uid: "user-1", getIdToken: jest.fn().mockResolvedValue("token") };
    const { result } = renderHook(() => useUnifiedChat(user, {}, jest.fn(), jest.fn()));

    await act(async () => {
      await result.current.handleSubmit("Fix the inventory bug", [], null, {
        mode: "plan",
        projectId: "project-1",
        templateId: "fix_bug",
      });
    });

    expect(orchestrate).toHaveBeenCalledWith(expect.objectContaining({
      prompt: "Fix the inventory bug",
      mode: "plan",
      projectId: "project-1",
      templateId: "fix_bug",
    }));
    expect(setDoc.mock.calls.some(([, payload]) => (
      payload?.stage === "clarify" && payload?.templateId === "fix_bug"
    ))).toBe(true);
  });

  test("keeps Ask available when the optional runtime projection is disconnected", async () => {
    FEATURE_FLAGS.unifiedAgent = true;
    resolveChatAgentProjectionV2.mockRejectedValueOnce(new Error("runtime disconnected"));
    const setPendingForChat = jest.fn();
    useAiChat.mockReturnValue({
      activeMode: "ask",
      assertCanWrite: jest.fn(() => Promise.resolve()),
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
      assertCanWrite: jest.fn(() => Promise.resolve()),
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
      assertCanWrite: jest.fn(() => Promise.resolve()),
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

  test("uses legacy execution when canonical intake reports the legacy runtime owner", async () => {
    useAiChat.mockReturnValue({
      activeMode: "agent",
      assertCanWrite: jest.fn(() => Promise.resolve()),
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
    createAgentRunV2.mockRejectedValueOnce(Object.assign(
      new Error("Canonical task intake is disabled while the legacy runtime owns execution."),
      {
        status: 503,
        payload: {
          code: "CAPABILITY_UNSUPPORTED",
          details: { runtimeOwner: "legacy_agent_adapter" },
        },
      }
    ));
    const user = { uid: "user-1", getIdToken: jest.fn().mockResolvedValue("token") };

    const { result } = renderHook(() =>
      useUnifiedChat(user, {}, jest.fn(), jest.fn())
    );

    await act(async () => {
      await result.current.handleSubmit("Build a lobby system", [], null, {
        clientMessageId: "request-legacy-owner",
        projectId: "project_1",
      });
    });

    expect(createAgentRunV2).toHaveBeenCalledTimes(1);
    expect(chatHandleSubmit).toHaveBeenCalledTimes(1);
    expect(chatHandleSubmit.mock.calls[0]).toEqual([
      "Build a lobby system",
      "chat-1",
      "request-legacy-owner",
      "agent",
      true,
      [],
      null,
      expect.objectContaining({ projectId: "project_1" }),
    ]);
    expect(chatHandleSubmit.mock.calls[0][7]).not.toHaveProperty("authoritativeRun");
  });

  test("does not hide unrelated canonical runtime failures behind legacy execution", async () => {
    const notify = jest.fn();
    useAiChat.mockReturnValue({
      activeMode: "agent",
      assertCanWrite: jest.fn(() => Promise.resolve()),
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
    createAgentRunV2.mockRejectedValueOnce(Object.assign(new Error("Runtime unavailable"), {
      status: 503,
      payload: { code: "SERVICE_UNAVAILABLE", details: {} },
    }));
    const user = { uid: "user-1", getIdToken: jest.fn().mockResolvedValue("token") };
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

    try {
      const { result } = renderHook(() =>
        useUnifiedChat(user, {}, jest.fn(), notify)
      );

      await act(async () => {
        await result.current.handleSubmit("Build a lobby system", [], null, {
          clientMessageId: "request-runtime-down",
          projectId: "project_1",
        });
      });
    } finally {
      consoleError.mockRestore();
    }

    expect(chatHandleSubmit).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledWith({ message: "Runtime unavailable", type: "error" });
  });

  test("uses the natural-identity resolver once when a chat changes project binding", async () => {
    useAiChat.mockReturnValue({
      activeMode: "agent",
      assertCanWrite: jest.fn(() => Promise.resolve()),
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
    resolveChatAgentProjectionV2.mockResolvedValueOnce({
      agent: { agentId: "agent-2", chatId: "chat-1", projectId: "project_2" },
      resolution: "created",
    });
    const user = { uid: "user-1", getIdToken: jest.fn().mockResolvedValue("token") };

    const { result } = renderHook(() =>
      useUnifiedChat(user, {}, jest.fn(), jest.fn())
    );

    await act(async () => {
      await result.current.handleSubmit("Build a lobby system", [], null, {
        projectId: "project_2",
      });
    });

    expect(resolveChatAgentProjectionV2).toHaveBeenCalledTimes(1);
    expect(resolveChatAgentProjectionV2).toHaveBeenCalledWith({
      chatId: "chat-1",
      projectId: "project_2",
      storedAgentId: undefined,
      allowLegacyCreate: false,
    });
    expect(createAgentRunV2).toHaveBeenCalledWith(expect.objectContaining({
      agentId: "agent-2",
      projectId: "project_2",
    }));
  });

  test("routes directly to legacy generation when capabilities name the legacy owner", async () => {
    getRuntimeCapabilitiesV2.mockResolvedValue({
      executionOwner: "legacy_agent_adapter",
      canonicalAgentRuns: { enabled: false, requiresProject: true },
      legacyGeneration: { enabled: true },
    });
    useAiChat.mockReturnValue({
      activeMode: "agent",
      assertCanWrite: jest.fn(() => Promise.resolve()),
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
      await result.current.handleSubmit("Build a lobby system", [], null, {
        clientMessageId: "request-direct-legacy",
        projectId: "project_1",
      });
    });

    expect(resolveChatAgentProjectionV2).not.toHaveBeenCalled();
    expect(createAgentRunV2).not.toHaveBeenCalled();
    expect(chatHandleSubmit).toHaveBeenCalledWith(
      "Build a lobby system",
      "chat-1",
      "request-direct-legacy",
      "agent",
      true,
      [],
      null,
      expect.objectContaining({ projectId: "project_1" })
    );
  });

  test("sends the complete server-owned execution input for an authoritative Studio run", async () => {
    getStudioEnabledPreference.mockReturnValue(true);
    getStudioApplyMode.mockReturnValue("manual_review");
    const baseArtifact = { artifactId: "artifact-1", files: [{ path: "src/Main.lua" }] };
    useAiChat.mockReturnValue({
      activeMode: "agent",
      assertCanWrite: jest.fn(() => Promise.resolve()),
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
      assertCanWrite: jest.fn(() => Promise.resolve()),
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
