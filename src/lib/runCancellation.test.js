import {
  isServerConfirmedUserCancellation,
  normalizeAuthoritativeRunStatus,
} from "./runCancellation";

describe("authoritative user cancellation", () => {
  test.each([
    { failureCode: "user_cancelled" },
    { errorCode: "USER_CANCELED" },
    { reason: "cancelled-by-user" },
    { error: { code: "canceled_by_user" } },
    { result: { error: { message: "Cancelled by user" } } },
  ])("recognizes server-confirmed cancellation %#", (value) => {
    expect(isServerConfirmedUserCancellation(value)).toBe(true);
    expect(normalizeAuthoritativeRunStatus("failed", value)).toBe("canceled");
  });

  test("does not convert an ordinary cancellation-related failure", () => {
    const failure = {
      code: "STUDIO_COMMAND_FAILED",
      message: "Could not cancel the previous Studio command",
    };
    expect(isServerConfirmedUserCancellation(failure)).toBe(false);
    expect(normalizeAuthoritativeRunStatus("failed", failure)).toBe("failed");
  });

  test("recognizes an exact cancellation code returned as an error message", () => {
    const failure = new Error("user_cancelled");
    expect(isServerConfirmedUserCancellation(failure)).toBe(true);
    expect(normalizeAuthoritativeRunStatus("failed", failure)).toBe("canceled");
  });

  test.each(["user_cancelled", "user_canceled", "cancelled-by-user"])(
    "normalizes a cancellation code used directly as the terminal status: %s",
    (status) => {
      expect(normalizeAuthoritativeRunStatus(status)).toBe("canceled");
    },
  );
});
