import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  ChevronDown,
  Edit,
  Loader,
  Plus,
  SendPrompt,
  SlidersHorizontal,
  Square,
  Wand2,
  X,
} from "lib/icons";
import { TokenBar } from "../AiComponents";
import { CHAT_MODES } from "../chatConstants";
import StudioControls from "../workspace/StudioControls";
import StudioPlaceChip from "../workspace/StudioPlaceChip";
import RobloxCloudControls from "../workspace/RobloxCloudControls";
import AssetLibraryModal from "../workspace/AssetLibraryModal";
import RefineChips from "../RefineChips";
import ComposerCommandMenu from "./ComposerCommandMenu";
import { ROBLOX_DECAL_ACCEPT } from "../../../hooks/useRobloxImageUpload";
import { useMotionPresence } from "../../../hooks/useMotionPresence";
import {
  COMPOSER_COMMANDS,
  applyComposerMention,
  filterComposerCommands,
  getActiveComposerMention,
} from "../../../lib/composerCommands";
import { messageHasRefineableFiles } from "../../../lib/chatRefine";

function ModeSelector({ mode, onModeChange, disabled }) {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState(null);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const menuPresence = useMotionPresence(open, 150);

  const updateMenuPosition = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;

    const menuWidth = 256;
    const menuHeight = 280;
    const gutter = 8;
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceAbove >= menuHeight || spaceAbove > spaceBelow;

    setMenuPosition({
      left: Math.min(Math.max(gutter, rect.left), window.innerWidth - menuWidth - gutter),
      top: openUp ? rect.top - gutter : rect.bottom + gutter,
      transform: openUp ? "translateY(-100%)" : "none",
      transformOrigin: openUp ? "bottom left" : "top left",
      width: menuWidth,
      maxHeight: Math.max(160, openUp ? spaceAbove - gutter * 2 : spaceBelow - gutter * 2),
    });
  }, []);

  useEffect(() => {
    const onClickOutside = (event) => {
      if (rootRef.current?.contains(event.target) || menuRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    updateMenuPosition();
    const onLayout = () => updateMenuPosition();
    window.addEventListener("resize", onLayout);
    window.addEventListener("scroll", onLayout, true);
    return () => {
      window.removeEventListener("resize", onLayout);
      window.removeEventListener("scroll", onLayout, true);
    };
  }, [open, updateMenuPosition]);

  const current = CHAT_MODES.find((item) => item.id === mode) || CHAT_MODES[0];

  return (
    <div className="relative" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          setOpen((value) => {
            const next = !value;
            if (next && typeof window.requestAnimationFrame === "function") {
              window.requestAnimationFrame(updateMenuPosition);
            }
            return next;
          });
        }}
        disabled={disabled}
        className={`inline-flex h-7 items-center gap-1.5 rounded-md border border-[var(--ds-border-subtle)] px-2 text-[10px] font-bold uppercase tracking-wider transition-[border-color,background-color,color,opacity,transform] duration-150 ease-out active:scale-[0.98] focus-ring disabled:cursor-not-allowed disabled:opacity-40 ${current.bg} ${current.color} hover:bg-[var(--ds-fill-hover)]`}
        title="Select mode"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {current.icon}
        {current.label}
        <ChevronDown className={`h-3 w-3 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
      </button>

      {menuPresence.present && menuPosition && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              className={`fixed z-[9999] overflow-y-auto rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-overlay)] p-1.5 shadow-2xl backdrop-blur-2xl scrollbar-subtle transition-[opacity,transform] duration-150 ${
                menuPresence.entering ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
              style={{
                left: menuPosition.left,
                top: menuPosition.top,
                width: menuPosition.width,
                maxHeight: menuPosition.maxHeight,
                transform: `${menuPosition.transform === "none" ? "" : menuPosition.transform} ${
                  menuPresence.entering ? "scale(1)" : "scale(0.985)"
                }`.trim() || "scale(1)",
                transformOrigin: menuPosition.transformOrigin,
              }}
              role="listbox"
              aria-hidden={!open}
            >
              {CHAT_MODES.map((item) => {
                const selected = item.id === mode;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      onModeChange?.(item.id);
                      setOpen(false);
                    }}
                    className={`flex w-full items-start gap-2.5 rounded-xl border px-2.5 py-2 text-left transition-[border-color,background-color,color,opacity,transform] duration-150 hover:translate-x-0.5 ${
                      selected
                        ? "border-[var(--ds-border-subtle)] bg-[var(--ds-fill-hover)]"
                        : "border-transparent hover:bg-[var(--ds-fill-subtle)]"
                    }`}
                  >
                    <span className={`mt-0.5 ${item.color}`}>{item.icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-[var(--ds-text)]">{item.label}</span>
                        {selected && <Check className="h-3 w-3 text-[var(--ds-accent)]" />}
                      </span>
                      <span className="mt-0.5 block text-[10px] leading-snug text-[var(--ds-text-muted)]">
                        {item.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

function ImageUploadChip({ upload }) {
  const name = upload?.fileName || "Image";
  return (
    <div className="flex h-7 max-w-[140px] shrink-0 items-center gap-1.5 rounded-md border border-[color-mix(in_srgb,var(--ds-warning)_35%,transparent)]  bg-[color-mix(in_srgb,var(--ds-warning)_12%,transparent)] px-2 transition-[border-color,background-color,color,opacity] duration-150 motion-safe:animate-fade-in-up">
      <Loader className="h-3 w-3 shrink-0 animate-spin text-[var(--ds-warning)] " />
      <span className="min-w-0 truncate text-[10px] font-bold text-[var(--ds-warning)] ">Uploading {name}</span>
    </div>
  );
}

function FileContextChip({ file, index, onRemove }) {
  const name = file?.name || "Attachment";
  return (
    <div className="relative flex h-7 max-w-[140px] shrink-0 items-center rounded-md border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] pl-2 pr-7 transition-[border-color,background-color,color,opacity] duration-150 motion-safe:animate-fade-in-up">
      <span className="min-w-0 truncate text-[10px] font-bold text-[var(--ds-text-secondary)]">{name}</span>
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--ds-text-muted)] transition-[background-color,color,opacity] duration-150 hover:bg-[color-mix(in_srgb,var(--ds-danger)_12%,transparent)] hover:text-[var(--ds-danger)] focus-ring"
        aria-label={`Remove ${name}`}
        title={`Remove ${name}`}
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

function RobloxAssetContextChip({ asset, onRemove }) {
  const name = asset?.name || `Asset ${asset?.assetId}`;
  const type = asset?.assetType || "Asset";
  return (
    <div className="relative flex h-7 max-w-[140px] shrink-0 items-center gap-1.5 rounded-md border border-[var(--ds-accent-border)] bg-[var(--ds-accent-soft)] pl-1 pr-7 transition-[border-color,background-color,color,opacity] duration-150 motion-safe:animate-fade-in-up">
      {asset?.thumbnailUrl ? (
        <img src={asset.thumbnailUrl} alt="" className="h-5 w-5 shrink-0 rounded object-cover" />
      ) : (
        <span className="inline-flex h-5 max-w-[42px] shrink-0 items-center truncate rounded border border-[var(--ds-accent-border)] bg-[var(--ds-fill-subtle)] px-1 text-[7px] font-black uppercase text-[var(--ds-accent)]">
          {type}
        </span>
      )}
      <span className="min-w-0 truncate text-[10px] font-bold text-[var(--ds-text)]">{name}</span>
      <button
        type="button"
        onClick={() => onRemove?.(asset?.assetId)}
        className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--ds-accent)] transition-[background-color,color,opacity] duration-150 hover:bg-[color-mix(in_srgb,var(--ds-danger)_12%,transparent)] hover:text-[var(--ds-danger)] focus-ring"
        aria-label={`Remove ${name}`}
        title={`Remove ${name}`}
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

export default function ChatComposer({
  prompt,
  setPrompt,
  attachments = [],
  setAttachments,
  robloxImageUploading = false,
  robloxImageUploads = [],
  onSubmit,
  onStop,
  isGenerating,
  operationState = null,
  onResumeQueue,
  onSendNext,
  onRemoveQueued,
  placeholder = "What do you want to build?",
  tokensLeft,
  tokensLimit,
  resetsAt,
  planKey,
  unlimitedTokens,
  devOverride,
  dailyUsage,
  includedUsage,
  premiumBalance,
  isFreeUsagePlan,
  billingLoading = false,
  billingError = null,
  refineTarget,
  onCancelRefine,
  onStartRefine,
  rewindTarget = null,
  onCancelRewind,
  onFileUpload,
  onImprovePrompt,
  disabled,
  mode = "agent",
  onModeChange,
  studioConnected,
  studioConnectionType,
  studioConnectionState,
  studioCapabilities,
  studioCollaborators,
  studioLoading,
  studioEnabled,
  onStudioEnabledChange,
  studioApplyMode,
  onStudioApplyModeChange,
  studioAutoPushEnabled,
  onStudioAutoPushEnabledChange,
  studioAutoPushPolicy,
  onStudioAutoPushPolicyChange,
  studioAutoPushAuthorized,
  studioPlacePreference = null,
  studioPlaceOptions = [],
  studioPlacePickerOpen = null,
  onStudioPlacePickerOpenChange = null,
  onSelectStudioPlace = null,
  selectingStudioTargetId = null,
  robloxConnected,
  robloxLoading,
  robloxSelectedCreator,
  robloxUploadAvailable,
  robloxUploadState,
  robloxUploadDisabledReason,
  robloxAssetUploadsEnabled,
  onRobloxAssetUploadsEnabledChange,
  robloxAssetLibraryAvailable,
  robloxAssetLibraryDisabledReason,
  robloxProjectAssets = [],
  onOpenAssetLibrary,
  assetLibraryOpen = false,
  onCloseAssetLibrary,
  onConfirmProjectAssets,
  onRemoveProjectAsset,
  projectAssetSaving = false,
  assetProjectId = null,
  robloxStatus,
}) {
  const [controlsOpen, setControlsOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [usageOpen, setUsageOpen] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionRange, setMentionRange] = useState(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const controlsButtonRef = useRef(null);
  const controlsPanelRef = useRef(null);
  const contextButtonRef = useRef(null);
  const contextPanelRef = useRef(null);
  const usageButtonRef = useRef(null);
  const usagePanelRef = useRef(null);
  const draftIdentityRef = useRef({ signature: null, revision: 0 });
  const controlsPresence = useMotionPresence(controlsOpen, 180);
  const controlsId = "chat-composer-controls";
  const canSendWithContext =
    Boolean(prompt?.trim()) || attachments.length > 0 || robloxProjectAssets.length > 0;
  const draftSignature = JSON.stringify({
    prompt: String(prompt || ""),
    attachments: attachments.map((file) => [file?.name || "", file?.size || 0, file?.type || ""]),
    assets: robloxProjectAssets.map((asset) => asset?.assetId || asset?.id || ""),
  });
  if (draftIdentityRef.current.signature !== draftSignature) {
    draftIdentityRef.current = {
      signature: draftSignature,
      revision: draftIdentityRef.current.revision + 1,
    };
  }
  const draftRevision = `draft:${draftIdentityRef.current.revision}`;
  const activeOperationStatus = operationState?.active?.status || operationState?.lastStatus || null;
  const queuedOperations = Array.isArray(operationState?.queue) ? operationState.queue : [];
  const mentionCommands = filterComposerCommands(mentionQuery, COMPOSER_COMMANDS);
  const planFirst = mode === "plan";
  const contextItems = [
    ...(studioEnabled ? [{ kind: "studio", key: "studio-target" }] : []),
    ...robloxImageUploads.map((upload) => ({ kind: "upload", key: `upload-${upload.id}`, upload })),
    ...attachments.map((file, index) => ({
      kind: "file",
      key: `file-${file?.name || "attachment"}-${index}`,
      file,
      index,
    })),
    ...robloxProjectAssets.map((asset) => ({
      kind: "asset",
      key: `asset-${asset.assetId}`,
      asset,
    })),
  ];
  const visibleContextItems = contextItems.slice(0, 3);
  const hiddenContextCount = Math.max(0, contextItems.length - visibleContextItems.length);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "0px";
    const nextHeight = Math.min(Math.max(textarea.scrollHeight, 44), 144);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > 144 ? "auto" : "hidden";
  }, [prompt]);

  useEffect(() => {
    if (!controlsOpen && !contextOpen && !usageOpen) return undefined;
    const onPointerDown = (event) => {
      if (
        controlsButtonRef.current?.contains(event.target)
        || controlsPanelRef.current?.contains(event.target)
        || contextButtonRef.current?.contains(event.target)
        || contextPanelRef.current?.contains(event.target)
        || usageButtonRef.current?.contains(event.target)
        || usagePanelRef.current?.contains(event.target)
      ) return;
      setControlsOpen(false);
      setContextOpen(false);
      setUsageOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      if (controlsOpen) controlsButtonRef.current?.focus();
      else if (contextOpen) contextButtonRef.current?.focus();
      else usageButtonRef.current?.focus();
      setControlsOpen(false);
      setContextOpen(false);
      setUsageOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [contextOpen, controlsOpen, usageOpen]);

  const syncMentionState = useCallback((value, caret) => {
    const mention = getActiveComposerMention(value, caret);
    if (!mention) {
      setMentionOpen(false);
      setMentionQuery("");
      setMentionRange(null);
      setMentionIndex(0);
      return;
    }
    setMentionOpen(true);
    setMentionQuery(mention.query);
    setMentionRange(mention);
    setMentionIndex(0);
  }, []);

  const runComposerCommand = useCallback((command) => {
    if (!command) return;
    switch (command.action) {
      case "open_studio_place":
        onStudioPlacePickerOpenChange?.(true);
        break;
      case "open_asset_library":
        onOpenAssetLibrary?.();
        break;
      case "attach_file":
        fileInputRef.current?.click();
        break;
      case "open_controls":
        setControlsOpen(true);
        break;
      case "improve_prompt":
        if (prompt?.trim()) onImprovePrompt?.();
        break;
      case "start_refine":
        onStartRefine?.();
        break;
      default:
        break;
    }
  }, [onImprovePrompt, onOpenAssetLibrary, onStartRefine, onStudioPlacePickerOpenChange, prompt]);

  useEffect(() => {
    if (!refineTarget) return undefined;
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.focus();
    }
    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      if (mentionOpen || controlsOpen || contextOpen || usageOpen) return;
      event.preventDefault();
      onCancelRefine?.();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [refineTarget, mentionOpen, controlsOpen, contextOpen, usageOpen, onCancelRefine]);

  const submitQuickRefine = useCallback((text) => {
    const next = String(text || "").trim();
    if (!next || disabled) return;
    onSubmit?.(null, next, { draftRevision: `quick-refine:${draftRevision}:${next}` });
  }, [disabled, draftRevision, onSubmit]);

  const submitDraft = useCallback((event = null, { interrupt = false } = {}) => {
    if (disabled || !canSendWithContext) return undefined;
    return onSubmit?.(event, null, { draftRevision, interrupt });
  }, [canSendWithContext, disabled, draftRevision, onSubmit]);

  const applyMentionCommand = useCallback((command) => {
    if (!command) return;
    const next = applyComposerMention(prompt, mentionRange, command.id);
    setPrompt(next);
    setMentionOpen(false);
    setMentionQuery("");
    setMentionRange(null);
    setMentionIndex(0);
    runComposerCommand(command);
    requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.focus();
      const caret = mentionRange ? mentionRange.start + command.id.length + 2 : next.length;
      textarea.setSelectionRange(caret, caret);
    });
  }, [mentionRange, prompt, runComposerCommand, setPrompt]);

  const removeAttachment = (index) => {
    setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const handlePromptChange = (event) => {
    const value = event.target.value;
    setPrompt(value);
    syncMentionState(value, event.target.selectionStart || value.length);
  };

  const handlePromptKeyDown = (event) => {
    if (mentionOpen && mentionCommands.length) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setMentionIndex((current) => (current + 1) % mentionCommands.length);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setMentionIndex((current) => (current - 1 + mentionCommands.length) % mentionCommands.length);
        return;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        applyMentionCommand(mentionCommands[mentionIndex] || mentionCommands[0]);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setMentionOpen(false);
        return;
      }
    }

    if (
      event.key === "Enter"
      && !event.shiftKey
      && !isComposing
      && !event.nativeEvent?.isComposing
    ) {
      event.preventDefault();
      submitDraft(event, { interrupt: Boolean(event.metaKey || event.ctrlKey) });
    }
  };

  const renderContextItem = (item) => {
    if (item.kind === "studio") {
      return (
        <StudioPlaceChip
          key={item.key}
          preference={studioPlacePreference}
          options={studioPlaceOptions}
          connected={studioConnected}
          studioEnabled={studioEnabled}
          selectingTargetId={selectingStudioTargetId}
          pickerOpen={studioPlacePickerOpen}
          onPickerOpenChange={onStudioPlacePickerOpenChange}
          onSelectPlace={onSelectStudioPlace}
        />
      );
    }
    if (item.kind === "upload") {
      return <ImageUploadChip key={item.key} upload={item.upload} />;
    }
    if (item.kind === "file") {
      return (
        <FileContextChip
          key={item.key}
          file={item.file}
          index={item.index}
          onRemove={removeAttachment}
        />
      );
    }
    return (
      <RobloxAssetContextChip
        key={item.key}
        asset={item.asset}
        onRemove={onRemoveProjectAsset}
      />
    );
  };

  const usage = (
    <TokenBar
      tokensLeft={tokensLeft}
      tokensLimit={tokensLimit}
      resetsAt={resetsAt}
      plan={planKey}
      unlimitedTokens={unlimitedTokens}
      devOverride={devOverride}
      dailyUsage={dailyUsage}
      includedUsage={includedUsage}
      premiumBalance={premiumBalance}
      isFreeUsagePlan={isFreeUsagePlan}
      usageLoading={billingLoading}
      usageUnavailable={
        !unlimitedTokens
        && (Boolean(billingError) || (isFreeUsagePlan && !billingLoading && !dailyUsage))
      }
    />
  );

  return (
    <div className="border-t border-[var(--ds-border-subtle)] bg-[var(--ds-bg-workspace)] px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 sm:px-3">
      <div className="relative z-20 mx-auto max-w-[768px] overflow-visible rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-1)] transition-colors duration-150 focus-within:border-[var(--ds-accent-border)]">
        {(activeOperationStatus || queuedOperations.length > 0) && (
          <div className="border-b border-[var(--ds-border-subtle)] px-2 py-1.5" aria-label="Chat operation status">
            <div className="flex items-center gap-2 text-[10px]">
              {activeOperationStatus ? (
                <span className="inline-flex items-center gap-1.5 font-bold text-[var(--ds-text-secondary)]">
                  {(operationState?.isBusy || activeOperationStatus === "Stopping") && (
                    <Loader className="h-3 w-3 animate-spin text-[var(--ds-accent)]" />
                  )}
                  {activeOperationStatus}
                </span>
              ) : null}
              {queuedOperations.length > 0 ? (
                <span className="text-[var(--ds-text-muted)]">
                  {queuedOperations.length} queued
                </span>
              ) : null}
              {operationState?.paused && queuedOperations.length > 0 ? (
                <span className="ml-auto flex items-center gap-1">
                  <button
                    type="button"
                    onClick={onSendNext}
                    className="rounded-md border border-[var(--ds-border-subtle)] px-2 py-1 font-bold text-[var(--ds-text-secondary)] hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)] focus-ring"
                  >
                  {queuedOperations[0]?.status === "Failed" ? "Retry failed" : "Send next"}
                  </button>
                  <button
                    type="button"
                    onClick={onResumeQueue}
                    className="rounded-md bg-[var(--ds-accent-soft)] px-2 py-1 font-bold text-[var(--ds-accent)] hover:bg-[var(--ds-accent-soft)] focus-ring"
                  >
                    Resume
                  </button>
                </span>
              ) : null}
            </div>
            {queuedOperations.length > 0 ? (
              <div className="mt-1 flex max-h-20 flex-col gap-1 overflow-y-auto scrollbar-subtle">
                {queuedOperations.map((operation, index) => (
                  <div
                    key={operation.id}
                    className="flex items-center gap-2 rounded-md bg-[var(--ds-fill-subtle)] px-2 py-1 text-[10px] text-[var(--ds-text-secondary)]"
                  >
                    <span className="shrink-0 font-bold text-[var(--ds-text-muted)]">{index + 1}</span>
                    <span className="min-w-0 flex-1 truncate">{operation.prompt || operation.type}</span>
                    <button
                      type="button"
                      onClick={() => onRemoveQueued?.(operation.id)}
                      className="rounded p-0.5 text-[var(--ds-text-muted)] hover:bg-[color-mix(in_srgb,var(--ds-danger)_12%,transparent)] hover:text-[var(--ds-danger)] focus-ring"
                      aria-label={`Remove queued prompt ${index + 1}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}
        {(refineTarget || rewindTarget?.messageId || contextItems.length > 0) && (
          <div className="flex min-h-9 items-center gap-1.5 overflow-visible border-b border-[var(--ds-border-subtle)] px-2 py-1">
            {refineTarget && (
              <div className="inline-flex h-7 max-w-[280px] shrink-0 items-center gap-1.5 rounded-md border border-[var(--ds-accent-border)] bg-[var(--ds-accent-soft)] px-2 text-[10px] font-bold text-[var(--ds-accent)] transition-[border-color,background-color,color,opacity] duration-150 motion-safe:animate-fade-in-up">
                <Wand2 className="h-3 w-3 shrink-0" />
                <span className="truncate">
                  {studioConnected ? "Refining in Studio: " : "Refining workspace: "}
                  {refineTarget.title || "current project"}
                  {messageHasRefineableFiles(refineTarget)
                    ? ` · ${Array.isArray(refineTarget.files) && refineTarget.files.length
                      ? `${refineTarget.files.length} file${refineTarget.files.length === 1 ? "" : "s"}`
                      : "1 script"}`
                    : ""}
                  {refineTarget.revision ? ` · rev ${String(refineTarget.revision).slice(0, 8)}` : ""}
                </span>
                <button
                  type="button"
                  onClick={onCancelRefine}
                  className="rounded p-0.5 text-[var(--ds-accent)] hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)] focus-ring"
                  aria-label="Cancel refine"
                  title="Cancel refine (Esc)"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            {rewindTarget?.messageId ? (
              <div className="inline-flex h-7 max-w-[220px] shrink-0 items-center gap-1.5 rounded-md border border-[color-mix(in_srgb,var(--ds-warning)_35%,transparent)]  bg-[color-mix(in_srgb,var(--ds-warning)_12%,transparent)] px-2 text-[10px] font-bold text-[var(--ds-warning)] transition-[border-color,background-color,color,opacity] duration-150 motion-safe:animate-fade-in-up">
                <Edit className="h-3 w-3 shrink-0" />
                <span className="truncate">Continuing from earlier message</span>
                <button
                  type="button"
                  onClick={onCancelRewind}
                  className="rounded p-0.5 text-[var(--ds-warning)] hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)] focus-ring"
                  aria-label="Cancel edit from earlier message"
                  title="Cancel edit from earlier message"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : null}
            <div className="flex min-w-0 items-center gap-1.5 overflow-hidden" aria-label="Prompt context items">
              {visibleContextItems.map(renderContextItem)}
            </div>
            {hiddenContextCount > 0 && (
              <div className="relative shrink-0">
                <button
                  ref={contextButtonRef}
                  type="button"
                  onClick={() => setContextOpen((value) => !value)}
                  className="inline-flex h-7 items-center rounded-md border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] px-2 text-[10px] font-bold text-[var(--ds-text-secondary)] transition-[border-color,background-color,color,opacity] duration-150 hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)] focus-ring"
                  aria-expanded={contextOpen}
                  aria-haspopup="dialog"
                  aria-label={`Show ${hiddenContextCount} more context items`}
                >
                  +{hiddenContextCount}
                </button>
                {contextOpen && (
                  <div
                    ref={contextPanelRef}
                    role="dialog"
                    aria-label="All prompt context"
                    className="absolute bottom-full right-0 z-30 mb-2 w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-overlay)] p-2 shadow-2xl"
                  >
                    <div className="mb-2 flex items-center justify-between px-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--ds-text-muted)]">Selected context</span>
                      <button
                        type="button"
                        onClick={() => setContextOpen(false)}
                        className="rounded-md p-1 text-[var(--ds-text-muted)] hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)] focus-ring"
                        aria-label="Close context manager"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="flex max-h-48 flex-wrap gap-1.5 overflow-y-auto scrollbar-subtle">
                      {contextItems.map(renderContextItem)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {refineTarget ? (
          <div className="border-b border-[var(--ds-border-subtle)] px-2 py-1.5">
            <RefineChips onRefine={submitQuickRefine} isRefining={isGenerating} />
          </div>
        ) : null}

        <div className="relative">
          {mentionOpen && (
            <ComposerCommandMenu
              query={mentionQuery}
              activeIndex={mentionIndex}
              onHoverIndex={setMentionIndex}
              onSelect={applyMentionCommand}
            />
          )}

          <div className="relative min-h-[44px] px-3 pt-2">
            <textarea
              ref={textareaRef}
              id="tour-prompt-box"
              data-tour="prompt-input"
              className="min-h-[44px] w-full resize-none border-none bg-transparent px-0 py-1.5 text-[14px] leading-relaxed text-[var(--ds-text)] outline-none transition-[height,color,opacity] duration-150 placeholder:text-[var(--ds-text-muted)] focus:ring-0 disabled:opacity-50 md:text-[15px]"
              rows={1}
              placeholder={placeholder}
              value={prompt}
              onChange={handlePromptChange}
              disabled={disabled}
              aria-label="Prompt input"
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              onKeyDown={handlePromptKeyDown}
              onClick={(event) => syncMentionState(prompt, event.target.selectionStart || 0)}
              onSelect={(event) => syncMentionState(prompt, event.target.selectionStart || 0)}
            />
          </div>

          <div className="flex items-center justify-between gap-2 px-2 pb-2 pt-1">
            <div className="flex min-w-0 items-center gap-1">
              <input
                ref={fileInputRef}
                type="file"
                id="chat-composer-file-upload"
                className="hidden"
                multiple
                onChange={onFileUpload}
                accept={`${ROBLOX_DECAL_ACCEPT},.lua,.txt,.json`}
                disabled={disabled || robloxImageUploading}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || robloxImageUploading}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--ds-text-muted)] transition-[background-color,color,opacity,transform] duration-150 hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)] active:scale-95 focus-ring disabled:cursor-not-allowed disabled:opacity-40"
                title="Upload image to Roblox or attach a code/text file"
                aria-label="Upload image to Roblox or attach a code/text file"
              >
                {robloxImageUploading
                  ? <Loader className="h-4 w-4 animate-spin" />
                  : <Plus className="h-4 w-4" />}
              </button>
              <ModeSelector mode={mode} onModeChange={onModeChange} disabled={disabled || isGenerating} />
              <button
                type="button"
                onClick={() => onModeChange?.(planFirst ? "agent" : "plan")}
                disabled={disabled || isGenerating}
                aria-pressed={planFirst}
                className={`inline-flex h-7 items-center rounded-md px-2 text-[10px] font-bold transition-[background-color,color,opacity] duration-150 focus-ring disabled:opacity-40 ${
                  planFirst
                    ? "bg-[color-mix(in_srgb,var(--ds-plan)_10%,transparent)] text-[var(--ds-plan)]"
                    : "text-[var(--ds-text-muted)] hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text-secondary)]"
                }`}
                title="Plan before making changes"
              >
                Plan first
              </button>
              <div className="relative">
                <button
                  ref={usageButtonRef}
                  type="button"
                  onClick={() => setUsageOpen((value) => !value)}
                  className={`inline-flex h-7 items-center gap-1 rounded-md px-2 text-[10px] font-bold transition-[background-color,color,opacity] duration-150 focus-ring ${
                    usageOpen
                      ? "bg-[var(--ds-fill-hover)] text-[var(--ds-text)]"
                      : "text-[var(--ds-text-muted)] hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text-secondary)]"
                  }`}
                  aria-expanded={usageOpen}
                  aria-haspopup="dialog"
                >
                  Usage
                  <ChevronDown className={`h-3 w-3 transition-transform duration-150 ${usageOpen ? "rotate-180" : ""}`} />
                </button>
                {usageOpen && (
                  <div
                    ref={usagePanelRef}
                    role="dialog"
                    aria-label="Usage details"
                    className="absolute bottom-full left-0 z-30 mb-2 w-64 rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-overlay)] p-3 shadow-2xl"
                  >
                    {usage}
                  </div>
                )}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <div className="relative">
                <button
                  ref={controlsButtonRef}
                  type="button"
                  onClick={() => setControlsOpen((value) => !value)}
                  className={`flex h-7 w-7 items-center justify-center rounded-md transition-[background-color,color,opacity,transform] duration-150 active:scale-95 focus-ring ${
                    controlsOpen
                      ? "bg-[var(--ds-fill-hover)] text-[var(--ds-text)]"
                      : "text-[var(--ds-text-muted)] hover:bg-[var(--ds-fill-hover)] hover:text-[var(--ds-text)]"
                  }`}
                  aria-expanded={controlsOpen}
                  aria-controls={controlsId}
                  aria-haspopup="dialog"
                  title="Open advanced Studio and Roblox settings"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                </button>
                {controlsPresence.present && (
                  <div
                    ref={controlsPanelRef}
                    id={controlsId}
                    role="dialog"
                    aria-label="Studio and Roblox settings"
                    aria-hidden={!controlsOpen}
                    className={`absolute bottom-full right-0 z-30 mb-2 w-80 max-w-[min(20rem,92vw)] origin-bottom-right rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-overlay)] p-3 shadow-2xl transition-[opacity,transform] duration-[180ms] ${
                      controlsPresence.entering
                        ? "translate-y-0 scale-100 opacity-100"
                        : "pointer-events-none translate-y-1 scale-95 opacity-0"
                    }`}
                  >
                    <div className="mb-3">
                      <h2 className="text-sm font-bold text-[var(--ds-text)]">Advanced setup</h2>
                      <p className="text-[10px] text-[var(--ds-text-muted)]">Studio and Roblox connections</p>
                    </div>
                    <div className="flex max-h-[min(24rem,50vh)] flex-col gap-3 overflow-y-auto scrollbar-subtle">
                      <StudioControls
                        connected={studioConnected}
                        connectionType={studioConnectionType}
                        connectionState={studioConnectionState}
                        capabilities={studioCapabilities}
                        loading={studioLoading}
                        studioEnabled={studioEnabled}
                        onStudioEnabledChange={onStudioEnabledChange}
                        applyMode={studioApplyMode}
                        onApplyModeChange={onStudioApplyModeChange}
                        autoPushEnabled={studioAutoPushEnabled}
                        onAutoPushEnabledChange={onStudioAutoPushEnabledChange}
                        autoPushPolicy={studioAutoPushPolicy}
                        onAutoPushPolicyChange={onStudioAutoPushPolicyChange}
                        autoPushAuthorized={studioAutoPushAuthorized}
                      />
                      {studioConnected && Array.isArray(studioCollaborators) && studioCollaborators.length > 0 && (
                        <span
                          className="inline-flex w-fit items-center gap-1 rounded-full border border-[color-mix(in_srgb,var(--ds-warning)_35%,transparent)]  bg-[color-mix(in_srgb,var(--ds-warning)_12%,transparent)] px-2 py-0.5 text-[11px] text-[var(--ds-warning)] "
                          title={studioCollaborators
                            .map((collaborator) => `${collaborator.label || "collaborator"}${
                              Array.isArray(collaborator.activePaths) && collaborator.activePaths.length
                                ? ` — ${collaborator.activePaths.slice(0, 3).join(", ")}`
                                : ""
                            }`)
                            .join("\n")}
                        >
                          {studioCollaborators.length} collaborator{studioCollaborators.length === 1 ? "" : "s"} on this place
                        </span>
                      )}
                      <RobloxCloudControls
                        connected={robloxConnected}
                        loading={robloxLoading}
                        selectedCreator={robloxSelectedCreator}
                        uploadAvailable={robloxUploadAvailable}
                        uploadState={robloxUploadState}
                        uploadDisabledReason={robloxUploadDisabledReason}
                        assetUploadsEnabled={robloxAssetUploadsEnabled}
                        onAssetUploadsEnabledChange={onRobloxAssetUploadsEnabledChange}
                        selectedAssetCount={robloxProjectAssets.length}
                        onOpenAssetLibrary={onOpenAssetLibrary}
                        assetLibraryAvailable={robloxAssetLibraryAvailable}
                        assetLibraryDisabledReason={robloxAssetLibraryDisabledReason}
                      />
                    </div>
                  </div>
                )}
              </div>
              {isGenerating && canSendWithContext ? (
                <button
                  type="button"
                  onClick={(event) => submitDraft(event, { interrupt: true })}
                  disabled={disabled}
                  className="inline-flex h-8 items-center rounded-md border border-[color-mix(in_srgb,var(--ds-warning)_35%,transparent)] bg-[color-mix(in_srgb,var(--ds-warning)_12%,transparent)] px-2 text-[10px] font-bold text-[var(--ds-warning)] transition-colors hover:bg-[color-mix(in_srgb,var(--ds-warning)_20%,transparent)] focus-ring disabled:opacity-40"
                  title="Stop the active operation, then send this prompt (Cmd/Ctrl+Enter)"
                >
                  Stop &amp; send
                </button>
              ) : null}
              <button
                type="button"
                id="tour-generate-button"
                data-tour="generate-btn"
                onClick={(event) => (isGenerating ? onStop?.() : submitDraft(event))}
                disabled={isGenerating ? disabled || !onStop : disabled || !canSendWithContext}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-[background-color,color,opacity,transform] duration-150 active:scale-95 focus-ring disabled:opacity-40 disabled:active:scale-100 ${
                  isGenerating
                    ? "border border-[color-mix(in_srgb,var(--ds-danger)_35%,transparent)] bg-[color-mix(in_srgb,var(--ds-danger)_12%,transparent)] text-[var(--ds-danger)] hover:bg-[color-mix(in_srgb,var(--ds-danger)_20%,transparent)]"
                    : "bg-[var(--ds-accent)] text-[var(--ds-accent-foreground)] hover:bg-[var(--ds-accent-hover)]"
                }`}
                aria-label={isGenerating ? "Stop generation" : "Send prompt"}
                title={isGenerating ? "Stop generation" : "Send prompt"}
              >
                {isGenerating
                  ? <Square className="h-3.5 w-3.5 fill-current" />
                  : <SendPrompt className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      <AssetLibraryModal
        open={assetLibraryOpen}
        onClose={onCloseAssetLibrary}
        projectId={assetProjectId}
        robloxStatus={robloxStatus}
        robloxIdentity={robloxStatus?.connection || null}
        destination={robloxSelectedCreator}
        persistedAssets={robloxProjectAssets}
        onConfirm={onConfirmProjectAssets}
        saving={projectAssetSaving}
      />
    </div>
  );
}
