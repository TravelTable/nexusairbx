import React from "react";
import { render, screen } from "@testing-library/react";
import UiLoadingChain from "./UiLoadingChain";

jest.mock("../../../components/ai/agent-flow/react/AgentFlow.jsx", () => ({
  AgentFlow: ({ message, status }) => (
    <div data-testid="agent-flow" data-status={status} data-parts={message.parts.length}>
      {message.parts.map((part, index) => (
        <div key={index}>{part.type === "reasoning" ? part.text : part.type}</div>
      ))}
    </div>
  ),
}));

test("renders AgentFlow from the shared UI pipeline instead of Chain of Thought", () => {
  render(
    <UiLoadingChain
      task={{ status: "running", uiBuild: { stage: "generating", action: "writing_ui" } }}
    />
  );
  expect(screen.getByTestId("agent-flow")).toHaveAttribute("data-status", "streaming");
  expect(screen.getByText("tool-write_ui")).toBeInTheDocument();
  expect(screen.queryByText(/Reading the request/)).not.toBeInTheDocument();
});

test("marks a finished limited preview idle instead of Working", () => {
  render(
    <UiLoadingChain
      task={{
        status: "verifying",
        uiBuild: {
          stage: "renderer_limited",
          outcome: "renderer_limited",
          activity: [
            { id: "write", action: "writing_ui", startedAt: 10, finishedAt: 20 },
            { id: "limit", action: "renderer_limited", startedAt: 20, finishedAt: 20 },
          ],
        },
      }}
    />
  );
  expect(screen.getByTestId("agent-flow")).toHaveAttribute("data-status", "idle");
});
