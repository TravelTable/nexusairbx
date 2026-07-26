import {
  mergeMessagesById,
  normalizeRewindMode,
  REWIND_MODES,
  selectMessagesToRemove,
  shouldWriteUserMessageAfterRewind,
  sortMessagesByCreatedAt,
} from "./chatTranscriptRewind";

describe("chatTranscriptRewind", () => {
  const messages = [
    { id: "u1", role: "user", content: "A", createdAt: 1 },
    { id: "a1", role: "assistant", content: "reply A", createdAt: 2 },
    { id: "u2", role: "user", content: "B", createdAt: 3 },
    { id: "a2", role: "assistant", content: "reply B", createdAt: 4 },
  ];

  test("sortMessagesByCreatedAt orders by createdAt", () => {
    const shuffled = [messages[2], messages[0], messages[3], messages[1]];
    expect(sortMessagesByCreatedAt(shuffled).map((m) => m.id)).toEqual(["u1", "a1", "u2", "a2"]);
  });

  test("selectMessagesToRemove after keeps the pivot", () => {
    const result = selectMessagesToRemove(messages, "u1", REWIND_MODES.AFTER);
    expect(result.kept.map((m) => m.id)).toEqual(["u1"]);
    expect(result.removed.map((m) => m.id)).toEqual(["a1", "u2", "a2"]);
    expect(result.pivot?.id).toBe("u1");
  });

  test("selectMessagesToRemove replace drops the pivot", () => {
    const result = selectMessagesToRemove(messages, "u1", REWIND_MODES.REPLACE);
    expect(result.kept.map((m) => m.id)).toEqual([]);
    expect(result.removed.map((m) => m.id)).toEqual(["u1", "a1", "u2", "a2"]);
  });

  test("selectMessagesToRemove replace on assistant keeps preceding user", () => {
    const result = selectMessagesToRemove(messages, "a1", REWIND_MODES.REPLACE);
    expect(result.kept.map((m) => m.id)).toEqual(["u1"]);
    expect(result.removed.map((m) => m.id)).toEqual(["a1", "u2", "a2"]);
  });

  test("selectMessagesToRemove returns empty removed when pivot is missing", () => {
    const result = selectMessagesToRemove(messages, "missing", REWIND_MODES.AFTER);
    expect(result.kept).toEqual(messages);
    expect(result.removed).toEqual([]);
    expect(result.pivot).toBeNull();
  });

  test("mergeMessagesById dedupes and sorts", () => {
    const merged = mergeMessagesById(
      [{ id: "u1", createdAt: 1 }],
      [{ id: "u1", content: "updated", createdAt: 1 }, { id: "a1", createdAt: 2 }]
    );
    expect(merged).toHaveLength(2);
    expect(merged[0]).toEqual(expect.objectContaining({ id: "u1", content: "updated" }));
  });

  test("shouldWriteUserMessageAfterRewind only for replace on user", () => {
    expect(shouldWriteUserMessageAfterRewind("replace", "user")).toBe(true);
    expect(shouldWriteUserMessageAfterRewind("after", "user")).toBe(false);
    expect(shouldWriteUserMessageAfterRewind("replace", "assistant")).toBe(false);
    expect(normalizeRewindMode("replace")).toBe(REWIND_MODES.REPLACE);
    expect(normalizeRewindMode("after")).toBe(REWIND_MODES.AFTER);
  });
});
