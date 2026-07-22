import React from "react";
import { CheckCircle, Clock } from "../../lib/icons";
import { formatAssetStatus } from "./AssetLifecycleBadge";

const STAGES = [
  { key: "generate", label: "Generate", states: ["draft", "preparing", "generating", "generated", "generation_failed"] },
  { key: "review", label: "Review", states: ["validating", "validation_failed", "approved"] },
  { key: "publish", label: "Publish", states: ["ready_to_publish", "upload_pending", "publishing", "uploading", "submitted", "upload_failed"] },
  { key: "process", label: "Process", states: ["roblox_processing", "under_moderation", "moderation_pending", "rejected"] },
  { key: "ready", label: "Ready", states: ["ready", "available", "permission_required", "reconnection_required", "failed"] },
  { key: "implement", label: "Implement", states: ["implementing", "implemented", "studio_asset_implementation_failed"] },
  { key: "verify", label: "Verify", states: ["verifying", "verified", "studio_asset_verification_failed"] },
];

const ERROR_STATES = new Set([
  "generation_failed",
  "validation_failed",
  "upload_failed",
  "rejected",
  "failed",
  "studio_asset_implementation_failed",
  "studio_asset_verification_failed",
]);
const BLOCKED_STATES = new Set([
  "permission_required",
  "reconnection_required",
  "moderation_pending",
  "under_moderation",
]);

const TERMINAL_STATES = Object.freeze({
  archived: "Archived",
  replaced: "Replaced",
});

function stageIndex(status) {
  const normalized = String(status || "draft").toLowerCase();
  const index = STAGES.findIndex((stage) => stage.states.includes(normalized));
  return index < 0 ? 0 : index;
}

export default function AssetLifecycleTimeline({ status }) {
  const normalized = String(status || "draft").toLowerCase();
  const terminalLabel = TERMINAL_STATES[normalized];
  if (terminalLabel) {
    return (
      <ol className="asset-lifecycle-timeline" aria-label={`Asset lifecycle: ${formatAssetStatus(status)}`}>
        <li className="asset-lifecycle-timeline__stage is-active" aria-current="step">
          <Clock aria-hidden="true" />
          <span>{terminalLabel}</span>
        </li>
      </ol>
    );
  }
  const activeIndex = stageIndex(status);
  return (
    <ol className="asset-lifecycle-timeline" aria-label={`Asset lifecycle: ${formatAssetStatus(status)}`}>
      {STAGES.map((stage, index) => {
        const complete = index < activeIndex;
        const active = index === activeIndex;
        const error = active && ERROR_STATES.has(normalized);
        const blocked = active && BLOCKED_STATES.has(normalized);
        const Icon = complete ? CheckCircle : Clock;
        return (
          <li key={stage.key} className={`asset-lifecycle-timeline__stage ${complete ? "is-complete" : ""} ${active ? "is-active" : ""} ${error ? "is-error" : ""} ${blocked ? "is-blocked" : ""}`.trim()} aria-current={active ? "step" : undefined}>
            <Icon aria-hidden="true" />
            <span>{stage.label}</span>
            <span className="sr-only">{complete ? "Complete" : active ? `${formatAssetStatus(status)} — current step` : "Not started"}</span>
          </li>
        );
      })}
    </ol>
  );
}
