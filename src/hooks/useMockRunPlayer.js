import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  isLocalDevToolsHost,
  readMockRunsEnabled,
  writeMockRunsEnabled,
} from "../lib/localDevTools";
import { playMockScenario } from "../lib/mockRunPlayer";
import { buildMockFrames, listMockScenarios } from "../lib/mockRunScenarios";

const emptyFrame = {
  busy: "",
  busyFlag: false,
  stage: "",
  task: null,
  run: null,
  event: null,
  events: [],
  pendingPrompt: "",
  placeholder: "",
  assistantContent: "",
  sourceFiles: null,
};

export default function useMockRunPlayer({
  workspace = "agent",
  available = typeof window !== "undefined" ? isLocalDevToolsHost() : false,
} = {}) {
  const [enabled, setEnabledState] = useState(() => available && readMockRunsEnabled());
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [scenarioId, setScenarioId] = useState("");
  const [frame, setFrame] = useState(emptyFrame);
  const abortRef = useRef(null);
  const eventsRef = useRef([]);

  useEffect(() => {
    if (!available && enabled) setEnabledState(false);
  }, [available, enabled]);

  const scenarios = useMemo(() => listMockScenarios(workspace), [workspace]);

  const clearFrame = useCallback(() => {
    eventsRef.current = [];
    setFrame(emptyFrame);
    setScenarioId("");
    setPlaying(false);
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    clearFrame();
  }, [clearFrame]);

  const setEnabled = useCallback((next) => {
    const value = Boolean(next) && available;
    writeMockRunsEnabled(value);
    setEnabledState(value);
    if (!value) {
      abortRef.current?.abort();
      abortRef.current = null;
      eventsRef.current = [];
      setFrame(emptyFrame);
      setScenarioId("");
      setPlaying(false);
      setOpen(false);
    } else {
      setOpen(true);
    }
  }, [available]);

  const play = useCallback(async (id, context = {}) => {
    if (!available || !enabled) return false;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    eventsRef.current = [];
    setScenarioId(id);
    setPlaying(true);
    setOpen(true);
    setFrame({ ...emptyFrame, pendingPrompt: context.prompt || "" });

    try {
      const frames = buildMockFrames(id, context);
      await playMockScenario(frames, {
        signal: controller.signal,
        onFrame: (next) => {
          if (next.event) {
            eventsRef.current = [...eventsRef.current, next.event];
          }
          setFrame({
            busy: next.busy || "",
            busyFlag: Boolean(next.busy === true || (typeof next.busy === "string" && next.busy)),
            stage: next.stage || "",
            task: next.task || null,
            run: next.run || null,
            event: next.event || null,
            events: eventsRef.current,
            pendingPrompt: next.pendingPrompt || context.prompt || "",
            placeholder: next.placeholder || "",
            assistantContent: next.assistantContent || "",
            sourceFiles: next.sourceFiles || next.task?.uiBuild?.sourceFiles || null,
          });
        },
      });
    } catch (_) {
      /* scenario errors surface via frame clear */
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setPlaying(false);
      }
    }
    return !controller.signal.aborted;
  }, [available, enabled]);

  useEffect(() => () => { abortRef.current?.abort(); }, []);

  return {
    available,
    enabled,
    setEnabled,
    open,
    setOpen,
    playing,
    scenarioId,
    frame,
    scenarios,
    play,
    stop,
    clearFrame,
  };
}
