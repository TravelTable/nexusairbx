// src/hooks/useArtifactWorkspace.js
//
// The code-first workspace state. The primary output of a generation is a
// multi-file artifact (NOT a preview object). This hook derives the artifact
// list from completed assistant chat messages, tracks the active artifact/file,
// local edits (dirty state), and the current agent run status.

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { artifactFromMessage } from "../lib/normalizeArtifact";
import { countStepSnapshots } from "../lib/agentSteps";
import { buildBaseArtifactSnapshot, computeContentHash, computeArtifactRevision } from "../lib/artifactState";
import {
  materializeProjectFromArtifacts,
  mergeFilesIntoProject,
  normalizeProjectArtifact,
} from "../lib/chatProjectState";

const EMPTY_AGENT_RUN = {
  status: "idle", // idle | thinking | generating | done | error
  stage: "",
  plan: "",
  currentStep: null,
  steps: [],
  runId: null,
  snapshotCount: 0,
  unresolvedAssets: [],
  logs: [],
  errors: [],
  targetSelection: null,
  placeName: "",
};

function normalizeRunState(value) {
  const state = String(value || "").trim().toLowerCase();
  if (
    [
      "inspecting",
      "generating",
      "validating",
      "ready_to_apply",
      "assets_pending",
      "applying",
      "applied",
      "waiting_for_tool",
      "waiting_for_approval",
      "awaiting_studio_target",
      "succeeded",
      "conflict",
      "failed",
      "cancelled",
      "blocked",
      "iteration_limit",
      "timed_out",
      "push_skipped",
    ].includes(state)
  ) {
    return state;
  }
  return "";
}

function derivePendingRunState(stage = "", steps = []) {
  if ((steps || []).some((step) => step.type === "apply_artifact" && ["queued", "delivered", "running"].includes(step.status))) {
    return "applying";
  }
  const lower = String(stage || "").toLowerCase();
  if (/approval/.test(lower)) return "waiting_for_approval";
  if (/queued|waiting for tool/.test(lower)) return "waiting_for_tool";
  if (/inspect/.test(lower)) return "inspecting";
  if (/validat|review|merge|lint|smoke/.test(lower)) return "validating";
  if (/apply/.test(lower)) return "applying";
  return "generating";
}

// Reducer keeps per-file local edits keyed by `${artifactId}:${fileId}`.
function editsReducer(state, action) {
  switch (action.type) {
    case "edit": {
      const key = `${action.artifactId}:${action.fileId}`;
      return { ...state, [key]: action.content };
    }
    case "clearArtifact": {
      const next = {};
      for (const [k, v] of Object.entries(state)) {
        if (!k.startsWith(`${action.artifactId}:`)) next[k] = v;
      }
      return next;
    }
    case "reset":
      return {};
    default:
      return state;
  }
}

function applyLocalEdits(artifact, edits) {
  if (!artifact) return null;
  let dirtyCount = 0;
  const files = (artifact.files || []).map((file) => {
    const key = `${artifact.id}:${file.id}`;
    const edited = Object.prototype.hasOwnProperty.call(edits, key);
    const content = edited ? edits[key] : file.content;
    const dirty = edited && content !== file.content;
    if (dirty) dirtyCount += 1;
    return {
      ...file,
      content,
      contentHash: computeContentHash(content),
      dirty,
      status: dirty ? "edited" : file.status,
    };
  });
  return {
    ...artifact,
    files,
    dirtyCount,
    revision: computeArtifactRevision(files),
  };
}

export function useArtifactWorkspace(messages, { isGenerating, generationStage, pendingMessage, projectSnapshot } = {}) {
  const [activeArtifactId, setActiveArtifactId] = useState(null);
  const [activeFileId, setActiveFileId] = useState(null);
  const [edits, dispatchEdits] = useReducer(editsReducer, {});
  const lastAutoSelectedRef = useRef(null);

  const completedArtifacts = useMemo(() => {
    const list = [];
    for (const m of messages || []) {
      if (pendingMessage?.requestId && m.pending && m.requestId === pendingMessage.requestId) continue;
      const artifact = artifactFromMessage(m);
      if (artifact) list.push(artifact);
    }
    return list;
  }, [messages, pendingMessage?.requestId]);

  const pendingArtifact = useMemo(() => artifactFromMessage(pendingMessage), [pendingMessage]);

  // Build the artifact list from assistant messages (newest first), including
  // the current pending streamed artifact when file events have arrived.
  const baseArtifacts = useMemo(() => {
    const newestFirst = [...completedArtifacts].reverse();
    if (pendingArtifact) {
      newestFirst.unshift({
        ...pendingArtifact,
        id: pendingMessage.requestId || pendingArtifact.id,
        title: pendingArtifact.title || "Generating Artifact",
        summary: pendingMessage.stage || pendingArtifact.summary,
      });
    }
    return newestFirst;
  }, [completedArtifacts, pendingArtifact, pendingMessage]);

  const baseProjectArtifact = useMemo(() => {
    const persisted = projectSnapshot?.artifactId || projectSnapshot?.files?.length
      ? normalizeProjectArtifact(projectSnapshot, { id: projectSnapshot?.artifactId || "chat-project" })
      : null;
    let project = persisted || materializeProjectFromArtifacts(completedArtifacts);
    if (project && pendingArtifact?.files?.length) {
      project = mergeFilesIntoProject(project, pendingArtifact.files);
      project = normalizeProjectArtifact({
        ...project,
        summary: pendingMessage?.stage || project.summary,
        updatedAt: Date.now(),
      });
    }
    return project;
  }, [completedArtifacts, pendingArtifact, pendingMessage?.stage, projectSnapshot]);

  // Apply local edits on top of the generated content + recompute dirty state.
  const artifacts = useMemo(() => {
    return baseArtifacts.map((artifact) => applyLocalEdits(artifact, edits));
  }, [baseArtifacts, edits]);

  const projectArtifact = useMemo(
    () => applyLocalEdits(baseProjectArtifact, edits),
    [baseProjectArtifact, edits]
  );

  // Auto-select the chat project when it exists; otherwise fall back to the
  // newest individual artifact for older empty chats.
  useEffect(() => {
    const next = projectArtifact || artifacts[0] || null;
    if (!next) return;
    if (lastAutoSelectedRef.current === next.id) return;
    lastAutoSelectedRef.current = next.id;
    setActiveArtifactId(next.id);
    setActiveFileId(next.files[0]?.id || null);
  }, [artifacts, projectArtifact]);

  const activeArtifact = useMemo(
    () => projectArtifact || artifacts.find((a) => a.id === activeArtifactId) || artifacts[0] || null,
    [artifacts, activeArtifactId, projectArtifact]
  );

  const activeFile = useMemo(() => {
    if (!activeArtifact) return null;
    return activeArtifact.files.find((f) => f.id === activeFileId) || activeArtifact.files[0] || null;
  }, [activeArtifact, activeFileId]);

  const openArtifact = useCallback((id) => {
    setActiveArtifactId(id);
    setActiveFileId(null);
  }, []);

  const openFile = useCallback((artifactId, fileId) => {
    if (artifactId) setActiveArtifactId(artifactId);
    setActiveFileId(fileId);
  }, []);

  const updateFileContent = useCallback(
    (artifactId, fileId, content) => {
      dispatchEdits({ type: "edit", artifactId, fileId, content });
    },
    []
  );

  const revertArtifactEdits = useCallback((artifactId) => {
    dispatchEdits({ type: "clearArtifact", artifactId });
  }, []);

  // Current agent run mirrors the unified chat generation state.
  const agentRun = useMemo(() => {
    const latestAssistant = [...(messages || [])]
      .reverse()
      .find((m) => m.role === "assistant" && (m.runId || m.metadata?.runState || (Array.isArray(m.steps) && m.steps.length)));
    const latestWithSteps = [...(messages || [])]
      .reverse()
      .find((m) => m.role === "assistant" && Array.isArray(m.steps) && m.steps.length);

    if (!isGenerating) {
      const steps = latestWithSteps?.steps || [];
      const persistedRunState = normalizeRunState(latestAssistant?.metadata?.runState);
      const unresolvedAssets = Array.isArray(latestAssistant?.metadata?.unresolvedAssets)
        ? latestAssistant.metadata.unresolvedAssets
        : [];
      return {
        ...EMPTY_AGENT_RUN,
        status: persistedRunState || (projectArtifact || artifacts.length ? "push_skipped" : "idle"),
        stage: persistedRunState ? persistedRunState.replace(/_/g, " ") : "",
        steps,
        runId: latestAssistant?.runId || latestWithSteps?.runId || null,
        snapshotCount: countStepSnapshots(steps),
        unresolvedAssets,
      };
    }
    const stage = generationStage || pendingMessage?.stage || "Working...";
    const steps = pendingMessage?.steps || [];
    return {
      ...EMPTY_AGENT_RUN,
      status: normalizeRunState(pendingMessage?.runStatus) || derivePendingRunState(stage, steps),
      stage,
      plan: pendingMessage?.plan || "",
      steps,
      runId: pendingMessage?.runId || null,
      snapshotCount: countStepSnapshots(steps),
      targetSelection: pendingMessage?.targetSelection || null,
      placeName: pendingMessage?.studioPlaceName || "",
    };
  }, [isGenerating, generationStage, pendingMessage, artifacts.length, projectArtifact, messages]);

  return {
    artifacts,
    projectArtifact,
    projectArtifactSnapshot: buildBaseArtifactSnapshot(projectArtifact),
    activeArtifact,
    activeArtifactSnapshot: buildBaseArtifactSnapshot(activeArtifact),
    activeArtifactId: activeArtifact?.id || null,
    activeFile,
    activeFileId: activeFile?.id || null,
    agentRun,
    openArtifact,
    openFile,
    updateFileContent,
    revertArtifactEdits,
    setActiveArtifactId,
    setActiveFileId,
  };
}

export default useArtifactWorkspace;
