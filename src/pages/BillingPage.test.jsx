import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import BillingPage from "./BillingPage";

jest.mock("firebase/auth", () => ({
  getAuth: () => ({ currentUser: { uid: "u1" } }),
  onAuthStateChanged: (auth, cb) => {
    cb({ uid: "u1" });
    return jest.fn();
  },
}));

jest.mock("firebase/firestore", () => ({
  initializeFirestore: jest.fn(() => ({})),
  getFirestore: jest.fn(),
  doc: jest.fn(),
  onSnapshot: jest.fn(),
}));

jest.mock("../lib/billing", () => ({
  getEntitlements: jest.fn(async () => ({
    plan: "PRO",
    pricingVersion: "LEGACY",
    grandfathered: true,
    subscription: {
      status: "active",
      interval: "month",
      currentPeriodEnd: "2026-07-17T00:00:00.000Z",
      cancelAtPeriodEnd: false,
    },
    includedUsage: {
      percentUsed: 46,
      percentRemaining: 54,
      resetsAt: "2026-07-17T00:00:00.000Z",
    },
    premiumBalance: {
      balanceMicros: 18_420_000,
      currency: "usd",
    },
  })),
  openPortal: jest.fn(),
  startPremiumBalanceCheckout: jest.fn(),
  startSubscriptionCheckout: jest.fn(),
}));

test("renders billing dashboard usage percentages, balance, top-ups, and grandfathering", async () => {
  window.__NEXUSRBX_TEST_USER = { uid: "u1" };
  window.__NEXUSRBX_TEST_ENTITLEMENTS = {
    plan: "PRO",
    pricingVersion: "LEGACY",
    grandfathered: true,
    subscription: {
      status: "active",
      interval: "month",
      currentPeriodEnd: "2026-07-17T00:00:00.000Z",
      cancelAtPeriodEnd: false,
    },
    includedUsage: {
      percentUsed: 46,
      percentRemaining: 54,
      resetsAt: "2026-07-17T00:00:00.000Z",
    },
    premiumBalance: {
      balanceMicros: 18_420_000,
      currency: "usd",
    },
  };
  render(
    <MemoryRouter>
      <BillingPage />
    </MemoryRouter>
  );

  expect(await screen.findByText("46% used")).toBeInTheDocument();
  expect(screen.getByText("54% remaining")).toBeInTheDocument();
  expect(screen.getByText("$18.42 available")).toBeInTheDocument();
  expect(screen.getByText("Legacy Pro pricing")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Add \$10/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Add \$25/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Add \$50/i })).toBeInTheDocument();
});
