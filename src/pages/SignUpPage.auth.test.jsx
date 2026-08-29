import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

let authStateCallback;

jest.mock("../firebase", () => ({ auth: { currentUser: null } }));
jest.mock("firebase/auth", () => ({
  createUserWithEmailAndPassword: jest.fn(),
  getAdditionalUserInfo: jest.fn(),
  GithubAuthProvider: jest.fn(),
  onAuthStateChanged: jest.fn(),
  sendEmailVerification: jest.fn(),
}));
jest.mock("../lib/firebaseAuth", () => ({
  applyAuthPersistence: jest.fn(),
  consumeAuthRedirectError: jest.fn(() => ""),
  getFriendlyAuthErrorMessage: jest.fn((error) => error?.message || "Authentication failed."),
  readAuthPersistencePreference: jest.fn(() => true),
  signInWithGoogleProvider: jest.fn(),
  signInWithOAuthProvider: jest.fn(),
  writeAuthPersistencePreference: jest.fn(),
}));
jest.mock("../lib/pendingAuthAction", () => ({
  getPendingAuthReturnPath: jest.fn(() => "/ai"),
  readPendingAuthAction: jest.fn(() => null),
}));
jest.mock("../lib/productAnalytics", () => ({ trackProductEvent: jest.fn() }));
jest.mock("../lib/signupRobloxOnboarding", () => ({
  readPendingRobloxSignup: jest.fn(() => null),
  registerRobloxSignupRequirement: jest.fn(),
}));

import SignUpPage from "./SignUpPage";
import {
  createUserWithEmailAndPassword as mockCreateUserWithEmailAndPassword,
  getAdditionalUserInfo as mockGetAdditionalUserInfo,
  onAuthStateChanged as mockOnAuthStateChanged,
  sendEmailVerification as mockSendEmailVerification,
} from "firebase/auth";
import {
  signInWithGoogleProvider as mockSignInWithGoogleProvider,
  signInWithOAuthProvider as mockSignInWithOAuthProvider,
} from "../lib/firebaseAuth";
import {
  readPendingRobloxSignup as mockReadPendingRobloxSignup,
  registerRobloxSignupRequirement as mockRegisterRobloxSignupRequirement,
} from "../lib/signupRobloxOnboarding";

function renderSignup() {
  return render(
    <MemoryRouter
      initialEntries={["/signup"]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/ai" element={<div>AI workspace destination</div>} />
        <Route path="/verify-email" element={<div>Verify email destination</div>} />
        <Route path="/connect-roblox" element={<div>Connect Roblox destination</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("SignUpPage authenticated routing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReadPendingRobloxSignup.mockReturnValue(null);
    authStateCallback = undefined;
    mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
      authStateCallback = callback;
      return jest.fn();
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("registers the requirement before handing a new password account to email verification", async () => {
    jest.useFakeTimers();
    const user = { uid: "password-user", emailVerified: false, getIdToken: jest.fn() };
    mockCreateUserWithEmailAndPassword.mockResolvedValue({ user });
    mockRegisterRobloxSignupRequirement.mockResolvedValue("/connect-roblox?return=%2Fai");
    mockSendEmailVerification.mockResolvedValue();
    renderSignup();

    fireEvent.change(screen.getByRole("textbox", { name: "Name" }), { target: { value: "Ava" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Email address" }), {
      target: { value: "ava@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "CorrectHorse1!" } });
    fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "CorrectHorse1!" } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Create account" }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockRegisterRobloxSignupRequirement).toHaveBeenCalledWith(user, "/ai");
    expect(mockSendEmailVerification).toHaveBeenCalledWith(user);
    await act(async () => { jest.advanceTimersByTime(800); });
    expect(screen.getByText("Verify email destination")).toBeTruthy();
  });

  test("sends a genuinely new provider account through required Roblox onboarding", async () => {
    jest.useFakeTimers();
    const user = { uid: "new-user", emailVerified: true, getIdToken: jest.fn() };
    mockSignInWithGoogleProvider.mockResolvedValue({ user });
    mockGetAdditionalUserInfo.mockReturnValue({ isNewUser: true });
    mockRegisterRobloxSignupRequirement.mockResolvedValue("/connect-roblox?return=%2Fai");
    renderSignup();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Google" }));
      await Promise.resolve();
    });
    expect(mockRegisterRobloxSignupRequirement).toHaveBeenCalledWith(user, "/ai");
    await act(async () => { jest.advanceTimersByTime(800); });
    expect(screen.getByText("Connect Roblox destination")).toBeTruthy();
  });

  test("does not reclassify an existing provider user who signs in from signup", async () => {
    jest.useFakeTimers();
    const user = { uid: "existing-user", emailVerified: true, getIdToken: jest.fn() };
    mockSignInWithGoogleProvider.mockResolvedValue({ user });
    mockGetAdditionalUserInfo.mockReturnValue({ isNewUser: false });
    renderSignup();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Google" }));
      await Promise.resolve();
    });
    expect(mockRegisterRobloxSignupRequirement).not.toHaveBeenCalled();
    await act(async () => { jest.advanceTimersByTime(800); });
    expect(screen.getByText("AI workspace destination")).toBeTruthy();
  });

  test("uses signup intent and the same requirement flow for GitHub", async () => {
    jest.useFakeTimers();
    const user = { uid: "github-user", emailVerified: true, getIdToken: jest.fn() };
    mockSignInWithOAuthProvider.mockResolvedValue({ user });
    mockGetAdditionalUserInfo.mockReturnValue({ isNewUser: true });
    mockRegisterRobloxSignupRequirement.mockResolvedValue("/connect-roblox?return=%2Fai");
    renderSignup();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "GitHub" }));
      await Promise.resolve();
    });

    expect(mockSignInWithOAuthProvider).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ intent: "signup", returnPath: "/ai" })
    );
    expect(mockRegisterRobloxSignupRequirement).toHaveBeenCalledWith(user, "/ai");
  });

  test("retries a locally pending requirement before allowing an authenticated signup onward", async () => {
    const user = { uid: "pending-user", emailVerified: true };
    mockReadPendingRobloxSignup.mockReturnValue({ uid: user.uid, returnPath: "/assets" });
    mockRegisterRobloxSignupRequirement.mockResolvedValue("/connect-roblox?return=%2Fassets");
    renderSignup();

    await act(async () => {
      authStateCallback(user);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockRegisterRobloxSignupRequirement).toHaveBeenCalledWith(user, "/assets");
    expect(await screen.findByText("Connect Roblox destination")).toBeTruthy();
  });

  test("redirects an already signed-in verified account to the workspace", async () => {
    renderSignup();

    expect(screen.getByRole("heading", { name: "Create your account" })).toBeTruthy();
    expect(authStateCallback).toEqual(expect.any(Function));

    await act(async () => {
      authStateCallback({ emailVerified: true });
    });

    expect(await screen.findByText("AI workspace destination")).toBeTruthy();
  });

  test("keeps an unverified account in the verification flow", async () => {
    renderSignup();

    await act(async () => {
      authStateCallback({ emailVerified: false });
    });

    expect(await screen.findByText("Verify email destination")).toBeTruthy();
  });

  test("keeps every signup method under the same consent and autofill contract", () => {
    renderSignup();

    expect(screen.getByRole("button", { name: "Google" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "GitHub" })).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Name" }).getAttribute("autocomplete")).toBe("name");
    expect(screen.getByRole("textbox", { name: "Email address" }).getAttribute("autocomplete")).toBe("email");
    expect(screen.getByRole("link", { name: "Terms" }).getAttribute("href")).toBe("/legal/terms");
    expect(screen.getByRole("link", { name: "Privacy Policy" }).getAttribute("href")).toBe("/legal/privacy");
    expect(screen.getByText(/By creating an account with Google, GitHub, or email/i)).toBeTruthy();
  });

  test("moves focus through missing fields and to a mismatched confirmation", () => {
    renderSignup();

    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(screen.getByRole("textbox", { name: "Name" })).toBe(document.activeElement);

    fireEvent.change(screen.getByRole("textbox", { name: "Name" }), { target: { value: "Ava" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Email address" }), {
      target: { value: "ava@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "correct horse" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(screen.getByLabelText("Confirm password")).toBe(document.activeElement);

    fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "different" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(screen.getByLabelText("Confirm password")).toBe(document.activeElement);
  });
});
