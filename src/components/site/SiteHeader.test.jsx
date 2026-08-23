import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

jest.mock("./useHeaderIdentity", () => () => ({
  authReady: true,
  user: null,
  avatar: { src: "", fallback: "N" },
  displayName: "Guest",
  email: "",
  planLabel: "Free",
  robloxAction: "connect",
  robloxConnected: false,
  robloxError: "",
  robloxLoading: false,
  robloxUsername: "",
  supportUnreadCount: 0,
  isSupportStaff: false,
  connectRoblox: jest.fn(),
  reconnectRoblox: jest.fn(),
  signOutUser: jest.fn(),
}));

import SiteHeader from "./SiteHeader";

test("makes the homepage skip link the first keyboard target", async () => {
  render(
    <MemoryRouter
      initialEntries={["/"]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <SiteHeader variant="marketing" />
      <main id="main-content">Homepage</main>
    </MemoryRouter>,
  );

  const skipLink = screen.getByRole("link", { name: "Skip to main content" });
  const firstInteractive = document.querySelector(
    "a[href], button:not([disabled]), summary",
  );
  expect(firstInteractive).toBe(skipLink);

  userEvent.tab();
  expect(document.activeElement).toBe(skipLink);
  const homeLink = screen.getByRole("link", { name: "NexusRBX home" });
  expect(homeLink.getAttribute("href")).toBe("/");
  expect(homeLink.textContent).toContain("NEXUS/RBX");
  expect(
    screen.getByRole("navigation", { name: "Primary navigation" }),
  ).toBeTruthy();
  expect(screen.getByRole("link", { name: "Build" }).getAttribute("href")).toBe(
    "/ai",
  );
  expect(
    screen.getByRole("link", { name: "Assets" }).getAttribute("href"),
  ).toBe("/assets");
  expect(screen.getByRole("link", { name: "Icons" }).getAttribute("href")).toBe(
    "/icons-market",
  );
  expect(
    screen.getByRole("link", { name: "Studio" }).getAttribute("href"),
  ).toBe("/downloads");
  expect(screen.getByRole("link", { name: "Docs" }).getAttribute("href")).toBe(
    "/docs",
  );
  expect(
    screen.getByRole("link", { name: "Pricing" }).getAttribute("href"),
  ).toBe("/pricing");

  const searchButton = screen.getByRole("button", { name: /Search/ });
  searchButton.focus();
  fireEvent.keyDown(document, { key: "k", ctrlKey: true });
  expect(screen.getByRole("dialog", { name: "Search NexusRBX" })).toBeTruthy();
  await waitFor(() =>
    expect(document.activeElement).toBe(
      screen.getByRole("textbox", { name: "Search pages and tools" }),
    ),
  );
  fireEvent.keyDown(document, { key: "Escape" });
  await waitFor(() => expect(document.activeElement).toBe(searchButton));

  const indexButton = screen.getAllByRole("button", { name: "Tools" })[0];
  userEvent.click(indexButton);
  expect(
    screen.getByRole("dialog", { name: "NexusRBX site index" }),
  ).toBeTruthy();
  expect(
    screen.getByRole("link", { name: /^Legal\b/ }).getAttribute("href"),
  ).toBe("/legal");
});
