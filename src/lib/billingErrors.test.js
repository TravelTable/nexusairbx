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
    expect(insufficientTokensMessage("free")).toMatch(/out of tokens/i);
    expect(insufficientTokensToast("free").cta?.label).toBe("View plans");
    expect(insufficientTokensToast("pro").cta?.label).toBe("Add tokens");
    expect(insufficientTokensToast("team").cta).toBeUndefined();
  });
});
