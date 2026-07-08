import React from "react";
import { isNexusAgentModel, NEXUS_AGENT_LOGO, resolveLobeProviderKey } from "../../lib/modelProviders";

const LOBE_STATIC_BASE = "https://unpkg.com/@lobehub/icons-static-svg@1.91.0/icons";

/** Mono + optional color slug per catalog provider key. */
const PROVIDER_ICON_SLUGS = Object.freeze({
  openai: { mono: "openai", color: "openai" },
  anthropic: { mono: "anthropic", color: "anthropic" },
  google: { mono: "google", color: "google-color" },
  deepseek: { mono: "deepseek", color: "deepseek-color" },
  xai: { mono: "xai", color: "xai" },
  meta: { mono: "meta", color: "meta-color" },
  mistral: { mono: "mistral", color: "mistral-color" },
  alibaba: { mono: "alibaba", color: "alibaba-color" },
});

function iconUrl(providerKey, type) {
  const slugs = PROVIDER_ICON_SLUGS[providerKey] || PROVIDER_ICON_SLUGS.openai;
  const slug = type === "color" ? slugs.color : slugs.mono;
  return `${LOBE_STATIC_BASE}/${slug}.svg`;
}

/**
 * Provider brand glyph via LobeHub Icons static SVG CDN
 * (same asset set as @lobehub/icons — CRA/React 18 can't load that package's ESM React barrel).
 * Nexus agent models use the site logo instead of a third-party LLM mark.
 * @see https://lobehub.com/icons
 */
export default function ModelProviderGlyph({
  provider,
  modelId,
  size = 16,
  type = "color",
  className = "",
}) {
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
  const label = String(provider || key || "AI");

  return (
    <img
      src={src}
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

export { iconUrl, LOBE_STATIC_BASE, NEXUS_AGENT_LOGO };
