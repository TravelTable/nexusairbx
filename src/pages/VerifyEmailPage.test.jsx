import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

jest.mock("../firebase", () => ({
  auth: {
    currentUser: {
      emailVerified: false,
      getIdToken: jest.fn(),
    },
  },
}));
jest.mock("firebase/auth", () => ({
  reload: jest.fn(),
  sendEmailVerification: jest.fn(),
}));
jest.mock("../lib/billing", () => ({ authedFetch: jest.fn() }));

import { reload as mockReload, sendEmailVerification as mockSendEmailVerification } from "firebase/auth";
import { auth as mockAuth } from "../firebase";
import { authedFetch as mockAuthedFetch } from "../lib/billing";
import VerifyEmailPage from "./VerifyEmailPage";

const mockUser = mockAuth.currentUser;

function renderPage(returnPath = "/ai") {
  return render(
    <MemoryRouter
      initialEntries={[{ pathname: "/verify-email", state: { returnPath } }]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/ai" element={<div>AI workspace destination</div>} />
        <Route path="/signin" element={<div>Sign in destination</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("VerifyEmailPage", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    mockUser.emailVerified = false;
    mockUser.getIdToken.mockReset().mockResolvedValue("token");
    mockAuth.currentUser = mockUser;
    mockReload.mockReset().mockResolvedValue(undefined);
    mockSendEmailVerification.mockReset().mockResolvedValue(undefined);
    mockAuthedFetch.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("keeps the backend resend cooldown visible and enforced", async () => {
    jest.useFakeTimers();
    mockAuthedFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ cooldownSeconds: 2 }),
    });
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Resend verification email" }));

    await waitFor(() => expect(mockSendEmailVerification).toHaveBeenCalledWith(mockUser));
    expect(screen.getByRole("button", { name: "Resend available in 2s" }).disabled).toBe(true);

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.getByRole("button", { name: "Resend available in 1s" }).disabled).toBe(true);

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.getByRole("button", { name: "Resend verification email" }).disabled).toBe(false);
  });

  test("refreshes the token and returns to the saved workspace after verification", async () => {
    mockReload.mockImplementation(async () => {
      mockUser.emailVerified = true;
    });
    renderPage("/ai");

    fireEvent.click(screen.getByRole("button", { name: "I have verified my email" }));

    expect(await screen.findByText("AI workspace destination")).toBeTruthy();
    expect(mockUser.getIdToken).toHaveBeenCalledWith(true);
    expect(window.sessionStorage.getItem("nexusrbx:verify-email-return-path")).toBeNull();
  });

  test("redirects a missing session to sign in without losing the intended return", async () => {
    mockAuth.currentUser = null;
    renderPage("/ai");

    expect(await screen.findByText("Sign in destination")).toBeTruthy();
  });
});
