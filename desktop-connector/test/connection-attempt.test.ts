import assert from "node:assert/strict";
import test from "node:test";
import { ConnectionAttemptCoordinator } from "../src/connection-attempt.js";

test("a replacement waits until the active connector has actually stopped", async () => {
  const coordinator = new ConnectionAttemptCoordinator();
  let finish!: () => void;
  const finished = new Promise<void>((resolve) => { finish = resolve; });
  const first = coordinator.start(async ({ signal }) => {
    await new Promise<void>((resolve) => signal.addEventListener("abort", resolve, { once: true }));
    await finished;
  });

  const stopping = coordinator.stop();
  await Promise.resolve();
  assert.equal(first.signal.aborted, true);
  assert.equal(coordinator.active?.id, first.id);
  assert.throws(() => coordinator.start(async () => undefined), /already active/);

  finish();
  await stopping;
  const second = coordinator.start(async () => undefined);
  assert.notEqual(second.id, first.id);
  await second.completion;
});

test("completed attempts cannot remain current", async () => {
  const coordinator = new ConnectionAttemptCoordinator();
  const attempt = coordinator.start(async () => undefined);
  await attempt.completion;
  await Promise.resolve();
  assert.equal(coordinator.active, null);
  assert.equal(coordinator.isCurrent(attempt.id), false);
});
