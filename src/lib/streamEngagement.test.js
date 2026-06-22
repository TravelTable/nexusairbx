import {
  createIdlePulseController,
  IDLE_PULSE_MESSAGES,
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

  test("idle pulse fires only when activity is quiet", () => {
    const pulses = [];
    let activitySeq = 1;
    const controller = createIdlePulseController({
      onPulse: (message) => pulses.push(message),
      getActivitySeq: () => activitySeq,
      intervalMs: 1000,
    });

    controller.start();
    jest.advanceTimersByTime(1000);
    expect(pulses).toEqual([]);

    jest.advanceTimersByTime(1000);
    expect(pulses).toEqual([IDLE_PULSE_MESSAGES[0]]);

    activitySeq = 2;
    controller.notifyActivity();
    jest.advanceTimersByTime(1000);
    expect(pulses).toEqual([IDLE_PULSE_MESSAGES[0]]);

    jest.advanceTimersByTime(1000);
    expect(pulses).toEqual([IDLE_PULSE_MESSAGES[0], IDLE_PULSE_MESSAGES[1]]);

    controller.dispose();
    jest.advanceTimersByTime(5000);
    expect(pulses).toHaveLength(2);
  });

  test("idle pulse upserts through stable id at call site", () => {
    const pulses = [];
    const controller = createIdlePulseController({
      onPulse: (message) => pulses.push({ id: "idle-pulse", message }),
      getActivitySeq: () => 0,
      intervalMs: 500,
    });

    controller.start();
    jest.advanceTimersByTime(1500);
    expect(pulses.map((p) => p.id)).toEqual(["idle-pulse", "idle-pulse"]);
    controller.dispose();
  });
});
