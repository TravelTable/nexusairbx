import {
  DEFAULT_INSPIRATION_PROMPT,
  DEFAULT_REPLICATE_PROMPT,
  MATCH_CLOSER_PROMPT,
  composeUiReferencePrompt,
  inferReferenceFindings,
  inferReferenceKind,
  inferReferenceRole,
  inferReferenceTarget,
  isUiReferenceImage,
  listUiReferenceImages,
  referenceAttachmentKey,
} from "./uiReferenceSession";

test("image attachments are the visual specification, not generic files", () => {
  const files = [
    { name: "notes.txt", type: "text/plain" },
    { name: "shop-desktop.png", type: "image/png", isImage: true },
    { name: "board.webp", kind: "image" },
  ];
  expect(files.filter(isUiReferenceImage).map((file) => file.name)).toEqual([
    "shop-desktop.png",
    "board.webp",
  ]);
  expect(listUiReferenceImages(files)).toHaveLength(2);
});

test("roles prefer an explicit primary, then device and modal hints", () => {
  const images = [
    { name: "shop-desktop.png", width: 1440, height: 900 },
    { name: "shop-mobile.png", width: 390, height: 844 },
    { name: "shop-modal.png", width: 1440, height: 900 },
  ];
  expect(images.map((image, index) => inferReferenceRole(image, index, images))).toEqual([
    "primary",
    "mobile",
    "modal",
  ]);
});

test("findings stay honest to measured layout instead of inventing widgets", () => {
  expect(
    inferReferenceFindings({
      width: 1440,
      height: 900,
      name: "shop-desktop.png",
      meanLuma: 42,
      columnLuma: [18, 20, 22, 80, 82, 84, 86, 88],
      rowLuma: [16, 18, 70, 72, 74, 76, 78, 80],
    })
  ).toEqual([
    "Desktop interface detected",
    "Dark theme",
    "Navigation/sidebar",
    "Top navigation",
  ]);
});

test("target and kind follow the screenshot, not a default desktop assumption", () => {
  expect(inferReferenceTarget({ width: 1440, height: 900 })).toBe("desktop");
  expect(inferReferenceTarget({ width: 390, height: 844 })).toBe("mobile");
  expect(inferReferenceTarget({ width: 900, height: 700 })).toBe("responsive");
  expect(inferReferenceKind({ name: "capture.png", width: 1440, height: 900 })).toBe("Screenshot");
});

test("empty prompt plus a reference becomes an image-only replication request", () => {
  expect(
    composeUiReferencePrompt({
      prompt: "   ",
      hasReference: true,
      referenceMode: "replicate",
      target: "desktop",
      behaviour: "infer",
      roles: [{ name: "shop-desktop.png", role: "primary", roleLabel: "Primary" }],
    })
  ).toBe(
    [
      DEFAULT_REPLICATE_PROMPT,
      "Target a desktop interface.",
      "Infer plausible hover and click interactions from the visible UI.",
    ].join("\n")
  );
});

test("typed changes stay edits against the reference rather than a blank-slate prompt", () => {
  expect(
    composeUiReferencePrompt({
      prompt: "Make the cards slightly less rounded",
      hasReference: true,
      referenceMode: "replicate",
      target: "responsive",
      behaviour: "visual",
      roles: [
        { name: "shop-desktop.png", role: "primary", roleLabel: "Primary" },
        { name: "shop-mobile.png", role: "mobile", roleLabel: "Mobile state" },
      ],
    })
  ).toContain("Keep the uploaded reference as the visual baseline");
  expect(composeUiReferencePrompt({ prompt: "Build a shop", hasReference: false })).toBe("Build a shop");
  expect(
    composeUiReferencePrompt({
      prompt: "",
      hasReference: true,
      referenceMode: "inspiration",
    })
  ).toContain(DEFAULT_INSPIRATION_PROMPT);
  expect(MATCH_CLOSER_PROMPT).toMatch(/largest visual discrepancies/i);
  expect(referenceAttachmentKey({ localId: "a", id: "b" })).toBe("a");
});
