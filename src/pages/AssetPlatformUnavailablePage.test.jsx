import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";

import AssetPlatformUnavailablePage from "./AssetPlatformUnavailablePage";

function renderPage(view) {
  return render(
    <HelmetProvider>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AssetPlatformUnavailablePage view={view} />
      </MemoryRouter>
    </HelmetProvider>,
  );
}

describe("AssetPlatformUnavailablePage", () => {
  afterEach(() => {
    document.head.querySelectorAll('meta[name="robots"]').forEach((meta) => meta.remove());
  });

  test.each([
    ["library", "Asset library unavailable"],
    ["detail", "Asset details unavailable"],
  ])("renders a truthful %s capability state", async (view, heading) => {
    renderPage(view);

    expect(screen.getByRole("main")).not.toBeNull();
    expect(screen.getByRole("heading", { name: heading })).not.toBeNull();
    expect(screen.queryByText(/not found/i)).toBeNull();
    await waitFor(() => {
      expect(document.head.querySelector('meta[name="robots"]')?.content).toBe("noindex, nofollow");
    });
  });
});
