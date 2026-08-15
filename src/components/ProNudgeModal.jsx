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
      overlayClassName="z-[110] bg-black/60 p-4"
      closeOnBackdrop
      showCloseButton={false}
    >
          <button
            onClick={onClose}
            aria-label="Close upgrade prompt"
            className="nexus-icon-button absolute right-6 top-6 z-10 h-11 w-11 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="p-8 pt-12 text-center">
            <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-2xl border border-[var(--ds-border)] bg-[var(--ds-surface-2)] text-[var(--ds-text-secondary)]">
              <Zap className="h-10 w-10" />
            </div>

            <h2 className="text-3xl font-black text-[var(--ds-text)] mb-3 tracking-tight">
              Unlock Pro Access
            </h2>

            <p className="text-[var(--ds-text-muted)] text-[15px] leading-relaxed mb-8">
              To download or export <span className="text-[var(--ds-text)] font-bold">{reason}</span>, you'll need a Pro subscription. Upgrade when you're ready to save, export, and keep Studio-ready assets organized.
            </p>

            <div className="space-y-3 mb-8">
              <BenefitItem 
                icon={Bookmark} 
                title="Saved Creations"
                desc="Save and organize your AI-generated code snippets."
              />
              <BenefitItem 
                icon={ExternalLink} 
                title="One-Click Studio Export" 
                desc="Instant Luau snippets for your game."
              />
              <BenefitItem 
                icon={Download} 
                title="High-Res Downloads" 
                desc="Get 512x512 PNGs with perfect transparency."
              />
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => navigate("/subscribe")}
                className="focus-ring min-h-11 w-full rounded-xl border border-[var(--ds-accent-border)] bg-accent py-4 text-lg font-black text-accent-foreground transition-colors hover:bg-[var(--ds-accent-hover)] active:bg-[var(--ds-accent-pressed)]"
              >
                Upgrade to Pro
              </button>
              <button
                onClick={onClose}
                className="focus-ring min-h-11 w-full rounded-xl py-3 text-sm font-bold text-[var(--ds-text-subtle)] transition-colors hover:bg-[var(--ds-fill-subtle)] hover:text-[var(--ds-text)]"
              >
                Maybe Later
              </button>
            </div>
          </div>

          <div className="p-4 bg-[var(--ds-fill-subtle)] border-t border-[var(--ds-border-subtle)] text-center">
            <div className="flex items-center justify-center gap-2 text-[10px] font-black text-[var(--ds-text-subtle)] uppercase tracking-widest">
              <ShieldCheck className="w-3 h-3" />
              Cancel Anytime - Instant Access
            </div>
          </div>
    </Modal>
  );
}

function BenefitItem({ icon: Icon, title, desc }) {
  return (
    <div className="flex items-center gap-4 text-left p-3.5 rounded-2xl bg-[var(--ds-fill-subtle)] border border-[var(--ds-border-subtle)] hover:border-[var(--ds-border-strong)] transition-colors">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-2)] text-[var(--ds-text-secondary)]">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-sm font-bold text-[var(--ds-text)]">{title}</div>
        <div className="text-[11px] text-[var(--ds-text-subtle)] leading-tight">{desc}</div>
      </div>
    </div>
  );
}
