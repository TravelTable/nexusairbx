import {
  sanitizeChatWritePayload,
  sanitizeClarificationQuestions,
  sanitizeStudioTargetPreference,
  sanitizeTranscriptMessagePayload,
} from "./firestorePayloads";

describe("Firestore payload sanitizers", () => {
  test("filters invalid clarification entries and persists at most three questions", () => {
    const questions = sanitizeClarificationQuestions([
      null,
      false,
      "",
      " Who is this for? ",
      { id: "platform", prompt: "Which platform?", missing: undefined },
      undefined,
      { id: "scope", prompt: "What scope?" },
      { id: "ignored", prompt: "Fourth valid question" },
    ]);

    expect(questions).toEqual([
      "Who is this for?",
      { id: "platform", prompt: "Which platform?" },
      { id: "scope", prompt: "What scope?" },
    ]);
  });

  test("keeps only durable Studio target preference fields and rejects place zero", () => {
    const target = sanitizeStudioTargetPreference({
      targetId: " target-1 ",
      placeId: "0",
      label: " Lobby ",
      updatedAt: "timestamp-sentinel",
      sessionId: "secret-session",
      connectionType: "plugin_bridge",
      capabilities: ["writeProject"],
      candidates: [{ sessionId: "other-session" }],
    });

    expect(target).toEqual({
      targetId: "target-1",
      label: "Lobby",
      updatedAt: "timestamp-sentinel",
    });
    expect(Object.isFrozen(target)).toBe(true);
    expect(sanitizeStudioTargetPreference({
      placeId: 0,
      sessionId: "transport-only",
    })).toBeNull();
  });

  test("strips transport fields from persisted targeting without mutating the input", () => {
    const payload = {
      role: "assistant",
      stage: "plan",
      targeting: {
        projectId: "project-1",
        studioConnected: true,
        studioSessionId: "session-1",
        connectionType: "plugin_bridge",
        candidates: [{ id: "candidate-1" }],
        studioTarget: {
          targetId: "target-1",
          placeId: " 42 ",
          label: "Arena",
          sessionId: "session-1",
        },
      },
      attachments: Array.from({ length: 7 }, (_, index) => ({
        name: `file-${index}.txt`,
        type: "text/plain",
        data: "x",
        internalPath: `/tmp/file-${index}`,
      })),
    };

    const sanitized = sanitizeTranscriptMessagePayload(payload);
    expect(sanitized.targeting).toEqual({
      projectId: "project-1",
      studioConnected: true,
      studioTarget: {
        targetId: "target-1",
        placeId: "42",
        label: "Arena",
      },
    });
    expect(sanitized.attachments).toHaveLength(5);
    expect(sanitized.attachments[0]).toEqual({
      name: "file-0.txt",
      type: "text/plain",
      isImage: false,
      data: "x",
    });
    expect(payload.targeting.studioSessionId).toBe("session-1");
    expect(payload.attachments).toHaveLength(7);
  });

  test("uses the same target policy for chat writes", () => {
    expect(sanitizeChatWritePayload({
      studioTargetPreference: {
        targetId: "target-1",
        placeId: "0",
        sessionId: "must-not-persist",
      },
    })).toEqual({
      studioTargetPreference: { targetId: "target-1" },
    });
  });
});
