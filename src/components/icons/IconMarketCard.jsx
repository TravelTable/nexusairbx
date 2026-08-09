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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: animationDelay }}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-4 transition-all hover:border-[#9b5de5]/50 hover:bg-white/[0.05]"
    >
      <Link
        to={getAuthenticatedIconDetailPath(icon.id)}
        aria-label={`View ${icon.name} details`}
        className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00f5d4] focus-visible:ring-offset-4 focus-visible:ring-offset-[#0D0D0D]"
      >
        {icon.isPro && !isPremium ? (
          <span className="absolute right-2 top-2 z-20 rounded bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] px-2 py-0.5 text-[10px] font-black uppercase text-white shadow-lg">
            Pro
          </span>
        ) : null}

        <div className="relative mb-4 flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-white/5 bg-black/40">
          <img
            src={icon.imageUrl}
            alt={icon.name}
            className="h-full w-full object-contain transition-opacity duration-200 group-hover:opacity-95"
            loading="lazy"
          />
          <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/60 to-transparent p-4 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100" aria-hidden="true">
            <span className="flex items-center gap-1 text-xs font-bold text-white">
              View details <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        </div>

        {headingLevel === 3 ? (
          <h3 className="truncate text-xs font-bold text-gray-300">{icon.name}</h3>
        ) : (
          <h2 className="truncate text-xs font-bold text-gray-300">{icon.name}</h2>
        )}
        <p className="text-[10px] font-medium text-gray-500">{icon.style}</p>
      </Link>
    </motion.article>
  );
}
