import { enqueueToast } from "./useAiNotifications";

describe("enqueueToast", () => {
  test("deduplicates rapid duplicate notifications", () => {
    const now = 1700000000000;
    const queueA = enqueueToast([], { message: "Saved", type: "success" }, now);
    const queueB = enqueueToast(queueA, { message: "Saved", type: "success" }, now + 1000);

    expect(queueB).toHaveLength(1);
    expect(queueB[0].count).toBe(2);
  });

  test("adds distinct notification", () => {
    const now = 1700000000000;
    const queueA = enqueueToast([], { message: "Saved", type: "success" }, now);
    const queueB = enqueueToast(queueA, { message: "Failed", type: "error" }, now + 200);

    expect(queueB).toHaveLength(2);
  });
});
