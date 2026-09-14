"use client";

import { useState } from "react";
import catalog from "../../data/billingCatalog.v2.json";
import { trackProductEvent } from "../../lib/productAnalytics";
import styles from "./FinancialPlans.module.css";

const plans = Object.fromEntries(catalog.plans.map((plan) => [plan.id, plan]));
const maxCredits = Math.max(plans.STARTER.credits, plans.PRO.credits);

export default function CreditExplainer() {
  const [mode, setMode] = useState("auto");

  return (
    <details
      className={styles.explainer}
      onToggle={(event) => {
        if (event.currentTarget.open) {
          void trackProductEvent("credit_explainer_opened", {});
        }
      }}
    >
      <summary>How far do Nexus Credits go?</summary>

      <div className={styles.explainerBody}>
        <p>
          Credits meter AI usage rather than messages. Request size, project context, output length and model choice
          all affect the charge, so Nexus does not promise a fixed number of generations.
        </p>

        <div className={styles.creditCompare} aria-label="Monthly credit allowances">
          {[plans.STARTER, plans.PRO].map((plan) => (
            <div className={styles.creditRow} key={plan.id}>
              <strong>{plan.name}</strong>
              <div className={styles.creditBar} aria-hidden="true">
                <span style={{ "--credit-width": `${(plan.credits / maxCredits) * 100}%` }} />
              </div>
              <span>{plan.credits} credits</span>
            </div>
          ))}
        </div>

        <div className={styles.cycleToggle} role="group" aria-label="Compare model approaches">
          <button
            type="button"
            aria-pressed={mode === "auto"}
            onClick={() => setMode("auto")}
          >
            Nexus Auto
          </button>
          <button
            type="button"
            aria-pressed={mode === "premium"}
            onClick={() => setMode("premium")}
          >
            Premium direct
          </button>
        </div>

        <p aria-live="polite">
          {mode === "auto"
            ? "Recommended: Nexus Auto uses cost-aware routing so focused work can use efficient models when appropriate."
            : "Direct model choice uses the same credit balance. More expensive models consume that balance faster."}
        </p>

        <p>
          Included credits refresh monthly and do not roll over. Purchased credits do not expire. Add task-level
          examples here only after production telemetry gives you defensible ranges.
        </p>
      </div>
    </details>
  );
}
