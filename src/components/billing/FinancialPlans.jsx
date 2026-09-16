"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SUBSCRIPTION_PLANS, formatMoney } from "../../lib/planCatalog";
import { trackProductEvent } from "../../lib/productAnalytics";
import styles from "./FinancialPlans.module.css";

const CREDIT_TICKS = 12;

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function ledgerFeatures(plan) {
  return (plan.features || []).filter((item) => !/Nexus Credits/i.test(item));
}

function CreditCapacity({ plan, maxCredits }) {
  const percentage = Math.max(0, Math.min(100, (Number(plan.displayCredits || 0) / maxCredits) * 100));

  return (
    <div className={styles.capacity}>
      <div className={styles.capacityHeading}>
        <span>Monthly Nexus Credits</span>
        <strong>{plan.displayCreditsLabel}</strong>
      </div>
      <div
        className={styles.capacityTrack}
        role="progressbar"
        aria-label={`${plan.name} monthly credit allowance`}
        aria-valuemin={0}
        aria-valuemax={maxCredits}
        aria-valuenow={plan.displayCredits}
        aria-valuetext={`${plan.displayCreditsLabel} Nexus Credits per month`}
      >
        <span className={styles.capacityFill} style={{ "--capacity": `${percentage}%` }} />
      </div>
    </div>
  );
}

function CreditTicks({ plan, maxCredits }) {
  const filled = Math.max(
    1,
    Math.round((Number(plan.displayCredits || 0) / Math.max(1, maxCredits)) * CREDIT_TICKS)
  );

  return (
    <div className={styles.creditTicks} aria-hidden="true">
      {Array.from({ length: CREDIT_TICKS }, (_, index) => (
        <span key={index} data-on={index < filled ? "true" : undefined} />
      ))}
    </div>
  );
}

function CatalogPrice({ amount }) {
  const [shown, setShown] = useState(amount);
  const shownRef = useRef(amount);

  useEffect(() => {
    const from = shownRef.current;
    const to = amount;
    if (process.env.NODE_ENV === "test" || prefersReducedMotion() || from === to) {
      shownRef.current = to;
      setShown(to);
      return undefined;
    }

    const started = performance.now();
    const duration = 240;
    let frame = 0;

    const tick = (now) => {
      const t = Math.min(1, (now - started) / duration);
      const eased = 1 - (1 - t) ** 3;
      const next = from + (to - from) * eased;
      shownRef.current = next;
      setShown(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [amount]);

  return <span className={styles.priceFigure}>{formatMoney(Math.round(shown * 100) / 100)}</span>;
}

function CompactPlanCard({ plan, interval, maxCredits, starterCredits }) {
  const annual = interval === "year" && Number.isFinite(plan.yearly);
  const checkoutInterval = annual ? "year" : "month";
  const amount = annual ? plan.yearly / 12 : plan.monthly;
  const creditMultiple =
    plan.id === "PRO" && starterCredits
      ? `${Math.round((plan.displayCredits / starterCredits) * 10) / 10}× Starter credits`
      : "Low-cost entry point";

  return (
    <article
      className={styles.planCard}
      data-featured={plan.featured ? "true" : undefined}
      aria-label={plan.name}
    >
      <div className={styles.cardHeading}>
        <div>
          <h2>{plan.name}</h2>
          {plan.featured ? <p className={styles.recommended}>Recommended</p> : null}
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
      </a>
    </article>
  );
}

function CatalogPlanCard({ plan, interval, starterCredits, maxCredits, index }) {
  const annual = interval === "year" && Number.isFinite(plan.yearly);
  const checkoutInterval = annual ? "year" : "month";
  const amount = annual ? plan.yearly / 12 : plan.monthly;
  const annualSavings = annual ? Math.max(0, plan.monthly * 12 - plan.yearly) : 0;
  const monthlyOnly = interval === "year" && plan.yearly == null;
  const creditMultiple =
    plan.id === "PRO" && starterCredits
      ? `${Math.round((plan.displayCredits / starterCredits) * 10) / 10}× Starter credits`
      : null;
  const features = ledgerFeatures(plan);

  return (
    <article
      className={styles.planCard}
      data-featured={plan.featured ? "true" : undefined}
      aria-label={plan.name}
      style={{ "--enter-delay": `${80 + index * 70}ms` }}
    >
      <div className={styles.cardHeading}>
        <h2>{plan.name}</h2>
        {plan.featured ? <p className={styles.recommended}>Recommended</p> : null}
      </div>

      <p className={styles.audience}>
        <span>Best for</span>
        {plan.audience}
      </p>

      <div className={styles.priceBlock}>
        <p className={styles.price}>
          <CatalogPrice amount={amount} />
          <small>{plan.perSeat ? "/seat/month" : "/month"}</small>
          {annual ? <span className={styles.priceSave}>Save 15%</span> : null}
        </p>
        <p className={styles.schedule}>
          {annual
            ? `${formatMoney(plan.yearly)}${plan.perSeat ? " per seat" : ""} billed annually · save ${formatMoney(annualSavings)}`
            : monthlyOnly
              ? "Monthly only"
              : "Billed monthly"}
        </p>
      </div>

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

      <div className={styles.creditFigure}>
        <span className={styles.creditLabel}>Monthly Nexus Credits</span>
        <strong className={styles.creditValue}>{plan.displayCreditsLabel}</strong>
        <CreditTicks plan={plan} maxCredits={maxCredits} />
        {creditMultiple ? <p className={styles.creditMultiple}>{creditMultiple}</p> : null}
      </div>

      {features.length ? (
        <div className={styles.inclusions}>
          <p>Plan includes</p>
          <ul className={styles.featureList}>
            {features.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  );
}

function TeamPreview({ plan }) {
  if (!plan) return null;

  return (
    <aside className={styles.teamPreview} aria-labelledby="team-preview-title">
      <p>
        <strong id="team-preview-title">Team</strong>
        <span>Coming soon</span>
        {formatMoney(plan.monthly)} / seat / month planned
        {" · "}
        <small>{plan.displayCreditsLabel} credits per seat, pooled monthly</small>
      </p>
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
      </a>
    </aside>
  );
}

export default function FinancialPlans({ compact = false }) {
  const [interval, setInterval] = useState("month");

  const availablePlans = useMemo(
    () => SUBSCRIPTION_PLANS.filter((plan) => plan.id !== "TEAM"),
    []
  );
  const teamPlan = useMemo(
    () => SUBSCRIPTION_PLANS.find((plan) => plan.id === "TEAM") || null,
    []
  );
  const starter = availablePlans.find((plan) => plan.id === "STARTER");
  const maxCredits = Math.max(1, ...availablePlans.map((plan) => Number(plan.displayCredits || 0)));

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

  return (
    <section
      className={`${styles.section} ${compact ? "" : styles.catalog}`.trim()}
      data-pricing-layout={compact ? "compact" : "catalog"}
      aria-label="NexusRBX plans"
    >
      <header className={styles.heading}>
        {compact ? <p className={styles.eyebrow}>Plans</p> : null}
        {compact ? <h2>Build with Nexus from $2/month.</h2> : <h1>Build with Nexus from $2/month.</h1>}
        <p>
          {compact
            ? "Starter for trying the loop. Pro when Nexus is in the weekly build."
            : "Pick a plan. Credits refresh every month."}
        </p>
      </header>

      <div
        className={styles.cycleToggle}
        role="group"
        aria-label="Billing period"
        data-interval={interval}
      >
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
        {availablePlans.map((plan, index) =>
          compact ? (
            <CompactPlanCard
              key={plan.id}
              plan={plan}
              interval={interval}
              maxCredits={maxCredits}
              starterCredits={starter?.displayCredits}
            />
          ) : (
            <CatalogPlanCard
              key={plan.id}
              plan={plan}
              interval={interval}
              starterCredits={starter?.displayCredits}
              maxCredits={maxCredits}
              index={index}
            />
          )
        )}
      </div>

      {!compact ? (
        <div className={styles.dock}>
          <TeamPreview plan={teamPlan} />
          <div className={styles.billingNotes}>
            <p>
              USD, plus applicable tax. There is no free AI trial; subscribe when you are ready to build. Annual plans
              charge upfront and refresh included credits monthly. Included credits do not roll over.
            </p>
          </div>
        </div>
      ) : (
        <div className={styles.billingNotes}>
          <p>USD, plus applicable tax. There is no free AI trial; subscribe when you are ready to build.</p>
          <p>
            Annual plans charge upfront and refresh included credits monthly. Included credits do not roll over.
          </p>
        </div>
      )}
    </section>
  );
}
