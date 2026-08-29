import { filterRunEvents, normalizeRunEvents } from "./RunEventLog";

test("normalizes real task events without sample data", () => {
  expect(normalizeRunEvents([{ id: "event-1", type: "step_completed", createdAt: "2026-08-29T01:00:00Z", payload: { userMessage: "Script verified", status: "passed", stepId: "step-1" } }], [])).toEqual([
    expect.objectContaining({ id: "event-1", label: "Step Completed", message: "Script verified", tone: "success", stepId: "step-1" }),
  ]);
});

test("deduplicates agent runs", () => {
  const run = { runId: "run-123", status: "running" };
  expect(normalizeRunEvents([], [{ title: "Builder", currentRun: run, runs: [run] }])).toHaveLength(1);
});

test("filters by query and attention tone", () => {
  const events = [
    { label: "Validation", message: "Passed", status: "Passed", tone: "success" },
    { label: "Studio", message: "Waiting for plugin", status: "Waiting", tone: "warning" },
  ];
  expect(filterRunEvents(events, "plugin", "warning")).toEqual([events[1]]);
});
