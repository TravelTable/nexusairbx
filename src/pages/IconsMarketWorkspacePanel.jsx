import React from "react";
import { useNavigate } from "react-router-dom";
import { Store, ArrowRight } from "lib/icons";
import WorkspaceHelp from "../components/ai/chat/WorkspaceHelp";

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
      <Store className="h-8 w-8 text-[var(--ds-text-muted)]" aria-hidden="true" />
      <div className="max-w-xl space-y-3">
        <h1 className="flex items-center justify-center gap-2 text-2xl font-semibold tracking-tight">Find your next icon <WorkspaceHelp label="About icon assets">Browse the catalog or ask the agent to find a match. You can preview assets before connecting Studio.</WorkspaceHelp></h1>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--ds-accent-soft)] px-3 py-2 text-sm text-[var(--ds-text)] transition hover:bg-[var(--ds-fill-hover)] focus-visible:ring-2 focus-visible:ring-[var(--ds-accent-border)]"
          onClick={() => navigate("/icons-market")}
        >
          Open Icons market <ArrowRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-[var(--ds-text-muted)] transition hover:bg-[var(--ds-fill-hover)] focus-visible:ring-2 focus-visible:ring-[var(--ds-accent-border)]"
          onClick={() => navigate("/ai?mode=agent")}
        >
          Back to build chat
        </button>
      </div>
    </Tag>
  );
}
