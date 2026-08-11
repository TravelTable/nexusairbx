import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";

jest.mock("../firebase", () => ({ auth: { name: "test-auth" } }));
jest.mock("firebase/auth", () => ({ sendPasswordResetEmail: jest.fn() }));

import { sendPasswordResetEmail as mockSendPasswordResetEmail } from "firebase/auth";
import ForgotPasswordPage, { PASSWORD_RESET_SUCCESS_MESSAGE } from "./ForgotPasswordPage";

function renderPage() {
  return render(
    <HelmetProvider>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ForgotPasswordPage />
      </MemoryRouter>
    </HelmetProvider>,
  );
}

describe("ForgotPasswordPage", () => {
  beforeEach(() => {
    mockSendPasswordResetEmail.mockReset();
  });

  afterEach(() => {
    document.head.querySelectorAll('meta[name="robots"]').forEach((meta) => meta.remove());
  });

  test("validates the labeled email field accessibly", () => {
    renderPage();

    const input = screen.getByRole("textbox", { name: "Email address" });
    fireEvent.change(input, { target: { value: "not-an-email" } });
    fireEvent.click(screen.getByRole("button", { name: "Send reset email" }));

    expect(screen.getByRole("alert").textContent).toContain("Enter a valid email address.");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(mockSendPasswordResetEmail).not.toHaveBeenCalled();
  });

  test("uses non-enumerating success copy when Firebase reports an unknown account", async () => {
    mockSendPasswordResetEmail.mockRejectedValue({ code: "auth/user-not-found" });
    renderPage();

    fireEvent.change(screen.getByRole("textbox", { name: "Email address" }), {
      target: { value: "unknown@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send reset email" }));

    await waitFor(() => {
      expect(screen.getByRole("status").textContent).toContain(PASSWORD_RESET_SUCCESS_MESSAGE);
    });
    expect(mockSendPasswordResetEmail).toHaveBeenCalledWith(
      expect.objectContaining({ name: "test-auth" }),
      "unknown@example.com",
    );
    const backLink = screen.getByRole("link", { name: "Back to sign in" });
    expect(backLink.getAttribute("href")).toBe("/signin");
    expect(backLink.className).toContain("min-h-11");
  });

  test("allows a successful address to be corrected and resubmitted without reload", async () => {
    mockSendPasswordResetEmail.mockResolvedValue(undefined);
    renderPage();

    expect(screen.getByRole("heading", { level: 1, name: "Reset your password" })).not.toBeNull();
    const input = screen.getByRole("textbox", { name: "Email address" });
    fireEvent.change(input, { target: { value: "mistyped@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Send reset email" }));

    await screen.findByText(PASSWORD_RESET_SUCCESS_MESSAGE);
    expect(input.disabled).toBe(false);

    fireEvent.change(input, { target: { value: "correct@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Send reset email" }));

    await waitFor(() => expect(mockSendPasswordResetEmail).toHaveBeenCalledTimes(2));
    expect(mockSendPasswordResetEmail.mock.calls[1][1]).toBe("correct@example.com");
    expect(document.head.querySelector('meta[name="robots"]')?.content).toBe("noindex, nofollow");
  });
});
