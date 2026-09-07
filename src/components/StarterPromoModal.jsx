import React from "react";
import Modal from "./Modal";
import { getPublicPlan, formatMoney } from "../lib/planCatalog";
// Compatibility name for existing workspace triggers; Starter is no longer purchasable.
export default function StarterPromoModal({isOpen,onClose,onDismiss,onDismissLong}) {
  const plan=getPublicPlan("PRO");
  return <Modal isOpen={isOpen} onClose={onClose} title="More room to build with Pro" panelClassName="max-w-lg" closeButtonClassName="right-4 top-4 h-11 w-11">
    <div className="space-y-5 p-6">
      <p className="text-3xl font-semibold">{formatMoney(plan.monthly)}<span className="text-sm"> / month</span></p>
      <p>{plan.credits} Nexus Credits monthly. Nexus Auto stretches your allowance; premium direct models use it faster.</p>
      <p>Reviewable Studio changes, model choice, and non-expiring optional credit packs.</p>
      <a className="nexus-button inline-flex min-h-11 items-center" href="/subscribe?plan=PRO&interval=month">Review Pro</a>
      <p className="text-sm">USD, plus applicable tax. No paid trial—start with Free.</p>
      <div className="flex flex-wrap gap-4">
        <button type="button" className="min-h-11" onClick={onDismiss || onClose}>Continue with Free</button>
        {onDismissLong&&<button type="button" className="min-h-11" onClick={onDismissLong}>Hide this suggestion</button>}
      </div>
    </div>
  </Modal>;
}
