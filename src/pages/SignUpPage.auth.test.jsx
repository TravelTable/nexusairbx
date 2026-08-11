import React from "react";
import { act, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

let authStateCallback;

jest.mock("../firebase", () => ({ auth: { currentUser: null } }));
jest.mock("firebase/auth", () => ({
  createUserWithEmailAndPassword: jest.fn(),
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

import SignUpPage from "./SignUpPage";
import { onAuthStateChanged as mockOnAuthStateChanged } from "firebase/auth";

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
      </Routes>
    </MemoryRouter>,
  );
}

describe("SignUpPage authenticated routing", () => {
  beforeEach(() => {
    authStateCallback = undefined;
    mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
      authStateCallback = callback;
      return jest.fn();
    });
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
});
