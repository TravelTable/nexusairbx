import { act, renderHook, waitFor } from "@testing-library/react";
import {
  getStudioStatusPollDelay,
  useStudioConnection,
} from "./useStudioConnection";
import { getStudioStatus } from "../lib/studioBridgeApi";

jest.mock("../lib/studioBridgeApi", () => ({
  getStudioStatus: jest.fn(),
}));

describe("useStudioConnection", () => {
  let hidden = false;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    hidden = false;
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => hidden,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("connected Studio polling idles at 15 seconds", async () => {
    getStudioStatus.mockResolvedValue({
      sessions: [{ sessionId: "studio_1", status: "connected", live: true }],
    });

    const hook = renderHook(() => useStudioConnection());

    await waitFor(() => expect(hook.result.current.loading).toBe(false));
    expect(getStudioStatus).toHaveBeenCalledTimes(1);
    getStudioStatus.mockClear();

    act(() => {
      jest.advanceTimersByTime(14999);
    });
    expect(getStudioStatus).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(1);
      await Promise.resolve();
    });

    await waitFor(() => expect(getStudioStatus).toHaveBeenCalledTimes(1));
  });

  test("hidden documents slow status polling to 60 seconds", async () => {
    getStudioStatus.mockResolvedValue({
      sessions: [{ sessionId: "studio_1", status: "connected", live: true }],
    });

    const hook = renderHook(() => useStudioConnection());

    await waitFor(() => expect(hook.result.current.loading).toBe(false));
    expect(getStudioStatus).toHaveBeenCalledTimes(1);
    hidden = true;
    getStudioStatus.mockClear();

    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      jest.advanceTimersByTime(59999);
      await Promise.resolve();
    });
    expect(getStudioStatus).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(1);
      await Promise.resolve();
    });

    await waitFor(() => expect(getStudioStatus).toHaveBeenCalledTimes(1));
  });

  test("reconnecting Studio polling stays at 5 seconds and refresh is immediate", async () => {
    getStudioStatus.mockResolvedValue({ sessions: [] });

    const { result } = renderHook(() => useStudioConnection());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(getStudioStatus).toHaveBeenCalledTimes(1);
    getStudioStatus.mockClear();

    await act(async () => {
      await result.current.refresh();
    });
    expect(getStudioStatus).toHaveBeenCalledTimes(1);

    getStudioStatus.mockClear();
    act(() => {
      jest.advanceTimersByTime(4999);
    });
    expect(getStudioStatus).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(1);
      await Promise.resolve();
    });
    await waitFor(() => expect(getStudioStatus).toHaveBeenCalledTimes(1));
  });

  test("poll delay helper enforces a hidden minimum", () => {
    expect(getStudioStatusPollDelay({ connected: true, hidden: false })).toBe(15000);
    expect(getStudioStatusPollDelay({ connected: false, hidden: false })).toBe(5000);
    expect(getStudioStatusPollDelay({ connected: false, hidden: true })).toBe(60000);
    expect(getStudioStatusPollDelay({ connected: true, hidden: false, retryAfterMs: 30000 })).toBe(30000);
  });

  test("retryable status errors preserve the last connection and back off", async () => {
    getStudioStatus
      .mockResolvedValueOnce({
        sessions: [{ sessionId: "studio_1", status: "connected", live: true }],
      })
      .mockRejectedValueOnce(Object.assign(new Error("Database busy"), {
        status: 503,
        retryable: true,
        retryAfterMs: 30000,
      }))
      .mockResolvedValue({
        sessions: [{ sessionId: "studio_1", status: "connected", live: true }],
      });

    const hook = renderHook(() => useStudioConnection());

    await waitFor(() => expect(hook.result.current.loading).toBe(false));
    expect(hook.result.current.connected).toBe(true);

    await act(async () => {
      jest.advanceTimersByTime(15000);
      await Promise.resolve();
    });
    await waitFor(() => expect(getStudioStatus).toHaveBeenCalledTimes(2));
    expect(hook.result.current.connected).toBe(true);

    await act(async () => {
      await hook.result.current.refresh({ force: false });
    });
    expect(getStudioStatus).toHaveBeenCalledTimes(2);

    act(() => {
      jest.advanceTimersByTime(29999);
    });
    expect(getStudioStatus).toHaveBeenCalledTimes(2);

    await act(async () => {
      jest.advanceTimersByTime(1);
      await Promise.resolve();
    });
    await waitFor(() => expect(getStudioStatus).toHaveBeenCalledTimes(3));
  });
});
