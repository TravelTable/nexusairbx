import React from "react";
import { useNavigate } from "react-router-dom";
import { Store, ArrowRight } from "lib/icons";
import {
  editorialDisplayClass,
  editorialPrimaryButtonClass,
  editorialSecondaryButtonClass,
} from "../components/site/editorialUi";

/**
 * Replaces the retired Icon Generator embed in the AI workspace asset mode.
 * Icons are picked from the public Creator Store / Icons market.
 */
export default function IconsMarketWorkspacePanel({ embedded = true }) {
  const navigate = useNavigate();
  const Tag = embedded ? "section" : "main";

  return (
    <Tag
      className="flex h-full min-h-[28rem] flex-col items-center justify-center gap-6 px-6 py-16 text-center"
      aria-label="Icons market workspace"
    >
      <Store className="h-12 w-12 text-[var(--ds-text-muted)]" aria-hidden="true" />
      <div className="max-w-xl space-y-3">
        <h1 className={`${editorialDisplayClass} text-4xl`}>Pick icons from the catalog</h1>
        <p className="text-[var(--ds-text-muted)] leading-relaxed">
          AI image generation for icons is retired. Browse the Icons market, let the agent pick a match,
          then upload to Roblox and apply it in Studio UI when consent is enabled.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          className={`${editorialPrimaryButtonClass} gap-2`}
          onClick={() => navigate("/icons-market")}
        >
          Open Icons market <ArrowRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={`${editorialSecondaryButtonClass} gap-2`}
          onClick={() => navigate("/ai?mode=agent")}
        >
          Back to build chat
        </button>
      </div>
    </Tag>
  );
}
