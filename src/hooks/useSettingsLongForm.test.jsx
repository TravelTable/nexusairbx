import { act, renderHook } from "@testing-library/react";
import { useSettingsLongForm } from "./useSettingsLongForm";

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

test("an earlier save cannot mark a draft clean after the user edits it again", async () => {
  const deferredSave = createDeferred();
  const saveSettings = jest.fn(() => deferredSave.promise);
  const { result } = renderHook(() => useSettingsLongForm({
    settings: { codingStandards: "", gameSpec: "" },
    userId: "user_1",
    saveSettings,
  }));

  act(() => {
    result.current.updateLongFormField("gameSpec", "Submitted snapshot");
  });

  let savePromise;
  act(() => {
    savePromise = result.current.saveLongForm();
  });
  expect(saveSettings).toHaveBeenCalledWith({
    codingStandards: "",
    gameSpec: "Submitted snapshot",
  });

  act(() => {
    result.current.updateLongFormField("gameSpec", "Edited while saving");
  });
  expect(result.current.longForm.gameSpec).toBe("Edited while saving");
  expect(result.current.longFormEdited).toBe(true);

  await act(async () => {
    deferredSave.resolve({ ok: true, settings: { gameSpec: "Submitted snapshot" } });
    await savePromise;
  });

  expect(result.current.longForm.gameSpec).toBe("Edited while saving");
  expect(result.current.longFormEdited).toBe(true);
  expect(result.current.longFormDirty).toBe(true);
});
