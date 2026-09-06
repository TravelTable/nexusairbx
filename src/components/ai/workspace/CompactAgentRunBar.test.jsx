import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import CompactAgentRunBar, { getCompactRunMeta, getVisibleRunAgents } from "./CompactAgentRunBar";

describe("CompactAgentRunBar", () => {
  test("condenses a timed-out Studio run into a one-line status", () => {
    render(
      <CompactAgentRunBar
        agentRun={{
          status: "timed_out",
          steps: [
            { id: "step-1", label: "Build Studio project manifest", type: "get_project_manifest", status: "succeeded" },
          ],
        }}
      />,
    );

    expect(screen.getByText("Studio agent stopped · Runtime limit")).toBeInTheDocument();
    expect(screen.getByText("1 Studio step")).toBeInTheDocument();
    expect(screen.getByText("Show activity")).toBeInTheDocument();

    const disclosure = screen.getByText("Studio agent stopped · Runtime limit").closest("details");
    expect(disclosure).not.toHaveAttribute("open");
    fireEvent.click(disclosure.querySelector("summary"));
    expect(disclosure).toHaveAttribute("open");
    expect(screen.getByText("Build Studio project manifest")).toBeInTheDocument();
  });

  test("uses the current stage for an active run", () => {
    expect(getCompactRunMeta({ status: "generating", stage: "Reading project scripts…" })).toEqual({
      label: "Reading project scripts…",
      tone: "active",
      active: true,
    });
  });

  test("shows live agent projections with deterministic avatars", () => {
    render(
      <CompactAgentRunBar
        agentRun={{ status: "running", stage: "Building…", steps: [] }}
        agents={[{ agentId: "agent-1", title: "Gameplay agent", status: "running" }]}
      />,
    );

    expect(screen.getByText("1 agent")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Show activity"));
    expect(screen.getByText("Gameplay agent")).toBeInTheDocument();
    expect(screen.getByText("Working")).toBeInTheDocument();
    expect(screen.getAllByLabelText("Avatar for agent-1")).toHaveLength(2);
  });

  test("maps team assignments to the agents actually created for the run", () => {
    expect(getVisibleRunAgents({ teamActivity: { executionMode: "team", assignments: [
      { stepId: "ui-1", role: "ui", title: "Build the HUD", status: "queued" },
    ] } })).toEqual([{
      id: "ui-1", name: "Ui", detail: "Build the HUD", status: "queued",
    }]);
  });
});
