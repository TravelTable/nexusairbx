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
  className = ""
}) {
  // If tokens is an object with sub/payg, render both counters stacked
  if (
    tokens &&
    typeof tokens === "object" &&
    (tokens.sub || tokens.payg)
  ) {
    return (
      <div className={`flex flex-col gap-1 ${className}`}>
        {tokens.sub && (
          <SingleTokenCounter
            label="Subscription"
            tokens={tokens.sub.remaining}
            maxTokens={tokens.sub.limit}
            isLoading={isLoading}
            onRefresh={onRefresh}
            showRefreshButton={showRefreshButton}
            lowTokenThreshold={lowTokenThreshold}
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
  const tokenPercentage =
    maxTokens !== null && maxTokens > 0
      ? (tokens / maxTokens) * 100
      : null;

  // Format large numbers with commas
  const formatNumber = (num) => {
    if (typeof num !== "number" || isNaN(num)) return "0";
    return num.toLocaleString();
  };

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <div className={`flex items-center gap-1.5 bg-gray-800 rounded-md px-2.5 py-1 border ${
        isLowTokens ? "border-amber-700/50" : "border-gray-700"
      }`}>
        <div className={`relative ${isAnimating ? "animate-bounce" : ""}`}>
          <Coins 
            className="h-4 w-4 text-yellow-300 drop-shadow-sm" 
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
            <span className="font-medium text-xs text-white mr-1">{label}:</span>
          )}
          {isLoading ? (
            <div className="w-10 h-4 bg-gray-700 animate-pulse rounded"></div>
          ) : (
            <span className={`font-mono text-sm ${
              isAnimating ? "text-green-400" : isLowTokens ? "text-amber-400" : "text-gray-200"
            } transition-colors duration-300`}>
              {formatNumber(tokens)}
              {maxTokens !== null && (
                <span className="text-gray-400 text-xs ml-0.5">/{formatNumber(maxTokens)}</span>
              )}
            </span>
          )}
        </div>
        {isLowTokens && (
          <AlertCircle className="h-3.5 w-3.5 text-amber-400 ml-1" />
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