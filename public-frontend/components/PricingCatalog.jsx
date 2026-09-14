"use client";

import FinancialPlans from "../../src/components/billing/FinancialPlans";
import styles from "../../src/components/billing/FinancialPlans.module.css";
import catalog from "../../src/data/billingCatalog.v2.json";

const plan = Object.fromEntries(catalog.plans.map((entry) => [entry.id, entry]));

const noCap = (value) => (value == null ? "No plan cap" : String(value));
const hasTopUps = (entry) => entry.features.some((feature) => /add credits/i.test(feature));

const comparisonRows = [
  ["Monthly credits", String(plan.STARTER.credits), String(plan.PRO.credits)],
  ["Active projects", noCap(plan.STARTER.limits.maxProjects), noCap(plan.PRO.limits.maxProjects)],
  ["Builds at once", noCap(plan.STARTER.limits.concurrentJobs), noCap(plan.PRO.limits.concurrentJobs)],
  ["Usage history", `${plan.STARTER.limits.usageHistoryDays} days`, `${plan.PRO.limits.usageHistoryDays} days`],
  ["Credit top-ups", hasTopUps(plan.STARTER) ? "Available" : "Not listed", hasTopUps(plan.PRO) ? "Available" : "Not listed"],
  ["Billing", "Monthly only", `${plan.PRO.monthly}/mo or ${plan.PRO.yearly}/yr`],
];

const differentiators = [
  {
    number: "01",
    title: "Project-aware work",
    description: "Nexus keeps requests grounded in the Roblox project instead of treating every prompt like isolated code.",
  },
  {
    number: "02",
    title: "Review before Studio",
    description: "Generated work stays visible as a change set before you choose to apply it to Studio.",
  },
  {
    number: "03",
    title: "Recovery stays attached",
    description: "Snapshots, source matches and restore paths stay with the build history instead of living in a separate tool.",
  },
  {
    number: "04",
    title: "UI and assets in the same workspace",
    description: "Scripts, interfaces and project media can be handled as parts of the same Roblox build workflow.",
  },
];

function WorkflowPreview() {
  return (
    <div
      className={styles.workflowPanel}
      role="img"
      aria-label="Example Nexus workflow from a project request through review and approved Studio application"
    >
      <div className={styles.workflowChrome} aria-hidden="true">
        <div className={styles.windowDots}>
          <i />
          <i />
          <i />
        </div>
        <span>Nexus build review</span>
        <span>Studio connected</span>
      </div>

      <div className={styles.workflowBody} aria-hidden="true">
        <div className={styles.workflowRequest}>
          <span>REQUEST</span>
          <blockquote>
            Add a round system, keep the existing lobby, and show the timer in the current HUD.
          </blockquote>

          <div className={styles.workflowSteps}>
            {["Read project", "Plan changes", "Generate", "Review"].map((step, index) => (
              <div className={styles.workflowStep} key={step}>
                <b>{index + 1}</b>
                {step}
              </div>
            ))}
          </div>
        </div>

        <div className={styles.reviewPane}>
          <div className={styles.reviewHeader}>
            <span>PROPOSED CHANGES</span>
            <strong>Ready for review</strong>
          </div>

          <div className={styles.changeList}>
            <div className={styles.changeRow}>
              <span className={styles.changeType}>+</span>
              <code>ServerScriptService/RoundService</code>
              <small>ModuleScript</small>
            </div>
            <div className={styles.changeRow}>
              <span className={styles.changeType}>~</span>
              <code>StarterGui/HUD/TimerController</code>
              <small>LocalScript</small>
            </div>
            <div className={styles.changeRow}>
              <span className={styles.changeType}>+</span>
              <code>ReplicatedStorage/Remotes/RoundState</code>
              <small>RemoteEvent</small>
            </div>
          </div>

          <div className={styles.workflowFooter}>
            <span>3 scoped changes · snapshot ready</span>
            <strong>Apply to Studio</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PricingCatalog() {
  return (
    <main id="main-content">
      <FinancialPlans />

      <section className={styles.catalogSection} aria-labelledby="workflow-value-title">
        <div className={styles.catalogHeading}>
          <span>WHAT YOU ARE PAYING FOR</span>
          <h2 id="workflow-value-title">The workflow stays visible from request to Studio.</h2>
          <p>
            Pricing should make sense in the context of the product. Nexus is not selling a message count; it is
            selling a project-aware build, review and recovery loop for Roblox work.
          </p>
        </div>

        <WorkflowPreview />

        <div className={styles.catalogHeading} style={{ marginTop: "clamp(4rem, 7vw, 6rem)" }}>
          <span>STARTER VS PRO</span>
          <h2>Choose based on how much room you need.</h2>
          <p>
            The core workflow is shared. The meaningful differences are build capacity, history and how much AI usage
            is included each month.
          </p>
        </div>

        <div className={styles.decisionGrid} role="region" aria-label="Starter and Pro decision comparison">
          <div className={`${styles.decisionCell} ${styles.decisionHeader}`}>Difference</div>
          <div className={`${styles.decisionCell} ${styles.decisionHeader}`}>Starter</div>
          <div className={`${styles.decisionCell} ${styles.decisionHeader}`} data-pro="true">Pro</div>

          {comparisonRows.map(([label, starter, pro]) => (
            <div key={label} style={{ display: "contents" }}>
              <div className={`${styles.decisionCell} ${styles.decisionLabel}`}>{label}</div>
              <div className={styles.decisionCell}>{starter}</div>
              <div className={styles.decisionCell}>{pro}</div>
            </div>
          ))}
        </div>

        <div className={styles.differentiators}>
          <div className={styles.catalogHeading}>
            <span>WHY NEXUS</span>
            <h2>More than a generic code box.</h2>
            <p>
              The difference is the Roblox-specific workflow around the model: project context, visible changes,
              Studio application and a recovery path.
            </p>
          </div>

          <div className={styles.differentiatorGrid}>
            {differentiators.map((item) => (
              <article className={styles.differentiatorCard} key={item.number}>
                <span>{item.number}</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </div>

        <div className={styles.billingInfo}>
          <div>
            <h2>Keep control of your subscription.</h2>
            <p>
              Cancel in billing settings and retain paid access through the end of your paid period. Annual Pro
              charges the full yearly amount upfront and refreshes included credits monthly. Starter is monthly only.
            </p>
            <p>
              Pro+ and older subscriptions remain grandfathered. Your billing page shows the allowance attached to
              your existing subscription.
            </p>
          </div>
          <a href="/billing">Open billing</a>
        </div>
      </section>
    </main>
  );
}
