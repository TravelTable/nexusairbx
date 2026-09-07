"use client";
import FinancialPlans from "../../src/components/billing/FinancialPlans";
import styles from "../../src/components/billing/FinancialPlans.module.css";
const groups = [
  ["Build", [["Project-aware builds", "Included", "Included", "Included"], ["Active projects", "1", "Multiple", "Shared workspace"]]],
  ["Models and Credits", [["Nexus Auto", "Included", "Included", "Included"], ["Monthly credits", "1.5 / rolling 30 days", "9", "15 per seat, pooled"], ["Direct model choice", "—", "Included", "Included"]]],
  ["Studio and Review", [["Review before applying", "Included", "Included", "Included"], ["Studio connection and recovery", "Included", "Included", "Included"]]],
  ["Collaboration", [["Workspace roles", "Personal", "Personal", "Owner / admin / member"], ["Paid seats", "—", "1", "2–50 · coming soon"]]],
];
export default function PricingCatalog() {
  return <main id="main-content">
    <FinancialPlans />
    <section className={styles.section} aria-labelledby="comparison-title">
      <h2 id="comparison-title">The details, before you decide.</h2>
      <div className={styles.comparison} role="region" aria-label="Plan comparison" tabIndex={0}>
        <table><thead><tr><th scope="col">Feature</th><th scope="col">Free</th><th scope="col">Pro</th><th scope="col">Team</th></tr></thead>
          {groups.map(([group, rows]) => <tbody key={group}>
            <tr><th colSpan={4} scope="rowgroup">{group}</th></tr>
            {rows.map(([label, ...values]) => <tr key={label}><th scope="row">{label}</th>{values.map((value, i) => <td key={i}>{value}</td>)}</tr>)}
          </tbody>)}
        </table>
      </div>
      <h2>Keep control of your subscription.</h2>
      <p>Cancel in billing settings and retain paid access through the end of your paid period. Annual plans charge the full yearly amount upfront and refresh credits monthly.</p>
      <p>Starter, Pro+, and older subscriptions remain grandfathered. <a href="/billing">Your billing page</a> shows your existing allowance.</p>
    </section>
  </main>;
}
