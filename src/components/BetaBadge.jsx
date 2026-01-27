import React from "react";

/**
 * Reusable Beta Badge component for site-wide transparency.
 */
const BetaBadge = ({ className = "" }) => {
  return (
    <span 
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter bg-[#9b5de5]/10 text-[#9b5de5] border border-[#9b5de5]/20 select-none ${className}`}
      title="NexusRBX is currently in Beta. We are actively improving the platform!"
    >
      Beta
    </span>
  );
};

export default BetaBadge;
