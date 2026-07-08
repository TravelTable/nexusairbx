import {
  createIdlePulseController,
  IDLE_PULSE_MESSAGES,
  STUDIO_IDLE_PULSE_MESSAGES,
  isWaitingForStudioContext,
  stageSlug,
} from "./streamEngagement";

describe("streamEngagement", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("stageSlug normalizes labels", () => {
    expect(stageSlug("Analyzing Request...")).toBe("analyzing-request");
    expect(stageSlug("Stream interrupted — reconnecting...")).toBe("stream-interrupted-reconnecting");
  });

  test("isWaitingForStudioContext only matches real Studio waits", () => {
    expect(isWaitingForStudioContext({ studioConnected: true })).toBe(false);
    expect(isWaitingForStudioContext({ stage: "Working..." })).toBe(false);
    expect(isWaitingForStudioContext({ stage: "Generating Artifact" })).toBe(false);
    expect(isWaitingForStudioContext({ stage: "Waiting for Studio to respond..." })).toBe(true);
    expect(isWaitingForStudioContext({ stage: "Building Studio manifest..." })).toBe(true);
    expect(isWaitingForStudioContext({ waitingForStudio: true })).toBe(true);
  });

  test("idle pulse fires only after a longer quiet window", () => {
    const pulses = [];
    let activitySeq = 1;
    const controller = createIdlePulseController({
      onPulse: (message) => pulses.push(message),
      getActivitySeq: () => activitySeq,
      intervalMs: 1000,
    });

    controller.start();
    // Needs 3 quiet ticks before the first heartbeat.
    jest.advanceTimersByTime(2000);
    expect(pulses).toEqual([]);

    jest.advanceTimersByTime(1000);
    expect(pulses).toEqual([IDLE_PULSE_MESSAGES[0]]);

    activitySeq = 2;
    controller.notifyActivity();
    jest.advanceTimersByTime(2000);
    expect(pulses).toEqual([IDLE_PULSE_MESSAGES[0]]);

    jest.advanceTimersByTime(1000);
    // A single honest line, reused (upsert by stable id at the call site).
    expect(pulses).toEqual([IDLE_PULSE_MESSAGES[0], IDLE_PULSE_MESSAGES[0]]);

    controller.dispose();
    jest.advanceTimersByTime(5000);
    expect(pulses).toHaveLength(2);
  });

  test("idle pulse uses Studio copy only while actually waiting on Studio", () => {
    const pulses = [];
    let stage = "Planning...";
    const controller = createIdlePulseController({
      onPulse: (message) => pulses.push(message),
      getActivitySeq: () => 0,
      getContext: () => ({ stage }),
      intervalMs: 500,
    });

    controller.start();
    jest.advanceTimersByTime(2000);
    expect(pulses).toEqual([IDLE_PULSE_MESSAGES[0], IDLE_PULSE_MESSAGES[0]]);

    stage = "Waiting for Studio to respond...";
    jest.advanceTimersByTime(500);
    expect(pulses.at(-1)).toBe(STUDIO_IDLE_PULSE_MESSAGES[0]);

    controller.dispose();
  });

  test("idle pulse upserts through stable id at call site", () => {
    const pulses = [];
    const controller = createIdlePulseController({
      onPulse: (message) => pulses.push({ id: "idle-pulse", message }),
      getActivitySeq: () => 0,
      intervalMs: 500,
    });

    controller.start();
    // 4 ticks at 500ms => 2 heartbeats once the 3-tick quiet window passes.
    jest.advanceTimersByTime(2000);
    expect(pulses.map((p) => p.id)).toEqual(["idle-pulse", "idle-pulse"]);
    controller.dispose();
  });
});
