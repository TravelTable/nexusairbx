import React from "react";
import { AlertCircle, Coins, Wallet } from "lucide-react";
import { useBilling } from "../context/BillingContext";

function formatMoney(micros) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(Math.max(0, Number(micros || 0)) / 1_000_000);
}

function UsagePill({ icon: Icon, label, value, warning = false, variant = "default" }) {
  const header = variant === "header";
  return (
    <div className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${warning ? "border-amber-500/30 bg-amber-500/10" : "border-white/10 bg-white/5"}`}>
      <Icon className={`${header ? "h-3.5 w-3.5" : "h-4 w-4"} ${warning ? "text-amber-300" : "text-[#00f5d4]"}`} />
      <span className={`${header ? "text-[10px]" : "text-xs"} font-bold uppercase tracking-wider text-gray-500`}>{label}</span>
      <span className={`${header ? "text-xs" : "text-sm"} font-mono font-bold ${warning ? "text-amber-200" : "text-white"}`}>{value}</span>
      {warning && <AlertCircle className="h-3 w-3 text-amber-300" />}
    </div>
  );
}

export default function TokensCounterContainer({
  tokens = 0,
  maxTokens = null,
  isLoading = false,
  className = "",
  variant = "default",
  flags = null,
}) {
  const billing = useBilling() || {};
  const included = billing.includedUsage;
  const premium = billing.premiumBalance;
  const unlimited = Boolean(flags?.unlimitedTokens || billing.unlimitedTokens);

  if (isLoading || billing.loading) {
    return <div className={`h-7 w-28 animate-pulse rounded-full bg-white/10 ${className}`} />;
  }

  if (unlimited) {
    return <div className={className}><UsagePill icon={Coins} label={billing.devOverride ? "Dev" : "Usage"} value="Unlimited" variant={variant} /></div>;
  }

  if (included) {
    const percentRemaining = Math.max(0, Math.min(100, Number(included.percentRemaining ?? (100 - Number(included.percentUsed || 0)))));
    const balanceMicros = Math.max(0, Number(premium?.balanceMicros || 0));
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <UsagePill icon={Coins} label="Included" value={`${percentRemaining}% left`} warning={percentRemaining <= 10} variant={variant} />
        {balanceMicros > 0 && <UsagePill icon={Wallet} label="Premium" value={formatMoney(balanceMicros)} variant={variant} />}
      </div>
    );
  }

  const remaining = typeof tokens === "object"
    ? Number(tokens?.sub?.remaining || 0) + Number(tokens?.payg?.remaining || 0)
    : Number(tokens || 0);
  const limit = typeof tokens === "object" ? Number(tokens?.sub?.limit || 0) : Number(maxTokens || 0);
  const percentRemaining = limit > 0 ? Math.max(0, Math.min(100, Math.round((remaining / limit) * 100))) : 100;
  return <div className={className}><UsagePill icon={Coins} label="Usage" value={`${percentRemaining}% left`} variant={variant} /></div>;
}
