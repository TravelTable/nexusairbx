import React from "react";
import { Loader } from "lucide-react";

const stages = [
  { id: "planning", label: "Planning Layout", match: ["Planning Layout..."] },
  { id: "analyzing", label: "Analyzing Components", match: ["Analyzing Components...", "Analyzing Request..."] },
  { id: "generating", label: "Writing Luau Code", match: ["Writing Luau Code...", "Generating Response..."] },
  { id: "finalizing", label: "Finalizing", match: ["Finalizing UI...", "Finalizing..."] },
];

export default function GenerationStatusBar({ currentStage }) {
  if (!currentStage) return null;

  return (
    <div className="w-full bg-gray-900/50 border border-gray-800 rounded-xl p-4 mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Loader className="w-4 h-4 text-[#00f5d4] animate-spin" />
          <span className="text-sm font-bold text-white">Nexus is working...</span>
        </div>
        <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">{currentStage}</span>
      </div>
      
      <div className="flex items-center gap-2">
        {stages.map((stage, index) => {
          const isCompleted = stages.slice(0, index).some(s => s.match.includes(currentStage)) || 
                             (!stage.match.includes(currentStage) && stages.slice(index + 1).some(s => s.match.includes(currentStage)));
          const isActive = stage.match.includes(currentStage);
          
          return (
            <React.Fragment key={stage.id}>
              <div className="flex flex-col items-center gap-1 flex-1">
                <div className={`h-1.5 w-full rounded-full transition-all duration-500 ${
                  isCompleted ? "bg-[#00f5d4]" : isActive ? "bg-[#9b5de5] animate-pulse" : "bg-gray-800"
                }`} />
                <span className={`text-[9px] uppercase tracking-tighter ${
                  isActive ? "text-white font-bold" : "text-gray-600"
                }`}>{stage.label}</span>
              </div>
              {index < stages.length - 1 && <div className="w-2" />}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
