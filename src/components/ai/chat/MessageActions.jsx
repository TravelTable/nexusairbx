import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Copy, Edit, FolderOpen, Menu, RefreshCw, SlidersHorizontal } from "lib/icons";
import { messageHasRefineableFiles } from "../../../lib/chatRefine";
import {
  getWorkspaceMenuHost,
  resolveAnchoredMenuPosition,
} from "../../../lib/workspaceMenuPosition";

const MENU_WIDTH = 176;
const MENU_MAX_HEIGHT = 280;

async function copyText(text) {
  const value = String(text || "");
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  if (typeof document === "undefined") return;
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function ActionButton({ icon: Icon, label, onClick, alwaysVisible = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-11 min-w-11 items-center justify-center gap-1 rounded-md px-2 text-[11px] font-medium text-[var(--ds-text-muted)] transition-colors [transition-duration:120ms] hover:bg-[var(--ds-fill-subtle)] hover:text-[var(--ds-text)] focus-visible:bg-[var(--ds-fill-subtle)] focus-visible:text-[var(--ds-text)] sm:h-7 sm:min-w-0 sm:justify-start sm:px-1.5 ${
        alwaysVisible ? "max-sm:inline-flex" : "max-sm:hidden"
      }`}
      aria-label={label}
    >
      <Icon className="h-4 w-4 sm:h-3 sm:w-3" />
      <span className="hidden md:inline">{label}</span>
    </button>
  );
}

function MenuItem({ icon: Icon, label, onSelect }) {
  return (
    <button
      type="button"
      role="menuitem"
      tabIndex={-1}
      onClick={onSelect}
      className="flex min-h-11 w-full items-center gap-2 rounded-sm px-2 py-2 text-sm text-[var(--ds-text)] outline-none transition-colors hover:bg-[var(--ds-fill-hover)] focus-visible:bg-[var(--ds-fill-hover)] sm:min-h-0 sm:py-1.5"
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </button>
  );
}

export default function MessageActions({
  role,
  text,
  message,
  retryPrompt = "",
  retrySourceMessage = null,
  retryRunId = null,
  onEdit,
  onRetry,
  onRefine,
  onOpenFiles,
}) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState(null);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const align = role === "user" ? "end" : "start";
  const canRefine = role === "assistant" && typeof onRefine === "function" && messageHasRefineableFiles(message);

  const closeMenuAndRestoreFocus = useCallback(() => {
    setOpen(false);
    buttonRef.current?.focus();
  }, []);

  const updateMenuPosition = useCallback(() => {
    setMenuPosition(resolveAnchoredMenuPosition(buttonRef.current, {
      menuWidth: MENU_WIDTH,
      menuMaxHeight: MENU_MAX_HEIGHT,
      minHeight: 120,
      align,
    }));
  }, [align]);

  useEffect(() => {
    if (!open) return undefined;
    updateMenuPosition();
    menuRef.current?.querySelector('[role="menuitem"]')?.focus();
    const onClickOutside = (event) => {
      if (rootRef.current?.contains(event.target) || menuRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closeMenuAndRestoreFocus();
    };
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [closeMenuAndRestoreFocus, open, updateMenuPosition]);

  const handleMenuKeyDown = useCallback((event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeMenuAndRestoreFocus();
      return;
    }

    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;

    const items = Array.from(
      event.currentTarget.querySelectorAll('[role="menuitem"]:not([disabled])')
    );
    if (!items.length) return;

    event.preventDefault();
    const activeIndex = items.indexOf(document.activeElement);
    let nextIndex = 0;
    if (event.key === "ArrowDown") {
      nextIndex = activeIndex < 0 ? 0 : (activeIndex + 1) % items.length;
    } else if (event.key === "ArrowUp") {
      nextIndex = activeIndex < 0 ? items.length - 1 : (activeIndex - 1 + items.length) % items.length;
    } else if (event.key === "End") {
      nextIndex = items.length - 1;
    }
    items[nextIndex]?.focus();
  }, [closeMenuAndRestoreFocus]);

  const handleCopy = async () => {
    await copyText(text);
    setCopied(true);
    setOpen(false);
    if (typeof window !== "undefined") {
      window.setTimeout(() => setCopied(false), 1200);
    }
  };

  const runAndClose = (action) => {
    action?.();
    setOpen(false);
  };

  const handleRetry = () => {
    if (!onRetry || !retryPrompt) return;
    onRetry({
      prompt: retryPrompt,
      message,
      sourceUserMessage: role === "assistant" ? retrySourceMessage : message,
      ...(retryRunId ? { targetRunId: retryRunId } : {}),
    });
  };

  const menu =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={menuRef}
            className="z-[9999] overflow-hidden rounded-md border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-overlay)] p-1 text-[var(--ds-text)] shadow-panel"
            style={{
              position: menuPosition?.strategy || "fixed",
              top: menuPosition?.top ?? 0,
              left: menuPosition?.left ?? 0,
              width: menuPosition?.width ?? MENU_WIDTH,
              maxHeight: menuPosition?.maxHeight ?? MENU_MAX_HEIGHT,
              visibility: menuPosition ? "visible" : "hidden",
            }}
            role="menu"
            aria-label="More message actions"
            onKeyDown={handleMenuKeyDown}
          >
            <MenuItem icon={Copy} label="Copy" onSelect={handleCopy} />
            {role === "user" && onEdit ? (
              <MenuItem icon={Edit} label="Edit" onSelect={() => runAndClose(() => onEdit(message))} />
            ) : null}
            {onRetry && retryPrompt ? (
              <MenuItem
                icon={RefreshCw}
                label={role === "user" ? "Retry from here" : "Retry"}
                onSelect={() => runAndClose(handleRetry)}
              />
            ) : null}
            {canRefine ? (
              <MenuItem icon={SlidersHorizontal} label="Refine" onSelect={() => runAndClose(() => onRefine(message))} />
            ) : null}
            {role === "assistant" && onOpenFiles ? (
              <MenuItem
                icon={FolderOpen}
                label="Open files"
                onSelect={() => runAndClose(() => onOpenFiles(message))}
              />
            ) : null}
          </div>,
          getWorkspaceMenuHost() || document.body
        )
      : null;

  return (
    <div
      ref={rootRef}
      className={`flex h-11 items-center gap-0.5 opacity-0 transition-opacity [transition-duration:120ms] group-hover/message:opacity-100 group-focus-within/message:opacity-100 max-sm:opacity-100 sm:h-7 ${
        role === "user" ? "justify-end" : "justify-start"
      }`}
      aria-label={`${role === "user" ? "User" : "Nexus"} message actions`}
    >
      {role === "user" && onEdit ? (
        <ActionButton icon={Edit} label="Edit" onClick={() => onEdit(message)} />
      ) : null}
      <ActionButton icon={Copy} label={copied ? "Copied" : "Copy"} onClick={handleCopy} alwaysVisible />
      {onRetry && retryPrompt ? (
        <ActionButton
          icon={RefreshCw}
          label={role === "user" ? "Retry from here" : "Retry"}
          onClick={handleRetry}
        />
      ) : null}
      {canRefine ? (
        <ActionButton icon={SlidersHorizontal} label="Refine" onClick={() => onRefine(message)} />
      ) : null}
      {role === "assistant" && onOpenFiles ? (
        <ActionButton icon={FolderOpen} label="Open files" onClick={() => onOpenFiles(message)} />
      ) : null}

      <button
        ref={buttonRef}
        type="button"
        className="grid h-11 min-w-11 place-items-center rounded-md px-1 text-[var(--ds-text-muted)] transition-colors hover:bg-[var(--ds-fill-subtle)] hover:text-[var(--ds-text)] sm:h-7 sm:min-w-7"
        aria-label="More message actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          updateMenuPosition();
          setOpen((current) => !current);
        }}
      >
        <Menu className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      {menu}
    </div>
  );
}
