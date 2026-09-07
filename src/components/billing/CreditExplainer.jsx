"use client";
import { useState } from "react";
import { trackProductEvent } from "../../lib/productAnalytics";
import styles from "./FinancialPlans.module.css";
export default function CreditExplainer() {
  const [mode, setMode] = useState("auto");
  return <details className={styles.explainer} onToggle={e => {
    if (e.currentTarget.open) void trackProductEvent("credit_explainer_opened", {});
  }}>
    <summary>How far do Nexus Credits go?</summary>
    <p>Credits measure AI usage, not messages. Request size, project context, output length, and model choice all affect the charge.</p>
    <div className={styles.cycleToggle} role="group" aria-label="Compare model approaches">
      <button type="button" aria-pressed={mode === "auto"} onClick={() => setMode("auto")}>Nexus Auto</button>
      <button type="button" aria-pressed={mode === "premium"} onClick={() => setMode("premium")}>Premium direct</button>
    </div>
    <p aria-live="polite">{mode === "auto"
      ? "Recommended · Auto uses cost-aware routing to stretch your credits. Focused tasks can use efficient models."
      : "Premium · Choose a model directly when its capabilities matter. Expensive models use the same credit balance faster."}</p>
    <p>No fixed message count is promised. Included credits are used first and refresh monthly without rollover. Purchased credits do not expire and cannot be redeemed for cash.</p>
  </details>;
}
