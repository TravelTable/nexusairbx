import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Gift, Zap, ShieldCheck, Save } from "lib/icons";
import { useNavigate, useLocation } from "react-router-dom";

export default function SignInNudgeModal({ isOpen, onClose, reason = "" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const aiFrom = location?.pathname === "/ai" ? location : { pathname: "/ai" };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto p-3 py-[max(0.75rem,env(safe-area-inset-top))] sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="signin-nudge-title"
          className="nexus-page-card relative w-full max-w-md max-h-[min(92svh,720px)] overflow-y-auto"
        >
          {/* Top Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-transparent via-[#9b5de5] to-transparent" />
          
          <button
            onClick={onClose}
            aria-label="Dismiss sign-in prompt"
            className="nexus-icon-button absolute top-3 right-3 rounded-full sm:top-4 sm:right-4"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="p-4 pt-12 text-center sm:p-8 sm:pt-10">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-[#9b5de5]/20 to-[#00f5d4]/20 border border-white/10 mb-4 sm:mb-6 sm:w-20 sm:h-20 sm:rounded-2xl relative">
              <div className="absolute inset-0 bg-[#9b5de5] blur-2xl opacity-20 animate-pulse" />
              <Gift className="w-7 h-7 text-[#00f5d4] relative z-10 sm:w-10 sm:h-10" />
            </div>

            <h2 id="signin-nudge-title" className="text-xl font-bold text-white mb-3 sm:text-2xl">
              Sign up to access <br />
              <span className="bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">
                tokens and features
              </span>
            </h2>

            <p className="text-gray-400 text-[15px] leading-relaxed mb-5 sm:mb-8">
              {reason || "Create a free account to keep this workspace, save generated scripts, export projects, and use Studio actions without repeating your prompt."}
            </p>

            <div className="space-y-3 mb-5 sm:space-y-4 sm:mb-8">
              <div className="flex items-center gap-3 text-left p-3 rounded-xl bg-white/5 border border-white/5">
                <div className="w-8 h-8 rounded-lg bg-[#9b5de5]/20 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-4 h-4 text-[#9b5de5]" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">20k Tokens Every Month</div>
                  <div className="text-xs text-gray-500">Refreshed automatically for free.</div>
                </div>
              </div>

              <div className="flex items-center gap-3 text-left p-3 rounded-xl bg-white/5 border border-white/5">
                <div className="w-8 h-8 rounded-lg bg-[#00f5d4]/20 flex items-center justify-center flex-shrink-0">
                  <Save className="w-4 h-4 text-[#00f5d4]" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">Resume this workspace</div>
                  <div className="text-xs text-gray-500">Your prompt and generated output stay visible after sign-in.</div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => navigate("/signup", { state: { from: aiFrom } })}
                className="focus-ring w-full min-h-11 py-3 sm:py-4 rounded-xl border border-[#00f5d4]/30 bg-[#00f5d4] text-black font-bold text-base sm:text-lg shadow-panel transition hover:bg-[#5fffee] active:bg-[#00d9bf]"
              >
                Sign Up
              </button>
              <button
                onClick={() => navigate("/signin", { state: { from: aiFrom } })}
                className="focus-ring w-full min-h-11 py-3 rounded-xl border border-white/10 bg-white/[0.03] text-gray-300 hover:bg-white/[0.07] hover:text-white hover:border-white/20 text-sm font-medium transition-colors"
              >
                Already have an account? Sign In
              </button>
              <button
                onClick={onClose}
                className="focus-ring w-full min-h-11 py-3 rounded-xl text-gray-500 hover:bg-white/5 hover:text-white text-sm font-medium transition-colors"
              >
                Maybe Later
              </button>
            </div>
          </div>

          {/* Bottom Decoration */}
          <div className="p-4 bg-white/5 border-t border-white/5 text-center">
            <div className="flex items-center justify-center gap-2 text-[11px] text-gray-500 uppercase tracking-widest">
              <ShieldCheck className="w-3 h-3" />
              Secure workspace handoff
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
