import React from "react";
import { X } from "lucide-react";

export default function NotificationToast({ open, message, cta, onCta, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-5 py-3 rounded shadow-lg z-50 flex items-center gap-4 border border-[#00f5d4]">
      <span className="font-medium">{message}</span>
      {cta && (
        <button
          className="ml-2 px-3 py-1 rounded bg-[#00f5d4] text-black font-bold text-xs"
          onClick={onCta}
        >
          {cta}
        </button>
      )}
      <button
        className="ml-2 text-white opacity-60 hover:opacity-100"
        onClick={onClose}
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
