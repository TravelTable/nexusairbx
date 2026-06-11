import {
  applyStreamDelta,
  createPendingStreamState,
  formatPendingStreamContent,
  getPendingStreamSnapshot,
  parsePendingStreamContent,
} from "./streaming";

describe("streaming utils", () => {
  test("applies deltas in sequence and ignores stale seq", () => {
    let state = createPendingStreamState();

    state = applyStreamDelta(state, { seq: 1, channel: "explanation", text: "Hello" });
    state = applyStreamDelta(state, { seq: 2, channel: "code", text: "print('a')" });
    state = applyStreamDelta(state, { seq: 1, channel: "code", text: "ignored" });

    expect(state.explanation).toBe("Hello");
    expect(state.code).toBe("print('a')");
    expect(state.seq).toBe(2);
  });

  test("formats and parses structured stream content", () => {
    const state = {
      thought: "",
      explanation: "Build services first",
      code: "local x = 1",
      content: "",
      seq: 3,
      startedAt: Date.now(),
    };

    const content = formatPendingStreamContent(state);
    const parsed = parsePendingStreamContent(content);

    expect(parsed.hasStructured).toBe(true);
    expect(parsed.explanation).toBe("Build services first");
    expect(parsed.code).toContain("local x = 1");
  });

  test("keeps thought deltas out of visible pending content", () => {
    let state = createPendingStreamState();

    state = applyStreamDelta(state, { seq: 1, channel: "thought", text: "Internal analysis" });
    expect(formatPendingStreamContent(state)).toBe("");

    const snapshot = getPendingStreamSnapshot(state);
    expect(snapshot.thought).toBe("Internal analysis");
    expect(snapshot.hasThought).toBe(true);
    expect(snapshot.hasVisibleOutput).toBe(false);

    state = applyStreamDelta(state, { seq: 2, channel: "content", text: "Visible answer" });
    expect(formatPendingStreamContent(state)).toBe("Visible answer");
  });
});
