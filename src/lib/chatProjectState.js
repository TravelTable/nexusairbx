import { computeArtifactRevision, computeContentHash } from "./artifactState";

function normalizePath(value, fallback = "") {
  return String(value || fallback).replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
}

function normalizePlacement(value, path = "") {
  return String(value || path.split("/")[0] || "ReplicatedStorage").trim() || "ReplicatedStorage";
}

function normalizeKind(value) {
  return String(value || "module").trim().toLowerCase() || "module";
}

function fallbackId(path, index = 0) {
  return `file_${computeContentHash(`${path}:${index}`)}`;
}

export function normalizeProjectFile(rawFile = {}, index = 0) {
  const path = normalizePath(
    rawFile.path,
    `${normalizePlacement(rawFile.placement)}/${rawFile.name || `Script${index + 1}`}`
  );
  const content = String(rawFile.content || rawFile.code || rawFile.source || "");
  const placement = normalizePlacement(rawFile.placement, path);
  const name = String(rawFile.name || path.split("/").filter(Boolean).pop() || `Script${index + 1}`);
  return {
    ...rawFile,
    id: String(rawFile.id || rawFile.fileId || fallbackId(path, index)),
    name,
    path,
    placement,
    kind: normalizeKind(rawFile.kind),
    language: String(rawFile.language || (normalizeKind(rawFile.kind) === "docs" ? "markdown" : "luau")),
    content,
    contentHash: String(rawFile.contentHash || computeContentHash(content)),
    status: rawFile.status || "generated",
  };
}

export function normalizeProjectArtifact(raw = {}, opts = {}) {
  const files = Array.isArray(raw.files) ? raw.files.map(normalizeProjectFile) : [];
  const artifactId = String(raw.artifactId || raw.projectId || raw.id || opts.artifactId || opts.id || "");
  const revision = String(raw.revision || computeArtifactRevision(files));
  return {
    ...raw,
    id: String(artifactId || raw.id || opts.id || "chat-project"),
    artifactId,
    projectId: raw.projectId || artifactId || null,
    title: String(raw.title || opts.title || "Chat Project"),
    summary: raw.summary || opts.summary || "",
    type: raw.type || raw.artifactType || "project",
    files,
    revision,
    updatedAt: raw.updatedAt || opts.updatedAt || Date.now(),
  };
}

function findFile(files, op, pathField = "path") {
  const id = String(op.id || op.fileId || "");
  const path = normalizePath(op[pathField]);
  return files.find((file) => (id && file.id === id) || (path && file.path === path)) || null;
}

export function applyProjectOperations(baseArtifact, operations = []) {
  const base = normalizeProjectArtifact(baseArtifact || { id: "chat-project", title: "Chat Project", files: [] });
  const files = base.files.map((file) => ({ ...file }));

  for (const op of operations || []) {
    if (!op || typeof op !== "object") continue;
    if (op.type === "rename" || op.event === "file_rename") {
      const existing = findFile(files, op, "fromPath");
      const toPath = normalizePath(op.toPath || op.path);
      if (!existing || !toPath) continue;
      existing.path = toPath;
      existing.name = toPath.split("/").filter(Boolean).pop() || existing.name;
      existing.placement = normalizePlacement(op.placement, toPath);
      continue;
    }

    if (op.type === "delete" || op.event === "file_delete") {
      const existing = findFile(files, op);
      if (!existing) continue;
      const index = files.findIndex((file) => file.id === existing.id);
      if (index >= 0) files.splice(index, 1);
      continue;
    }

    if (op.type === "upsert" || op.event === "file_ready" || op.content != null) {
      const path = normalizePath(op.path);
      if (!path) continue;
      const existing = findFile(files, op);
      const next = normalizeProjectFile({
        ...(existing || {}),
        id: op.id || op.fileId || existing?.id,
        name: op.name || existing?.name,
        path,
        placement: op.placement || existing?.placement,
        kind: op.kind || existing?.kind,
        language: op.language || existing?.language,
        purpose: op.purpose || existing?.purpose,
        content: op.content,
        status: op.status || existing?.status || "generated",
      }, files.length);
      if (existing) {
        const index = files.findIndex((file) => file.id === existing.id);
        files[index] = next;
      } else {
        files.push(next);
      }
    }
  }

  return normalizeProjectArtifact({
    ...base,
    files,
    revision: computeArtifactRevision(files),
  });
}

export function mergeFilesIntoProject(baseArtifact, incomingFiles = []) {
  const operations = (incomingFiles || []).map((file) => ({
    type: "upsert",
    id: file.id,
    path: file.path,
    placement: file.placement,
    kind: file.kind,
    language: file.language,
    purpose: file.purpose,
    content: file.content,
    status: file.status,
  }));
  return applyProjectOperations(baseArtifact, operations);
}

export function materializeProjectFromArtifacts(artifacts = []) {
  let current = null;
  for (const artifact of artifacts) {
    if (!artifact) continue;
    if (!current) {
      current = normalizeProjectArtifact({
        ...artifact,
        id: artifact.artifactId || artifact.projectId || artifact.id || "chat-project",
      });
      continue;
    }
    if (Array.isArray(artifact.operations) && artifact.operations.length) {
      current = applyProjectOperations(current, artifact.operations);
    }
    if (Array.isArray(artifact.files) && artifact.files.length) {
      current = mergeFilesIntoProject(current, artifact.files);
    }
    current = normalizeProjectArtifact({
      ...current,
      title: artifact.title || current.title,
      summary: artifact.summary || current.summary,
      updatedAt: artifact.updatedAt || Date.now(),
    });
  }
  return current;
}
