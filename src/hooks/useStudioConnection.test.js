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

    renderHook(() => useStudioConnection());

    await waitFor(() => expect(getStudioStatus).toHaveBeenCalledTimes(1));
    getStudioStatus.mockClear();

    act(() => {
      jest.advanceTimersByTime(14999);
    });
    expect(getStudioStatus).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1);
    });

    await waitFor(() => expect(getStudioStatus).toHaveBeenCalledTimes(1));
  });

  test("hidden documents slow status polling to 60 seconds", async () => {
    getStudioStatus.mockResolvedValue({
      sessions: [{ sessionId: "studio_1", status: "connected", live: true }],
    });

    renderHook(() => useStudioConnection());

    await waitFor(() => expect(getStudioStatus).toHaveBeenCalledTimes(1));
    hidden = true;
    getStudioStatus.mockClear();

    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
      jest.advanceTimersByTime(59999);
    });
    expect(getStudioStatus).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1);
    });

    await waitFor(() => expect(getStudioStatus).toHaveBeenCalledTimes(1));
  });

  test("reconnecting Studio polling stays at 5 seconds and refresh is immediate", async () => {
    getStudioStatus.mockResolvedValue({ sessions: [] });

    const { result } = renderHook(() => useStudioConnection());

    await waitFor(() => expect(getStudioStatus).toHaveBeenCalledTimes(1));
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

    act(() => {
      jest.advanceTimersByTime(1);
    });
    await waitFor(() => expect(getStudioStatus).toHaveBeenCalledTimes(1));
  });

  test("poll delay helper enforces a hidden minimum", () => {
    expect(getStudioStatusPollDelay({ connected: true, hidden: false })).toBe(15000);
    expect(getStudioStatusPollDelay({ connected: false, hidden: false })).toBe(5000);
    expect(getStudioStatusPollDelay({ connected: false, hidden: true })).toBe(60000);
  });
});
