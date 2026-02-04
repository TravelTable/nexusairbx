import React from "react";
import { Users, X, ChevronRight } from "lucide-react";

export default function TeamShareModal({
  sharingId,
  onClose,
  messages,
  teams,
  onShareWithTeam,
  onGoToSettings,
}) {
  if (!sharingId) return null;
  const m = messages.find((msg) => msg.id === sharingId);
  const artifactId = m?.artifactId || m?.projectId;
  const type = m?.projectId ? "ui" : "script";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-[#121212] border border-white/10 rounded-3xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl">
        <div className="p-6 border-b border-white/5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-[#00f5d4]" />
            <h3 className="text-lg font-black text-white uppercase tracking-tight">
              Share with Team
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-3">
          {teams.map((team) => (
            <button
              key={team.id}
              onClick={() => {
                onShareWithTeam(artifactId, type, team.id);
                onClose();
              }}
              className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-[#00f5d4]/50 hover:bg-[#00f5d4]/5 transition-all text-left flex items-center justify-between group"
            >
              <span className="font-bold text-white group-hover:text-[#00f5d4] transition-colors">
                {team.name}
              </span>
              <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-[#00f5d4]" />
            </button>
          ))}
          {teams.length === 0 && (
            <div className="py-8 text-center">
              <p className="text-sm text-gray-500 mb-4">You need to create a team first.</p>
              <button
                onClick={() => {
                  onClose();
                  onGoToSettings?.();
                }}
                className="text-[#00f5d4] text-xs font-black uppercase tracking-widest underline"
              >
                Go to Settings
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
