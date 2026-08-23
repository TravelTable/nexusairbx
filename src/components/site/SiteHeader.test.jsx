import React from "react";
import { render, screen } from "@testing-library/react";
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

test("makes the homepage skip link the first keyboard target", () => {
  render(
    <MemoryRouter initialEntries={["/"]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <SiteHeader variant="marketing" />
      <main id="main-content">Homepage</main>
    </MemoryRouter>,
  );

  const skipLink = screen.getByRole("link", { name: "Skip to main content" });
  const firstInteractive = document.querySelector("a[href], button:not([disabled]), summary");
  expect(firstInteractive).toBe(skipLink);

  userEvent.tab();
  expect(document.activeElement).toBe(skipLink);
  const homeLink = screen.getByRole("link", { name: "NexusRBX home" });
  expect(homeLink.getAttribute("href")).toBe("/");
  expect(homeLink.textContent).toContain("NEXUS/RBX");
  expect(screen.getByRole("navigation", { name: "Primary navigation" })).toBeTruthy();
  expect(screen.getByRole("link", { name: "BUILD" }).getAttribute("href")).toBe("/ai");
  expect(screen.getByRole("link", { name: "TOOLS" }).getAttribute("href")).toBe("/tools/icon-generator");
  expect(screen.getByRole("link", { name: "DOCS" }).getAttribute("href")).toBe("/docs");
  expect(screen.getByRole("link", { name: "PRICING" }).getAttribute("href")).toBe("/pricing");

  const indexButton = screen.getAllByRole("button", { name: /index/i })[0];
  userEvent.click(indexButton);
  expect(screen.getByRole("dialog", { name: "NexusRBX site index" })).toBeTruthy();
  expect(screen.getByRole("link", { name: "Legal documents" }).getAttribute("href")).toBe("/legal");
});
