import React from "react";
import { ImageIcon, Loader2, Trash2 } from "../../../lib/icons";
import { cn } from "../../../lib/utils";
import { Button } from "../../shadcn/button";
import { Input } from "../../shadcn/input";

export function resultTone(status) {
  if (status === "succeeded") return "text-emerald-300";
  if (status === "failed" || status === "rejected") return "text-red-300";
  if (status === "uploading") return "text-cyan-200";
  if (status === "pending") return "text-amber-200";
  return "text-white/60";
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
    <div className={cn("rounded-md border border-white/10 bg-white/[0.035] p-2", compact && "mx-1")}>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/10 bg-black/20">
          {item.previewUrl ? (
            <img src={item.previewUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="h-5 w-5 text-white/45" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <Input
            value={item.displayName}
            onChange={(event) => onDisplayNameChange?.(item.clientId, event.target.value)}
            className="h-8 border-white/10 bg-black/20 text-xs text-white"
            aria-label={`Display name for ${item.fileName}`}
            disabled={locked}
          />
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2 text-[11px]">
            <span className="max-w-[160px] truncate text-white/45">{item.fileName}</span>
            <span className={cn("inline-flex items-center gap-1 font-medium", resultTone(item.status))}>
              {showSpinner ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : null}
              {statusLabel(item.status)}
            </span>
            {item.contentUri ? (
              <code className="rounded bg-emerald-400/10 px-1 text-emerald-200">{item.contentUri}</code>
            ) : null}
          </div>
          {item.error ? <p className="mt-1 text-[11px] text-red-200">{item.error}</p> : null}
        </div>
        {onRemove ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-white/55 hover:text-white"
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
