import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import ChatHeader from "./ChatHeader";

describe("ChatHeader", () => {
  test("keeps the toolbar focused on the chat identity", () => {
    render(
      <ChatHeader
        projectTitle="Obby Project"
        chatTitle="Checkpoint polish"
        studioConnected
      />,
    );
    expect(screen.getByText("Checkpoint polish")).toBeTruthy();
    expect(screen.queryByText("Obby Project")).toBeNull();
    expect(screen.queryByText("Studio Live")).toBeNull();
  });

  test("renames the chat inline", () => {
    const onRenameChat = jest.fn();
    render(<ChatHeader chatTitle="Old title" onRenameChat={onRenameChat} />);

    fireEvent.click(screen.getByTitle("Rename chat"));
    const input = screen.getByRole("textbox", { name: "Chat title" });
    fireEvent.change(input, { target: { value: "  New   title  " } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onRenameChat).toHaveBeenCalledWith("New title");
  });

  test("names project navigation and plan actions for assistive technology", () => {
    render(
      <ChatHeader
        onOpenPlan={jest.fn()}
        navigationControls="project-sidebar"
      />,
    );

    const navigation = screen.getByRole("button", {
      name: "Toggle project navigation",
    });
    const review = screen.getByRole("button", { name: "Review plan" });

    expect(navigation).toHaveAttribute("aria-controls", "project-sidebar");
    expect(navigation).toHaveAttribute("aria-expanded", "false");
    expect(review).toHaveAttribute("type", "button");
  });
});
