import React from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";

export default function Modal({ onClose, title, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.3 }}
        className="bg-gray-900 border border-gray-700 rounded-lg p-8 shadow-2xl w-full max-w-lg relative"
      >
        <button
          className="absolute top-3 right-3 p-1 rounded hover:bg-gray-800 transition-colors"
          onClick={onClose}
          aria-label="Close modal"
        >
          <X className="h-5 w-5 text-gray-400" />
        </button>
        <h2 className="text-xl font-bold text-white mb-4 flex items-center">
          {title}
        </h2>
        {children}
      </motion.div>
    </div>
  );
}