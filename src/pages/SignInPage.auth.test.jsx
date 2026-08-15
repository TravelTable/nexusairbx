import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

jest.mock("../firebase", () => ({ auth: { currentUser: null } }));
jest.mock("firebase/auth", () => ({
  GithubAuthProvider: jest.fn(),
  onAuthStateChanged: jest.fn(() => jest.fn()),
  signInWithEmailAndPassword: jest.fn(),
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

import {
  onAuthStateChanged as mockOnAuthStateChanged,
  signInWithEmailAndPassword as mockEmailSignIn,
} from "firebase/auth";
import { auth as mockAuth } from "../firebase";
import {
  applyAuthPersistence as mockApplyAuthPersistence,
  readAuthPersistencePreference as mockReadAuthPersistencePreference,
  writeAuthPersistencePreference as mockWriteAuthPersistencePreference,
} from "../lib/firebaseAuth";
import SignInPage from "./SignInPage";

function renderPage(initialEntry = "/signin") {
  return render(
    <MemoryRouter
      initialEntries={[initialEntry]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/" element={<div>Home destination</div>} />
        <Route path="/signup" element={<div>Signup destination</div>} />
        <Route path="/forgot-password" element={<div>Reset destination</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("SignInPage account controls", () => {
  beforeEach(() => {
    mockOnAuthStateChanged.mockReset().mockImplementation(() => jest.fn());
    mockReadAuthPersistencePreference.mockReset().mockReturnValue(true);
    mockEmailSignIn.mockReset().mockResolvedValue({
      user: { getIdToken: jest.fn().mockResolvedValue("token") },
    });
    mockApplyAuthPersistence.mockReset().mockResolvedValue(undefined);
    mockWriteAuthPersistencePreference.mockReset();
  });

  test("preserves autofill and shared-device persistence semantics", async () => {
    renderPage();

    const email = screen.getByRole("textbox", { name: "Email address" });
    const password = screen.getByLabelText("Password");
    const sharedDevice = screen.getByRole("checkbox", {
      name: "Sign out when I close this browser (shared device).",
    });

    expect(email.getAttribute("autocomplete")).toBe("email");
    expect(password.getAttribute("autocomplete")).toBe("current-password");
    expect(sharedDevice.checked).toBe(false);

    fireEvent.click(sharedDevice);
    expect(mockWriteAuthPersistencePreference).toHaveBeenLastCalledWith(false);

    fireEvent.change(email, { target: { value: "creator@example.com" } });
    fireEvent.change(password, { target: { value: "correct horse battery staple" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(mockEmailSignIn).toHaveBeenCalledWith(
      mockAuth,
      "creator@example.com",
      "correct horse battery staple",
    ));
    expect(mockApplyAuthPersistence).toHaveBeenCalledWith(mockAuth, false);
  });

  test("keeps password recovery and account creation reachable", () => {
    renderPage();

    expect(screen.getByRole("link", { name: "Forgot password?" }).getAttribute("href")).toBe("/forgot-password");
    fireEvent.click(screen.getByRole("button", { name: "Create an account" }));
    expect(screen.getByText("Signup destination")).toBeTruthy();
  });

  test("moves focus to the first missing field after an incomplete submission", () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(screen.getByRole("textbox", { name: "Email address" })).toBe(document.activeElement);

    fireEvent.change(screen.getByRole("textbox", { name: "Email address" }), {
      target: { value: "creator@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(screen.getByLabelText("Password")).toBe(document.activeElement);
  });
});
