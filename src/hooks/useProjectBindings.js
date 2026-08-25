import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createProjectBinding,
  deleteProjectBinding,
  findOrCreateProjectBinding,
  listProjectBindings,
  renameProjectBinding,
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
  const requestedUserId = authReady ? (user?.uid || null) : null;
  const refreshRequestRef = useRef(0);
  const loadedUserIdRef = useRef(requestedUserId);
  const authEpochRef = useRef({ requestedUserId, epoch: 0 });
  const operationEpochRef = useRef(0);
  // A completed mutation is newer than every list snapshot that began before it.
  const stateWriteEpochRef = useRef(0);
  const latestOperationByKeyRef = useRef(new Map());

  if (authEpochRef.current.requestedUserId !== requestedUserId) {
    authEpochRef.current = {
      requestedUserId,
      epoch: authEpochRef.current.epoch + 1,
    };
    latestOperationByKeyRef.current.clear();
  }

  const captureAuthSnapshot = useCallback(() => ({ ...authEpochRef.current }), []);
  const isCurrentAuthSnapshot = useCallback((snapshot) => (
    snapshot?.requestedUserId === authEpochRef.current.requestedUserId
    && snapshot?.epoch === authEpochRef.current.epoch
  ), []);
  const beginMutation = useCallback((operationKey) => {
    const auth = captureAuthSnapshot();
    const key = String(operationKey || "project-mutation");
    const operationEpoch = operationEpochRef.current + 1;
    operationEpochRef.current = operationEpoch;
    latestOperationByKeyRef.current.set(key, operationEpoch);
    return {
      requestedUserId: auth.requestedUserId,
      authEpoch: auth.epoch,
      operationKey: key,
      operationEpoch,
    };
  }, [captureAuthSnapshot]);
  const isCurrentMutation = useCallback((operation) => (
    Boolean(operation?.requestedUserId)
    && operation.requestedUserId === authEpochRef.current.requestedUserId
    && operation?.authEpoch === authEpochRef.current.epoch
    && latestOperationByKeyRef.current.get(operation?.operationKey) === operation?.operationEpoch
  ), []);

  const projectsBelongToCurrentUser = loadedUserIdRef.current === requestedUserId;
  const visibleProjects = useMemo(
    () => projectsBelongToCurrentUser ? projects : [],
    [projects, projectsBelongToCurrentUser]
  );
  const visibleSelectedProjectId = projectsBelongToCurrentUser ? selectedProjectId : null;

  const refresh = useCallback(async () => {
    const requestId = refreshRequestRef.current + 1;
    refreshRequestRef.current = requestId;
    const authSnapshot = captureAuthSnapshot();
    const stateWriteEpoch = stateWriteEpochRef.current;
    if (!authReady || !user?.uid) {
      loadedUserIdRef.current = null;
      setProjects([]);
      setSelectedProjectIdState(null);
      setLoading(false);
      setError(null);
      return [];
    }
    setLoading(true);
    setError(null);
    try {
      const result = await listProjectBindings({ limit: 100 });
      const next = Array.isArray(result?.projects) ? result.projects : [];
      if (
        refreshRequestRef.current !== requestId
        || !isCurrentAuthSnapshot(authSnapshot)
        || stateWriteEpochRef.current !== stateWriteEpoch
      ) return [];
      loadedUserIdRef.current = user.uid;
      setProjects(next);
      return next;
    } catch (err) {
      if (
        refreshRequestRef.current !== requestId
        || !isCurrentAuthSnapshot(authSnapshot)
        || stateWriteEpochRef.current !== stateWriteEpoch
      ) return [];
      loadedUserIdRef.current = user.uid;
      setError(err?.message || "Failed to load projects");
      setProjects([]);
      return [];
    } finally {
      if (refreshRequestRef.current === requestId && isCurrentAuthSnapshot(authSnapshot)) {
        setLoading(false);
      }
    }
  }, [authReady, captureAuthSnapshot, isCurrentAuthSnapshot, user?.uid]);

  useEffect(() => {
    refresh();
    return () => {
      refreshRequestRef.current += 1;
    };
  }, [refresh]);

  useEffect(() => {
    setSelectedProjectIdState(null);
  }, [requestedUserId]);

  const setSelectedProjectId = useCallback((projectId) => {
    const next = String(projectId || "").trim() || null;
    setSelectedProjectIdState(next);
  }, []);

  const selectedProject = useMemo(
    () => visibleProjects.find((project) => project.projectId === visibleSelectedProjectId) || null,
    [visibleProjects, visibleSelectedProjectId]
  );

  useEffect(() => {
    if (!visibleSelectedProjectId || loading) return;
    if (!visibleProjects.some((project) => project.projectId === visibleSelectedProjectId)) {
      setSelectedProjectId(null);
    }
  }, [loading, setSelectedProjectId, visibleProjects, visibleSelectedProjectId]);

  const adoptProject = useCallback((project, operation) => {
    if (!project?.projectId || !isCurrentMutation(operation)) return null;
    stateWriteEpochRef.current += 1;
    setProjects((prev) => {
      if (!isCurrentMutation(operation)) return prev;
      loadedUserIdRef.current = operation.requestedUserId;
      return [project, ...prev.filter((entry) => entry.projectId !== project.projectId)];
    });
    setSelectedProjectIdState((current) => (
      isCurrentMutation(operation) ? project.projectId : current
    ));
    return project;
  }, [isCurrentMutation]);

  const deleteProject = useCallback(async (projectId) => {
    const operation = beginMutation(`project:${String(projectId || "").trim()}`);
    const result = await deleteProjectBinding(projectId);
    if (!isCurrentMutation(operation)) return null;
    stateWriteEpochRef.current += 1;
    setProjects((prev) => (
      isCurrentMutation(operation)
        ? prev.filter((project) => project.projectId !== projectId)
        : prev
    ));
    setSelectedProjectIdState((current) => (
      isCurrentMutation(operation) && current === projectId ? null : current
    ));
    return result;
  }, [beginMutation, isCurrentMutation]);

  const createProject = useCallback(async (title) => {
    const operation = beginMutation("project:create");
    const result = await createProjectBinding({ title });
    return adoptProject(result?.project || null, operation);
  }, [adoptProject, beginMutation]);

  const renameProject = useCallback(async (projectId, title) => {
    const operation = beginMutation(`project:${String(projectId || "").trim()}`);
    const result = await renameProjectBinding(projectId, title);
    const renamed = result?.project;
    if (!isCurrentMutation(operation)) return null;
    if (renamed?.projectId) {
      stateWriteEpochRef.current += 1;
      setProjects((prev) => prev.map((project) => (
        isCurrentMutation(operation) && project.projectId === renamed.projectId
          ? { ...project, ...renamed }
          : project
      )));
    }
    return renamed;
  }, [beginMutation, isCurrentMutation]);

  /**
   * Open or create a workspace project from a resolved game identity.
   * Dedupes locally first, then asks the server to upsert by published place
   * identity or opaque live Studio target identity.
   */
  const openGameProject = useCallback(async (identity = {}) => {
    const payload = buildProjectBindingPayloadFromIdentity(identity);
    const placeId = normalizeRobloxPlaceId(payload.placeId || payload.defaultPlaceId);
    const universeId = payload.universeId || null;
    const studioTargetId = String(payload.studioTargetId || "").trim() || null;
    const hasPublishedIdentity = /^\d+$/.test(String(placeId || ""))
      && /^\d+$/.test(String(universeId || ""))
      && String(universeId) !== "0";
    if (!studioTargetId && !hasPublishedIdentity) {
      throw new Error("A live Studio target or published place is required to create a game project.");
    }
    const existing = (placeId && findProjectByPlaceId(visibleProjects, placeId))
      || (studioTargetId && visibleProjects.find((project) => (
        String(project?.studioTargetId || "").trim() === studioTargetId
      )))
      || null;
    const operation = beginMutation(existing?.projectId
      ? `project:${existing.projectId}`
      : (hasPublishedIdentity ? `place:${placeId}` : `studio-target:${studioTargetId}`));
    if (existing?.projectId) {
      setSelectedProjectIdState((current) => (
        isCurrentMutation(operation) ? existing.projectId : current
      ));
      // Still upsert so Studio labels / title sync when not manually renamed.
      const result = await findOrCreateProjectBinding(payload);
      return adoptProject(result?.project || existing, operation);
    }
    const result = await findOrCreateProjectBinding(payload);
    return adoptProject(result?.project || null, operation);
  }, [adoptProject, beginMutation, isCurrentMutation, visibleProjects]);

  return {
    projects: visibleProjects,
    loading,
    error,
    selectedProjectId: visibleSelectedProjectId,
    selectedProject,
    setSelectedProjectId,
    createProject,
    deleteProject,
    renameProject,
    openGameProject,
    refresh,
  };
}
