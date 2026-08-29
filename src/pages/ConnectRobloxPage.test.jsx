import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

import ConnectRobloxPage from "./ConnectRobloxPage";

let mockConnection;
const mockBeginRobloxOAuth = jest.fn();
const mockSignOut = jest.fn();

jest.mock("firebase/auth", () => ({
  signOut: (...args) => mockSignOut(...args),
}));

jest.mock("../firebase", () => ({ auth: {} }));

jest.mock("../context/RobloxConnectionContext", () => ({
  useRobloxConnection: () => mockConnection,
}));

jest.mock("../lib/robloxOAuthApi", () => ({
  beginRobloxOAuth: (...args) => mockBeginRobloxOAuth(...args),
  ROBLOX_PRODUCT_DEFAULT_CAPABILITIES: [
    "roblox_get_connection",
    "roblox_upload_asset",
    "roblox_get_asset",
    "roblox_search_creator_store",
  ],
}));

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
}

function renderPage(entry = "/connect-roblox?return=%2Fai") {
  return render(
    <MemoryRouter
      initialEntries={[entry]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="/connect-roblox" element={<ConnectRobloxPage />} />
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockConnection = {
    authReady: true,
    user: { uid: "new-user", emailVerified: true },
    status: {
      connected: false,
      onboarding: { required: true, satisfied: false, gateActive: true },
    },
    connected: false,
    phase: "disconnected",
    error: null,
    refresh: jest.fn(() => Promise.resolve()),
  };
  mockBeginRobloxOAuth.mockResolvedValue({ authorized: false });
  mockSignOut.mockResolvedValue();
});

test("shows required permissions and a checking state", () => {
  mockConnection.phase = "checking";
  mockConnection.status = null;
  renderPage();

  expect(screen.getByText("Standard Roblox access")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Checking connection/i })).toBeDisabled();
  expect(screen.queryByText(/skip/i)).not.toBeInTheDocument();
});

test("preserves cancellation context and offers retry", async () => {
  renderPage("/connect-roblox?return=%2Fassets%2F42&roblox=error&message=Access%20denied");

  expect(screen.getByText("Access denied")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Retry Roblox connection/i }));

  await waitFor(() => expect(mockBeginRobloxOAuth).toHaveBeenCalledWith(expect.objectContaining({
    capabilities: expect.arrayContaining([
      "roblox_get_connection",
      "roblox_upload_asset",
      "roblox_get_asset",
      "roblox_search_creator_store",
    ]),
    returnPath: "/connect-roblox?return=%2Fassets%2F42",
  })));
});

test("shows an unavailable result without treating it as disconnected", () => {
  mockConnection.phase = "unavailable";
  mockConnection.status = null;
  mockConnection.error = new Error("Roblox status is temporarily unavailable");
  renderPage();

  expect(screen.getByText("Roblox status is temporarily unavailable")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Retry Roblox connection/i })).toBeEnabled();
});

test("continues to the preserved destination after the requirement is satisfied", async () => {
  mockConnection.connected = true;
  mockConnection.phase = "connected";
  mockConnection.status = {
    connected: true,
    onboarding: { required: true, satisfied: true, gateActive: false },
  };
  renderPage("/connect-roblox?return=%2Fassets%2F42%3Ftab%3Dversions");

  await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent(
    "/assets/42?tab=versions"
  ));
});
