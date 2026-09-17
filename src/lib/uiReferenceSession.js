export const DEFAULT_REPLICATE_PROMPT =
  "Reproduce this reference as closely as possible as a functional Roblox UI.";
export const DEFAULT_INSPIRATION_PROMPT =
  "Use this reference as visual inspiration for a functional Roblox UI, not a pixel-for-pixel copy.";
export const MATCH_CLOSER_PROMPT =
  "Compare the generated UI against the reference and correct the largest visual discrepancies while preserving working behaviour.";

export const REFERENCE_ROLE_OPTIONS = [
  { id: "primary", label: "Primary" },
  { id: "mobile", label: "Mobile state" },
  { id: "modal", label: "Open modal" },
  { id: "hover", label: "Hover / pressed" },
  { id: "empty", label: "Empty state" },
  { id: "other", label: "Additional state" },
];

export function isUiReferenceImage(item) {
  if (!item) return false;
  return Boolean(
    item.isImage ||
      item.kind === "image" ||
      /^image\//i.test(item.type || "") ||
      /\.(png|jpe?g|webp|gif|bmp)$/i.test(item.name || "")
  );
}

export function listUiReferenceImages(attachments = []) {
  return (Array.isArray(attachments) ? attachments : []).filter(isUiReferenceImage);
}

export function referenceAttachmentKey(item) {
  return String(item?.localId || item?.id || item?.attachmentId || item?.name || "");
}

export function referenceRoleLabel(role) {
  return REFERENCE_ROLE_OPTIONS.find((option) => option.id === role)?.label || "Additional state";
}

export function inferReferenceRole(image, index = 0, all = []) {
  const name = String(image?.name || "").toLowerCase();
  if (/modal|dialog|overlay|popup/.test(name)) return "modal";
  if (/mobile|phone|iphone|android/.test(name)) return "mobile";
  if (Number(image?.width) > 0 && Number(image.width) <= 520) return "mobile";
  if (index > 0 && Number(all[0]?.width) > 0 && Number(image?.width) > 0 && image.width < all[0].width * 0.7) {
    return "mobile";
  }
  if (index === 0) return "primary";
  return "other";
}

export function inferReferenceTarget(image) {
  const width = Number(image?.width) || 0;
  if (width >= 1100) return "desktop";
  if (width > 0 && width <= 520) return "mobile";
  return "responsive";
}

export function inferReferenceKind(image) {
  const name = String(image?.name || "").toLowerCase();
  if (/photo|camera|img_\d+/.test(name)) return "Image";
  return "Screenshot";
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function inferReferenceFindings({
  width,
  height,
  name,
  meanLuma,
  columnLuma = [],
  rowLuma = [],
} = {}) {
  const findings = [];
  const safeWidth = Number(width) || 0;
  const safeHeight = Number(height) || 0;
  if (safeWidth >= 1100) findings.push("Desktop interface detected");
  else if (safeWidth > 0 && safeWidth <= 520) findings.push("Mobile interface detected");
  else if (safeWidth > 0 || safeHeight > 0) findings.push("Compact interface detected");

  if (typeof meanLuma === "number") {
    findings.push(meanLuma < 110 ? "Dark theme" : "Light theme");
  }

  if (columnLuma.length >= 8) {
    const count = Math.max(1, Math.round(columnLuma.length * 0.18));
    const left = average(columnLuma.slice(0, count));
    const rest = average(columnLuma.slice(count));
    if (Math.abs(left - rest) >= 18) findings.push("Navigation/sidebar");
  }

  if (rowLuma.length >= 8) {
    const count = Math.max(1, Math.round(rowLuma.length * 0.12));
    const top = average(rowLuma.slice(0, count));
    const rest = average(rowLuma.slice(count));
    if (Math.abs(top - rest) >= 18) findings.push("Top navigation");
  }

  if (/modal|dialog|overlay|popup/.test(String(name || "").toLowerCase())) {
    findings.push("Modal / overlay styling");
  }

  return findings.slice(0, 5);
}

export function composeUiReferencePrompt({
  prompt = "",
  hasReference = false,
  referenceMode = "replicate",
  target = "responsive",
  behaviour = "infer",
  roles = [],
} = {}) {
  const user = String(prompt || "").trim();
  if (!hasReference) return user;
  const base =
    referenceMode === "inspiration"
      ? user || DEFAULT_INSPIRATION_PROMPT
      : user
        ? `${user}\n\nKeep the uploaded reference as the visual baseline and apply only the requested changes.`
        : DEFAULT_REPLICATE_PROMPT;
  const targetLine =
    {
      desktop: "Target a desktop interface.",
      mobile: "Target a mobile interface.",
      responsive: "Design independently for desktop and phone.",
    }[target] || "Design independently for desktop and phone.";
  const behaviourLine =
    behaviour === "visual"
      ? "Reproduce visual appearance only; do not invent extra interactions."
      : "Infer plausible hover and click interactions from the visible UI.";
  const roleLines =
    roles.length > 1
      ? `Reference set:\n${roles
          .map((role) => `- ${role.roleLabel || referenceRoleLabel(role.role)}: ${role.name}`)
          .join("\n")}`
      : "";
  return [base, targetLine, behaviourLine, roleLines].filter(Boolean).join("\n");
}

export function describeReferenceMode(mode) {
  return mode === "inspiration" ? "Inspired by" : "Replicate closely";
}
