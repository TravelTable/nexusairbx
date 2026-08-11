import React from "react";
import { Users, X, ChevronRight } from "lib/icons";

export default function TeamShareModal({
  sharingId,
  onClose,
  messages,
  teams,
  onShareWithTeam,
  onGoToSettings,
}) {
  if (!sharingId) return null;
  const m = messages.find((msg) => msg.id === sharingId);
  const artifactId = m?.artifactId || m?.projectId;
  const type = m?.projectId ? "ui" : "script";

  return (
    <div
      className="nexus-modal-overlay fixed inset-0 z-[100] flex items-center justify-center bg-[var(--ds-surface-overlay)] p-4"
      data-state="open"
      role="presentation"
    >
      <div
        className="nexus-modal-panel flex w-full max-w-md flex-col overflow-hidden rounded-xl border border-[var(--ds-border-strong)] bg-[var(--ds-surface-1)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="team-share-title"
      >
        <div className="flex items-center justify-between border-b border-[var(--ds-border-subtle)] p-6">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-[var(--ds-accent)]" />
            <h3 id="team-share-title" className="text-lg font-semibold text-[var(--ds-text)]">
              Share with Team
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--ds-text-muted)] hover:text-[var(--ds-text)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-3">
          {teams.map((team) => (
            <button
              key={team.id}
              onClick={() => {
                onShareWithTeam(artifactId, type, team.id);
                onClose();
              }}
              className="group flex w-full items-center justify-between border-t border-[var(--ds-border-subtle)] bg-transparent p-4 text-left transition-[background-color,color] duration-150 first:border-t-0 hover:bg-[var(--ds-fill-hover)]"
            >
              <span className="font-bold text-[var(--ds-text)] group-hover:text-[var(--ds-accent)] transition-colors">
                {team.name}
              </span>
              <ChevronRight className="w-4 h-4 text-[var(--ds-text-muted)] group-hover:text-[var(--ds-accent)]" />
            </button>
          ))}
          {teams.length === 0 && (
            <div className="py-8 text-center">
              <p className="text-sm text-[var(--ds-text-muted)] mb-4">You need to create a team first.</p>
              <button
                onClick={() => {
                  onClose();
                  onGoToSettings?.();
                }}
                className="text-xs font-semibold text-[var(--ds-accent)] underline"
              >
                Go to Settings
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
