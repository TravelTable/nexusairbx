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
  expect(screen.getByRole("link", { name: "NexusRBX home" }).className).toContain("min-w-11");
  expect(screen.getByRole("button", { name: "Open navigation" }).className).toContain("h-11");
  expect(document.querySelector("header").className).toContain("sticky");
  expect(screen.getByRole("navigation", { name: "Homepage navigation" })).toBeTruthy();
  expect(screen.getByRole("link", { name: "Product" }).getAttribute("href")).toBe("/#product");
  expect(screen.getByRole("link", { name: "Games" }).getAttribute("href")).toBe("/#genres");
  expect(screen.getByRole("link", { name: "How it works" }).getAttribute("href")).toBe("/#workflow");
  expect(screen.getByRole("link", { name: "Pricing" }).getAttribute("href")).toBe("/pricing");
  expect(screen.getByRole("link", { name: "Start building" }).getAttribute("href")).toBe("/#product");
  expect(screen.getByRole("link", { name: "NexusRBX home" }).querySelector("img").getAttribute("src")).toBe(
    "/nexus-mark.svg",
  );
});
