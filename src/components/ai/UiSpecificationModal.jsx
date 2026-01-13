import React, { useState } from "react";
import { Check } from "lucide-react";
import Modal from "../Modal";

export default function UiSpecificationModal({ onClose, onConfirm, initialSpecs }) {
  const [tab, setTab] = useState("theme");
  const [specs, setSpecs] = useState(initialSpecs);
  
  const updateCatalogItem = (idx, field, val) => { 
    const next = [...specs.catalog]; 
    next[idx] = { ...next[idx], [field]: val }; 
    setSpecs(prev => ({ ...prev, catalog: next })); 
  };

  const togglePlatform = (p) => {
    setSpecs(prev => {
      const platforms = prev.platforms || [];
      if (platforms.includes(p)) {
        return { ...prev, platforms: platforms.filter(x => x !== p) };
      } else {
        return { ...prev, platforms: [...platforms, p] };
      }
    });
  };

  return (
    <Modal onClose={onClose} title="UI Specification">
      <div className="flex border-b border-gray-800 mb-4">
        {["theme", "platforms", "catalog", "animations"].map(t => (
          <button 
            key={t} 
            onClick={() => setTab(t)} 
            className={`px-4 py-2 text-sm font-bold capitalize ${tab === t ? "text-[#00f5d4] border-b-2 border-[#00f5d4]" : "text-gray-400"}`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="min-h-[300px] max-h-[500px] overflow-y-auto">
        {tab === "theme" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400">Primary</label>
                <input 
                  type="color" 
                  className="w-full h-10 bg-gray-800 rounded" 
                  value={specs.theme.primary} 
                  onChange={e => setSpecs(prev => ({ ...prev, theme: { ...prev.theme, primary: e.target.value } }))} 
                />
              </div>
              <div>
                <label className="text-xs text-gray-400">Background</label>
                <input 
                  type="color" 
                  className="w-full h-10 bg-gray-800 rounded" 
                  value={specs.theme.bg} 
                  onChange={e => setSpecs(prev => ({ ...prev, theme: { ...prev.theme, bg: e.target.value } }))} 
                />
              </div>
            </div>
          </div>
        )}
        {tab === "platforms" && (
          <div className="space-y-4 p-2">
            <p className="text-xs text-gray-400 mb-4">Select target platforms for the AI to optimize for:</p>
            <div className="grid grid-cols-1 gap-3">
              {[
                { id: "mobile", label: "Mobile (Touch Friendly, Large Buttons)", icon: "📱" },
                { id: "pc", label: "PC / Desktop (Mouse & Keyboard)", icon: "💻" },
                { id: "laptop", label: "Laptop (Compact Desktop)", icon: "📟" }
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => togglePlatform(p.id)}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                    specs.platforms?.includes(p.id)
                      ? "border-[#00f5d4] bg-[#00f5d4]/10 text-white"
                      : "border-gray-800 bg-gray-900/40 text-gray-400 hover:border-gray-700"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{p.icon}</span>
                    <span className="font-bold">{p.label}</span>
                  </div>
                  {specs.platforms?.includes(p.id) && <Check className="w-5 h-5 text-[#00f5d4]" />}
                </button>
              ))}
            </div>
          </div>
        )}
        {tab === "catalog" && (
          <div className="space-y-3">
            {specs.catalog.map((item, idx) => (
              <div key={idx} className="p-3 bg-gray-900/60 border border-gray-800 rounded-lg space-y-2">
                <input 
                  placeholder="Item Name" 
                  className="w-full bg-gray-800 rounded px-2 py-1 text-sm" 
                  value={item.name} 
                  onChange={e => updateCatalogItem(idx, "name", e.target.value)} 
                />
                <div className="grid grid-cols-2 gap-2">
                  <input 
                    placeholder="Price" 
                    className="bg-gray-800 rounded px-2 py-1 text-sm" 
                    value={item.price} 
                    onChange={e => updateCatalogItem(idx, "price", e.target.value)} 
                  />
                  <input 
                    placeholder="Icon ID" 
                    className="bg-gray-800 rounded px-2 py-1 text-sm" 
                    value={item.iconId} 
                    onChange={e => updateCatalogItem(idx, "iconId", e.target.value)} 
                  />
                </div>
              </div>
            ))}
            <button 
              onClick={() => setSpecs(prev => ({ ...prev, catalog: [...prev.catalog, { name: "", price: "0", currency: "Robux", iconId: "" }] }))} 
              className="w-full py-2 border-2 border-dashed border-gray-800 rounded-lg text-gray-500"
            >
              + Add Item
            </button>
          </div>
        )}
        {tab === "animations" && (
          <textarea 
            className="w-full h-40 bg-gray-800 rounded-lg p-3 text-sm" 
            placeholder="Describe animations..." 
            value={specs.animations} 
            onChange={e => setSpecs(prev => ({ ...prev, animations: e.target.value }))} 
          />
        )}
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <button className="px-4 py-2 rounded-lg bg-gray-800" onClick={onClose}>Cancel</button>
        <button className="px-6 py-2 rounded-lg bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] font-bold" onClick={() => onConfirm(specs)}>Generate</button>
      </div>
    </Modal>
  );
}
