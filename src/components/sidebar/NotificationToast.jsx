import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Bell } from "lucide-react";

export default function NotificationToast({ open, message, cta, onCta, onClose }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 50, x: "-50%", scale: 0.9 }}
          animate={{ opacity: 1, y: 0, x: "-50%", scale: 1 }}
          exit={{ opacity: 0, y: 20, x: "-50%", scale: 0.9 }}
          className="fixed bottom-8 left-1/2 z-[100] min-w-[320px] max-w-[90vw]"
        >
          <div className="bg-[#0b1220]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center gap-4 relative overflow-hidden group">
            {/* Animated background glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#9b5de5]/10 to-[#00f5d4]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#9b5de5] to-[#00f5d4] flex items-center justify-center flex-shrink-0 shadow-lg">
              <Bell className="w-5 h-5 text-black" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white leading-tight">{message}</p>
              {cta && (
                <button
                  className="mt-2 text-xs font-bold text-[#00f5d4] hover:text-white transition-colors flex items-center gap-1"
                  onClick={onCta}
                >
                  <Sparkles className="w-3 h-3" />
                  {cta}
                </button>
              )}
            </div>

            <button
              className="p-2 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition-colors"
              onClick={onClose}
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
