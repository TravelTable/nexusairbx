import { useCallback, useEffect, useMemo, useState } from "react";
import {
  deleteProjectBinding,
  findOrCreateProjectBinding,
  listProjectBindings,
} from "../lib/projectBindingsApi";
import {
  buildProjectBindingPayloadFromIdentity,
  findProjectByPlaceId,
} from "../lib/studioPlaceBinding";
import { normalizeRobloxPlaceId } from "../lib/robloxPlaceId";

export function useProjectBindings(user, { authReady = true } = {}) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedProjectId, setSelectedProjectIdState] = useState(null);
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

  const deleteProject = useCallback(async (projectId) => {
    const result = await deleteProjectBinding(projectId);
    setProjects((prev) => prev.filter((project) => project.projectId !== projectId));
    setSelectedProjectIdState((current) => current === projectId ? null : current);
    return result;
  }, []);

  /**
   * Open or create a workspace project from a resolved game identity.
   * Dedupes locally first, then asks the server to upsert by placeId.
   */
  const openGameProject = useCallback(async (identity = {}) => {
    const payload = buildProjectBindingPayloadFromIdentity(identity);
    const placeId = normalizeRobloxPlaceId(payload.placeId || payload.defaultPlaceId);
    const universeId = payload.universeId || null;
    if (!/^\d+$/.test(String(placeId || ""))
      || !/^\d+$/.test(String(universeId || "")) || String(universeId) === "0") {
      throw new Error("A published Studio place and universe are required to create a game project.");
    }
    if (placeId) {
      const existing = findProjectByPlaceId(projects, placeId);
      if (existing?.projectId) {
        setSelectedProjectId(existing.projectId);
        // Still upsert so Studio labels / title sync when not manually renamed.
        const result = await findOrCreateProjectBinding(payload);
        return adoptProject(result?.project || existing);
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
    deleteProject,
    openGameProject,
    refresh,
  };
}
