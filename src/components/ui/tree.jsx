import React, { createContext, useContext } from "react";
import { ChevronDown } from "lucide-react";
import { Slot, Slottable } from "@radix-ui/react-slot";

import { cn } from "../../lib/utils";

const TreeContext = createContext({ indent: 20, currentItem: undefined, tree: undefined });

function useTreeContext() {
  return useContext(TreeContext);
}

function Tree({ indent = 20, tree, className, style, ...props }) {
  const containerProps = tree && typeof tree.getContainerProps === "function"
    ? tree.getContainerProps()
    : {};

  return (
    <TreeContext.Provider value={{ indent, tree }}>
      <div
        data-slot="tree"
        {...props}
        {...containerProps}
        style={{ ...style, ...containerProps.style, "--tree-indent": `${indent}px` }}
        className={cn("flex flex-col", className, containerProps.className)}
      />
    </TreeContext.Provider>
  );
}

function TreeItem({ item, className, asChild = false, children, style, ...props }) {
  const { indent, tree } = useTreeContext();
  const itemProps = typeof item.getProps === "function" ? item.getProps() : {};
  const Comp = asChild ? Slot : "button";

  return (
    <TreeContext.Provider value={{ indent, currentItem: item, tree }}>
      <Comp
        data-slot="tree-item"
        {...props}
        {...itemProps}
        style={{ ...style, ...itemProps.style, "--tree-padding": `${item.getItemMeta().level * indent}px` }}
        className={cn("ui-headless-tree-item", className, itemProps.className)}
        data-focus={typeof item.isFocused === "function" ? item.isFocused() || false : undefined}
        data-folder={typeof item.isFolder === "function" ? item.isFolder() || false : undefined}
        data-selected={typeof item.isSelected === "function" ? item.isSelected() || false : undefined}
        data-drag-target={typeof item.isDragTarget === "function" ? item.isDragTarget() || false : undefined}
        data-search-match={typeof item.isMatchingSearch === "function" ? item.isMatchingSearch() || false : undefined}
        aria-expanded={item.isFolder() ? item.isExpanded() : undefined}
      >
        {children}
      </Comp>
    </TreeContext.Provider>
  );
}

function TreeItemLabel({ item: suppliedItem, children, className, asChild = false, ...props }) {
  const { currentItem } = useTreeContext();
  const item = suppliedItem || currentItem;
  if (!item) return null;

  const label = children || (typeof item.getItemName === "function" ? item.getItemName() : null);

  if (asChild) {
    return (
      <Slot data-slot="tree-item-label" className={cn("ui-headless-tree-label", className)} {...props}>
        {item.isFolder() ? <ChevronDown className="ui-headless-tree-chevron" aria-hidden="true" /> : null}
        <Slottable>{label}</Slottable>
      </Slot>
    );
  }

  return (
    <span data-slot="tree-item-label" className={cn("ui-headless-tree-label", className)} {...props}>
      {item.isFolder() ? <ChevronDown className="ui-headless-tree-chevron" aria-hidden="true" /> : null}
      {label}
    </span>
  );
}

function TreeDragLine({ className, ...props }) {
  const { tree } = useTreeContext();
  if (!tree || typeof tree.getDragLineStyle !== "function") return null;
  return <div style={tree.getDragLineStyle()} className={cn("ui-headless-tree-drag-line", className)} {...props} />;
}

export { Tree, TreeItem, TreeItemLabel, TreeDragLine };
