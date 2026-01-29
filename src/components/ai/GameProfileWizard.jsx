import React, { useState } from "react";
import Modal from "../Modal";
import { ChevronRight, ChevronLeft, Check, Plus, X } from "lucide-react";

const genres = ["RPG", "FPS", "Simulator", "Tycoon", "Obby", "Horror", "Social", "Racing", "Custom..."];
const platforms = [
  { id: "pc", label: "PC" },
  { id: "mobile", label: "Mobile" },
  { id: "console", label: "Console" },
  { id: "vr", label: "VR" }
];
const themes = ["Sci-Fi", "Fantasy", "Modern/Clean", "Tactical/Military", "Cartoon", "Cyberpunk", "Medieval", "Custom..."];
const systems = ["DataStores", "Raycasting", "Custom Physics", "Team Create", "StreamingEnabled", "Voice Chat"];

export default function GameProfileWizard({ isOpen, onClose, profile, onUpdate }) {
  const [step, setStep] = useState(1);
  const [customGenre, setCustomGenre] = useState("");
  const [customTheme, setCustomTheme] = useState("");
  const [newSystem, setNewSystem] = useState("");

  const handleNext = () => setStep(s => Math.min(s + 1, 4));
  const handleBack = () => setStep(s => Math.max(s - 1, 1));

  const togglePlatform = (id) => {
    const newPlatforms = profile.platforms.includes(id)
      ? profile.platforms.filter(p => p !== id)
      : [...profile.platforms, id];
    onUpdate({ platforms: newPlatforms });
  };

  const toggleSystem = (id) => {
    const newSystems = profile.systems.includes(id)
      ? profile.systems.filter(s => s !== id)
      : [...profile.systems, id];
    onUpdate({ systems: newSystems });
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        const isCustomGenre = profile.genre && !genres.includes(profile.genre);
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 block">Select Genre</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {genres.map(g => (
                  <button
                    key={g}
                    onClick={() => {
                      if (g === "Custom...") {
                        onUpdate({ genre: customGenre || "My Custom Genre" });
                      } else {
                        onUpdate({ genre: g });
                      }
                    }}
                    className={`py-2 px-3 rounded-lg border text-sm transition-all ${
                      (profile.genre === g || (g === "Custom..." && isCustomGenre)) ? "border-[#00f5d4] bg-[#00f5d4]/10 text-white" : "border-gray-800 bg-gray-900/50 text-gray-400 hover:border-gray-700"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
              {(profile.genre === "Custom..." || isCustomGenre) && (
                <div className="mt-3 animate-in fade-in slide-in-from-top-2">
                  <input
                    type="text"
                    placeholder="Type your custom genre..."
                    value={isCustomGenre ? profile.genre : customGenre}
                    onChange={(e) => {
                      setCustomGenre(e.target.value);
                      onUpdate({ genre: e.target.value });
                    }}
                    className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 text-sm text-white outline-none focus:border-[#00f5d4]"
                  />
                </div>
              )}
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 block">Target Platforms</label>
              <div className="flex flex-wrap gap-2">
                {platforms.map(p => (
                  <button
                    key={p.id}
                    onClick={() => togglePlatform(p.id)}
                    className={`py-2 px-4 rounded-full border text-sm transition-all ${
                      profile.platforms.includes(p.id) ? "border-[#9b5de5] bg-[#9b5de5]/10 text-white" : "border-gray-800 bg-gray-900/50 text-gray-400 hover:border-gray-700"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      case 2:
        const isCustomTheme = profile.theme && !themes.includes(profile.theme);
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 block">Visual Theme</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {themes.map(t => (
                  <button
                    key={t}
                    onClick={() => {
                      if (t === "Custom...") {
                        onUpdate({ theme: customTheme || "My Custom Theme" });
                      } else {
                        onUpdate({ theme: t });
                      }
                    }}
                    className={`py-2 px-3 rounded-lg border text-sm transition-all ${
                      (profile.theme === t || (t === "Custom..." && isCustomTheme)) ? "border-[#f15bb5] bg-[#f15bb5]/10 text-white" : "border-gray-800 bg-gray-900/50 text-gray-400 hover:border-gray-700"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              {(profile.theme === "Custom..." || isCustomTheme) && (
                <div className="mt-3 animate-in fade-in slide-in-from-top-2">
                  <input
                    type="text"
                    placeholder="Type your custom theme..."
                    value={isCustomTheme ? profile.theme : customTheme}
                    onChange={(e) => {
                      setCustomTheme(e.target.value);
                      onUpdate({ theme: e.target.value });
                    }}
                    className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 text-sm text-white outline-none focus:border-[#f15bb5]"
                  />
                </div>
              )}
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 block">Brand Colors</label>
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center gap-1">
                  <input 
                    type="color" 
                    value={profile.colors.primary} 
                    onChange={(e) => onUpdate({ colors: { ...profile.colors, primary: e.target.value } })}
                    className="w-10 h-10 rounded cursor-pointer bg-transparent border-none"
                  />
                  <span className="text-[10px] text-gray-500">Primary</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <input 
                    type="color" 
                    value={profile.colors.secondary} 
                    onChange={(e) => onUpdate({ colors: { ...profile.colors, secondary: e.target.value } })}
                    className="w-10 h-10 rounded cursor-pointer bg-transparent border-none"
                  />
                  <span className="text-[10px] text-gray-500">Secondary</span>
                </div>
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 block">Technical Systems</label>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {[...systems, ...profile.systems.filter(s => !systems.includes(s))].map(s => (
                  <button
                    key={s}
                    onClick={() => toggleSystem(s)}
                    className={`py-2 px-3 rounded-lg border text-sm text-left flex items-center justify-between transition-all ${
                      profile.systems.includes(s) ? "border-[#00f5d4] bg-[#00f5d4]/10 text-white" : "border-gray-800 bg-gray-900/50 text-gray-400 hover:border-gray-700"
                    }`}
                  >
                    <span className="truncate mr-2">{s}</span>
                    {profile.systems.includes(s) && <Check className="w-3 h-3 text-[#00f5d4] shrink-0" />}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add custom system..."
                  value={newSystem}
                  onChange={(e) => setNewSystem(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newSystem.trim()) {
                      toggleSystem(newSystem.trim());
                      setNewSystem("");
                    }
                  }}
                  className="flex-1 bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 text-sm text-white outline-none focus:border-[#00f5d4]"
                />
                <button
                  onClick={() => {
                    if (newSystem.trim()) {
                      toggleSystem(newSystem.trim());
                      setNewSystem("");
                    }
                  }}
                  className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white transition-all"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 block">Additional Context</label>
            <p className="text-xs text-gray-500 mb-3">Anything else the AI should know about your game's logic or UI requirements?</p>
            <textarea
              className="w-full h-40 bg-gray-900 border border-gray-800 rounded-xl p-4 text-white text-sm outline-none focus:border-[#00f5d4] transition-all resize-none"
              placeholder="e.g. The game uses a custom inventory system with 20 slots..."
              value={profile.customNotes}
              onChange={(e) => onUpdate({ customNotes: e.target.value })}
            />
          </div>
        );
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <Modal onClose={onClose} title="Game Profile Wizard">
      <div className="flex items-center justify-between mb-6 px-2 bg-gray-900/50 p-4 rounded-2xl border border-white/5">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${profile.enabled ? 'bg-[#00f5d4]/10 text-[#00f5d4]' : 'bg-gray-800 text-gray-500'}`}>
            <Check className={`w-6 h-6 ${profile.enabled ? 'opacity-100' : 'opacity-20'}`} />
          </div>
          <div>
            <div className="text-sm font-bold text-white">Profile Context</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-widest">{profile.enabled ? 'Active & Sending to AI' : 'Disabled'}</div>
          </div>
        </div>
        <button 
          onClick={() => onUpdate({ enabled: !profile.enabled })}
          className={`w-12 h-6 rounded-full transition-all relative ${profile.enabled ? 'bg-[#00f5d4]' : 'bg-gray-700'}`}
        >
          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${profile.enabled ? 'left-7' : 'left-1'}`} />
        </button>
      </div>

      <div className="flex items-center justify-between mb-8 px-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              step === i ? "bg-gradient-to-br from-[#9b5de5] to-[#00f5d4] text-white scale-110 shadow-lg" : 
              step > i ? "bg-[#00f5d4] text-black" : "bg-gray-800 text-gray-500"
            }`}>
              {step > i ? <Check className="w-4 h-4" /> : i}
            </div>
            {i < 4 && <div className={`h-0.5 flex-1 mx-2 rounded-full ${step > i ? "bg-[#00f5d4]" : "bg-gray-800"}`} />}
          </div>
        ))}
      </div>

      <div className="min-h-[300px]">
        {renderStep()}
      </div>

      <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-800">
        <button
          onClick={step === 1 ? onClose : handleBack}
          className="px-6 py-2 rounded-lg text-sm font-bold text-gray-400 hover:text-white transition-all flex items-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          {step === 1 ? "Cancel" : "Back"}
        </button>
        <button
          onClick={step === 4 ? onClose : handleNext}
          className="px-8 py-2 rounded-lg bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-white font-bold text-sm shadow-lg hover:shadow-[#00f5d4]/20 transition-all flex items-center gap-2"
        >
          {step === 4 ? "Finish" : "Skip / Next"}
          {step !== 4 && <ChevronRight className="w-4 h-4" />}
        </button>
      </div>
    </Modal>
  );
}
