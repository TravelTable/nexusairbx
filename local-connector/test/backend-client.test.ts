import assert from "node:assert/strict";
import test from "node:test";
import { NexusBackendClient } from "../src/backend-client.js";
import { ConnectorError } from "../src/errors.js";
import type { Logger } from "../src/logger.js";

interface CapturedRequest {
  url: string;
  init: RequestInit;
}

class TestLogger implements Logger {
  readonly secrets: string[] = [];
  readonly warnings: unknown[] = [];
  info(): void {}
  warn(_message: string, details?: unknown): void { this.warnings.push(details); }
  error(): void {}
  debug(): void {}
  addSecret(secret: string): void { this.secrets.push(secret); }
}

function response(value: unknown, status = 200): Response {
  if (status === 204) return new Response(null, { status });
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function makeFetch(queue: Array<Response | Error>, calls: CapturedRequest[]): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init: init ?? {} });
    const next = queue.shift();
    if (next instanceof Error) throw next;
    if (next === undefined) throw new Error("No queued response");
    return next;
  }) as typeof fetch;
}

test("backend client claims, authenticates, pings, registers, polls, and acknowledges", async () => {
  const token = "nsmcp_session123_secret.value";
  const calls: CapturedRequest[] = [];
  const logger = new TestLogger();
  const client = new NexusBackendClient({
    apiUrl: "https://api.example.test",
    connectorVersion: "0.1.0",
    requestTimeoutMs: 1_000,
    logger,
    fetch: makeFetch(
      [
        response({ token, sessionId: "session123", userId: "user1", pollIntervalMs: 25, expiresInMs: 60_000 }),
        response({ ok: true }),
        response({ ok: true }),
        response({}, 204),
        response({ ok: true }),
      ],
      calls,
    ),
  });

  const claim = await client.claimPairing("ab-cd");
  assert.equal(claim.token, token);
  assert.deepEqual(logger.secrets, [token]);
  assert.equal((calls[0]?.init.headers as Record<string, string>).Authorization, undefined);
  assert.deepEqual(JSON.parse(String(calls[0]?.init.body)), {
    code: "AB-CD",
    connector: { connectorVersion: "0.1.0", platform: process.platform, nodeVersion: process.version },
  });

  await client.ping({ mcpServerAvailable: true });
  await client.registerCapabilities(
    {
      readProject: true,
      readScript: true,
      writeScript: false,
      patchScript: false,
      inspectSelection: false,
      outputLogs: false,
      playtest: false,
      creatorStoreInsert: false,
      instanceMutation: false,
      snapshots: false,
    },
    ["read_script"],
    [{ name: "script_read", description: "d".repeat(1_000) }],
  );
  assert.equal(await client.pollNext(20_000), null);
  await client.acknowledge("command/id", "failed", {
    success: false,
    error: { code: "MCP_TOOL_UNAVAILABLE", message: "unsupported" },
  });

  for (const request of calls.slice(1)) {
    assert.equal((request.init.headers as Record<string, string>).Authorization, `Bearer ${token}`);
  }
  assert.match(calls[3]?.url ?? "", /waitMs=20000$/);
  assert.match(calls[4]?.url ?? "", /commands\/command%2Fid\/ack$/);
  const registration = JSON.parse(String(calls[2]?.init.body));
  assert.equal(registration.discoveredTools[0].description.length, 512);
  const ack = JSON.parse(String(calls[4]?.init.body));
  assert.equal(ack.status, "failed");
  assert.equal(ack.error.code, "MCP_TOOL_UNAVAILABLE");

  client.clearToken();
  await assert.rejects(
    client.ping({ mcpServerAvailable: false }),
    (error: unknown) => error instanceof ConnectorError && error.code === "CONNECTOR_NOT_PAIRED",
  );
});

test("claim is not retried while temporary authenticated requests use bounded retries", async () => {
  const claimCalls: CapturedRequest[] = [];
  const claimClient = new NexusBackendClient({
    apiUrl: "https://api.example.test",
    connectorVersion: "0.1.0",
    requestTimeoutMs: 1_000,
    logger: new TestLogger(),
    retryDelaysMs: [0, 0],
    fetch: makeFetch([response({ message: "temporary" }, 503), response({})], claimCalls),
  });
  await assert.rejects(
    claimClient.claimPairing("ABCD"),
    (error: unknown) => error instanceof ConnectorError && error.code === "BACKEND_TEMPORARY_ERROR",
  );
  assert.equal(claimCalls.length, 1);

  const calls: CapturedRequest[] = [];
  const logger = new TestLogger();
  const client = new NexusBackendClient({
    apiUrl: "https://api.example.test",
    connectorVersion: "0.1.0",
    requestTimeoutMs: 1_000,
    logger,
    retryDelaysMs: [0],
    fetch: makeFetch(
      [
        response({ token: "nsmcp_s_xxxx", sessionId: "s", userId: "u", pollIntervalMs: 1, expiresInMs: 1 }),
        response({ message: "temporary" }, 503),
        response({ ok: true }),
      ],
      calls,
    ),
  });
  await client.claimPairing("ABCD");
  await client.ping({ mcpServerAvailable: true });
  assert.equal(calls.length, 3);
  assert.equal(logger.warnings.length, 1);
});

test("backend client revokes only the authenticated current session", async () => {
  const token = "nsmcp_session123_secret.value";
  const calls: CapturedRequest[] = [];
  const client = new NexusBackendClient({
    apiUrl: "https://api.example.test",
    connectorVersion: "0.1.0",
    requestTimeoutMs: 1_000,
    logger: new TestLogger(),
    fetch: makeFetch([
      response({ token, sessionId: "session123", userId: "user1", pollIntervalMs: 25, expiresInMs: 60_000 }),
      response({ ok: true }),
    ], calls),
  });

  await client.claimPairing("ABCD12");
  await client.revokeCurrentSession();

  assert.equal(calls[1]?.url, "https://api.example.test/api/studio/mcp/session/revoke");
  assert.equal(calls[1]?.init.method, "POST");
  assert.equal((calls[1]?.init.headers as Record<string, string>).Authorization, `Bearer ${token}`);
  assert.deepEqual(JSON.parse(String(calls[1]?.init.body)), {});
});

test("backend client rejects malformed JSON, malformed commands, and authentication failure", async () => {
  const malformed = new NexusBackendClient({
    apiUrl: "https://api.example.test",
    connectorVersion: "0.1.0",
    requestTimeoutMs: 1_000,
    logger: new TestLogger(),
    fetch: (async () => new Response("not json", { status: 200 })) as typeof fetch,
  });
  await assert.rejects(
    malformed.claimPairing("ABCD"),
    (error: unknown) => error instanceof ConnectorError && error.code === "BACKEND_RESPONSE_INVALID",
  );

  const queue = [
    response({ token: "nsmcp_s_xxxx", sessionId: "s", userId: "u", pollIntervalMs: 1, expiresInMs: 1 }),
    response({ command: { id: "1", type: "read_script", payload: "wrong" } }),
    response({ message: "expired" }, 401),
  ];
  const client = new NexusBackendClient({
    apiUrl: "https://api.example.test",
    connectorVersion: "0.1.0",
    requestTimeoutMs: 1_000,
    logger: new TestLogger(),
    retryDelaysMs: [0, 0],
    fetch: makeFetch(queue, []),
  });
  await client.claimPairing("ABCD");
  await assert.rejects(
    client.pollNext(1_000),
    (error: unknown) => error instanceof ConnectorError && error.code === "BACKEND_RESPONSE_INVALID",
  );
  await assert.rejects(
    client.ping({ mcpServerAvailable: true }),
    (error: unknown) => error instanceof ConnectorError && error.code === "CONNECTOR_AUTH_FAILED",
  );
});

test("oversized request bodies fail locally without a network retry", async () => {
  const calls: CapturedRequest[] = [];
  const client = new NexusBackendClient({
    apiUrl: "https://api.example.test",
    connectorVersion: "0.1.0",
    requestTimeoutMs: 1_000,
    logger: new TestLogger(),
    retryDelaysMs: [0, 0],
    fetch: makeFetch([
      response({ token: "nsmcp_s_xxxx", sessionId: "s", userId: "u", pollIntervalMs: 1, expiresInMs: 1 }),
    ], calls),
  });
  await client.claimPairing("ABCD");

  await assert.rejects(
    client.acknowledge("command-1", "succeeded", { success: true, output: "x".repeat(1_800_000) }),
    (error: unknown) => error instanceof ConnectorError && error.code === "BACKEND_REQUEST_TOO_LARGE",
  );
  assert.equal(calls.length, 1);
});
