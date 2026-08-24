import React from "react";
import { Link } from "react-router-dom";

import { ArrowRight } from "lib/icons";
import { getAuthenticatedIconDetailPath } from "../../lib/iconMarket";

export default function IconMarketCard({
  icon,
  isPremium = false,
  observeRef,
  headingLevel = 2,
}) {
  return (
    <article
      ref={observeRef}
      className="creator-store-record"
      data-contact-sheet-record
    >
      <Link
        to={getAuthenticatedIconDetailPath(icon.id)}
        aria-label={`View ${icon.name} details`}
        className="creator-store-record__link min-h-11"
      >
        <div className="creator-store-record__preview">
          <img
            src={icon.imageUrl}
            alt={icon.name}
            loading="lazy"
            decoding="async"
          />
          {icon.isPro && !isPremium ? (
            <span className="creator-store-record__access">Pro</span>
          ) : null}
        </div>

        <div className="creator-store-record__body">
          {headingLevel === 3 ? (
            <h3 className="creator-store-record__title">{icon.name}</h3>
          ) : (
            <h2 className="creator-store-record__title">{icon.name}</h2>
          )}
          <p className="creator-store-record__style">
            {[icon.style, icon.category].filter(Boolean).join(" · ") || "Icon asset"}
          </p>
          <p className="creator-store-record__meta">
            <span>{icon.isPro ? "Pro access" : "Included access"}</span>
            <span aria-hidden="true">/</span>
            <span>Roblox use</span>
          </p>
          <span className="creator-store-record__licence" aria-hidden="true">
            View licence record <ArrowRight />
          </span>
        </div>
      </Link>
    </article>
  );
}
