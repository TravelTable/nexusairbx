import { createChatProgressPersistence } from "./chatProgressPersistence";

describe("chat progress persistence", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("coalesces rapid progress updates into one write with the latest state", async () => {
    let now = 0;
    const persist = jest.fn().mockResolvedValue(undefined);
    const writer = createChatProgressPersistence({
      key: "user/chat/message",
      persist,
      intervalMs: 7_500,
      now: () => now,
      locks: null,
    });

    for (let index = 0; index < 1_000; index += 1) {
      writer.queue({ stage: `stage-${index}`, steps: [{ id: String(index) }] });
    }
    expect(persist).not.toHaveBeenCalled();

    now = 7_500;
    jest.runOnlyPendingTimers();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(persist).toHaveBeenCalledTimes(1);
    expect(persist).toHaveBeenCalledWith({ stage: "stage-999", steps: [{ id: "999" }] });
  });

  test("cross-tab state suppresses an identical write", async () => {
    let now = 10_000;
    const firstPersist = jest.fn().mockResolvedValue(undefined);
    const secondPersist = jest.fn().mockResolvedValue(undefined);
    const first = createChatProgressPersistence({
      key: "shared/message",
      persist: firstPersist,
      now: () => now,
      storage: localStorage,
      locks: null,
    });
    const second = createChatProgressPersistence({
      key: "shared/message",
      persist: secondPersist,
      now: () => now,
      storage: localStorage,
      locks: null,
    });

    first.queue({ stage: "Building", steps: [{ id: "one" }] });
    second.queue({ stage: "Building", steps: [{ id: "one" }] });
    await first.flush({ force: true });
    await second.flush({ force: true });

    expect(firstPersist).toHaveBeenCalledTimes(1);
    expect(secondPersist).not.toHaveBeenCalled();
  });

  test("cancel prevents a queued progress write", async () => {
    const persist = jest.fn().mockResolvedValue(undefined);
    const writer = createChatProgressPersistence({
      key: "cancel/message",
      persist,
      locks: null,
    });
    writer.queue({ stage: "Working" });
    writer.cancel();
    jest.runOnlyPendingTimers();
    await Promise.resolve();
    expect(persist).not.toHaveBeenCalled();
  });
});
