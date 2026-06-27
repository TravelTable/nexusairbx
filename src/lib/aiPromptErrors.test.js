import { createImprovePromptError, formatImprovePromptErrorMessage } from "./aiPromptErrors";

describe("aiPromptErrors", () => {
  test("preserves retryable provider metadata for improve-prompt failures", () => {
    const res = {
      status: 502,
      headers: { get: jest.fn(() => "req_header") },
    };

    const err = createImprovePromptError(res, {
      code: "AI_PROVIDER_CHANNEL_UNAVAILABLE",
      message: "Prompt improvement is unavailable right now.",
      retryable: true,
      requestId: "req_body",
    });

    expect(err.status).toBe(502);
    expect(err.code).toBe("AI_PROVIDER_CHANNEL_UNAVAILABLE");
    expect(err.retryable).toBe(true);
    expect(err.requestId).toBe("req_body");
    expect(formatImprovePromptErrorMessage(err)).toBe(
      "Prompt improvement is unavailable right now. You can retry in a moment. Request ID: req_body"
    );
  });
});
