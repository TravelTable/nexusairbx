import React, { useState } from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, within } from "@testing-library/react";

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

describe("WorkspaceShell", () => {
  test("keeps five visible, plainly named creator tools in the rail", () => {
    const { container } = render(<Harness />);
    const labels = [...container.querySelectorAll(".workspace-tool-rail__label")]
      .map((element) => element.textContent);

    expect(labels).toEqual(["Files", "Code", "Runs", "Assets", "Project"]);
    expect(screen.getByRole("navigation", { name: "Workspace tools" })).toBeTruthy();
  });

  test("keeps chat available with the drawer closed, then toggles tools without stealing focus", () => {
    render(<Harness />);

    expect(screen.getByText("Full-width chat")).toBeTruthy();
    expect(screen.queryByRole("complementary")).toBeNull();

    const filesButton = screen.getByRole("button", { name: "Open Files" });
    filesButton.focus();
    fireEvent.click(filesButton);

    expect(screen.getByRole("complementary", { name: "Files" })).toBeTruthy();
    expect(screen.getByText("files panel")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Close Files" })).toHaveFocus();

    fireEvent.click(screen.getByRole("button", { name: "Close Files" }));
    expect(screen.getByRole("button", { name: "Open Files" })).toBeTruthy();
  });

  test("shows arrival badges without opening a panel", () => {
    render(<Harness panelBadges={{ code: true }} />);

    expect(screen.getByRole("button", { name: "Open Code" })).toBeTruthy();
    expect(screen.getByLabelText("Unseen items")).toBeTruthy();
    expect(screen.queryByRole("complementary")).toBeNull();
  });

  test("closes the active drawer with Escape", () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole("button", { name: "Open Activity" }));
    expect(screen.getByRole("complementary", { name: "Activity" })).toBeTruthy();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.getByRole("button", { name: "Open Activity" })).toBeTruthy();
  });

  test("uses modal focus behavior only when the drawer overlays the workspace", () => {
    const OriginalResizeObserver = global.ResizeObserver;
    const OriginalWindowResizeObserver = window.ResizeObserver;
    class MockResizeObserver {
      constructor(callback) {
        this.callback = callback;
      }

      observe(target) {
        this.callback([{ target, contentRect: { width: 1000 } }]);
      }

      disconnect() {}
    }
    global.ResizeObserver = MockResizeObserver;
    window.ResizeObserver = MockResizeObserver;

    try {
      render(<Harness />);
      const filesButton = screen.getByRole("button", { name: "Open Files" });
      const primary = screen.getByRole("group", { name: "Workspace content" });
      filesButton.focus();
      fireEvent.click(filesButton);

      const dialog = screen.getByRole("dialog", { name: "Files" });
      const drawerClose = within(dialog).getByRole("button", { name: "Close workspace drawer" });
      expect(primary.hasAttribute("inert")).toBe(true);
      expect(primary.getAttribute("aria-hidden")).toBe("true");
      expect(drawerClose).toHaveFocus();

      fireEvent.keyDown(document, { key: "Tab" });
      expect(within(dialog).getByRole("separator", { name: "Resize workspace drawer" })).toHaveFocus();

      fireEvent.keyDown(document, { key: "Escape" });
      expect(filesButton).toHaveFocus();
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(primary.hasAttribute("inert")).toBe(false);
    } finally {
      global.ResizeObserver = OriginalResizeObserver;
      window.ResizeObserver = OriginalWindowResizeObserver;
    }
  });

  test("focuses the mobile back action when the drawer becomes a full sheet", () => {
    const OriginalResizeObserver = global.ResizeObserver;
    const OriginalWindowResizeObserver = window.ResizeObserver;
    class MockResizeObserver {
      constructor(callback) {
        this.callback = callback;
      }

      observe(target) {
        this.callback([{ target, contentRect: { width: 500 } }]);
      }

      disconnect() {}
    }
    global.ResizeObserver = MockResizeObserver;
    window.ResizeObserver = MockResizeObserver;

    try {
      render(<Harness />);
      fireEvent.click(screen.getByRole("button", { name: "Open Code" }));
      const dialog = screen.getByRole("dialog", { name: "Code" });
      expect(within(dialog).getByRole("button", { name: "Back to chat" })).toHaveFocus();
    } finally {
      global.ResizeObserver = OriginalResizeObserver;
      window.ResizeObserver = OriginalWindowResizeObserver;
    }
  });

  test("switches from an overlay drawer to an inline drawer at the shell breakpoint", () => {
    expect(WORKSPACE_DRAWER_OVERLAY_BREAKPOINT).toBe(1180);
    const OriginalResizeObserver = global.ResizeObserver;
    const OriginalWindowResizeObserver = window.ResizeObserver;
    let measuredWidth = WORKSPACE_DRAWER_OVERLAY_BREAKPOINT - 1;
    class MockResizeObserver {
      constructor(callback) {
        this.callback = callback;
      }

      observe(target) {
        this.callback([{ target, contentRect: { width: measuredWidth } }]);
      }

      disconnect() {}
    }
    global.ResizeObserver = MockResizeObserver;
    window.ResizeObserver = MockResizeObserver;

    try {
      const overlay = render(<Harness />);
      fireEvent.click(screen.getByRole("button", { name: "Open Files" }));
      expect(screen.getByRole("dialog", { name: "Files" })).toBeTruthy();
      overlay.unmount();

      measuredWidth = WORKSPACE_DRAWER_OVERLAY_BREAKPOINT;
      render(<Harness />);
      fireEvent.click(screen.getByRole("button", { name: "Open Files" }));
      expect(screen.queryByRole("dialog", { name: "Files" })).toBeNull();
      expect(screen.getByRole("complementary", { name: "Files" })).toBeTruthy();
    } finally {
      global.ResizeObserver = OriginalResizeObserver;
      window.ResizeObserver = OriginalWindowResizeObserver;
    }
  });

  test("returns focus to the opening tool when the inline collapse control closes", () => {
    render(<Harness />);
    const filesButton = screen.getByRole("button", { name: "Open Files" });
    fireEvent.click(filesButton);
    fireEvent.click(screen.getByRole("button", { name: "Collapse workspace drawer" }));

    expect(filesButton).toHaveFocus();
  });

  test("clamps persisted and dragged widths to the supported range", () => {
    expect(clampWorkspaceDrawerWidth(null)).toBe(WORKSPACE_DRAWER_DEFAULT_WIDTH);
    expect(clampWorkspaceDrawerWidth("not-a-width")).toBe(WORKSPACE_DRAWER_DEFAULT_WIDTH);
    expect(clampWorkspaceDrawerWidth(120)).toBe(WORKSPACE_DRAWER_MIN_WIDTH);
    expect(clampWorkspaceDrawerWidth(640.4)).toBe(640);
    expect(clampWorkspaceDrawerWidth(1200)).toBe(WORKSPACE_DRAWER_MAX_WIDTH);
  });
});
