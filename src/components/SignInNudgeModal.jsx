import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Gift, Zap, ShieldCheck, Save } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

export default function SignInNudgeModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-md bg-[#0f1117] border border-white/10 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(155,93,229,0.2)]"
        >
          {/* Top Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-transparent via-[#9b5de5] to-transparent" />
          
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="p-8 pt-10 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-[#9b5de5]/20 to-[#00f5d4]/20 border border-white/10 mb-6 relative">
              <div className="absolute inset-0 bg-[#9b5de5] blur-2xl opacity-20 animate-pulse" />
              <Gift className="w-10 h-10 text-[#00f5d4] relative z-10" />
            </div>

            <h2 className="text-2xl font-bold text-white mb-3">
              Claim Your 50,000 <br />
              <span className="bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">
                Free Monthly Tokens
              </span>
            </h2>

            <p className="text-gray-400 text-[15px] leading-relaxed mb-8">
              Sign in to NexusRBX to unlock your monthly allowance. Save your projects, track usage, and build amazing Roblox UIs.
            </p>

            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-3 text-left p-3 rounded-xl bg-white/5 border border-white/5">
                <div className="w-8 h-8 rounded-lg bg-[#9b5de5]/20 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-4 h-4 text-[#9b5de5]" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">50k Tokens Every Month</div>
                  <div className="text-xs text-gray-500">Refreshed automatically for free.</div>
                </div>
              </div>

              <div className="flex items-center gap-3 text-left p-3 rounded-xl bg-white/5 border border-white/5">
                <div className="w-8 h-8 rounded-lg bg-[#00f5d4]/20 flex items-center justify-center flex-shrink-0">
                  <Save className="w-4 h-4 text-[#00f5d4]" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">Cloud Project Saving</div>
                  <div className="text-xs text-gray-500">Never lose your generated UIs.</div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => navigate("/signin", { state: { from: location } })}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-white font-bold text-lg shadow-[0_0_20px_rgba(155,93,229,0.3)] hover:shadow-[0_0_30px_rgba(155,93,229,0.5)] transition-all active:scale-[0.98]"
              >
                Sign In to Claim
              </button>
              <button
                onClick={onClose}
                className="w-full py-3 rounded-2xl text-gray-500 hover:text-white text-sm font-medium transition-colors"
              >
                Maybe Later
              </button>
            </div>
          </div>

          {/* Bottom Decoration */}
          <div className="p-4 bg-white/5 border-t border-white/5 text-center">
            <div className="flex items-center justify-center gap-2 text-[11px] text-gray-500 uppercase tracking-widest">
              <ShieldCheck className="w-3 h-3" />
              Secure & Free Forever
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
