import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

jest.mock("./useHeaderIdentity", () => ({ __esModule: true, default: jest.fn() }));

import useHeaderIdentity from "./useHeaderIdentity";
import SiteHeader, { isStaticPublicPath, resolveStaticPublicHref } from "./SiteHeader";

beforeEach(() => {
  useHeaderIdentity.mockReturnValue({
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
  });
});

test("connects Docs and Pricing to the configured public frontend", () => {
  expect(resolveStaticPublicHref("/docs", "http://localhost:4173/")).toBe(
    "http://localhost:4173/docs",
  );
  expect(resolveStaticPublicHref("/pricing", "http://localhost:4173")).toBe(
    "http://localhost:4173/pricing",
  );
  expect(resolveStaticPublicHref("/docs", "")).toBe("/docs");
});

test("sends every Next-owned landing page through document navigation", () => {
  for (const path of [
    "/docs",
    "/docs/installation",
    "/pricing",
    "/legal/privacy",
    "/roblox-script-generator",
    "/roblox-ai-scripter",
    "/roblox-lua-script-generator",
    "/roblox-studio-script-generator",
    "/roblox-gui-maker",
  ]) {
    expect(isStaticPublicPath(path)).toBe(true);
  }

  for (const path of ["/ai", "/assets", "/settings", "/connect-roblox"]) {
    expect(isStaticPublicPath(path)).toBe(false);
  }
});

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
  const homeIcon = homeLink.querySelector("img");
  expect(homeIcon).toBeTruthy();
  expect(homeIcon.getAttribute("src")).toBe("/favicon-transparent.png");
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

test("uses the resolved account picture and keeps the account menu accessible", () => {
  useHeaderIdentity.mockReturnValue({
    authReady: true,
    user: { uid: "creator-1" },
    avatar: { src: "https://example.com/roblox-headshot.png", source: "roblox", fallback: "RB" },
    displayName: "Roblox Builder",
    email: "builder@example.com",
    planLabel: "Free",
    robloxAction: "",
    robloxConnected: true,
    robloxError: "",
    robloxLoading: false,
    robloxUsername: "RobloxBuilder",
    supportUnreadCount: 0,
    isSupportStaff: false,
    connectRoblox: jest.fn(),
    reconnectRoblox: jest.fn(),
    signOutUser: jest.fn(),
  });

  render(
    <MemoryRouter initialEntries={["/"]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <SiteHeader variant="marketing" />
    </MemoryRouter>,
  );

  const accountButtons = screen.getAllByRole("button", { name: "Open account menu for Roblox Builder" });
  expect(accountButtons.length).toBeGreaterThan(0);
  expect(accountButtons[0].querySelector('[data-avatar-source="roblox"]')).toBeTruthy();

  fireEvent.click(accountButtons[0]);
  expect(screen.getByRole("menu", { name: "Account menu" })).toBeTruthy();
  expect(screen.getByText("builder@example.com")).toBeTruthy();
});
