import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import WorkspaceWalkthroughPanel from "./WorkspaceWalkthroughPanel";

const baseSteps = [
  {
    id: "install_plugin",
    label: "Install the Studio plugin",
    description: "Install or update the NexusRBX plugin in Roblox Studio.",
    completed: false,
    manual: true,
    actionHref: "/docs#install-plugin",
    actionLabel: "Plugin Docs",
  },
  {
    id: "pair_studio",
    label: "Pair Studio",
    description: "Enter the pairing code in the Studio plugin.",
    completed: true,
    actionHref: "/docs#pair-studio",
    actionLabel: "Pairing Docs",
  },
];

function renderPanel(overrides = {}) {
  return render(
    <WorkspaceWalkthroughPanel
      onboarding={{
        walkthroughOpen: true,
        steps: baseSteps,
        ...overrides.onboarding,
      }}
      onMarkManualStepDone={overrides.onMarkManualStepDone}
      onDismiss={overrides.onDismiss}
      onReplay={overrides.onReplay}
    />
  );
}

describe("WorkspaceWalkthroughPanel", () => {
  test("renders incomplete walkthrough progress and next step", () => {
    renderPanel();

    expect(screen.getByText("Workspace Walkthrough")).toBeTruthy();
    expect(screen.getByText("1/2")).toBeTruthy();
    expect(screen.getByText("Next step")).toBeTruthy();
    expect(screen.getAllByText("Install the Studio plugin")).toHaveLength(2);
    expect(screen.getByText("Pair Studio")).toBeTruthy();
  });

  test("calls manual step, dismiss, and replay callbacks", () => {
    const onMarkManualStepDone = jest.fn();
    const onDismiss = jest.fn();
    const onReplay = jest.fn();

    renderPanel({ onMarkManualStepDone, onDismiss, onReplay });

    fireEvent.click(screen.getByText("Mark done"));
    expect(onMarkManualStepDone).toHaveBeenCalledWith("install_plugin");

    fireEvent.click(screen.getByText("Replay walkthrough"));
    expect(onReplay).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByLabelText("Dismiss Workspace Walkthrough"));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  test("renders collapsed completion state", () => {
    const onDismiss = jest.fn();
    const onReplay = jest.fn();

    renderPanel({
      onDismiss,
      onReplay,
      onboarding: {
        steps: baseSteps.map((step) => ({ ...step, completed: true })),
      },
    });

    expect(screen.getByText("Workspace Walkthrough complete")).toBeTruthy();
    expect(screen.queryByText("Next step")).toBeNull();

    fireEvent.click(screen.getByText("Replay"));
    expect(onReplay).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByLabelText("Dismiss Workspace Walkthrough"));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
