import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import TeamActivityPanel from "./TeamActivityPanel";

test("renders real specialist progress and saved output without calling the game complete", () => {
  render(<TeamActivityPanel activity={{ executionMode: "team", status: "active", assignments: [
    { stepId: "game", role: "gameplay", title: "Build the core loop", status: "succeeded", artifactId: "artifact" },
    { stepId: "ui", role: "ui", title: "Build HUD", status: "running" },
  ] }} />);
  fireEvent.click(screen.getByText("Team activity"));
  expect(screen.getByText("1/2 prepared")).toBeInTheDocument();
  expect(screen.getByText("Output saved for integration")).toBeInTheDocument();
  expect(screen.getByText("Working")).toBeInTheDocument();
  expect(screen.queryByText(/game complete/i)).not.toBeInTheDocument();
});
test("does not show a team for single-agent or empty runs", () => {
  const { container } = render(<TeamActivityPanel activity={{ executionMode: "single", assignments: [] }} />);
  expect(container).toBeEmptyDOMElement();
});
test("shows a specialist blocker as actionable incomplete work", () => {
  render(<TeamActivityPanel activity={{ executionMode: "team", status: "blocked", assignments: [
    { stepId: "qa", role: "qa", title: "Test core loop", status: "failed", blockers: ["Connect Studio to run the playtest"] },
  ] }} />);
  expect(screen.getAllByText("Needs attention").length).toBeGreaterThan(0);
  expect(screen.getByText("Connect Studio to run the playtest")).toBeInTheDocument();
});
