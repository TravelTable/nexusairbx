import React from "react";
import { render, screen } from "@testing-library/react";
import MarkdownMessage from "./MarkdownMessage";

describe("MarkdownMessage", () => {
  test("renders markdown body text", () => {
    render(<MarkdownMessage text={"# Title\n\nUse RemoteEvent for client calls."} />);
    expect(screen.getByTestId("markdown-body")).toBeTruthy();
    expect(screen.getByText(/# Title/)).toBeTruthy();
  });

  test("passes mermaid fenced content through markdown body", () => {
    render(
      <MarkdownMessage
        text={"```mermaid\nflowchart LR\n  A-->B\n```"}
      />
    );
    expect(screen.getByTestId("markdown-body")).toBeTruthy();
    expect(screen.getByText(/flowchart LR/)).toBeTruthy();
  });
});
