import {
  CHAT_OPERATION_STATUS,
  ChatOperationCoordinator,
} from "./chatOperationCoordinator";

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe("ChatOperationCoordinator", () => {
  test("consumes one draft revision synchronously", async () => {
    const coordinator = new ChatOperationCoordinator();
    const execution = deferred();
    const executor = jest.fn(() => execution.promise);
    const spec = { id: "op-1", chatId: "chat-1", prompt: "hello", draftRevision: "7" };

    const first = coordinator.admit(spec, executor);
    const duplicate = coordinator.admit({ ...spec, id: "op-2" }, executor);

    expect(duplicate.duplicate).toBe(true);
    expect(duplicate.operation.id).toBe("op-1");
    expect(coordinator.snapshot("chat-1").active.id).toBe("op-1");
    await Promise.resolve();
    expect(executor).toHaveBeenCalledTimes(1);

    execution.resolve();
    await first.promise;
  });

  test("queues distinct prompts FIFO and drains after success", async () => {
    const coordinator = new ChatOperationCoordinator();
    const firstExecution = deferred();
    const calls = [];

    const first = coordinator.admit(
      { id: "first", chatId: "chat-1", prompt: "one", draftRevision: "1" },
      () => {
        calls.push("first");
        return firstExecution.promise;
      }
    );
    const second = coordinator.admit(
      { id: "second", chatId: "chat-1", prompt: "two", draftRevision: "2" },
      () => calls.push("second")
    );
    coordinator.admit(
      { id: "third", chatId: "chat-1", prompt: "three", draftRevision: "3" },
      () => calls.push("third")
    );

    expect(coordinator.snapshot("chat-1").queue.map((entry) => entry.id)).toEqual(["second", "third"]);
    firstExecution.resolve();
    await first.promise;
    await second.promise;
    await Promise.resolve();
    expect(calls).toEqual(["first", "second", "third"]);
  });

  test("stop aborts immediately, pauses the queue, and fences late completion", async () => {
    const coordinator = new ChatOperationCoordinator();
    const execution = deferred();
    const cancel = deferred();
    let signal;
    const first = coordinator.admit(
      { id: "first", chatId: "chat-1", draftRevision: "1", onCancel: () => cancel.promise },
      (context) => {
        signal = context.signal;
        return execution.promise;
      }
    );
    coordinator.admit(
      { id: "second", chatId: "chat-1", draftRevision: "2" },
      jest.fn()
    );
    await Promise.resolve();

    const stopping = coordinator.stop("chat-1");
    expect(signal.aborted).toBe(true);
    expect(coordinator.snapshot("chat-1").active.status).toBe(CHAT_OPERATION_STATUS.STOPPING);
    cancel.resolve();
    await stopping;
    expect(coordinator.snapshot("chat-1")).toMatchObject({
      active: null,
      paused: true,
      lastStatus: CHAT_OPERATION_STATUS.STOPPED,
    });

    execution.resolve("late");
    await first.promise;
    await Promise.resolve();
    expect(coordinator.snapshot("chat-1").active).toBeNull();
    expect(coordinator.snapshot("chat-1").queue[0].id).toBe("second");
  });

  test("a Stop before run creation cancels the authoritative run as soon as its id arrives", async () => {
    const coordinator = new ChatOperationCoordinator();
    const execution = deferred();
    const cancellations = [];
    let context;
    coordinator.admit(
      {
        id: "early-stop",
        chatId: "chat-1",
        draftRevision: "early-stop",
        onCancel: (operation) => cancellations.push(operation.runId),
      },
      (nextContext) => {
        context = nextContext;
        return execution.promise;
      },
    );
    await Promise.resolve();

    await coordinator.stop("chat-1");
    expect(cancellations).toEqual([null]);
    expect(coordinator.snapshot("chat-1").active).toBeNull();

    context.setRunId("run-created-after-stop");
    await Promise.resolve();
    await Promise.resolve();
    expect(cancellations).toEqual([null, "run-created-after-stop"]);
    expect(coordinator.snapshot("chat-1")).toMatchObject({
      active: null,
      lastStatus: CHAT_OPERATION_STATUS.STOPPED,
    });
    execution.resolve();
  });

  test("a matching authoritative projection consumes pending cancellation without resurrecting Running", async () => {
    const coordinator = new ChatOperationCoordinator();
    const cancellations = [];
    coordinator.admit(
      {
        id: "request-1",
        chatId: "chat-1",
        draftRevision: "request-1",
        onCancel: (operation) => cancellations.push(operation.runId),
      },
      () => new Promise(() => {}),
    );
    await coordinator.stop("chat-1");

    coordinator.hydrate({
      id: "request-1",
      chatId: "chat-1",
      runId: "run-projected-late",
      status: CHAT_OPERATION_STATUS.RUNNING,
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(cancellations).toEqual([null, "run-projected-late"]);
    expect(coordinator.snapshot("chat-1")).toMatchObject({
      active: null,
      lastStatus: CHAT_OPERATION_STATUS.STOPPED,
    });
  });

  test("pending cancellation never attaches to an unrelated later operation", async () => {
    const coordinator = new ChatOperationCoordinator();
    const cancel = jest.fn();
    coordinator.admit(
      {
        id: "request-stopped",
        chatId: "chat-1",
        draftRevision: "request-stopped",
        onCancel: cancel,
      },
      () => new Promise(() => {}),
    );
    await coordinator.stop("chat-1");

    coordinator.hydrate({
      id: "request-new",
      chatId: "chat-1",
      runId: "run-new",
      status: CHAT_OPERATION_STATUS.RUNNING,
    });

    expect(cancel).toHaveBeenCalledTimes(1);
    expect(coordinator.snapshot("chat-1").active).toMatchObject({
      id: "request-new",
      runId: "run-new",
      status: CHAT_OPERATION_STATUS.RUNNING,
    });
  });

  test("treats a server-confirmed user cancellation as stopped rather than failed", async () => {
    const coordinator = new ChatOperationCoordinator();
    const cancellation = Object.assign(new Error("Cancelled by user"), {
      code: "user_cancelled",
    });

    const admission = coordinator.admit(
      { id: "cancelled", chatId: "chat-1", draftRevision: "1" },
      () => Promise.reject(cancellation),
    );
    await expect(admission.promise).rejects.toBe(cancellation);

    expect(coordinator.snapshot("chat-1")).toMatchObject({
      active: null,
      paused: false,
      lastStatus: CHAT_OPERATION_STATUS.STOPPED,
    });
  });

  test("treats a bare user_cancelled server message as stopped", async () => {
    const coordinator = new ChatOperationCoordinator();
    const cancellation = new Error("user_cancelled");

    const admission = coordinator.admit(
      { id: "cancelled-message", chatId: "chat-1", draftRevision: "1" },
      () => Promise.reject(cancellation),
    );
    await expect(admission.promise).rejects.toBe(cancellation);

    expect(coordinator.snapshot("chat-1")).toMatchObject({
      active: null,
      paused: false,
      lastStatus: CHAT_OPERATION_STATUS.STOPPED,
    });
  });

  test.each(["user_cancelled", "user_canceled", "cancelled-by-user"])(
    "reconciles a hydrated failed run with %s evidence as stopped",
    (failureCode) => {
      const coordinator = new ChatOperationCoordinator();
      coordinator.hydrate({ chatId: "chat-1", runId: "run-1" });

      expect(coordinator.reconcile("chat-1", {
        runId: "run-1",
        status: "failed",
        failureCode,
      })).toBe(true);
      expect(coordinator.snapshot("chat-1")).toMatchObject({
        active: null,
        paused: true,
        lastStatus: CHAT_OPERATION_STATUS.STOPPED,
      });
    },
  );

  test("interrupt keeps the new prompt visible and starts it after cancellation", async () => {
    const coordinator = new ChatOperationCoordinator();
    const cancel = deferred();
    coordinator.admit(
      { id: "first", chatId: "chat-1", draftRevision: "1", onCancel: () => cancel.promise },
      () => new Promise(() => {})
    );
    const secondExecutor = jest.fn();
    coordinator.admit(
      { id: "second", chatId: "chat-1", draftRevision: "2", interrupt: true },
      secondExecutor
    );

    expect(coordinator.snapshot("chat-1").queue[0].id).toBe("second");
    cancel.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(secondExecutor).toHaveBeenCalledTimes(1);
  });

  test("different chats execute independently", async () => {
    const coordinator = new ChatOperationCoordinator();
    const execution = deferred();
    const secondExecutor = jest.fn();
    coordinator.admit({ id: "a", chatId: "chat-a", draftRevision: "1" }, () => execution.promise);
    coordinator.admit({ id: "b", chatId: "chat-b", draftRevision: "1" }, secondExecutor);
    await Promise.resolve();
    expect(coordinator.snapshot("chat-a").isBusy).toBe(true);
    expect(secondExecutor).toHaveBeenCalledTimes(1);
    execution.resolve();
  });

  test("retains a fresh retryable operation after a start failure", async () => {
    const coordinator = new ChatOperationCoordinator();
    const executor = jest
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce("sent");

    const first = coordinator.admit(
      {
        id: "first",
        chatId: "chat-1",
        draftRevision: "1",
        retainOnFailure: true,
      },
      executor
    );
    await expect(first.promise).rejects.toThrow("offline");

    const failed = coordinator.snapshot("chat-1").queue[0];
    expect(failed).toMatchObject({ status: CHAT_OPERATION_STATUS.FAILED });
    expect(failed.id).not.toBe("first");

    expect(coordinator.sendNext("chat-1")).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(executor).toHaveBeenCalledTimes(2);
    expect(coordinator.snapshot("chat-1").active).toBeNull();
  });
});
