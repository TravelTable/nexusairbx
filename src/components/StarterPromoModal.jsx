import React from "react";
import Modal from "./Modal";
import { getPublicPlan, formatMoney } from "../lib/planCatalog";

// Compatibility name for existing workspace triggers; Starter is no longer purchasable.
export default function StarterPromoModal({ isOpen, onClose, onDismiss, onDismissLong }) {
  const plan = getPublicPlan("PRO");
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Subscribe to start building"
      panelClassName="max-w-lg"
      closeButtonClassName="right-4 top-4 h-11 w-11"
    >
      <div className="space-y-5 p-6">
        <p className="text-3xl font-semibold">
          {formatMoney(plan.monthly)}
          <span className="text-sm"> / month</span>
        </p>
        <p>
          NexusRBX is paid only—no free trial or free usage. Pro includes {plan.credits} Nexus
          Credits each month, model choice, and reviewable Studio changes.
        </p>
        <p>Optional credit packs do not expire. Cancel anytime in billing settings.</p>
        <a
          className="nexus-button inline-flex min-h-11 items-center"
          href="/subscribe?plan=PRO&interval=month"
        >
          Get Pro
        </a>
        <p className="text-sm">
          USD, plus applicable tax.{" "}
          <a href="/pricing" className="underline">
            Compare plans
          </a>
        </p>
        <div className="flex flex-wrap gap-4">
          <button type="button" className="min-h-11" onClick={onDismiss || onClose}>
            Not now
          </button>
          {onDismissLong && (
            <button type="button" className="min-h-11" onClick={onDismissLong}>
              Hide this for a while
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
