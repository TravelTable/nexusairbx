const IDENTITY_FIELDS = [
  ["requestId", "request"],
  ["runId", "run"],
  ["jobId", "job"],
  ["id", "message"],
];

function identityValue(value) {
  if (value == null) return "";
  return String(value).trim();
}

/**
 * Returns the stable identity for one assistant turn. Keyless turns intentionally
 * return null so concurrent legacy rows cannot be merged by position or content.
 */
export function getAssistantTurnIdentity(turn) {
  if (!turn || typeof turn !== "object") return null;
  for (const [field, namespace] of IDENTITY_FIELDS) {
    const value = identityValue(turn[field]);
    if (value) return `${namespace}:${value}`;
  }
  return null;
}

function nonEmpty(value) {
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return value != null;
}

function itemKey(item) {
  if (!item || typeof item !== "object") return null;
  if (nonEmpty(item.id)) return `id:${item.id}`;
  if (nonEmpty(item.path)) return `path:${item.path}`;
  if (nonEmpty(item.name)) return `name:${item.name}`;
  return null;
}

function mergeCollections(supplemental = [], preferred = []) {
  const merged = [];
  const positions = new Map();
  for (const item of [...supplemental, ...preferred]) {
    const key = itemKey(item);
    if (key && positions.has(key)) {
      merged[positions.get(key)] = item;
    } else {
      if (key) positions.set(key, merged.length);
      merged.push(item);
    }
  }
  return merged;
}

function activityScore(streamState) {
  if (!streamState || typeof streamState !== "object") return 0;
  return (
    (Array.isArray(streamState.activity) ? streamState.activity.length : 0) * 10 +
    (Array.isArray(streamState.files) ? streamState.files.length : 0) * 5 +
    (nonEmpty(streamState.rawReasoning) ? 1 : 0) +
    (nonEmpty(streamState.explanation) ? 1 : 0)
  );
}

function mergeStreamState(supplemental, preferred) {
  if (!supplemental) return preferred || null;
  if (!preferred) return supplemental;

  // The selected turn owns scalar stream fields (stage, status, active file),
  // while both sources contribute activity and file updates. This keeps the
  // runtime/generation snapshot authoritative once it starts without dropping
  // useful orchestration events that arrived first.
  const merged = { ...supplemental, ...preferred };
  const activity = mergeCollections(supplemental.activity, preferred.activity);
  const files = mergeCollections(supplemental.files, preferred.files);

  if (activity.length) merged.activity = activity;
  if (files.length) merged.files = files;
  if (Number.isFinite(Number(supplemental.activitySeq)) || Number.isFinite(Number(preferred.activitySeq))) {
    merged.activitySeq = Math.max(Number(supplemental.activitySeq) || 0, Number(preferred.activitySeq) || 0);
  }
  return merged;
}

function sourcePriority(source) {
  return source === "generation" || source === "runtime" ? 2 : 1;
}

function turnRichness(turn) {
  if (!turn || typeof turn !== "object") return 0;
  return (
    activityScore(turn.streamState) +
    (Array.isArray(turn.steps) ? turn.steps.length * 5 : 0) +
    (Array.isArray(turn.files) ? turn.files.length * 5 : 0) +
    (nonEmpty(turn.content) ? 2 : 0) +
    (nonEmpty(turn.targetSelection) ? 2 : 0) +
    (nonEmpty(turn.runId) ? 1 : 0) +
    (nonEmpty(turn.jobId) ? 1 : 0)
  );
}

function preferredCandidate(current, incoming) {
  const currentSource = sourcePriority(current.source);
  const incomingSource = sourcePriority(incoming.source);
  if (currentSource !== incomingSource) {
    return incomingSource > currentSource ? incoming : current;
  }
  return turnRichness(incoming.turn) > turnRichness(current.turn) ? incoming : current;
}

function mergeTurns(preferred, supplemental) {
  const merged = { ...supplemental, ...preferred };
  for (const field of [
    "prompt",
    "stage",
    "streamState",
    "steps",
    "files",
    "runId",
    "jobId",
    "targetSelection",
    "content",
    "type",
  ]) {
    if (!nonEmpty(preferred[field]) && nonEmpty(supplemental[field])) {
      merged[field] = supplemental[field];
    }
  }

  merged.streamState = mergeStreamState(supplemental.streamState, preferred.streamState);
  for (const field of ["steps", "files"]) {
    const values = mergeCollections(supplemental[field], preferred[field]);
    if (values.length) merged[field] = values;
  }
  return merged;
}

/**
 * Reconciles entries for one assistant turn without merging keyless rows.
 * Candidates may optionally declare `source: "generation" | "runtime"` so a
 * live generation row remains the rendering owner after generation begins.
 */
export function reconcileAssistantTurns(candidates = []) {
  const output = [];
  const positions = new Map();

  for (const candidate of candidates) {
    const turn = candidate?.turn || candidate;
    if (!turn || typeof turn !== "object") continue;
    const source = candidate?.turn ? candidate.source : null;
    const key = getAssistantTurnIdentity(turn);
    if (!key) {
      output.push({ turn, source });
      continue;
    }

    const position = positions.get(key);
    const incoming = { turn, source };
    if (position == null) {
      positions.set(key, output.length);
      output.push(incoming);
      continue;
    }

    const current = output[position];
    const preferred = preferredCandidate(current, incoming);
    const supplemental = preferred === current ? incoming : current;
    output[position] = {
      turn: mergeTurns(preferred.turn, supplemental.turn),
      source: preferred.source,
    };
  }

  return output.map(({ turn }) => turn);
}
