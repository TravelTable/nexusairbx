import { playMockScenario } from "./mockRunPlayer";

test("plays frames in order without network calls and stops on abort", async () => {
  const seen = [];
  const waits = [];
  const controller = new AbortController();
  const frames = [
    { delayMs: 10, busy: "Starting build" },
    { delayMs: 10, busy: "", task: { status: "running" } },
    { delayMs: 10, placeholder: "Placeholder" },
  ];

  const playPromise = playMockScenario(frames, {
    signal: controller.signal,
    onFrame: (frame) => {
      seen.push(frame.busy || frame.placeholder || frame.task?.status);
      if (seen.length === 2) controller.abort();
    },
    wait: (ms) => {
      waits.push(ms);
      return Promise.resolve();
    },
  });

  await playPromise;
  expect(seen).toEqual(["Starting build", "running"]);
  expect(waits).toEqual([10, 10]);
});
