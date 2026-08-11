function stableHash(input) {
  const str = String(input || "");
  let hash = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function computeContentHash(content) {
  return stableHash(String(content || ""));
}

function cloneOptional(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

export function normalizeArtifactFile(rawFile = {}, index = 0) {
  const path = String(rawFile.path || `${rawFile.placement || "ReplicatedStorage"}/${rawFile.name || `Script${index + 1}`}`)
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "");
  const content = String(rawFile.content || "");
  const normalized = {
    id: String(rawFile.id || `file_${stableHash(`${path}:${index}`)}`),
    name: String(rawFile.name || path.split("/").filter(Boolean).pop() || `Script${index + 1}`),
    path,
    placement: String(rawFile.placement || path.split("/")[0] || "ReplicatedStorage"),
    kind: String(rawFile.kind || "module"),
    content,
    // The content crossing the Studio boundary is authoritative. Recompute its
    // hash instead of trusting a generation-time hash that may predate editor
    // changes or project merges.
    contentHash: computeContentHash(content),
  };
  const optionalFields = {
    className: rawFile.className,
    language: rawFile.language,
    purpose: rawFile.purpose,
    dependencies: cloneOptional(rawFile.dependencies),
    warnings: cloneOptional(rawFile.warnings),
    validation: cloneOptional(rawFile.validation),
    status: rawFile.status,
    allowClassChange: rawFile.allowClassChange === true ? true : undefined,
    inspectedClassName: rawFile.inspectedClassName,
    expectedSourceHash: rawFile.expectedSourceHash,
  };
  Object.entries(optionalFields).forEach(([key, value]) => {
    if (value !== undefined) normalized[key] = value;
  });
  return normalized;
}

export function computeArtifactRevision(files = []) {
  const sorted = [...files]
    .map((file, index) => normalizeArtifactFile(file, index))
    .sort((a, b) => `${a.path}:${a.id}`.localeCompare(`${b.path}:${b.id}`))
    .map((file) => ({
      id: file.id,
      path: file.path,
      placement: file.placement,
      kind: file.kind,
      className: file.className || null,
      contentHash: file.contentHash,
    }));
  return stableHash(JSON.stringify(sorted));
}

export function buildBaseArtifactSnapshot(artifact) {
  if (!artifact) return null;
  const files = Array.isArray(artifact.files)
    ? artifact.files.map((file, index) => normalizeArtifactFile(file, index))
    : [];
  const snapshot = {
    artifactId: String(artifact.projectId || artifact.artifactId || artifact.id || ""),
    revision: computeArtifactRevision(files),
    title: String(artifact.title || "Generated Artifact"),
    files,
  };
  if (artifact.revision && String(artifact.revision) !== snapshot.revision) {
    snapshot.sourceRevision = String(artifact.revision);
  }
  const optionalFields = {
    summary: artifact.summary,
    metadata: cloneOptional(artifact.metadata),
    warnings: cloneOptional(artifact.warnings),
    setupSteps: cloneOptional(artifact.setupSteps),
    testingSteps: cloneOptional(artifact.testingSteps),
    securityNotes: cloneOptional(artifact.securityNotes),
    operations: cloneOptional(artifact.operations),
    lintWarning: artifact.lintWarning,
    qaReport: cloneOptional(artifact.qaReport),
  };
  Object.entries(optionalFields).forEach(([key, value]) => {
    if (value !== undefined) snapshot[key] = value;
  });
  return snapshot;
}
