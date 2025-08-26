import React, { useState } from "react";
import { Crown, Check, ChevronRight } from "lucide-react";

// Container component for business logic
export default function SubscribeTabContainer({
  onSubscribe,
  isSubscribed = false,
  className = ""
}) {
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
      className={`bg-gray-900 rounded-lg shadow-md border border-gray-800 overflow-hidden ${className}`}
    >
      <div className="p-4 relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-1.5 rounded-md mr-2">
              <Crown className="h-4 w-4 text-white" />
            </div>
            <h3 className="text-base font-bold text-white">Premium Features</h3>
          </div>
          <div className="flex items-baseline">
            <span className="text-lg font-bold text-white">$14.99</span>
            <span className="text-gray-400 text-xs ml-1">/month</span>
          </div>
        </div>

        {/* Features list - compact version */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-400 flex-shrink-0" />
            <span className="text-gray-300 text-sm">Advanced AI script generation</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-400 flex-shrink-0" />
            <span className="text-gray-300 text-sm">Unlimited script generations</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-400 flex-shrink-0" />
            <span className="text-gray-300 text-sm">Priority support & early access</span>
          </div>
        </div>

        {/* Subscribe button */}
        {!isSubscribed ? (
          <button
            onClick={onSubscribe}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            className={`w-full py-2 px-4 rounded-md font-medium text-white flex items-center justify-center gap-1.5 transition-all duration-300 text-sm ${
              isHovering 
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 shadow-md" 
                : "bg-gradient-to-r from-purple-700 to-indigo-700"
            }`}
          >
            <span>Subscribe for Premium</span>
            <ChevronRight className={`h-4 w-4 transition-transform duration-300 ${isHovering ? 'translate-x-0.5' : ''}`} />
          </button>
        ) : (
          <div className="bg-green-900/20 border border-green-800 rounded-md p-2 text-center">
            <span className="text-green-400 text-sm font-medium flex items-center justify-center gap-1.5">
              <Check className="h-4 w-4" />
              You're subscribed to Premium
            </span>
          </div>
        )}

        {/* Terms - smaller text */}
        <p className="text-gray-500 text-xs text-center mt-3">
          Cancel anytime. <a href="#" className="text-indigo-400 hover:underline">Terms apply</a>.
        </p>
      </div>
    </div>
  );
}