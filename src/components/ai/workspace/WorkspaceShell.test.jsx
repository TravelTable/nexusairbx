import React, { useState } from "react";
import fs from "fs";
import path from "path";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import WorkspaceShell, {
  clampWorkspaceDrawerWidth,
  WORKSPACE_DRAWER_DEFAULT_WIDTH,
  WORKSPACE_DRAWER_MAX_WIDTH,
  WORKSPACE_DRAWER_MIN_WIDTH,
  WORKSPACE_DRAWER_OVERLAY_BREAKPOINT,
} from "./WorkspaceShell";

function Harness({ panelBadges = {} }) {
  const [activePanel, setActivePanel] = useState(null);
  const [drawerWidth, setDrawerWidth] = useState(WORKSPACE_DRAWER_DEFAULT_WIDTH);

  return (
    <WorkspaceShell
      activePanel={activePanel}
      onPanelChange={setActivePanel}
      drawerWidth={drawerWidth}
      onDrawerWidthChange={setDrawerWidth}
      panelBadges={panelBadges}
      renderPanel={(panelId) => <div>{panelId} panel</div>}
    >
      <div>Full-width chat</div>
    </WorkspaceShell>
  );
}

function chooseStageView(label) {
  fireEvent.click(screen.getByRole("button", { name: "Choose Stage view" }));
  fireEvent.click(screen.getByRole("menuitemradio", { name: `Open ${label}` }));
}

describe("WorkspaceShell", () => {
  beforeEach(() => {
    window.requestAnimationFrame = (callback) => {
      callback();
      return 1;
    };
  });

  test("keeps one restrained Stage launcher instead of a permanent five-tool rail", () => {
    render(<Harness />);

    expect(screen.getByRole("button", { name: "Open Stage" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Choose Stage view" })).toBeTruthy();
    expect(screen.queryByRole("navigation", { name: "Workspace tools" })).toBeNull();
    expect(screen.queryByRole("menu", { name: "Stage views" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Choose Stage view" }));
    expect(screen.getAllByRole("menuitemradio")).toHaveLength(5);
    expect(screen.getByRole("menuitemradio", { name: "Open Files" })).toBeTruthy();
    expect(screen.getByRole("menuitemradio", { name: "Open Activity" })).toBeTruthy();
  });

  test("moves focus through the Stage menu and restores its trigger on Escape", () => {
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Choose Stage view" });

    fireEvent.click(trigger);
    const files = screen.getByRole("menuitemradio", { name: "Open Files" });
    const code = screen.getByRole("menuitemradio", { name: "Open Code" });
    const project = screen.getByRole("menuitemradio", { name: "Open Project" });
    expect(files).toHaveFocus();

    fireEvent.keyDown(files, { key: "ArrowDown" });
    expect(code).toHaveFocus();
    fireEvent.keyDown(code, { key: "End" });
    expect(project).toHaveFocus();
    fireEvent.keyDown(project, { key: "ArrowDown" });
    expect(files).toHaveFocus();
    fireEvent.keyDown(files, { key: "ArrowUp" });
    expect(project).toHaveFocus();
    fireEvent.keyDown(project, { key: "Home" });
    expect(files).toHaveFocus();

    fireEvent.keyDown(files, { key: "Escape" });
    expect(screen.queryByRole("menu", { name: "Stage views" })).toBeNull();
    expect(trigger).toHaveFocus();
  });

  test("keeps conversation primary and opens a selected artifact view on Stage", () => {
    render(<Harness />);

    expect(screen.getByText("Full-width chat")).toBeTruthy();
    expect(screen.queryByRole("complementary")).toBeNull();

    chooseStageView("Files");

    expect(screen.getByRole("complementary", { name: "Files" })).toBeTruthy();
    expect(screen.getByText("files panel")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Open Stage" })).toBeNull();
  });

  test("shows arrival badges without opening Stage", () => {
    render(<Harness panelBadges={{ code: true }} />);

    expect(screen.getByLabelText("New Stage content")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Choose Stage view" }));
    expect(screen.getByLabelText("Unseen items")).toBeTruthy();
    expect(screen.queryByRole("complementary")).toBeNull();
  });

  test("closes Stage with Escape and restores the launcher", async () => {
    render(<Harness />);
    chooseStageView("Activity");
    expect(screen.getByRole("complementary", { name: "Activity" })).toBeTruthy();

    fireEvent.keyDown(document, { key: "Escape" });
    const launcher = await screen.findByRole("button", { name: "Open Stage" });
    await waitFor(() => expect(launcher).toHaveFocus());
  });

  test("uses modal focus behavior only when Stage overlays conversation", () => {
    const OriginalResizeObserver = global.ResizeObserver;
    const OriginalWindowResizeObserver = window.ResizeObserver;
    class MockResizeObserver {
      constructor(callback) { this.callback = callback; }
      observe(target) { this.callback([{ target, contentRect: { width: 1000 } }]); }
      disconnect() {}
    }
    global.ResizeObserver = MockResizeObserver;
    window.ResizeObserver = MockResizeObserver;

    try {
      render(<Harness />);
      const primary = screen.getByRole("group", { name: "Workspace content" });
      chooseStageView("Files");

      const dialog = screen.getByRole("dialog", { name: "Files" });
      const close = within(dialog).getByRole("button", { name: "Close Stage" });
      expect(primary).toHaveAttribute("inert");
      expect(primary).toHaveAttribute("aria-hidden", "true");
      expect(close).toHaveFocus();

      fireEvent.keyDown(document, { key: "Escape" });
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(primary).not.toHaveAttribute("inert");
    } finally {
      global.ResizeObserver = OriginalResizeObserver;
      window.ResizeObserver = OriginalWindowResizeObserver;
    }
  });

  test("focuses the Back to conversation action when Stage becomes a mobile sheet", () => {
    const OriginalResizeObserver = global.ResizeObserver;
    const OriginalWindowResizeObserver = window.ResizeObserver;
    class MockResizeObserver {
      constructor(callback) { this.callback = callback; }
      observe(target) { this.callback([{ target, contentRect: { width: 500 } }]); }
      disconnect() {}
    }
    global.ResizeObserver = MockResizeObserver;
    window.ResizeObserver = MockResizeObserver;

    try {
      render(<Harness />);
      chooseStageView("Code");
      const dialog = screen.getByRole("dialog", { name: "Code" });
      expect(within(dialog).getByRole("button", { name: "Back to conversation" })).toHaveFocus();
    } finally {
      global.ResizeObserver = OriginalResizeObserver;
      window.ResizeObserver = OriginalWindowResizeObserver;
    }
  });

  test("switches from overlay Stage to inline Stage at the shell breakpoint", () => {
    expect(WORKSPACE_DRAWER_OVERLAY_BREAKPOINT).toBe(1180);
    const OriginalResizeObserver = global.ResizeObserver;
    const OriginalWindowResizeObserver = window.ResizeObserver;
    let measuredWidth = WORKSPACE_DRAWER_OVERLAY_BREAKPOINT - 1;
    class MockResizeObserver {
      constructor(callback) { this.callback = callback; }
      observe(target) { this.callback([{ target, contentRect: { width: measuredWidth } }]); }
      disconnect() {}
    }
    global.ResizeObserver = MockResizeObserver;
    window.ResizeObserver = MockResizeObserver;

    try {
      const view = render(<Harness />);
      chooseStageView("Files");
      expect(screen.getByRole("dialog", { name: "Files" })).toBeTruthy();
      view.unmount();

      measuredWidth = WORKSPACE_DRAWER_OVERLAY_BREAKPOINT;
      render(<Harness />);
      chooseStageView("Files");
      expect(screen.queryByRole("dialog", { name: "Files" })).toBeNull();
      expect(screen.getByRole("complementary", { name: "Files" })).toBeTruthy();
    } finally {
      global.ResizeObserver = OriginalResizeObserver;
      window.ResizeObserver = OriginalWindowResizeObserver;
    }
  });

  test("can promote inline Stage to a full-screen modal and exit again", () => {
    render(<Harness />);
    chooseStageView("Project");
    expect(screen.getByRole("complementary", { name: "Project" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Enter full screen" }));
    expect(screen.getByRole("dialog", { name: "Project" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Exit full screen" }));
    expect(screen.getByRole("complementary", { name: "Project" })).toBeTruthy();
  });

  test("full-screen Stage spans the complete workspace grid", () => {
    const css = fs.readFileSync(path.join(__dirname, "WorkspaceShell.css"), "utf8");
    expect(css).toMatch(
      /\.workspace-shell\[data-stage-fullscreen="true"\] \.workspace-stage\s*\{[\s\S]*?grid-column:\s*1 \/ -1;/
    );
  });

  test("clamps persisted and dragged widths to the supported range", () => {
    expect(clampWorkspaceDrawerWidth(null)).toBe(WORKSPACE_DRAWER_DEFAULT_WIDTH);
    expect(clampWorkspaceDrawerWidth("not-a-width")).toBe(WORKSPACE_DRAWER_DEFAULT_WIDTH);
    expect(clampWorkspaceDrawerWidth(120)).toBe(WORKSPACE_DRAWER_MIN_WIDTH);
    expect(clampWorkspaceDrawerWidth(640.4)).toBe(640);
    expect(clampWorkspaceDrawerWidth(1200)).toBe(WORKSPACE_DRAWER_MAX_WIDTH);
  });
});
