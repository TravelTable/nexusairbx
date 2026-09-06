import React from "react";
import { Link } from "react-router-dom";
import "./GameOverview.css";

const LABELS = {
  planned: "Planned", in_progress: "In progress", implemented: "Implemented",
  draft_ready: "Draft ready", verified: "Verified", needs_attention: "Needs attention",
};

export default function GameOverview({ overview, onRefine }) {
  if (!overview?.deliverables?.length || overview.requestedScope?.kind !== "complete_game") return null;
  const items = overview.deliverables;
  const verified = items.filter((item) => item.status === "verified").length;
  return (
    <details className="game-overview" open>
      <summary className="game-overview__summary">
        <span>Game overview</span>
        <span className="game-overview__count">{verified}/{items.length} verified</span>
      </summary>
      <p className="game-overview__intro">{overview.title}</p>
      <ul className="game-overview__items" aria-label="Game deliverables">
        {items.map((item) => (
          <li key={item.id} className="game-overview__item">
            <div className="game-overview__row">
              <span>{item.title}</span>
              <span className={`game-overview__status game-overview__status--${LABELS[item.status] ? item.status : "planned"}`}>
                {LABELS[item.status] || "Planned"}
              </span>
            </div>
            {item.issue && <p className="game-overview__issue">{item.issue}</p>}
            {item.outstandingAction && <p className="game-overview__note">{item.outstandingAction}</p>}
            {item.assetIds?.length > 0 && (
              <div className="game-overview__links">
                {item.assetIds.map((id, index) => <Link key={id} to={`/assets/${encodeURIComponent(id)}`}>View asset {index + 1}</Link>)}
              </div>
            )}
            {onRefine && <button type="button" className="game-overview__edit" onClick={() => onRefine(`Update ${item.title.toLowerCase()} for this game: `)}>Refine {item.title.toLowerCase()}</button>}
          </li>
        ))}
      </ul>
      {!overview.monetization?.requested && <p className="game-overview__note">Monetization is optional. Describe the paid benefits you want when you’re ready.</p>}
    </details>
  );
}
