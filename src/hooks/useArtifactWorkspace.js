// src/hooks/useArtifactWorkspace.js
//
// The code-first workspace state. The primary output of a generation is a
// multi-file artifact (NOT a preview object). This hook derives the artifact
// list from completed assistant chat messages, tracks the active artifact/file,
// local edits (dirty state), and the current agent run status.

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { artifactFromMessage } from "../lib/normalizeArtifact";

const EMPTY_AGENT_RUN = {
  status: "idle", // idle | thinking | generating | done | error
  stage: "",
  plan: "",
  currentStep: null,
  logs: [],
  errors: [],
};

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

export function useArtifactWorkspace(messages, { isGenerating, generationStage, pendingMessage } = {}) {
  const [activeArtifactId, setActiveArtifactId] = useState(null);
  const [activeFileId, setActiveFileId] = useState(null);
  const [edits, dispatchEdits] = useReducer(editsReducer, {});
  const lastAutoSelectedRef = useRef(null);

  // Build the artifact list from assistant messages (newest first).
  const baseArtifacts = useMemo(() => {
    const list = [];
    for (const m of messages || []) {
      const artifact = artifactFromMessage(m);
      if (artifact) list.push(artifact);
    }
    return list.reverse();
  }, [messages]);

  // Apply local edits on top of the generated content + recompute dirty state.
  const artifacts = useMemo(() => {
    return baseArtifacts.map((artifact) => {
      let dirtyCount = 0;
      const files = artifact.files.map((file) => {
        const key = `${artifact.id}:${file.id}`;
        const edited = Object.prototype.hasOwnProperty.call(edits, key);
        const content = edited ? edits[key] : file.content;
        const dirty = edited && content !== file.content;
        if (dirty) dirtyCount += 1;
        return { ...file, content, dirty, status: dirty ? "edited" : file.status };
      });
      return { ...artifact, files, dirtyCount };
    });
  }, [baseArtifacts, edits]);

  // Auto-select the newest artifact when one finishes generating.
  useEffect(() => {
    if (!artifacts.length) return;
    const newest = artifacts[0];
    if (lastAutoSelectedRef.current === newest.id) return;
    lastAutoSelectedRef.current = newest.id;
    setActiveArtifactId(newest.id);
    setActiveFileId(newest.files[0]?.id || null);
  }, [artifacts]);

  const activeArtifact = useMemo(
    () => artifacts.find((a) => a.id === activeArtifactId) || artifacts[0] || null,
    [artifacts, activeArtifactId]
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
    if (!isGenerating) {
      return { ...EMPTY_AGENT_RUN, status: artifacts.length ? "done" : "idle" };
    }
    const stage = generationStage || pendingMessage?.stage || "Working...";
    const isThinking = /understand|analy|plan|prepar|connect/i.test(stage);
    return {
      ...EMPTY_AGENT_RUN,
      status: isThinking ? "thinking" : "generating",
      stage,
      plan: pendingMessage?.plan || "",
    };
  }, [isGenerating, generationStage, pendingMessage, artifacts.length]);

  return {
    artifacts,
    activeArtifact,
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
