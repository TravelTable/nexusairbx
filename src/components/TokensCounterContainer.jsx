import React, { useState, useEffect, useRef } from "react";
import { Coins, AlertCircle, RefreshCw } from "lucide-react";

// Container component for business logic
/**
 * Supports showing both subscription and PAYG tokens if passed as an object:
 *   tokens={{ sub: { remaining, limit }, payg: { remaining } }}
 * Or as a single number for legacy usage.
 */
export default function TokensCounterContainer({
  tokens = 0,
  maxTokens = null,
  isLoading = false,
  onRefresh = null,
  showRefreshButton = false,
  lowTokenThreshold = 100,
  className = "",
  variant = "default"
}) {
  // If tokens is an object with sub/payg, render both counters
  if (
    tokens &&
    typeof tokens === "object" &&
    (tokens.sub || tokens.payg)
  ) {
    const containerClasses = variant === "header" 
      ? `flex items-center gap-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full px-1 py-1 ${className}`
      : `flex flex-col gap-1 ${className}`;

    return (
      <div className={containerClasses}>
        {tokens.sub && (
          <SingleTokenCounter
            label="Subscription"
            tokens={tokens.sub.remaining}
            maxTokens={tokens.sub.limit}
            isLoading={isLoading}
            onRefresh={onRefresh}
            showRefreshButton={showRefreshButton}
            lowTokenThreshold={lowTokenThreshold}
            variant={variant}
          />
        )}
        {tokens.payg && (
          <SingleTokenCounter
            label="PAYG"
            tokens={tokens.payg.remaining}
            maxTokens={null}
            isLoading={isLoading}
            onRefresh={onRefresh}
            showRefreshButton={showRefreshButton}
            lowTokenThreshold={lowTokenThreshold}
            variant={variant}
          />
        )}
      </div>
    );
  }

  // Legacy: single counter
  return (
    <SingleTokenCounter
      tokens={tokens}
      maxTokens={maxTokens}
      isLoading={isLoading}
      onRefresh={onRefresh}
      showRefreshButton={showRefreshButton}
      lowTokenThreshold={lowTokenThreshold}
      className={className}
    />
  );
}

// SingleTokenCounter is the old TokensCounterUI, with optional label
function SingleTokenCounter({
  tokens = 0,
  maxTokens = null,
  isLoading = false,
  onRefresh = null,
  showRefreshButton = false,
  lowTokenThreshold = 100,
  className = "",
  label = null,
  variant = "default"
}) {
  const [isAnimating, setIsAnimating] = useState(false);
  const prevTokensRef = useRef(tokens);

  useEffect(() => {
    if (tokens !== prevTokensRef.current) {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 1000);
      prevTokensRef.current = tokens;
      return () => clearTimeout(timer);
    }
  }, [tokens]);

  const handleRefresh = () => {
    if (typeof onRefresh === "function") {
      onRefresh();
    }
  };

  const isLowTokens =
    (maxTokens !== null && tokens <= lowTokenThreshold) ||
    (maxTokens === null && tokens <= lowTokenThreshold);

  // Format large numbers with commas
  const formatNumber = (num) => {
    if (typeof num !== "number" || isNaN(num)) return "0";
    return num.toLocaleString();
  };

  const isHeader = variant === "header";

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <div className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 transition-all duration-300 ${
        isHeader 
          ? `bg-transparent border-none ${isLowTokens ? "bg-amber-500/10" : ""}`
          : `bg-gray-800 border ${isLowTokens ? "border-amber-700/50" : "border-gray-700"}`
      }`}>
        <div className={`relative ${isAnimating ? "animate-bounce" : ""}`}>
          <Coins 
            className={`${isHeader ? "h-3.5 w-3.5" : "h-4 w-4"} text-yellow-300 drop-shadow-sm`} 
            style={{
              filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.3))",
              color: "#fcd34d"
            }}
          />
          <div 
            className="absolute inset-0 rounded-full opacity-30 pointer-events-none"
            style={{
              background: "radial-gradient(circle, rgba(252,211,77,0.4) 0%, rgba(252,211,77,0) 70%)",
              filter: "blur(1px)"
            }}
          ></div>
        </div>
        <div className="flex items-baseline">
          {label && (
            <span className={`font-medium text-white mr-1 ${isHeader ? "text-[10px] uppercase tracking-wider opacity-60" : "text-xs"}`}>
              {label}:
            </span>
          )}
          {isLoading ? (
            <div className="w-10 h-4 bg-gray-700 animate-pulse rounded"></div>
          ) : (
            <span className={`font-mono ${isHeader ? "text-xs" : "text-sm"} ${
              isAnimating ? "text-green-400" : isLowTokens ? "text-amber-400" : "text-gray-200"
            } transition-colors duration-300`}>
              {formatNumber(tokens)}
              {maxTokens !== null && (
                <span className="text-gray-400 text-[10px] ml-0.5">/{formatNumber(maxTokens)}</span>
              )}
            </span>
          )}
        </div>
        {isLowTokens && (
          <AlertCircle className={`${isHeader ? "h-3 w-3" : "h-3.5 w-3.5"} text-amber-400 ml-1`} />
        )}
      </div>
      {showRefreshButton && (
        <button 
          onClick={handleRefresh}
          className="p-1 rounded-md hover:bg-gray-700 transition-colors focus:outline-none focus:ring-1 focus:ring-gray-500 ml-1"
          title="Refresh token count"
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 text-gray-400 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      )}
    </div>
  );
}
