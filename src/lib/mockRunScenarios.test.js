import {
  AGENT_PLACEHOLDER_CODE,
  UI_PLACEHOLDER_TEXT,
  buildAgentMockFrames,
  buildUiMockFrames,
  listMockScenarios,
} from "./mockRunScenarios";
import {
  AGENT_LOADING_PIPELINE,
  UI_LOADING_PIPELINE,
  getUiWorkspacePresentation,
  getWorkspacePresentation,
} from "./runPresentation";

test("lists agent and ui mock scenarios", () => {
  const ids = listMockScenarios().map((item) => item.id);
  expect(ids).toEqual(expect.arrayContaining(["ui-happy-path", "agent-happy-path"]));
});

test("ui mock frames are derived from UI_LOADING_PIPELINE so new steps appear automatically", () => {
  const frames = buildUiMockFrames({
    projectId: "project-1",
    chatId: "chat-1",
    designId: "design-1",
    sourceRevision: "rev-1",
  });
  expect(frames).toHaveLength(UI_LOADING_PIPELINE.length);
  expect(frames.map((frame) => ({
    busy: frame.busy || undefined,
    stage: frame.task?.uiBuild?.stage,
    action: frame.task?.uiBuild?.action || undefined,
  }))).toEqual(UI_LOADING_PIPELINE.map((step) => ({
    busy: step.busy || undefined,
    stage: step.stage,
    action: step.action || undefined,
  })));

  const mid = frames.find((frame) => frame.task?.uiBuild?.action === "writing_ui");
  expect(getUiWorkspacePresentation({
    task: mid.task,
    busy: mid.busy || "",
  }).label).toBe("Writing your UI");

  const last = frames[frames.length - 1];
  expect(last.placeholder).toBe(UI_PLACEHOLDER_TEXT);
  expect(getUiWorkspacePresentation({
    task: last.task,
    busy: last.busy || "",
  })).toMatchObject({ terminal: true, active: false });
});

test("agent mock frames are derived from AGENT_LOADING_PIPELINE so new steps appear automatically", () => {
  const frames = buildAgentMockFrames({
    projectId: "project-1",
    chatId: "chat-1",
  });
  expect(frames).toHaveLength(AGENT_LOADING_PIPELINE.length);
  expect(frames.map((frame) => frame.stage || null)).toEqual(
    AGENT_LOADING_PIPELINE.map((step) => step.stage || null)
  );

  const active = frames.find((frame) => frame.run?.status === "running");
  expect(getWorkspacePresentation({
    run: active.run,
    busy: Boolean(active.busy),
    stage: active.stage,
  }).active).toBe(true);

  const last = frames[frames.length - 1];
  expect(last.assistantContent).toContain(AGENT_PLACEHOLDER_CODE.trim().slice(0, 12));
  expect(getWorkspacePresentation({
    run: last.run,
    busy: Boolean(last.busy),
    stage: last.stage,
  }).terminal).toBe(true);
});
