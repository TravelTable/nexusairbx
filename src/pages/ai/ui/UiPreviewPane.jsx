import NexusSelect from "../../../components/ui/NexusSelect";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Maximize2,
  Minus,
  Monitor,
  Plus,
  Smartphone,
  Tablet,
} from "lucide-react";

import useUiPreview from "../../../hooks/useUiPreview";
import { Shimmer } from "../../../components/ai-elements/shimmer";
import "./UiPreviewPane.css";
import WorkingDots from "../../../components/ai/chat/WorkingDots";
import WorkspaceHelp from "../../../components/ai/chat/WorkspaceHelp";

function ViewportIcon({ viewport }) {
  const value = `${viewport?.id || ""} ${viewport?.label || ""}`.toLowerCase();

  if (/mobile|phone|iphone|android/.test(value)) {
    return <Smartphone size={15} />;
  }

  if (/tablet|ipad/.test(value)) {
    return <Tablet size={15} />;
  }

  return <Monitor size={15} />;
}

export default function UiPreviewPane({
  userId,
  designId,
  projectId,
  sourceRevision,
  capture,
  states = [],
  viewports = [],
  capabilities = null,
  lastSuccessfulJobId,
  renderJobs = [],
  onRefreshCapture,
  onRefreshManifest,
  captureBusy = false,
  run = null,
  studioConnected = false,
  hasNodes = false,
  sourceOwned = false,
  studioReceipt = null,
  pendingStudioCommand = null,
  onApplyToStudio,
  onConnectStudio,
  applyBusy = false,
  onRenderStatus,
  previewFailed = false,
  buildFailure = null,
  updatingRevision = false,
}) {
  const [selection, setSelection] = useState({
    snapshotId: "",
    stateId: "default",
    viewportId: "",
  });

  const [zoom, setZoom] = useState(1);
  const [fit, setFit] = useState(true);

  const rendererUnavailable =
    capabilities?.previewEnabled === false ||
    capabilities?.rendererAvailable === false ||
    capabilities?.rendererBackend === "public";

  const selectableStates = states.filter((state) => !state.stale);

  const stateId =
    selection.snapshotId === capture?.snapshotId &&
    selectableStates.some((state) => state.id === selection.stateId)
      ? selection.stateId
      : "default";

  const viewportId = viewports.some(
    (viewport) => viewport.id === selection.viewportId
  )
    ? selection.viewportId
    : viewports[0]?.id;

  const currentCapture =
    Boolean(capture?.snapshotId && capture?.treeHash) &&
    capture.complete !== false &&
    !capture.requiresRecapture &&
    capture.sourceRevision === sourceRevision;

  const renderJobId = currentCapture
    ? renderJobs.find(
        (slot) =>
          slot.stateId === stateId &&
          slot.viewportId === viewportId
      )?.jobId
    : null;

  const data = useUiPreview({
    userId,
    designId,
    projectId,
    sourceRevision,
    snapshotId: currentCapture ? capture.snapshotId : null,
    stateId,
    viewportId,
    enabled: !rendererUnavailable,
    lastSuccessfulJobId,
    renderJobId,
    waitForBuild:
      Boolean(run) &&
      capture?.captureKind !== "design" &&
      stateId === "default" &&
      viewportId === "desktop",
  });

  const reportRef = useRef(onRenderStatus);
  reportRef.current = onRenderStatus;

  useEffect(() => {
    if (
      !currentCapture ||
      stateId !== "default" ||
      data.earlier
    ) {
      return;
    }

    reportRef.current?.({
      status: rendererUnavailable ? "unavailable" : data.status,
      error: data.error,
      preview: data.preview,
      sourceRevision,
      snapshotId: capture?.snapshotId,
    });
  }, [
    currentCapture,
    stateId,
    data.earlier,
    data.status,
    data.error,
    data.preview,
    rendererUnavailable,
    sourceRevision,
    capture?.snapshotId,
  ]);

  useEffect(() => {
    setFit(true);
    setZoom(1);
  }, [viewportId]);

  const failed =
    Boolean(buildFailure) ||
    (hasNodes &&
      (rendererUnavailable ||
        data.status === "error" ||
        (previewFailed && data.status !== "ready")));

  const loading =
    !failed &&
    (Boolean(run) ||
      ["loading", "queued", "rendering"].includes(data.status));

  const retry = async () => {
    await onRefreshManifest?.();
    data.retry();
  };

  const originalViewport = viewports.find(
    (viewport) => viewport.id === data.preview?.viewportId
  );

  const status = buildFailure
    ? "Build failed"
    : failed
      ? "Preview unavailable"
      : run?.stage ||
        (data.earlier
          ? "Updating preview"
          : data.status === "ready"
            ? "Preview ready"
            : currentCapture
              ? "Rendering preview"
              : hasNodes
                ? "Preparing preview"
                : "Ready to design");

  const visibleViewports = useMemo(() => {
    if (viewports.length <= 4) return viewports;
    return viewports.slice(0, 4);
  }, [viewports]);

  const changeState = (value) => {
    setSelection((previous) => ({
      ...previous,
      snapshotId: capture?.snapshotId,
      stateId: value,
    }));
  };

  const changeViewport = (value) => {
    setSelection((previous) => ({
      ...previous,
      viewportId: value,
    }));
  };

  const zoomOut = () => {
    setFit(false);
    setZoom((value) => Math.max(0.5, value - 0.1));
  };

  const zoomIn = () => {
    setFit(false);
    setZoom((value) => Math.min(2, value + 0.1));
  };

  return (
    <section
      className="nx-ui-preview nx-ui-preview--editor"
      aria-label="Roblox UI preview workspace"
    >
      <header className="nx-ui-preview__toolbar nx-ui-preview__toolbar--editor">
        <div className="nx-ui-preview__status" role="status" aria-live="polite">
          {run && !failed ? (
            <Shimmer as="span">{status}</Shimmer>
          ) : (
            status
          )}
        </div>

        <div
          className="nx-ui-preview__viewport-buttons"
          role="group"
          aria-label="Preview viewport"
        >
          {visibleViewports.length ? (
            visibleViewports.map((viewport) => (
              <button
                key={viewport.id}
                type="button"
                className={
                  viewportId === viewport.id
                    ? "is-active"
                    : undefined
                }
                aria-pressed={viewportId === viewport.id}
                disabled={!currentCapture}
                onClick={() => changeViewport(viewport.id)}
                title={viewport.label}
              >
                <ViewportIcon viewport={viewport} />
                <span>{viewport.label}</span>
              </button>
            ))
          ) : (
            <button
              type="button"
              className="is-active"
              disabled
            >
              <Monitor size={15} />
              <span>Desktop</span>
            </button>
          )}
        </div>

        <div
          className="nx-ui-preview__zoom"
          aria-label="Preview zoom"
        >
          <button
            type="button"
            onClick={() => {
              setFit(true);
              setZoom(1);
            }}
            className={fit ? "is-active" : undefined}
            title="Fit preview"
          >
            <Maximize2 size={14} />
            Fit
          </button>

          <button
            type="button"
            onClick={zoomOut}
            disabled={!data.imageUrl}
            aria-label="Zoom out"
          >
            <Minus size={14} />
          </button>

          <span>{fit ? "Fit" : `${Math.round(zoom * 100)}%`}</span>

          <button
            type="button"
            onClick={zoomIn}
            disabled={!data.imageUrl}
            aria-label="Zoom in"
          >
            <Plus size={14} />
          </button>
        </div>

        <label className="nx-ui-preview__state-control">
          <span className="nx-ui-preview__sr">Preview state</span>

          <NexusSelect
            aria-label="Preview state"
            value={stateId}
            disabled={!currentCapture}
            onChange={(event) => changeState(event.target.value)}
          >
            <option value="default">Default state</option>

            {selectableStates
              .filter((state) => state.id !== "default")
              .map((state) => (
                <option key={state.id} value={state.id}>
                  {state.label}
                </option>
              ))}
          </NexusSelect>
        </label>

        <WorkspaceHelp>
          {sourceOwned
            ? "Nexus owns these generated source files. Studio edits are checked and preserved on conflict; recapture does not rewrite the saved source. Previews verify appearance only, and runtime behavior must be tested in Roblox."
            : "Pinevex renders your built Roblox UI. Studio is optional. Previews verify appearance only, and runtime behavior must be tested in Roblox."}
        </WorkspaceHelp>

        {hasNodes && studioConnected && onRefreshCapture ? (
          <button
            type="button"
            disabled={captureBusy || Boolean(run)}
            onClick={onRefreshCapture}
          >
            {captureBusy ? "Capturing…" : "Recapture Studio"}
          </button>
        ) : null}
      </header>

      {failed ? (
        <div className="nx-ui-preview__error" role="status">
          <strong>{buildFailure ? "Build failed" : "Preview unavailable"}</strong>
          <span>{buildFailure || "Your saved work is retained."}</span>
          {currentCapture || !buildFailure ? (
            <button type="button" onClick={retry}>
              Retry Preview
            </button>
          ) : (
            <span>Saved files are available in Inspect. Send a follow-up to retry the build.</span>
          )}
        </div>
      ) : null}

      <div
        className={`nx-ui-preview__body nx-ui-preview__body--canvas ${
          fit ? "is-fit" : "is-zoomed"
        }`}
      >
        {data.imageUrl ? (
          <figure
            className="nx-ui-preview__frame nx-ui-preview__frame--editor"
            data-running={run ? "true" : "false"}
          >
            {loading ? (
              <span
                className="nx-preview-updating"
                aria-label="Updating preview"
              >
                <WorkingDots />
              </span>
            ) : null}

            {data.earlier || updatingRevision ? (
              <span className="nx-ui-preview__earlier">
                Previous preview
              </span>
            ) : null}

            <div className="nx-ui-preview__device-surface">
              <img
                className="nx-ui-preview__image"
                src={data.imageUrl}
                draggable="false"
                alt={`${
                  data.preview?.stateLabel || "Default"
                } state of the generated Roblox UI`}
                width={data.preview?.viewport?.width}
                height={data.preview?.viewport?.height}
                style={
                  fit
                    ? undefined
                    : {
                        transform: `scale(${zoom})`,
                        transformOrigin: "center center",
                      }
                }
              />
            </div>

            <figcaption>
              {originalViewport?.label ||
                data.preview?.viewportId ||
                "Preview"}
              {" · "}
              {data.preview?.stateLabel || "Default"}
              {" · Pinevex"}
              {data.preview?.simulated ? " · Simulated state" : ""}
            </figcaption>
          </figure>
        ) : (
          <div
            className={`nx-ui-preview__empty nx-ui-preview__empty--editor ${
              run || (currentCapture && !failed)
                ? "nx-ui-preview__empty--working"
                : ""
            }`}
          >
            {loading ? <WorkingDots /> : <LayersPlaceholder />}

            <strong>
              {buildFailure
                ? "Build failed"
                : failed
                  ? "Preview unavailable"
                  : run
                    ? run.stage
                    : !hasNodes
                      ? "Describe the interface you want to build"
                      : "Preparing preview"}
            </strong>

            {!hasNodes ? (
              <p>
                Use the chat to describe a shop, inventory, settings panel,
                HUD, quest menu, or any other Roblox interface.
              </p>
            ) : null}
          </div>
        )}
      </div>

      {data.preview?.warnings?.length ? (
        <details className="nx-ui-preview__warnings">
          <summary>
            {data.preview.warnings.length} preview limitations
          </summary>

          <ul>
            {data.preview.warnings.map((warning, index) => (
              <li key={index}>{warning.message}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}

function LayersPlaceholder() {
  return (
    <div className="nx-ui-preview__placeholder-art" aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
  );
}
