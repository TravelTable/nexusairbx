import { useEffect, useRef } from "react";
import { saveWorkspaceArtifact } from "../lib/artifactWorkspaceApi";
import { buildWorkspaceArtifactPersistKey } from "../lib/workspaceArtifactPersistence";

export function useWorkspaceArtifactPersistence(snapshot, {
  enabled = true,
  debounceMs = 400,
  source = "workspace",
  saveArtifact = saveWorkspaceArtifact,
} = {}) {
  const timerRef = useRef(null);
  const pendingKeyRef = useRef("");
  const inFlightKeysRef = useRef(new Set());
  const lastSavedKeyRef = useRef("");

  useEffect(() => {
    if (!enabled) return undefined;

    const nextKey = buildWorkspaceArtifactPersistKey(snapshot);
    if (!nextKey) return undefined;
    if (
      nextKey === pendingKeyRef.current ||
      nextKey === lastSavedKeyRef.current ||
      inFlightKeysRef.current.has(nextKey)
    ) {
      return undefined;
    }

    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
      pendingKeyRef.current = "";
    }

    pendingKeyRef.current = nextKey;
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      pendingKeyRef.current = "";
      inFlightKeysRef.current.add(nextKey);
      Promise.resolve(saveArtifact(snapshot, source))
        .then(() => {
          lastSavedKeyRef.current = nextKey;
        })
        .catch(() => {})
        .finally(() => {
          inFlightKeysRef.current.delete(nextKey);
        });
    }, debounceMs);

    return () => {
      if (pendingKeyRef.current === nextKey && timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
        pendingKeyRef.current = "";
      }
    };
  }, [debounceMs, enabled, saveArtifact, snapshot, source]);
}

export default useWorkspaceArtifactPersistence;
