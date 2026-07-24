import {
  jitterDelay,
  PollingLimitError,
  waitForPollingDelay,
} from "./boundedPolling";

describe("bounded polling helpers", () => {
  test("adds bounded jitter around the requested delay", () => {
    expect(jitterDelay(1000, () => 0)).toBe(900);
    expect(jitterDelay(1000, () => 0.5)).toBe(1000);
    expect(jitterDelay(1000, () => 1)).toBe(1100);
  });

  test("stops an in-flight wait when aborted", async () => {
    const controller = new AbortController();
    const pending = waitForPollingDelay(60000, {
      signal: controller.signal,
    });

    controller.abort();

    await expect(pending).rejects.toMatchObject({
      name: "AbortError",
      code: "ABORTED",
    });
  });

  test("uses a non-retryable typed error when the polling budget is exhausted", () => {
    expect(new PollingLimitError()).toMatchObject({
      name: "PollingLimitError",
      code: "POLLING_LIMIT_REACHED",
      kind: "polling",
      retryable: false,
    });
  });
});
