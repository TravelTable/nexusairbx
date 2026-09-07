import { act, renderHook } from "@testing-library/react";
import { TextDecoder as NodeTextDecoder } from "util";
import { getDoc, setDoc } from "firebase/firestore";
import { reconcileUnifiedPendingMessages, useUnifiedChat } from "./useUnifiedChat";
import { useAiChat } from "./useAiChat";
import { trackProductEvent } from "../lib/productAnalytics";
import { FEATURE_FLAGS } from "../lib/featureFlags";
import { getStudioApplyMode, getStudioEnabledPreference } from "../lib/agentSteps";
import { getStudioStatus } from "../lib/studioBridgeApi";
import { resolveGameSpecForPrompt } from "../lib/gameProfile";
import {
  approveWorkflowPlan,
  checkWorkflowPlanReadiness,
  orchestrate,
  restoreWorkflowPlanVersion,
  startPlanExecution,
} from "../lib/workflowApi";
import { getProjectBinding } from "../lib/projectBindingsApi";
import { getTask, retryTask, approveTask, cancelTask } from "../lib/taskRuntimeApi";
import {
  classifyExecutionIntent,
  classifyUserIntent,
  explicitlyDisablesStudioContext,
  isImplementationIntent,
} from "../lib/intentClassifier";
import { isExplicitPlanApproval } from "../lib/planApproval";
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
  getDoc: jest.fn(() => Promise.resolve({ exists: () => false })),
  serverTimestamp: jest.fn(() => "timestamp"),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
}));

jest.mock("./useAiChat", () => ({
  useAiChat: jest.fn(),
}));

jest.mock("../lib/workflowApi", () => ({
  approveWorkflowPlan: jest.fn(),
  checkWorkflowPlanReadiness: jest.fn(),
  orchestrate: jest.fn(),
  restoreWorkflowPlanVersion: jest.fn(),
  startPlanExecution: jest.fn(),
}));

jest.mock("../lib/projectBindingsApi", () => ({
  PROJECT_RESOLUTION_STATES: Object.freeze({
    READY: "ready",
    OWNED_INCOMPLETE: "owned_incomplete",
    LEGACY_OWNED: "legacy_owned",
    MISSING: "missing",
  }),
  getProjectBinding: jest.fn(),
  projectBindingRecoveryMessage: jest.fn(() => null),
}));

jest.mock("../lib/taskRuntimeApi", () => ({
  getTask: jest.fn(), retryTask: jest.fn(), approveTask: jest.fn(), cancelTask: jest.fn(),
}));

jest.mock("../lib/planApproval", () => ({
  isExplicitPlanApproval: jest.fn(() => false),
}));

jest.mock("../lib/intentClassifier", () => ({
  classifyExecutionIntent: jest.fn(() => "artifact_only"),
  classifyUserIntent: jest.fn(() => "IMPLEMENTATION"),
  explicitlyDisablesStudioContext: jest.fn(() => false),
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
    newPlanningMode: false,
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
  OperationRecoveryPendingError: class OperationRecoveryPendingError extends Error {
    constructor({ operationId, cause = null, message = "The run may still be starting." } = {}) {
      super(message);
      this.code = "OPERATION_RECOVERY_PENDING";
      this.category = "outcome_unknown";
      this.retryable = true;
      this.outcomeUnknown = true;
      this.operationId = operationId;
      this.cause = cause;
    }
  },
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
    setDoc.mockResolvedValue();
    getDoc.mockResolvedValue({ exists: () => false });
    FEATURE_FLAGS.legacyAgentFallback = true;
    FEATURE_FLAGS.newPlanningMode = false;
    FEATURE_FLAGS.unifiedAgent = false;
    getStudioEnabledPreference.mockReturnValue(false);
    getStudioApplyMode.mockReturnValue("manual_review");
    checkWorkflowPlanReadiness.mockResolvedValue({ ready: true, canExecute: true, blockers: [] });
    resolveGameSpecForPrompt.mockImplementation((value) => value || null);
    classifyExecutionIntent.mockReturnValue("artifact_only");
    classifyUserIntent.mockReturnValue("IMPLEMENTATION");
    isImplementationIntent.mockReturnValue(true);
    isExplicitPlanApproval.mockReturnValue(false);
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
      if (capabilities.executionOwner !== "canonical_task_runtime" || capabilities.canonicalAgentRuns?.enabled !== true)
        return "legacy";
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
      [
        {
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
              {
                id: "shared-stage",
                type: "stage",
                text: "Writing runtime files...",
              },
              {
                id: "runtime-file",
                type: "file_chunk",
                text: "Writing LobbyService",
              },
            ],
            files: [{ id: "lobby", path: "ServerScriptService/LobbyService.lua" }],
          },
          steps: [
            {
              id: "write-lobby",
              label: "Write LobbyService",
              status: "running",
            },
          ],
        },
      ],
      [
        {
          role: "assistant",
          requestId: "req-shared",
          prompt: "Build the lobby",
          stage: "Understanding your task...",
          streamState: {
            activitySeq: 2,
            activity: [
              {
                id: "shared-stage",
                type: "stage",
                text: "Understanding your task...",
              },
              {
                id: "orchestration-plan",
                type: "stage",
                text: "Planning lobby",
              },
            ],
          },
        },
      ]
    );

    expect(pendingMessages).toHaveLength(1);
    expect(pendingMessages[0]).toEqual(
      expect.objectContaining({
        requestId: "req-shared",
        runId: "run-live",
        jobId: "job-live",
        stage: "Writing runtime files...",
        targetSelection: { selected: ["ServerScriptService"] },
        steps: [expect.objectContaining({ id: "write-lobby" })],
      })
    );
    expect(pendingMessages[0].streamState.activitySeq).toBe(4);
    expect(pendingMessages[0].streamState.activity).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "shared-stage",
          text: "Writing runtime files...",
        }),
        expect.objectContaining({ id: "orchestration-plan" }),
        expect.objectContaining({ id: "runtime-file" }),
      ])
    );
  });

  test("nudges sign-in instead of submitting when a signed-out user enters a prompt", async () => {
    const onSignInNudge = jest.fn();

    const { result } = renderHook(() => useUnifiedChat(null, {}, jest.fn(), jest.fn(), { onSignInNudge }));

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

  test("opens the visible stream synchronously before submit preflight resolves", async () => {
    let resolvePreflight;
    const assertCanWrite = jest.fn(() => new Promise((resolve) => {
      resolvePreflight = resolve;
    }));
    useAiChat.mockReturnValue({
      activeMode: "agent",
      assertCanWrite,
      currentChatId: null,
      generatingChatIds: [],
      generationStage: "",
      handleSubmit: chatHandleSubmit,
      isGenerating: false,
      messages: [],
      openChatById: jest.fn(),
      pendingMessage: null,
      pendingMessages: [],
      setPendingForChat: jest.fn(),
    });
    const user = {
      uid: "user-1",
      getIdToken: jest.fn().mockResolvedValue("token"),
    };
    const controller = new AbortController();
    const { result } = renderHook(() => useUnifiedChat(user, {}, jest.fn(), jest.fn()));

    let submission;
    act(() => {
      submission = result.current.handleSubmit("Build a lobby system", [], null, {
        mode: "agent",
        projectId: "project-1",
        clientMessageId: "request-instant-stream",
        operationSignal: controller.signal,
      });
    });

    expect(assertCanWrite).toHaveBeenCalledTimes(1);
    expect(result.current.isGenerating).toBe(true);
    expect(result.current.pendingMessage).toEqual(expect.objectContaining({
      requestId: "request-instant-stream",
      prompt: "Build a lobby system",
      stage: "Starting your request...",
    }));

    controller.abort();
    resolvePreflight();
    await act(async () => {
      await expect(submission).rejects.toMatchObject({ name: "AbortError" });
    });
  });

  test("sends the exact selected MCP session and transport type for Ask mode", async () => {
    FEATURE_FLAGS.unifiedAgent = true;
    getStudioEnabledPreference.mockReturnValue(true);
    getStudioStatus.mockResolvedValue({
      sessions: [
        {
          id: "mcp_exact",
          connectionType: "mcp_local",
          status: "connected",
          live: true,
          connectorLive: true,
          mcpServerAvailable: true,
          capabilities: { readProject: true },
        },
      ],
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
      read: jest
        .fn()
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
    const user = {
      uid: "user-1",
      getIdToken: jest.fn().mockResolvedValue("token"),
    };

    const { result } = renderHook(() => useUnifiedChat(user, {}, jest.fn(), jest.fn()));

    await act(async () => {
      await result.current.handleSubmit("What does Main do?", [], null, {
        mode: "ask",
      });
    });

    const request = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(request).toEqual(
      expect.objectContaining({
        studioEnabled: true,
        studioSessionId: "mcp_exact",
        studioConnectionType: "mcp_local",
      })
    );
    expect(setPendingForChat).toHaveBeenCalled();
    expect(
      setDoc.mock.calls.some(([, payload]) => payload?.role === "assistant" && payload?.content === "Studio answer")
    ).toBe(true);
    expect(createAgentRunV2).not.toHaveBeenCalled();
  });

  test("pins Plan mode when the first prompt creates a fresh conversation", async () => {
    const startNewChat = jest.fn().mockResolvedValue("chat-new");
    useAiChat.mockReturnValue({ ...useAiChat(), activeMode: "plan", startNewChat });
    orchestrate.mockResolvedValue({ status: "needs_clarification", questions: [] });
    const { result } = renderHook(() => useUnifiedChat({ uid: "user-1" }, {}, jest.fn(), jest.fn()));
    await act(async () => {
      await result.current.handleSubmit("Plan a simple flight game", [], null, { projectId: "project-1" });
    });
    expect(startNewChat).toHaveBeenCalledWith({ projectId: "project-1", mode: "plan" });
    expect(orchestrate).toHaveBeenCalledWith(expect.objectContaining({ chatId: "chat-new", mode: "plan" }));
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
      questions: [
        {
          id: "scope",
          question: "Keep the current UI?",
          options: ["Yes", "No"],
        },
      ],
    });
    const user = {
      uid: "user-1",
      getIdToken: jest.fn().mockResolvedValue("token"),
    };
    const { result } = renderHook(() => useUnifiedChat(user, {}, jest.fn(), jest.fn()));

    await act(async () => {
      await result.current.handleSubmit("Fix the inventory bug", [], null, {
        mode: "plan",
        projectId: "project-1",
        templateId: "fix_bug",
      });
    });

    expect(orchestrate).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "Fix the inventory bug",
        mode: "plan",
        projectId: "project-1",
        templateId: "fix_bug",
      })
    );
    expect(
      setDoc.mock.calls.some(([, payload]) => payload?.stage === "clarify" && payload?.templateId === "fix_bug")
    ).toBe(true);
  });

  test("routes approval language through the exact structured plan execution command", async () => {
    FEATURE_FLAGS.newPlanningMode = true;
    isExplicitPlanApproval.mockReturnValue(true);
    const assertCanWrite = jest.fn().mockResolvedValue();
    const onTaskAccepted = jest.fn();
    useAiChat.mockReturnValue({
      activeMode: "plan",
      assertCanWrite,
      currentChatId: "chat-1",
      generatingChatIds: [],
      generationStage: "",
      handleSubmit: chatHandleSubmit,
      isGenerating: false,
      messages: [
        {
          id: "plan-message-1",
          role: "assistant",
          stage: "plan",
          planId: "plan-1",
          planVersion: 4,
          planHash: "hash-4",
          projectId: "project-1",
          classification: "script",
          originPrompt: "Build inventory",
        },
      ],
      openChatById: jest.fn(),
      pendingMessage: null,
      setPendingForChat: jest.fn(),
    });
    startPlanExecution.mockResolvedValue({
      status: "queued",
      execution: {
        taskId: "task-plan-1",
        planId: "plan-1",
        version: 4,
        hash: "hash-4",
      },
    });
    const user = {
      uid: "user-1",
      getIdToken: jest.fn().mockResolvedValue("token"),
    };
    const { result } = renderHook(() => useUnifiedChat(user, {}, jest.fn(), jest.fn()));

    await act(async () => {
      await result.current.handleSubmit("start build", [], null, {
        projectId: "project-1",
        onTaskAccepted,
      });
    });

    expect(assertCanWrite).toHaveBeenCalled();
    expect(checkWorkflowPlanReadiness).toHaveBeenCalledWith("plan-1", expect.objectContaining({
      version: 4,
      hash: "hash-4",
      projectId: "project-1",
    }));
    expect(startPlanExecution).toHaveBeenCalledWith("plan-1", 4, "hash-4");
    expect(approveWorkflowPlan).not.toHaveBeenCalled();
    expect(chatHandleSubmit).not.toHaveBeenCalled();
    expect(onTaskAccepted).toHaveBeenCalledWith("task-plan-1");
  });

  test("surfaces plan readiness blockers without sending a doomed execution request", async () => {
    FEATURE_FLAGS.newPlanningMode = true;
    const notify = jest.fn();
    useAiChat.mockReturnValue({
      activeMode: "plan",
      assertCanWrite: jest.fn().mockResolvedValue(),
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
    checkWorkflowPlanReadiness.mockResolvedValue({
      ready: false,
      canExecute: false,
      blockers: [{
        code: "PROJECT_TARGET_MISSING",
        severity: "blocker",
        title: "Choose a project",
        message: "Execution needs an exact NexusRBX project target.",
        suggestedFix: { label: "Choose project" },
      }],
    });
    const user = {
      uid: "user-1",
      getIdToken: jest.fn().mockResolvedValue("token"),
    };
    const { result } = renderHook(() => useUnifiedChat(user, {}, jest.fn(), notify));

    await act(async () => {
      await result.current.approvePlan({
        id: "plan-message-1",
        planId: "plan-1",
        planVersion: 4,
        planHash: "hash-4",
      });
    });

    expect(startPlanExecution).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({
      id: "plan-readiness-plan-1",
      type: "error",
      title: "Choose a project",
      message: expect.stringContaining("Next: Choose project."),
    }));
  });

  test("clears a stale project id before clarify re-orchestration", async () => {
    getProjectBinding.mockResolvedValue({
      ok: true,
      state: "missing",
      project: null,
      recoveryAction: null,
      projectId: "stale-project",
    });
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
      setPendingForChat: jest.fn(),
    });
    orchestrate.mockResolvedValue({
      status: "awaiting_approval",
      planId: "plan-1",
      planVersion: 1,
      planHash: "hash-1",
      classification: "script",
      aiSummary: "Ready",
      aiSteps: ["Step 1"],
      aiAssumptions: [],
    });
    const user = {
      uid: "user-1",
      getIdToken: jest.fn().mockResolvedValue("token"),
    };
    const { result } = renderHook(() => useUnifiedChat(user, {}, jest.fn(), jest.fn()));

    await act(async () => {
      await result.current.submitClarifyAnswers(
        {
          id: "msg-1",
          originPrompt: "Build a shop",
          projectId: "stale-project",
          requestMode: "plan",
          targeting: { projectId: "stale-project" },
        },
        { implementation_intent: "Implement it" }
      );
    });

    expect(getProjectBinding).toHaveBeenCalledWith("stale-project");
    expect(orchestrate).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "Build a shop",
        projectId: null,
        targeting: expect.objectContaining({ projectId: null }),
      })
    );
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
      read: jest
        .fn()
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
    const user = {
      uid: "user-1",
      getIdToken: jest.fn().mockResolvedValue("token"),
    };
    const consoleWarn = jest.spyOn(console, "warn").mockImplementation(() => {});

    try {
      const { result } = renderHook(() => useUnifiedChat(user, {}, jest.fn(), jest.fn()));

      await act(async () => {
        await result.current.handleSubmit("Explain this architecture", [], null, { mode: "ask" });
      });
    } finally {
      consoleWarn.mockRestore();
    }

    expect(setDoc.mock.calls.some(([, payload]) => payload?.content === "Read-only answer")).toBe(true);
    expect(createAgentRunV2).not.toHaveBeenCalled();
  });

  test("routes projectless conversational Agent prompts through read-only chat", async () => {
    FEATURE_FLAGS.unifiedAgent = true;
    getStudioEnabledPreference.mockReturnValue(true);
    explicitlyDisablesStudioContext.mockReturnValue(true);
    classifyUserIntent.mockReturnValue("GENERAL_QUESTION");
    isImplementationIntent.mockReturnValue(false);
    const setPendingForChat = jest.fn();
    useAiChat.mockReturnValue({
      activeMode: "agent",
      assertCanWrite: jest.fn(() => Promise.resolve()),
      currentChatId: "chat-1",
      currentChatMeta: { projectId: null },
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
      read: jest
        .fn()
        .mockResolvedValueOnce({
          done: false,
          value: Uint8Array.from(Array.from("Projectless answer").map((character) => character.charCodeAt(0))),
        })
        .mockResolvedValueOnce({ done: true, value: undefined }),
    };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      body: { getReader: () => reader },
    });
    const user = {
      uid: "user-1",
      getIdToken: jest.fn().mockResolvedValue("token"),
    };
    const { result } = renderHook(() => useUnifiedChat(user, {}, jest.fn(), jest.fn()));

    await act(async () => {
      await result.current.handleSubmit("Explain RemoteEvents", [], null, {
        mode: "agent",
      });
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/ai/chat"),
      expect.objectContaining({ method: "POST" })
    );
    expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toEqual(
      expect.objectContaining({
        studioEnabled: false,
        studioSessionId: null,
        studioConnectionType: null,
      })
    );
    expect(getStudioStatus).not.toHaveBeenCalled();
    expect(setDoc.mock.calls.some(([, payload]) => payload?.content === "Projectless answer")).toBe(true);
    expect(chatHandleSubmit).not.toHaveBeenCalled();
    expect(createAgentRunV2).not.toHaveBeenCalled();
  });

  test("keeps conversational Agent prompts read-only even with a selected project", async () => {
    FEATURE_FLAGS.unifiedAgent = true;
    getStudioEnabledPreference.mockReturnValue(true);
    classifyUserIntent.mockReturnValue("GENERAL_QUESTION");
    isImplementationIntent.mockReturnValue(false);
    explicitlyDisablesStudioContext.mockReturnValue(true);
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
      read: jest
        .fn()
        .mockResolvedValueOnce({
          done: false,
          value: Uint8Array.from(Array.from("Project answer").map((character) => character.charCodeAt(0))),
        })
        .mockResolvedValueOnce({ done: true, value: undefined }),
    };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      body: { getReader: () => reader },
    });
    const user = {
      uid: "user-1",
      getIdToken: jest.fn().mockResolvedValue("token"),
    };

    const { result } = renderHook(() => useUnifiedChat(user, {}, jest.fn(), jest.fn()));

    await act(async () => {
      await result.current.handleSubmit("What files can you see in Studio?", [], null, {
        projectId: "project_1",
        activeTaskId: "task_1",
        showPlan: false,
      });
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/ai/chat"),
      expect.objectContaining({ method: "POST" })
    );
    expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toEqual(
      expect.objectContaining({ projectId: "project_1", studioEnabled: false })
    );
    expect(createAgentRunV2).not.toHaveBeenCalled();
    expect(getStudioStatus).not.toHaveBeenCalled();
    expect(orchestrate).not.toHaveBeenCalled();
    expect(chatHandleSubmit).not.toHaveBeenCalled();
    expect(setDoc.mock.calls.some(([, payload]) => payload?.content === "Project answer")).toBe(true);
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
    const user = {
      uid: "user-1",
      getIdToken: jest.fn().mockResolvedValue("token"),
    };

    const { result } = renderHook(() => useUnifiedChat(user, {}, jest.fn(), jest.fn()));

    await act(async () => {
      await result.current.handleSubmit("Build a lobby system", [], null, taskOptions);
    });

    expect(chatHandleSubmit).toHaveBeenCalledTimes(1);
    expect(createAgentRunV2).toHaveBeenCalledWith(
      expect.objectContaining({
        chatId: "chat-1",
        agentId: "agent-1",
        idempotencyKey: expect.stringMatching(/^run-/),
        mode: "agent",
        projectId: "project_1",
        prompt: "Build a lobby system",
      })
    );
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
      })
    );
    expect(orchestrate).not.toHaveBeenCalled();
  });

  test("shows Agent setup progress before the durable run request resolves", async () => {
    let resolveRun;
    createAgentRunV2.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRun = resolve;
      })
    );
    useAiChat.mockReturnValue({
      activeMode: "agent",
      assertCanWrite: jest.fn(() => Promise.resolve()),
      currentChatId: "chat-slow-start",
      currentChatMeta: { agentId: "agent-1" },
      generatingChatIds: [],
      generationStage: "",
      handleSubmit: chatHandleSubmit,
      isGenerating: false,
      messages: [],
      openChatById: jest.fn(),
      pendingMessage: null,
      pendingMessages: [],
      setPendingForChat: jest.fn(),
    });
    const user = {
      uid: "user-1",
      getIdToken: jest.fn().mockResolvedValue("token"),
    };
    const { result } = renderHook(() => useUnifiedChat(user, {}, jest.fn(), jest.fn()));

    let submission;
    act(() => {
      submission = result.current.handleSubmit("Build a lobby system", [], null, {
        mode: "agent",
        projectId: "project-1",
        operationId: "request-slow-start",
        clientMessageId: "request-slow-start",
      });
    });
    while (!createAgentRunV2.mock.calls.length) {
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
    }

    expect(result.current.isGenerating).toBe(true);
    expect(result.current.pendingMessage).toEqual(
      expect.objectContaining({
        requestId: "request-slow-start",
        prompt: "Build a lobby system",
        stage: "Preparing the agent runtime...",
      })
    );

    resolveRun({
      run: {
        runId: "run-slow-start",
        agentId: "agent-1",
        jobId: "job-slow-start",
        status: "running",
      },
      authoritativeExecution: true,
      executionDisposition: "launched",
    });
    await act(async () => {
      await submission;
    });
  });

  test("locks plan startup immediately and checks the current Studio connection", async () => {
    FEATURE_FLAGS.newPlanningMode = true;
    let releaseReadiness;
    checkWorkflowPlanReadiness.mockReturnValue(new Promise((resolve) => { releaseReadiness = resolve; }));
    useAiChat.mockReturnValue({
      ...useAiChat(), currentChatId: "chat-1", activeMode: "plan",
    });
    startPlanExecution.mockResolvedValue({ status: "queued", execution: { taskId: "task-plan-1" } });
    const user = { uid: "user-1", getIdToken: jest.fn().mockResolvedValue("token") };
    const { result } = renderHook(() => useUnifiedChat(user, {}, jest.fn(), jest.fn()));
    const plan = { id: "plan-message-1", planId: "plan-1", planVersion: 4, planHash: "hash-4", targeting: { studioConnected: false } };
    let first, second;
    await act(async () => {
      first = result.current.approvePlan(plan, null, { studioConnected: true });
      second = result.current.approvePlan(plan, null, { studioConnected: true });
    });
    expect(result.current.isGenerating).toBe(true);
    expect(checkWorkflowPlanReadiness).toHaveBeenCalledTimes(1);
    expect(checkWorkflowPlanReadiness).toHaveBeenCalledWith("plan-1", expect.objectContaining({ studioConnected: true }));
    await act(async () => {
      releaseReadiness({ ready: true, canExecute: true, blockers: [] });
      await Promise.all([first, second]);
    });
    expect(startPlanExecution).toHaveBeenCalledTimes(1);
    expect(result.current.isGenerating).toBe(false);
  });

  test("Stop during readiness prevents a late readiness response from starting the build", async () => {
    FEATURE_FLAGS.newPlanningMode = true;
    let releaseReadiness;
    checkWorkflowPlanReadiness.mockReturnValue(new Promise((resolve) => { releaseReadiness = resolve; }));
    useAiChat.mockReturnValue({ ...useAiChat(), currentChatId: "chat-1", activeMode: "plan" });
    const notify = jest.fn();
    const { result } = renderHook(() => useUnifiedChat({ uid: "user-1" }, {}, notify, jest.fn()));
    let pending;
    await act(async () => {
      pending = result.current.approvePlan({ id: "message-1", planId: "plan-1", planVersion: 1, planHash: "hash-1" }).catch(error => error);
    });
    const { signal } = checkWorkflowPlanReadiness.mock.calls[0][1];
    act(() => { expect(result.current.cancelCurrentFlow()).toBe(true); });
    expect(signal.aborted).toBe(true);
    let outcome;
    await act(async () => {
      releaseReadiness({ ready: true });
      outcome = await pending;
    });
    expect(outcome.name).toBe("AbortError");
    expect(startPlanExecution).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
    expect(result.current.isGenerating).toBe(false);
  });

  test("Stop after dispatch waits for the accepted identity and cancels that same task", async () => {
    FEATURE_FLAGS.newPlanningMode = true;
    checkWorkflowPlanReadiness.mockResolvedValue({ ready: true });
    let acknowledgeExecution;
    startPlanExecution.mockReturnValue(new Promise(resolve => { acknowledgeExecution = resolve; }));
    cancelTask.mockResolvedValue({ task: { taskId: "task-plan-1", status: "cancelled" } });
    useAiChat.mockReturnValue({ ...useAiChat(), currentChatId: "chat-1", activeMode: "plan" });
    const onTaskAccepted = jest.fn();
    const { result } = renderHook(() => useUnifiedChat({ uid: "user-1" }, {}, jest.fn(), jest.fn()));
    let pending;
    await act(async () => {
      pending = result.current.approvePlan({ id: "message-1", planId: "plan-1", planVersion: 1, planHash: "hash-1" }, null, { onTaskAccepted });
    });
    act(() => { result.current.cancelCurrentFlow(); });
    expect(result.current.isGenerating).toBe(true);
    expect(result.current.generationStage).toBe("Stopping build…");
    await act(async () => {
      acknowledgeExecution({ status: "queued", execution: { taskId: "task-plan-1" } });
      await pending;
    });
    expect(startPlanExecution).toHaveBeenCalledTimes(1);
    expect(cancelTask).toHaveBeenCalledWith("task-plan-1");
    expect(onTaskAccepted).toHaveBeenLastCalledWith({ taskId: "task-plan-1", status: "cancelled" });
    expect(result.current.isGenerating).toBe(false);
  });

  test("a late plan acknowledgment does not select its task in a different conversation", async () => {
    FEATURE_FLAGS.newPlanningMode = true;
    checkWorkflowPlanReadiness.mockResolvedValue({ ready: true });
    let acknowledgeExecution;
    startPlanExecution.mockReturnValue(new Promise(resolve => { acknowledgeExecution = resolve; }));
    const originalChat = { ...useAiChat(), currentChatId: "chat-1", activeMode: "plan", updateChatMode: jest.fn() };
    useAiChat.mockReturnValue(originalChat);
    const onTaskAccepted = jest.fn();
    const { result, rerender } = renderHook(() => useUnifiedChat({ uid: "user-1" }, {}, jest.fn(), jest.fn()));
    let pending;
    await act(async () => {
      pending = result.current.approvePlan({ id: "message-1", planId: "plan-1", planVersion: 1, planHash: "hash-1" }, null, { onTaskAccepted });
    });
    useAiChat.mockReturnValue({ ...originalChat, currentChatId: "chat-2", activeMode: "ask" });
    rerender();
    await act(async () => {
      acknowledgeExecution({ status: "queued", execution: { taskId: "task-plan-1" } });
      await pending;
    });
    expect(onTaskAccepted).not.toHaveBeenCalled();
    expect(originalChat.updateChatMode).toHaveBeenCalledWith("chat-1", "agent");
    expect(result.current.isGenerating).toBe(false);
  });

  test("an uncertain launch explains how to reconnect without automatically creating another run", async () => {
    FEATURE_FLAGS.newPlanningMode = true;
    checkWorkflowPlanReadiness.mockResolvedValue({ ready: true });
    startPlanExecution.mockRejectedValue(new TypeError("Failed to fetch"));
    useAiChat.mockReturnValue({ ...useAiChat(), currentChatId: "chat-1", activeMode: "plan" });
    const { result } = renderHook(() => useUnifiedChat({ uid: "user-1" }, {}, jest.fn(), jest.fn()));
    await act(async () => {
      await expect(result.current.approvePlan({ id: "message-1", planId: "plan-1", planVersion: 1, planHash: "hash-1" }))
        .rejects.toMatchObject({ code: "PLAN_EXECUTION_UNCONFIRMED", message: expect.stringContaining("Retry this same saved plan") });
    });
    expect(startPlanExecution).toHaveBeenCalledTimes(1);
  });

  test("a failed planning request leaves a persistent explanation and retry instruction", async () => {
    useAiChat.mockReturnValue({ ...useAiChat(), activeMode: "plan", currentChatId: "chat-1" });
    orchestrate.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const user = { uid: "user-1", getIdToken: jest.fn().mockResolvedValue("token") };
    const { result } = renderHook(() => useUnifiedChat(user, {}, jest.fn(), jest.fn()));
    await act(async () => {
      await result.current.handleSubmit("Make a flying game", [], null, { mode: "plan", projectId: "project-1" });
    });
    expect(setDoc.mock.calls.map(([, payload]) => payload)).toEqual(expect.arrayContaining([expect.objectContaining({
      role: "assistant", status: "failed", content: expect.stringContaining("Retry as new attempt"),
    })]));
    expect(result.current.isGenerating).toBe(false);
  });

  test("continue follows the approved task instead of launching an unrelated inspection", async () => {
    useAiChat.mockReturnValue({ ...useAiChat(), currentChatId: "chat-1", messages: [
      { role: "assistant", stage: "plan_approved", taskId: "task-plan-1" },
    ] });
    const task = { taskId: "task-plan-1", status: "running" };
    getTask.mockResolvedValue({ task, allowedActions: ["cancel", "amend"] });
    const onTaskAccepted = jest.fn();
    const { result } = renderHook(() => useUnifiedChat({ uid: "user-1" }, {}, jest.fn(), jest.fn()));
    await act(async () => { await result.current.handleSubmit("continue", [], null, { onTaskAccepted, projectId: "project-1" }); });
    expect(getTask).not.toHaveBeenCalled();
    expect(createAgentRunV2).toHaveBeenCalledWith(expect.objectContaining({ prompt: "continue", continuation: true }));
    expect(chatHandleSubmit).toHaveBeenCalled();
    expect(retryTask).not.toHaveBeenCalled();
    expect(approveTask).not.toHaveBeenCalled();
  });

  test("revising a stopped plan creates an unapproved exact-scope revision without retrying or executing its task", async () => {
    const message = { id: "plan-message", stage: "plan_approved", planId: "plan-1", planVersion: 1, planHash: "hash-1", taskId: "task-1", originPrompt: "Build flight controls", projectId: "project-1" };
    useAiChat.mockReturnValue({ ...useAiChat(), currentChatId: "chat-1", messages: [message], updateChatMode: jest.fn().mockResolvedValue() });
    getTask.mockResolvedValue({ task: { taskId: "task-1", conversationId: "chat-1", status: "failed" }, allowedActions: [] });
    restoreWorkflowPlanVersion.mockResolvedValue({ plan: { planId: "plan-1", version: 2, hash: "hash-2", status: "awaiting_approval",
      aiSummary: "Flight controls", aiSteps: ["Build flight controls"], planMarkdown: "# Flight controls", structuredPlan: { targeting: { projectId: "project-1" } } } });
    const { result } = renderHook(() => useUnifiedChat({ uid: "user-1" }, {}, jest.fn(), jest.fn()));
    let revision;
    await act(async () => { revision = await result.current.reviseStoppedPlan(message); });
    expect(revision.activeChat).toBe(true);
    expect(restoreWorkflowPlanVersion).toHaveBeenCalledWith("plan-1", { version: 1, hash: "hash-1", sourceVersion: 1, sourceHash: "hash-1" });
    expect(setDoc.mock.calls.map(([, payload]) => payload)).toEqual(expect.arrayContaining([expect.objectContaining({
      stage: "plan", planId: "plan-1", planVersion: 2, planHash: "hash-2", originPrompt: "Build flight controls",
    })]));
    expect(setDoc.mock.calls.find(([, payload]) => payload.stage === "plan")[1].taskId).toBeUndefined();
    expect(retryTask).not.toHaveBeenCalled();
    expect(approveTask).not.toHaveBeenCalled();
    expect(startPlanExecution).not.toHaveBeenCalled();
    expect(createAgentRunV2).not.toHaveBeenCalled();
  });

  test("plan revision checks canonical terminal state and original-chat membership before changing the saved plan", async () => {
    const message = { id: "plan-message", stage: "plan_approved", planId: "plan-1", planVersion: 1, planHash: "hash-1", taskId: "task-1", executionStatus: "failed" };
    useAiChat.mockReturnValue({ ...useAiChat(), currentChatId: "chat-1", messages: [message] });
    getTask.mockResolvedValue({ task: { taskId: "task-1", status: "running" } });
    const { result, rerender } = renderHook(() => useUnifiedChat({ uid: "user-1" }, {}, jest.fn(), jest.fn()));
    await act(async () => { await expect(result.current.reviseStoppedPlan(message)).rejects.toThrow("still active"); });
    expect(restoreWorkflowPlanVersion).not.toHaveBeenCalled();
    useAiChat.mockReturnValue({ ...useAiChat(), currentChatId: "chat-2", messages: [] });
    rerender();
    await act(async () => { await expect(result.current.reviseStoppedPlan(message)).rejects.toThrow("original conversation"); });
    expect(restoreWorkflowPlanVersion).not.toHaveBeenCalled();
  });

  test("plan revision is single-flight and a late result cannot focus another conversation", async () => {
    const message = { id: "plan-message", stage: "plan_approved", planId: "plan-1", planVersion: 1, planHash: "hash-1", taskId: "task-1" };
    const originalChat = { ...useAiChat(), currentChatId: "chat-1", messages: [message], updateChatMode: jest.fn().mockResolvedValue() };
    useAiChat.mockReturnValue(originalChat);
    getTask.mockResolvedValue({ task: { taskId: "task-1", status: "cancelled" } });
    let finish;
    restoreWorkflowPlanVersion.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const { result, rerender } = renderHook(() => useUnifiedChat({ uid: "user-1" }, {}, jest.fn(), jest.fn()));
    let first, second;
    await act(async () => { first = result.current.reviseStoppedPlan(message); second = result.current.reviseStoppedPlan(message); });
    expect(first).toBe(second);
    expect(restoreWorkflowPlanVersion).toHaveBeenCalledTimes(1);
    useAiChat.mockReturnValue({ ...originalChat, currentChatId: "chat-2", messages: [] });
    rerender();
    let revision;
    await act(async () => {
      finish({ planId: "plan-1", version: 2, hash: "hash-2", status: "awaiting_approval", aiSummary: "Flight" });
      revision = await first;
    });
    expect(revision.activeChat).toBe(false);
    expect(originalChat.updateChatMode).toHaveBeenCalledWith("chat-1", "plan");
    expect(startPlanExecution).not.toHaveBeenCalled();
  });

  test("Stop while loading an approved task prevents Continue from retrying it afterward", async () => {
    useAiChat.mockReturnValue({ ...useAiChat(), currentChatId: "chat-1", messages: [
      { role: "assistant", stage: "plan_approved", taskId: "task-plan-1" },
    ] });
    let finishRead;
    getTask.mockReturnValue(new Promise(resolve => { finishRead = resolve; }));
    const user = { uid: "user-1" };
    const onTaskAccepted = jest.fn();
    const { result } = renderHook(() => useUnifiedChat(user, {}, jest.fn(), jest.fn()));
    let pending;
    await act(async () => { pending = result.current.handleSubmit("continue", [], null, { onTaskAccepted }).catch(error => error); });
    act(() => { result.current.cancelCurrentFlow(); });
    await act(async () => {
      finishRead({ task: { taskId: "task-plan-1", status: "failed" }, allowedActions: ["retry"] });
      await pending;
    });
    expect(retryTask).not.toHaveBeenCalled();
    expect(onTaskAccepted).not.toHaveBeenCalled();
  });

  test("persists the stable launch checkpoint before POST and attaches the run to the same message", async () => {
    FEATURE_FLAGS.unifiedAgent = true;
    useAiChat.mockReturnValue({
      activeMode: "agent",
      assertCanWrite: jest.fn(() => Promise.resolve()),
      currentChatId: "chat-checkpoint",
      currentChatMeta: { agentId: "agent-1" },
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
        projectId: "project-1",
        operationId: "operation-fixed",
        clientMessageId: "request-fixed",
      });
    });

    const checkpointIndex = setDoc.mock.calls.findIndex(([, payload]) => (
      payload?.launchOperationId === "operation-fixed:agent" && !payload?.runId
    ));
    const attachedIndex = setDoc.mock.calls.findIndex(([, payload]) => (
      payload?.launchOperationId === "operation-fixed:agent" && payload?.runId === "run-1"
    ));
    expect(checkpointIndex).toBeGreaterThanOrEqual(0);
    expect(attachedIndex).toBeGreaterThan(checkpointIndex);
    expect(setDoc.mock.calls[checkpointIndex][1]).toEqual(expect.objectContaining({
      operationId: "operation-fixed",
      launchOperationId: "operation-fixed:agent",
      agentId: "agent-1",
      requestId: "request-fixed",
      pending: true,
    }));
    expect(setDoc.mock.invocationCallOrder[checkpointIndex])
      .toBeLessThan(createAgentRunV2.mock.invocationCallOrder[0]);
    expect(setDoc.mock.calls[attachedIndex][0]).toEqual(setDoc.mock.calls[checkpointIndex][0]);
  });

  test("keeps an ambiguous canonical launch recovering and never falls back to legacy", async () => {
    FEATURE_FLAGS.unifiedAgent = true;
    const recoveryError = new Error("The launch is still being reconciled.");
    recoveryError.code = "OPERATION_RECOVERY_PENDING";
    recoveryError.category = "outcome_unknown";
    recoveryError.outcomeUnknown = true;
    createAgentRunV2.mockRejectedValueOnce(recoveryError);
    useAiChat.mockReturnValue({
      activeMode: "agent",
      assertCanWrite: jest.fn(() => Promise.resolve()),
      currentChatId: "chat-recovery",
      currentChatMeta: { agentId: "agent-1" },
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
    const notify = jest.fn();
    const { result } = renderHook(() => useUnifiedChat(user, {}, jest.fn(), notify));

    let submission;
    await act(async () => {
      submission = result.current.handleSubmit("Build a lobby system", [], null, {
        projectId: "project-1",
        operationId: "operation-recovery",
        clientMessageId: "request-recovery",
      });
      await expect(submission).rejects.toMatchObject({
        code: "OPERATION_RECOVERY_PENDING",
        category: "outcome_unknown",
        outcomeUnknown: true,
        operationId: "operation-recovery:agent",
      });
    });

    expect(chatHandleSubmit).not.toHaveBeenCalled();
    expect(setDoc.mock.calls.some(([, payload]) => (
      payload?.launchOperationId === "operation-recovery:agent"
      && payload?.stage === "Reconnecting to the accepted run..."
      && payload?.pending === true
    ))).toBe(true);
    expect(setDoc.mock.calls.some(([, payload]) => payload?.stage === "failed")).toBe(false);
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ type: "info" }));
    expect(notify).not.toHaveBeenCalledWith(expect.objectContaining({ type: "error" }));
  });

  test("sends a terse start command unchanged for authoritative goal recovery", async () => {
    const priorRequest = "Build a fly GUI with a shop and money system";
    useAiChat.mockReturnValue({
      activeMode: "agent",
      assertCanWrite: jest.fn(() => Promise.resolve()),
      currentChatId: "chat-1",
      generatingChatIds: [],
      generationStage: "",
      handleSubmit: chatHandleSubmit,
      isGenerating: false,
      messages: [
        { role: "user", content: priorRequest },
        {
          role: "assistant",
          content: "Could you clarify the flight controls?",
        },
      ],
      openChatById: jest.fn(),
      pendingMessage: null,
      setPendingForChat: jest.fn(),
    });
    isExplicitPlanApproval.mockImplementation((value) => String(value).trim() === "just start");
    classifyUserIntent.mockImplementation((value) =>
      String(value).includes("Build a fly GUI") ? "BUILD_REQUEST" : "CONTINUATION"
    );
    isImplementationIntent.mockReturnValue(true);
    const user = {
      uid: "user-1",
      getIdToken: jest.fn().mockResolvedValue("token"),
    };
    const { result } = renderHook(() => useUnifiedChat(user, {}, jest.fn(), jest.fn()));

    await act(async () => {
      await result.current.handleSubmit("just start", [], null, {
        clientMessageId: "request-just-start",
        projectId: "project_1",
      });
    });

    const expectedPrompt = "just start";
    expect(createAgentRunV2).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expectedPrompt,
        continuation: true,
        conversation: expect.arrayContaining([expect.objectContaining({ role: "user", content: priorRequest })]),
      })
    );
    expect(chatHandleSubmit).toHaveBeenCalledWith(
      expectedPrompt,
      "chat-1",
      "request-just-start",
      "agent",
      true,
      [],
      null,
      expect.objectContaining({ projectId: "project_1" })
    );
    expect(setDoc.mock.calls.some(([, payload]) => payload?.role === "user" && payload?.content === "just start")).toBe(
      true
    );
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
    createAgentRunV2.mockRejectedValueOnce(
      Object.assign(new Error("Canonical task intake is disabled while the legacy runtime owns execution."), {
        status: 503,
        payload: {
          code: "CAPABILITY_UNSUPPORTED",
          details: { runtimeOwner: "legacy_agent_adapter" },
        },
      })
    );
    const user = {
      uid: "user-1",
      getIdToken: jest.fn().mockResolvedValue("token"),
    };

    const { result } = renderHook(() => useUnifiedChat(user, {}, jest.fn(), jest.fn()));

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
    createAgentRunV2.mockRejectedValueOnce(
      Object.assign(new Error("Runtime unavailable"), {
        status: 503,
        payload: { code: "SERVICE_UNAVAILABLE", details: {} },
      })
    );
    const user = {
      uid: "user-1",
      getIdToken: jest.fn().mockResolvedValue("token"),
    };
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

    try {
      const { result } = renderHook(() => useUnifiedChat(user, {}, jest.fn(), notify));

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
    expect(notify).toHaveBeenCalledWith({
      message: "Runtime unavailable",
      type: "error",
    });
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
    const user = {
      uid: "user-1",
      getIdToken: jest.fn().mockResolvedValue("token"),
    };

    const { result } = renderHook(() => useUnifiedChat(user, {}, jest.fn(), jest.fn()));

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
    expect(createAgentRunV2).toHaveBeenCalledWith(
      expect.objectContaining({
        agentId: "agent-2",
        projectId: "project_2",
      })
    );
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
    const user = {
      uid: "user-1",
      getIdToken: jest.fn().mockResolvedValue("token"),
    };
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

  test("never replaces an explicit live Studio request with legacy artifact generation", async () => {
    classifyExecutionIntent.mockReturnValue("inspect");
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
      handleSubmit: chatHandleSubmit,
      messages: [],
      setPendingForChat: jest.fn(),
    });
    const user = {
      uid: "user-1",
      getIdToken: jest.fn().mockResolvedValue("token"),
    };
    const notify = jest.fn();
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    const { result } = renderHook(() => useUnifiedChat(user, {}, jest.fn(), notify));

    try {
      await expect(
        act(async () => {
          await result.current.handleSubmit("Inspect the current Studio project", [], null, {
            clientMessageId: "request-live-inspect",
            projectId: "project_1",
            propagateErrors: true,
          });
        })
      ).rejects.toMatchObject({ code: "STUDIO_LIVE_RUNTIME_REQUIRED" });
    } finally {
      consoleError.mockRestore();
    }

    expect(consoleError).not.toHaveBeenCalled();
    expect(chatHandleSubmit).not.toHaveBeenCalled();
    expect(createAgentRunV2).not.toHaveBeenCalled();
  });

  test("routes projectless conversational Agent prompts through read-only chat", async () => {
    FEATURE_FLAGS.unifiedAgent = true;
    getStudioEnabledPreference.mockReturnValue(true);
    explicitlyDisablesStudioContext.mockReturnValue(true);
    classifyUserIntent.mockReturnValue("GENERAL_QUESTION");
    isImplementationIntent.mockReturnValue(false);
    const setPendingForChat = jest.fn();
    useAiChat.mockReturnValue({
      activeMode: "agent",
      assertCanWrite: jest.fn(() => Promise.resolve()),
      currentChatId: "chat-1",
      currentChatMeta: { projectId: null },
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
      read: jest
        .fn()
        .mockResolvedValueOnce({
          done: false,
          value: Uint8Array.from(Array.from("Projectless answer").map((character) => character.charCodeAt(0))),
        })
        .mockResolvedValueOnce({ done: true, value: undefined }),
    };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      body: { getReader: () => reader },
    });
    const user = {
      uid: "user-1",
      getIdToken: jest.fn().mockResolvedValue("token"),
    };
    const { result } = renderHook(() => useUnifiedChat(user, {}, jest.fn(), jest.fn()));

    await act(async () => {
      await result.current.handleSubmit("Explain RemoteEvents", [], null, {
        mode: "agent",
      });
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/ai/chat"),
      expect.objectContaining({ method: "POST" })
    );
    expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toEqual(
      expect.objectContaining({
        studioEnabled: false,
        studioSessionId: null,
        studioConnectionType: null,
      })
    );
    expect(getStudioStatus).not.toHaveBeenCalled();
    expect(setDoc.mock.calls.some(([, payload]) => payload?.content === "Projectless answer")).toBe(true);
    expect(chatHandleSubmit).not.toHaveBeenCalled();
    expect(createAgentRunV2).not.toHaveBeenCalled();
  });

  test("sends the complete server-owned execution input for an authoritative Studio run", async () => {
    classifyExecutionIntent.mockReturnValue("live_fix");
    getStudioEnabledPreference.mockReturnValue(true);
    getStudioApplyMode.mockReturnValue("manual_review");
    const baseArtifact = {
      artifactId: "artifact-1",
      files: [{ path: "src/Main.lua" }],
    };
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
      studioApplyPolicy: "after_playtest",
      studioValidationMode: "playtest",
      studioSafetyMode: "review_destructive",
      studioAutoPushEnabled: true,
      studioAutoPushPolicy: "after_playtest",
      useExamples: true,
      selectedExampleIds: ["example-1"],
    };
    const user = {
      uid: "user-1",
      getIdToken: jest.fn().mockResolvedValue("token"),
    };
    const studioTarget = {
      targetId: "studio_target_live",
      placeId: "116714509720053",
      universeId: "10669840815",
      pluginSessionId: "plugin-live",
      mcpSessionId: "mcp-live",
      capabilityRegistry: {
        schemaVersion: 1,
        targetId: "studio_target_live",
        commands: { read_script: { available: true } },
        transports: [],
      },
    };
    const { result } = renderHook(() => useUnifiedChat(user, settings, jest.fn(), jest.fn()));

    await act(async () => {
      await result.current.handleSubmit("Fix the round manager", [], baseArtifact, {
        clientMessageId: "request-full-input",
        projectId: "project_1",
        studioConnected: true,
        studioTargetPreference: studioTarget,
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

    expect(createAgentRunV2).toHaveBeenCalledWith(
      expect.objectContaining({
        chatId: "chat-1",
        agentId: "agent-1",
        prompt: "Fix the round manager",
        mode: "debug",
        projectId: "project_1",
        generatorMode: "agent_build",
        executionIntent: "live_fix",
        studioEnabled: true,
        targeting: expect.objectContaining({
          projectId: "project_1",
          studioConnected: true,
        }),
        applyMode: "manual_review",
        routingMode: "hybrid",
        autoPushToStudio: true,
        autoPushPolicy: "after_playtest",
        chatMode: "debug",
        settings: expect.objectContaining({
          modelVersion: "nexus-free-auto",
          gameSpec: "Round-based game",
          studioAutoPushEnabled: true,
          studioApplyPolicy: "after_playtest",
        }),
        conversation: [expect.objectContaining({ role: "assistant" })],
        baseArtifact,
        approvedPlan: { planId: "plan-1", version: 2, hash: "plan-hash" },
        selectedExampleIds: ["example-1"],
      })
    );
    const canonicalRunInput = createAgentRunV2.mock.calls[0][0];
    expect(canonicalRunInput).not.toHaveProperty("studioTarget");
    expect(canonicalRunInput.targeting).not.toHaveProperty("studioTarget");
    expect(canonicalRunInput).not.toHaveProperty("studioSessionId");
    expect(canonicalRunInput).not.toHaveProperty("studioConnectionType");
    expect(canonicalRunInput).not.toHaveProperty("capabilitySnapshotId");
    expect(canonicalRunInput).not.toHaveProperty("capabilityRegistry");
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
    const user = {
      uid: "user-1",
      getIdToken: jest.fn().mockResolvedValue("token"),
    };
    const { result } = renderHook(() => useUnifiedChat(user, {}, jest.fn(), jest.fn()));

    await act(async () => {
      await result.current.handleSubmit("Build two systems", [], null, {
        clientMessageId: "request-queued",
        projectId: "project_1",
      });
    });

    expect(createAgentRunV2).toHaveBeenCalledTimes(1);
    expect(chatHandleSubmit).toHaveBeenCalledTimes(1);
    expect(chatHandleSubmit.mock.calls[0][7]).toEqual(
      expect.objectContaining({
        authoritativeRun: expect.objectContaining({
          executionDisposition: "queued",
          run: expect.objectContaining({ runId: "run-queued", jobId: null }),
        }),
      })
    );
  });

  test("retry rewind truncates after the user turn and does not write a duplicate user message", async () => {
    const rewindTranscript = jest.fn().mockResolvedValue({
      kept: [
        {
          id: "u1",
          role: "user",
          content: "Build a lobby system",
          createdAt: 1,
        },
      ],
      removed: [
        { id: "a1", role: "assistant", content: "Done", createdAt: 2 },
        { id: "u2", role: "user", content: "Also add shops", createdAt: 3 },
      ],
      pivot: {
        id: "u1",
        role: "user",
        content: "Build a lobby system",
        createdAt: 1,
      },
      mode: "after",
    });
    useAiChat.mockReturnValue({
      activeMode: "agent",
      assertCanWrite: jest.fn(() => Promise.resolve()),
      currentChatId: "chat-1",
      generatingChatIds: [],
      generationStage: "",
      handleSubmit: chatHandleSubmit,
      isGenerating: false,
      messages: [
        {
          id: "u1",
          role: "user",
          content: "Build a lobby system",
          createdAt: 1,
        },
        { id: "a1", role: "assistant", content: "Done", createdAt: 2 },
        { id: "u2", role: "user", content: "Also add shops", createdAt: 3 },
      ],
      openChatById: jest.fn(),
      pendingMessage: null,
      setPendingForChat: jest.fn(),
      rewindTranscript,
    });
    const user = {
      uid: "user-1",
      getIdToken: jest.fn().mockResolvedValue("token"),
    };
    const { result } = renderHook(() => useUnifiedChat(user, {}, jest.fn(), jest.fn()));

    await act(async () => {
      await result.current.handleSubmit("Build a lobby system", [], null, {
        rewindFromMessageId: "u1",
        rewindMode: "after",
        projectId: "project_1",
      });
    });

    expect(rewindTranscript).toHaveBeenCalledWith("u1", "after");
    expect(setDoc.mock.calls.some(([, payload]) => payload?.role === "user")).toBe(false);
    expect(createAgentRunV2).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "Build a lobby system",
        conversation: [],
      })
    );
    expect(chatHandleSubmit).toHaveBeenCalledTimes(1);
  });

  test("edit rewind replaces the user turn then writes the edited prompt", async () => {
    const rewindTranscript = jest.fn().mockResolvedValue({
      kept: [],
      removed: [
        {
          id: "u1",
          role: "user",
          content: "Build a lobby system",
          createdAt: 1,
        },
        { id: "a1", role: "assistant", content: "Done", createdAt: 2 },
      ],
      pivot: {
        id: "u1",
        role: "user",
        content: "Build a lobby system",
        createdAt: 1,
      },
      mode: "replace",
    });
    useAiChat.mockReturnValue({
      activeMode: "agent",
      assertCanWrite: jest.fn(() => Promise.resolve()),
      currentChatId: "chat-1",
      generatingChatIds: [],
      generationStage: "",
      handleSubmit: chatHandleSubmit,
      isGenerating: false,
      messages: [
        {
          id: "u1",
          role: "user",
          content: "Build a lobby system",
          createdAt: 1,
        },
        { id: "a1", role: "assistant", content: "Done", createdAt: 2 },
      ],
      openChatById: jest.fn(),
      pendingMessage: null,
      setPendingForChat: jest.fn(),
      rewindTranscript,
    });
    const user = {
      uid: "user-1",
      getIdToken: jest.fn().mockResolvedValue("token"),
    };
    const { result } = renderHook(() => useUnifiedChat(user, {}, jest.fn(), jest.fn()));

    await act(async () => {
      await result.current.handleSubmit("Build a better lobby", [], null, {
        rewindFromMessageId: "u1",
        rewindMode: "replace",
        projectId: "project_1",
      });
    });

    expect(rewindTranscript).toHaveBeenCalledWith("u1", "replace");
    expect(
      setDoc.mock.calls.some(([, payload]) => payload?.role === "user" && payload?.content === "Build a better lobby")
    ).toBe(true);
    expect(createAgentRunV2).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "Build a better lobby",
        conversation: [],
      })
    );
  });

  test("publishes a run id accepted during an early Stop before throwing the local abort", async () => {
    let resolveRun;
    createAgentRunV2.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRun = resolve;
      })
    );
    useAiChat.mockReturnValue({
      activeMode: "agent",
      assertCanWrite: jest.fn(() => Promise.resolve()),
      currentChatId: "chat-early-stop",
      currentChatMeta: { agentId: "agent-1" },
      generatingChatIds: [],
      generationStage: "",
      handleSubmit: chatHandleSubmit,
      isGenerating: false,
      messages: [],
      openChatById: jest.fn(),
      pendingMessage: null,
      setPendingForChat: jest.fn(),
    });
    const user = {
      uid: "user-1",
      getIdToken: jest.fn().mockResolvedValue("token"),
    };
    const controller = new AbortController();
    const onRunId = jest.fn();
    const { result } = renderHook(() => useUnifiedChat(user, {}, jest.fn(), jest.fn()));

    let submission;
    act(() => {
      submission = result.current.handleSubmit("Inspect the Studio project", [], null, {
        mode: "agent",
        projectId: "project-1",
        operationId: "request-early-stop",
        clientMessageId: "request-early-stop",
        operationSignal: controller.signal,
        onRunId,
      });
    });
    while (!createAgentRunV2.mock.calls.length) {
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
    }

    controller.abort();
    resolveRun({
      run: {
        runId: "run-created-during-stop",
        agentId: "agent-1",
        jobId: "job-created-during-stop",
        status: "running",
      },
      authoritativeExecution: true,
      executionDisposition: "launched",
    });

    await act(async () => {
      await expect(submission).rejects.toMatchObject({ name: "AbortError" });
    });
    expect(onRunId).toHaveBeenCalledWith("run-created-during-stop");
    expect(chatHandleSubmit).not.toHaveBeenCalled();
  });
  test.each(["Assemble a weapon bench", "the shooting does not work", "Fix the shooting?"])("unrecognized Agent implementation %s reaches canonical admission", async prompt => {
    classifyUserIntent.mockImplementation(jest.requireActual("../lib/intentClassifier").classifyUserIntent);
    useAiChat.mockReturnValue({ ...useAiChat(), currentChatId: "chat-1", currentChatMeta: {projectId:"project-1"} });
    const {result}=renderHook(()=>useUnifiedChat({uid:"user-1"},{},jest.fn(),jest.fn()));
    await act(async()=>{await result.current.handleSubmit(prompt,[],null,{projectId:"project-1"});});
    expect(createAgentRunV2).toHaveBeenCalledWith(expect.objectContaining({prompt,responseKind:"build",selectedMode:"agent"}));
    expect(orchestrate).not.toHaveBeenCalled();
  });

  test("old model attachments cannot hijack Agent admission", async () => {
    const attachment={id:"a1",versionId:"v1",name:"Ship.rbxm",kind:"model"};
    useAiChat.mockReturnValue({...useAiChat(),currentChatId:"chat-1",messages:[{role:"user",content:"old model",attachments:[attachment]}]});
    const {result}=renderHook(()=>useUnifiedChat({uid:"user-1"},{},jest.fn(),jest.fn()));
    await act(async()=>{await result.current.handleSubmit("Build a map around this model",[attachment],null,{projectId:"project-1"});});
    expect(createAgentRunV2).toHaveBeenCalledWith(expect.objectContaining({attachments:[expect.objectContaining({id:"a1",versionId:"v1"})]}));
  });

  test("explicit Agent planning stays a one-turn Plan override", async () => {
    classifyUserIntent.mockReturnValue("PLANNING_REQUEST");
    useAiChat.mockReturnValue({...useAiChat(),currentChatId:"chat-1"});
    orchestrate.mockResolvedValue({status:"plan",planId:"p1",planVersion:1,planHash:"h1"});
    const {result}=renderHook(()=>useUnifiedChat({uid:"user-1"},{},jest.fn(),jest.fn()));
    await act(async()=>{await result.current.handleSubmit("Plan this first",[],null,{projectId:"project-1"});});
    expect(orchestrate).toHaveBeenCalledWith(expect.objectContaining({mode:"plan"}));
    expect(createAgentRunV2).not.toHaveBeenCalled();
    expect(setDoc.mock.calls.some(([,payload])=>payload.role==="user"&&payload.selectedMode==="agent"&&payload.responseKind==="plan")).toBe(true);
  });

});
