import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { ClarifyCard, PlanCard } from "./FlowCards";

describe("interactive planning cards", () => {
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
    expect(screen.queryByRole("button", { name: "Approve & Build" })).toBeNull();
    expect(screen.getByText(/Reply with/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Discuss changes" }));
    expect(onEdit).toHaveBeenCalledWith(message);
  });
});
