import {
  cancelDeferredClientLog,
  scheduleDeferredClientLog,
} from "./deferredClientLog";

describe("deferredClientLog", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test("waits before posting client logs", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchImpl;

    scheduleDeferredClientLog({
      key: "test",
      source: "firestore",
      message: "channel transport failed",
      delayMs: 2500,
      backendUrl: "http://localhost:9999",
    });

    expect(fetchImpl).not.toHaveBeenCalled();
    jest.advanceTimersByTime(2499);
    expect(fetchImpl).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://localhost:9999/api/client-log",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          source: "firestore",
          message: "channel transport failed",
        }),
      })
    );
  });

  test("cancels a pending log when the connection recovers", () => {
    const fetchImpl = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchImpl;

    scheduleDeferredClientLog({
      key: "test",
      source: "firestore",
      message: "channel transport failed",
      delayMs: 2500,
      backendUrl: "http://localhost:9999",
    });

    cancelDeferredClientLog("test");
    jest.advanceTimersByTime(3000);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
