import {
  PENDING_AUTH_ACTIONS,
  clearPendingAuthAction,
  completePendingAuthAction,
  consumeExpiredPendingAuthAction,
  createPendingAuthAction,
  getPendingAuthReturnPath,
  markPendingAuthActionInProgress,
  readPendingAuthAction,
  resetPendingAuthActionsForTests,
} from "./pendingAuthAction";

describe("pendingAuthAction", () => {
  beforeEach(() => {
    resetPendingAuthActionsForTests();
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-06-25T00:00:00.000Z"));
  });

  afterEach(() => {
    resetPendingAuthActionsForTests();
    jest.useRealTimers();
  });

  test("stores exact action metadata without prompt or code payloads", () => {
    const pending = createPendingAuthAction({
      action: PENDING_AUTH_ACTIONS.SAVE_PROJECT,
      returnPath: "/ai",
      workspace: "quick_script",
      payload: {
        quickScriptResultId: "anon_result_1",
        prompt: "secret prompt",
        code: "print('secret')",
      },
    });

    const restored = readPendingAuthAction();
    expect(restored).toMatchObject({
      id: pending.id,
      action: PENDING_AUTH_ACTIONS.SAVE_PROJECT,
      returnPath: "/ai",
      workspace: "quick_script",
      payload: {
        quickScriptResultId: "anon_result_1",
      },
    });
    expect(JSON.stringify(restored)).not.toContain("secret prompt");
    expect(JSON.stringify(restored)).not.toContain("print");
  });

  test("stores sanitized chat submissions for auth resume", () => {
    createPendingAuthAction({
      action: PENDING_AUTH_ACTIONS.CHAT_SUBMIT,
      returnPath: "/ai",
      workspace: "agent_build",
      payload: {
        prompt: "Build from this attached spec",
        code: "print('still secret')",
        chatMode: "ask",
        modelVersion: "gpt-4.1-mini",
        attachments: [
          {
            name: " spec.txt ",
            type: "text/plain",
            data: "Make a lobby",
            isImage: false,
          },
        ],
      },
    });

    const restored = readPendingAuthAction();
    expect(restored).toMatchObject({
      action: PENDING_AUTH_ACTIONS.CHAT_SUBMIT,
      workspace: "agent_build",
      payload: {
        prompt: "Build from this attached spec",
        chatMode: "ask",
        modelVersion: "gpt-4.1-mini",
        attachments: [
          {
            name: "spec.txt",
            type: "text/plain",
            data: "Make a lobby",
            isImage: false,
          },
        ],
      },
    });
    expect(JSON.stringify(restored)).not.toContain("still secret");
  });

  test("expires safely and returns recoverable expired action", () => {
    createPendingAuthAction({
      action: PENDING_AUTH_ACTIONS.EXPORT_PROJECT,
      returnPath: "/ai",
      expiresAt: Date.now() + 1000,
    });

    jest.advanceTimersByTime(1001);

    expect(readPendingAuthAction()).toBeNull();
    expect(consumeExpiredPendingAuthAction()).toMatchObject({
      action: PENDING_AUTH_ACTIONS.EXPORT_PROJECT,
      expired: true,
    });
    expect(readPendingAuthAction({ includeExpired: true })).toBeNull();
  });

  test("marks in progress and completes once to prevent duplicate callbacks", () => {
    const pending = createPendingAuthAction({
      action: PENDING_AUTH_ACTIONS.PUSH_TO_STUDIO,
      returnPath: "/ai",
    });

    expect(markPendingAuthActionInProgress(pending.id)).toMatchObject({
      id: pending.id,
      status: "in_progress",
    });
    expect(markPendingAuthActionInProgress(pending.id)).toBeNull();
    expect(completePendingAuthAction(pending.id, { resumedOutcome: "completed" })).toBe(true);
    expect(completePendingAuthAction(pending.id, { resumedOutcome: "completed" })).toBe(false);
    expect(readPendingAuthAction()).toBeNull();
  });

  test("normalizes unsafe return paths", () => {
    createPendingAuthAction({
      action: PENDING_AUTH_ACTIONS.UPGRADE_TO_AGENT_BUILD,
      returnPath: "https://example.com/steal",
    });

    expect(getPendingAuthReturnPath("/ai")).toBe("/ai");
    clearPendingAuthAction();
  });
});
