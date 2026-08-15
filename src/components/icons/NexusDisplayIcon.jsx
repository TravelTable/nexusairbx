import React from "react";

export const NEXUS_DISPLAY_ICON_NAMES = Object.freeze([
  "ask",
  "build",
  "edit",
  "debug",
  "plan",
  "studio-connect",
  "assets",
  "snapshot",
  "publish",
  "complete",
]);

const DISPLAY_ICON_NAMES = new Set(NEXUS_DISPLAY_ICON_NAMES);

export function getNexusDisplayIconPath(name) {
  if (!DISPLAY_ICON_NAMES.has(name)) {
    throw new Error(`Unknown Nexus display icon: ${name}`);
  }
  return `/assets/nexus-display-icons/${name}.svg`;
}

export default function NexusDisplayIcon({
  name,
  alt = "",
  className,
  size = 96,
  loading = "lazy",
}) {
  return (
    <img
      src={getNexusDisplayIconPath(name)}
      alt={alt}
      aria-hidden={alt ? undefined : "true"}
      className={className}
      width={size}
      height={size}
      loading={loading}
      decoding="async"
      draggable="false"
      data-nexus-display-icon={name}
    />
  );
}
