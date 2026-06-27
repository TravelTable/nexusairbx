import React, { useState } from "react";
import { Crown, Check, ChevronRight, Users } from "lucide-react";
import { useBilling } from "../context/BillingContext";
import { Button } from "./ui";

// Container component for business logic
export default function SubscribeTabContainer({
  onSubscribe,
  isSubscribed: isSubscribedProp = false,
  className = ""
}) {
  const { isPremium } = useBilling();
  const isSubscribed = isSubscribedProp || isPremium;
  const [isHovering, setIsHovering] = useState(false);

  const handleSubscribeClick = () => {
    if (typeof onSubscribe === "function") {
      onSubscribe();
    }
  };

  return (
    <SubscribeTabUI
      onSubscribe={handleSubscribeClick}
      isSubscribed={isSubscribed}
      isHovering={isHovering}
      setIsHovering={setIsHovering}
      className={className}
    />
  );
}

// UI component for presentation
function SubscribeTabUI({
  onSubscribe,
  isSubscribed,
  isHovering,
  setIsHovering,
  className
}) {
  return (
    <div 
      className={`nexus-page-card overflow-hidden ${className}`}
    >
      <div className="p-4 relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <div className="mr-2 rounded-lg border border-[#00f5d4]/20 bg-[#00f5d4]/10 p-1.5 text-[#00f5d4]">
              <Crown className="h-4 w-4" />
            </div>
            <h3 className="text-base font-bold text-white">
              {isSubscribed ? "Your Subscription" : "Premium Features"}
            </h3>
          </div>
          {!isSubscribed && (
            <div className="flex items-baseline">
              <span className="text-lg font-bold text-white">$14.99</span>
              <span className="text-gray-400 text-xs ml-1">/month</span>
            </div>
          )}
        </div>

        {/* Features list - compact version */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-400 flex-shrink-0" />
            <span className="text-gray-300 text-sm">Advanced AI script generation</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-400 flex-shrink-0" />
            <span className="text-gray-300 text-sm">High-limit script generations</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-400 flex-shrink-0" />
            <span className="text-gray-300 text-sm">Priority support & early access</span>
          </div>
        </div>

        {/* Subscribe button */}
        {!isSubscribed ? (
          <Button
            onClick={onSubscribe}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            className="w-full"
          >
            <span>Subscribe for Premium</span>
            <ChevronRight className={`h-4 w-4 transition-transform duration-300 ${isHovering ? 'translate-x-0.5' : ''}`} />
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg border border-emerald-400/25 bg-emerald-400/10 p-2 text-center">
              <span className="text-green-400 text-sm font-medium flex items-center justify-center gap-1.5">
                <Check className="h-4 w-4" />
                Active Subscription
              </span>
            </div>
            {/* Subtle Team Upgrade */}
            {isSubscribed && !className.includes("team") && (
              <Button
                onClick={onSubscribe}
                variant="subtle"
                size="sm"
                className="w-full"
              >
                <Users className="w-3 h-3" />
                Upgrade to Team
              </Button>
            )}
          </div>
        )}

        {/* Terms - smaller text */}
        <p className="text-gray-500 text-xs text-center mt-3">
          Cancel anytime. <span className="text-[#00f5d4] hover:underline cursor-pointer">Terms apply</span>.
        </p>
      </div>
    </div>
  );
}
