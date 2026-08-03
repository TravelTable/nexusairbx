import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Copy, Edit, FolderOpen, RefreshCw, Wand2 } from "lib/icons";
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
      className={`inline-flex h-7 items-center gap-1 rounded-md px-1.5 text-[11px] font-medium text-gray-500 transition-colors [transition-duration:120ms] hover:bg-white/[0.05] hover:text-gray-200 focus-visible:bg-white/[0.05] focus-visible:text-gray-200 ${
        alwaysVisible ? "max-sm:inline-flex" : "max-sm:hidden"
      }`}
      aria-label={label}
    >
      <Icon className="h-3 w-3" />
      <span className="hidden md:inline">{label}</span>
    </button>
  );
}

function MenuItem({ icon: Icon, label, onSelect }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onSelect}
      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-gray-200 outline-none transition-colors hover:bg-white/10 focus-visible:bg-white/10"
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
    const onClickOutside = (event) => {
      if (rootRef.current?.contains(event.target) || menuRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
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
  }, [open, updateMenuPosition]);

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
            className="z-[9999] overflow-hidden rounded-md border border-white/10 bg-[#111] p-1 text-gray-200 shadow-md"
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
              <MenuItem icon={Wand2} label="Refine" onSelect={() => runAndClose(() => onRefine(message))} />
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
      className={`flex h-7 items-center gap-0.5 opacity-0 transition-opacity [transition-duration:120ms] group-hover/message:opacity-100 group-focus-within/message:opacity-100 max-sm:opacity-100 ${
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
        <ActionButton icon={Wand2} label="Refine" onClick={() => onRefine(message)} />
      ) : null}
      {role === "assistant" && onOpenFiles ? (
        <ActionButton icon={FolderOpen} label="Open files" onClick={() => onOpenFiles(message)} />
      ) : null}

      <button
        ref={buttonRef}
        type="button"
        className="grid h-7 min-w-7 place-items-center rounded-md px-1 text-[11px] tracking-[0.12em] text-gray-500 transition-colors hover:bg-white/[0.05] hover:text-gray-200"
        aria-label="More message actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          updateMenuPosition();
          setOpen((current) => !current);
        }}
      >
        •••
      </button>
      {menu}
    </div>
  );
}
