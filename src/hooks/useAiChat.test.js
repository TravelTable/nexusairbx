import { act, renderHook } from "@testing-library/react";
import { useAiChat } from "./useAiChat";
import { useBilling } from "../context/BillingContext";
import { ensureStreamSession } from "../lib/streamSession";
import { parseCompletedGenerateResult } from "../lib/streamRecovery";
import { onAiEvent } from "../lib/aiEvents";
import { doc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";

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
  getDocs: jest.fn(),
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
  getPendingStreamSnapshot: jest.fn((state) => state),
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
    serverTimestamp.mockImplementation(() => "timestamp");
    setDoc.mockImplementation(() => Promise.resolve());
    updateDoc.mockImplementation(() => Promise.resolve());
    onAiEvent.mockImplementation(() => jest.fn());
    ensureStreamSession.mockResolvedValue({ token: null });
    parseCompletedGenerateResult.mockReturnValue(null);
  });

  test("persists an assistant failure when result recovery fails without a run id", async () => {
    const user = {
      uid: "user_1",
      getIdToken: jest.fn().mockResolvedValue("token_1"),
    };
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
});
