import {
  associateChatMessageWrites,
  finishChatWriteMetrics,
  recordChatMessageWrite,
  resetClientFirestoreWriteMetricsForTests,
} from "./clientFirestoreWriteMetrics";

describe("clientFirestoreWriteMetrics", () => {
  beforeEach(() => resetClientFirestoreWriteMetricsForTests());

  it("associates a pre-job user write without double-counting it", () => {
    recordChatMessageWrite({ reason: "user_message" });
    associateChatMessageWrites({ jobId: "job-1", reason: "user_message" });
    recordChatMessageWrite({ jobId: "job-1", reason: "assistant_initial" });

    expect(finishChatWriteMetrics("job-1", "done")).toBe(2);
  });
});
