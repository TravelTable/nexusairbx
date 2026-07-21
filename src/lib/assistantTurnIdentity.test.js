import { getAssistantTurnIdentity, reconcileAssistantTurns } from "./assistantTurnIdentity";

describe("assistant turn identity", () => {
  test("uses the documented identity priority with namespaced keys", () => {
    expect(getAssistantTurnIdentity({
      requestId: "request-1",
      runId: "run-1",
      jobId: "job-1",
      id: "message-1",
    })).toBe("request:request-1");
    expect(getAssistantTurnIdentity({ runId: "run-1", jobId: "job-1", id: "message-1" })).toBe("run:run-1");
    expect(getAssistantTurnIdentity({ jobId: "job-1", id: "message-1" })).toBe("job:job-1");
    expect(getAssistantTurnIdentity({ id: "message-1" })).toBe("message:message-1");
  });

  test("does not merge unrelated keyless turns", () => {
    const turns = reconcileAssistantTurns([
      { role: "assistant", prompt: "First request" },
      { role: "assistant", prompt: "Second request" },
    ]);

    expect(turns).toHaveLength(2);
    expect(turns.map((turn) => turn.prompt)).toEqual(["First request", "Second request"]);
  });
});
