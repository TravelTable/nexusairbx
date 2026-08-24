import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import IconMarketCard from "./IconMarketCard";

test("renders a keyboard-reachable contact-sheet record on the authenticated detail route", () => {
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <IconMarketCard
        icon={{
          id: "sword / rare",
          name: "Rare Sword",
          imageUrl: "https://example.com/sword.png",
          style: "Flat Vector",
          category: "Inventory",
          isPro: true,
        }}
      />
    </MemoryRouter>,
  );

  expect(screen.getByRole("article").hasAttribute("data-contact-sheet-record")).toBe(true);
  const link = screen.getByRole("link", { name: "View Rare Sword details" });
  expect(link.getAttribute("href")).toBe("/icons-market/sword%20%2F%20rare");
  expect(link.className).toContain("creator-store-record__link");
  expect(link.className).toContain("min-h-11");
  expect(screen.getByRole("img", { name: "Rare Sword" })).not.toBeNull();
  expect(screen.getByRole("heading", { name: "Rare Sword" }).className).toContain("creator-store-record__title");
  expect(screen.getByText("Flat Vector · Inventory")).not.toBeNull();
  expect(screen.getByText("Pro access")).not.toBeNull();
  expect(screen.getByText("View licence record")).not.toBeNull();
});
