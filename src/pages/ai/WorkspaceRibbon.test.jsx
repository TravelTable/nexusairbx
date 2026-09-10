import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import WorkspaceRibbon from "./WorkspaceRibbon";

jest.mock("../../components/universal/WorkspaceRibbon", () => ({ left, right }) => (
  <div>
    <div>{left}</div>
    <div>{right}</div>
  </div>
));

const baseProps = {
  mode: "agent",
  onModeChange: jest.fn(),
  projectTitle: "Test game",
  chatTitle: "New chat",
  studioControl: <span>Studio</span>,
};

describe("WorkspaceRibbon Animate visibility", () => {
  beforeEach(() => {
    baseProps.onModeChange.mockClear();
  });

  it("hides Animate by default", () => {
    render(<WorkspaceRibbon {...baseProps} />);

    expect(screen.queryByRole("button", { name: "Animate" })).not.toBeInTheDocument();
  });

  it("shows Animate when the developer setting is enabled", () => {
    render(<WorkspaceRibbon {...baseProps} animateEnabled />);

    fireEvent.click(screen.getByRole("button", { name: "Animate" }));
    expect(baseProps.onModeChange).toHaveBeenCalledWith("animate");
  });

  it("keeps the shared model control in the top ribbon for UI mode", () => {
    render(
      <WorkspaceRibbon
        {...baseProps}
        mode="ui"
        modelControl={<button type="button">Choose model</button>}
      />,
    );

    expect(screen.getByRole("button", { name: "Choose model" })).toBeInTheDocument();
  });

  it("switches page actions while retaining the same navigation and Studio control", () => {
    const { rerender } = render(<WorkspaceRibbon {...baseProps} modelControl={<button>Choose model</button>} onOpenEvidence={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Code / Files' })).toBeInTheDocument();
    rerender(<WorkspaceRibbon {...baseProps} mode="asset" assetControls={<input aria-label="Search assets" />} />);
    expect(screen.getByRole('button', { name: 'Assets' })).toHaveAttribute('aria-pressed','true');
    expect(screen.getByLabelText('Search assets')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Choose model' })).not.toBeInTheDocument();
    expect(screen.getByText('Studio')).toBeInTheDocument();
  });

  it("closes secondary controls with Escape and restores focus", () => {
    render(<WorkspaceRibbon {...baseProps} />);
    const more = screen.getByRole('button', { name: 'Page actions' });
    fireEvent.click(more);
    expect(more).toHaveAttribute('aria-expanded','true');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(more).toHaveAttribute('aria-expanded','false');
    expect(more).toHaveFocus();
  });
});
