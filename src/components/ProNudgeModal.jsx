import React from "react";
import { X, Zap, ShieldCheck, Bookmark, Download, ExternalLink } from "lib/icons";
import { useNavigate } from "react-router-dom";
import Modal from "./Modal";

export default function ProNudgeModal({ isOpen, onClose, reason = "this icon" }) {
  const navigate = useNavigate();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Unlock Pro Access"
      titleClassName="sr-only"
      panelClassName="max-w-md overflow-hidden"
      bodyClassName=""
      overlayClassName="z-[110] bg-black/80 p-4 backdrop-blur-md"
      closeOnBackdrop
      showCloseButton={false}
    >
          {/* Top Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1.5 bg-gradient-to-r from-transparent via-[var(--ds-plan)] to-transparent" />
          
          <button
            onClick={onClose}
            aria-label="Close upgrade prompt"
            className="nexus-icon-button absolute top-6 right-6 rounded-full z-10"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="p-8 pt-12 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--ds-plan)] to-accent p-0.5 mb-6 relative group">
              <div className="absolute inset-0 bg-[var(--ds-plan)] blur-2xl opacity-30 group-hover:opacity-40 transition-opacity" />
              <div className="w-full h-full rounded-[22px] bg-[var(--ds-surface-1)] flex items-center justify-center relative z-10">
                <Zap className="w-10 h-10 text-accent" />
              </div>
            </div>

            <h2 className="text-3xl font-black text-[var(--ds-text)] mb-3 tracking-tight">
              Unlock <span className="text-[var(--ds-plan)]">Pro</span> Access
            </h2>

            <p className="text-[var(--ds-text-muted)] text-[15px] leading-relaxed mb-8">
              To download or export <span className="text-[var(--ds-text)] font-bold">{reason}</span>, you'll need a Pro subscription. Upgrade when you're ready to save, export, and keep Studio-ready assets organized.
            </p>

            <div className="space-y-3 mb-8">
              <BenefitItem 
                icon={Bookmark} 
                title="Saved Creations"
                desc="Save and organize your AI-generated code snippets."
                color="text-[var(--ds-plan)]"
              />
              <BenefitItem 
                icon={ExternalLink} 
                title="One-Click Studio Export" 
                desc="Instant Luau snippets for your game."
                color="text-accent"
              />
              <BenefitItem 
                icon={Download} 
                title="High-Res Downloads" 
                desc="Get 512x512 PNGs with perfect transparency."
                color="text-[var(--ds-info)]"
              />
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => navigate("/subscribe")}
                className="focus-ring w-full py-4 rounded-xl border border-[var(--ds-accent-border)] bg-accent text-accent-foreground font-black text-lg shadow-panel transition hover:bg-[var(--ds-accent-hover)] active:bg-[var(--ds-accent-pressed)]"
              >
                Upgrade to Pro
              </button>
              <button
                onClick={onClose}
                className="focus-ring w-full py-3 rounded-xl text-[var(--ds-text-subtle)] hover:bg-[var(--ds-fill-subtle)] hover:text-[var(--ds-text)] text-sm font-bold transition-colors"
              >
                Maybe Later
              </button>
            </div>
          </div>

          {/* Bottom Decoration */}
          <div className="p-4 bg-[var(--ds-fill-subtle)] border-t border-[var(--ds-border-subtle)] text-center">
            <div className="flex items-center justify-center gap-2 text-[10px] font-black text-[var(--ds-text-subtle)] uppercase tracking-widest">
              <ShieldCheck className="w-3 h-3" />
              Cancel Anytime - Instant Access
            </div>
          </div>
    </Modal>
  );
}

function BenefitItem({ icon: Icon, title, desc, color }) {
  return (
    <div className="flex items-center gap-4 text-left p-3.5 rounded-2xl bg-[var(--ds-fill-subtle)] border border-[var(--ds-border-subtle)] hover:border-[var(--ds-border-strong)] transition-colors">
      <div className="w-10 h-10 rounded-xl bg-[var(--ds-fill-hover)] flex items-center justify-center flex-shrink-0">
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div>
        <div className="text-sm font-bold text-[var(--ds-text)]">{title}</div>
        <div className="text-[11px] text-[var(--ds-text-subtle)] leading-tight">{desc}</div>
      </div>
    </div>
  );
}
