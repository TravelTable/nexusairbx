import { normalizeArtifactFile } from "./artifactState";

function buildFileSignature(file, index) {
  const normalized = normalizeArtifactFile(file, index);
  return {
    id: normalized.id,
    path: normalized.path,
    placement: normalized.placement,
    kind: normalized.kind,
    contentHash: normalized.contentHash,
  };
}

export function buildWorkspaceArtifactPersistKey(snapshot) {
  if (!snapshot?.artifactId) return "";
  const files = Array.isArray(snapshot.files)
    ? snapshot.files
      .map((file, index) => buildFileSignature(file, index))
      .sort((left, right) => `${left.path}:${left.id}`.localeCompare(`${right.path}:${right.id}`))
    : [];
  return JSON.stringify({
    artifactId: String(snapshot.artifactId || ""),
    revision: String(snapshot.revision || ""),
    files,
  });
}
