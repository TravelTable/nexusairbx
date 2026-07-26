import React, { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import WorkspaceShell, {
  clampWorkspaceDrawerWidth,
  WORKSPACE_DRAWER_DEFAULT_WIDTH,
  WORKSPACE_DRAWER_MAX_WIDTH,
  WORKSPACE_DRAWER_MIN_WIDTH,
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
  test("keeps chat available with the drawer closed, then toggles tools without stealing focus", () => {
    render(<Harness />);

    expect(screen.getByText("Full-width chat")).toBeTruthy();
    expect(screen.queryByRole("complementary")).toBeNull();

    const filesButton = screen.getByRole("button", { name: "Open Files" });
    filesButton.focus();
    fireEvent.click(filesButton);

    expect(screen.getByRole("complementary", { name: "Files" })).toBeTruthy();
    expect(screen.getByText("files panel")).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Close Files" }));

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

  test("clamps persisted and dragged widths to the supported range", () => {
    expect(clampWorkspaceDrawerWidth(null)).toBe(WORKSPACE_DRAWER_DEFAULT_WIDTH);
    expect(clampWorkspaceDrawerWidth("not-a-width")).toBe(WORKSPACE_DRAWER_DEFAULT_WIDTH);
    expect(clampWorkspaceDrawerWidth(120)).toBe(WORKSPACE_DRAWER_MIN_WIDTH);
    expect(clampWorkspaceDrawerWidth(640.4)).toBe(640);
    expect(clampWorkspaceDrawerWidth(1200)).toBe(WORKSPACE_DRAWER_MAX_WIDTH);
  });
});
