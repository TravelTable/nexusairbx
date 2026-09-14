import React from "react";
import { render, screen } from "@testing-library/react";
import UiLoadingChain from "./UiLoadingChain";

jest.mock("../../../components/ai-elements/chain-of-thought", () => ({
  ChainOfThought: ({ children, ...props }) => <div data-testid="ui-loading-chain" {...props}>{children}</div>,
  ChainOfThoughtHeader: ({ children }) => <div>{children}</div>,
  ChainOfThoughtContent: ({ children }) => <div>{children}</div>,
  ChainOfThoughtStep: ({ label, status }) => <div data-status={status}>{label}</div>,
}));

test("renders shared pipeline labels with active status for the current UI step", () => {
  render(
    <UiLoadingChain
      task={{ status: "running", uiBuild: { stage: "generating", action: "writing_ui" } }}
    />
  );
  expect(screen.getByText("Writing your UI")).toHaveAttribute("data-status", "active");
  expect(screen.getByText("Understanding your request")).toHaveAttribute("data-status", "complete");
  expect(screen.getByText("Rendering desktop")).toHaveAttribute("data-status", "pending");
});
