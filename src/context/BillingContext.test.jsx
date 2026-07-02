import React from "react";
import "@testing-library/jest-dom";
import { act, renderHook, waitFor } from "@testing-library/react";
import { BillingProvider, useBilling } from "./BillingContext";

let authStateCallback = null;

jest.mock("../firebase", () => ({
  auth: {
    currentUser: null,
  },
}));

jest.mock("firebase/auth", () => ({
  onAuthStateChanged: (_auth, callback) => {
    authStateCallback = callback;
    return jest.fn();
  },
}));

jest.mock("../lib/billing", () => ({
  getEntitlements: jest.fn(async () => ({})),
  summarizeEntitlements: jest.fn(() => ({
    plan: "FREE",
    totalRemaining: 0,
    subRemaining: 0,
    paygRemaining: 0,
    isPremium: false,
    unlimitedTokens: false,
    devOverride: false,
    flags: {
      isAdmin: false,
      unlimitedTokens: false,
      devOverride: false,
    },
  })),
  startCheckout: jest.fn(),
  startSubscriptionCheckout: jest.fn(),
  startPremiumBalanceCheckout: jest.fn(),
  openPortal: jest.fn(),
  cancelSubscription: jest.fn(),
  submitBrowserTimezone: () => Promise.resolve(),
}));

jest.mock("../lib/aiEvents", () => ({
  onAiEvent: () => jest.fn(),
}));

function renderBilling() {
  return renderHook(() => useBilling(), {
    wrapper: ({ children }) => <BillingProvider pollMs={999999}>{children}</BillingProvider>,
  });
}

beforeEach(() => {
  authStateCallback = null;
  jest.clearAllMocks();
});

test("authReady becomes true after the first auth state callback", async () => {
  const { result } = renderBilling();

  expect(result.current.authReady).toBe(false);

  await act(async () => {
    authStateCallback(null);
  });

  await waitFor(() => {
    expect(result.current.authReady).toBe(true);
    expect(result.current.user).toBeNull();
  });
});

test("authReady becomes true when a signed-in user is restored", async () => {
  const { result } = renderBilling();
  const user = { uid: "user_1", email: "creator@example.com" };

  await act(async () => {
    authStateCallback(user);
  });

  await waitFor(() => {
    expect(result.current.authReady).toBe(true);
    expect(result.current.user).toBe(user);
  });
});
