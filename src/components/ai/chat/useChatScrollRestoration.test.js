import {
  readChatScrollPositions,
  writeChatScrollPosition,
} from "./useChatScrollRestoration";

function createStorage(initialValue = null) {
  let value = initialValue;
  return {
    getItem: jest.fn(() => value),
    setItem: jest.fn((key, nextValue) => {
      value = nextValue;
    }),
  };
}

describe("chat scroll position storage", () => {
  test("preserves positions independently for each chat", () => {
    const storage = createStorage();

    writeChatScrollPosition("chat-one", 124.6, storage);
    writeChatScrollPosition("chat-two", 48, storage);

    expect(readChatScrollPositions(storage)).toEqual({
      "chat-one": 125,
      "chat-two": 48,
    });
  });

  test("recovers safely from invalid stored data", () => {
    const storage = createStorage("{not-json");

    expect(readChatScrollPositions(storage)).toEqual({});
    expect(() => writeChatScrollPosition("chat-one", -20, storage)).not.toThrow();
    expect(readChatScrollPositions(storage)).toEqual({ "chat-one": 0 });
  });
});
