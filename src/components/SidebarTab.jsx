import React from "react";
import { motion } from "framer-motion";

export default function SidebarTab({ label, active, onClick, icon: Icon }) {
  return (
    <button
      className={`relative flex-1 py-2.5 flex items-center justify-center gap-2 text-sm font-bold transition-all duration-300 focus:outline-none z-10 ${
        active ? "text-white" : "text-gray-500 hover:text-gray-300"
      }`}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      type="button"
    >
      {active && (
        <motion.div
          layoutId="sidebar-tab-pill"
          className="absolute inset-0 bg-gray-800/80 border border-white/5 rounded-xl shadow-lg -z-10"
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
        />
      )}
      {Icon && <Icon className={`w-4 h-4 ${active ? "text-[#00f5d4]" : "text-gray-600"}`} />}
      {label}
    </button>
  );
}
