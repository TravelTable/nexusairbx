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
      <DialogContent className="max-w-lg border-white/10 bg-[#10141d] text-white">
        <DialogHeader>
          <DialogTitle className="text-white">All decal images</DialogTitle>
          <DialogDescription className="text-white/60">
            {items.length} image{items.length === 1 ? "" : "s"} selected
            {uploading ? " · uploads update live as Roblox finishes each file" : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="h-[min(60vh,480px)] min-h-[240px] overflow-y-auto pr-1">
          {items.length === 0 ? (
            <div className="rounded-md border border-white/10 bg-white/[0.03] p-3 text-xs text-white/55">
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
