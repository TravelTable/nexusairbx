import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, within } from "@testing-library/react";
import MessageActions from "./MessageActions";

function renderActions(overrides = {}) {
  const message = { id: "user-1", role: "user", content: "Build a round timer." };
  return render(
    <div className="ai-page">
      <MessageActions
        role="user"
        text={message.content}
        message={message}
        retryPrompt={message.content}
        onEdit={jest.fn()}
        onRetry={jest.fn()}
        {...overrides}
      />
    </div>
  );
}

describe("MessageActions accessibility", () => {
  test("focuses the first menu item and supports the vertical menu keyboard model", () => {
    renderActions();

    fireEvent.click(screen.getByRole("button", { name: "More message actions" }));

    const menu = screen.getByRole("menu", { name: "More message actions" });
    const items = within(menu).getAllByRole("menuitem");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveFocus();

    fireEvent.keyDown(items[0], { key: "ArrowDown" });
    expect(items[1]).toHaveFocus();

    fireEvent.keyDown(items[1], { key: "End" });
    expect(items[2]).toHaveFocus();

    fireEvent.keyDown(items[2], { key: "Home" });
    expect(items[0]).toHaveFocus();

    fireEvent.keyDown(items[0], { key: "ArrowUp" });
    expect(items[2]).toHaveFocus();

    fireEvent.keyDown(items[2], { key: "ArrowDown" });
    expect(items[0]).toHaveFocus();
  });

  test("Escape closes the menu and restores focus to its trigger", () => {
    renderActions();
    const trigger = screen.getByRole("button", { name: "More message actions" });
    fireEvent.click(trigger);
    const menu = screen.getByRole("menu", { name: "More message actions" });

    fireEvent.keyDown(within(menu).getAllByRole("menuitem")[0], { key: "Escape" });

    expect(screen.queryByRole("menu", { name: "More message actions" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  test("keeps phone actions touch-sized without adding glass styling", () => {
    renderActions();
    const copy = screen.getByRole("button", { name: "Copy" });
    const trigger = screen.getByRole("button", { name: "More message actions" });

    expect(copy).toHaveClass("h-11", "min-w-11", "sm:h-7");
    expect(trigger).toHaveClass("h-11", "min-w-11", "sm:h-7", "sm:min-w-7");

    fireEvent.click(trigger);
    const menu = screen.getByRole("menu", { name: "More message actions" });
    expect(menu).not.toHaveClass("backdrop-blur-xl");
    within(menu).getAllByRole("menuitem").forEach((item) => {
      expect(item).toHaveClass("min-h-11", "sm:min-h-0");
    });
  });
});
