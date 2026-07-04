import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { FolderUploadIcon } from "@hugeicons/core-free-icons";
import { AlertCircle, CheckCircle2, UploadCloud, RefreshCw, X } from "../../../lib/icons";
import { cn } from "../../../lib/utils";
import { PENDING_AUTH_ACTIONS } from "../../../lib/pendingAuthAction";
import { uploadRobloxDecalBatchStream } from "../../../lib/robloxDecalUploadApi";
import { ensureRobloxCapabilities, getRobloxCapability, isCapabilityAuthorized, ROBLOX_UPLOAD_ASSET_CAPABILITIES } from "../../../lib/robloxOAuthApi";
import RobloxAuthorizationRequired from "../../roblox/RobloxAuthorizationRequired";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../shadcn/dialog";
import { Button } from "../../shadcn/button";
import { Badge } from "../../shadcn/badge";
import { Separator } from "../../shadcn/separator";
import { Alert, AlertDescription, AlertTitle } from "../../shadcn/alert";
import DecalUploadItemRow from "./DecalUploadItemRow";
import DecalUploadAllItemsDialog from "./DecalUploadAllItemsDialog";

const ACCEPTED_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".bmp", ".tga"]);
const ACCEPT_ATTRIBUTE = ".png,.jpg,.jpeg,.bmp,.tga,image/png,image/jpeg,image/bmp,image/x-tga,image/tga";
const INLINE_ITEM_LIMIT = 5;
const INGEST_CHUNK_SIZE = 20;
const PLAN_LIMITS = {
  free: 5,
  anon: 5,
  pro: 50,
  pro_plus: 50,
  proplus: 50,
  "pro-plus": 50,
  team: 200,
};

function createClientId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `decal_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}

function extensionFor(fileName = "") {
  const index = String(fileName).lastIndexOf(".");
  return index >= 0 ? String(fileName).slice(index).toLowerCase() : "";
}

function displayNameFor(file) {
  const name = String(file?.name || "NexusRBX Decal");
  return name.slice(0, name.length - extensionFor(name).length).replace(/[_-]+/g, " ").trim().slice(0, 50) || "NexusRBX Decal";
}

function normalizePlanKey(planKey) {
  return String(planKey || "free").trim().toLowerCase().replace(/\s+/g, "_");
}

function limitForPlan(planKey, devOverride = false) {
  if (devOverride) return Number.POSITIVE_INFINITY;
  return PLAN_LIMITS[normalizePlanKey(planKey)] || PLAN_LIMITS.free;
}

function uniqueFiles(files) {
  const seen = new Set();
  return Array.from(files || []).filter((file) => {
    const key = `${file.name}:${file.size}:${file.lastModified}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function mapFileToItem(file) {
  const extension = extensionFor(file.name);
  const validExtension = ACCEPTED_EXTENSIONS.has(extension);
  const previewUrl = file.type?.startsWith("image/") && typeof URL !== "undefined" && URL.createObjectURL
    ? URL.createObjectURL(file)
    : null;
  return {
    clientId: createClientId(),
    file,
    fileName: file.name,
    displayName: displayNameFor(file),
    status: validExtension ? "ready" : "rejected",
    error: validExtension ? null : "Use PNG, JPG, BMP, or TGA images for Roblox decals.",
    previewUrl,
  };
}

function mergeUploadResult(item, result) {
  if (!result) return item;
  return {
    ...item,
    status: result.status,
    assetId: result.assetId || null,
    contentUri: result.contentUri || null,
    operationId: result.operationId || null,
    error: result.error || null,
    code: result.code || null,
    attached: result.attached ?? item.attached,
    attachError: result.attachError ?? item.attachError,
  };
}

export default function RobloxDecalUploadDropdown({
  user = null,
  planKey = "free",
  devOverride = false,
  roblox = null,
  projectId = null,
  onAttached,
  onAuthRequired,
  notify,
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [batch, setBatch] = useState(null);
  const [error, setError] = useState(null);
  const [reauthorizationRequired, setReauthorizationRequired] = useState(false);
  const [allItemsDialogOpen, setAllItemsDialogOpen] = useState(false);
  const [uploadTargetCount, setUploadTargetCount] = useState(0);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const itemsRef = useRef([]);
  const uploadTargetIdsRef = useRef(new Set());

  const limit = limitForPlan(planKey, devOverride);
  const hasFiniteLimit = Number.isFinite(limit);
  const connected = roblox?.connected === true || roblox?.status?.connected === true;
  const selectedCreator = roblox?.selectedCreator || roblox?.status?.connection?.selectedCreator || null;
  const capability = getRobloxCapability(roblox?.status, "roblox_upload_asset");
  const capabilityAuthorized = isCapabilityAuthorized(roblox?.status, "roblox_upload_asset");
  const needsReauthorization =
    !capabilityAuthorized &&
    (
      reauthorizationRequired ||
      capability?.authorized === false ||
      capability?.missingScopes?.length > 0
    );
  const validItems = items.filter((item) => item.status !== "rejected");
  const failedItems = items.filter((item) => item.status === "failed");
  const invalidItems = items.filter((item) => item.status === "rejected");
  const uploadedItems = items.filter((item) => item.status === "succeeded");
  const pendingItems = validItems.filter((item) => item.status !== "succeeded" && item.status !== "uploading");
  const overLimit = hasFiniteLimit && validItems.length > limit;
  const uploadReady = Boolean(user && connected && selectedCreator && !needsReauthorization && !overLimit && !uploading);
  const canUpload = Boolean(uploadReady && pendingItems.length > 0);
  const canRetryFailed = Boolean(uploadReady && failedItems.length > 0);
  const inlineItems = items.slice(0, INLINE_ITEM_LIMIT);
  const hiddenItemCount = Math.max(0, items.length - INLINE_ITEM_LIMIT);
  const finishedUploadCount = useMemo(() => {
    if (!uploading && uploadTargetCount === 0) return 0;
    return items.filter((item) => (
      uploadTargetIdsRef.current.has(item.clientId)
      && item.status !== "uploading"
      && item.status !== "ready"
    )).length;
  }, [items, uploading, uploadTargetCount]);

  const planLabel = useMemo(() => {
    const normalized = normalizePlanKey(planKey);
    if (normalized === "pro_plus" || normalized === "proplus" || normalized === "pro-plus") return "Pro Plus";
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }, [planKey]);

  useEffect(() => {
    if (open && user) roblox?.refresh?.();
  }, [open, user, roblox]);

  useEffect(() => {
    if (!capabilityAuthorized) return;

    setReauthorizationRequired(false);
    setError(null);
  }, [capabilityAuthorized]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => () => {
    itemsRef.current.forEach((item) => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });
  }, []);

  const addFiles = useCallback((fileList) => {
    const files = uniqueFiles(fileList);
    if (!files.length) return;

    setBatch(null);
    setError(null);

    if (files.length <= INGEST_CHUNK_SIZE) {
      setItems((current) => [...current, ...files.map(mapFileToItem)]);
      return;
    }

    let index = 0;
    const ingestChunk = () => {
      const chunk = files.slice(index, index + INGEST_CHUNK_SIZE);
      index += INGEST_CHUNK_SIZE;
      if (!chunk.length) return;
      setItems((current) => [...current, ...chunk.map(mapFileToItem)]);
      if (index < files.length) requestAnimationFrame(ingestChunk);
    };
    ingestChunk();
  }, []);

  const setFolderInput = useCallback((node) => {
    folderInputRef.current = node;
    if (node) {
      node.webkitdirectory = true;
      node.directory = true;
      node.multiple = true;
    }
  }, []);

  const updateDisplayName = useCallback((clientId, displayName) => {
    setItems((current) => current.map((item) => (
      item.clientId === clientId ? { ...item, displayName: displayName.slice(0, 50) } : item
    )));
  }, []);

  const removeItem = useCallback((clientId) => {
    setItems((current) => {
      const removed = current.find((item) => item.clientId === clientId);
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return current.filter((item) => item.clientId !== clientId);
    });
  }, []);

  const clearItems = useCallback(() => {
    items.forEach((item) => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });
    setItems([]);
    setBatch(null);
    setError(null);
    setUploadTargetCount(0);
    uploadTargetIdsRef.current = new Set();
  }, [items]);

  const handleDrop = useCallback((event) => {
    event.preventDefault();
    setDragActive(false);
    addFiles(event.dataTransfer.files);
  }, [addFiles]);

  const handleOpenChange = useCallback((next) => {
    if (!next && uploading) return;
    setOpen(next);
  }, [uploading]);

  const startConnect = useCallback(async () => {
    if (!user) {
      onAuthRequired?.(PENDING_AUTH_ACTIONS.RESTRICTED_GENERATION, "roblox_decal_upload");
      return;
    }
    try {
      await ensureRobloxCapabilities({
        capabilities: ROBLOX_UPLOAD_ASSET_CAPABILITIES,
        returnPath: "/ai",
        pendingAction: { type: "roblox_decal_upload", requiresFileReselect: true },
      });
    } catch (err) {
      setError(err.message || "Failed to start Roblox authorization.");
    }
  }, [onAuthRequired, user]);

  const startReauthorization = useCallback(async () => {
    try {
      await ensureRobloxCapabilities({
        capabilities: ROBLOX_UPLOAD_ASSET_CAPABILITIES,
        returnPath: "/ai",
        pendingAction: { type: "roblox_decal_upload", requiresFileReselect: true },
      });
    } catch (err) {
      setError(err.message || "Failed to start Roblox reauthorization.");
    }
  }, []);

  const applyUploadResults = useCallback((results = []) => {
    const resultsById = new Map(results.map((item) => [item.clientId, item]));
    setItems((current) => current.map((item) => mergeUploadResult(item, resultsById.get(item.clientId))));
  }, []);

  const confirmUpload = useCallback(async ({ failedOnly = false } = {}) => {
    const uploadItems = (failedOnly ? failedItems : validItems).filter((item) => item.status !== "succeeded");
    if (!uploadItems.length || uploading) return;

    try {
      const authorization = await ensureRobloxCapabilities({
        capabilities: ROBLOX_UPLOAD_ASSET_CAPABILITIES,
        returnPath: "/ai",
        pendingAction: { type: "roblox_decal_upload", requiresFileReselect: true },
      });
      if (authorization.authorized === false) return;
    } catch (err) {
      setError(err.message || "Failed to verify Roblox authorization.");
      return;
    }

    const targetIds = new Set(uploadItems.map((item) => item.clientId));
    uploadTargetIdsRef.current = targetIds;
    setUploadTargetCount(uploadItems.length);
    setUploading(true);
    setError(null);
    setReauthorizationRequired(false);
    const requestId = createClientId();

    setItems((current) => current.map((item) => (
      targetIds.has(item.clientId)
        ? { ...item, status: "uploading", error: null, code: null }
        : item
    )));

    try {
      const payload = await uploadRobloxDecalBatchStream({
        requestId,
        files: uploadItems.map((item) => item.file),
        items: uploadItems.map((item) => ({
          clientId: item.clientId,
          fileName: item.fileName,
          displayName: item.displayName,
        })),
        projectId: projectId || undefined,
        onProgress: (result) => {
          setItems((current) => current.map((item) => (
            item.clientId === result.clientId ? mergeUploadResult(item, result) : item
          )));
        },
      });

      applyUploadResults(payload.results || []);
      setBatch(payload);
      roblox?.refresh?.();
      if (payload.attachedAssets?.length) {
        await onAttached?.();
      } else if (projectId && (payload.results || []).some((item) => item.status === "succeeded")) {
        await onAttached?.();
      }
      if (notify) {
        const successCount = (payload.results || []).filter((item) => item.status === "succeeded").length;
        const failedCount = (payload.results || []).filter((item) => item.status === "failed").length;
        notify({
          message: failedCount ? `${successCount} decals uploaded, ${failedCount} failed.` : `${successCount} decals uploaded to Roblox.`,
          type: failedCount ? "error" : "success",
        });
      }
    } catch (err) {
      if (err.code === "ROBLOX_REAUTHORIZATION_REQUIRED") setReauthorizationRequired(true);
      setError(err.message || "Roblox decal upload failed.");
      setItems((current) => current.map((item) => (
        item.status === "uploading" ? { ...item, status: "failed", error: err.message || "Roblox decal upload failed." } : item
      )));
    } finally {
      setUploading(false);
      setUploadTargetCount(0);
      uploadTargetIdsRef.current = new Set();
    }
  }, [applyUploadResults, failedItems, notify, onAttached, projectId, roblox, uploading, validItems]);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-md border border-white/10 bg-white/[0.03] text-white/80 hover:bg-white/[0.08] hover:text-white"
        aria-label="Upload Roblox decals"
        title="Upload Roblox decals"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <HugeiconsIcon icon={FolderUploadIcon} size={18} strokeWidth={1.6} color="currentColor" />
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="max-w-[min(92vw,420px)] gap-0 border-white/10 bg-[#10141d] p-0 text-white shadow-2xl [&>button]:text-white/70 [&>button]:hover:text-white"
          onCloseAutoFocus={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
          onPointerDownOutside={(event) => event.preventDefault()}
          onEscapeKeyDown={(event) => event.preventDefault()}
        >
          <div className="max-h-[min(78vh,640px)] overflow-y-auto p-4 pr-10">
            <DialogHeader className="space-y-0 text-left">
              <div className="flex items-start justify-between gap-3 pr-2">
                <div>
                  <DialogTitle className="text-sm font-semibold text-white">Upload decals</DialogTitle>
                  <DialogDescription className="mt-1 text-xs leading-5 text-white/60">
                    Review images before Roblox receives anything.
                  </DialogDescription>
                </div>
                <Badge variant="outline" className="shrink-0 border-white/15 bg-white/[0.04] text-[11px] text-white/70">
                  {devOverride ? "Dev: Unlimited per batch" : `${planLabel}: ${limit} per batch`}
                </Badge>
              </div>
            </DialogHeader>

            <Separator className="my-3 bg-white/10" />

            {!user ? (
              <Alert className="border-amber-400/30 bg-amber-400/10 text-amber-50">
                <AlertTitle>Sign in required</AlertTitle>
                <AlertDescription className="mt-2 space-y-3 text-xs text-amber-50/80">
                  <p>Sign in before uploading decals to your Roblox account.</p>
                  <Button type="button" size="sm" onClick={startConnect}>Sign in</Button>
                </AlertDescription>
              </Alert>
            ) : needsReauthorization ? (
              <RobloxAuthorizationRequired
                connected
                capabilityIds={ROBLOX_UPLOAD_ASSET_CAPABILITIES}
                onAuthorize={startReauthorization}
                className="border-amber-400/30 bg-amber-400/10 text-amber-50"
              />
            ) : !connected ? (
              <RobloxAuthorizationRequired
                capabilityIds={ROBLOX_UPLOAD_ASSET_CAPABILITIES}
                onAuthorize={startConnect}
                className="border-white/10 bg-white/[0.04] text-white"
                actionLabel="Connect Roblox"
              />
            ) : !selectedCreator ? (
              <Alert className="border-amber-400/30 bg-amber-400/10 text-amber-50">
                <AlertTitle>Choose a creator target</AlertTitle>
                <AlertDescription className="mt-2 space-y-3 text-xs text-amber-50/80">
                  <p>Select a Roblox user or group target before uploading decals.</p>
                  <Button type="button" size="sm" asChild>
                    <a href="/settings?tab=roblox">Open Roblox settings</a>
                  </Button>
                </AlertDescription>
              </Alert>
            ) : null}

            <div
              className={cn(
                "mt-3 rounded-lg border border-dashed p-4 text-center transition-colors",
                dragActive ? "border-cyan-300 bg-cyan-300/10" : "border-white/15 bg-white/[0.03]",
                uploading && "opacity-60"
              )}
              onDragEnter={(event) => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={(event) => {
                event.preventDefault();
                setDragActive(false);
              }}
              onDrop={handleDrop}
            >
              <UploadCloud className="mx-auto h-5 w-5 text-white/55" />
              <div className="mt-2 text-sm font-medium text-white">Drop decal images here</div>
              <p className="mt-1 text-xs text-white/50">PNG, JPG, BMP, or TGA. Folder selection keeps only image files.</p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-center">
                <Button type="button" size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  Choose files
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => folderInputRef.current?.click()} disabled={uploading}>
                  Choose folder
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPT_ATTRIBUTE}
                multiple
                className="sr-only"
                aria-label="Choose decal images"
                onChange={(event) => {
                  addFiles(event.target.files);
                  event.target.value = "";
                }}
              />
              <input
                ref={setFolderInput}
                type="file"
                accept={ACCEPT_ATTRIBUTE}
                className="sr-only"
                aria-label="Choose decal image folder"
                onChange={(event) => {
                  addFiles(event.target.files);
                  event.target.value = "";
                }}
              />
            </div>

            {error ? (
              <Alert variant="destructive" className="mt-3 bg-red-500/10 text-red-100">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Upload blocked</AlertTitle>
                <AlertDescription className="text-xs">{error}</AlertDescription>
              </Alert>
            ) : null}

            {overLimit ? (
              <Alert className="mt-3 border-red-400/30 bg-red-400/10 text-red-50">
                <AlertTitle>Batch limit exceeded</AlertTitle>
                <AlertDescription className="text-xs">
                  {planLabel} can upload {limit} decals at a time. Remove {validItems.length - limit} to continue.
                </AlertDescription>
              </Alert>
            ) : null}

            {invalidItems.length ? (
              <Alert className="mt-3 border-amber-400/30 bg-amber-400/10 text-amber-50">
                <AlertTitle>{invalidItems.length} file{invalidItems.length === 1 ? "" : "s"} skipped</AlertTitle>
                <AlertDescription className="text-xs">Only PNG, JPG, BMP, and TGA files can be uploaded as decals.</AlertDescription>
              </Alert>
            ) : null}

            {uploading && uploadTargetCount > 0 ? (
              <div className="mt-3 text-xs text-cyan-100/80">
                Uploading {finishedUploadCount} of {uploadTargetCount} to Roblox…
              </div>
            ) : null}

            <div className="mt-3 space-y-2" aria-live="polite">
              {items.length === 0 ? (
                <div className="rounded-md border border-white/10 bg-white/[0.03] p-3 text-xs text-white/55">
                  No decal images selected.
                </div>
              ) : (
                <>
                  {inlineItems.map((item) => (
                    <DecalUploadItemRow
                      key={item.clientId}
                      item={item}
                      uploading={uploading}
                      onDisplayNameChange={updateDisplayName}
                      onRemove={removeItem}
                    />
                  ))}
                  {hiddenItemCount > 0 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full justify-center text-xs text-cyan-200 hover:text-cyan-100"
                      onClick={() => setAllItemsDialogOpen(true)}
                    >
                      Show {hiddenItemCount} more
                    </Button>
                  ) : null}
                </>
              )}
            </div>

            {batch && uploadedItems.length > 0 ? (
              <div className="mt-3 flex items-start gap-2 rounded-md border border-emerald-400/25 bg-emerald-400/10 p-3 text-xs text-emerald-50">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <div className="font-semibold">{uploadedItems.length} decal{uploadedItems.length === 1 ? "" : "s"} uploaded</div>
                  <div className="mt-1 text-emerald-50/70">Use the shown rbxassetid values in Studio or generated code.</div>
                </div>
              </div>
            ) : null}

            <Separator className="my-3 bg-white/10" />

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Button type="button" variant="ghost" size="sm" onClick={clearItems} disabled={uploading || items.length === 0}>
                <X className="h-4 w-4" />
                Clear
              </Button>
              <div className="flex flex-col gap-2 sm:flex-row">
                {failedItems.length ? (
                  <Button type="button" variant="outline" size="sm" onClick={() => confirmUpload({ failedOnly: true })} disabled={!canRetryFailed}>
                    <RefreshCw className="h-4 w-4" />
                    Retry failed
                  </Button>
                ) : null}
                <Button type="button" size="sm" onClick={() => confirmUpload()} disabled={!canUpload}>
                  {uploading ? "Uploading..." : `Upload ${pendingItems.length} decal${pendingItems.length === 1 ? "" : "s"}`}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <DecalUploadAllItemsDialog
        open={allItemsDialogOpen}
        onOpenChange={setAllItemsDialogOpen}
        items={items}
        uploading={uploading}
        onDisplayNameChange={updateDisplayName}
        onRemove={removeItem}
      />
    </>
  );
}
