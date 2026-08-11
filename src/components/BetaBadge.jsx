import React from "react";

/**
 * Reusable Beta Badge component for site-wide transparency.
 */
const BetaBadge = ({ className = "" }) => {
  return (
    <span 
      className={`inline-flex select-none items-center rounded border border-[var(--ds-accent-border)] bg-[var(--ds-accent-soft)] px-1.5 py-0.5 text-[9px] font-black uppercase tracking-tighter text-[var(--ds-accent)] ${className}`}
      title="NexusRBX is currently in Beta. We are actively improving the platform!"
    >
      Beta
    </span>
  );
};

export default BetaBadge;
