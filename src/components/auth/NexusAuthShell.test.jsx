import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { NexusAuthShell } from "./NexusAuthShell";

describe("NexusAuthShell", () => {
  test("renders a focused auth card without marketing content", () => {
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

    expect(screen.getByRole("heading", { name: "Welcome back" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "NexusRBX home" }).getAttribute("href")).toBe("/");
    expect(screen.getByRole("button", { name: "Sign in" })).toBeTruthy();
    expect(screen.queryByText("Marketing headline")).toBeNull();
    expect(screen.queryByText("Feature pitch")).toBeNull();
  });
});
