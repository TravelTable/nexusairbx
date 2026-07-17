import {
  INSUFFICIENT_TOKENS_CODE,
  isInsufficientTokensError,
  insufficientTokensMessage,
  insufficientTokensToast,
  parseApiErrorPayload,
  formatUserFacingError,
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
    expect(insufficientTokensMessage("free")).toMatch(/Daily Free usage reached/i);
    expect(insufficientTokensToast("free").cta?.label).toBe("View plans");
    expect(insufficientTokensToast("pro").cta?.label).toBe("Add balance");
    expect(insufficientTokensToast("team").cta).toBeUndefined();
  });

  it("maps PLAN_REQUIRED to Starter messaging", () => {
    const parsed = parseApiErrorPayload({ code: "PLAN_REQUIRED" });
    expect(parsed.message).toMatch(/Starter/i);
  });

  it("maps Free usage backend codes to friendly messages", () => {
    const parsed = parseApiErrorPayload({ code: "FREE_CONCURRENT_JOB_LIMIT" });
    expect(parsed.message).toMatch(/one AI job/i);
    expect(parsed.message).not.toMatch(/FREE_CONCURRENT_JOB_LIMIT/);
  });

  it("maps infrastructure quota errors to friendly copy", () => {
    expect(formatUserFacingError("8 RESOURCE_EXHAUSTED: Quota exceeded.")).toMatch(/temporarily busy/i);
    const parsed = parseApiErrorPayload({ code: "FIRESTORE_QUOTA_EXCEEDED", retryable: true });
    expect(parsed.message).toMatch(/temporarily busy/i);
    expect(parsed.retryable).toBe(true);
  });

  it("does not expose internal Studio connection diagnostics", () => {
    const message = formatUserFacingError({
      code: "MCP_SESSION_DISCONNECTED",
      message: "MCP tooling reports the previously active Studio is disconnected or no place is open.",
    });
    expect(message).toBe("Studio is unavailable right now. Reconnect Studio and try again.");
    expect(message).not.toMatch(/MCP|place is open/i);
  });
});
