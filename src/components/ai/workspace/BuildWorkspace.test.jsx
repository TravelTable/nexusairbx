import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import BuildWorkspace from "./BuildWorkspace";
import { createBuildWorkspaceState, reduceBuildWorkspace } from "../../../lib/buildWorkspaceState";
jest.mock("@monaco-editor/react", () => ({
  __esModule: true,
  default: ({ value, path }) => <pre data-testid="source" data-path={path}>{value}</pre>,
}));
const file = { id: "f", kind: "file", artifactId: "a", revision: "v1", path: "ServerScriptService/Main.lua", status: "Draft" };
test("reads exact revisions preserving source bytes and shows actual stored statuses", async () => {
 const source = 'local x = {}\nreturn "🎮"';
 const readFile = jest.fn().mockResolvedValue({ source, revision: "v1" });
 render(<BuildWorkspace scopeKey="one" items={[file]} readFile={readFile} />);
 await waitFor(() => expect(screen.getByTestId("source").textContent).toBe(source));
 expect(readFile).toHaveBeenCalledWith({ artifactId: "a", revision: "v1", path: file.path }, expect.objectContaining({ signal: expect.anything() }));
 expect(screen.getByText(/Draft · showing revision v1/)).toBeInTheDocument();
 fireEvent.click(screen.getByRole("button", { name: /Tests/ }));
 expect(screen.getByText("Nothing recorded here yet.")).toBeInTheDocument();
});

test("monaco model path stays a legal URI when scopeKey is JSON.stringify(scope)", async () => {
 const scopeKey = JSON.stringify({ taskId: "t1", chatId: "c1", projectId: "p1", runId: "r1" });
 const readFile = jest.fn().mockResolvedValue({ source: "print(1)", revision: "v1" });
 render(<BuildWorkspace scopeKey={scopeKey} items={[file]} readFile={readFile} />);
 const editor = await screen.findByTestId("source");
 const path = editor.getAttribute("data-path");
 expect(path).toMatch(/^inmemory:\/\//);
 expect(path).not.toMatch(/^\{/);
 expect(decodeURIComponent(path.replace(/^inmemory:\/\/model\//, ""))).toContain(scopeKey);
 expect(decodeURIComponent(path.replace(/^inmemory:\/\/model\//, ""))).toContain(file.path);
});
test("a failed revision fetch keeps the last loaded source visible and reports the failure", async () => {
 const readFile = jest.fn().mockResolvedValueOnce({ source: "saved", revision: "v1" }).mockRejectedValueOnce(new Error("Fetch failed"));
 const { rerender } = render(<BuildWorkspace scopeKey="one" items={[file]} readFile={readFile} />);
 await screen.findByTestId("source");
 rerender(<BuildWorkspace scopeKey="one" items={[{ ...file, revision: "v2" }]} readFile={readFile} />);
 await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Fetch failed"));
 expect(screen.getByTestId("source")).toHaveTextContent("saved");
});
test("switching scope aborts reads and cannot leak previous source", async () => {
 let resolveOld;
 const readFile = jest.fn().mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; })).mockResolvedValue({ source: "other project", revision: "v1" });
 const { rerender } = render(<BuildWorkspace scopeKey="one" items={[file]} readFile={readFile} />);
 await waitFor(() => expect(readFile).toHaveBeenCalledTimes(1));
 rerender(<BuildWorkspace scopeKey="two" items={[file]} readFile={readFile} />);
 await waitFor(() => expect(screen.getByTestId("source")).toHaveTextContent("other project"));
 await act(async () => resolveOld({ source: "private old project", revision: "v1" }));
 expect(screen.getByTestId("source")).not.toHaveTextContent("private old project");
 expect(readFile.mock.calls[0][1].signal.aborted).toBe(true);
});
test("View activity retains actionable controls and API errors are not empty states", () => {
 render(<BuildWorkspace scopeKey="one" initialView="activity" error="Unauthorized output" activity={<button>Retry failed step</button>} />);
 expect(screen.getByRole("button", { name: "Retry failed step" })).toBeInTheDocument();
 expect(screen.getByRole("alert")).toHaveTextContent("Unauthorized output");
 expect(screen.queryByText(/No files have been saved/)).not.toBeInTheDocument();
});

test("saved revision history loads the selected exact artifact version", async () => {
 const readFile = jest.fn(reference => Promise.resolve({ source: `source ${reference.revision}`, revision: reference.revision }));
 render(<BuildWorkspace scopeKey="one" items={[{ ...file, revision: "v2", revisions: ["v2", "v1"] }]} readFile={readFile} />);
 await waitFor(() => expect(screen.getByTestId("source")).toHaveTextContent("source v2"));
 fireEvent.change(screen.getByRole("combobox", { name: "Saved file revision" }), { target: { value: "v1" } });
 await waitFor(() => expect(screen.getByTestId("source")).toHaveTextContent("source v1"));
 expect(readFile).toHaveBeenLastCalledWith({ artifactId: "a", revision: "v1", path: file.path }, expect.any(Object));
 expect(screen.getByRole("combobox", { name: "Generated file path" }).querySelector("optgroup").label).toBe("ServerScriptService");
});

test("stored test statuses distinguish unavailable checks from failures and unrun checks", () => {
 render(<BuildWorkspace scopeKey="one" initialView="test" items={["passed", "failed", "running", "unavailable", "not_run"].map(status => ({
   id: status, kind: "test", revision: "r", name: `${status} check`, status,
 }))} />);
 for (const label of ["Passed", "Failed", "Running", "Unavailable", "Not yet run"]) expect(screen.getByText(label)).toBeInTheDocument();
});

test("canonical manual checks retain original requirements in Tests while generated source stays in Files", async () => {
 const scope = { chatId: "chat", projectId: "project", taskId: "task", runId: "run" };
 const reason = "The connected bridge does not supply requirement-specific gameplay or visual observations.";
 const requirements = ["Check the round timer and health display update during a wave.", "Confirm the map spawn, cover and enemy routes are usable."];
 const state = reduceBuildWorkspace(createBuildWorkspaceState(scope), {
   scope, sequence: 3, type: "snapshot", phase: "verification_pending", items: [file, {
     id: "test:ui:behavior", kind: "test", revision: "plan-hash", name: "ui · behavior", status: "unavailable",
     detail: reason, manualSteps: [...requirements, null, { source: "private source" }], source: "generated source must stay in Files",
   }],
 });
 expect(state.items["test:ui:behavior"].manualSteps).toEqual(requirements);
 expect(state.items["test:ui:behavior"].source).toBeUndefined();
 const readFile = jest.fn().mockResolvedValue({ source: "local GeneratedSource = {}", revision: "v1" });
 render(<BuildWorkspace scopeKey="manual-checks" initialView="test" items={Object.values(state.items)} readFile={readFile} />);
 expect(screen.getByText("Unavailable")).toBeInTheDocument();
 expect(screen.getByRole("heading", { name: "Manual verification required" })).toBeInTheDocument();
 expect(screen.getByText(reason)).toBeInTheDocument();
 for (const requirement of requirements) expect(screen.getByText(requirement)).toBeInTheDocument();
 expect(screen.getByText(/In Roblox Studio, start a playtest/)).toBeInTheDocument();
 expect(screen.queryByText("Passed")).not.toBeInTheDocument();
 expect(screen.queryByTestId("source")).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole("button", { name: /Files/ }));
 await waitFor(() => expect(screen.getByTestId("source")).toHaveTextContent("local GeneratedSource = {}"));
 expect(screen.queryByRole("heading", { name: "Manual verification required" })).not.toBeInTheDocument();
});

test("manual details are accepted only for test records and only from the active scope", () => {
 const scope = { chatId: "chat", projectId: "project", taskId: "task", runId: "run" };
 const initial = createBuildWorkspaceState(scope);
 const state = reduceBuildWorkspace(initial, { scope, sequence: 1, type: "snapshot", items: [{ ...file,
   detail: "unexpected", manualSteps: ["unexpected"], source: "private",
 }] });
 expect(state.items.f.detail).toBeUndefined();
 expect(state.items.f.manualSteps).toBeUndefined();
 expect(reduceBuildWorkspace(state, { scope: { ...scope, projectId: "other" }, sequence: 2, type: "snapshot", items: [] })).toBe(state);
});
