import React from "react";
import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import AuthRedirectHandler from "./AuthRedirectHandler";

const mockClearRedirectContext = jest.fn();
const mockConsumeAuthRedirectResult = jest.fn();
const mockReadRedirectContext = jest.fn();
const mockStoreAuthRedirectError = jest.fn();
const mockGetAdditionalUserInfo = jest.fn();
const mockRegisterRobloxSignupRequirement = jest.fn();

jest.mock("firebase/auth", () => ({
  getAdditionalUserInfo: (...args) => mockGetAdditionalUserInfo(...args),
}));

jest.mock("../firebase", () => ({ auth: {} }));

jest.mock("../lib/firebaseAuth", () => ({
  clearRedirectContext: () => mockClearRedirectContext(),
  consumeAuthRedirectResult: (...args) => mockConsumeAuthRedirectResult(...args),
  getFriendlyAuthErrorMessage: (error) => error?.message || "Authentication failed.",
  readRedirectContext: () => mockReadRedirectContext(),
  storeAuthRedirectError: (...args) => mockStoreAuthRedirectError(...args),
}));

jest.mock("../lib/deferredClientLog", () => ({
  scheduleDeferredClientLog: jest.fn(),
}));

jest.mock("../lib/pendingAuthAction", () => ({
  getPendingAuthReturnPath: jest.fn(() => "/ai"),
  readPendingAuthAction: jest.fn(() => null),
}));

jest.mock("../lib/signupRobloxOnboarding", () => ({
  registerRobloxSignupRequirement: (...args) => mockRegisterRobloxSignupRequirement(...args),
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
  mockGetAdditionalUserInfo.mockReturnValue({ isNewUser: false });
  mockRegisterRobloxSignupRequirement.mockResolvedValue("/connect-roblox?return=%2Fai");
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

test("registers Roblox onboarding for a genuinely new redirect signup", async () => {
  const user = { uid: "new-user", getIdToken: jest.fn(() => Promise.resolve("token")) };
  mockConsumeAuthRedirectResult.mockReset();
  mockConsumeAuthRedirectResult.mockResolvedValueOnce({ user }).mockResolvedValue(null);
  mockGetAdditionalUserInfo.mockReturnValue({ isNewUser: true });
  mockReadRedirectContext.mockReturnValue({
    intent: "signup",
    method: "google",
    returnPath: "/ai?project=one",
  });
  mockRegisterRobloxSignupRequirement.mockResolvedValue(
    "/connect-roblox?return=%2Fai%3Fproject%3Done"
  );

  renderHandler({ pathname: "/ai", search: "?project=one" });

  await waitFor(() => expect(mockRegisterRobloxSignupRequirement).toHaveBeenCalledWith(
    user,
    "/ai?project=one"
  ));
  expect(screen.getByTestId("location")).toHaveTextContent(
    "/connect-roblox?return=%2Fai%3Fproject%3Done"
  );
});

test("returns a failed signup registration to signup so its pending record can retry", async () => {
  const user = { uid: "new-user", getIdToken: jest.fn(() => Promise.resolve("token")) };
  mockConsumeAuthRedirectResult.mockReset();
  mockConsumeAuthRedirectResult.mockResolvedValueOnce({ user }).mockResolvedValue(null);
  mockGetAdditionalUserInfo.mockReturnValue({ isNewUser: true });
  mockReadRedirectContext.mockReturnValue({
    intent: "signup",
    method: "github",
    returnPath: "/assets/123",
  });
  mockRegisterRobloxSignupRequirement.mockRejectedValue(new Error("Registration unavailable"));

  renderHandler({ pathname: "/assets/123" });

  await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/signup"));
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

test("surfaces redirect failures instead of leaving the user signed out silently", async () => {
  const redirectError = new Error("Unable to process request due to missing initial state.");
  mockConsumeAuthRedirectResult.mockReset();
  mockConsumeAuthRedirectResult.mockResolvedValue({ error: redirectError });
  mockStoreAuthRedirectError.mockReturnValue("Sign-in was interrupted because browser storage was cleared or blocked.");
  mockReadRedirectContext.mockReturnValue({ method: null, returnPath: "/" });

  render(
    <MemoryRouter initialEntries={[{ pathname: "/" }]}>
      <AuthRedirectHandler />
      <Routes>
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>
  );

  await waitFor(() => expect(mockStoreAuthRedirectError).toHaveBeenCalledWith(redirectError));
  await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/signin"));
});

test("surfaces an empty redirect result when redirect context is still pending", async () => {
  mockConsumeAuthRedirectResult.mockReset();
  mockConsumeAuthRedirectResult.mockResolvedValue(null);
  mockReadRedirectContext.mockReturnValue({ method: "google", returnPath: "/ai" });
  mockStoreAuthRedirectError.mockReturnValue(
    "Sign-in redirect finished without a session. Please try Google sign-in again."
  );

  render(
    <MemoryRouter initialEntries={[{ pathname: "/signin" }]}>
      <AuthRedirectHandler />
      <Routes>
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>
  );

  await waitFor(() =>
    expect(mockStoreAuthRedirectError).toHaveBeenCalledWith(
      expect.objectContaining({ code: "auth/redirect-empty-result" })
    )
  );
  expect(mockClearRedirectContext).toHaveBeenCalled();
});
