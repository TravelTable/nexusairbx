import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import ChatHeader from "./ChatHeader";

describe("ChatHeader", () => {
  test("shows project context, chat title, and Studio state", () => {
    render(
      <ChatHeader
        projectTitle="Obby Project"
        chatTitle="Checkpoint polish"
        studioConnected
      />
    );

    expect(screen.getByText("Obby Project")).toBeTruthy();
    expect(screen.getByText("Checkpoint polish")).toBeTruthy();
    expect(screen.getByText("Studio Live")).toBeTruthy();
  });

  test("renames the chat inline", () => {
    const onRenameChat = jest.fn();
    render(
      <ChatHeader
        chatTitle="Old title"
        onRenameChat={onRenameChat}
      />
    );

    fireEvent.click(screen.getByTitle("Rename chat"));
    const input = screen.getByRole("textbox", { name: "Chat title" });
    fireEvent.change(input, { target: { value: "  New   title  " } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onRenameChat).toHaveBeenCalledWith("New title");
  });

  test("names the compact plan action for assistive technology", () => {
    render(<ChatHeader onOpenPlan={jest.fn()} />);

    expect(screen.getByRole("button", { name: "Review plan" })).toBeTruthy();
  });
});
