import React from "react";
import { motion } from "framer-motion";
import { Loader, Circle } from "lucide-react";
export default function TokenBar({
  tokensLeft,
  plan,
  resetsAt,
  isDev,
  tokenLimit,
  tokensLoading,
}) {
  // Determine if the plan is unlimited (e.g., Team or Developer)
  const isUnlimited =
    isDev || plan?.toLowerCase() === "team" || plan?.toLowerCase() === "unlimited";

  // Format reset date if available
  const getResetLabel = () => {
    if (isUnlimited) return "Unlimited";
    if (!resetsAt) return null;
    const date = new Date(resetsAt);
    const now = new Date();
    // If resetsAt is today, show "today at HH:MM"
    if (
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    ) {
      return `Resets today at ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    }
    // Otherwise, show full date
    return `Resets on ${date.toLocaleDateString([], { month: "short", day: "numeric" })} at ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  };

  // Use tokenLimit from billing, fallback to 4 if not provided
  const displayTokenLimit = isUnlimited ? 4 : tokenLimit || 4;

  // Use tokensLeft prop instead of tokens from billing
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-400 mr-2">Tokens:</span>
      {isUnlimited ? (
        <span className="text-green-400 font-bold">∞ {isDev ? "(Developer)" : "(Unlimited)"}</span>
      ) : (
        <div className="flex items-center gap-1">
          {[...Array(displayTokenLimit)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0.7, opacity: 0.4 }}
              animate={{
                scale: tokensLeft > i ? 1 : 0.7,
                opacity: tokensLeft > i ? 1 : 0.4,
                y: tokensLeft > i ? 0 : 2,
              }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
            >
              <Circle
                className={`w-4 h-4 ${
                  tokensLeft > i
                    ? "text-[#00f5d4] drop-shadow-[0_0_4px_#00f5d4]"
                    : "text-gray-700"
                }`}
                fill={tokensLeft > i ? "#00f5d4" : "none"}
                strokeWidth={tokensLeft > i ? 0 : 1.5}
              />
            </motion.div>
          ))}
        </div>
      )}
      {tokensLoading && (
        <Loader className="inline ml-2 h-4 w-4 animate-spin text-[#9b5de5]" />
      )}
      <span className="ml-2 text-xs text-gray-400">
        {getResetLabel()}
      </span>
    </div>
  );
}