import { act, renderHook } from "@testing-library/react";
import { useUnifiedChat } from "./useUnifiedChat";
import { useAiChat } from "./useAiChat";
import { trackProductEvent } from "../lib/productAnalytics";

jest.mock("../firebase", () => ({
  db: {},
}));

jest.mock("firebase/firestore", () => ({
  addDoc: jest.fn(),
  collection: jest.fn(),
  doc: jest.fn(),
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

  beforeEach(() => {
    jest.clearAllMocks();
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
});
