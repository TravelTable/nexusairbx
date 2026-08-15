import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

import { ArrowRight } from "lib/icons";
import { getAuthenticatedIconDetailPath } from "../../lib/iconMarket";

export default function IconMarketCard({
  icon,
  isPremium = false,
  observeRef,
  animationDelay = 0,
  headingLevel = 2,
}) {
  return (
    <motion.article
      ref={observeRef}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: animationDelay }}
      className="group relative overflow-hidden rounded-[14px] bg-[var(--ds-surface-1)] p-4 transition-[background-color,transform] hover:-translate-y-0.5 hover:bg-[var(--ds-fill-hover)] motion-reduce:transform-none"
    >
      <Link
        to={getAuthenticatedIconDetailPath(icon.id)}
        aria-label={`View ${icon.name} details`}
        className="block min-h-11 rounded-[12px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-focus-ring)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--ds-bg-canvas)]"
      >
        {icon.isPro && !isPremium ? (
          <span className="absolute right-2 top-2 z-20 rounded-md border border-[var(--ds-border-strong)] bg-[var(--ds-surface-overlay)] px-2 py-0.5 text-xs font-semibold text-[var(--ds-text-secondary)]">
            Pro
          </span>
        ) : null}

        <div className="relative mb-4 flex aspect-square items-center justify-center overflow-hidden rounded-[12px] bg-[var(--ds-bg-workspace)]">
          <img
            src={icon.imageUrl}
            alt={icon.name}
            className="h-full w-full object-contain transition-opacity duration-200 group-hover:opacity-95"
            loading="lazy"
          />
          <div className="absolute inset-x-2 bottom-2 flex justify-center rounded-lg bg-[var(--ds-surface-overlay)] p-3 opacity-0 shadow-[var(--ds-shadow-overlay)] transition-opacity group-hover:opacity-100 group-focus-within:opacity-100" aria-hidden="true">
            <span className="flex items-center gap-1 text-sm font-semibold text-[var(--ds-text)]">
              View details <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        </div>

        {headingLevel === 3 ? (
          <h3 className="truncate text-sm font-semibold text-[var(--ds-text-secondary)]">{icon.name}</h3>
        ) : (
          <h2 className="truncate text-sm font-semibold text-[var(--ds-text-secondary)]">{icon.name}</h2>
        )}
        <p className="text-xs font-medium text-[var(--ds-text-muted)]">{icon.style}</p>
      </Link>
    </motion.article>
  );
}
