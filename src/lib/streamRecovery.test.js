import {
  buildStreamUrl,
  formatRecoveryStage,
  isStudioWaitPayload,
  pollJobResult,
  STUDIO_WAIT_GRACE_MS,
  updateSeqFromPayload,
} from "./streamRecovery";

describe("streamRecovery", () => {
  test("buildStreamUrl includes afterSeq and streamToken", () => {
    const url = buildStreamUrl({
      jobId: "job_1",
      mode: "act",
      afterSeq: 42,
      streamToken: "abc123",
    });
    expect(url).toContain("jobId=job_1");
    expect(url).toContain("mode=act");
    expect(url).toContain("afterSeq=42");
    expect(url).toContain("streamToken=abc123");
  });

  test("updateSeqFromPayload advances only on higher seq", () => {
    expect(updateSeqFromPayload(10, { seq: 12 })).toBe(12);
    expect(updateSeqFromPayload(12, { seq: 8 })).toBe(12);
  });

  test("isStudioWaitPayload detects studio blocked jobs", () => {
    expect(isStudioWaitPayload({ waitingFor: "studio" })).toBe(true);
    expect(isStudioWaitPayload({ jobStatus: "waiting_for_tool" })).toBe(true);
    expect(isStudioWaitPayload({ jobStatus: "running" })).toBe(false);
  });

  test("formatRecoveryStage maps studio waits", () => {
    expect(formatRecoveryStage({ waitingFor: "studio" })).toMatch(/Studio/i);
    expect(formatRecoveryStage({ stage: "generating" })).toBe("Generating...");
  });

  test("pollJobResult surfaces pending stage via onPending", async () => {
    const stages = [];
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce({
        status: 202,
        headers: { get: () => "application/json" },
        json: async () => ({ status: "pending", done: false, stage: "generating", jobStatus: "running" }),
      })
      .mockResolvedValueOnce({
        status: 200,
        headers: { get: () => "application/json" },
        json: async () => ({ status: "done", done: true, result: { title: "Done" } }),
      });

    const result = await pollJobResult({
      resultUrl: "https://example.com/api/generate/result?jobId=1",
      token: "token",
      maxPolls: 5,
      pollBaseMs: 1,
      wallTimeoutMs: 5000,
      onPending: (payload) => stages.push(payload.stage),
      fetchImpl,
      waitImpl: () => Promise.resolve(),
    });

    expect(stages).toEqual(["generating"]);
    expect(result).toEqual({ title: "Done" });
  });

  test("pollJobResult fails fast on failed jobs", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      status: 500,
      headers: { get: () => "application/json" },
      json: async () => ({ status: "failed", message: "Worker exploded", code: "GENERATION_FAILED" }),
    });

    await expect(
      pollJobResult({
        resultUrl: "https://example.com/api/generate/result?jobId=1",
        token: "token",
        maxPolls: 3,
        pollBaseMs: 1,
        wallTimeoutMs: 5000,
        fetchImpl,
        waitImpl: () => Promise.resolve(),
      })
    ).rejects.toThrow("Worker exploded");
  });

  test("pollJobResult enforces wall timeout", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      status: 202,
      headers: { get: () => "application/json" },
      json: async () => ({ status: "pending", done: false, stage: "generating" }),
    });

    await expect(
      pollJobResult({
        resultUrl: "https://example.com/api/generate/result?jobId=1",
        token: "token",
        maxPolls: 100,
        pollBaseMs: 10,
        wallTimeoutMs: 25,
        fetchImpl,
        waitImpl: () => Promise.resolve(),
        onPending: () => {},
      })
    ).rejects.toMatchObject({ code: "RECOVERY_TIMEOUT" });
  });

  test("pollJobResult extends deadline while waiting for Studio", async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce({
        status: 202,
        headers: { get: () => "application/json" },
        json: async () => ({
          status: "pending",
          done: false,
          stage: "inspecting",
          jobStatus: "waiting_for_tool",
          waitingFor: "studio",
        }),
      })
      .mockResolvedValueOnce({
        status: 200,
        headers: { get: () => "application/json" },
        json: async () => ({ status: "done", done: true, result: { title: "Done" } }),
      });

    const startedAt = Date.now();
    const result = await pollJobResult({
      resultUrl: "https://example.com/api/generate/result?jobId=1",
      token: "token",
      maxPolls: 5,
      pollBaseMs: 1,
      wallTimeoutMs: 25,
      fetchImpl,
      waitImpl: () => Promise.resolve(),
      onPending: () => {},
    });

    expect(result).toEqual({ title: "Done" });
    expect(Date.now() - startedAt).toBeLessThan(STUDIO_WAIT_GRACE_MS);
  });
});
