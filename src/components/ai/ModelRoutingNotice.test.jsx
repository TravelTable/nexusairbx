import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import ModelRoutingNotice from "./ModelRoutingNotice";

const routing = {
  modelId: "example/current", modelName: "Current Coding Model", autoMode: "balanced",
  estimatedCredits: { min: 12, max: 24 }, reasons: ["Multi-file implementation", "Cost-efficiency preference"],
};

test("shows the actual chosen model and a concise accessible factor disclosure", () => {
  render(<ModelRoutingNotice routing={routing} />);
  expect(screen.getByRole("status")).toHaveTextContent("Nexus Auto selected Current Coding Model · Balanced");
  expect(screen.getByText("Estimated usage: 12–24 credits.")).toBeInTheDocument();
  const summary = screen.getByText("Why this model?");
  fireEvent.click(summary);
  expect(summary.parentElement).toHaveAttribute("open");
  expect(screen.getByText("Multi-file implementation")).toBeVisible();
  expect(screen.getByText("Cost-efficiency preference")).toBeVisible();
});

test("pre-request preview is distinguished from the actual chosen model", () => {
  render(<ModelRoutingNotice routing={routing} preview />);
  expect(screen.getByRole("status")).toHaveTextContent("Nexus Auto would select Current Coding Model");
  expect(screen.getByRole("status")).toHaveTextContent("12–24 credits for the starting request");
});

test("missing model selections render no invented routing notice", () => {
  const { container } = render(<ModelRoutingNotice routing={{ reasons: ["Unknown"] }} />);
  expect(container).toBeEmptyDOMElement();
});
