import React from "react";

export default function SidebarTab({ label, active, onClick }) {
  return (
    <button
      className={`flex-1 py-3 text-center text-sm font-semibold transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-[#9b5de5] ${
        active
          ? "text-white bg-gray-800/70 border-b-2 border-[#9b5de5]"
          : "text-gray-400 hover:bg-gray-900/30"
      }`}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      type="button"
    >
      {label}
    </button>
  );
}