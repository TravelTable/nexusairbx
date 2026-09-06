import React, { useState } from "react";
import { Cpu } from "../../lib/icons";

import {
  isNexusAgentModel,
  NEXUS_AGENT_LOGO,
  providerLabel,
  resolveLobeProviderKey,
} from "../../lib/modelProviders";

const LOBE_STATIC_BASE = "/assets/providers";

const PROVIDER_ICON_SLUGS = Object.freeze({
  openai: { mono: "openai", color: "openai" },
  anthropic: { mono: "anthropic", color: "anthropic" },
  google: { mono: "google", color: "google-color" },
  deepseek: { mono: "deepseek", color: "deepseek-color" },
  xai: { mono: "xai", color: "xai" },
  meta: { mono: "meta", color: "meta-color" },
  mistral: { mono: "mistral", color: "mistral-color" },
  alibaba: { mono: "alibaba", color: "alibaba-color" },
  cohere: {}, moonshotai: {}, zai: {},
});

// These brand assets are intrinsically near-black SVGs. External SVG images
// cannot inherit the app's current text color, so give them a stable light
// chip instead of letting them disappear into dark surfaces.
const DARK_PROVIDER_ICONS = new Set(["openai", "anthropic", "xai"]);

function iconUrl(providerKey, type) {
  const slugs = PROVIDER_ICON_SLUGS[providerKey];
  if (!slugs) return null;
  const slug = `${providerKey}-${type === "color" ? "color" : "mono"}`;
  return `${LOBE_STATIC_BASE}/${slug}.svg`;
}

export default function ModelProviderGlyph({
  provider,
  modelId,
  size = 16,
  type = "color",
  className = "",
}) {
  const [failedSrc, setFailedSrc] = useState(null);
  if (isNexusAgentModel({ provider, modelId })) {
    return (
      <img
        src={NEXUS_AGENT_LOGO}
        alt=""
        aria-hidden="true"
        title="Nexus"
        width={size}
        height={size}
        className={`shrink-0 rounded-md object-contain ${className}`.trim()}
        draggable={false}
      />
    );
  }

  const key = resolveLobeProviderKey(provider);
  const src = iconUrl(key, type);
  const label = providerLabel(provider);

  if (!src || failedSrc === src) {
    return (
      <span
        aria-hidden="true"
        title={label}
        className={`inline-flex shrink-0 items-center justify-center rounded-full border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] font-semibold text-[var(--ds-text-secondary)] ${className}`.trim()}
        style={{
          width: size,
          height: size,
          fontSize: Math.max(8, Math.round(size * 0.55)),
        }}
      >
        <Cpu size={size} />
      </span>
    );
  }

  return (
    <img
      src={src}
      onError={() => setFailedSrc(src)}
      alt=""
      aria-hidden="true"
      title={label}
      width={size}
      height={size}
      className={`shrink-0 object-contain ${className}`.trim()}
      draggable={false}
    />
  );
}

export { DARK_PROVIDER_ICONS, iconUrl, LOBE_STATIC_BASE, NEXUS_AGENT_LOGO };
