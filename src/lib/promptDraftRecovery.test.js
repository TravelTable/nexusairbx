import {
  isOutcomeUnknownSubmissionError,
  restoreFailedPromptDraft,
} from "./promptDraftRecovery";

describe("isOutcomeUnknownSubmissionError", () => {
  test("distinguishes recovery from deterministic pre-launch failure", () => {
    expect(isOutcomeUnknownSubmissionError({ code: "OPERATION_RECOVERY_PENDING" })).toBe(true);
    expect(isOutcomeUnknownSubmissionError({ category: "outcome_unknown" })).toBe(true);
    expect(isOutcomeUnknownSubmissionError({ outcomeUnknown: true })).toBe(true);
    expect(isOutcomeUnknownSubmissionError({ code: "VALIDATION_FAILED" })).toBe(false);
  });
});

describe("restoreFailedPromptDraft", () => {
  test("restores a cleared prompt and attachments after a failed submission", () => {
    let prompt = "";
    let attachments = [];
    const originalAttachments = [{ name: "script.lua" }];

    restoreFailedPromptDraft({
      prompt: "Inspect the current place",
      attachments: originalAttachments,
      setPrompt: (update) => { prompt = update(prompt); },
      setAttachments: (update) => { attachments = update(attachments); },
    });

    expect(prompt).toBe("Inspect the current place");
    expect(attachments).toEqual(originalAttachments);
  });

  test("does not overwrite a newer draft or newer attachments", () => {
    let prompt = "Newer draft";
    let attachments = [{ name: "new.lua" }];

    restoreFailedPromptDraft({
      prompt: "Old draft",
      attachments: [{ name: "old.lua" }],
      setPrompt: (update) => { prompt = update(prompt); },
      setAttachments: (update) => { attachments = update(attachments); },
    });

    expect(prompt).toBe("Newer draft");
    expect(attachments).toEqual([{ name: "new.lua" }]);
  });
});
