import {
  UI_MOCK_IMAGE_DATA_URL,
  buildUiAgentFlowMessage,
  getUiChatImages,
  getUiGenerationCards,
  mergeUiChatImages,
  publishStateFromUpload,
  uiAgentFlowStatus,
} from "./uiAgentFlowMessage";

test("uses observed backend activity without inventing skipped tools or images", () => {
  const task = { taskId: 'real-task', status: 'running', uiBuild: { activity: [
    { id: 'read', action: 'inspecting_reference', startedAt: 10, finishedAt: 20 },
    { id: 'plan', action: 'planning_design', startedAt: 20 },
  ] } };
  const message = buildUiAgentFlowMessage({ task });
  expect(message.parts).toHaveLength(2);
  expect(message.parts[0].title).toBe('Inspecting reference');
  expect(message.parts[1].state).toBe('input-available');
  expect(message.parts.some(p => p.type === 'tool-generate_image')).toBe(false);
  expect(uiAgentFlowStatus({ task })).toBe('streaming');
  expect(uiAgentFlowStatus({ task: { ...task, status: 'cancelled' } })).toBe('interrupted');
});

test("stops Working after a generated UI even when the task is still verifying", () => {
  const activity = [
    { id: 'write', action: 'writing_ui', startedAt: 10, finishedAt: 20 },
    { id: 'limit', action: 'renderer_limited', startedAt: 20, finishedAt: 20 },
  ];
  for (const status of ['running', 'verifying']) {
    const task = { taskId: 'real-task', status, uiBuild: { stage: 'renderer_limited', outcome: 'renderer_limited', activity } };
    expect(uiAgentFlowStatus({ task })).toBe('idle');
    expect(buildUiAgentFlowMessage({ task }).streaming).toBe(false);
    expect(buildUiAgentFlowMessage({ task }).parts.every((part) => part.state !== 'input-available' && part.state !== 'streaming')).toBe(true);
  }
});

test("closes the last observed activity item when the UI build has already ended", () => {
  const task = {
    taskId: 'real-task',
    status: 'verifying',
    uiBuild: {
      stage: 'renderer_limited',
      activity: [
        { id: 'write', action: 'writing_ui', startedAt: 10, finishedAt: 20 },
        { id: 'limit', action: 'renderer_limited', startedAt: 20 },
      ],
    },
  };
  const message = buildUiAgentFlowMessage({ task });
  expect(message.streaming).toBe(false);
  expect(message.parts.at(-1)).toMatchObject({ title: 'Preview limitations', state: 'output-available' });
  expect(uiAgentFlowStatus({ task })).toBe('idle');
});

test("stops thinking when a build fails or is cancelled mid-stage", () => {
  const uiBuild = { stage: "generating", action: "understanding_request" };
  expect(uiAgentFlowStatus({ task: { status: "failed", uiBuild } })).toBe("error");
  expect(uiAgentFlowStatus({ task: { status: "cancelled", uiBuild } })).toBe("interrupted");
});

test("keeps generated artwork in the chat feed after the artwork turn", () => {
  expect(getUiChatImages({
    task: { status: "running", uiBuild: { stage: "generating", action: "writing_ui" } },
  }).map((image) => image.action)).toEqual(["generating_artwork"]);
  expect(getUiChatImages({
    task: { status: "succeeded", uiBuild: { stage: "complete", outcome: "visual_review_passed" } },
  }).length).toBeGreaterThan(0);
  expect(mergeUiChatImages(
    [{ id: "ui-image-generating_artwork", publish: { status: "ready", robloxAssetId: "11" } }],
    [{ id: "ui-image-generating_artwork", state: "completed", src: "data:image/png;base64,aaa" }],
  )[0].publish).toEqual({ status: "ready", robloxAssetId: "11" });
  expect(publishStateFromUpload({
    ok: true,
    payload: { results: [{ status: "succeeded", assetId: "9001", contentUri: "rbxassetid://9001" }] },
  })).toEqual({ status: "ready", robloxAssetId: "9001", contentUri: "rbxassetid://9001" });
});

test("exposes image-generation cards only during the artwork turn, not code or final preview", () => {
  expect(getUiGenerationCards({
    task: { status: "running", uiBuild: { stage: "generating", action: "writing_ui" } },
  })).toEqual([]);
  expect(getUiGenerationCards({
    task: { status: "running", uiBuild: { stage: "rendering", action: "rendering_desktop" } },
  })).toEqual([]);

  const artwork = getUiGenerationCards({
    task: { status: "running", uiBuild: { stage: "generating", action: "generating_artwork" } },
  });
  expect(artwork.map((card) => [card.action, card.state])).toEqual([
    ["generating_artwork", "generating"],
  ]);
  expect(artwork[0].src).toBeTruthy();
});

test("builds AgentFlow UIMessage parts with reasoning, tools, and images from the shared pipeline", () => {
  const message = buildUiAgentFlowMessage({
    busy: "",
    task: {
      taskId: "task-1",
      status: "running",
      uiBuild: { stage: "generating", action: "generating_artwork" },
    },
  });

  expect(message.role).toBe("assistant");
  expect(message.parts.some((part) => part.type === "reasoning")).toBe(true);
  expect(message.parts.some((part) => part.type === "tool-plan_ui")).toBe(true);
  const imageTool = message.parts.find((part) => part.type === "tool-generate_image");
  expect(imageTool).toMatchObject({
    state: "output-available",
    preliminary: true,
  });
  expect(imageTool.output.images[0].url).toBe(UI_MOCK_IMAGE_DATA_URL);
  expect(uiAgentFlowStatus({
    task: { status: "running", uiBuild: { stage: "generating", action: "generating_artwork" } },
  })).toBe("streaming");
});

test("marks the finished UI run idle with a placeholder text part", () => {
  const message = buildUiAgentFlowMessage({
    task: {
      taskId: "task-1",
      status: "succeeded",
      uiBuild: { stage: "complete", outcome: "visual_review_passed" },
    },
  });
  expect(message.parts.at(-1)).toMatchObject({ type: "text", text: "Placeholder" });
  expect(uiAgentFlowStatus({
    task: { status: "succeeded", uiBuild: { stage: "complete", outcome: "visual_review_passed" } },
  })).toBe("idle");
});
