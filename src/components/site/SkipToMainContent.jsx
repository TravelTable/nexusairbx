import React from "react";

export default function SkipToMainContent({ targetId = "main-content" }) {
  return (
    <a
      href={`#${targetId}`}
      className="fixed left-4 top-3 z-[100] -translate-y-24 rounded-lg bg-[#00f5d4] px-4 py-2 text-sm font-bold text-black shadow-lg transition-transform focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-white"
    >
      Skip to main content
    </a>
  );
}
