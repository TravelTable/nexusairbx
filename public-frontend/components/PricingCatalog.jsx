"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Check, Minus, Plus, Sparkles, X } from "lucide-react";
import publicPlanCatalog from "../../src/data/publicPlanCatalog.json";
import styles from "./PricingWorkspace.module.css";

const comparisonRows = [
  {
    label: "Project-first workflow",
    plans: ["FREE", "STARTER", "PRO", "PRO_PLUS", "TEAM"],
  },
  {
    label: "Model choice",
    plans: ["STARTER", "PRO", "PRO_PLUS", "TEAM"],
  },
  {
    label: "Premium Direct models",
    plans: ["PRO", "PRO_PLUS", "TEAM"],
  },
  {
    label: "Icon Generator",
    plans: ["PRO", "PRO_PLUS", "TEAM"],
  },
  {
    label: "30+ day history",
    plans: ["STARTER", "PRO", "PRO_PLUS", "TEAM"],
  },
  {
    label: "Pooled team usage",
    plans: ["TEAM"],
  },
];

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
  const multiplier = plan.perSeat ? seats : 1;

  if (plan.id === "FREE") {
    return {
      amount: "$0",
      cadence: "forever",
      bill: "No billing details required",
      savings: null,
      original: null,
    };
  }

  if (interval === "year" && plan.yearly != null) {
    const yearlySavings = plan.monthly * 12 - plan.yearly;
    return {
      amount: money((plan.yearly / 12) * multiplier),
      cadence: plan.perSeat ? `/mo · ${seats} seats` : "/mo",
      bill: plan.perSeat
        ? `${money(plan.yearly * seats)} billed annually`
        : `${money(plan.yearly)} billed annually`,
      savings: plan.perSeat
        ? `Save ${money(yearlySavings)} per seat yearly`
        : `Save ${money(yearlySavings)} yearly`,
      original: `${money(plan.monthly * multiplier)}/mo`,
    };
  }

  return {
    amount: money(plan.monthly * multiplier),
    cadence: plan.perSeat ? `/mo · ${seats} seats` : "/mo",
    bill:
      interval === "year" && plan.yearly == null
        ? "Available with monthly billing"
        : plan.perSeat
          ? `${money(plan.monthly)} per seat, billed monthly`
          : "Billed monthly",
    savings: null,
    original: null,
  };
}

function PlanAction({ plan, interval, seats, disabled, managePlan }) {
  const selectedInterval = plan.yearly == null ? "month" : interval;

  if (managePlan && plan.id !== "FREE") {
    return (
      <a className={styles.action} href="/billing">
        <span>Manage plan</span>
        <ArrowRight aria-hidden="true" size={16} />
      </a>
    );
  }

  async function trackSelection() {
    try {
      const { PRODUCT_EVENTS, trackProductEvent } =
        await import("../../src/lib/productAnalytics");
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
    return (
      <button className={styles.action} type="button" disabled>
        Monthly billing only
      </button>
    );
  }

  return (
    <a
      className={styles.action}
      href={checkoutHref(plan, selectedInterval, seats)}
      onClick={trackSelection}
      aria-label={`${plan.cta}, ${plan.name} plan`}
    >
      <span>{plan.cta}</span>
      <ArrowRight aria-hidden="true" size={16} />
    </a>
  );
}

function SeatControl({ plan, seats, onSeatsChange }) {
  return (
    <div className={styles.seatControl}>
      <div>
        <strong>Team size</strong>
        <span>2–50 paid seats</span>
      </div>
      <div className={styles.seatStepper}>
        <button
          type="button"
          aria-label="Remove one seat"
          disabled={seats <= plan.minimumSeats}
          onClick={() => onSeatsChange(seats - 1)}
        >
          <Minus aria-hidden="true" size={14} />
        </button>
        <input
          id="team-seat-count"
          aria-label="Team seat count"
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
        >
          <Plus aria-hidden="true" size={14} />
        </button>
      </div>
    </div>
  );
}

function PricingCard({
  plan,
  interval,
  seats,
  managePlan,
  onSeatsChange,
}) {
  const price = priceRecord(plan, interval, seats);
  const annualUnavailable =
    interval === "year" && plan.yearly == null && plan.id !== "FREE";

  return (
    <article
      className={styles.planCard}
      data-plan={plan.id}
      data-featured={plan.featured ? "true" : "false"}
    >
      <header className={styles.cardHeader}>
        <div className={styles.cardTitleRow}>
          <h2>{plan.name}</h2>
          {plan.featured ? (
            <span className={styles.popularLabel}>
              <Sparkles aria-hidden="true" size={12} />
              Most popular
            </span>
          ) : null}
        </div>
        <p>{plan.audience}</p>
        <div className={styles.priceBlock}>
          <div>
            <strong>{price.amount}</strong>
            <span>{price.cadence}</span>
          </div>
          <small>{price.bill}</small>
          {price.savings ? <em>{price.savings}</em> : null}
          {price.original ? <s>{price.original}</s> : null}
        </div>
      </header>

      <div className={styles.cardContent}>
        {plan.id === "TEAM" ? (
          <SeatControl plan={plan} seats={seats} onSeatsChange={onSeatsChange} />
        ) : null}
        <h3>Key features</h3>
        <ul>
          {plan.features.map((feature) => (
            <li key={feature}>
              <Check aria-hidden="true" size={16} strokeWidth={2.2} />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      <footer className={styles.cardFooter}>
        <PlanAction
          plan={plan}
          interval={interval}
          seats={seats}
          disabled={annualUnavailable}
          managePlan={managePlan}
        />
      </footer>
    </article>
  );
}

function ComparisonTable() {
  return (
    <div
      className={styles.tableWrap}
      role="region"
      aria-label="Detailed feature comparison"
      tabIndex="0"
    >
      <table>
        <thead>
          <tr>
            <th scope="col">Feature</th>
            {publicPlanCatalog.map((plan) => (
              <th
                key={plan.id}
                scope="col"
                data-featured={plan.featured ? "true" : "false"}
              >
                {plan.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {comparisonRows.map((row) => (
            <tr key={row.label}>
              <th scope="row">{row.label}</th>
              {publicPlanCatalog.map((plan) => {
                const included = row.plans.includes(plan.id);
                const Icon = included ? Check : X;
                return (
                  <td
                    key={`${row.label}-${plan.id}`}
                    data-featured={plan.featured ? "true" : "false"}
                  >
                    <Icon
                      aria-label={included ? "Included" : "Not included"}
                      className={included ? styles.included : styles.notIncluded}
                      size={19}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
            if (!cancelled) {
              setHasActiveSubscription(
                paidPlans.has(String(entitlements?.plan || "")),
              );
            }
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
    const numeric = Number.isFinite(Number(nextSeats))
      ? Math.round(Number(nextSeats))
      : team.minimumSeats;
    setSeats(Math.min(team.maximumSeats, Math.max(team.minimumSeats, numeric)));
  }

  return (
    <main id="main-content" className={styles.main}>
      <section className={styles.hero} aria-labelledby="pricing-title">
        <p className={styles.eyebrow}>NexusRBX plans</p>
        <h1 id="pricing-title">Choose the plan that fits your build.</h1>
        <p className={styles.heroCopy}>
          Start free, then scale your model access, build capacity, history,
          and creator tools as your Roblox project grows.
        </p>

        <div className={styles.cycleToggle} role="group" aria-label="Billing period">
          <button
            type="button"
            aria-pressed={interval === "month"}
            onClick={() => setInterval("month")}
          >
            Monthly
          </button>
          <button
            type="button"
            aria-pressed={interval === "year"}
            onClick={() => setInterval("year")}
          >
            Annually
            <span>Save ~17%</span>
          </button>
        </div>
      </section>

      <section className={styles.pricingCards} aria-label="NexusRBX access plans">
        {publicPlanCatalog.map((plan) => (
          <PricingCard
            key={plan.id}
            plan={plan}
            interval={interval}
            seats={plan.id === "TEAM" ? seats : 1}
            managePlan={hasActiveSubscription}
            onSeatsChange={updateSeats}
          />
        ))}
      </section>

      <p className={styles.checkoutNote}>
        Prices in USD · No setup fee · Checkout confirms your exact total before purchase
      </p>

      <section className={styles.comparison} aria-labelledby="comparison-title">
        <header>
          <p className={styles.eyebrow}>Plan comparison</p>
          <h2 id="comparison-title">Detailed feature comparison</h2>
          <p>See the core differences at a glance.</p>
        </header>
        <ComparisonTable />
      </section>

      <section className={styles.billingNotes} aria-labelledby="billing-notes-title">
        <div>
          <p className={styles.eyebrow}>Good to know</p>
          <h2 id="billing-notes-title">Clear before checkout.</h2>
        </div>
        <dl>
          <div>
            <dt>Annual billing</dt>
            <dd>Monthly equivalents are shown on each card. The yearly total is charged at checkout.</dd>
          </div>
          <div>
            <dt>Team plans</dt>
            <dd>Choose 2–50 paid seats and keep one billing home for the studio.</dd>
          </div>
          <div>
            <dt>Already subscribed?</dt>
            <dd><a href="/billing">Open billing settings</a> to manage your current plan.</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
