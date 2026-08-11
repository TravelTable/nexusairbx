import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import CodeWorkspace from "./CodeWorkspace";

jest.mock("@monaco-editor/react", () => ({
  __esModule: true,
  default: ({ theme }) => <div data-testid="monaco-editor" data-theme={theme} />,
  DiffEditor: ({ theme }) => <div data-testid="monaco-diff-editor" data-theme={theme} />,
}));

jest.mock("./CodeEditorTabs", () => () => null);
jest.mock("./ArtifactInspector", () => () => null);
jest.mock("./ExportActions", () => () => null);

const artifact = {
  id: "artifact-1",
  title: "Theme test",
  summary: "",
  dirtyCount: 0,
  files: [],
};

const activeFile = {
  id: "file-1",
  language: "luau",
  content: "print('hello')",
};

afterEach(() => {
  delete document.documentElement.dataset.theme;
});

test("updates Monaco when the resolved document theme changes", async () => {
  document.documentElement.dataset.theme = "dark";
  render(<CodeWorkspace artifact={artifact} activeFile={activeFile} />);

  expect(screen.getByTestId("monaco-editor").getAttribute("data-theme")).toBe("nexus-dark");

  act(() => {
    document.documentElement.dataset.theme = "light";
  });

  await waitFor(() => {
    expect(screen.getByTestId("monaco-editor").getAttribute("data-theme")).toBe("nexus-light");
  });
});
