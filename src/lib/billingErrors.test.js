import {
  INSUFFICIENT_TOKENS_CODE,
  isInsufficientTokensError,
  insufficientTokensMessage,
  insufficientTokensToast,
  parseApiErrorPayload,
} from "./billingErrors";

describe("billingErrors", () => {
  it("detects insufficient token payloads", () => {
    expect(isInsufficientTokensError({ code: INSUFFICIENT_TOKENS_CODE })).toBe(true);
    expect(parseApiErrorPayload({ code: INSUFFICIENT_TOKENS_CODE, message: "Out" })).toEqual({
      code: INSUFFICIENT_TOKENS_CODE,
      message: "Out",
      retryable: false,
    });
  });

  it("builds plan-aware toast copy", () => {
    expect(insufficientTokensMessage("free")).toMatch(/Free usage/i);
    expect(insufficientTokensToast("free").cta?.label).toBe("View plans");
    expect(insufficientTokensToast("pro").cta?.label).toBe("Add balance");
    expect(insufficientTokensToast("team").cta).toBeUndefined();
  });

  it("maps Free usage backend codes to friendly messages", () => {
    const parsed = parseApiErrorPayload({ code: "FREE_CONCURRENT_JOB_LIMIT" });
    expect(parsed.message).toMatch(/one AI job/i);
    expect(parsed.message).not.toMatch(/FREE_CONCURRENT_JOB_LIMIT/);
  });
});
