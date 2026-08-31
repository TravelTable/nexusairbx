import React from "react";
import { render, screen } from "@testing-library/react";
import BuildReportSummary from "./BuildReportSummary";

test("summarizes delivery, run, quality, and issue evidence", () => {
  render(
    <BuildReportSummary
      artifact={{
        title: "Round manager",
        summary: "Coordinates the game loop and player resets.",
        files: [
          { id: "1", kind: "server", placement: "ServerScriptService" },
          { id: "2", kind: "module", placement: "ReplicatedStorage" },
          { id: "3", kind: "module", placement: "ReplicatedStorage" },
        ],
        warnings: ["Confirm the round duration."],
        securityNotes: [],
        qaReport: { score: 92, issues: [] },
      }}
      agentRun={{
        status: "succeeded",
        steps: [
          { id: "a", status: "succeeded" },
          { id: "b", status: "succeeded" },
        ],
      }}
    />
  );

  expect(screen.getByRole("heading", { name: "Round manager" })).toBeTruthy();
  expect(screen.getByLabelText("Build status: Ready")).toBeTruthy();
  expect(screen.getByLabelText("3 files")).toBeTruthy();
  expect(screen.getByLabelText("2 Studio services")).toBeTruthy();
  expect(screen.getByLabelText("2 of 2 run steps complete")).toBeTruthy();
  expect(screen.getByLabelText("Quality score 92")).toBeTruthy();
  expect(screen.getByText("1 issue")).toBeTruthy();
});
