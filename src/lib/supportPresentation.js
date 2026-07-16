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
  if (status === "waiting_on_customer") return "border-amber-400/25 bg-amber-400/10 text-amber-200";
  if (status === "resolved") return "border-emerald-400/25 bg-emerald-400/10 text-emerald-200";
  if (status === "closed") return "border-white/10 bg-white/[0.04] text-slate-400";
  return "border-cyan-400/25 bg-cyan-400/10 text-cyan-200";
}
