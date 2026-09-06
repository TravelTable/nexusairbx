import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import GameOverview from "./GameOverview";

const overview = { title: "Fishing game", requestedScope: { kind: "complete_game" }, monetization: { requested: false },
  deliverables: [{ id: "gameplay", title: "Gameplay", status: "implemented" },
    { id: "icon", title: "Experience icon", status: "draft_ready", assetIds: ["asset_icon"], outstandingAction: "Apply the approved artwork in Creator Hub." }] };

test("shows actual readiness, launch handoff and editable artifact links", () => {
  const onRefine = jest.fn();
  render(<MemoryRouter><GameOverview overview={overview} onRefine={onRefine} /></MemoryRouter>);
  expect(screen.getByText("0/2 verified")).toBeInTheDocument();
  expect(screen.getByText("Draft ready")).toBeInTheDocument();
  expect(screen.getByText(/Monetization is optional/)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "View asset 1" })).toHaveAttribute("href", "/assets/asset_icon");
  fireEvent.click(screen.getByRole("button", { name: "Refine experience icon" }));
  expect(onRefine).toHaveBeenCalledWith("Update experience icon for this game: ");
});
test("focused edits and legacy records do not open a full-game overview", () => {
  const { rerender, container } = render(<GameOverview />);
  expect(container).toBeEmptyDOMElement();
  rerender(<GameOverview overview={{ ...overview, requestedScope: { kind: "focused_change" } }} />);
  expect(container).toBeEmptyDOMElement();
});
