import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import ChatRow from "./ChatRow";

function renderRow(overrides = {}) {
  const props = {
    chat: { id: "chat-1", title: "Combat plan", lastMessage: "Tune the sword" },
    currentChatId: null,
    onOpenChat: jest.fn(),
    renamingChatId: null,
    renameChatTitle: "",
    setRenameChatTitle: jest.fn(),
    onRenameStart: jest.fn(),
    onRenameCommit: jest.fn(),
    onRenameCancel: jest.fn(),
    onDeleteClick: jest.fn(),
    ...overrides,
  };
  return { ...render(<ChatRow {...props} />), props };
}

describe("ChatRow", () => {
  test("exposes a keyboard-activatable primary action without nesting row actions", () => {
    const { props } = renderRow();
    const primaryAction = screen.getByRole("button", { name: "Open chat Combat plan" });
    const renameAction = screen.getByRole("button", { name: "Rename chat Combat plan" });

    primaryAction.focus();
    userEvent.keyboard("{enter}");
    expect(props.onOpenChat).toHaveBeenCalledWith("chat-1");
    expect(primaryAction.contains(renameAction)).toBe(false);

    fireEvent.click(renameAction);
    expect(props.onRenameStart).toHaveBeenCalledWith("chat-1", "Combat plan");
    expect(props.onOpenChat).toHaveBeenCalledTimes(1);
  });

  test("labels the rename field when editing", () => {
    renderRow({ renamingChatId: "chat-1", renameChatTitle: "Combat plan" });
    expect(screen.getByRole("textbox", { name: "Rename chat Combat plan" })).toBeTruthy();
  });
});
