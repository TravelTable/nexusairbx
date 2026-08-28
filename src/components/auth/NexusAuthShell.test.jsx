import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { AuthCheckbox, AuthSubmitButton, NexusAuthShell } from "./NexusAuthShell";

describe("NexusAuthShell", () => {
  test("renders a focused, centered auth action without a side panel", () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <NexusAuthShell
          title="Welcome back"
          description="Sign in to your NexusRBX account."
          sideTitle="Marketing headline"
          sideItems={[{ title: "Feature pitch", description: "Extra information" }]}
        >
          <button type="button">Sign in</button>
        </NexusAuthShell>
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { level: 1, name: "Welcome back" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeTruthy();
    expect(document.querySelector('[data-nexus-surface="auth"]')).toBeTruthy();
    expect(document.querySelector(".nexus-auth-record")).toBeNull();
    expect(screen.queryByText("Marketing headline")).toBeNull();
    expect(screen.queryByText("Feature pitch")).toBeNull();
    expect(screen.queryByText("Personal build workspace")).toBeNull();
    expect(screen.queryByText("Studio connected")).toBeNull();
  });

  test("gives auth checkboxes the visible explanatory text as their accessible name", () => {
    render(
      <AuthCheckbox
        id="signin-shared-device"
        checked={false}
        onChange={() => {}}
      >
        Sign out when I close this browser (shared device).
      </AuthCheckbox>
    );

    expect(screen.getByRole("checkbox", {
      name: "Sign out when I close this browser (shared device).",
    })).toBeTruthy();
    expect(screen.getByText("Sign out when I close this browser (shared device).").previousElementSibling.className).not.toContain(
      "ds-accent"
    );
  });

  test("keeps idle account actions monochrome", () => {
    render(
      <AuthSubmitButton
        status="idle"
        idleLabel="Continue"
        loadingLabel="Continuing"
        successLabel="Done"
      />
    );

    const button = screen.getByRole("button", { name: "Continue" });
    expect(button.className).toContain("bg-[var(--ds-text)]");
    expect(button.className).not.toContain("bg-[var(--ds-accent)]");
  });
});
