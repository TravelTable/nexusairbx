import React, { useState } from "react";
import { Copy, Edit, FolderOpen, RefreshCw } from "lib/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../shadcn/dropdown-menu";

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

export default function MessageActions({
  role,
  text,
  message,
  retryPrompt = "",
  onEdit,
  onRetry,
  onRefine,
  onOpenFiles,
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await copyText(text);
    setCopied(true);
    if (typeof window !== "undefined") {
      window.setTimeout(() => setCopied(false), 1200);
    }
  };

  return (
    <div
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
          onClick={() => onRetry(retryPrompt)}
        />
      ) : null}
      {role === "assistant" && onRefine ? (
        <ActionButton icon={Edit} label="Refine" onClick={() => onRefine(message)} />
      ) : null}
      {role === "assistant" && onOpenFiles ? (
        <ActionButton icon={FolderOpen} label="Open files" onClick={() => onOpenFiles(message)} />
      ) : null}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="grid h-7 min-w-7 place-items-center rounded-md px-1 text-[11px] tracking-[0.12em] text-gray-500 transition-colors hover:bg-white/[0.05] hover:text-gray-200"
            aria-label="More message actions"
          >
            •••
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={role === "user" ? "end" : "start"} className="border-white/10 bg-[#111] text-gray-200">
          <DropdownMenuItem onSelect={handleCopy}>
            <Copy className="h-4 w-4" />
            Copy
          </DropdownMenuItem>
          {role === "user" && onEdit ? (
            <DropdownMenuItem onSelect={() => onEdit(message)}>
              <Edit className="h-4 w-4" />
              Edit
            </DropdownMenuItem>
          ) : null}
          {onRetry && retryPrompt ? (
            <DropdownMenuItem onSelect={() => onRetry(retryPrompt)}>
              <RefreshCw className="h-4 w-4" />
              {role === "user" ? "Retry from here" : "Retry"}
            </DropdownMenuItem>
          ) : null}
          {role === "assistant" && onRefine ? (
            <DropdownMenuItem onSelect={() => onRefine(message)}>
              <Edit className="h-4 w-4" />
              Refine
            </DropdownMenuItem>
          ) : null}
          {role === "assistant" && onOpenFiles ? (
            <DropdownMenuItem onSelect={() => onOpenFiles(message)}>
              <FolderOpen className="h-4 w-4" />
              Open files
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
