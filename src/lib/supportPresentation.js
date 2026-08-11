import { SUPPORT_CATEGORIES } from "./supportDraft";

export const SUPPORT_STATUSES = Object.freeze([
  "open",
  "waiting_on_support",
  "waiting_on_customer",
  "resolved",
  "closed",
]);

export const SUPPORT_PRIORITIES = Object.freeze(["low", "normal", "high", "urgent"]);

const STATUS_LABELS = {
  open: "Open",
  waiting_on_support: "Waiting on support",
  waiting_on_customer: "Waiting on you",
  resolved: "Resolved",
  closed: "Closed",
};

export function supportStatusLabel(status) {
  return STATUS_LABELS[status] || String(status || "Unknown").replaceAll("_", " ");
}

export function supportCategoryLabel(category) {
  return SUPPORT_CATEGORIES.find((item) => item.id === category)?.label || category || "Other";
}

export function formatSupportDate(value, { includeTime = false } = {}) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
    ...(includeTime ? { hour: "numeric", minute: "2-digit" } : {}),
  }).format(date);
}

export function supportStatusTone(status) {
  if (status === "waiting_on_customer") return "border-[color-mix(in_srgb,var(--ds-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--ds-warning)_9%,transparent)] text-[var(--ds-warning)]";
  if (status === "resolved") return "border-[color-mix(in_srgb,var(--ds-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--ds-success)_9%,transparent)] text-[var(--ds-success)]";
  if (status === "closed") return "border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] text-[var(--ds-text-muted)]";
  return "border-[var(--ds-accent-border)] bg-[var(--ds-accent-soft)] text-[var(--ds-accent)]";
}
