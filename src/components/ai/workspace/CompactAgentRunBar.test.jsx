import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import CompactAgentRunBar, { getCompactRunMeta } from "./CompactAgentRunBar";

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
});
