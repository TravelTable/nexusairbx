/**
 * Legacy animated action icon exports.
 * Backed by NexusAnimatedIcon (Heroicons Animated + state morphs).
 * Keep these names so existing call sites continue to work while migrating.
 */
import React from "react";
import { NexusAnimatedIcon } from "./NexusAnimatedIcon";

function bridge(name, { mapActiveToLoading = false } = {}) {
  return function BridgedIcon({ className = "", active = false, success = false, playing = false, ...rest }) {
    return (
      <NexusAnimatedIcon
        name={name}
        className={className}
        loading={mapActiveToLoading ? active : false}
        active={!mapActiveToLoading ? active : false}
        success={success}
        playing={playing}
        size="control"
        {...rest}
      />
    );
  };
}

export const AnimatedUploadIcon = bridge("upload");
export const AnimatedGenerateIcon = function AnimatedGenerateIcon({ className = "", active = false, success = false }) {
  // Generate uses tooling (command-line), never sparkles. On submit use send morph.
  if (success || active) {
    return <NexusAnimatedIcon name="send" className={className} sent={active && !success} success={success} size="control" />;
  }
  return <NexusAnimatedIcon name="generate" className={className} size="control" />;
};
export const AnimatedSettingsIcon = bridge("settings");
export const AnimatedRefreshIcon = bridge("refresh", { mapActiveToLoading: true });
export const AnimatedCopyIcon = bridge("copy");
export const AnimatedDownloadIcon = bridge("download");
export const AnimatedHistoryIcon = bridge("history");
export const AnimatedUiIcon = bridge("ui");
export const AnimatedImageIcon = bridge("images");
export const AnimatedAssetIcon = bridge("assets");
export const AnimatedMotionIcon = function AnimatedMotionIcon({ className = "", active = false, playing = false }) {
  return <NexusAnimatedIcon name="play" className={className} playing={playing || active} size="control" />;
};
export const AnimatedExpandIcon = bridge("expand");
