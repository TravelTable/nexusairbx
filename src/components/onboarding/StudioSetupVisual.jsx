import React, { useEffect, useMemo, useState } from "react";

const PUBLIC_STUDIO_ONBOARDING_PATH = "/onboarding/studio";
const FALLBACK_LABEL =
  "Screenshot unavailable — follow the written setup step.";

export const STUDIO_SETUP_VISUALS = Object.freeze([
  Object.freeze({
    id: "install-plugin",
    title: "Install plugin",
    filename: "install-plugin.webp",
    src: `${PUBLIC_STUDIO_ONBOARDING_PATH}/install-plugin.webp`,
    assetAvailable: false,
    alt: "Roblox Studio plugin management showing the NexusRBX Studio plugin installed and enabled.",
    instruction:
      "Install NexusRBX from the Creator Store, or use the generated NexusRBXStudioBridge.plugin.lua artifact for a local repository build.",
    width: 1600,
    height: 1000,
    aspectRatio: "8 / 5",
    crop: Object.freeze({ objectFit: "cover", objectPosition: "center 42%" }),
    fallbackLabel: FALLBACK_LABEL,
  }),
  Object.freeze({
    id: "open-plugin",
    title: "Open plugin",
    filename: "open-plugin.webp",
    src: `${PUBLIC_STUDIO_ONBOARDING_PATH}/open-plugin.webp`,
    assetAvailable: false,
    alt: "Roblox Studio with the Plugins tab selected and the NexusRBX plugin panel open beside the place.",
    instruction:
      "Open the intended experience in Roblox Studio, choose the Plugins tab, and open NexusRBX.",
    width: 1600,
    height: 1000,
    aspectRatio: "8 / 5",
    crop: Object.freeze({ objectFit: "cover", objectPosition: "center center" }),
    fallbackLabel: FALLBACK_LABEL,
  }),
  Object.freeze({
    id: "enter-pair-code",
    title: "Enter pair code",
    filename: "enter-pair-code.webp",
    src: `${PUBLIC_STUDIO_ONBOARDING_PATH}/enter-pair-code.webp`,
    assetAvailable: false,
    alt: "NexusRBX plugin panel in Roblox Studio with the one-time pairing code field ready for input.",
    instruction:
      "Generate a one-time code here, enter it in the NexusRBX plugin, and submit it before the timer expires.",
    width: 1600,
    height: 1000,
    aspectRatio: "8 / 5",
    crop: Object.freeze({ objectFit: "cover", objectPosition: "center 45%" }),
    fallbackLabel: FALLBACK_LABEL,
  }),
  Object.freeze({
    id: "allow-http",
    title: "Allow HTTP",
    filename: "allow-http.webp",
    src: `${PUBLIC_STUDIO_ONBOARDING_PATH}/allow-http.webp`,
    assetAvailable: false,
    alt: "Roblox Studio Game Settings Security panel with Allow HTTP Requests enabled for the open experience.",
    instruction:
      "If Studio asks, allow the NexusRBX host, then enable Game Settings → Security → Allow HTTP Requests for this experience.",
    width: 1600,
    height: 1000,
    aspectRatio: "8 / 5",
    crop: Object.freeze({ objectFit: "cover", objectPosition: "center 58%" }),
    fallbackLabel: FALLBACK_LABEL,
  }),
  Object.freeze({
    id: "connected-state",
    title: "Connected state",
    filename: "connected-state.webp",
    src: `${PUBLIC_STUDIO_ONBOARDING_PATH}/connected-state.webp`,
    assetAvailable: false,
    alt: "NexusRBX plugin panel in Roblox Studio showing its verified connected status and current place.",
    instruction:
      "Return to NexusRBX and confirm the live connection status names the Studio transport before starting place work.",
    width: 1600,
    height: 1000,
    aspectRatio: "8 / 5",
    crop: Object.freeze({ objectFit: "cover", objectPosition: "center center" }),
    fallbackLabel: FALLBACK_LABEL,
  }),
]);

const VISUALS_BY_ID = new Map(
  STUDIO_SETUP_VISUALS.map((visual) => [visual.id, visual]),
);

export function getStudioSetupVisual(visualId) {
  return VISUALS_BY_ID.get(visualId) || STUDIO_SETUP_VISUALS[0];
}

/**
 * A replaceable, non-live setup reference. Missing public assets fail to a
 * written label instead of presenting an invented or misleading screenshot.
 */
export default function StudioSetupVisual({ visualId }) {
  const visual = useMemo(() => getStudioSetupVisual(visualId), [visualId]);
  const [imageFailed, setImageFailed] = useState(!visual.assetAvailable);

  useEffect(() => {
    setImageFailed(!visual.assetAvailable);
  }, [visual.assetAvailable, visual.src]);

  return (
    <figure
      className="m-0"
      data-studio-setup-visual={visual.id}
      data-expected-filename={visual.filename}
    >
      <div
        className="aspect-[8/5] overflow-hidden border-y border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)]"
        data-aspect-ratio={visual.aspectRatio}
      >
        {imageFailed ? (
          <div
            className="flex h-full min-h-28 flex-col items-start justify-center gap-1 px-4 text-left"
            role="img"
            aria-label={`${visual.alt} ${visual.fallbackLabel}`}
          >
            <span className="text-xs font-bold text-[var(--ds-text-secondary)]">
              {visual.title}
            </span>
            <span className="text-[11px] leading-relaxed text-[var(--ds-text-muted)]">
              {visual.fallbackLabel}
            </span>
          </div>
        ) : (
          <img
            src={visual.src}
            alt={visual.alt}
            width={visual.width}
            height={visual.height}
            loading="lazy"
            decoding="async"
            onError={() => setImageFailed(true)}
            className="h-full w-full"
            style={visual.crop}
          />
        )}
      </div>
      <figcaption className="mt-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-[10px] leading-relaxed text-[var(--ds-text-muted)]">
        <span>{visual.title}</span>
        <span>Setup reference, not live Studio state</span>
      </figcaption>
    </figure>
  );
}
