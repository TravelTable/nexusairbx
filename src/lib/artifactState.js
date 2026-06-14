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

export function normalizeArtifactFile(rawFile = {}, index = 0) {
  const path = String(rawFile.path || `${rawFile.placement || "ReplicatedStorage"}/${rawFile.name || `Script${index + 1}`}`)
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "");
  const content = String(rawFile.content || "");
  return {
    id: String(rawFile.id || `file_${stableHash(`${path}:${index}`)}`),
    name: String(rawFile.name || path.split("/").filter(Boolean).pop() || `Script${index + 1}`),
    path,
    placement: String(rawFile.placement || path.split("/")[0] || "ReplicatedStorage"),
    kind: String(rawFile.kind || "module"),
    content,
    contentHash: String(rawFile.contentHash || computeContentHash(content)),
  };
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
      contentHash: file.contentHash,
    }));
  return stableHash(JSON.stringify(sorted));
}

export function buildBaseArtifactSnapshot(artifact) {
  if (!artifact) return null;
  const files = Array.isArray(artifact.files)
    ? artifact.files.map((file, index) => normalizeArtifactFile(file, index))
    : [];
  return {
    artifactId: String(artifact.projectId || artifact.artifactId || artifact.id || ""),
    revision: String(artifact.revision || computeArtifactRevision(files)),
    title: String(artifact.title || "Generated Artifact"),
    files,
  };
}
