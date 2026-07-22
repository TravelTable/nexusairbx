import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { ClarifyCard, PlanCard } from "./FlowCards";

describe("interactive planning cards", () => {
  test("requires every required clarification while allowing optional answers to remain blank", () => {
    const onSubmit = jest.fn();
    const message = {
      id: "clarify-1",
      stage: "clarify",
      questions: [
        { id: "placement", question: "Replace the inventory UI?", options: ["Replace it", "Keep both"] },
        { id: "saving", question: "Save data between sessions?" },
        { id: "notes", question: "Any extra constraints?", required: false },
      ],
    };

    render(<ClarifyCard message={message} onSubmit={onSubmit} />);
    const continueButton = screen.getByRole("button", { name: "Continue" });

    expect(continueButton.disabled).toBe(true);
    expect(screen.getByText("Answer every required question to continue.")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Keep both" }));
    expect(continueButton.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText("Custom answer for Save data between sessions?"), {
      target: { value: "Yes" },
    });
    expect(continueButton.disabled).toBe(false);

    fireEvent.click(continueButton);
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
      questions: [{
        id: "scope",
        question: "Which changes should be included?",
        type: "multi_select",
        allowCustom: false,
        options: [
          { id: "keep_ui", label: "Keep the current UI", recommended: true },
          { id: "save_data", label: "Save player data" },
        ],
      }],
    };

    render(<ClarifyCard message={message} onSubmit={onSubmit} />);

    const keepUi = screen.getByRole("button", { name: /Keep the current UI/ });
    const saveData = screen.getByRole("button", { name: "Save player data" });
    expect(keepUi.getAttribute("aria-pressed")).toBe("true");
    expect(saveData.getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByText("Recommended")).toBeTruthy();
    expect(screen.queryByLabelText("Custom answer for Which changes should be included?")).toBeNull();

    fireEvent.click(saveData);
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(onSubmit).toHaveBeenCalledWith(message, {
      scope: ["keep_ui", "save_data"],
    });
  });

  test("opens the editable workspace instead of presenting legacy execution copy", () => {
    const onEdit = jest.fn();
    const message = {
      id: "plan-1",
      stage: "plan",
      aiSummary: "Add an inventory without replacing the HUD.",
      aiSteps: ["Inspect the current UI"],
    };

    render(<PlanCard message={message} onEdit={onEdit} />);

    expect(screen.queryByRole("button", { name: "Approve & Build" })).toBeNull();
    expect(screen.getByText("Review, edit, and check this plan before starting execution.")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Review & edit plan" }));
    expect(onEdit).toHaveBeenCalledWith(message);
  });
});
