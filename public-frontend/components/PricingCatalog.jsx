"use client";

import { useEffect, useMemo, useState } from "react";
import publicPlanCatalog from "../../src/data/publicPlanCatalog.json";

const focusClass =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ds-bg-canvas)]";

const comparisonFacts = {
  FREE: {
    setup: "Nexus Auto for focused ideas",
    pace: "1 AI task at a time",
    history: "7-day chat history",
    product: "1 active UI project",
  },
  STARTER: {
    setup: "Included model choice",
    pace: "2 AI tasks at a time",
    history: "30-day chat history",
    product: "3 active UI projects",
  },
  PRO: {
    setup: "Included + Premium Direct options",
    pace: "Higher Included Usage",
    history: "90-day usage history",
    product: "Icon Generator",
  },
  PRO_PLUS: {
    setup: "Included + Premium Direct options",
    pace: "Higher Included Usage than Pro",
    history: "90-day usage history",
    product: "Icon Generator",
  },
  TEAM: {
    setup: "Included + Premium Direct options",
    pace: "Pooled Included Usage per seat",
    history: "90-day usage history",
    product: "Icon Generator · 2–50 seats",
  },
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

function PlanPrice({ plan, interval, seats = 1 }) {
  const yearly = interval === "year" && plan.yearly != null;
  const unit = plan.perSeat ? "/ user" : "";

  if (plan.id === "FREE") {
    return (
      <div>
        <p className="text-3xl font-semibold tracking-[-0.025em] text-[var(--ds-text)]">$0</p>
        <p className="mt-1 text-sm text-[var(--ds-text-muted)]">No billing details required</p>
      </div>
    );
  }

  if (yearly) {
    const annualTotal = plan.yearly * seats;
    return (
      <div>
        <p className="text-3xl font-semibold tracking-[-0.025em] text-[var(--ds-text)]">
          {money(plan.yearly / 12)}
          <span className="ml-1 text-base font-normal text-[var(--ds-text-secondary)]">{unit} / month</span>
        </p>
        <p className="mt-1 text-sm text-[var(--ds-text-secondary)]">
          {plan.perSeat
            ? `Billed ${money(annualTotal)} yearly for ${seats} seats (${money(plan.yearly)} per user)`
            : `Billed ${money(plan.yearly)} yearly`}
        </p>
      </div>
    );
  }

  const monthlyTotal = plan.monthly * seats;
  return (
    <div>
      <p className="text-3xl font-semibold tracking-[-0.025em] text-[var(--ds-text)]">
        {money(plan.monthly)}
        <span className="ml-1 text-base font-normal text-[var(--ds-text-secondary)]">{unit} / month</span>
      </p>
      <p className="mt-1 text-sm text-[var(--ds-text-muted)]">
        {plan.perSeat ? `${money(monthlyTotal)} billed monthly for ${seats} seats` : "Billed monthly"}
      </p>
    </div>
  );
}

function FeatureList({ features }) {
  return (
    <ul className="grid gap-2.5 text-sm leading-6 text-[var(--ds-text-secondary)]">
      {features.map((feature) => (
        <li className="flex gap-2.5" key={feature}>
          <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--ds-accent)]" />
          <span>{feature}</span>
        </li>
      ))}
    </ul>
  );
}

function PlanAction({ plan, interval, seats, disabled = false, managePlan = false }) {
  const selectedInterval = plan.yearly == null ? "month" : interval;
  const label = disabled ? "Monthly billing only" : plan.cta;

  if (managePlan && plan.id !== "FREE") {
    return (
      <a
        className={`${focusClass} mt-auto inline-flex h-11 w-full items-center justify-center rounded-full border border-[var(--ds-border-strong)] bg-[var(--ds-fill-subtle)] px-5 text-sm font-semibold text-[var(--ds-text)] transition-[background-color,border-color,transform] hover:border-[var(--ds-accent-border)] hover:bg-[var(--ds-fill-hover)] active:scale-[0.99] motion-reduce:transform-none`}
        href="/billing"
      >
        Manage plan
      </a>
    );
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
      // Navigation and checkout remain available if analytics cannot load.
    }
  }

  if (disabled) {
    return (
      <button
        className="mt-auto h-11 w-full cursor-not-allowed rounded-full border border-[var(--ds-border)] bg-[var(--ds-fill-subtle)] px-5 text-sm font-semibold text-[var(--ds-text-muted)] opacity-70"
        type="button"
        disabled
      >
        {label}
      </button>
    );
  }

  return (
    <a
      className={`${focusClass} mt-auto inline-flex h-11 w-full items-center justify-center rounded-full px-5 text-sm font-semibold transition-[background-color,border-color,transform] active:scale-[0.99] motion-reduce:transform-none ${
        plan.featured
          ? "bg-[var(--ds-accent)] text-[var(--ds-accent-foreground)] hover:bg-[var(--ds-accent-hover)] active:bg-[var(--ds-accent-pressed)]"
          : "border border-[var(--ds-border-strong)] bg-[var(--ds-fill-subtle)] text-[var(--ds-text)] hover:border-[var(--ds-accent-border)] hover:bg-[var(--ds-fill-hover)]"
      }`}
      href={checkoutHref(plan, selectedInterval, seats)}
      onClick={trackSelection}
    >
      {label}
    </a>
  );
}

function EntryPlan({ plan, interval, managePlan }) {
  const unavailableAnnually = interval === "year" && plan.id === "STARTER";

  return (
    <article className="flex min-h-full flex-col rounded-[14px] border border-[var(--ds-border)] bg-[var(--ds-surface-1)] p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold tracking-[-0.015em] text-[var(--ds-text)]">{plan.name}</h3>
          <p className="mt-1 text-sm text-[var(--ds-text-secondary)]">{plan.audience}</p>
        </div>
        {plan.id === "STARTER" ? (
          <span className="text-right text-xs font-medium uppercase tracking-[0.1em] text-[var(--ds-text-muted)]">Monthly only</span>
        ) : null}
      </div>
      <div className="mt-6">
        <PlanPrice plan={plan} interval="month" />
      </div>
      <div className="my-6 border-t border-[var(--ds-border-subtle)]" />
      <FeatureList features={plan.features} />
      <div className="mt-7 flex flex-1 flex-col">
        <PlanAction
          plan={plan}
          interval={interval}
          seats={1}
          disabled={unavailableAnnually}
          managePlan={managePlan}
        />
      </div>
    </article>
  );
}

function PrimaryPlan({ plan, interval, managePlan }) {
  return (
    <article
      className={`flex min-h-full flex-col rounded-[14px] border p-7 ${
        plan.featured ? "border-[var(--ds-accent-border)] bg-[var(--ds-accent-soft)]" : "border-[var(--ds-border)] bg-[var(--ds-surface-1)]"
      }`}
    >
      {plan.featured ? (
        <p className="mb-5 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ds-accent)]">Featured plan</p>
      ) : (
        <div className="mb-5 h-4" aria-hidden="true" />
      )}
      <h3 className="text-2xl font-semibold tracking-[-0.02em] text-[var(--ds-text)]">{plan.name}</h3>
      <p className="mt-2 min-h-10 text-sm leading-6 text-[var(--ds-text-secondary)]">{plan.audience}</p>
      <div className="mt-6 min-h-16">
        <PlanPrice plan={plan} interval={interval} />
      </div>
      <div className="my-7 border-t border-[var(--ds-border-subtle)]" />
      <FeatureList features={plan.features} />
      <div className="mt-8 flex flex-1 flex-col">
        <PlanAction plan={plan} interval={interval} seats={1} managePlan={managePlan} />
      </div>
    </article>
  );
}

export default function PricingCatalog() {
  const [interval, setInterval] = useState("month");
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const team = publicPlanCatalog.find((plan) => plan.id === "TEAM");
  const [seats, setSeats] = useState(team.minimumSeats);
  const entryPlans = useMemo(
    () => publicPlanCatalog.filter((plan) => plan.id === "FREE" || plan.id === "STARTER"),
    [],
  );
  const primaryPlans = useMemo(
    () => publicPlanCatalog.filter((plan) => plan.id === "PRO" || plan.id === "PRO_PLUS"),
    [],
  );

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
    const normalized = Number.isFinite(Number(nextSeats)) ? Math.round(Number(nextSeats)) : team.minimumSeats;
    setSeats(Math.min(team.maximumSeats, Math.max(team.minimumSeats, normalized)));
  }

  return (
    <main id="main-content">
      <section className="border-b border-[var(--ds-border-subtle)] px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="mx-auto max-w-5xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--ds-accent)]">Plans for every build</p>
          <h1 className="mx-auto mt-5 max-w-4xl font-display text-5xl font-normal leading-[0.98] tracking-[-0.045em] text-[var(--ds-text)] sm:text-6xl lg:text-7xl">
            Give your Roblox game room to grow.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-[var(--ds-text-secondary)] sm:text-lg">
            Start with one focused idea. As the project expands, choose more AI capacity, longer history, model choice, and creator tools without changing how you plan, build, and review.
          </p>
          <div className="mt-10 inline-flex rounded-full border border-[var(--ds-border)] bg-[var(--ds-surface-2)] p-1" aria-label="Billing period">
            <button
              aria-pressed={interval === "month"}
              className={`${focusClass} min-h-11 rounded-full px-5 py-2 text-sm font-semibold transition-[background-color,color,transform] active:scale-[0.98] motion-reduce:transform-none ${
                interval === "month" ? "bg-[var(--ds-surface-3)] text-[var(--ds-text)] shadow-sm" : "text-[var(--ds-text-secondary)] hover:text-[var(--ds-text)]"
              }`}
              onClick={() => setInterval("month")}
              type="button"
            >
              Monthly
            </button>
            <button
              aria-pressed={interval === "year"}
              className={`${focusClass} min-h-11 rounded-full px-5 py-2 text-sm font-semibold transition-[background-color,color,transform] active:scale-[0.98] motion-reduce:transform-none ${
                interval === "year" ? "bg-[var(--ds-surface-3)] text-[var(--ds-text)] shadow-sm" : "text-[var(--ds-text-secondary)] hover:text-[var(--ds-text)]"
              }`}
              onClick={() => setInterval("year")}
              type="button"
            >
              Yearly
            </button>
          </div>
          <p className="mt-3 text-xs text-[var(--ds-text-muted)]">Prices are in USD. Starter is available with monthly billing only.</p>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 sm:py-24 lg:px-8" aria-labelledby="entry-plans-title">
        <div className="mx-auto max-w-6xl">
          <div className="mb-7 max-w-2xl">
            <h2 id="entry-plans-title" className="font-display text-4xl font-normal tracking-[-0.035em] text-[var(--ds-text)]">Start the first build</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--ds-text-secondary)]">Free keeps the first idea focused. Starter adds more room for regular tasks and review.</p>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {entryPlans.map((plan) => (
              <EntryPlan
                interval={interval}
                key={plan.id}
                managePlan={hasActiveSubscription}
                plan={plan}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-[var(--ds-border-subtle)] bg-[var(--ds-surface-1)] px-4 py-20 sm:px-6 sm:py-24 lg:px-8" aria-labelledby="creator-plans-title">
        <div className="mx-auto max-w-6xl">
          <div className="mb-7 max-w-2xl">
            <h2 id="creator-plans-title" className="font-display text-4xl font-normal tracking-[-0.035em] text-[var(--ds-text)]">Stay in the build loop longer</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--ds-text-secondary)]">Pro and Pro+ add more Included Usage, Premium Direct options, Icon Generator, and 90-day usage history.</p>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            {primaryPlans.map((plan) => (
              <PrimaryPlan
                interval={interval}
                key={plan.id}
                managePlan={hasActiveSubscription}
                plan={plan}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 sm:py-24 lg:px-8" aria-labelledby="team-plan-title">
        <div className="mx-auto max-w-6xl rounded-[14px] border border-[var(--ds-border)] bg-[var(--ds-surface-1)] p-6 sm:p-8 lg:grid lg:grid-cols-[1fr_0.9fr] lg:gap-12 lg:p-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ds-accent)]">For studios</p>
            <h2 id="team-plan-title" className="mt-3 font-display text-5xl font-normal tracking-[-0.04em] text-[var(--ds-text)]">One plan for the studio</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--ds-text-secondary)]">{team.audience}. Choose between 2 and 50 seats and keep Included Usage pooled across paid seats.</p>
            <div className="mt-7">
              <FeatureList features={team.features} />
            </div>
          </div>

          <div className="mt-9 border-t border-[var(--ds-border-subtle)] pt-8 lg:mt-0 lg:border-l lg:border-t-0 lg:pl-12 lg:pt-0">
            <label className="text-sm font-medium text-[var(--ds-text-secondary)]" htmlFor="team-seat-count">Team seats</label>
            <div className="mt-3 flex items-center gap-2">
              <button
                aria-label="Remove one seat"
                className={`${focusClass} h-11 w-11 rounded-lg border border-[var(--ds-border-strong)] text-lg text-[var(--ds-text)] transition-[background-color,transform] hover:bg-[var(--ds-fill-hover)] active:scale-[0.96] disabled:cursor-not-allowed disabled:text-[var(--ds-text-muted)] disabled:opacity-50 motion-reduce:transform-none`}
                disabled={seats <= team.minimumSeats}
                onClick={() => updateSeats(seats - 1)}
                type="button"
              >
                −
              </button>
              <input
                className={`${focusClass} h-11 w-24 rounded-lg border border-[var(--ds-border-strong)] bg-[var(--ds-surface-2)] px-3 text-center text-sm font-semibold text-[var(--ds-text)]`}
                id="team-seat-count"
                inputMode="numeric"
                max={team.maximumSeats}
                min={team.minimumSeats}
                onChange={(event) => updateSeats(event.target.value)}
                type="number"
                value={seats}
              />
              <button
                aria-label="Add one seat"
                className={`${focusClass} h-11 w-11 rounded-lg border border-[var(--ds-border-strong)] text-lg text-[var(--ds-text)] transition-[background-color,transform] hover:bg-[var(--ds-fill-hover)] active:scale-[0.96] disabled:cursor-not-allowed disabled:text-[var(--ds-text-muted)] disabled:opacity-50 motion-reduce:transform-none`}
                disabled={seats >= team.maximumSeats}
                onClick={() => updateSeats(seats + 1)}
                type="button"
              >
                +
              </button>
              <span className="ml-1 text-sm text-[var(--ds-text-muted)]">2–50</span>
            </div>
            <div className="mt-7 min-h-16">
              <PlanPrice interval={interval} plan={team} seats={seats} />
            </div>
            <div className="mt-8 flex flex-col">
              <PlanAction
                interval={interval}
                managePlan={hasActiveSubscription}
                plan={team}
                seats={seats}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--ds-border-subtle)] bg-[var(--ds-surface-1)] px-4 py-20 sm:px-6 sm:py-24 lg:px-8" aria-labelledby="comparison-title">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <h2 id="comparison-title" className="font-display text-4xl font-normal tracking-[-0.035em] text-[var(--ds-text)]">Compare your creator runway</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--ds-text-secondary)]">See how each plan changes task capacity, history, and access to creator tools.</p>
          </div>
          <div className={`${focusClass} mt-7 overflow-x-auto rounded-xl border border-[var(--ds-border)]`} role="region" aria-label="Plan comparison table" tabIndex="0">
            <table className="min-w-[780px] w-full border-collapse text-left text-sm">
              <thead className="bg-[var(--ds-surface-2)] text-xs uppercase tracking-[0.1em] text-[var(--ds-text-muted)]">
                <tr>
                  <th className="px-5 py-4 font-semibold" scope="col">Plan</th>
                  <th className="px-5 py-4 font-semibold" scope="col">Creation setup</th>
                  <th className="px-5 py-4 font-semibold" scope="col">Build pace</th>
                  <th className="px-5 py-4 font-semibold" scope="col">History</th>
                  <th className="px-5 py-4 font-semibold" scope="col">Creator tools</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--ds-border-subtle)] bg-[var(--ds-surface-1)] text-[var(--ds-text-secondary)]">
                {publicPlanCatalog.map((plan) => {
                  const facts = comparisonFacts[plan.id];
                  return (
                    <tr key={plan.id}>
                      <th className="whitespace-nowrap px-5 py-4 font-semibold text-[var(--ds-text)]" scope="row">{plan.name}</th>
                      <td className="px-5 py-4">{facts.setup}</td>
                      <td className="px-5 py-4">{facts.pace}</td>
                      <td className="px-5 py-4">{facts.history}</td>
                      <td className="px-5 py-4">{facts.product}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs leading-5 text-[var(--ds-text-muted)]">
            Checkout shows the final plan, billing period, seat count, and billed total before payment.
          </p>
        </div>
      </section>
    </main>
  );
}
