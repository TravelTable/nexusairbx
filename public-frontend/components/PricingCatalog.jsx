"use client";

import { useEffect, useState } from "react";
import publicPlanCatalog from "../../src/data/publicPlanCatalog.json";
import styles from "./PricingLedger.module.css";

const comparisonFacts = {
  FREE: ["Nexus Auto", "1 task", "7-day chat history", "1 active project"],
  STARTER: ["Model choice", "2 tasks", "30-day chat history", "3 active projects"],
  PRO: ["Premium Direct options", "Higher Included Usage", "90-day usage history", "Icon Generator"],
  PRO_PLUS: ["Premium Direct options", "Higher usage than Pro", "90-day usage history", "Icon Generator"],
  TEAM: ["Premium Direct options", "Pooled usage per seat", "90-day usage history", "Icon Generator · 2–50 seats"],
};

function money(value) {
  return Number(value).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: Number(value) % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

function checkoutHref(plan, interval, seats) {
  if (plan.id === "FREE") return "/signup";
  const params = new URLSearchParams({ plan: plan.id, interval });
  if (plan.id === "TEAM") params.set("seats", String(seats));
  return `/subscribe?${params.toString()}`;
}

function priceRecord(plan, interval, seats = 1) {
  if (plan.id === "FREE") {
    return { amount: "$0", cadence: "forever", bill: "No billing details required" };
  }
  if (interval === "year" && plan.yearly != null) {
    return {
      amount: money((plan.yearly / 12) * (plan.perSeat ? seats : 1)),
      cadence: plan.perSeat ? `/ month for ${seats} seats` : "/ month",
      bill: plan.perSeat
        ? `${money(plan.yearly * seats)} billed yearly · ${money(plan.yearly)} per user`
        : `${money(plan.yearly)} billed yearly`,
    };
  }
  return {
    amount: money(plan.monthly * (plan.perSeat ? seats : 1)),
    cadence: plan.perSeat ? `/ month for ${seats} seats` : "/ month",
    bill: plan.perSeat ? `${money(plan.monthly)} per user, billed monthly` : "Billed monthly",
  };
}

function PlanAction({ plan, interval, seats, disabled, managePlan }) {
  const selectedInterval = plan.yearly == null ? "month" : interval;
  if (managePlan && plan.id !== "FREE") {
    return <a className={styles.action} href="/billing">Manage plan →</a>;
  }

  async function trackSelection() {
    try {
      const { PRODUCT_EVENTS, trackProductEvent } = await import("../../src/lib/productAnalytics");
      await trackProductEvent(PRODUCT_EVENTS.PRICING_PLAN_SELECTED, {
        plan: plan.id,
        billing_interval: selectedInterval,
        ...(plan.id === "TEAM" ? { seat_count: seats } : {}),
      });
    } catch (_) {
      // Checkout remains available if analytics cannot load.
    }
  }

  if (disabled) {
    return <button className={styles.action} type="button" disabled>Monthly billing only</button>;
  }

  return (
    <a
      className={styles.action}
      href={checkoutHref(plan, selectedInterval, seats)}
      onClick={trackSelection}
    >
      {plan.cta} →
    </a>
  );
}

function AccessRecord({ plan, interval, seats, managePlan, onSeatsChange }) {
  const price = priceRecord(plan, interval, seats);
  const annualUnavailable = interval === "year" && plan.yearly == null && plan.id !== "FREE";
  return (
    <article className={styles.plan} data-plan={plan.id}>
      <header className={styles.planIdentity}>
        <span>{plan.id.replace("_", " / ")}</span>
        <h2>{plan.name}</h2>
        <p>{plan.audience}</p>
      </header>

      <div className={styles.price}>
        <strong>{price.amount}</strong>
        <span>{price.cadence}</span>
        <small>{price.bill}</small>
        {plan.id === "TEAM" ? (
          <div className={styles.seats}>
            <label htmlFor="team-seat-count">Seats</label>
            <button
              type="button"
              aria-label="Remove one seat"
              disabled={seats <= plan.minimumSeats}
              onClick={() => onSeatsChange(seats - 1)}
            >−</button>
            <input
              id="team-seat-count"
              inputMode="numeric"
              min={plan.minimumSeats}
              max={plan.maximumSeats}
              type="number"
              value={seats}
              onChange={(event) => onSeatsChange(event.target.value)}
            />
            <button
              type="button"
              aria-label="Add one seat"
              disabled={seats >= plan.maximumSeats}
              onClick={() => onSeatsChange(seats + 1)}
            >+</button>
            <span>2–50</span>
          </div>
        ) : null}
      </div>

      <ul className={styles.features}>
        {plan.features.map((feature, index) => (
          <li key={feature}><span>{String(index + 1).padStart(2, "0")}</span>{feature}</li>
        ))}
      </ul>

      <div className={styles.planAction}>
        <PlanAction
          plan={plan}
          interval={interval}
          seats={seats}
          disabled={annualUnavailable}
          managePlan={managePlan}
        />
      </div>
    </article>
  );
}

export default function PricingCatalog() {
  const [interval, setInterval] = useState("month");
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const team = publicPlanCatalog.find((plan) => plan.id === "TEAM");
  const [seats, setSeats] = useState(team.minimumSeats);

  useEffect(() => {
    let unsubscribe = () => {};
    let cancelled = false;
    async function readSubscription() {
      try {
        const [{ auth }, { onAuthStateChanged }] = await Promise.all([
          import("../../src/firebase"),
          import("firebase/auth"),
        ]);
        if (cancelled) return;
        unsubscribe = onAuthStateChanged(auth, async (user) => {
          if (!user) {
            if (!cancelled) setHasActiveSubscription(false);
            return;
          }
          try {
            const { getEntitlements } = await import("../../src/lib/billing");
            const entitlements = await getEntitlements({ noCache: false });
            const paidPlans = new Set(["STARTER", "PRO", "PRO_PLUS", "TEAM"]);
            if (!cancelled) setHasActiveSubscription(paidPlans.has(String(entitlements?.plan || "")));
          } catch (_) {
            if (!cancelled) setHasActiveSubscription(false);
          }
        });
      } catch (_) {
        if (!cancelled) setHasActiveSubscription(false);
      }
    }
    void readSubscription();
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  function updateSeats(nextSeats) {
    const numeric = Number.isFinite(Number(nextSeats)) ? Math.round(Number(nextSeats)) : team.minimumSeats;
    setSeats(Math.min(team.maximumSeats, Math.max(team.minimumSeats, numeric)));
  }

  return (
    <main id="main-content" className={styles.main}>
      <section className={styles.intro} aria-labelledby="pricing-title">
        <div>
          <p className={styles.phase}>ACCESS LEDGER / USD</p>
          <h1 id="pricing-title">Choose how long the build can run.</h1>
        </div>
        <div className={styles.introCopy}>
          <p>Every plan uses the same project-first workflow. Capacity, history, model access, and creator tools change as the work grows.</p>
          <div className={styles.interval} aria-label="Billing period">
            <span>BILLING</span>
            <button type="button" aria-pressed={interval === "month"} onClick={() => setInterval("month")}>Monthly</button>
            <button type="button" aria-pressed={interval === "year"} onClick={() => setInterval("year")}>Yearly</button>
          </div>
          <small>Prices are in USD. Starter is available monthly only.</small>
        </div>
      </section>

      <section className={styles.ledger} aria-label="NexusRBX access plans">
        {publicPlanCatalog.map((plan) => (
          <AccessRecord
            key={plan.id}
            plan={plan}
            interval={interval}
            seats={plan.id === "TEAM" ? seats : 1}
            managePlan={hasActiveSubscription}
            onSeatsChange={updateSeats}
          />
        ))}
      </section>

      <section className={styles.comparison} aria-labelledby="comparison-title">
        <header>
          <p className={styles.phase}>CAPACITY INDEX</p>
          <h2 id="comparison-title">What changes between records</h2>
        </header>
        <div className={styles.tableWrap} role="region" aria-label="Plan comparison table" tabIndex="0">
          <table>
            <thead>
              <tr>
                <th scope="col">Plan</th>
                <th scope="col">Model access</th>
                <th scope="col">Parallel pace</th>
                <th scope="col">History</th>
                <th scope="col">Creator tools</th>
              </tr>
            </thead>
            <tbody>
              {publicPlanCatalog.map((plan) => (
                <tr key={plan.id}>
                  <th scope="row">{plan.name}</th>
                  {comparisonFacts[plan.id].map((fact) => <td key={fact}>{fact}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
