import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import CompactAgentRunBar, { getCompactRunMeta, getVisibleRunAgents } from "./CompactAgentRunBar";
const scope = { taskId: "t", runId: "r", chatId: "c", projectId: "p" };
test.each(["idle", "ready", ""])("hides %s runs and unallocated agents", status => {
  const { container } = render(<CompactAgentRunBar agentRun={{ ...scope, status }} agents={[{ id: "a", status: "running" }]} />);
  expect(container).toBeEmptyDOMElement();
});
test("does not manufacture an active build from an agent", () => {
  expect(getCompactRunMeta({ agentId: "a", status: "running" })).toBeNull();
  expect(getVisibleRunAgents({ ...scope, status: "running", agents: [{ id: "a" }] })).toEqual([]);
});
test("shows one scoped truthful line and opens actions through View", () => {
  const onOpenActivity = jest.fn();
  const { container, rerender } = render(<CompactAgentRunBar agentRun={{ ...scope, status: "timed_out" }} chatId="c" projectId="p" onOpenActivity={onOpenActivity} />);
  expect(screen.getByRole("status")).toHaveTextContent("Build timed out");
  expect(container.querySelector("details")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Open build activity" }));
  expect(onOpenActivity).toHaveBeenCalledTimes(1);
  rerender(<CompactAgentRunBar agentRun={{ ...scope, status: "running" }} chatId="other" projectId="p" />);
  expect(container).toBeEmptyDOMElement();
});
test("completion requires server verification", () => {
  expect(getCompactRunMeta({ ...scope, status: "applied" }).label).toBe("Applied · verification pending");
  expect(getCompactRunMeta({ ...scope, status: "succeeded" }).label).toContain("unconfirmed");
  expect(getCompactRunMeta({ ...scope, status: "succeeded", completion: { canComplete: true } }).label).toBe("Build complete");
  expect(getCompactRunMeta({ ...scope, status: "running", connectionState: "reconnecting" }).label).toBe("Reconnecting to the build");
});
test("reports real specialist assignments only", () => {
  expect(getVisibleRunAgents({ ...scope, status: "running", teamActivity: { executionMode: "team", assignments: [
    { stepId: "ui", role: "ui", title: "HUD", status: "running" },
  ] } })).toEqual([{ id: "ui", name: "ui", detail: "HUD", status: "running" }]);
});
