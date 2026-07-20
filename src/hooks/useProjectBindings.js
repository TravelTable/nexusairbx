import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createProjectBinding,
  findOrCreateProjectBinding,
  listProjectBindings,
} from "../lib/projectBindingsApi";
import {
  buildProjectBindingPayloadFromIdentity,
  findProjectByPlaceId,
} from "../lib/studioPlaceBinding";

const STORAGE_KEY = "nexusrbx.selectedWorkspaceProjectId";

function readStoredProjectId() {
  try {
    return String(localStorage.getItem(STORAGE_KEY) || "").trim() || null;
  } catch (_) {
    return null;
  }
}

function writeStoredProjectId(projectId) {
  try {
    if (projectId) localStorage.setItem(STORAGE_KEY, projectId);
    else localStorage.removeItem(STORAGE_KEY);
  } catch (_) {
    /* ignore */
  }
}

export function useProjectBindings(user, { authReady = true } = {}) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedProjectId, setSelectedProjectIdState] = useState(() => readStoredProjectId());
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!authReady || !user?.uid) {
      setProjects([]);
      return [];
    }
    setLoading(true);
    setError(null);
    try {
      const result = await listProjectBindings({ limit: 50 });
      const next = Array.isArray(result?.projects) ? result.projects : [];
      setProjects(next);
      return next;
    } catch (err) {
      setError(err?.message || "Failed to load projects");
      setProjects([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [authReady, user?.uid]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setSelectedProjectId = useCallback((projectId) => {
    const next = String(projectId || "").trim() || null;
    setSelectedProjectIdState(next);
    writeStoredProjectId(next);
  }, []);

  const selectedProject = useMemo(
    () => projects.find((project) => project.projectId === selectedProjectId) || null,
    [projects, selectedProjectId]
  );

  useEffect(() => {
    if (!selectedProjectId || loading) return;
    if (projects.length && !projects.some((project) => project.projectId === selectedProjectId)) {
      setSelectedProjectId(null);
    }
  }, [loading, projects, selectedProjectId, setSelectedProjectId]);

  const adoptProject = useCallback((project) => {
    if (!project?.projectId) return null;
    setProjects((prev) => [project, ...prev.filter((entry) => entry.projectId !== project.projectId)]);
    setSelectedProjectId(project.projectId);
    return project;
  }, [setSelectedProjectId]);

  const createProject = useCallback(async (payload = {}) => {
    const result = await createProjectBinding(payload);
    return adoptProject(result?.project || null);
  }, [adoptProject]);

  /**
   * Open or create a workspace project from a resolved game identity.
   * Dedupes locally first, then asks the server to upsert by placeId.
   */
  const openGameProject = useCallback(async (identity = {}) => {
    const payload = buildProjectBindingPayloadFromIdentity(identity);
    const placeId = payload.placeId || payload.defaultPlaceId || null;
    if (placeId) {
      const existing = findProjectByPlaceId(projects, placeId);
      if (existing?.projectId) {
        setSelectedProjectId(existing.projectId);
        // Still upsert so Studio labels / title sync when not manually renamed.
        try {
          const result = await findOrCreateProjectBinding(payload);
          return adoptProject(result?.project || existing);
        } catch (_) {
          return existing;
        }
      }
    }
    const result = await findOrCreateProjectBinding(payload);
    return adoptProject(result?.project || null);
  }, [adoptProject, projects, setSelectedProjectId]);

  return {
    projects,
    loading,
    error,
    selectedProjectId,
    selectedProject,
    setSelectedProjectId,
    createProject,
    openGameProject,
    refresh,
  };
}
