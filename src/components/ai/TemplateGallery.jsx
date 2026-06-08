import React, { useMemo, useState } from "react";
import {
  X,
  Sparkles,
  ShoppingCart,
  Backpack,
  Settings,
  Crosshair,
  Gamepad2,
  Gift,
  ScrollText,
  Trophy,
  LayoutGrid,
} from "lucide-react";
import { UI_TEMPLATES, TEMPLATE_CATEGORIES } from "../../data/uiTemplates";

// Map the string icon names in the template data to lucide-react components.
const ICONS = {
  ShoppingCart,
  Backpack,
  Settings,
  Crosshair,
  Gamepad2,
  Gift,
  ScrollText,
  Trophy,
};

export default function TemplateGallery({ open, onClose, onSelect }) {
  const [activeCategory, setActiveCategory] = useState("All");

  const categories = useMemo(() => ["All", ...TEMPLATE_CATEGORIES], []);

  const templates = useMemo(() => {
    if (activeCategory === "All") return UI_TEMPLATES;
    return UI_TEMPLATES.filter((t) => t.category === activeCategory);
  }, [activeCategory]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Quick-start template gallery"
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-4xl max-h-[85vh] flex flex-col bg-[#0D0D0D] border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
        <div className="flex items-start justify-between gap-4 p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#00f5d4]/10 border border-[#00f5d4]/20 text-[#00f5d4]">
              <LayoutGrid className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                Quick-start templates
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Pick a polished starter — we&apos;ll generate it instantly. Edit and refine after.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/5 text-gray-500 hover:text-white transition-all"
            aria-label="Close template gallery"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2 px-6 py-3 border-b border-white/5 overflow-x-auto scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                activeCategory === cat
                  ? "bg-[#00f5d4] text-black"
                  : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
              }`}
              aria-pressed={activeCategory === cat}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((tpl) => {
              const Icon = ICONS[tpl.icon] || Sparkles;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => onSelect?.(tpl)}
                  className="group p-5 rounded-2xl bg-gray-900/40 border border-gray-800 hover:border-[#00f5d4]/40 text-left transition-all flex flex-col h-full"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 rounded-xl bg-white/5 text-[#00f5d4] group-hover:bg-[#00f5d4]/10 transition-all">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-[#9b5de5]">
                      {tpl.category}
                    </span>
                  </div>
                  <div className="font-bold text-white text-sm mb-1">{tpl.name}</div>
                  <div className="text-[11px] text-gray-500 leading-relaxed flex-1">
                    {tpl.description}
                  </div>
                  <div className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#00f5d4] opacity-0 group-hover:opacity-100 transition-opacity">
                    <Sparkles className="w-3 h-3" />
                    Generate
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
