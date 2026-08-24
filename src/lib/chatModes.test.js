import {
  DEFAULT_CHAT_MODE,
  formatChatModeLabel,
  normalizeChatMode,
} from "./chatModes";

describe("chat modes", () => {
  test("keeps Plan explicit and migrates legacy modes to autonomous Build", () => {
    expect(normalizeChatMode("plan")).toBe("plan");
    expect(normalizeChatMode("agent")).toBe(DEFAULT_CHAT_MODE);
    expect(normalizeChatMode("ask")).toBe(DEFAULT_CHAT_MODE);
    expect(normalizeChatMode("debug")).toBe(DEFAULT_CHAT_MODE);
  });

  test("uses user-facing labels for runtime mode details", () => {
    expect(formatChatModeLabel("agent")).toBe("Build");
    expect(formatChatModeLabel("plan")).toBe("Plan");
    expect(formatChatModeLabel("ask")).toBe("Read only");
  });
});
