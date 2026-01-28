import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, ShieldCheck, Bookmark, Download, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ProNudgeModal({ isOpen, onClose, reason = "this icon" }) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-md bg-[#0f1117] border border-[#9b5de5]/30 rounded-[32px] overflow-hidden shadow-[0_0_50px_rgba(155,93,229,0.3)]"
        >
          {/* Top Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1.5 bg-gradient-to-r from-transparent via-[#9b5de5] to-transparent" />
          
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/5 text-gray-400 hover:text-white transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="p-8 pt-12 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-[#9b5de5] to-[#00f5d4] p-0.5 mb-6 relative group">
              <div className="absolute inset-0 bg-[#9b5de5] blur-2xl opacity-40 group-hover:opacity-60 transition-opacity" />
              <div className="w-full h-full rounded-[22px] bg-[#0f1117] flex items-center justify-center relative z-10">
                <Zap className="w-10 h-10 text-[#00f5d4]" />
              </div>
            </div>

            <h2 className="text-3xl font-black text-white mb-3 tracking-tight">
              Unlock <span className="text-[#9b5de5]">Pro</span> Access
            </h2>

            <p className="text-gray-400 text-[15px] leading-relaxed mb-8">
              To download or export <span className="text-white font-bold">{reason}</span>, you'll need a Pro subscription. Join thousands of top Roblox developers today.
            </p>

            <div className="space-y-3 mb-8">
              <BenefitItem 
                icon={Bookmark} 
                title="Saved Scripts Library" 
                desc="Save and organize your AI-generated code snippets."
                color="text-[#9b5de5]"
              />
              <BenefitItem 
                icon={ExternalLink} 
                title="One-Click Studio Export" 
                desc="Instant Luau snippets for your game."
                color="text-[#00f5d4]"
              />
              <BenefitItem 
                icon={Download} 
                title="High-Res Downloads" 
                desc="Get 512x512 PNGs with perfect transparency."
                color="text-blue-400"
              />
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => navigate("/subscribe")}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-white font-black text-lg shadow-[0_0_30px_rgba(155,93,229,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Upgrade to Pro
              </button>
              <button
                onClick={onClose}
                className="w-full py-3 rounded-2xl text-gray-500 hover:text-white text-sm font-bold transition-colors"
              >
                Maybe Later
              </button>
            </div>
          </div>

          {/* Bottom Decoration */}
          <div className="p-4 bg-white/[0.02] border-t border-white/5 text-center">
            <div className="flex items-center justify-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest">
              <ShieldCheck className="w-3 h-3" />
              Cancel Anytime • Instant Access
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function BenefitItem({ icon: Icon, title, desc, color }) {
  return (
    <div className="flex items-center gap-4 text-left p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-colors">
      <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div>
        <div className="text-sm font-bold text-white">{title}</div>
        <div className="text-[11px] text-gray-500 leading-tight">{desc}</div>
      </div>
    </div>
  );
}
