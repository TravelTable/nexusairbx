import React, { useCallback } from "react";
import { FixedSizeList as List } from "react-window";
import { AutoSizer } from "react-virtualized-auto-sizer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../shadcn/dialog";
import DecalUploadItemRow from "./DecalUploadItemRow";

const ROW_HEIGHT = 76;

function VirtualRow({ index, style, data }) {
  const item = data.items[index];
  if (!item) return null;

  return (
    <div style={style}>
      <DecalUploadItemRow
        item={item}
        uploading={data.uploading}
        compact
        onDisplayNameChange={data.onDisplayNameChange}
        onRemove={data.onRemove}
      />
    </div>
  );
}

export default function DecalUploadAllItemsDialog({
  open,
  onOpenChange,
  items = [],
  uploading = false,
  onDisplayNameChange,
  onRemove,
}) {
  const itemData = useCallback(() => ({
    items,
    uploading,
    onDisplayNameChange,
    onRemove,
  }), [items, uploading, onDisplayNameChange, onRemove]);

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
        <div className="h-[min(60vh,480px)] min-h-[240px]">
          {items.length === 0 ? (
            <div className="rounded-md border border-white/10 bg-white/[0.03] p-3 text-xs text-white/55">
              No decal images selected.
            </div>
          ) : (
            <AutoSizer>
              {({ height, width }) => (
                <List
                  height={height}
                  width={width}
                  itemCount={items.length}
                  itemSize={ROW_HEIGHT}
                  itemData={itemData()}
                  overscanCount={6}
                >
                  {VirtualRow}
                </List>
              )}
            </AutoSizer>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
