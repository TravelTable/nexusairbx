import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { approveAgentStep } from "../../../lib/workflowApi";
import StudioTaskApprovalCard from "./StudioTaskApprovalCard";

jest.mock("../../../lib/workflowApi", () => ({ approveAgentStep: jest.fn() }));

const approval = {
  runId: "studio_run_1", stepId: "step_1", allowedActions: ["approve_step"],
  step: { id: "step_1", type: "write_script", label: "Write flight controller", status: "awaiting_approval",
    affectedPaths: ["StarterPlayer/StarterPlayerScripts/FlightFlowTest/FlightClient"] },
};

beforeEach(() => jest.clearAllMocks());

test("shows the exact pending change and uses existing command approval once", async () => {
  let finish;
  approveAgentStep.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const refresh = jest.fn();
  render(<StudioTaskApprovalCard approval={approval} onApproved={refresh} />);
  expect(screen.getByText(approval.step.affectedPaths[0])).toBeTruthy();
  expect(screen.getByText(/cancel task below/i)).toBeTruthy();
  await userEvent.click(screen.getByRole("button", { name: /approve step/i }));
  await userEvent.click(screen.getByRole("button", { name: /approve step/i }));
  expect(approveAgentStep).toHaveBeenCalledTimes(1);
  expect(approveAgentStep).toHaveBeenCalledWith("studio_run_1", "step_1");
  finish({ step: { ...approval.step, status: "queued" } });
  await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
  expect(screen.queryByRole("button", { name: /approve step/i })).toBeNull();
});

test("a rejected approval is visible and allows the same fenced step to be retried", async () => {
  approveAgentStep.mockRejectedValue(new Error("Studio disconnected before approval"));
  render(<StudioTaskApprovalCard approval={approval} />);
  await userEvent.click(screen.getByRole("button", { name: /approve step/i }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Studio disconnected before approval");
  expect(screen.getByRole("button", { name: /approve step/i })).not.toBeDisabled();
});

test("no control appears for mismatched or unauthorized approval metadata", () => {
  const { rerender } = render(<StudioTaskApprovalCard approval={{ ...approval, allowedActions: [] }} />);
  expect(screen.queryByRole("button")).toBeNull();
  rerender(<StudioTaskApprovalCard approval={{ ...approval, stepId: "different_step" }} />);
  expect(screen.queryByRole("button")).toBeNull();
});
