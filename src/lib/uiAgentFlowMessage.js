import {
  UI_ACTION_LABELS,
  UI_BUILD_LABELS,
  UI_BUILD_TERMINAL_STAGES,
  UI_LOADING_PIPELINE,
  getUiLoadingChainSteps,
} from "./runPresentation";

const TASK_ENDED = new Set(["failed", "cancelled", "succeeded", "completed", "timed_out"]);

function uiBuildEnded(task) {
  return UI_BUILD_TERMINAL_STAGES.has(task?.uiBuild?.stage);
}

/** 1×1 PNG used only for local mock image previews in AgentFlow. */
export const UI_MOCK_IMAGE_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

export const UI_AGENT_FLOW_OPTIONS = {
  expandReasoning: false,
  tools: {
    ui_activity: { kind: "activity" },
    plan_ui: { kind: "tool", label: "Plan UI" },
    generate_image: {
      kind: "image",
      label: "Generate artwork",
      assets: (tool) => {
        const images = tool?.output?.images;
        return Array.isArray(images) ? images : [];
      },
    },
    write_ui: { kind: "file", label: "Write UI" },
    build_rbxm: { kind: "tool", label: "Build RBXM" },
    render_preview: { kind: "image", label: "Render preview" },
    review_ui: { kind: "tool", label: "Review design" },
  },
};

const REFERENCE_LABELS = { inspecting_reference: "Inspecting reference", reference_spec_ready: "Extracted visual spec", searching_ui_library: "Searching UI library", reading_ui_library: "Reading UI library reference", ui_library_ready: "Library references ready", rendering_reference: "Rendering reference size", awaiting_renders: "Waiting for renders" };

function activityMessage(task, busy) {
  const active = !TASK_ENDED.has(task.status) && !uiBuildEnded(task);
  const parts = task.uiBuild.activity.map(item => {
    const finished = Boolean(item.finishedAt) || uiBuildEnded(task);
    const failed = ['failed', 'timed_out'].includes(item.action);
    const errorText = [item.message, task.uiBuild.message, task.error]
      .find(value => typeof value === 'string' && value.trim());
    return item.action === 'understanding_request' ? { type: 'reasoning', text: '', state: finished ? 'done' : 'streaming' } : ({
      type: 'tool-ui_activity', toolCallId: item.id,
      title: REFERENCE_LABELS[item.action] || UI_ACTION_LABELS[item.action] || UI_BUILD_LABELS[item.action] || item.action.replaceAll('_', ' '),
      state: failed ? 'output-error' : !finished && (active || task.status === 'cancelled') ? 'input-available' : !finished ? 'output-error' : 'output-available',
      ...(failed && errorText ? { errorText } : {}),
      ...(finished ? { output: { completed: true } } : {}),
    });
  });
  return { id: task.taskId || task.uiBuild.jobId, role: 'assistant', parts, streaming: active || Boolean(busy) };
}

function labelForStep(step) {
  return step.busy
    || UI_ACTION_LABELS[step.action]
    || UI_BUILD_LABELS[step.stage]
    || step.stage
    || "Working";
}

/**
 * Build an AI SDK–shaped assistant UIMessage from the shared UI loading pipeline
 * so AgentFlow can show reasoning, tools, and images without a parallel UI path.
 */
export function buildUiAgentFlowMessage({ busy = "", task = null, pipeline = UI_LOADING_PIPELINE } = {}) {
  if (task?.uiBuild?.activity?.length && !busy) return activityMessage(task, busy);
  const steps = getUiLoadingChainSteps({ busy, task, pipeline });
  const parts = [];
  let activeSeen = false;

  pipeline.forEach((step, index) => {
    const status = steps[index]?.status || "pending";
    if (status === "pending") return;
    const active = status === "active";
    if (active) activeSeen = true;
    const label = labelForStep(step);

    if (step.busy) {
      parts.push({
        type: "tool-start_build",
        toolCallId: `ui-busy-${index}`,
        state: active ? "input-available" : "output-available",
        input: { label },
        output: active ? undefined : { ok: true },
        title: label,
      });
      return;
    }

    if (step.reasoning) {
      parts.push({
        type: "reasoning",
        text: typeof step.reasoning === 'string' ? step.reasoning : '',
        state: active ? "streaming" : "done",
      });
    }

    if (step.tool) {
      const toolCallId = `ui-tool-${step.tool}-${index}`;
      const part = {
        type: `tool-${step.tool}`,
        toolCallId,
        state: active ? "input-available" : "output-available",
        input: step.toolInput || { label },
        title: label,
      };
      if (!active) {
        const images = step.withImage ? flowArtworkImages(task) : [];
        part.output = step.withImage && images.length ? { images } : { ok: true, label };
      } else if (step.withImage) {
        part.state = "output-available";
        part.preliminary = true;
        part.output = { images: flowArtworkImages(task) };
      }
      parts.push(part);
    } else if (!step.reasoning && !step.terminal) {
      parts.push({
        type: "tool-ui_step",
        toolCallId: `ui-step-${index}`,
        state: active ? "input-available" : "output-available",
        input: { label },
        output: active ? undefined : { ok: true },
        title: label,
      });
    }

    if (step.withImage && !step.tool && status === "complete") {
      const preview = flowArtworkImages(task)[0];
      if (preview) {
        parts.push({
          type: "file",
          url: preview.url,
          mediaType: preview.mediaType,
          filename: `preview-${index}.png`,
        });
      }
    }

    if (step.terminal && status === "complete") {
      parts.push({ type: "text", text: "Placeholder" });
    }
  });

  return {
    id: task?.taskId || "ui-agent-flow",
    role: "assistant",
    parts,
    streaming: activeSeen || Boolean(busy),
  };
}

export function uiAgentFlowStatus({ busy = "", task = null } = {}) {
  if (!busy && task?.status === "cancelled") return "interrupted";
  if (!busy && ["failed", "timed_out"].includes(task?.status)) return "error";
  if (!busy && uiBuildEnded(task)) return "idle";
  if (task?.uiBuild?.activity?.length && !busy) return ['succeeded', 'completed'].includes(task.status) ? 'idle' : 'streaming';
  const steps = getUiLoadingChainSteps({ busy, task });
  if (steps.some((step) => step.status === "active") || busy) return "streaming";
  return "idle";
}

const ARTWORK_ACTIONS = new Set([
  "generating_artwork",
  "extracting_artwork",
  "improving_design",
]);

function extraBuildImages(task, existingIds) {
  return (Array.isArray(task?.uiBuild?.images) ? task.uiBuild.images : []).flatMap((image, index) => {
    const id = image?.id || `ui-build-image-${index}`;
    const src = typeof image?.url === "string" ? image.url : "";
    const assetId = typeof image?.assetId === "string" ? image.assetId : "";
    if ((!src && !assetId) || existingIds.has(id)) return [];
    const label = image.alt || image.label || image.action || "Generated artwork";
    return [{
      id,
      action: image.action || image.stage || "",
      label,
      state: image.state === "generating" ? "generating" : "completed",
      src,
      assetId,
      alt: image.alt || label,
    }];
  });
}

function flowArtworkImages(task) {
  return extraBuildImages(task, new Set()).flatMap((image, index) => {
    if (!image.src) return [];
    const jpeg = image.src.startsWith("data:image/jpeg");
    return [{
      id: image.id || `ui-art-${index}`,
      url: image.src,
      mediaType: jpeg ? "image/jpeg" : "image/png",
      filename: jpeg ? "artwork.jpg" : "artwork.png",
      alt: image.alt || image.label,
    }];
  });
}

function isArtworkStep(step) {
  return ARTWORK_ACTIONS.has(step.action) || ARTWORK_ACTIONS.has(step.stage);
}

function pendingArtworkCard(step) {
  const label = labelForStep(step);
  return {
    id: `ui-image-${step.action || step.stage || "artwork"}`,
    action: step.action || step.stage || "",
    label,
    state: "generating",
    src: "",
    alt: label,
  };
}

/** Artwork/edit cards only while that phase is the current turn. Hidden once code or the real preview starts. */
export function getUiGenerationCards({ busy = "", task = null, pipeline = UI_LOADING_PIPELINE } = {}) {
  const steps = getUiLoadingChainSteps({ busy, task, pipeline });
  const current = pipeline.find((_, index) => steps[index]?.status === "active");
  if (!current || !isArtworkStep(current)) return [];
  const published = extraBuildImages(task, new Set());
  return published.length ? published : [pendingArtworkCard(current)];
}

/** Artwork that has started stays in the chat feed after the artwork turn and after the build finishes. */
export function getUiChatImages({ busy = "", task = null, pipeline = UI_LOADING_PIPELINE } = {}) {
  const published = extraBuildImages(task, new Set());
  if (published.length) return published;
  const steps = getUiLoadingChainSteps({ busy, task, pipeline });
  const current = pipeline.find((_, index) => steps[index]?.status === "active");
  if (current && isArtworkStep(current)) return [pendingArtworkCard(current)];
  return [];
}

export function mergeUiChatImages(previous = [], next = []) {
  const byId = new Map();
  previous.forEach((image) => {
    if (image?.id) byId.set(image.id, image);
  });
  next.forEach((image) => {
    if (!image?.id) return;
    const current = byId.get(image.id);
    byId.set(image.id, current ? { ...current, ...image, publish: current.publish } : image);
  });
  const values = [...byId.values()];
  if (values.some((image) => image.src || image.assetId)) {
    return values.filter((image) => image.src || image.assetId || image.publish);
  }
  return values;
}

export function publishStateFromUpload(result) {
  if (!result?.ok) {
    return {
      status: "failed",
      error: result?.error?.message || result?.error || "Publishing did not finish.",
    };
  }
  const item = (result.payload?.results || []).find((entry) => entry?.status === "succeeded")
    || (result.payload?.results || [])[0]
    || {};
  const attached = (result.payload?.attachedAssets || [])[0] || {};
  const assetId = String(item.assetId || attached.assetId || attached.robloxAssetId || "").trim();
  const moderation = String(item.moderationStatus || item.moderationState || item.status || "").toLowerCase();
  if (assetId && /moderat|processing|pending|submitted|uploading/.test(moderation)) {
    return { status: "under_moderation", robloxAssetId: assetId, contentUri: item.contentUri || `rbxassetid://${assetId}` };
  }
  if (assetId) {
    return { status: "ready", robloxAssetId: assetId, contentUri: item.contentUri || `rbxassetid://${assetId}` };
  }
  return { status: "under_moderation" };
}
