import React from "react";
import { FileCode, Clock, Search, ChevronRight, Layout } from "lucide-react";
import { toLocalTime } from "../../lib/aiUtils";

export default function LibraryView({ scripts, onOpenScript }) {
  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-[#00f5d4]/10 text-[#00f5d4]">
            <FileCode className="h-5 w-5" />
          </div>
          <h2 className="text-xl font-black text-white tracking-tight uppercase">Saved Scripts</h2>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input 
            type="text" 
            placeholder="Search saved scripts..."
            className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white outline-none focus:border-[#00f5d4] transition-all"
          />
        </div>
      </div>

      {scripts.length === 0 ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center text-center p-8 bg-gray-900/20 border border-dashed border-gray-800 rounded-3xl">
          <FileCode className="w-12 h-12 text-gray-700 mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">No scripts saved yet</h3>
          <p className="text-gray-500 max-w-xs">Save code snippets from your chats to see them here in your library.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {scripts.map((script) => (
            <button
              key={script.id}
              onClick={() => onOpenScript(script)}
              className="flex items-start gap-4 p-5 rounded-2xl bg-[#121212] border border-white/5 hover:border-[#00f5d4]/40 hover:bg-gray-900/40 transition-all text-left group"
            >
              <div className={`p-3 rounded-xl ${script.type === 'ui' ? 'bg-[#00f5d4]/10 text-[#00f5d4]' : 'bg-[#9b5de5]/10 text-[#9b5de5]'}`}>
                {script.type === 'ui' ? <Layout className="w-5 h-5" /> : <FileCode className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-white mb-1 truncate group-hover:text-[#00f5d4] transition-colors">{script.title}</div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {toLocalTime(script.updatedAt)}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-gray-800 text-[10px] uppercase tracking-wider">
                    {script.type || 'script'}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-700 group-hover:text-white transition-colors self-center" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
