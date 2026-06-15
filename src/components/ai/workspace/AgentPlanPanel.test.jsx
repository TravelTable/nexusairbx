import React from "react";
import { render, screen } from "@testing-library/react";
import AgentPlanPanel from "./AgentPlanPanel";

jest.mock("../../../lib/featureFlags", () => ({
  FEATURE_FLAGS: { unifiedAgent: true },
}));

describe("AgentPlanPanel", () => {
  test("renders blocked studio-agent state", () => {
    render(
      <AgentPlanPanel
        agentRun={{
          status: "blocked",
          stage: "blocked",
          steps: [],
          runId: "run_1",
          snapshotCount: 0,
        }}
      />
    );

    expect(screen.getByText(/hit a real blocker/i)).toBeTruthy();
  });
});
