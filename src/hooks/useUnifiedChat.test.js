import { act, renderHook } from "@testing-library/react";
import { TextDecoder as NodeTextDecoder } from "util";
import { setDoc } from "firebase/firestore";
import { useUnifiedChat } from "./useUnifiedChat";
import { useAiChat } from "./useAiChat";
import { trackProductEvent } from "../lib/productAnalytics";
import { FEATURE_FLAGS } from "../lib/featureFlags";
import { getStudioEnabledPreference } from "../lib/agentSteps";
import { getStudioStatus } from "../lib/studioBridgeApi";
import { orchestrate } from "../lib/workflowApi";
import { classifyUserIntent, isImplementationIntent } from "../lib/intentClassifier";

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
  getStudioEnabledPreference: jest.fn(() => false),
}));

jest.mock("../lib/studioBridgeApi", () => ({
  getStudioStatus: jest.fn(),
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
    classifyUserIntent.mockReturnValue("IMPLEMENTATION");
    isImplementationIntent.mockReturnValue(true);
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
    expect(chatHandleSubmit).toHaveBeenCalledWith(
      "Build a lobby system",
      "chat-1",
      null,
      "agent",
      true,
      [],
      null,
      taskOptions,
    );
    expect(orchestrate).not.toHaveBeenCalled();
  });
});
