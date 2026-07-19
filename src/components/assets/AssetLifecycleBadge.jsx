import React from "react";
import { AlertCircle, CheckCircle, Clock, CloudUpload, Loader2, XCircle } from "../../lib/icons";

const STATUS_META = {
  draft: { label: "Draft", tone: "neutral", icon: Clock },
  generating: { label: "Generating", tone: "working", icon: Loader2, spin: true },
  processing: { label: "Processing", tone: "working", icon: Loader2, spin: true },
  generated: { label: "Generated", tone: "ready", icon: CheckCircle },
  validating: { label: "Validating", tone: "working", icon: Loader2, spin: true },
  approved: { label: "Approved", tone: "ready", icon: CheckCircle },
  upload_pending: { label: "Upload queued", tone: "pending", icon: CloudUpload },
  uploading: { label: "Uploading", tone: "working", icon: Loader2, spin: true },
  submitted: { label: "Submitted", tone: "pending", icon: CloudUpload },
  moderation_pending: { label: "In moderation", tone: "pending", icon: Clock },
  not_submitted: { label: "Not submitted", tone: "neutral", icon: Clock },
  pending: { label: "Pending", tone: "pending", icon: Clock },
  available: { label: "Available", tone: "ready", icon: CheckCircle },
  generation_failed: { label: "Generation failed", tone: "error", icon: XCircle },
  validation_failed: { label: "Validation failed", tone: "error", icon: XCircle },
  upload_failed: { label: "Upload failed", tone: "error", icon: AlertCircle },
  rejected: { label: "Rejected", tone: "error", icon: XCircle },
  archived: { label: "Archived", tone: "neutral", icon: Clock },
  replaced: { label: "Replaced", tone: "neutral", icon: Clock },
  unused: { label: "Unused", tone: "neutral", icon: Clock },
  referenced: { label: "Referenced", tone: "pending", icon: Clock },
  active: { label: "In use", tone: "ready", icon: CheckCircle },
  used: { label: "In use", tone: "ready", icon: CheckCircle },
  unknown: { label: "Status unknown", tone: "neutral", icon: Clock },
};

export function formatAssetStatus(status) {
  const normalized = String(status || "unknown").trim().toLowerCase();
  if (STATUS_META[normalized]) return STATUS_META[normalized].label;
  return normalized
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || STATUS_META.unknown.label;
}

export default function AssetLifecycleBadge({ status, label, className = "" }) {
  const normalized = String(status || "unknown").trim().toLowerCase();
  const meta = STATUS_META[normalized] || STATUS_META.unknown;
  const Icon = meta.icon;
  return (
    <span className={`asset-status asset-status--${meta.tone} ${className}`.trim()} title={label || formatAssetStatus(normalized)}>
      <Icon className={`asset-status__icon ${meta.spin ? "asset-status__icon--spin" : ""}`} aria-hidden="true" />
      <span>{label || formatAssetStatus(normalized)}</span>
    </span>
  );
}
