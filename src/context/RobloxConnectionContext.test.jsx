import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";

let mockBillingValue;

jest.mock("./BillingContext", () => ({
  useBilling: () => mockBillingValue,
}));
jest.mock("../lib/robloxOAuthApi", () => ({
  getRobloxOAuthStatus: jest.fn(),
  requireRobloxOnboarding: jest.fn(),
}));

import { getRobloxOAuthStatus } from "../lib/robloxOAuthApi";
import { RobloxConnectionProvider, useRobloxConnection } from "./RobloxConnectionContext";

const wrapper = ({ children }) => (
  <RobloxConnectionProvider staleMs={0}>{children}</RobloxConnectionProvider>
);

describe("RobloxConnectionProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBillingValue = { user: { uid: "user-1" }, authReady: true };
  });

  test("deduplicates status reads and exposes the confirmed connection", async () => {
    let resolveStatus;
    getRobloxOAuthStatus.mockReturnValue(new Promise((resolve) => { resolveStatus = resolve; }));
    const { result } = renderHook(() => useRobloxConnection(), { wrapper });

    let first;
    let second;
    await act(async () => {
      first = result.current.refresh({ force: true });
      second = result.current.refresh({ force: true });
      resolveStatus({ connected: true, onboarding: { required: true, satisfied: true, gateActive: false } });
      await Promise.all([first, second]);
    });

    expect(getRobloxOAuthStatus).toHaveBeenCalledTimes(1);
    expect(result.current.connected).toBe(true);
    expect(result.current.phase).toBe("connected");
  });

  test("retains the last confirmed connection when refresh becomes unavailable", async () => {
    getRobloxOAuthStatus.mockResolvedValueOnce({
      connected: true,
      onboarding: { required: true, satisfied: true, gateActive: false },
    });
    const { result } = renderHook(() => useRobloxConnection(), { wrapper });
    await waitFor(() => expect(result.current.connected).toBe(true));

    getRobloxOAuthStatus.mockRejectedValueOnce(new Error("temporary outage"));
    await act(async () => {
      await result.current.refresh({ force: true });
    });

    expect(result.current.connected).toBe(true);
    expect(result.current.phase).toBe("connected");
    expect(result.current.error?.message).toBe("temporary outage");
  });

  test("keeps the confirmed state across navigation-like provider rerenders", async () => {
    getRobloxOAuthStatus.mockResolvedValue({
      connected: true,
      onboarding: { required: true, satisfied: true, gateActive: false },
    });
    const { result, rerender } = renderHook(() => useRobloxConnection(), { wrapper });
    await waitFor(() => expect(result.current.connected).toBe(true));

    mockBillingValue = { user: { uid: "user-1" }, authReady: true, plan: "pro" };
    rerender();

    expect(result.current.connected).toBe(true);
    expect(getRobloxOAuthStatus).toHaveBeenCalledTimes(1);
  });

  test("replaces the last known connection only after confirmed disconnection", async () => {
    getRobloxOAuthStatus
      .mockResolvedValueOnce({ connected: true, onboarding: { gateActive: false } })
      .mockResolvedValueOnce({ connected: false, onboarding: { gateActive: true } });
    const { result } = renderHook(() => useRobloxConnection(), { wrapper });
    await waitFor(() => expect(result.current.connected).toBe(true));

    await act(async () => {
      await result.current.refresh({ force: true });
    });

    expect(result.current.connected).toBe(false);
    expect(result.current.phase).toBe("disconnected");
    expect(result.current.onboarding.gateActive).toBe(true);
  });

  test("refreshes a stale status when the tab regains focus", async () => {
    getRobloxOAuthStatus
      .mockResolvedValueOnce({ connected: true, onboarding: { gateActive: false } })
      .mockResolvedValueOnce({ connected: false, onboarding: { gateActive: true } });
    const { result } = renderHook(() => useRobloxConnection(), { wrapper });
    await waitFor(() => expect(result.current.connected).toBe(true));

    act(() => window.dispatchEvent(new Event("focus")));

    await waitFor(() => expect(result.current.connected).toBe(false));
    expect(getRobloxOAuthStatus).toHaveBeenCalledTimes(2);
  });

  test("clears the previous identity before loading a different Nexus user", async () => {
    getRobloxOAuthStatus
      .mockResolvedValueOnce({ connected: true, onboarding: { gateActive: false } })
      .mockResolvedValueOnce({ connected: false, onboarding: { gateActive: false } });
    const { result, rerender } = renderHook(() => useRobloxConnection(), { wrapper });
    await waitFor(() => expect(result.current.connected).toBe(true));

    mockBillingValue = { user: { uid: "user-2" }, authReady: true };
    rerender();
    await waitFor(() => expect(result.current.phase).toBe("disconnected"));
    expect(result.current.connected).toBe(false);
    expect(getRobloxOAuthStatus).toHaveBeenCalledTimes(2);
  });
});
