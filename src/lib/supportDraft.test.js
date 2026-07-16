import {
  SUPPORT_DRAFT_KEY,
  SUPPORT_DRAFT_TTL_MS,
  clearSupportDraft,
  normalizeSupportDraft,
  readSupportDraft,
  saveSupportDraft,
  supportDraftFromSearchParams,
} from "./supportDraft";

const NOW = 4_000_000;

beforeEach(() => {
  window.sessionStorage.clear();
});

test("treats an empty saved-draft slot as no draft", () => {
  expect(normalizeSupportDraft(null, NOW)).toBeNull();
  expect(readSupportDraft(NOW)).toBeNull();
});

test("normalizes form fields and uses a supported category", () => {
  const draft = normalizeSupportDraft({
    category: "not-a-category",
    subject: `  ${"a".repeat(140)}  `,
    message: "  Reproduction details  ",
  }, NOW);

  expect(draft.category).toBe("technical");
  expect(draft.subject).toHaveLength(120);
  expect(draft.message).toBe("Reproduction details");
});

test("restores the support draft in the same tab and removes it after expiry", () => {
  saveSupportDraft({ category: "billing", subject: "Invoice question", message: "Please help" }, NOW);
  expect(readSupportDraft(NOW + 1)).toMatchObject({
    category: "billing",
    subject: "Invoice question",
    message: "Please help",
  });

  expect(readSupportDraft(NOW + SUPPORT_DRAFT_TTL_MS)).toBeNull();
  expect(window.sessionStorage.getItem(SUPPORT_DRAFT_KEY)).toBeNull();
  clearSupportDraft();
});

test("rejects future-dated drafts so storage cannot bypass the expiry window", () => {
  expect(normalizeSupportDraft({
    category: "account",
    createdAt: NOW + 1,
    expiresAt: NOW + SUPPORT_DRAFT_TTL_MS,
  }, NOW)).toBeNull();
});

test("prefills a Docs issue with the canonical article URL", () => {
  const draft = supportDraftFromSearchParams(new URLSearchParams(
    "subject=support&source=docs&article=%2Fdocs%2Fstudio%2Fconnect&message=The+step+is+outdated"
  ), NOW);

  expect(draft).toMatchObject({
    category: "technical",
    subject: "Docs issue",
    articleUrl: "/docs/studio/connect",
    message: "The step is outdated",
  });
});

test("uses legacy subject query values as support categories", () => {
  const draft = supportDraftFromSearchParams(
    new URLSearchParams("subject=security_privacy&message=Privacy+request"),
    NOW
  );
  expect(draft).toMatchObject({ category: "security_privacy", message: "Privacy request" });
});
