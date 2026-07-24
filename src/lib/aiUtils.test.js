import { authedFetch as sharedAuthedFetch } from "./billing";
import { pollJob } from "./aiUtils";

jest.mock("./billing", () => ({
  authedFetch: jest.fn(),
}));

function response(status, body, headers = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get(name) {
        const key = Object.keys(headers).find(
          (candidate) => candidate.toLowerCase() === String(name).toLowerCase()
        );
        return key ? headers[key] : null;
      },
    },
    text: jest.fn().mockResolvedValue(JSON.stringify(body)),
  };
}

describe("generation job polling", () => {
  const user = { uid: "user-1" };
  const options = {
    backendUrl: "https://api.nexusrbx.com",
    random: () => 0.5,
  };

  beforeEach(() => {
    sharedAuthedFetch.mockReset();
  });

  test("returns a successful terminal job", async () => {
    sharedAuthedFetch.mockResolvedValueOnce(
      response(200, { status: "succeeded", result: { id: "artifact-1" } })
    );

    await expect(pollJob(user, "job-success", null, options)).resolves.toMatchObject({
      status: "succeeded",
    });
  });

  test.each(["failed", "cancelled", "blocked", "timed_out"])(
    "stops on terminal job state %s",
    async (status) => {
      sharedAuthedFetch.mockResolvedValueOnce(response(200, { status }));

      await expect(
        pollJob(user, `job-state-${status}`, null, options)
      ).resolves.toMatchObject({ status });
      expect(sharedAuthedFetch).toHaveBeenCalledTimes(1);
    }
  );

  test.each([401, 403, 404])("stops immediately on terminal HTTP %s", async (status) => {
    sharedAuthedFetch.mockResolvedValueOnce(
      response(status, { code: `HTTP_${status}`, error: "Terminal failure" })
    );

    await expect(
      pollJob(user, `job-terminal-${status}`, null, options)
    ).rejects.toMatchObject({ status, retryable: false });
    expect(sharedAuthedFetch).toHaveBeenCalledTimes(1);
  });

  test.each([429, 503])("retries retryable HTTP %s and honors Retry-After", async (status) => {
    sharedAuthedFetch
      .mockResolvedValueOnce(
        response(status, { code: `HTTP_${status}`, retryable: true }, { "Retry-After": "0" })
      )
      .mockResolvedValueOnce(response(200, { status: "succeeded" }));

    await expect(
      pollJob(user, `job-retry-${status}`, null, options)
    ).resolves.toMatchObject({ status: "succeeded" });
    expect(sharedAuthedFetch).toHaveBeenCalledTimes(2);
  });

  test("stops when the attempt budget is exhausted", async () => {
    await expect(
      pollJob(user, "job-budget", null, { ...options, maxAttempts: 0 })
    ).rejects.toMatchObject({
      code: "POLLING_LIMIT_REACHED",
      retryable: false,
    });
    expect(sharedAuthedFetch).not.toHaveBeenCalled();
  });

  test("is abortable", async () => {
    const controller = new AbortController();
    controller.abort();
    sharedAuthedFetch.mockResolvedValueOnce(response(200, { status: "processing" }));

    await expect(
      pollJob(user, "job-abort", null, { ...options, signal: controller.signal })
    ).rejects.toMatchObject({ name: "AbortError", code: "ABORTED" });
  });

  test("deduplicates concurrent polling for the same user and job", async () => {
    let resolveRequest;
    sharedAuthedFetch.mockImplementationOnce(
      () => new Promise((resolve) => {
        resolveRequest = resolve;
      })
    );

    const first = pollJob(user, "job-shared", null, options);
    const second = pollJob(user, "job-shared", null, options);
    expect(second).toBe(first);
    expect(sharedAuthedFetch).toHaveBeenCalledTimes(1);

    resolveRequest(response(200, { status: "succeeded" }));
    await expect(first).resolves.toMatchObject({ status: "succeeded" });
  });

  test("cancels a prior generation poll when a different job starts", async () => {
    sharedAuthedFetch
      .mockResolvedValueOnce(response(200, { status: "processing" }))
      .mockResolvedValueOnce(response(200, { status: "succeeded" }));

    const first = pollJob(user, "job-old", null, options);
    const second = pollJob(user, "job-new", null, options);

    await expect(first).rejects.toMatchObject({
      name: "AbortError",
      code: "ABORTED",
    });
    await expect(second).resolves.toMatchObject({ status: "succeeded" });
  });
});
