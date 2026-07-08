import {
  describeChatAttachments,
  formatChatAttachmentsForPrompt,
  messageToConversationEntry,
  normalizeChatAttachments,
} from "./chatAttachments";

describe("chatAttachments", () => {
  test("normalizes bounded attachment metadata and data", () => {
    const attachments = normalizeChatAttachments([
      {
        name: " spec.txt ",
        type: "text/plain",
        data: "a".repeat(130000),
      },
    ]);

    expect(attachments).toEqual([
      {
        name: "spec.txt",
        type: "text/plain",
        isImage: false,
        data: "a".repeat(120000),
      },
    ]);
  });

  test("describes attachment-only messages", () => {
    expect(describeChatAttachments([{ name: "map.txt", type: "text/plain" }])).toBe("Attached: map.txt");
  });

  test("adds persisted attachment context to conversation history", () => {
    expect(
      messageToConversationEntry({
        role: "user",
        content: "Use this",
        attachments: [{ name: "brief.txt", type: "text/plain", data: "Build a lobby" }],
      })
    ).toEqual({
      role: "user",
      content: "Use this\n\nAttached files:\n- brief.txt (text/plain)\n```\nBuild a lobby\n```",
    });
  });

  test("omits raw image data from prompt context", () => {
    expect(
      formatChatAttachmentsForPrompt([
        { name: "mock.png", type: "image/png", isImage: true, data: "data:image/png;base64,abc" },
      ])
    ).toBe("Attached files:\n- mock.png (image/png)\n  [image data attached]");
  });
});
