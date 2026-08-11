import React, { useState, useEffect, useRef } from "react";
import { Coins, AlertCircle, RefreshCw } from "lib/icons";

// Container component for business logic
/**
 * Supports showing both subscription and prepaid usage if passed as an object:
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
  variant = "default",
  flags = null,
}) {
  const isUnlimited = Boolean(flags?.unlimitedTokens);

  if (isUnlimited) {
    const containerClasses = variant === "header"
      ? `flex items-center gap-2 bg-[var(--ds-fill-subtle)] backdrop-blur-sm border border-[var(--ds-border-subtle)] rounded-full px-1 py-1 ${className}`
      : `flex flex-col gap-1 ${className}`;

    return (
      <div className={containerClasses}>
        <SingleTokenCounter
          label={flags?.devOverride ? "Dev" : "Unlimited"}
          tokens={0}
          isLoading={isLoading}
          showRefreshButton={showRefreshButton}
          onRefresh={onRefresh}
          variant={variant}
          unlimited
        />
      </div>
    );
  }

  // If tokens is an object with sub/payg, render both counters.
  if (
    tokens &&
    typeof tokens === "object" &&
    (tokens.sub || tokens.payg)
  ) {
    const containerClasses = variant === "header" 
      ? `flex items-center gap-2 bg-[var(--ds-fill-subtle)] backdrop-blur-sm border border-[var(--ds-border-subtle)] rounded-full px-1 py-1 ${className}`
      : `flex flex-col gap-1 ${className}`;

    return (
      <div className={containerClasses}>
        {tokens.sub && (
          <SingleTokenCounter
            label="Included"
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
            label="Premium"
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
  variant = "default",
  unlimited = false,
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

  if (unlimited) {
    const isHeader = variant === "header";
    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        <div className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 transition-all duration-300 ${
          isHeader ? "bg-transparent border-none" : "bg-[var(--ds-surface-2)] border border-[var(--ds-border-subtle)]"
        }`}>
          <Coins
            className={`${isHeader ? "h-3.5 w-3.5" : "h-4 w-4"} text-accent drop-shadow-sm`}
            style={{
              filter: "drop-shadow(0 1px 1px color-mix(in srgb, var(--ds-text) 30%, transparent))",
              color: "var(--ds-accent)"
            }}
          />
          <div className="flex items-baseline">
            {label && (
              <span className={`font-medium text-[var(--ds-text)] mr-1 ${isHeader ? "text-[10px] uppercase tracking-wider opacity-60" : "text-xs"}`}>
                {label}:
              </span>
            )}
            {isLoading ? (
              <div className="w-10 h-4 bg-[var(--ds-fill-hover)] animate-pulse rounded"></div>
            ) : (
              <span className={`font-mono ${isHeader ? "text-xs" : "text-sm"} text-accent transition-colors duration-300`}>
                Unlimited
              </span>
            )}
          </div>
        </div>
        {showRefreshButton && (
          <button
            onClick={handleRefresh}
            className="p-1 rounded-md hover:bg-[var(--ds-fill-hover)] transition-colors focus:outline-none focus:ring-1 focus:ring-accent ml-1"
            title="Refresh token count"
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 text-[var(--ds-text-muted)] ${isLoading ? "animate-spin" : ""}`} />
          </button>
        )}
      </div>
    );
  }

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
          : `bg-[var(--ds-surface-2)] border ${isLowTokens ? "border-[var(--ds-warning-border)]" : "border-[var(--ds-border-subtle)]"}`
      }`}>
        <div className={`relative ${isAnimating ? "animate-bounce" : ""}`}>
          <Coins 
            className={`${isHeader ? "h-3.5 w-3.5" : "h-4 w-4"} text-[var(--ds-warning)] drop-shadow-sm`}
            style={{
              filter: "drop-shadow(0 1px 1px color-mix(in srgb, var(--ds-text) 30%, transparent))",
              color: "var(--ds-warning)"
            }}
          />
          <div 
            className="absolute inset-0 rounded-full opacity-30 pointer-events-none"
            style={{
              background: "radial-gradient(circle, color-mix(in srgb, var(--ds-warning) 40%, transparent) 0%, transparent 70%)",
              filter: "blur(1px)"
            }}
          ></div>
        </div>
        <div className="flex items-baseline">
          {label && (
            <span className={`font-medium text-[var(--ds-text)] mr-1 ${isHeader ? "text-[10px] uppercase tracking-wider opacity-60" : "text-xs"}`}>
              {label}:
            </span>
          )}
          {isLoading ? (
            <div className="w-10 h-4 bg-[var(--ds-fill-hover)] animate-pulse rounded"></div>
          ) : (
            <span className={`font-mono ${isHeader ? "text-xs" : "text-sm"} ${
              isAnimating ? "text-[var(--ds-success)]" : isLowTokens ? "text-[var(--ds-warning)]" : "text-[var(--ds-text-secondary)]"
            } transition-colors duration-300`}>
              {formatNumber(tokens)}
              {maxTokens !== null && (
                <span className="text-[var(--ds-text-muted)] text-[10px] ml-0.5">/{formatNumber(maxTokens)}</span>
              )}
            </span>
          )}
        </div>
        {isLowTokens && (
          <AlertCircle className={`${isHeader ? "h-3 w-3" : "h-3.5 w-3.5"} text-[var(--ds-warning)] ml-1`} />
        )}
      </div>
      {showRefreshButton && (
        <button 
          onClick={handleRefresh}
          className="p-1 rounded-md hover:bg-[var(--ds-fill-hover)] transition-colors focus:outline-none focus:ring-1 focus:ring-accent ml-1"
          title="Refresh token count"
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 text-[var(--ds-text-muted)] ${isLoading ? "animate-spin" : ""}`} />
        </button>
      )}
    </div>
  );
}
