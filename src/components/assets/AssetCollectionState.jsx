import React from "react";
import { AlertCircle, ImageIcon, RefreshCw } from "../../lib/icons";
import { Button } from "../ui";

export function AssetGridSkeleton({ count = 6, label = "Loading assets" }) {
  return (
    <div className="asset-grid" role="status" aria-label={label} aria-live="polite">
      {Array.from({ length: count }).map((_, index) => (
        <div className="asset-skeleton" key={index} aria-hidden="true">
          <div className="asset-skeleton__preview" />
          <div className="asset-skeleton__line asset-skeleton__line--wide" />
          <div className="asset-skeleton__line" />
        </div>
      ))}
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function AssetEmptyState({
  title = "No assets yet",
  description = "Generate an icon or pack and it will appear here with its complete Nexus and Roblox lifecycle.",
  action,
}) {
  return (
    <div className="asset-empty-state">
      <span className="asset-empty-state__icon" aria-hidden="true"><ImageIcon /></span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action || null}
    </div>
  );
}

export function AssetErrorState({ message, onRetry }) {
  return (
    <div className="asset-error-state" role="alert">
      <AlertCircle aria-hidden="true" />
      <div>
        <h3>Assets could not be loaded</h3>
        <p>{message || "Try again. Your existing assets are not affected."}</p>
      </div>
      {onRetry ? <Button variant="ghost" size="sm" icon={RefreshCw} onClick={onRetry}>Try again</Button> : null}
    </div>
  );
}
