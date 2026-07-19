import React from "react";
import { Palette, ShieldCheck } from "../../lib/icons";

function renderList(value) {
  if (!Array.isArray(value) || !value.length) return "Not specified";
  return value.join(", ");
}

export default function AssetStyleSummary({ profile, compact = false }) {
  if (!profile) {
    return (
      <div className="asset-style-summary asset-style-summary--empty">
        <Palette aria-hidden="true" />
        <span>No style profile is attached. The generation brief remains the source of truth.</span>
      </div>
    );
  }

  return (
    <section className={`asset-style-summary ${compact ? "asset-style-summary--compact" : ""}`} aria-label="Style profile summary">
      <div className="asset-style-summary__header">
        <span><Palette aria-hidden="true" /> Style profile</span>
        <strong>{profile.name || "Project style"}</strong>
      </div>
      <dl>
        <div>
          <dt>Palette</dt>
          <dd className="asset-palette">
            {Array.isArray(profile.palette) && profile.palette.length ? profile.palette.map((color) => (
              <span key={color} className="asset-palette__swatch" title={color} style={{ backgroundColor: color }} />
            )) : "Not specified"}
          </dd>
        </div>
        {!compact ? (
          <>
            <div><dt>Direction</dt><dd>{renderList(profile.promptDirectives)}</dd></div>
            <div><dt>Avoid</dt><dd>{renderList(profile.negativeDirectives)}</dd></div>
          </>
        ) : null}
        <div>
          <dt>Transparency</dt>
          <dd><ShieldCheck aria-hidden="true" /> {profile.transparencyRequired ? "Required" : "Optional"}</dd>
        </div>
      </dl>
    </section>
  );
}
