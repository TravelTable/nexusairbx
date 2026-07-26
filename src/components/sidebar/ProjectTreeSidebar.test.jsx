import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ProjectTreeSidebar from "./ProjectTreeSidebar";

const projects = [
  {
    projectId: "project-a",
    title: "Sword Simulator",
    updatedAt: 100,
  },
];

const chats = [
  {
    id: "general-chat",
    title: "DataStore question",
    updatedAt: 300,
  },
  {
    id: "combat-chat",
    projectId: "project-a",
    title: "Combat refactor",
    updatedAt: 200,
  },
];

function renderSidebar(overrides = {}) {
  const props = {
    userKey: "user-1",
    projects,
    chats,
    scripts: [
      {
        id: "script-1",
        title: "Inventory Controller",
        path: "ReplicatedStorage/InventoryController.lua",
      },
    ],
    onOpenChat: jest.fn(),
    onOpenCreation: jest.fn(),
    onMoveChat: jest.fn(),
    ...overrides,
  };

  return {
    ...render(<ProjectTreeSidebar {...props} />),
    props,
  };
}

describe("ProjectTreeSidebar", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("opens nested project chats directly and persists the exact expansion state", async () => {
    const { props } = renderSidebar();

    fireEvent.click(screen.getByRole("button", { name: "Sword Simulator" }));
    fireEvent.click(screen.getByRole("button", { name: /^Combat refactor/ }));

    expect(props.onOpenChat).toHaveBeenCalledWith("combat-chat");
    await waitFor(() => {
      expect(JSON.parse(
        window.localStorage.getItem("nexusrbx:sidebar:user-1:expanded")
      )).toEqual(expect.arrayContaining(["__projects__", "project-a"]));
    });
  });

  it("searches files without changing expansion state", async () => {
    renderSidebar();
    fireEvent.click(screen.getByRole("button", { name: "Sword Simulator" }));

    fireEvent.keyDown(window, { key: "k", metaKey: true });
    const search = screen.getByPlaceholderText("Search projects and chats");
    expect(document.activeElement).toBe(search);
    fireEvent.change(search, { target: { value: "inventory" } });

    expect(await screen.findByText("Files & creations")).toBeTruthy();
    expect(screen.getByText("Inventory Controller")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(screen.getByRole("button", { name: /^Combat refactor/ })).toBeTruthy();
  });

  it("moves a project chat to General from its context menu", async () => {
    const { props } = renderSidebar();
    fireEvent.click(screen.getByRole("button", { name: "Sword Simulator" }));

    fireEvent.contextMenu(screen.getByRole("button", { name: /^Combat refactor/ }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Move to" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "General" }));

    expect(props.onMoveChat).toHaveBeenCalledWith("combat-chat", null);
  });

  it("marks only newly inserted chats for the one-shot row entrance", async () => {
    const { props, rerender } = renderSidebar();
    const addedChat = {
      id: "new-chat",
      title: "Fresh conversation",
      updatedAt: 400,
    };

    rerender(
      <ProjectTreeSidebar
        {...props}
        chats={[addedChat, ...chats]}
      />
    );

    const newChatButton = await screen.findByRole("button", {
      name: /^Fresh conversation/,
    });
    const existingChatButton = screen.getByRole("button", {
      name: /^DataStore question/,
    });

    await waitFor(() => {
      expect(
        newChatButton
          .closest(".nexus-tree-row")
          .classList.contains("nexus-tree-row-in")
      ).toBe(true);
    });
    expect(
      existingChatButton
        .closest(".nexus-tree-row")
        .classList.contains("nexus-tree-row-in")
    ).toBe(false);
  });
});
