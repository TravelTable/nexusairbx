import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";

import IconGeneratorUnavailablePage from "./IconGeneratorUnavailablePage";

test("truthfully explains and noindexes the disabled capability without rendering a not-found page", async () => {
  render(
    <HelmetProvider>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <IconGeneratorUnavailablePage />
      </MemoryRouter>
    </HelmetProvider>,
  );

  expect(screen.getByRole("heading", { name: "Icon generator unavailable" })).not.toBeNull();
  expect(screen.getByRole("link", { name: "Open AI workspace" }).getAttribute("href")).toBe("/ai");
  expect(screen.getByRole("link", { name: "Browse icon market" }).getAttribute("href")).toBe("/icons-market");
  expect(screen.queryByText(/not found/i)).toBeNull();
  await waitFor(() => {
    expect(document.head.querySelector('meta[name="robots"]')?.content).toBe("noindex, nofollow");
  });
});
