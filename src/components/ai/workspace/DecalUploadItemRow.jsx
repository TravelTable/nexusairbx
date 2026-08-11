import React from "react";
import { ImageIcon, Loader2, Trash2 } from "../../../lib/icons";
import { cn } from "../../../lib/utils";
import { Button } from "../../shadcn/button";
import { Input } from "../../shadcn/input";

export function resultTone(status) {
  if (status === "succeeded") return " text-[var(--ds-success)] ";
  if (status === "failed" || status === "rejected") return " text-[var(--ds-danger)] ";
  if (status === "uploading") return "text-[var(--ds-info)]";
  if (status === "pending") return " text-[var(--ds-warning)] ";
  return "text-[var(--ds-text-secondary)]";
}

export function statusLabel(status) {
  if (status === "uploading") return "uploading";
  return status;
}

export default function DecalUploadItemRow({
  item,
  uploading = false,
  onDisplayNameChange,
  onRemove,
  compact = false,
}) {
  const locked = uploading || item.status === "succeeded" || item.status === "uploading";
  const showSpinner = item.status === "uploading";

  return (
    <div className={cn("rounded-md border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] p-2", compact && "mx-1")}>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)]">
          {item.previewUrl ? (
            <img src={item.previewUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="h-5 w-5 text-[var(--ds-text-muted)]" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <Input
            value={item.displayName}
            onChange={(event) => onDisplayNameChange?.(item.clientId, event.target.value)}
            className="h-8 border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] text-xs text-[var(--ds-text)]"
            aria-label={`Display name for ${item.fileName}`}
            disabled={locked}
          />
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2 text-[11px]">
            <span className="max-w-[160px] truncate text-[var(--ds-text-muted)]">{item.fileName}</span>
            <span className={cn("inline-flex items-center gap-1 font-medium", resultTone(item.status))}>
              {showSpinner ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : null}
              {statusLabel(item.status)}
            </span>
            {item.contentUri ? (
              <code className="rounded bg-[color-mix(in_srgb,var(--ds-success)_12%,transparent)] px-1 text-[var(--ds-success)] ">{item.contentUri}</code>
            ) : null}
          </div>
          {item.error ? <p className="mt-1 text-[11px] text-[var(--ds-danger)] ">{item.error}</p> : null}
        </div>
        {onRemove ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-[var(--ds-text-muted)] hover:text-[var(--ds-text)]"
            aria-label={`Remove ${item.fileName}`}
            onClick={() => onRemove(item.clientId)}
            disabled={locked}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
