import React, { useState } from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import SidebarContextMenu from "./SidebarContextMenu";

function Harness() {
  const [menu, setMenu] = useState(null);
  return (
    <>
      <button
        type="button"
        onClick={() => setMenu({
          x: 20,
          y: 20,
          label: "Chat actions",
          items: [
            { id: "rename", label: "Rename", onSelect: jest.fn() },
            {
              id: "move",
              label: "Move to",
              children: [{ id: "general", label: "General", onSelect: jest.fn() }],
            },
            { id: "delete", label: "Delete", onSelect: jest.fn() },
          ],
        })}
      >
        Open actions
      </button>
      <SidebarContextMenu menu={menu} onClose={() => setMenu(null)} />
    </>
  );
}

describe("SidebarContextMenu", () => {
  test("supports roving menu focus, submenu navigation, and Escape restoration", async () => {
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Open actions" });
    trigger.focus();
    fireEvent.click(trigger);

    const rename = screen.getByRole("menuitem", { name: "Rename" });
    expect(rename).toHaveFocus();

    fireEvent.keyDown(rename, { key: "ArrowDown" });
    const move = screen.getByRole("menuitem", { name: "Move to" });
    expect(move).toHaveFocus();

    fireEvent.keyDown(move, { key: "ArrowRight" });
    const back = screen.getByRole("menuitem", { name: "Back" });
    expect(back).toHaveFocus();
    expect(screen.getByRole("menuitem", { name: "General" })).toBeTruthy();

    fireEvent.keyDown(back, { key: "ArrowLeft" });
    const returnedRename = screen.getByRole("menuitem", { name: "Rename" });
    expect(returnedRename).toHaveFocus();

    fireEvent.keyDown(returnedRename, { key: "End" });
    const deleteItem = screen.getByRole("menuitem", { name: "Delete" });
    expect(deleteItem).toHaveFocus();

    fireEvent.keyDown(deleteItem, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
