import React from "react";
import { FileCode } from "lib/icons";

const ACTION_LABELS = {
  read: "Read",
  create: "Create",
  modify: "Modify",
  delete: "Delete",
  verify: "Verify",
  use: "File",
};

export default function FileReferenceTag({
  path = "",
  action = "use",
  kind = "file",
  children,
  onOpenFile,
}) {
  const normalizedPath = String(path || "").trim();
  if (!normalizedPath) return <>{children}</>;
  const label = String(children || normalizedPath.split(/[\\/]/).pop() || normalizedPath).trim();
  const actionLabel = ACTION_LABELS[String(action || "use").toLowerCase()] || "File";
  const canOpen = typeof onOpenFile === "function";
  const content = (
    <>
      <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide text-[var(--ds-accent)]">
        {actionLabel}
      </span>
      <FileCode className="h-3 w-3 shrink-0" />
      <span className="min-w-0 truncate font-mono">{label}</span>
    </>
  );
  const className = "mx-0.5 inline-flex min-h-7 max-w-full items-center gap-1.5 rounded-md border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] px-2 align-middle text-[11px] font-medium text-[var(--ds-text-secondary)] transition-colors hover:border-[var(--ds-accent-border)] hover:bg-[var(--ds-accent-soft)] hover:text-[var(--ds-text)] focus-ring";

  if (!canOpen) {
    return <span className={className} title={`${actionLabel}: ${normalizedPath}`}>{content}</span>;
  }

  return (
    <button
      type="button"
      className={className}
      onClick={() => onOpenFile?.({ path: normalizedPath, action, kind, label })}
      title={`${actionLabel}: ${normalizedPath}`}
      aria-label={`Open ${normalizedPath}`}
    >
      {content}
    </button>
  );
}
