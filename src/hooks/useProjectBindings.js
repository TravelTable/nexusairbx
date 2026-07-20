import { useCallback, useEffect, useMemo, useState } from "react";
import { createProjectBinding, listProjectBindings } from "../lib/projectBindingsApi";

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

  const createProject = useCallback(async (payload = {}) => {
    const result = await createProjectBinding(payload);
    const project = result?.project || null;
    if (project?.projectId) {
      setProjects((prev) => [project, ...prev.filter((entry) => entry.projectId !== project.projectId)]);
      setSelectedProjectId(project.projectId);
    }
    return project;
  }, [setSelectedProjectId]);

  return {
    projects,
    loading,
    error,
    selectedProjectId,
    selectedProject,
    setSelectedProjectId,
    createProject,
    refresh,
  };
}
