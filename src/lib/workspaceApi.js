import { authedFetch } from "./billing";

async function readJsonOrThrow(res, fallbackMessage) {
  const text = await res.text().catch(() => "");
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (_) {
    data = null;
  }
  if (!res.ok) {
    throw new Error(data?.error || text || fallbackMessage);
  }
  return data || {};
}

export async function createWorkspaceCommand({
  runId = "default",
  command,
  cwd = "",
  timeoutMs,
  outputLimit,
  env = {},
  network = false,
}) {
  const res = await authedFetch("/api/workspace/commands", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ runId, command, cwd, timeoutMs, outputLimit, env, network }),
  });
  return readJsonOrThrow(res, "Failed to start workspace command");
}

export async function getWorkspaceCommand(commandId) {
  const res = await authedFetch(`/api/workspace/commands/${encodeURIComponent(commandId)}`, {
    method: "GET",
    noCache: true,
    headers: { Accept: "application/json" },
  });
  return readJsonOrThrow(res, "Failed to load workspace command");
}

export async function cancelWorkspaceCommand(commandId) {
  const res = await authedFetch(`/api/workspace/commands/${encodeURIComponent(commandId)}/cancel`, {
    method: "POST",
    headers: { Accept: "application/json" },
  });
  return readJsonOrThrow(res, "Failed to cancel workspace command");
}

function parseSseChunk(buffer) {
  const events = [];
  let rest = buffer;
  while (true) {
    const boundary = rest.indexOf("\n\n");
    if (boundary === -1) break;
    const raw = rest.slice(0, boundary);
    rest = rest.slice(boundary + 2);
    const lines = raw.split(/\r?\n/);
    let event = "message";
    let data = "";
    lines.forEach((line) => {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      if (line.startsWith("data:")) data += `${line.slice(5).trim()}\n`;
    });
    const payloadText = data.trim();
    let payload = null;
    try {
      payload = payloadText ? JSON.parse(payloadText) : {};
    } catch (_) {
      payload = { raw: payloadText };
    }
    events.push({ event, data: payload });
  }
  return { events, rest };
}

export async function streamWorkspaceCommandEvents(commandId, { afterSeq = 0, onEvent, signal } = {}) {
  const res = await authedFetch(
    `/api/workspace/commands/${encodeURIComponent(commandId)}/events?afterSeq=${encodeURIComponent(afterSeq)}`,
    {
      method: "GET",
      headers: { Accept: "text/event-stream" },
      signal,
    }
  );
  if (!res.ok || !res.body) {
    throw new Error("Failed to stream workspace command events");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parsed = parseSseChunk(buffer);
    buffer = parsed.rest;
    for (const evt of parsed.events) {
      onEvent?.(evt);
    }
  }
}
