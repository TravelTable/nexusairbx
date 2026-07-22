import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";

import ChatEmptyState from "./ChatEmptyState";

test("keeps quick-start cards readable and horizontally scrollable", () => {
  const onQuickStart = jest.fn();
  const { container } = render(<ChatEmptyState onQuickStart={onQuickStart} />);
  const cards = screen.getAllByRole("button");

  expect(cards).toHaveLength(3);
  expect(cards[0]).toHaveClass("min-w-[15rem]", "snap-start");
  expect(container.querySelector(".overflow-x-auto")).toHaveClass("snap-x");
  expect(screen.getByText(/Build a Roblox shop system/i)).toHaveClass("line-clamp-3");

  fireEvent.click(cards[0]);
  expect(onQuickStart).toHaveBeenCalledWith(expect.stringContaining("Roblox shop system"));
});
