import React, { useState } from "react";
import { Crown, Check, ChevronRight, Users } from "lucide-react";
import { useBilling } from "../context/BillingContext";

export default function SubscribeTabContainer({ onSubscribe, isSubscribed: subscribedProp = false, className = "" }) {
  const { plan, entitlements = [] } = useBilling() || {};
  const subscribed = subscribedProp
    || ["PRO", "PRO_PLUS", "TEAM"].includes(plan)
    || entitlements.includes("subscriber");
  const [hovering, setHovering] = useState(false);
  const displayPlan = plan === "PRO_PLUS" ? "Pro+" : plan === "TEAM" ? "Team" : "Pro";

  return (
    <div className={`overflow-hidden rounded-lg border border-gray-800 bg-gray-900 shadow-md ${className}`}>
      <div className="relative p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center">
            <div className="mr-2 rounded-md bg-gradient-to-r from-purple-600 to-indigo-600 p-1.5">
              <Crown className="h-4 w-4 text-white" />
            </div>
            <h3 className="text-base font-bold text-white">{subscribed ? `${displayPlan} active` : "Upgrade NexusRBX"}</h3>
          </div>
          {!subscribed && <div className="flex items-baseline"><span className="text-lg font-bold text-white">$19.99</span><span className="ml-1 text-xs text-gray-400">/month</span></div>}
        </div>

        <div className="mb-4 space-y-2">
          {["Nexus Auto and model selection", "Higher Included Usage", "Premium Direct model support"].map((feature) => (
            <div key={feature} className="flex items-center gap-2"><Check className="h-4 w-4 flex-shrink-0 text-green-400" /><span className="text-sm text-gray-300">{feature}</span></div>
          ))}
        </div>

        {!subscribed ? (
          <button
            onClick={onSubscribe}
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
            className={`flex w-full items-center justify-center gap-1.5 rounded-md bg-gradient-to-r px-4 py-2 text-sm font-medium text-white transition-all duration-300 ${hovering ? "from-purple-600 to-indigo-600 shadow-md" : "from-purple-700 to-indigo-700"}`}
          >
            Compare plans <ChevronRight className={`h-4 w-4 transition-transform duration-300 ${hovering ? "translate-x-0.5" : ""}`} />
          </button>
        ) : (
          <div className="space-y-3">
            <div className="rounded-md border border-green-800 bg-green-900/20 p-2 text-center"><span className="flex items-center justify-center gap-1.5 text-sm font-medium text-green-400"><Check className="h-4 w-4" /> Active subscription</span></div>
            {plan !== "TEAM" && <button onClick={onSubscribe} className="flex w-full items-center justify-center gap-2 py-2 text-xs font-bold text-gray-500 hover:text-white"><Users className="h-3 w-3" /> Explore Pro+ and Team</button>}
          </div>
        )}

        <p className="mt-3 text-center text-xs text-gray-500">Cancel anytime. Terms apply.</p>
      </div>
    </div>
  );
}
