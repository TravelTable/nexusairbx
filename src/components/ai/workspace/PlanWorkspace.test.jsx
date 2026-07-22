import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { PlanWorkspaceView } from "./PlanWorkspace";

const createController = (overrides = {}) => ({
  plan: {
    planId: "plan-1",
    sections: { goal: "Add an inventory", implementationSteps: [], verificationSteps: [] },
    locks: {},
    targeting: { projectId: "project-1" },
    capabilities: [],
    requiresStudio: false,
  },
  loadState: "ready",
  loadError: null,
  saveStatus: "saved",
  saveError: null,
  readiness: {
    status: "unchecked",
    canExecute: false,
    blockers: [],
    warnings: [],
  },
  readinessLoading: false,
  versions: [],
  versionsLoading: false,
  versionsError: null,
  restoringVersion: null,
  restoreError: null,
  editingLocked: false,
  regeneratingSectionId: null,
  askState: { status: "idle", answer: "", proposedOperations: [], error: null },
  executionState: { status: "idle", result: null, error: null },
  replaceSection: jest.fn(),
  updateItem: jest.fn(),
  addItem: jest.fn(),
  removeItem: jest.fn(),
  reorderItem: jest.fn(),
  setSectionLocked: jest.fn(),
  regenerateSection: jest.fn(),
  checkReadiness: jest.fn().mockResolvedValue(null),
  loadVersions: jest.fn().mockResolvedValue([]),
  restoreVersion: jest.fn().mockResolvedValue(null),
  askQuestion: jest.fn().mockResolvedValue(null),
  applyProposedOperations: jest.fn().mockResolvedValue(null),
  execute: jest.fn().mockResolvedValue(null),
  retrySave: jest.fn().mockResolvedValue(null),
  ...overrides,
});

describe("PlanWorkspaceView", () => {
  it("does not present an unchecked plan as ready", () => {
    const controller = createController();

    render(<PlanWorkspaceView controller={controller} />);

    expect(screen.getByText("Check readiness before execution")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Check & Execute" }).disabled).toBe(false);
    expect(screen.queryByText("Plan is ready to execute")).toBeNull();
  });

  it("freezes plan controls while an exact plan version is being checked", () => {
    const controller = createController({ editingLocked: true });

    render(<PlanWorkspaceView controller={controller} />);

    expect(screen.getByRole("textbox", { name: "Goal" }).disabled).toBe(true);
    expect(screen.getByRole("button", { name: "Check & Execute" }).disabled).toBe(true);
    expect(screen.getByText(/Plan editing is briefly paused/)).not.toBeNull();
  });

  it("shows history and restore failures with a history retry action", () => {
    const loadVersions = jest.fn().mockResolvedValue([]);
    const controller = createController({
      loadVersions,
      versionsError: new Error("History connection failed"),
      restoreError: new Error("Restore failed; current plan kept"),
    });

    render(<PlanWorkspaceView controller={controller} />);
    fireEvent.click(screen.getByText("Version history"));

    expect(screen.getByText("History connection failed")).not.toBeNull();
    expect(screen.getByText("Restore failed; current plan kept")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Retry history" }));
    expect(loadVersions).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("No earlier versions yet.")).toBeNull();
  });
});
