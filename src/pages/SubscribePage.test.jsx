import React from "react";
import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import SubscribePage from "./SubscribePage";

let mockCurrentUser = { uid: "user-1", email: "builder@example.com" };
const mockGetEntitlements = jest.fn();
const mockOpenPortal = jest.fn();
const mockStartSubscriptionCheckout = jest.fn();

jest.mock("firebase/auth", () => ({
  getAuth: () => ({ currentUser: mockCurrentUser }),
  onAuthStateChanged: (auth, callback) => {
    callback(mockCurrentUser);
    return jest.fn();
  },
}));

jest.mock("firebase/firestore", () => ({
  getFirestore: jest.fn(() => ({})),
  doc: jest.fn((database, path) => ({ database, path })),
  onSnapshot: jest.fn(),
}));

jest.mock("../lib/billing", () => ({
  getEntitlements: (...args) => mockGetEntitlements(...args),
  isSubscriberPlan: (plan, entitlements = []) => (
    ["STARTER", "PRO", "PRO_PLUS", "TEAM"].includes(String(plan || "").toUpperCase())
    || entitlements.some((value) => ["starter", "pro", "pro_plus", "team"].includes(value))
  ),
  openPortal: (...args) => mockOpenPortal(...args),
  startSubscriptionCheckout: (...args) => mockStartSubscriptionCheckout(...args),
}));

jest.mock("../lib/productAnalytics", () => ({
  trackProductEvent: jest.fn(() => Promise.resolve()),
}));

function SignInLocation() {
  const location = useLocation();
  return <pre data-testid="signin-location">{JSON.stringify(location.state)}</pre>;
}

function renderPage(initialEntry = "/subscribe?plan=PRO&interval=year") {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/subscribe" element={<SubscribePage />} />
          <Route path="/signin" element={<SignInLocation />} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>
  );
}

beforeEach(() => {
  window.sessionStorage.clear();
  mockCurrentUser = { uid: "user-1", email: "builder@example.com" };
  mockGetEntitlements.mockReset();
  mockGetEntitlements.mockResolvedValue({ plan: "FREE", entitlements: [] });
  mockOpenPortal.mockReset();
  mockStartSubscriptionCheckout.mockReset();
});

test("renders a final review with the annual equivalent and billed total", async () => {
  renderPage();

  expect(await screen.findByRole("heading", { name: "Review your Pro plan" })).toBeInTheDocument();
  expect(screen.getByText("$16.58/month")).toBeInTheDocument();
  expect(screen.getByText("$199 billed yearly")).toBeInTheDocument();
  expect(screen.getByText("builder@example.com")).toBeInTheDocument();
  expect(await screen.findByRole("button", { name: "Continue to secure checkout" })).toBeEnabled();
  expect(screen.queryByText("Pro+")).not.toBeInTheDocument();
});

test("validates Team seats and shows the complete annual charge", async () => {
  renderPage("/subscribe?plan=TEAM&interval=year&seats=51");

  expect(await screen.findByRole("heading", { name: "Review your Team plan" })).toBeInTheDocument();
  expect(screen.getByText("50 paid seats")).toBeInTheDocument();
  expect(screen.getByText("$1208.33/month")).toBeInTheDocument();
  expect(screen.getByText("$14500 billed yearly")).toBeInTheDocument();
  expect(screen.getByText("$290 per user, per year")).toBeInTheDocument();
});

test("shows Manage plan instead of another purchase action for subscribers", async () => {
  mockGetEntitlements.mockResolvedValue({ plan: "PRO", entitlements: ["pro"] });
  renderPage("/subscribe?plan=PRO_PLUS&interval=month");

  expect(await screen.findByRole("button", { name: "Manage plan" })).toBeEnabled();
  expect(screen.queryByRole("button", { name: "Continue to secure checkout" })).not.toBeInTheDocument();
});

test("preserves the complete checkout return path when sign-in is required", async () => {
  mockCurrentUser = null;
  renderPage("/subscribe?plan=PRO_PLUS&interval=year");

  await waitFor(() => expect(screen.getByTestId("signin-location")).toBeInTheDocument());
  expect(screen.getByTestId("signin-location")).toHaveTextContent(
    '"pathname":"/subscribe","search":"?plan=PRO_PLUS&interval=year"'
  );
});
