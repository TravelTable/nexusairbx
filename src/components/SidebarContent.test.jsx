import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import SidebarContent from "./SidebarContent";

const mockDeleteProject = jest.fn();
const mockOpenGameProject = jest.fn();
const mockRenameProject = jest.fn();
const mockRefreshProjects = jest.fn();

jest.mock("../context/BillingContext", () => ({
  useBilling: () => ({ isFreeUsagePlan: false, limits: {}, plan: "PRO" }),
}));

jest.mock("../hooks/useAiLibrary", () => ({
  useAiLibrary: () => ({
    allChats: [{ id: "chat-1", projectId: "project-1", title: "Combat plan" }],
  }),
}));

jest.mock("../hooks/useProjectBindings", () => ({
  useProjectBindings: () => ({
    projects: [{ projectId: "project-1", title: "Sword Simulator" }],
    loading: false,
    error: null,
    openGameProject: mockOpenGameProject,
    deleteProject: mockDeleteProject,
    renameProject: mockRenameProject,
    refresh: mockRefreshProjects,
  }),
}));

jest.mock("../lib/studioBridgeApi", () => ({
  getStudioStatus: jest.fn(),
}));

const { getStudioStatus: mockGetStudioStatus } = require("../lib/studioBridgeApi");

function renderSidebar(overrides = {}) {
  const props = {
    user: { uid: "user-1" },
    authReady: true,
    generatingChatIds: [],
    activeAgentStatusByChat: {},
    notify: jest.fn(),
    ...overrides,
  };
  return {
    ...render(<SidebarContent {...props} />),
    props,
  };
}

describe("SidebarContent destructive project confirmation", () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.clearAllMocks();
  });

  test("blocks a project deletion if a run becomes active while confirmation is open", () => {
    const { rerender, props } = renderSidebar();

    fireEvent.click(screen.getByRole("button", { name: "Actions for Sword Simulator" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete project" }));
    expect(screen.getByRole("dialog", { name: "Delete game project?" })).toBeInTheDocument();

    rerender(
      <SidebarContent
        {...props}
        activeAgentStatusByChat={{ "chat-1": "running" }}
      />
    );

    expect(screen.getByText("Finish or cancel the active run first.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete Nexus data" })).toBeDisabled();
    expect(mockDeleteProject).not.toHaveBeenCalled();
  });

  test("adds a selected local Studio target without published ids", async () => {
    mockGetStudioStatus.mockResolvedValue({
      targeting: {
        targets: [{
          id: "studio_target_local",
          studioTargetId: "studio_target_local",
          label: "Local Arena",
          placeId: null,
          universeId: null,
        }],
      },
    });
    mockOpenGameProject.mockResolvedValue({
      projectId: "project-local",
      title: "Local Arena",
      status: "draft",
    });
    const notify = jest.fn();
    renderSidebar({ notify });

    fireEvent.click(screen.getByRole("button", { name: "Detect project from Studio" }));
    fireEvent.click(await screen.findByRole("button", { name: "Local Arena" }));

    await waitFor(() => expect(mockOpenGameProject).toHaveBeenCalledWith(expect.objectContaining({
      title: "Local Arena",
      placeId: null,
      universeId: null,
      studioTargetId: "studio_target_local",
      studioTargetLabel: "Local Arena",
      source: "studio",
    })));
    await waitFor(() => expect(notify).toHaveBeenCalledWith({
      message: "Added Local Arena to Projects",
      type: "success",
    }));
  });

  test("keeps a Studio choice available when an add completion becomes stale", async () => {
    mockGetStudioStatus.mockResolvedValue({
      targeting: {
        targets: [{
          id: "studio_target_local",
          studioTargetId: "studio_target_local",
          label: "Local Arena",
          placeId: null,
          universeId: null,
        }],
      },
    });
    mockOpenGameProject.mockResolvedValue(null);
    const notify = jest.fn();
    renderSidebar({ notify });

    fireEvent.click(screen.getByRole("button", { name: "Detect project from Studio" }));
    const option = await screen.findByRole("button", { name: "Local Arena" });
    fireEvent.click(option);

    await waitFor(() => expect(notify).toHaveBeenCalledWith(expect.objectContaining({
      type: "info",
      message: expect.stringContaining("Project state changed"),
    })));
    expect(screen.getByRole("button", { name: "Local Arena" })).toBeInTheDocument();
    expect(notify).not.toHaveBeenCalledWith(expect.objectContaining({ type: "success" }));
  });

  test("keeps an inline rename open when its completion becomes stale", async () => {
    mockRenameProject.mockResolvedValue(null);
    const notify = jest.fn();
    renderSidebar({ notify });

    fireEvent.click(screen.getByRole("button", { name: "Actions for Sword Simulator" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Rename" }));
    const input = screen.getByRole("textbox", { name: "Rename" });
    fireEvent.change(input, { target: { value: "Arena" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(await screen.findByRole("alert")).toHaveTextContent("Project state changed");
    expect(screen.getByRole("textbox", { name: "Rename" })).toBeInTheDocument();
    expect(notify).not.toHaveBeenCalledWith(expect.objectContaining({ type: "success" }));
  });

  test("keeps deletion confirmation open when its completion becomes stale", async () => {
    mockDeleteProject.mockResolvedValue(null);
    const notify = jest.fn();
    renderSidebar({ notify });

    fireEvent.click(screen.getByRole("button", { name: "Actions for Sword Simulator" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete project" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete Nexus data" }));

    await waitFor(() => expect(notify).toHaveBeenCalledWith(expect.objectContaining({
      type: "info",
      message: expect.stringContaining("Project state changed"),
    })));
    expect(screen.getByRole("dialog", { name: "Delete game project?" })).toBeInTheDocument();
    expect(notify).not.toHaveBeenCalledWith(expect.objectContaining({ type: "success" }));
  });
});
