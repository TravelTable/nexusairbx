import React from "react";
import { motion } from "framer-motion";
import { Loader, Circle } from "lucide-react";

// Make sure TOKEN_LIMIT matches your main config
const TOKEN_LIMIT = 4;

export default function TokenBar({ tokens, tokensLoading, refreshCountdown, isDev }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-400 mr-2">Tokens:</span>
      {isDev ? (
        <span className="text-green-400 font-bold">∞ (Developer)</span>
      ) : (
        <div className="flex items-center gap-1">
          {[...Array(TOKEN_LIMIT)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0.7, opacity: 0.4 }}
              animate={{
                scale: tokens > i ? 1 : 0.7,
                opacity: tokens > i ? 1 : 0.4,
                y: tokens > i ? 0 : 2
              }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
            >
              <Circle
                className={`w-4 h-4 ${
                  tokens > i
                    ? "text-[#00f5d4] drop-shadow-[0_0_4px_#00f5d4]"
                    : "text-gray-700"
                }`}
                fill={tokens > i ? "#00f5d4" : "none"}
                strokeWidth={tokens > i ? 0 : 1.5}
              />
            </motion.div>
          ))}
        </div>
      )}
      {tokensLoading && (
        <Loader className="inline ml-2 h-4 w-4 animate-spin text-[#9b5de5]" />
      )}
      {!isDev && tokens !== null && tokens <= 0 && refreshCountdown && (
        <span className="ml-2 text-xs text-gray-400">
          Refresh in {refreshCountdown.hours}h {refreshCountdown.mins}m
        </span>
      )}
    </div>
  );
}