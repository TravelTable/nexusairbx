import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ProjectTreeSidebar from "./ProjectTreeSidebar";

const projects = [
  { projectId: "project-a", title: "Sword Simulator", updatedAt: 200 },
  { projectId: "project-b", title: "City Builder", updatedAt: 100 },
];
const chats = [
  { id: "chat-a", projectId: "project-a", title: "Combat refactor", updatedAt: 200 },
  { id: "chat-b", projectId: "project-b", title: "Traffic system", updatedAt: 100 },
  { id: "legacy-general", title: "Legacy general chat", updatedAt: 300 },
];

function renderSidebar(overrides = {}) {
  const props = {
    projects,
    chats,
    onOpenProject: jest.fn(),
    onOpenChat: jest.fn(),
    onNewChat: jest.fn(),
    onCreateProject: jest.fn(async (title) => ({ projectId: "project-new", title })),
    ...overrides,
  };
  return { ...render(<ProjectTreeSidebar {...props} />), props };
}

test("project view lists folders and creates a name-only project", async () => {
  const { props } = renderSidebar({ showProjectList: true });
  expect(screen.getByRole("button", { name: "Sword Simulator" })).toBeInTheDocument();
  expect(screen.queryByText("Combat refactor")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "New project" }));
  fireEvent.change(screen.getByLabelText("Project name"), { target: { value: "Movement Lab" } });
  fireEvent.click(screen.getByRole("button", { name: "Create" }));
  await waitFor(() => expect(props.onCreateProject).toHaveBeenCalledWith("Movement Lab"));
});

test("opening a project delegates the fresh-chat transition", () => {
  const { props } = renderSidebar({ showProjectList: true });
  fireEvent.click(screen.getByRole("button", { name: "Sword Simulator" }));
  expect(props.onOpenProject).toHaveBeenCalledWith("project-a");
});

test("open-project view shows only that project's chats", () => {
  renderSidebar({ currentProjectId: "project-a" });
  expect(screen.getByText("Combat refactor")).toBeInTheDocument();
  expect(screen.queryByText("Traffic system")).not.toBeInTheDocument();
  expect(screen.queryByText("Legacy general chat")).not.toBeInTheDocument();
});

test("project chat search is scoped and back navigation returns to folders", () => {
  const { props } = renderSidebar({ currentProjectId: "project-a" });
  fireEvent.change(screen.getByPlaceholderText("Search Sword Simulator"), { target: { value: "missing" } });
  expect(screen.getByText("No chats match your search.")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Back to Projects" }));
  expect(props.onOpenProject).toHaveBeenCalledWith(null);
});

test("new chat remains within the open project", () => {
  const { props } = renderSidebar({ currentProjectId: "project-a" });
  fireEvent.click(screen.getByRole("button", { name: "New chat" }));
  expect(props.onNewChat).toHaveBeenCalledWith("project-a");
});
