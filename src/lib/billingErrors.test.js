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
    expect(insufficientTokensMessage("free")).toMatch(/paid plan is required/i);
    expect(insufficientTokensToast("free").cta?.label).toBe("View plans");
    expect(insufficientTokensToast("pro").cta?.label).toBe("Add balance");
    expect(insufficientTokensToast("team").cta).toBeUndefined();
  });

  it("points PLAN_REQUIRED at a paid subscription without free usage", () => {
    const parsed = parseApiErrorPayload({ code: "PLAN_REQUIRED" });
    expect(parsed.message).toMatch(/paid subscription/i);
    expect(parsed.message).toMatch(/no free trial/i);
    expect(parsed.message).not.toMatch(/Starter/i);
  });

  it("maps a Free project cap to an upgrade prompt", () => {
    const parsed = parseApiErrorPayload({ code: "LIMIT_REACHED" });
    expect(parsed.message).toMatch(/one active project/i);
    expect(parsed.message).not.toMatch(/LIMIT_REACHED/);
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

  it("maps refinement conflicts to an actionable message", () => {
    const message = formatUserFacingError({
      code: "REFINE_NEEDS_REBASE",
      message: "REFINE_NEEDS_REBASE",
    });
    expect(message).toMatch(/changed while the refinement was running/i);
    expect(message).toMatch(/reload/i);
    expect(message).not.toMatch(/REFINE_NEEDS_REBASE/);
  });
});
