"use client";
import { useEffect, useState } from "react";
import { SUBSCRIPTION_PLANS, formatMoney } from "../../lib/planCatalog";
import { trackProductEvent } from "../../lib/productAnalytics";
import CreditExplainer from "./CreditExplainer";
import styles from "./FinancialPlans.module.css";
export default function FinancialPlans({ compact = false }) {
  const [interval, setInterval] = useState("month");
  useEffect(() => {
    if (!compact) void trackProductEvent("pricing_viewed", { catalog_version: "v2" });
  }, [compact]);
  function select(value) {
    setInterval(value);
    void trackProductEvent("billing_period_selected", { billing_interval: value });
  }
  return <section className={styles.section} aria-label="NexusRBX plans">
    <header className={styles.heading}>
      <p className={styles.eyebrow}>Paid plans only</p>
      {compact ? <h2>Start at $2. Grow into Pro.</h2> : <h1>Choose the plan that fits your build.</h1>}
      <p>No free trial or free usage. Starter gets you building. Pro adds room. One credit system.</p>
    </header>
    <div className={styles.cycleToggle} role="group" aria-label="Billing period">
      <button type="button" aria-pressed={interval === "month"} onClick={() => select("month")}>Monthly</button>
      <button type="button" aria-pressed={interval === "year"} onClick={() => select("year")}>Annually · save 15%</button>
    </div>
    <div className={styles.cards}>
      {SUBSCRIPTION_PLANS.map(plan => {
        const annual = interval === "year" && plan.yearly != null;
        const amount = annual ? plan.yearly / 12 : plan.monthly;
        const href = "/subscribe?plan=" + plan.id + "&interval=" + interval;
        return <article className={styles.planCard} data-featured={plan.featured ? "true" : undefined} key={plan.id}>
          <div className={styles.cardHeading}><h2>{plan.name}</h2>{plan.featured && <span>Recommended</span>}</div>
          <p>{plan.audience}</p>
          <p className={styles.price}>{formatMoney(Math.round(amount*100)/100)}<small>{plan.perSeat ? "/seat/month" : "/month"}</small></p>
          <p className={styles.schedule}>{annual ? formatMoney(plan.yearly) + (plan.perSeat ? " per seat" : "") + " billed annually" : "Billed monthly"}</p>
          <p className={styles.allowance}>{plan.credits} Nexus Credits {plan.perSeat ? "per seat monthly, pooled" : "monthly"}</p>
          <ul>{plan.features.slice(1).map(feature => <li key={feature}>{feature}</li>)}</ul>
          {plan.id === "TEAM"
            ? <p className={styles.teamNote}>Coming soon. Team checkout opens after workspace and pooled billing verification.</p>
            : <a className={styles.action} href={href} onClick={() => void trackProductEvent("pricing_plan_selected", { subscription_plan: plan.id, billing_interval: interval })}>{plan.cta}</a>}
        </article>;
      })}
    </div>
    <p className={styles.note}>USD, plus applicable tax. No free trial—subscribe to start building.</p>
    <p className={styles.note}>Annual payment, monthly credits: paid allowances refresh every month on your subscription anniversary. Included credits do not roll over.</p>
    {!compact && <CreditExplainer />}
  </section>;
}
