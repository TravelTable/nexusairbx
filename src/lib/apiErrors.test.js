import {
  clearApiRetryCooldown,
  getRetryDelayMs,
  isRetryableApiError,
  parseRetryAfterMs,
  readJsonResponse,
  withApiRetryCooldown,
} from "./apiErrors";

function response({ status = 200, body = {}, headers = {} } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name) => headers[name] || headers[name.toLowerCase()] || null,
    },
    text: jest.fn().mockResolvedValue(JSON.stringify(body)),
  };
}

test("readJsonResponse preserves retryable error metadata", async () => {
  await expect(
    readJsonResponse(
      response({
        status: 503,
        headers: { "Retry-After": "45" },
        body: {
          error: "Database temporarily unavailable",
          code: "FIRESTORE_QUOTA_EXCEEDED",
          retryable: true,
        },
      }),
      "Fallback"
    )
  ).rejects.toMatchObject({
    message: "Database temporarily unavailable",
    status: 503,
    code: "FIRESTORE_QUOTA_EXCEEDED",
    retryable: true,
    retryAfter: "45",
    retryAfterMs: 45000,
  });
});

test("retry helpers parse seconds, HTTP dates, and retryable status codes", () => {
  expect(parseRetryAfterMs("3")).toBe(3000);
  expect(parseRetryAfterMs("Thu, 09 Jul 2026 00:01:00 GMT", Date.parse("Thu, 09 Jul 2026 00:00:00 GMT"))).toBe(60000);
  expect(isRetryableApiError({ status: 503 })).toBe(true);
  expect(getRetryDelayMs({ retryAfterMs: 12000 })).toBe(12000);
});

test("withApiRetryCooldown skips duplicate network work during retry window", async () => {
  const key = "api-errors-test:cooldown";
  const nowSpy = jest.spyOn(Date, "now").mockReturnValue(1000);
  const task = jest.fn().mockRejectedValueOnce(Object.assign(new Error("Database busy"), {
    status: 503,
    retryable: true,
    retryAfterMs: 30000,
  }));

  await expect(withApiRetryCooldown(key, "Failed to load", task)).rejects.toThrow("Database busy");
  await expect(withApiRetryCooldown(key, "Failed to load", task)).rejects.toMatchObject({
    status: 503,
    code: "API_RETRY_COOLDOWN",
    retryable: true,
    retryAfterMs: 30000,
    localCooldown: true,
  });
  expect(task).toHaveBeenCalledTimes(1);

  clearApiRetryCooldown(key);
  nowSpy.mockRestore();
});
