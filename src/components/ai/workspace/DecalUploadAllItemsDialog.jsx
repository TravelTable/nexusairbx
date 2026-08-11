import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../shadcn/dialog";
import DecalUploadItemRow from "./DecalUploadItemRow";

export default function DecalUploadAllItemsDialog({
  open,
  onOpenChange,
  items = [],
  uploading = false,
  onDisplayNameChange,
  onRemove,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-[var(--ds-border-subtle)] bg-[var(--ds-surface-overlay)] text-[var(--ds-text)]">
        <DialogHeader>
          <DialogTitle className="text-[var(--ds-text)]">All decal images</DialogTitle>
          <DialogDescription className="text-[var(--ds-text-secondary)]">
            {items.length} image{items.length === 1 ? "" : "s"} selected
            {uploading ? " · uploads update live as Roblox finishes each file" : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="h-[min(60vh,480px)] min-h-[240px] overflow-y-auto pr-1 scrollbar-subtle">
          {items.length === 0 ? (
            <div className="rounded-md border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] p-3 text-xs text-[var(--ds-text-muted)]">
              No decal images selected.
            </div>
          ) : (
            <div className="space-y-2" data-testid="decal-all-items-list">
              {items.map((item) => (
                <DecalUploadItemRow
                  key={item.clientId}
                  item={item}
                  uploading={uploading}
                  onDisplayNameChange={onDisplayNameChange}
                  onRemove={onRemove}
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
