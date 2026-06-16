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

  test("assembles file events into pending files", () => {
    let state = createPendingStreamState();

    state = applyStreamDelta(state, {
      seq: 1,
      channel: "file_event",
      event: {
        event: "file_start",
        fileId: "inventory",
        path: "ServerScriptService/InventoryService.server.lua",
        kind: "server",
      },
    });
    state = applyStreamDelta(state, {
      seq: 2,
      channel: "file_event",
      event: { event: "file_chunk", fileId: "inventory", sequence: 0, content: "local Inventory = " },
    });
    state = applyStreamDelta(state, {
      seq: 3,
      channel: "file_event",
      event: { event: "file_chunk", fileId: "inventory", sequence: 1, content: "{}" },
    });
    state = applyStreamDelta(state, {
      seq: 4,
      channel: "file_event",
      event: { event: "file_end", fileId: "inventory", sourceHash: "abc" },
    });

    const snapshot = getPendingStreamSnapshot(state);
    expect(snapshot.hasFiles).toBe(true);
    expect(snapshot.hasVisibleOutput).toBe(true);
    expect(snapshot.activeFileId).toBe("inventory");
    expect(snapshot.fileCounts).toMatchObject({
      discovered: 1,
      writing: 0,
      reviewing: 1,
      ready: 0,
    });
    expect(snapshot.files[0]).toMatchObject({
      id: "inventory",
      status: "reviewing",
      content: "local Inventory = {}",
      lineCount: 1,
    });
  });

  test("file_ready replaces streaming file with authoritative content by path", () => {
    let state = createPendingStreamState();
    state = applyStreamDelta(state, {
      seq: 1,
      channel: "file_event",
      event: { event: "file_start", fileId: "provisional-a", path: "ReplicatedStorage/A.lua" },
    });
    state = applyStreamDelta(state, {
      seq: 2,
      channel: "file_event",
      event: {
        event: "file_ready",
        file: {
          id: "final-a",
          path: "ReplicatedStorage/A.lua",
          kind: "module",
          content: "return {\n  ready = true\n}",
          contentHash: "hash",
        },
      },
    });

    expect(getPendingStreamSnapshot(state).files).toHaveLength(1);
    expect(getPendingStreamSnapshot(state).activeFileId).toBe("final-a");
    expect(getPendingStreamSnapshot(state).fileCounts.ready).toBe(1);
    expect(getPendingStreamSnapshot(state).files[0]).toMatchObject({
      id: "final-a",
      status: "ready",
      contentHash: "hash",
      content: "return {\n  ready = true\n}",
      lineCount: 3,
    });
  });
});
