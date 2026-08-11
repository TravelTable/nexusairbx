import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

jest.mock("framer-motion", () => ({
  motion: {
    article: ({ children, initial, animate, transition, ...props }) => <article {...props}>{children}</article>,
  },
}));

import IconMarketCard from "./IconMarketCard";

test("renders a keyboard-reachable semantic card on the authenticated detail route", () => {
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <IconMarketCard
        icon={{
          id: "sword / rare",
          name: "Rare Sword",
          imageUrl: "https://example.com/sword.png",
          style: "Flat Vector",
          isPro: true,
        }}
      />
    </MemoryRouter>,
  );

  expect(screen.getByRole("article")).not.toBeNull();
  const link = screen.getByRole("link", { name: "View Rare Sword details" });
  expect(link.getAttribute("href")).toBe("/icons-market/sword%20%2F%20rare");
  expect(link.className).toContain("focus-visible:ring-2");
  expect(link.className).toContain("min-h-11");
  expect(screen.getByRole("img", { name: "Rare Sword" })).not.toBeNull();
  expect(screen.getByRole("heading", { name: "Rare Sword" }).className).toContain("text-sm");
  expect(screen.getByText("Flat Vector").className).toContain("text-xs");
});
