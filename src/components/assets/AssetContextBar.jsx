import React from "react";
import { CloudUpload, Coins, Globe, Link, ShieldCheck } from "../../lib/icons";
import { Toggle } from "../ui";

function projectId(project) {
  return String(project?.projectId || project?.id || "");
}

function universeId(universe) {
  return String(universe?.universeId || universe?.id || "");
}

export default function AssetContextBar({
  projects = [],
  universes = [],
  selectedProjectId,
  selectedUniverseId,
  onProjectChange,
  onUniverseChange,
  connection,
  credits,
  autoUpload,
  autoUploadBusy,
  onAutoUploadChange,
  costEstimate,
  controlsDisabled = false,
}) {
  const connected = Boolean(connection?.connected);
  const creator = connection?.connection?.selectedCreator || connection?.selectedCreator || connection?.creator;
  const creatorLabel = creator?.displayName || creator?.name || creator?.creatorName || "Roblox creator connected";
  const numericCredits = Number(credits);
  const creditLabel = credits === null || credits === undefined
    ? "Credits loading"
    : `${Number.isFinite(numericCredits) ? numericCredits.toLocaleString() : String(credits)} credits`;

  return (
    <section className="asset-context-bar" aria-label="Asset generation context">
      <div className="asset-context-bar__selectors">
        <label>
          <span>Project</span>
          <select className="nexus-input" value={selectedProjectId || ""} disabled={controlsDisabled} onChange={(event) => onProjectChange?.(event.target.value)}>
            {!projects.length ? <option value="">No project selected</option> : null}
            {projects.map((project) => <option key={projectId(project)} value={projectId(project)}>{project.name || project.title || projectId(project)}</option>)}
          </select>
        </label>
        <label>
          <span>Universe</span>
          <select className="nexus-input" value={selectedUniverseId || ""} disabled={controlsDisabled} onChange={(event) => onUniverseChange?.(event.target.value)}>
            <option value="">Project default</option>
            {universes.map((universe) => <option key={universeId(universe)} value={universeId(universe)}>{universe.name || universe.title || universeId(universe)}</option>)}
          </select>
        </label>
      </div>

      <div className={`asset-context-chip ${connected ? "asset-context-chip--ready" : "asset-context-chip--warning"}`}>
        {connected ? <ShieldCheck aria-hidden="true" /> : <Link aria-hidden="true" />}
        <span><strong>{connected ? "Connected" : "Roblox not connected"}</strong>{connected ? creatorLabel : "Connect Roblox before automatic upload"}</span>
      </div>

      <div className="asset-context-chip">
        <Coins aria-hidden="true" />
        <span><strong>{creditLabel}</strong>{costEstimate || "Cost is confirmed before generation"}</span>
      </div>

      <div className="asset-context-toggle">
        <span className="asset-context-toggle__icon"><CloudUpload aria-hidden="true" /></span>
        <span><strong>Auto upload assets</strong><small>{autoUpload ? "Generated assets upload with your Roblox connection" : "No Roblox writes; Nexus assets are still saved"}</small></span>
        <Toggle checked={autoUpload} disabled={controlsDisabled || autoUploadBusy} onChange={onAutoUploadChange} aria-label="Automatically upload generated assets to Roblox" />
      </div>

      <div className="asset-context-chip asset-context-chip--scope">
        <Globe aria-hidden="true" />
        <span><strong>Server-owned workflow</strong>Project and creator access are verified by Nexus</span>
      </div>
    </section>
  );
}
