"use client";

import { useEffect, useMemo, useState } from "react";
import publicPlanCatalog from "../../src/data/publicPlanCatalog.json";

const focusClass =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00f5d4] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07090f]";

const comparisonFacts = {
  FREE: {
    model: "Nexus Auto routing",
    usage: "1 concurrent job",
    history: "7-day chat history",
    product: "1 active UI project",
  },
  STARTER: {
    model: "Included model selection",
    usage: "2 concurrent jobs",
    history: "30-day chat history",
    product: "3 active UI projects",
  },
  PRO: {
    model: "Premium Direct access",
    usage: "Higher included AI usage",
    history: "90-day usage history",
    product: "Icon Generator access",
  },
  PRO_PLUS: {
    model: "Premium Direct access",
    usage: "Higher included usage than Pro",
    history: "90-day usage history",
    product: "Icon Generator access",
  },
  TEAM: {
    model: "Premium Direct access",
    usage: "Pooled included usage per seat",
    history: "One studio subscription",
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
        <p className="text-3xl font-semibold tracking-tight text-white">$0</p>
        <p className="mt-1 text-sm text-zinc-500">No billing details required</p>
      </div>
    );
  }

  if (yearly) {
    const annualTotal = plan.yearly * seats;
    return (
      <div>
        <p className="text-3xl font-semibold tracking-tight text-white">
          {money(plan.yearly / 12)}
          <span className="ml-1 text-base font-normal text-zinc-400">{unit} / month</span>
        </p>
        <p className="mt-1 text-sm text-zinc-400">
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
      <p className="text-3xl font-semibold tracking-tight text-white">
        {money(plan.monthly)}
        <span className="ml-1 text-base font-normal text-zinc-400">{unit} / month</span>
      </p>
      <p className="mt-1 text-sm text-zinc-500">
        {plan.perSeat ? `${money(monthlyTotal)} billed monthly for ${seats} seats` : "Billed monthly"}
      </p>
    </div>
  );
}

function FeatureList({ features }) {
  return (
    <ul className="grid gap-2.5 text-sm text-zinc-300">
      {features.map((feature) => (
        <li className="flex gap-2.5" key={feature}>
          <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#00f5d4]" />
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
        className={`${focusClass} mt-auto inline-flex h-11 w-full items-center justify-center rounded-md border border-white/15 bg-white/[0.03] px-4 text-sm font-semibold text-white transition-colors hover:border-white/30 hover:bg-white/[0.07]`}
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
        className="mt-auto h-11 w-full cursor-not-allowed rounded-md border border-white/10 bg-white/[0.03] px-4 text-sm font-semibold text-zinc-500"
        type="button"
        disabled
      >
        {label}
      </button>
    );
  }

  return (
    <a
      className={`${focusClass} mt-auto inline-flex h-11 w-full items-center justify-center rounded-md px-4 text-sm font-semibold transition-colors ${
        plan.featured
          ? "bg-[#00f5d4] text-[#04110e] hover:bg-[#32f7dc]"
          : "border border-white/15 bg-white/[0.03] text-white hover:border-white/30 hover:bg-white/[0.07]"
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
    <article className="flex min-h-full flex-col rounded-lg border border-white/10 bg-[#0c0f16] p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold text-white">{plan.name}</h3>
          <p className="mt-1 text-sm text-zinc-400">{plan.audience}</p>
        </div>
        {plan.id === "STARTER" ? (
          <span className="text-right text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">Monthly only</span>
        ) : null}
      </div>
      <div className="mt-6">
        <PlanPrice plan={plan} interval="month" />
      </div>
      <div className="my-6 border-t border-white/10" />
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
      className={`flex min-h-full flex-col rounded-lg border p-7 ${
        plan.featured ? "border-[#00f5d4]/60 bg-[#0d1517]" : "border-white/10 bg-[#0c0f16]"
      }`}
    >
      {plan.featured ? (
        <p className="mb-5 text-xs font-semibold uppercase tracking-[0.16em] text-[#58f7df]">Featured plan</p>
      ) : (
        <div className="mb-5 h-4" aria-hidden="true" />
      )}
      <h3 className="text-2xl font-semibold tracking-tight text-white">{plan.name}</h3>
      <p className="mt-2 min-h-10 text-sm leading-6 text-zinc-400">{plan.audience}</p>
      <div className="mt-6 min-h-16">
        <PlanPrice plan={plan} interval={interval} />
      </div>
      <div className="my-7 border-t border-white/10" />
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
      <section className="border-b border-white/10 px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-5xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#58f7df]">Pricing</p>
          <h1 className="mx-auto mt-4 max-w-4xl text-4xl font-semibold tracking-[-0.035em] text-white sm:text-5xl lg:text-6xl">
            Plans for individual creators and Roblox studios.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-zinc-400 sm:text-lg">
            Compare included product access, choose a billing period, and review the final details before checkout.
          </p>
          <div className="mt-9 inline-flex rounded-md border border-white/10 bg-[#0c0f16] p-1" aria-label="Billing period">
            <button
              aria-pressed={interval === "month"}
              className={`${focusClass} rounded px-5 py-2 text-sm font-semibold transition-colors ${
                interval === "month" ? "bg-white text-[#080a10]" : "text-zinc-400 hover:text-white"
              }`}
              onClick={() => setInterval("month")}
              type="button"
            >
              Monthly
            </button>
            <button
              aria-pressed={interval === "year"}
              className={`${focusClass} rounded px-5 py-2 text-sm font-semibold transition-colors ${
                interval === "year" ? "bg-white text-[#080a10]" : "text-zinc-400 hover:text-white"
              }`}
              onClick={() => setInterval("year")}
              type="button"
            >
              Yearly
            </button>
          </div>
          <p className="mt-3 text-xs text-zinc-500">Prices are in USD. Starter is available with monthly billing only.</p>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 lg:px-8" aria-labelledby="entry-plans-title">
        <div className="mx-auto max-w-6xl">
          <div className="mb-7 max-w-2xl">
            <h2 id="entry-plans-title" className="text-2xl font-semibold tracking-tight text-white">Start with the essentials</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">Free and Starter keep the initial commitment small.</p>
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

      <section className="border-y border-white/10 bg-[#090b11] px-4 py-14 sm:px-6 lg:px-8" aria-labelledby="creator-plans-title">
        <div className="mx-auto max-w-6xl">
          <div className="mb-7 max-w-2xl">
            <h2 id="creator-plans-title" className="text-2xl font-semibold tracking-tight text-white">Compare Pro and Pro+</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">Both plans include Premium Direct model access and the Icon Generator.</p>
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

      <section className="px-4 py-14 sm:px-6 lg:px-8" aria-labelledby="team-plan-title">
        <div className="mx-auto max-w-6xl rounded-lg border border-white/10 bg-[#0c0f16] p-6 sm:p-8 lg:grid lg:grid-cols-[1fr_0.9fr] lg:gap-12 lg:p-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#58f7df]">For studios</p>
            <h2 id="team-plan-title" className="mt-3 text-3xl font-semibold tracking-tight text-white">Team</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-400">{team.audience}. Choose between 2 and 50 seats.</p>
            <div className="mt-7">
              <FeatureList features={team.features} />
            </div>
          </div>

          <div className="mt-9 border-t border-white/10 pt-8 lg:mt-0 lg:border-l lg:border-t-0 lg:pl-12 lg:pt-0">
            <label className="text-sm font-medium text-zinc-200" htmlFor="team-seat-count">Team seats</label>
            <div className="mt-3 flex items-center gap-2">
              <button
                aria-label="Remove one seat"
                className={`${focusClass} h-11 w-11 rounded-md border border-white/15 text-lg text-white transition-colors hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:text-zinc-600`}
                disabled={seats <= team.minimumSeats}
                onClick={() => updateSeats(seats - 1)}
                type="button"
              >
                −
              </button>
              <input
                className={`${focusClass} h-11 w-24 rounded-md border border-white/15 bg-[#090b11] px-3 text-center text-sm font-semibold text-white`}
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
                className={`${focusClass} h-11 w-11 rounded-md border border-white/15 text-lg text-white transition-colors hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:text-zinc-600`}
                disabled={seats >= team.maximumSeats}
                onClick={() => updateSeats(seats + 1)}
                type="button"
              >
                +
              </button>
              <span className="ml-1 text-sm text-zinc-500">2–50</span>
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

      <section className="border-t border-white/10 bg-[#090b11] px-4 py-14 sm:px-6 lg:px-8" aria-labelledby="comparison-title">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <h2 id="comparison-title" className="text-2xl font-semibold tracking-tight text-white">Plan comparison</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">A concise view of the currently listed product access and limits.</p>
          </div>
          <div className="mt-7 overflow-x-auto rounded-lg border border-white/10">
            <table className="min-w-[780px] w-full border-collapse text-left text-sm">
              <thead className="bg-[#0c0f16] text-xs uppercase tracking-[0.12em] text-zinc-500">
                <tr>
                  <th className="px-5 py-4 font-semibold" scope="col">Plan</th>
                  <th className="px-5 py-4 font-semibold" scope="col">Model access</th>
                  <th className="px-5 py-4 font-semibold" scope="col">Usage</th>
                  <th className="px-5 py-4 font-semibold" scope="col">History or structure</th>
                  <th className="px-5 py-4 font-semibold" scope="col">Product access</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 bg-[#090b11] text-zinc-300">
                {publicPlanCatalog.map((plan) => {
                  const facts = comparisonFacts[plan.id];
                  return (
                    <tr key={plan.id}>
                      <th className="whitespace-nowrap px-5 py-4 font-semibold text-white" scope="row">{plan.name}</th>
                      <td className="px-5 py-4">{facts.model}</td>
                      <td className="px-5 py-4">{facts.usage}</td>
                      <td className="px-5 py-4">{facts.history}</td>
                      <td className="px-5 py-4">{facts.product}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs leading-5 text-zinc-500">
            Checkout shows the final plan, billing period, seat count, and billed total before payment.
          </p>
        </div>
      </section>
    </main>
  );
}
