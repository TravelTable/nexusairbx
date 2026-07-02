import { authedFetch } from "./billing";

function buildDecalUploadForm({ files = [], items = [], requestId, projectId } = {}) {
  const form = new FormData();
  files.forEach((file) => {
    form.append("files", file, file.name);
  });
  form.append("items", JSON.stringify(items));
  form.append("requestId", requestId || "");
  if (projectId) form.append("projectId", String(projectId));
  return form;
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

function createUploadError(payload, status) {
  const error = new Error(payload?.error || `Roblox decal upload failed (${status})`);
  error.code = payload?.code || null;
  error.status = status;
  error.details = payload?.details || null;
  return error;
}

export async function uploadRobloxDecalBatch({ files = [], items = [], requestId, projectId } = {}) {
  const response = await authedFetch("/api/roblox/decal-uploads", {
    method: "POST",
    body: buildDecalUploadForm({ files, items, requestId, projectId }),
  });
  const payload = await response.json().catch(async () => ({
    error: await response.text().catch(() => ""),
  }));

  if (!response.ok) {
    throw createUploadError(payload, response.status);
  }

  return payload;
}

export async function uploadRobloxDecalBatchStream({
  files = [],
  items = [],
  requestId,
  projectId,
  onProgress,
  signal,
} = {}) {
  const response = await authedFetch("/api/roblox/decal-uploads?stream=1", {
    method: "POST",
    headers: { Accept: "text/event-stream" },
    body: buildDecalUploadForm({ files, items, requestId, projectId }),
    signal,
  });

  if (!response.ok || !response.body) {
    const payload = await response.json().catch(async () => ({
      error: await response.text().catch(() => ""),
    }));
    throw createUploadError(payload, response.status);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let completePayload = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parsed = parseSseChunk(buffer);
    buffer = parsed.rest;
    for (const evt of parsed.events) {
      if (evt.event === "progress") {
        onProgress?.(evt.data);
      } else if (evt.event === "complete") {
        completePayload = evt.data;
      } else if (evt.event === "error") {
        throw createUploadError(evt.data, evt.data?.status || response.status);
      }
    }
  }

  if (!completePayload) {
    throw new Error("Roblox decal upload stream ended without a completion event");
  }

  return completePayload;
}
