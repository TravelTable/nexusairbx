"use client";

import { useEffect, useMemo, useState } from "react";
import { SUBSCRIPTION_PLANS, formatMoney } from "../../lib/planCatalog";
import { trackProductEvent } from "../../lib/productAnalytics";
import CreditExplainer from "./CreditExplainer";
import styles from "./FinancialPlans.module.css";

const BUILD_PROFILES = [
  {
    id: "occasional",
    label: "Occasionally",
    recommendedPlan: "STARTER",
    description: "Starter is the low-cost way to keep a few active projects moving.",
  },
  {
    id: "weekly",
    label: "Every week",
    recommendedPlan: "PRO",
    description: "Pro gives regular builders a much larger monthly credit allowance and longer history.",
  },
  {
    id: "most_days",
    label: "Most days",
    recommendedPlan: "PRO",
    description: "Pro is the better fit when Nexus is part of your normal build loop.",
  },
];

function CreditCapacity({ plan, maxCredits }) {
  const percentage = Math.max(0, Math.min(100, (Number(plan.credits || 0) / maxCredits) * 100));

  return (
    <div className={styles.capacity}>
      <div className={styles.capacityHeading}>
        <span>Monthly Nexus Credits</span>
        <strong>{plan.credits}</strong>
      </div>
      <div
        className={styles.capacityTrack}
        role="progressbar"
        aria-label={`${plan.name} monthly credit allowance`}
        aria-valuemin={0}
        aria-valuemax={maxCredits}
        aria-valuenow={plan.credits}
      >
        <span className={styles.capacityFill} style={{ "--capacity": `${percentage}%` }} />
      </div>
    </div>
  );
}

function PlanCard({ plan, interval, recommended, maxCredits, starterCredits }) {
  const annual = interval === "year" && Number.isFinite(plan.yearly);
  const checkoutInterval = annual ? "year" : "month";
  const amount = annual ? plan.yearly / 12 : plan.monthly;
  const creditMultiple =
    plan.id === "PRO" && starterCredits
      ? `${Math.round((plan.credits / starterCredits) * 10) / 10}× Starter credits`
      : "Low-cost entry point";

  return (
    <article
      className={styles.planCard}
      data-featured={plan.featured ? "true" : undefined}
      data-recommended={recommended ? "true" : undefined}
    >
      <div className={styles.cardHeading}>
        <div>
          <p className={styles.planKicker}>{plan.id === "STARTER" ? "START BUILDING" : "BUILD SERIOUSLY"}</p>
          <h2>{plan.name}</h2>
        </div>
        <div className={styles.badges}>
          {plan.featured ? <span className={styles.featuredBadge}>Most popular</span> : null}
          {recommended ? <span className={styles.fitBadge}>Best fit</span> : null}
        </div>
      </div>

      <p className={styles.audience}>{plan.audience}</p>

      <div className={styles.priceBlock}>
        <p className={styles.price}>
          {formatMoney(Math.round(amount * 100) / 100)}
          <small>{plan.perSeat ? "/seat/month" : "/month"}</small>
        </p>
        <p className={styles.schedule}>
          {annual
            ? `${formatMoney(plan.yearly)}${plan.perSeat ? " per seat" : ""} billed annually`
            : interval === "year" && plan.yearly == null
              ? `${plan.name} stays monthly`
              : "Billed monthly"}
        </p>
      </div>

      <CreditCapacity plan={plan} maxCredits={maxCredits} />
      <p className={styles.capacityNote}>{creditMultiple}</p>

      <ul className={styles.featureList}>
        {plan.features.slice(1).map((feature) => (
          <li key={feature}>
            <span aria-hidden="true">✓</span>
            {feature}
          </li>
        ))}
      </ul>

      <a
        className={styles.action}
        href={`/subscribe?plan=${plan.id}&interval=${checkoutInterval}`}
        onClick={() =>
          void trackProductEvent("pricing_plan_selected", {
            subscription_plan: plan.id,
            billing_interval: checkoutInterval,
          })
        }
      >
        {plan.cta}
        <span aria-hidden="true">→</span>
      </a>
    </article>
  );
}

function TeamPreview({ plan }) {
  if (!plan) return null;

  return (
    <aside className={styles.teamPreview} aria-labelledby="team-preview-title">
      <div>
        <p className={styles.planKicker}>STUDIO WORKSPACE</p>
        <div className={styles.teamTitleRow}>
          <h2 id="team-preview-title">Team</h2>
          <span>Coming soon</span>
        </div>
        <p>
          Shared roles, pooled credits and one subscription for a Roblox studio. Team checkout stays closed until the
          workspace and pooled billing flow are ready.
        </p>
      </div>

      <div className={styles.teamNumbers}>
        <strong>{formatMoney(plan.monthly)}</strong>
        <span>/ seat / month planned</span>
        <small>{plan.credits} credits per seat, pooled monthly</small>
      </div>

      <a
        className={styles.teamAction}
        href="/contact?topic=team"
        onClick={() =>
          void trackProductEvent("team_interest_clicked", {
            subscription_plan: "TEAM",
          })
        }
      >
        Join the Team waitlist
        <span aria-hidden="true">→</span>
      </a>
    </aside>
  );
}

export default function FinancialPlans({ compact = false }) {
  const [interval, setInterval] = useState("month");
  const [buildProfile, setBuildProfile] = useState(null);

  const availablePlans = useMemo(
    () => SUBSCRIPTION_PLANS.filter((plan) => plan.id !== "TEAM"),
    []
  );
  const teamPlan = useMemo(
    () => SUBSCRIPTION_PLANS.find((plan) => plan.id === "TEAM") || null,
    []
  );
  const starter = availablePlans.find((plan) => plan.id === "STARTER");
  const maxCredits = Math.max(1, ...availablePlans.map((plan) => Number(plan.credits || 0)));
  const selectedProfile = BUILD_PROFILES.find((profile) => profile.id === buildProfile) || null;

  useEffect(() => {
    if (!compact) {
      void trackProductEvent("pricing_viewed", { catalog_version: "v2" });
    }
  }, [compact]);

  function selectInterval(value) {
    setInterval(value);
    void trackProductEvent("billing_period_selected", {
      billing_interval: value,
    });
  }

  function selectBuildProfile(profile) {
    setBuildProfile(profile.id);
    void trackProductEvent("pricing_build_profile_selected", {
      build_profile: profile.id,
      recommended_plan: profile.recommendedPlan,
    });
  }

  return (
    <section className={styles.section} aria-label="NexusRBX plans">
      <header className={styles.heading}>
        <p className={styles.eyebrow}>NexusRBX plans</p>
        {compact ? <h2>Build with Nexus from $2/month.</h2> : <h1>Build with Nexus from $2/month.</h1>}
        <p>
          Start small with Starter. Move to Pro when Nexus becomes part of your regular build loop. One credit system,
          the same reviewed Studio workflow.
        </p>
      </header>

      {!compact ? (
        <div className={styles.advisor} aria-labelledby="build-profile-title">
          <div className={styles.advisorCopy}>
            <span className={styles.advisorLabel}>PLAN FINDER</span>
            <strong id="build-profile-title">How often do you build with AI?</strong>
          </div>
          <div className={styles.advisorOptions} role="group" aria-label="Build frequency">
            {BUILD_PROFILES.map((profile) => (
              <button
                type="button"
                key={profile.id}
                aria-pressed={buildProfile === profile.id}
                onClick={() => selectBuildProfile(profile)}
              >
                {profile.label}
              </button>
            ))}
          </div>
          <p className={styles.advisorResult} aria-live="polite">
            {selectedProfile
              ? `${selectedProfile.recommendedPlan === "PRO" ? "Pro" : "Starter"} recommended — ${selectedProfile.description}`
              : "Pick a build frequency and Nexus will highlight the simpler starting point."}
          </p>
        </div>
      ) : null}

      <div className={styles.cycleToggle} role="group" aria-label="Billing period">
        <button
          type="button"
          aria-pressed={interval === "month"}
          onClick={() => selectInterval("month")}
        >
          Monthly
        </button>
        <button
          type="button"
          aria-pressed={interval === "year"}
          onClick={() => selectInterval("year")}
        >
          Annually <span>save 15%</span>
        </button>
      </div>

      <div className={styles.cards}>
        {availablePlans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            interval={interval}
            recommended={selectedProfile?.recommendedPlan === plan.id}
            maxCredits={maxCredits}
            starterCredits={starter?.credits}
          />
        ))}
      </div>

      {!compact ? <TeamPreview plan={teamPlan} /> : null}

      <div className={styles.billingNotes}>
        <p>USD, plus applicable tax. There is no free AI trial; subscribe when you are ready to build.</p>
        <p>
          Annual plans charge upfront and refresh included credits monthly. Included credits do not roll over.
        </p>
      </div>

      {!compact ? <CreditExplainer /> : null}
    </section>
  );
}
