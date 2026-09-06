import React from "react";
import "@testing-library/jest-dom";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  return <div data-testid="location">{`${location.pathname}${location.search}${location.hash}`}</div>;
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

test("checks unavailable status without opening Roblox", async () => {
  mockConnection.phase = "unavailable";
  mockConnection.error = new Error("offline");
  renderPage();
  fireEvent.click(screen.getByRole("button", { name: "Check connection again" }));
  await waitFor(() => expect(mockConnection.refresh).toHaveBeenCalledWith({ force: true }));
  expect(mockBeginRobloxOAuth).not.toHaveBeenCalled();
});

test("offers an update for a connected account missing required permissions", () => {
  mockConnection.connected = true;
  renderPage();
  expect(screen.getByRole("button", { name: "Update permissions" })).toBeEnabled();
});

test("expired callback has actionable copy and disappears on retry", async () => {
  renderPage("/connect-roblox?roblox=error&code=OAUTH_STATE_EXPIRED");
  expect(screen.getByText(/attempt has expired/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Connect Roblox" }));
  await waitFor(() => expect(screen.queryByText(/attempt has expired/)).not.toBeInTheDocument());
});

test("does not redirect with stale connected status after a callback", async () => {
  let resolve;
  mockConnection.connected = true;
  mockConnection.status = { connected: true, onboarding: { satisfied: true } };
  mockConnection.refresh.mockReturnValue(new Promise((done) => { resolve = done; }));
  renderPage("/connect-roblox?roblox=connected&return=%2Fai%3Ftab%3Dassets%23upload");
  expect(screen.queryByTestId("location")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Checking connection…" })).toBeDisabled();
  await act(async () => resolve(null));
  expect(screen.queryByTestId("location")).not.toBeInTheDocument();
});

test("fresh callback status returns to query and anchor", async () => {
  mockConnection.refresh.mockResolvedValue({ connected: true, onboarding: { satisfied: true } });
  renderPage("/connect-roblox?roblox=connected&return=%2Fai%3Ftab%3Dassets%23upload");
  await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/ai?tab=assets#upload"));
});

test("success query alone cannot complete setup", async () => {
  mockConnection.refresh.mockResolvedValue({ connected: false, onboarding: { satisfied: false } });
  renderPage("/connect-roblox?roblox=connected");
  await waitFor(() => expect(screen.getByRole("button", { name: "Connect Roblox" })).toBeEnabled());
  expect(screen.queryByTestId("location")).not.toBeInTheDocument();
});

test("unavailable authorization service shows a retryable message", async () => {
  mockBeginRobloxOAuth.mockRejectedValueOnce({ code: "ROBLOX_OAUTH_UNCONFIGURED" });
  renderPage();
  fireEvent.click(screen.getByRole("button", { name: "Connect Roblox" }));
  await waitFor(() => expect(screen.getByText(/temporarily unavailable/)).toBeInTheDocument());
  expect(screen.getByRole("button", { name: "Connect Roblox" })).toBeEnabled();
});

test("rejects an external destination after verified connection", async () => {
  mockConnection.refresh.mockResolvedValue({ connected: true, onboarding: { satisfied: true } });
  renderPage("/connect-roblox?roblox=connected&return=https%3A%2F%2Fevil.example");
  await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/ai"));
});

test("sign-out failure restores controls", async () => {
  mockSignOut.mockRejectedValueOnce(new Error("offline"));
  renderPage();
  fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
  await waitFor(() => expect(screen.getByText(/Couldn’t sign out/)).toBeInTheDocument());
  expect(screen.getByRole("button", { name: "Sign out" })).toBeEnabled();
});

test("blocks repeated authorization clicks while opening Roblox", async () => {
  mockBeginRobloxOAuth.mockReturnValue(new Promise(() => {}));
  renderPage();
  const button = screen.getByRole("button", { name: "Connect Roblox" });
  fireEvent.click(button);
  fireEvent.click(button);
  expect(mockBeginRobloxOAuth).toHaveBeenCalledTimes(1);
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
  renderPage("/connect-roblox?return=%2Fassets%2F42&roblox=error&code=ROBLOX_OAUTH_DENIED");

  expect(screen.getByText(/Setup isn’t finished yet/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /^Connect Roblox$/i }));

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

  expect(screen.getByText(/We couldn’t check your Roblox connection/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Check connection again/i })).toBeEnabled();
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
