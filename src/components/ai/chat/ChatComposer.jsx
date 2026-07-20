import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Plus,
  X,
  SendPrompt,
  Loader,
  RefreshCw,
  ChevronDown,
  Check,
  MessageSquare,
  ClipboardList,
  SlidersHorizontal,
} from "lib/icons";
import { UnifiedStatusBar, TokenBar } from "../AiComponents";
import { CHAT_MODES } from "../chatConstants";
import StudioControls from "../workspace/StudioControls";
import StudioPlaceChip from "../workspace/StudioPlaceChip";
import RobloxCloudControls from "../workspace/RobloxCloudControls";
import AssetLibraryModal from "../workspace/AssetLibraryModal";
import AnimatedPromptPlaceholder from "./AnimatedPromptPlaceholder";
import ComposerCommandMenu from "./ComposerCommandMenu";
import { Segmented } from "../../ui";
import { ROBLOX_DECAL_ACCEPT } from "../../../hooks/useRobloxImageUpload";
import { useMotionPresence } from "../../../hooks/useMotionPresence";
import {
  COMPOSER_COMMANDS,
  applyComposerMention,
  filterComposerCommands,
  getActiveComposerMention,
} from "../../../lib/composerCommands";

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
    const onClickOutside = (e) => {
      if (rootRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
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

  const current = CHAT_MODES.find((m) => m.id === mode) || CHAT_MODES[0];

  return (
    <div className="relative" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          setOpen((o) => {
            const next = !o;
            if (next && typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
              window.requestAnimationFrame(updateMenuPosition);
            }
            return next;
          });
        }}
        disabled={disabled}
        className={`inline-flex h-8 items-center gap-1.5 px-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all duration-150 ease-out active:scale-[0.98] focus-ring disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100 ${current.bg} ${current.color} border-white/10 hover:bg-white/10`}
        title="Select mode"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {current.icon}
        {current.label}
        <ChevronDown className={`w-3 h-3 transition-transform duration-150 ease-out ${open ? "rotate-180" : ""}`} />
      </button>

      {menuPresence.present && menuPosition && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              className={`fixed z-[9999] overflow-y-auto rounded-2xl border border-white/10 bg-[#0D0D0D] p-1.5 shadow-2xl backdrop-blur-2xl transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none ${
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
              {CHAT_MODES.map((m) => {
                const selected = m.id === mode;
                return (
                  <button
                    key={m.id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      onModeChange?.(m.id);
                      setOpen(false);
                    }}
                    className={`w-full flex items-start gap-2.5 px-2.5 py-2 rounded-xl text-left transition-[background-color,border-color,transform] duration-150 ease-out hover:translate-x-0.5 ${
                      selected ? "bg-white/[0.07] border border-white/10" : "border border-transparent hover:bg-white/5"
                    }`}
                  >
                    <span className={`mt-0.5 ${m.color}`}>{m.icon}</span>
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white">{m.label}</span>
                        {selected && <Check className="w-3 h-3 text-[#00f5d4]" />}
                      </span>
                      <span className="block text-[10px] text-gray-500 leading-snug mt-0.5">{m.description}</span>
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
    <div className="flex h-10 max-w-[190px] shrink-0 items-center gap-2 rounded-lg border border-amber-400/25 bg-amber-400/10 pl-1.5 pr-2 transition-[border-color,background-color,opacity,transform] duration-150 ease-out motion-safe:animate-fade-in-scale motion-reduce:transition-none">
      <Loader className="h-4 w-4 shrink-0 animate-spin text-amber-200" />
      <span className="min-w-0 truncate text-[10px] font-bold text-amber-100">Uploading {name}</span>
    </div>
  );
}

function FileContextChip({ file, index, onRemove }) {
  const name = file?.name || "Attachment";

  return (
    <div className="group/file relative flex h-10 max-w-[190px] shrink-0 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.045] pl-1.5 pr-7 transition-[border-color,background-color,opacity,transform] duration-150 ease-out motion-safe:animate-fade-in-scale motion-reduce:transition-none">
      <span className="inline-flex h-7 shrink-0 items-center rounded-md border border-white/10 bg-black/35 px-1.5 text-[9px] font-black text-gray-400">
        FILE
      </span>
      <span className="min-w-0 truncate text-[10px] font-bold text-gray-300">{name}</span>
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-500 transition-[background-color,color,transform] duration-150 ease-out hover:bg-red-500/10 hover:text-red-300 active:scale-95 focus-ring"
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
    <div className="group/file relative flex h-10 max-w-[240px] shrink-0 items-center gap-2 rounded-lg border border-[#00f5d4]/20 bg-[#00f5d4]/10 pl-1.5 pr-7 transition-[border-color,background-color,opacity,transform] duration-150 ease-out motion-safe:animate-fade-in-scale motion-reduce:transition-none">
      {asset?.thumbnailUrl ? (
        <img src={asset.thumbnailUrl} alt="" className="h-7 w-7 shrink-0 rounded-md object-cover" />
      ) : (
        <span className="inline-flex h-7 max-w-[54px] shrink-0 items-center truncate rounded-md border border-[#00f5d4]/20 bg-black/30 px-1.5 text-[8px] font-black uppercase text-[#00f5d4]">
          {type}
        </span>
      )}
      <span className="min-w-0">
        <span className="block truncate text-[10px] font-bold text-[#d7fff8]">{name}</span>
        <span className="block truncate text-[9px] font-semibold text-[#00f5d4]/70">
          {type} · {asset?.assetId}
        </span>
      </span>
      <button
        type="button"
        onClick={() => onRemove?.(asset?.assetId)}
        className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#00f5d4]/60 transition-[background-color,color,transform] duration-150 ease-out hover:bg-red-500/10 hover:text-red-300 active:scale-95 focus-ring"
        aria-label={`Remove ${name}`}
        title={`Remove ${name}`}
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

/**
 * Slim composer for the linear flow: status strip, token bar, mode selector,
 * attachments, prompt, send. The mode selector picks the Cursor-style operating
 * mode; clarifying questions only appear in Plan and Ask modes.
 */
export default function ChatComposer({
  prompt,
  setPrompt,
  attachments,
  setAttachments,
  robloxImageUploading = false,
  robloxImageUploads = [],
  onSubmit,
  isGenerating,
  generationStage,
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
  themePrimary,
  themeSecondary,
  refineTarget,
  onCancelRefine,
  onFileUpload,
  onImprovePrompt,
  isImproving,
  disabled,
  mode = "agent",
  onModeChange,
  view,
  onViewChange,
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
  const [isComposing, setIsComposing] = useState(false);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionRange, setMentionRange] = useState(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const controlsPresence = useMotionPresence(controlsOpen, 180);
  const controlsId = "chat-composer-controls";
  const contextItemCount = attachments.length + robloxProjectAssets.length + robloxImageUploads.length;
  const canSendWithContext =
    Boolean(prompt?.trim()) || attachments.length > 0 || robloxProjectAssets.length > 0;
  const mentionCommands = filterComposerCommands(mentionQuery, COMPOSER_COMMANDS);
  const showAnimatedPlaceholder = !String(prompt || "").trim();

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "0px";
    const nextHeight = Math.min(Math.max(textarea.scrollHeight, 36), 120);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > 120 ? "auto" : "hidden";
  }, [prompt]);

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
      default:
        break;
    }
  }, [onImprovePrompt, onOpenAssetLibrary, onStudioPlacePickerOpenChange, prompt]);

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
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      const caret = mentionRange
        ? mentionRange.start + command.id.length + 2
        : next.length;
      el.setSelectionRange(caret, caret);
    });
  }, [mentionRange, prompt, runComposerCommand, setPrompt]);

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePromptChange = (e) => {
    const value = e.target.value;
    setPrompt(value);
    syncMentionState(value, e.target.selectionStart || value.length);
  };

  const handlePromptKeyDown = (e) => {
    if (mentionOpen && mentionCommands.length) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex((current) => (current + 1) % mentionCommands.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex((current) => (current - 1 + mentionCommands.length) % mentionCommands.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        applyMentionCommand(mentionCommands[mentionIndex] || mentionCommands[0]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMentionOpen(false);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey && !isComposing && !e.nativeEvent?.isComposing) {
      e.preventDefault();
      onSubmit?.();
    }
  };

  return (
    <div className="bg-gradient-to-t from-black via-black/80 to-transparent p-2.5">
      <div className="mx-auto max-w-5xl space-y-1.5">
        <UnifiedStatusBar isGenerating={isGenerating} stage={generationStage} />

        {refineTarget && (
          <div className="px-1">
            <div className="inline-flex max-w-full items-center gap-2 rounded-lg border border-[#00f5d4]/20 bg-[#00f5d4]/10 px-2.5 py-1 text-[11px] font-bold text-[#00f5d4] transition-[border-color,background-color,opacity,transform] duration-150 ease-out motion-safe:animate-fade-in-scale motion-reduce:transition-none">
              <RefreshCw className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Refining: {refineTarget.title || "current artifact"}</span>
              <button
                type="button"
                onClick={onCancelRefine}
                className="ml-0.5 rounded-md p-0.5 text-[#00f5d4]/70 transition-[background-color,color,transform] duration-150 ease-out hover:bg-white/10 hover:text-white active:scale-95 focus-ring"
                aria-label="Cancel refine"
                title="Cancel refine"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        <div className="relative group z-20">
          <div
            className="absolute -inset-0.5 rounded-2xl blur opacity-10 transition duration-500 group-focus-within:opacity-30"
            style={{
              background: `linear-gradient(to right, ${themePrimary || "#9b5de5"}, ${themeSecondary || "#00f5d4"})`,
            }}
            aria-hidden="true"
          />
          <div className="relative flex flex-col gap-1.5 rounded-2xl border border-white/10 bg-ink-800/95 p-1.5 shadow-panel backdrop-blur-xl">
            <div className="flex flex-wrap items-center gap-1.5 px-0.5">
              <ModeSelector mode={mode} onModeChange={onModeChange} disabled={disabled} />
              <div className="hidden h-px min-w-[0.5rem] flex-1 bg-transparent sm:block" />
              <button
                type="button"
                onClick={() => setControlsOpen((open) => !open)}
                className={`inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[10px] font-bold uppercase tracking-wider transition-[border-color,background-color,color,transform] duration-150 ease-out active:scale-[0.98] focus-ring ${
                  controlsOpen
                    ? "border-[#00f5d4]/30 bg-[#00f5d4]/10 text-[#00f5d4]"
                    : "border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                }`}
                aria-expanded={controlsOpen}
                aria-controls={controlsId}
                title={controlsOpen ? "Hide Studio and Roblox controls" : "Show Studio and Roblox controls"}
              >
                <SlidersHorizontal className="h-3 w-3" />
                <ChevronDown className={`h-3 w-3 transition-transform duration-150 ease-out ${controlsOpen ? "rotate-180" : ""}`} />
              </button>
              {onViewChange && (
                <Segmented
                  size="sm"
                  options={[
                    { id: "chat", label: "Chat", icon: MessageSquare },
                    { id: "details", label: "Details", icon: ClipboardList },
                  ]}
                  value={view}
                  onChange={onViewChange}
                  className="h-7 rounded-md"
                />
              )}
            </div>

            {studioEnabled && (
              <StudioPlaceChip
                preference={studioPlacePreference}
                options={studioPlaceOptions}
                connected={studioConnected}
                studioEnabled={studioEnabled}
                selectingTargetId={selectingStudioTargetId}
                pickerOpen={studioPlacePickerOpen}
                onPickerOpenChange={onStudioPlacePickerOpenChange}
                onSelectPlace={onSelectStudioPlace}
              />
            )}

            {controlsPresence.present && (
              <div
                id={controlsId}
                className={`rounded-xl border border-white/10 bg-black/25 px-2.5 py-2 transition-[opacity,transform] duration-180 ease-out motion-reduce:transition-none ${
                  controlsPresence.entering
                    ? "translate-y-0 opacity-100 motion-safe:animate-fade-in-scale"
                    : "pointer-events-none -translate-y-1 opacity-0"
                }`}
                aria-hidden={!controlsOpen}
              >
                <div className="flex flex-wrap items-center gap-2">
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
                      className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[11px] text-amber-200"
                      title={studioCollaborators
                        .map((c) => `${c.label || "collaborator"}${Array.isArray(c.activePaths) && c.activePaths.length ? ` — ${c.activePaths.slice(0, 3).join(", ")}` : ""}`)
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

            {contextItemCount > 0 && (
              <div
                className="flex gap-2 overflow-x-auto px-0.5 pb-0.5 motion-safe:animate-fade-in-up [scrollbar-width:thin]"
                aria-label="Prompt context items"
              >
                {robloxImageUploads.map((upload) => (
                  <ImageUploadChip key={upload.id} upload={upload} />
                ))}
                {attachments.map((file, idx) => (
                  <FileContextChip key={`${file?.name || "file"}-${idx}`} file={file} index={idx} onRemove={removeAttachment} />
                ))}
                {robloxProjectAssets.map((asset) => (
                  <RobloxAssetContextChip key={asset.assetId} asset={asset} onRemove={onRemoveProjectAsset} />
                ))}
              </div>
            )}

            <div className="relative">
              {mentionOpen && (
                <ComposerCommandMenu
                  query={mentionQuery}
                  activeIndex={mentionIndex}
                  onHoverIndex={setMentionIndex}
                  onSelect={applyMentionCommand}
                />
              )}

              <div className="flex items-end gap-1.5 rounded-xl border border-white/10 bg-black/30 p-1 transition-[border-color,box-shadow] duration-200 ease-out focus-within:border-[#00f5d4]/35 focus-within:shadow-[0_0_20px_rgba(0,245,212,0.08)] motion-reduce:transition-none">
                <div className="relative">
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
                  <label
                    htmlFor="chat-composer-file-upload"
                    className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg bg-white/5 text-gray-500 transition-[background-color,color,transform] duration-150 ease-out hover:bg-white/10 hover:text-white active:scale-95 focus-ring ${
                      disabled || robloxImageUploading ? "pointer-events-none opacity-50" : ""
                    }`}
                    title="Upload image to Roblox or attach a code/text file"
                    aria-label="Upload image to Roblox or attach a code/text file"
                  >
                    {robloxImageUploading ? <Loader className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  </label>
                </div>

                <div className="relative min-h-[32px] flex-1">
                  <AnimatedPromptPlaceholder visible={showAnimatedPlaceholder} />
                  <textarea
                    ref={textareaRef}
                    id="tour-prompt-box"
                    data-tour="prompt-input"
                    className="min-h-[32px] w-full resize-none rounded-lg border-none bg-transparent px-2 py-1.5 text-[14px] leading-relaxed text-gray-100 outline-none transition-[height,color,opacity] duration-150 ease-out focus:ring-0 disabled:opacity-50 motion-reduce:transition-none md:text-[15px]"
                    rows={1}
                    placeholder=""
                    value={prompt}
                    onChange={handlePromptChange}
                    disabled={disabled}
                    aria-label="Prompt input"
                    aria-autocomplete="list"
                    aria-expanded={mentionOpen}
                    onCompositionStart={() => setIsComposing(true)}
                    onCompositionEnd={() => setIsComposing(false)}
                    onKeyDown={handlePromptKeyDown}
                    onClick={(e) => syncMentionState(prompt, e.target.selectionStart || 0)}
                    onSelect={(e) => syncMentionState(prompt, e.target.selectionStart || 0)}
                  />
                </div>

                <button
                  type="button"
                  id="tour-generate-button"
                  data-tour="generate-btn"
                  onClick={() => onSubmit?.()}
                  disabled={disabled || !canSendWithContext}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-nexus-cyan text-black transition-[transform,box-shadow,opacity,background-color] duration-150 ease-out hover:shadow-[0_0_24px_rgba(0,245,212,0.45)] active:scale-95 focus-ring disabled:opacity-50 disabled:active:scale-100"
                  aria-label={isGenerating ? "Generation in progress" : "Send prompt"}
                  title={isGenerating ? "Generation in progress" : "Send prompt"}
                >
                  {isGenerating ? <Loader className="h-4 w-4" /> : <SendPrompt className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
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
                usageUnavailable={!unlimitedTokens && (Boolean(billingError) || (isFreeUsagePlan && !billingLoading && !dailyUsage))}
              />
              <span className="text-[10px] font-semibold text-gray-500">@ commands · Enter to send</span>
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
