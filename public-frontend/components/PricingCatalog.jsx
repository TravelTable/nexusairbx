"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  CircleHelp,
  Minus,
  Plus,
  Sparkles,
} from "lucide-react";
import publicPlanCatalog from "../../src/data/publicPlanCatalog.json";
import styles from "./PricingWorkspace.module.css";

const comparisonFacts = {
  FREE: ["Nexus Auto", "1 task", "7-day chat history", "1 active project"],
  STARTER: [
    "Model choice",
    "2 tasks",
    "30-day chat history",
    "3 active projects",
  ],
  PRO: [
    "Premium Direct options",
    "Higher Included Usage",
    "90-day usage history",
    "Icon Generator",
  ],
  PRO_PLUS: [
    "Premium Direct options",
    "Higher usage than Pro",
    "90-day usage history",
    "Icon Generator",
  ],
  TEAM: [
    "Premium Direct options",
    "Pooled usage per seat",
    "90-day usage history",
    "Icon Generator · 2–50 seats",
  ],
};

const featureLabels = {
  FREE: ["Nexus Auto", "1 task", "7-day history", "1 project"],
  STARTER: ["Model choice", "2 tasks", "30-day history", "3 projects"],
  PRO: ["More usage", "Premium models", "Icon Generator", "90-day history"],
  PRO_PLUS: [
    "Highest solo usage",
    "Premium models",
    "Icon Generator",
    "90-day history",
  ],
  TEAM: ["Pooled usage", "Premium models", "Icon Generator", "2–50 seats"],
};

const finderGroups = [
  {
    label: "Builder",
    help: "Who is building? Choose solo for one creator or team for shared billing.",
    stateKey: "teamMode",
    options: [
      ["solo", "Just me"],
      ["team", "A team"],
    ],
  },
  {
    label: "Pace",
    help: "How often will you run reviewed builds? This changes the suggested capacity.",
    stateKey: "pace",
    options: [
      ["explore", "Exploring"],
      ["regular", "Regularly"],
      ["heavy", "Frequently"],
    ],
  },
  {
    label: "Focus",
    help: "Choose the workflow you expect to use most. Every plan can still access the core creator flow.",
    stateKey: "focus",
    options: [
      ["scripts", "Scripts"],
      ["agent", "Agent builds"],
      ["assets", "Assets"],
    ],
  },
];

function DevTip({ label, children }) {
  return (
    <details className={styles.devTip}>
      <summary aria-label={label} title={label}>
        <CircleHelp aria-hidden="true" size={15} strokeWidth={1.8} />
      </summary>
      <div role="note">{children}</div>
    </details>
  );
}

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
    return {
      amount: "$0",
      cadence: "forever",
      bill: "No billing details required",
      savings: null,
    };
  }

  if (interval === "year" && plan.yearly != null) {
    const yearlySavings = plan.monthly * 12 - plan.yearly;
    return {
      amount: money((plan.yearly / 12) * (plan.perSeat ? seats : 1)),
      cadence: plan.perSeat ? `/ month for ${seats} seats` : "/ month",
      bill: plan.perSeat
        ? `${money(plan.yearly * seats)} billed yearly · ${money(plan.yearly)} per user`
        : `${money(plan.yearly)} billed yearly`,
      savings: plan.perSeat
        ? `Save ${money(yearlySavings)} per user yearly`
        : `Save ${money(yearlySavings)} yearly`,
    };
  }

  return {
    amount: money(plan.monthly * (plan.perSeat ? seats : 1)),
    cadence: plan.perSeat ? `/ month for ${seats} seats` : "/ month",
    bill: plan.perSeat
      ? `${money(plan.monthly)} per user, billed monthly`
      : "Billed monthly",
    savings: null,
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
    >
      <span>{plan.cta}</span>
      <ArrowRight aria-hidden="true" size={16} />
    </a>
  );
}

function PlanFinder({
  teamMode,
  onTeamModeChange,
  pace,
  onPaceChange,
  focus,
  onFocusChange,
  recommendation,
}) {
  const values = { teamMode, pace, focus };
  const setters = {
    teamMode: onTeamModeChange,
    pace: onPaceChange,
    focus: onFocusChange,
  };

  return (
    <section className={styles.finder} aria-labelledby="plan-finder-title">
      <div className={styles.finderIntro}>
        <p className={styles.phase}>Plan finder</p>
        <div className={styles.headingWithTip}>
          <h2 id="plan-finder-title">Find a sensible starting point.</h2>
          <DevTip label="About the plan finder">
            This guide only highlights an existing plan. Prices and checkout stay exactly the same.
          </DevTip>
        </div>
        <p>Three quick choices. No email required.</p>
      </div>

      <div className={styles.finderControls}>
        {finderGroups.map((group, index) => (
          <div className={styles.finderGroup} key={group.label}>
            <div className={styles.fieldLabel}>
              <span aria-hidden="true">0{index + 1}</span>
              <strong>{group.label}</strong>
              <DevTip label={`About ${group.label}`}>{group.help}</DevTip>
            </div>
            <div role="group" aria-label={group.label}>
              {group.options.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={values[group.stateKey] === value}
                  onClick={() => setters[group.stateKey](value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.finderResult} role="status" aria-live="polite">
        <Sparkles aria-hidden="true" size={17} />
        <span>Your match</span>
        <strong>{recommendation.name}</strong>
        <a href={`#plan-${recommendation.slug}`}>
          View plan <ArrowRight aria-hidden="true" size={14} />
        </a>
      </div>
    </section>
  );
}

function AccessRecord({
  plan,
  interval,
  seats,
  managePlan,
  onSeatsChange,
  recommended,
  index,
}) {
  const price = priceRecord(plan, interval, seats);
  const annualUnavailable =
    interval === "year" && plan.yearly == null && plan.id !== "FREE";

  return (
    <article
      className={styles.plan}
      data-plan={plan.id}
      data-recommended={recommended ? "true" : "false"}
      id={`plan-${plan.slug}`}
    >
      <header className={styles.planIdentity}>
        <div className={styles.planEyebrow}>
          <span>{String(index + 1).padStart(2, "0")}</span>
          <span>{recommended ? "Your finder match" : "Access tier"}</span>
        </div>
        <div className={styles.headingWithTip}>
          <h2>{plan.name}</h2>
          <DevTip label={`Who ${plan.name} is for`}>{plan.audience}</DevTip>
        </div>
        <p>{plan.audience}</p>
      </header>

      <div className={styles.price}>
        <div>
          <strong>{price.amount}</strong>
          <span>{price.cadence}</span>
        </div>
        <small>{price.bill}</small>
        {price.savings ? <em>{price.savings}</em> : null}
        {plan.id === "TEAM" ? (
          <div className={styles.seats}>
            <label htmlFor="team-seat-count">Seats</label>
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
            <span>2–50</span>
          </div>
        ) : null}
      </div>

      <ul className={styles.features}>
        {plan.features.map((feature, featureIndex) => (
          <li key={feature}>
            <Check aria-hidden="true" size={15} strokeWidth={2.2} />
            <strong>{featureLabels[plan.id][featureIndex]}</strong>
            <DevTip label={`About ${featureLabels[plan.id][featureIndex]}`}>
              {feature}
            </DevTip>
          </li>
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
  const [teamMode, setTeamMode] = useState("solo");
  const [pace, setPace] = useState("regular");
  const [focus, setFocus] = useState("agent");
  const recommendedPlanId =
    teamMode === "team"
      ? "TEAM"
      : pace === "explore"
        ? "FREE"
        : pace === "heavy"
          ? "PRO_PLUS"
          : focus === "scripts"
            ? "STARTER"
            : "PRO";
  const recommendation =
    publicPlanCatalog.find((plan) => plan.id === recommendedPlanId) ||
    publicPlanCatalog[0];

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
      <section className={styles.intro} aria-labelledby="pricing-title">
        <div className={styles.introLead}>
          <p className={styles.phase}>Plans and usage</p>
          <h1 id="pricing-title">Choose how long the build can run.</h1>
          <p>
            Start with a real project for free. Upgrade when you need more build
            capacity, longer history, or direct access to premium models.
          </p>
        </div>

        <div className={styles.introAssurance} aria-label="What every plan includes">
          <p>Every plan starts with</p>
          <ul>
            <li><Check aria-hidden="true" size={15} /> Project-first planning</li>
            <li><Check aria-hidden="true" size={15} /> Reviewed build steps</li>
            <li><Check aria-hidden="true" size={15} /> Studio-ready output</li>
          </ul>
          <small>No setup fee · Prices in USD · Secure checkout</small>
        </div>
      </section>

      <PlanFinder
        teamMode={teamMode}
        onTeamModeChange={setTeamMode}
        pace={pace}
        onPaceChange={setPace}
        focus={focus}
        onFocusChange={setFocus}
        recommendation={recommendation}
      />

      <section className={styles.catalog} aria-labelledby="catalog-title">
        <div className={styles.catalogBar}>
          <div>
            <p className={styles.phase}>All access tiers</p>
            <h2 id="catalog-title">Compare the plans.</h2>
          </div>
          <div className={styles.introCopy}>
            <div
              className={styles.interval}
              role="group"
              aria-label="Billing period"
            >
              <span>Billing</span>
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
                Yearly <small>save ~17%</small>
              </button>
            </div>
            <DevTip label="Billing details">
              Prices are in USD. Starter is available monthly only. Checkout confirms the amount and interval before purchase.
            </DevTip>
          </div>
        </div>

        <div className={styles.ledger} aria-label="NexusRBX access plans">
          <div className={styles.ledgerHead} aria-hidden="true">
            <span>Plan</span>
            <span>Price</span>
            <span>Included</span>
            <span>Continue</span>
          </div>
          {publicPlanCatalog.map((plan, index) => (
            <AccessRecord
              key={plan.id}
              plan={plan}
              interval={interval}
              seats={plan.id === "TEAM" ? seats : 1}
              managePlan={hasActiveSubscription}
              onSeatsChange={updateSeats}
              recommended={plan.id === recommendedPlanId}
              index={index}
            />
          ))}
        </div>
      </section>

      <section className={styles.comparison} aria-labelledby="comparison-title">
        <details>
          <summary>
            <span>
              <small className={styles.phase}>Compare plans</small>
              <strong id="comparison-title">What changes between plans</strong>
            </span>
            <span className={styles.summaryAction}>
              Open full comparison
              <ChevronDown aria-hidden="true" size={18} />
            </span>
          </summary>
          <div
            className={styles.tableWrap}
            role="region"
            aria-label="Plan comparison table"
            tabIndex="0"
          >
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
                    {comparisonFacts[plan.id].map((fact) => (
                      <td key={fact}>{fact}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>

      <section className={styles.billingNotes} aria-labelledby="billing-notes-title">
        <div>
          <p className={styles.phase}>Good to know</p>
          <h2 id="billing-notes-title">Clear before checkout.</h2>
        </div>
        <dl>
          <div>
            <dt>Yearly billing</dt>
            <dd>Monthly equivalents are shown above. The yearly total is charged at checkout.</dd>
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
