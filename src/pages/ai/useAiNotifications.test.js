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


test("an explicit connection notice ID stays deduplicated across polling intervals", () => {
  const first = enqueueToast([], { id: "studio-plugin-update", message: "Update Studio", type: "info" }, 1000);
  const polled = enqueueToast(first, { id: "studio-plugin-update", message: "Update Studio", type: "info" }, 10000);
  expect(polled).toHaveLength(1);
  expect(polled[0].id).toBe("studio-plugin-update");
});
