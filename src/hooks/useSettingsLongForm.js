import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function settingsDraft(settings = {}) {
  return {
    codingStandards: settings.codingStandards || "",
    gameSpec: settings.gameSpec || "",
  };
}

function draftsMatch(left, right) {
  return (
    left.codingStandards === right.codingStandards
    && left.gameSpec === right.gameSpec
  );
}

export function useSettingsLongForm({ settings, userId, saveSettings }) {
  const identityKey = String(userId || "signed-out");
  const codingStandards = settings?.codingStandards || "";
  const gameSpec = settings?.gameSpec || "";
  const settingsSnapshot = useMemo(
    () => settingsDraft({ codingStandards, gameSpec }),
    [codingStandards, gameSpec]
  );
  const [longForm, setLongForm] = useState(settingsSnapshot);
  const [longFormEdited, setLongFormEdited] = useState(false);
  const longFormRef = useRef(longForm);
  const settingsSnapshotRef = useRef(settingsSnapshot);
  const identityRef = useRef(identityKey);
  const revisionRef = useRef(0);

  settingsSnapshotRef.current = settingsSnapshot;

  useEffect(() => {
    const identityChanged = identityRef.current !== identityKey;
    if (!identityChanged && longFormEdited) return;

    if (identityChanged) {
      identityRef.current = identityKey;
      revisionRef.current += 1;
      setLongFormEdited(false);
    }
    longFormRef.current = settingsSnapshot;
    setLongForm((current) => (draftsMatch(current, settingsSnapshot) ? current : settingsSnapshot));
  }, [
    identityKey,
    longFormEdited,
    settingsSnapshot,
  ]);

  const updateLongFormField = useCallback((field, value) => {
    if (field !== "codingStandards" && field !== "gameSpec") return;
    const current = longFormRef.current;
    const nextValue = String(value ?? "");
    if (current[field] === nextValue) return;

    const next = { ...current, [field]: nextValue };
    revisionRef.current += 1;
    longFormRef.current = next;
    setLongForm(next);
    setLongFormEdited(!draftsMatch(next, settingsSnapshotRef.current));
  }, []);

  const saveLongForm = useCallback(async () => {
    const submittedDraft = { ...longFormRef.current };
    const submittedRevision = revisionRef.current;
    const submittedIdentity = identityRef.current;
    const result = await saveSettings(submittedDraft);

    if (
      result?.ok
      && identityRef.current === submittedIdentity
      && revisionRef.current === submittedRevision
      && draftsMatch(longFormRef.current, submittedDraft)
    ) {
      setLongFormEdited(false);
    }
    return result;
  }, [saveSettings]);

  const identityMatches = identityRef.current === identityKey;
  const visibleLongForm = identityMatches ? longForm : settingsSnapshot;
  const visibleEdited = identityMatches ? longFormEdited : false;
  const longFormDirty = visibleEdited && !draftsMatch(visibleLongForm, settingsSnapshot);

  return {
    longForm: visibleLongForm,
    longFormEdited: visibleEdited,
    longFormDirty,
    saveLongForm,
    updateLongFormField,
  };
}
