import { act, renderHook } from "@testing-library/react";
import { useStarterPromo } from "./useStarterPromo";
import { dismissStarterPromo } from "../lib/starterPromo";

jest.mock("../lib/productAnalytics", () => ({
  trackProductEvent: jest.fn(),
}));

describe("useStarterPromo", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test("a forced post-sign-in offer bypasses an earlier snooze for a free user", () => {
    dismissStarterPromo("long");
    const { result } = renderHook(() => useStarterPromo({
      user: { uid: "free-user" },
      isFreeUsagePlan: true,
      isSubscriber: false,
    }));

    act(() => {
      expect(result.current.openPromo("post_sign_in", { force: true })).toBe(true);
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.trigger).toBe("post_sign_in");
  });

  test("a subscriber never receives the post-sign-in offer", () => {
    const { result } = renderHook(() => useStarterPromo({
      user: { uid: "paid-user" },
      isFreeUsagePlan: false,
      isSubscriber: true,
    }));

    act(() => {
      expect(result.current.openPromo("post_sign_in", { force: true })).toBe(false);
    });

    expect(result.current.isOpen).toBe(false);
  });
});
