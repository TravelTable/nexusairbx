import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TaskProgressPanel from "./TaskProgressPanel";

function task(overrides = {}) {
  return {
    taskId: "task_1",
    status: "running",
    eventSequence: 7,
    currentStepId: "step_2",
    steps: [
      {
        stepId: "step_1",
        description: "Inspect the project manifest",
        status: "succeeded",
        operationId: "operation_1",
        attemptCount: 1,
        verification: { manifestVersion: "manifest_v2" },
      },
      {
        stepId: "step_2",
        description: "Create the lobby spawn",
        status: "running",
        operationId: "operation_2",
        attemptCount: 2,
        commandState: "acknowledged",
      },
      { stepId: "step_3", description: "Verify the spawn", status: "pending" },
    ],
    ...overrides,
  };
}

describe("TaskProgressPanel", () => {
  test("keeps a queued task visibly non-terminal while restoring progress", () => {
    render(
      <TaskProgressPanel
        task={task({ status: "queued", currentStepId: "", steps: [] })}
        connectionState="reconnecting"
      />
    );

    expect(screen.getByText(/safely queued/i)).toBeTruthy();
    expect(screen.getByText(/has not completed yet/i)).toBeTruthy();
    expect(screen.getByText(/progress is saved and reconnecting automatically/i)).toBeTruthy();
    expect(screen.queryByText(/task completed and verified/i)).toBeNull();
  });

  test("shows conversational Roblox waiting copy and sanitized typed errors", async () => {
    render(
      <TaskProgressPanel
        task={task({
          status: "waiting_external",
          statusReason: "moderation_pending",
          finalError: {
            code: "MODERATION_PENDING",
            message: "Error: secret token\n    at upload.js:10:2",
            requestId: "support_1",
            retryable: true,
          },
          manifestVersion: "manifest_v3",
        })}
        events={[
          { sequence: 8, payload: { safeMessage: "The asset upload was accepted by Roblox." } },
          { sequence: 9, payload: { safeMessage: "{\"raw\":\"do not show\"}" } },
        ]}
        connectionState="polling"
      />
    );

    expect(screen.getByText(/waiting for roblox moderation/i)).toBeTruthy();
    expect(screen.getByText(/asset upload was accepted by roblox/i)).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toMatch(/moderation is still pending/i);
    expect(screen.getByRole("alert").textContent).toMatch(/support_1/i);
    expect(screen.queryByText(/secret token/i)).toBeNull();
    expect(screen.queryByText(/do not show/i)).toBeNull();

    await userEvent.click(screen.getByText(/technical details/i));
    expect(screen.getByText("task_1")).toBeTruthy();
    expect(screen.getByText(/operation_1, operation_2/i)).toBeTruthy();
    expect(screen.getByText(/step_2: acknowledged/i)).toBeTruthy();
    expect(screen.getByText(/manifest_v3, manifest_v2|manifest_v2, manifest_v3/i)).toBeTruthy();
    expect(screen.getByText("MODERATION_PENDING")).toBeTruthy();
  });

  test("renders no mutation controls without explicit server authorization", () => {
    render(
      <TaskProgressPanel
        task={task({ status: "failed" })}
        onRetry={jest.fn()}
        onCancel={jest.fn()}
        onAmend={jest.fn()}
        onApprove={jest.fn()}
      />
    );

    expect(screen.queryByRole("button", { name: /retry step/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /cancel task/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /amend instructions/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /continue/i })).toBeNull();
  });

  test("exposes only authorized actions and submits an amendment", async () => {
    const onRetry = jest.fn();
    const onCancel = jest.fn();
    const onAmend = jest.fn();
    const onApprove = jest.fn();
    render(
      <TaskProgressPanel
        task={task({ allowedActions: ["retry", "cancel", "amend", "approve"] })}
        onRetry={onRetry}
        onCancel={onCancel}
        onAmend={onAmend}
        onApprove={onApprove}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: /retry step/i }));
    await userEvent.click(screen.getByRole("button", { name: /continue/i }));
    await userEvent.click(screen.getByRole("button", { name: /amend instructions/i }));
    await userEvent.type(screen.getByLabelText(/updated instruction/i), "Keep the existing spawn location.");
    await userEvent.click(screen.getByRole("button", { name: /save amendment/i }));

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onApprove).toHaveBeenCalledTimes(1);
    expect(onAmend).toHaveBeenCalledWith({ instruction: "Keep the existing spawn location." });
    expect(onCancel).not.toHaveBeenCalled();
  });

  test("shows a verified terminal summary and evidence count", () => {
    render(
      <TaskProgressPanel
        task={task({
          status: "succeeded",
          currentStepId: "",
          steps: task().steps.map((step) => ({ ...step, status: "succeeded" })),
          finalSummary: "The lobby spawn was created and verified in Studio.",
          finalEvidence: [{ type: "manifest" }, { type: "studio_ack" }],
        })}
        connectionState="settled"
      />
    );

    expect(screen.getByText(/task completed and verified/i)).toBeTruthy();
    expect(screen.getByText(/lobby spawn was created and verified in studio/i)).toBeTruthy();
    expect(screen.getByText("3 verification records")).toBeTruthy();
    expect(screen.queryByText(/live updates paused/i)).toBeNull();
  });

  test("maps the original plan to a live checklist and explains failed-step recovery", () => {
    render(
      <TaskProgressPanel
        task={task({
          status: "failed",
          currentStepId: "step_2",
          allowedActions: ["retry"],
          steps: [
            {
              stepId: "step_1",
              planStepId: "plan-inspect",
              planTitle: "Inspect the existing inventory UI",
              status: "succeeded",
            },
            {
              stepId: "step_2",
              planStepId: "plan-create",
              input: { planTitle: "Create the replacement inventory UI" },
              status: "failed",
              error: {
                safeMessage: "Studio rejected the write because the script changed.",
                retryable: true,
                recovery: { label: "Reconnect Studio, inspect the latest script, then retry." },
              },
            },
            {
              stepId: "step_3",
              planStepId: "plan-verify",
              description: "Verify the inventory interaction",
              status: "pending",
            },
          ],
        })}
        onRetry={jest.fn()}
      />
    );

    expect(screen.getByRole("list", { name: /plan checklist/i })).toBeTruthy();
    expect(screen.getByText("Inspect the existing inventory UI")).toBeTruthy();
    expect(screen.getByText("Completed")).toBeTruthy();
    expect(screen.getAllByText("Failed").length).toBeGreaterThan(0);
    expect(screen.getByText("Pending")).toBeTruthy();
    expect(screen.getByLabelText(/failed plan step/i).textContent).toMatch(/create the replacement inventory ui/i);
    expect(screen.getByLabelText(/failed plan step/i).textContent).toMatch(/1 of 3 plan steps/i);
    expect(screen.getByLabelText(/failed plan step/i).textContent).toMatch(/safe retry is available/i);
    expect(screen.getByLabelText(/failed plan step/i).textContent).toMatch(/reconnect studio/i);
  });

  test("distinguishes Studio waits and user-input waits in the checklist", () => {
    const { rerender } = render(
      <TaskProgressPanel
        task={task({
          status: "blocked_studio",
          currentStepId: "step_2",
          steps: [{ stepId: "step_2", description: "Update the selected place", status: "waiting" }],
        })}
      />
    );
    expect(screen.getByText("Waiting for Studio")).toBeTruthy();

    rerender(
      <TaskProgressPanel
        task={task({
          status: "waiting_user",
          currentStepId: "step_2",
          steps: [{ stepId: "step_2", description: "Choose the save behavior", status: "waiting" }],
        })}
      />
    );
    expect(screen.getByText("Needs user input")).toBeTruthy();
  });
});
