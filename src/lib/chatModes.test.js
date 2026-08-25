import { DEFAULT_CHAT_MODE, formatChatModeLabel, normalizeChatMode } from "./chatModes";

describe("chat modes", () => {
  test("keeps the three conversational modes and migrates legacy modes to Agent", () => {
    expect(normalizeChatMode("plan")).toBe("plan");
    expect(normalizeChatMode("agent")).toBe(DEFAULT_CHAT_MODE);
    expect(normalizeChatMode("ask")).toBe("ask");
    expect(normalizeChatMode("debug")).toBe(DEFAULT_CHAT_MODE);
  });

  test("uses user-facing labels for runtime mode details", () => {
    expect(formatChatModeLabel("agent")).toBe("Agent");
    expect(formatChatModeLabel("plan")).toBe("Plan");
    expect(formatChatModeLabel("ask")).toBe("Ask");
  });
});
