import React from "react";
import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import AuthRedirectHandler from "./AuthRedirectHandler";

const mockClearRedirectContext = jest.fn();
const mockConsumeAuthRedirectResult = jest.fn();
const mockReadRedirectContext = jest.fn();

jest.mock("../firebase", () => ({ auth: {} }));

jest.mock("../lib/firebaseAuth", () => ({
  clearRedirectContext: () => mockClearRedirectContext(),
  consumeAuthRedirectResult: (...args) => mockConsumeAuthRedirectResult(...args),
  readRedirectContext: () => mockReadRedirectContext(),
}));

jest.mock("../lib/deferredClientLog", () => ({
  scheduleDeferredClientLog: jest.fn(),
}));

jest.mock("../lib/pendingAuthAction", () => ({
  getPendingAuthReturnPath: jest.fn(() => "/ai"),
  readPendingAuthAction: jest.fn(() => null),
}));

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}${location.hash}`}</div>;
}

function renderHandler(from) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: "/signin", state: { from } }]}>
      <AuthRedirectHandler />
      <Routes>
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockConsumeAuthRedirectResult
    .mockResolvedValueOnce({ user: { getIdToken: jest.fn(() => Promise.resolve("token")) } })
    .mockResolvedValue(null);
});

test("restores the complete stored OAuth return path", async () => {
  mockReadRedirectContext.mockReturnValue({
    method: "google",
    returnPath: "/subscribe?plan=PRO_PLUS&interval=year",
  });

  renderHandler({ pathname: "/subscribe" });

  await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent(
    "/subscribe?plan=PRO_PLUS&interval=year"
  ));
  expect(mockClearRedirectContext).toHaveBeenCalled();
});

test("keeps search and hash from router state when redirect storage is unavailable", async () => {
  mockReadRedirectContext.mockReturnValue({ method: null, returnPath: "/" });

  renderHandler({
    pathname: "/subscribe",
    search: "?plan=TEAM&interval=month&seats=4",
    hash: "#review",
  });

  await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent(
    "/subscribe?plan=TEAM&interval=month&seats=4#review"
  ));
});
