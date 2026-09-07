const KINDS = new Set(["file", "asset", "change", "test"]);
const equalScope = (a, b) => ["chatId", "projectId", "taskId", "runId"].every(key => a?.[key] === b?.[key]);

function createBuildWorkspaceState(scope) {
  for (const key of ["chatId", "projectId", "taskId", "runId"]) {
    if (typeof scope?.[key] !== "string" || !scope[key]) throw new TypeError(`Missing ${key}`);
  }
  return { scope: { ...scope }, sequence: 0, items: {}, phase: "accepted", connection: "connected" };
}

function safeItem(item) {
  if (!item || !KINDS.has(item.kind) || typeof item.id !== "string" || !item.id
    || typeof item.revision !== "string" || !item.revision) throw new TypeError("Invalid workspace item");
  // Events carry references and metadata. Source comes from an authorized,
  // versioned file read; it is not smuggled into the conversation stream.
  const result = { id: item.id, kind: item.kind, revision: item.revision };
  for (const key of ["artifactId", "path", "name", "status", "className", "thumbnailUrl", "message"]) {
    if (typeof item[key] === "string") result[key] = item[key];
  }
  if (Array.isArray(item.revisions)) result.revisions = [...new Set(item.revisions.filter(value => typeof value === "string" && value))];
  if (item.kind === "test") {
    if (typeof item.detail === "string") result.detail = item.detail;
    if (Array.isArray(item.manualSteps)) result.manualSteps = item.manualSteps.filter(value => typeof value === "string" && value.trim());
  }
  return result;
}

function reduceBuildWorkspace(state, event) {
  if (!state || !event || !equalScope(state.scope, event.scope)) return state;
  if (!Number.isSafeInteger(event.sequence) || event.sequence < 1 || event.sequence <= state.sequence) return state;
  if (event.type !== "snapshot" && event.sequence !== state.sequence + 1) {
    return { ...state, connection: "reconciling" }; // Request canonical snapshot; never skip a gap silently.
  }
  if (event.type === "snapshot") {
    if (!Array.isArray(event.items)) throw new TypeError("Invalid workspace snapshot");
    const items = {};
    for (const input of event.items) {
      const item = safeItem(input);
      if (Object.hasOwn(items, item.id)) throw new TypeError("Duplicate workspace item");
      Object.defineProperty(items, item.id, { value: item, enumerable: true, configurable: true, writable: true });
    }
    return { ...state, sequence: event.sequence, items, phase: event.phase || state.phase, connection: "connected" };
  }
  if (event.type === "upsert") {
    const item = safeItem(event.item);
    return { ...state, sequence: event.sequence, items: { ...state.items, [item.id]: item }, connection: "connected" };
  }
  if (event.type === "remove") {
    const items = { ...state.items }; delete items[event.itemId];
    return { ...state, sequence: event.sequence, items, connection: "connected" };
  }
  if (event.type === "phase") {
    return { ...state, sequence: event.sequence, phase: event.phase || state.phase, connection: "connected" };
  }
  return { ...state, connection: "reconciling" };
}

module.exports = { createBuildWorkspaceState, reduceBuildWorkspace };
