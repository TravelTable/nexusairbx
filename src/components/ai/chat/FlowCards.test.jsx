import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { ClarifyCard, PlanCard } from "./FlowCards";

describe("interactive planning cards", () => {
  test("keeps the actual readiness blocker beside Start build", async () => {
    render(<PlanCard message={{ stage: "plan", aiSummary: "Flight" }} onApprove={async () => ({
      blocked: true, readiness: { blockers: [{ title: "Play test unavailable", message: "The plugin does not support this command." }] },
    })} />);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Start build" })));
    expect(screen.getByRole("alert").textContent).toContain("The plugin does not support this command.");
    expect(screen.getByRole("button", { name: "Start build" }).disabled).toBe(false);
  });
  test("keeps saved clarification answers and a visible retry error after failure", () => {
    render(<ClarifyCard message={{
      stage: "clarify", requestMode: "plan", answers: { controls: "keyboard" },
      clarificationError: "The planner timed out.",
      questions: [{ id: "controls", question: "Flight controls?", options: [{ id: "keyboard", label: "Keyboard" }] }],
    }} onSubmit={jest.fn()} />);
    expect(screen.getByRole("alert").textContent).toContain("The planner timed out");
    expect(screen.getByRole("button", { name: "Keyboard" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Create plan" }).disabled).toBe(false);
  });
  test("requires every required clarification while allowing optional answers to remain blank", () => {
    const onSubmit = jest.fn();
    const message = {
      id: "clarify-1",
      stage: "clarify",
      requestMode: "plan",
      questions: [
        {
          id: "placement",
          question: "Replace the inventory UI?",
          options: ["Replace it", "Keep both"],
        },
        { id: "saving", question: "Save data between sessions?" },
        { id: "notes", question: "Any extra constraints?", required: false },
      ],
    };

    render(<ClarifyCard message={message} onSubmit={onSubmit} />);
    const nextButton = screen.getByRole("button", { name: "Next" });

    expect(nextButton.disabled).toBe(true);
    expect(screen.getByText("Question 1 of 3")).toBeTruthy();
    expect(screen.queryByText("Save data between sessions?")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Keep both" }));
    expect(nextButton.disabled).toBe(false);
    fireEvent.click(nextButton);

    expect(screen.getByText("Question 2 of 3")).toBeTruthy();
    expect(screen.getByText("Save data between sessions?")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Custom answer for Save data between sessions?"), {
      target: { value: "Yes" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(screen.getByText("Question 3 of 3")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Create plan" }));
    expect(onSubmit).toHaveBeenCalledWith(message, {
      placement: "Keep both",
      saving: "Yes",
    });
  });

  test("supports multi-select defaults and recommendations without offering disallowed custom answers", () => {
    const onSubmit = jest.fn();
    const message = {
      id: "clarify-multi",
      stage: "clarify",
      requestMode: "plan",
      questions: [
        {
          id: "scope",
          question: "Which changes should be included?",
          type: "multi_select",
          allowCustom: false,
          options: [
            { id: "keep_ui", label: "Keep the current UI", recommended: true },
            { id: "save_data", label: "Save player data" },
          ],
        },
      ],
    };

    render(<ClarifyCard message={message} onSubmit={onSubmit} />);

    const keepUi = screen.getByRole("button", { name: /Keep the current UI/ });
    const saveData = screen.getByRole("button", { name: "Save player data" });
    expect(keepUi.getAttribute("aria-pressed")).toBe("false");
    expect(saveData.getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByText("Best fit")).toBeTruthy();
    expect(screen.queryByLabelText("Custom answer for Which changes should be included?")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Use recommended settings" }));

    expect(onSubmit).toHaveBeenCalledWith(message, {
      scope: ["keep_ui"],
    });
    expect(keepUi.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Create plan" }).disabled).toBe(false);
  });

  test("renders blocking questions outside Plan mode as a single inline chat prompt", () => {
    const message = {
      id: "clarify-agent",
      stage: "clarify",
      requestMode: "agent",
      questions: [
        { id: "target", question: "Which live Studio place should I change?" },
        { id: "scope", question: "Should I replace the existing script?" },
      ],
    };

    render(<ClarifyCard message={message} onSubmit={jest.fn()} />);

    expect(screen.getByText("Which live Studio place should I change?")).toBeTruthy();
    expect(screen.getByText("Reply in chat and I’ll continue from there.")).toBeTruthy();
    expect(screen.queryByText("Should I replace the existing script?")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  test("keeps plan editing inside the conversation", () => {
    const onEdit = jest.fn();
    const message = {
      id: "plan-1",
      stage: "plan",
      aiSummary: "Add an inventory without replacing the HUD.",
      aiSteps: ["Inspect the current UI"],
    };

    render(<PlanCard message={message} onEdit={onEdit} />);

    const plan = document.querySelector('[data-slot="plan"]');
    expect(plan.className).toContain("bg-transparent");
    expect(plan.className).not.toContain("var(--ds-plan)_8%");
    expect(screen.queryByRole("button", { name: "Start build" })).toBeNull();
    expect(screen.getByText(/Reply with/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Discuss changes" }));
    expect(onEdit).toHaveBeenCalledWith(message);
  });

  test("handles an expected async approval cancellation at the button boundary", async () => {
    const cancellation = Object.assign(new Error("approval replaced by a newer request"), {
      name: "AbortError",
    });
    const onApprove = jest.fn().mockRejectedValue(cancellation);
    const message = {
      id: "plan-approval",
      stage: "plan",
      aiSummary: "Build the approved Studio plan.",
      aiSteps: ["Apply the changes"],
    };

    render(<PlanCard message={message} onApprove={onApprove} />);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Start build" })); });

    expect(onApprove).toHaveBeenCalledWith(message);
  });
});


test("build button responds immediately and prevents duplicate requests while starting", async () => {
  let finish;
  const onApprove = jest.fn(() => new Promise(resolve => { finish = resolve; }));
  render(<PlanCard message={{ stage: "plan", aiSummary: "Flight combat" }} onApprove={onApprove} />);
  fireEvent.click(screen.getByRole("button", { name: "Start build" }));
  expect(screen.getByRole("button", { name: "Starting build…" }).disabled).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Starting build…" }));
  expect(onApprove).toHaveBeenCalledTimes(1);
  await act(async () => finish({ blocked: true }));
  expect(screen.getByRole("alert").textContent).toContain("readiness");
  expect(screen.getByRole("button", { name: "Start build" }).disabled).toBe(false);
});

test("approval alone never claims the task is still building", () => {
  const { rerender } = render(<PlanCard message={{ stage: "plan_approved", aiSummary: "Flight combat" }} />);
  expect(screen.queryByText("Approved — building…")).toBeNull();
  expect(screen.getByRole("status").textContent).toContain("Plan approved");
  rerender(<PlanCard message={{ stage: "plan_approved", executionStatus: "failed", aiSummary: "Flight combat" }} />);
  expect(screen.getByRole("status").textContent).toContain("Build stopped");
});

test.each(["failed", "cancelled"])("offers revision after a %s build without exposing duplicate execution", async status => {
  const message = { id: "stopped-plan", stage: "plan_approved", executionStatus: status, aiSummary: "Flight combat" };
  const onEdit = jest.fn().mockResolvedValue();
  const onApprove = jest.fn();
  render(<PlanCard message={message} onEdit={onEdit} onApprove={onApprove} />);
  expect(screen.queryByRole("button", { name: "Start build" })).toBeNull();
  expect(screen.getByText(/Creates a new draft to review/)).toBeTruthy();
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Revise plan" })); });
  expect(onEdit).toHaveBeenCalledWith(message);
  expect(onApprove).not.toHaveBeenCalled();
});

test("revision stays busy and displays a server conflict beside the stopped plan", async () => {
  let reject;
  const onEdit = jest.fn(() => new Promise((_resolve, rejectPromise) => { reject = rejectPromise; }));
  render(<PlanCard message={{ stage: "plan_approved", executionStatus: "failed" }} onEdit={onEdit} />);
  fireEvent.click(screen.getByRole("button", { name: "Revise plan" }));
  expect(screen.getByRole("button", { name: "Preparing revision…" }).disabled).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Preparing revision…" }));
  expect(onEdit).toHaveBeenCalledTimes(1);
  await act(async () => { reject(new Error("The plan changed. Refresh before continuing.")); });
  expect(screen.getByRole("alert").textContent).toContain("The plan changed");
  expect(screen.getByRole("button", { name: "Revise plan" }).disabled).toBe(false);
});

test.each(["running", "waiting_user", "blocked_studio", "succeeded"])("does not replace canonical actions for a %s task with revision", status => {
  render(<PlanCard message={{ stage: "plan_approved", executionStatus: status }} onEdit={jest.fn()} onApprove={jest.fn()} />);
  expect(screen.queryByRole("button", { name: "Revise plan" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Start build" })).toBeNull();
});
