import React from "react";
import { motion } from "framer-motion";

export default function SidebarTab({ label, active, onClick, icon: Icon }) {
  return (
    <button
      className={`relative flex-1 py-2.5 flex items-center justify-center gap-2 text-sm font-bold transition-all duration-300 focus:outline-none z-10 ${
        active ? "text-[var(--ds-text)]" : "text-[var(--ds-text-subtle)] hover:text-[var(--ds-text-secondary)]"
      }`}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      type="button"
    >
      {active && (
        <motion.div
          layoutId="sidebar-tab-pill"
          className="absolute inset-0 bg-[var(--ds-surface-2)] border border-[var(--ds-border-subtle)] rounded-xl shadow-lg -z-10"
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
        />
      )}
      {Icon && <Icon className={`w-4 h-4 ${active ? "text-accent" : "text-[var(--ds-text-disabled)]"}`} />}
      {label}
    </button>
  );
}
