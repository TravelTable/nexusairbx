import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Plus,
  X,
  SendPrompt,
  Loader,
  RefreshCw,
  Wand2,
  ChevronDown,
  Check,
  MessageSquare,
  ClipboardList,
  SlidersHorizontal,
} from "lib/icons";
import { UnifiedStatusBar, TokenBar } from "../AiComponents";
import { CHAT_MODES } from "../chatConstants";
import StudioControls from "../workspace/StudioControls";
import RobloxCloudControls from "../workspace/RobloxCloudControls";
import AssetLibraryModal from "../workspace/AssetLibraryModal";
import { Segmented } from "../../ui";
import { ROBLOX_DECAL_ACCEPT } from "../../../hooks/useRobloxImageUpload";

function ModeSelector({ mode, onModeChange, disabled }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const current = CHAT_MODES.find((m) => m.id === mode) || CHAT_MODES[0];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        className={`inline-flex h-8 items-center gap-1.5 px-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all focus-ring disabled:opacity-40 disabled:cursor-not-allowed ${current.bg} ${current.color} border-white/10 hover:bg-white/10`}
        title="Select mode"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {current.icon}
        {current.label}
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          className="absolute bottom-full left-0 mb-2 w-64 rounded-2xl border border-white/10 bg-[#0D0D0D] backdrop-blur-2xl shadow-2xl z-50 p-1.5"
          role="listbox"
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
                className={`w-full flex items-start gap-2.5 px-2.5 py-2 rounded-xl text-left transition-all ${
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
        </div>
      )}
    </div>
  );
}

function ImageUploadChip({ upload }) {
  const name = upload?.fileName || "Image";
  return (
    <div className="flex h-10 max-w-[190px] shrink-0 items-center gap-2 rounded-lg border border-amber-400/25 bg-amber-400/10 pl-1.5 pr-2">
      <Loader className="h-4 w-4 shrink-0 animate-spin text-amber-200" />
      <span className="min-w-0 truncate text-[10px] font-bold text-amber-100">Uploading {name}</span>
    </div>
  );
}

function FileContextChip({ file, index, onRemove }) {
  const name = file?.name || "Attachment";

  return (
    <div className="group/file relative flex h-10 max-w-[190px] shrink-0 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.045] pl-1.5 pr-7">
      <span className="inline-flex h-7 shrink-0 items-center rounded-md border border-white/10 bg-black/35 px-1.5 text-[9px] font-black text-gray-400">
        FILE
      </span>
      <span className="min-w-0 truncate text-[10px] font-bold text-gray-300">{name}</span>
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-500 transition-colors hover:bg-red-500/10 hover:text-red-300 focus-ring"
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
    <div className="group/file relative flex h-10 max-w-[240px] shrink-0 items-center gap-2 rounded-lg border border-[#00f5d4]/20 bg-[#00f5d4]/10 pl-1.5 pr-7">
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
        className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#00f5d4]/60 transition-colors hover:bg-red-500/10 hover:text-red-300 focus-ring"
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
  isFreeUsagePlan,
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
  const textareaRef = useRef(null);
  const controlsId = "chat-composer-controls";
  const contextItemCount = attachments.length + robloxProjectAssets.length + robloxImageUploads.length;

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "0px";
    const nextHeight = Math.min(Math.max(textarea.scrollHeight, 42), 160);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > 160 ? "auto" : "hidden";
  }, [prompt]);

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePromptKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !isComposing && !e.nativeEvent?.isComposing) {
      e.preventDefault();
      onSubmit?.();
    }
  };

  return (
    <div className="bg-gradient-to-t from-black via-black/80 to-transparent p-3">
      <div className="mx-auto max-w-5xl space-y-2.5">
        <UnifiedStatusBar isGenerating={isGenerating} stage={generationStage} />

        {refineTarget && (
          <div className="px-1">
            <div className="inline-flex max-w-full items-center gap-2 rounded-lg border border-[#00f5d4]/20 bg-[#00f5d4]/10 px-2.5 py-1 text-[11px] font-bold text-[#00f5d4]">
              <RefreshCw className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Refining: {refineTarget.title || "current artifact"}</span>
              <button
                type="button"
                onClick={onCancelRefine}
                className="ml-0.5 rounded-md p-0.5 text-[#00f5d4]/70 transition-colors hover:bg-white/10 hover:text-white focus-ring"
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
            className="absolute -inset-0.5 rounded-2xl blur opacity-15 transition duration-500 group-focus-within:opacity-35"
            style={{
              background: `linear-gradient(to right, ${themePrimary || "#9b5de5"}, ${themeSecondary || "#00f5d4"})`,
            }}
            aria-hidden="true"
          />
          <div className="relative flex flex-col gap-2 rounded-2xl border border-white/10 bg-ink-800/95 p-2 shadow-panel backdrop-blur-xl">
            <div className="flex flex-wrap items-center gap-2">
              <ModeSelector mode={mode} onModeChange={onModeChange} disabled={disabled} />
              <div
                className={`inline-flex h-8 items-center rounded-lg border px-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                  isGenerating ? "bg-[#00f5d4] text-black animate-pulse" : "bg-white/5 text-gray-500"
                } ${isGenerating ? "border-[#00f5d4]" : "border-white/10"}`}
                aria-live="polite"
              >
                {isGenerating ? generationStage || "Working" : "Ready"}
              </div>
              <div className="hidden h-px min-w-[1rem] flex-1 bg-white/5 sm:block" />
              {onImprovePrompt && (
                <button
                  type="button"
                  onClick={() => onImprovePrompt()}
                  disabled={disabled || isImproving || !prompt?.trim()}
                  data-tour="improve-btn"
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#9b5de5]/25 bg-[#9b5de5]/10 px-2.5 text-[10px] font-bold uppercase tracking-wider text-[#c9b3f7] transition-all hover:bg-[#9b5de5]/20 hover:text-white focus-ring disabled:cursor-not-allowed disabled:opacity-40"
                  title="Expand your prompt into a detailed brief"
                  aria-label="Improve my prompt"
                >
                  {isImproving ? (
                    <Loader className="h-3 w-3" />
                  ) : (
                    <Wand2 className="h-3 w-3" />
                  )}
                  {isImproving ? "Improving" : "Improve"}
                </button>
              )}
              <button
                type="button"
                onClick={() => setControlsOpen((open) => !open)}
                className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[10px] font-bold uppercase tracking-wider transition-all focus-ring ${
                  controlsOpen
                    ? "border-[#00f5d4]/30 bg-[#00f5d4]/10 text-[#00f5d4]"
                    : "border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                }`}
                aria-expanded={controlsOpen}
                aria-controls={controlsId}
                title={controlsOpen ? "Hide Studio and Roblox controls" : "Show Studio and Roblox controls"}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Controls
                <ChevronDown className={`h-3 w-3 transition-transform ${controlsOpen ? "rotate-180" : ""}`} />
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
                  className="h-8 rounded-lg"
                />
              )}
            </div>

            {controlsOpen && (
              <div id={controlsId} className="rounded-xl border border-white/10 bg-black/25 px-2.5 py-2">
                <div className="flex flex-wrap items-center gap-2">
                  <StudioControls
                    connected={studioConnected}
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
                className="flex gap-2 overflow-x-auto px-0.5 pb-1 [scrollbar-width:thin]"
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

            <TokenBar
              tokensLeft={tokensLeft}
              tokensLimit={tokensLimit}
              resetsAt={resetsAt}
              plan={planKey}
              unlimitedTokens={unlimitedTokens}
              devOverride={devOverride}
              dailyUsage={dailyUsage}
              includedUsage={includedUsage}
              isFreeUsagePlan={isFreeUsagePlan}
            />

            <div className="flex items-end gap-2 rounded-xl border border-white/10 bg-black/30 p-1.5 transition-all focus-within:border-[#00f5d4]/35 focus-within:shadow-[0_0_24px_rgba(0,245,212,0.10)]">
              <div className="relative">
                <input
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
                  className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg bg-white/5 text-gray-500 transition-all hover:bg-white/10 hover:text-white focus-ring ${
                    disabled || robloxImageUploading ? "pointer-events-none opacity-50" : ""
                  }`}
                  title="Upload image to Roblox or attach a code/text file"
                  aria-label="Upload image to Roblox or attach a code/text file"
                >
                  {robloxImageUploading ? <Loader className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
                </label>
              </div>

              <textarea
                ref={textareaRef}
                id="tour-prompt-box"
                data-tour="prompt-input"
                className="min-h-[42px] flex-1 resize-none rounded-lg border-none bg-transparent px-2 py-2.5 text-[14px] leading-relaxed text-gray-100 placeholder-gray-500 outline-none focus:ring-0 disabled:opacity-50 md:text-[15px]"
                rows={1}
                placeholder={placeholder}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={disabled}
                aria-label="Prompt input"
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
                onKeyDown={handlePromptKeyDown}
              />

              <button
                type="button"
                id="tour-generate-button"
                data-tour="generate-btn"
                onClick={() => onSubmit?.()}
                disabled={disabled || (!prompt?.trim() && attachments.length === 0)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-nexus-cyan text-black transition-all hover:shadow-[0_0_24px_rgba(0,245,212,0.45)] active:scale-95 focus-ring disabled:opacity-50 disabled:active:scale-100"
                aria-label={isGenerating ? "Generation in progress" : "Send prompt"}
                title={isGenerating ? "Generation in progress" : "Send prompt"}
              >
                {isGenerating ? <Loader className="h-5 w-5" /> : <SendPrompt className="h-5 w-5" />}
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[10px] font-semibold text-gray-500">
              <span>Enter to send · Shift + Enter for a new line</span>
              {contextItemCount > 0 && (
                <span className="text-gray-400">
                  {contextItemCount} context {contextItemCount === 1 ? "item" : "items"}
                </span>
              )}
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
