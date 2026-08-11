import React, { useState } from "react";
import { ShieldAlert } from "lib/icons";
import { robloxAuthorizationBody, robloxAuthorizationHeadline } from "../../lib/robloxAuthorizationMessages";

export default function RobloxAuthorizationRequired({
  connected = false,
  upgradeRequired = false,
  capabilityIds = [],
  onAuthorize,
  actionLabel = "Continue with Roblox",
  className = "",
  details = null,
}) {
  const [busy, setBusy] = useState(false);

  const handleAuthorize = async () => {
    if (!onAuthorize || busy) return;
    setBusy(true);
    try {
      await onAuthorize();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`rounded-md border border-[var(--ds-warning-border)] bg-[var(--ds-warning-soft)] px-3 py-2 text-[12px] text-[var(--ds-warning)] ${className}`.trim()}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <div className="font-semibold text-[var(--ds-warning)]">
              {robloxAuthorizationHeadline({ connected, upgradeRequired, capabilityIds })}
            </div>
            <p className="mt-1 text-[var(--ds-text-secondary)]">
              {robloxAuthorizationBody({ connected, upgradeRequired, capabilityIds })}
            </p>
            {details ? (
              <details className="mt-2 text-[11px] text-[var(--ds-text-muted)]">
                <summary className="cursor-pointer">Advanced details</summary>
                <pre className="mt-1 whitespace-pre-wrap break-words">{details}</pre>
              </details>
            ) : null}
          </div>
        </div>
        {onAuthorize ? (
          <button
            type="button"
            onClick={handleAuthorize}
            disabled={busy}
            className="inline-flex items-center justify-center rounded-md border border-[var(--ds-warning-border)] bg-[var(--ds-warning-soft)] px-3 py-1.5 text-[11px] font-black text-[var(--ds-warning)] transition-colors hover:bg-[var(--ds-fill-hover)] disabled:opacity-50"
          >
            {busy ? "Opening Roblox..." : actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
