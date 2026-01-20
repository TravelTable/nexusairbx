import React, { useState, useEffect } from "react";
import { FileCode, Clock, Search, ChevronRight, Layout, Heart, Trash2 } from "lucide-react";
import { toLocalTime } from "../../lib/aiUtils";
import { listFavorites, deleteFavorite } from "../../lib/uiBuilderApi";
import { auth } from "../../firebase";

export default function LibraryView({ scripts, onOpenScript }) {
  const [activeSubTab, setActiveSubTab] = useState("scripts"); // "scripts" | "favorites"
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    if (activeSubTab === "favorites") {
      loadFavorites();
    }
  }, [activeSubTab]);

  const loadFavorites = async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const data = await listFavorites({ token });
      setFavorites(data.favorites || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteFavorite = async (id) => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const token = await user.getIdToken();
      await deleteFavorite({ token, id });
      setFavorites(prev => prev.filter(f => f.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center bg-gray-900/50 border border-gray-800 rounded-xl p-1">
          <button 
            onClick={() => setActiveSubTab("scripts")} 
            className={`px-4 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeSubTab === "scripts" ? "bg-gray-800 text-[#00f5d4] shadow-sm" : "text-gray-400 hover:text-white"}`}
          >
            <FileCode className="h-4 w-4" /> Scripts
          </button>
          <button 
            onClick={() => setActiveSubTab("favorites")} 
            className={`px-4 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeSubTab === "favorites" ? "bg-gray-800 text-red-400 shadow-sm" : "text-gray-400 hover:text-white"}`}
          >
            <Heart className="h-4 w-4" /> Favorites
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input 
            type="text" 
            placeholder={activeSubTab === "scripts" ? "Search scripts..." : "Search favorites..."}
            className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white outline-none focus:border-[#00f5d4] transition-all"
          />
        </div>
      </div>

      {activeSubTab === "scripts" ? (
        scripts.length === 0 ? (
          <div className="min-h-[40vh] flex flex-col items-center justify-center text-center p-8 bg-gray-900/20 border border-dashed border-gray-800 rounded-3xl">
            <FileCode className="w-12 h-12 text-gray-700 mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">No scripts yet</h3>
            <p className="text-gray-500 max-w-xs">Start a conversation or build a UI to see your saved work here.</p>
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
        )
      ) : (
        favorites.length === 0 ? (
          <div className="min-h-[40vh] flex flex-col items-center justify-center text-center p-8 bg-gray-900/20 border border-dashed border-gray-800 rounded-3xl">
            <Heart className="w-12 h-12 text-gray-700 mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">No favorites yet</h3>
            <p className="text-gray-500 max-w-xs">Heart components in the UI Preview to save them here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {favorites.map((fav) => (
              <div
                key={fav.id}
                className="p-5 rounded-2xl bg-[#121212] border border-white/5 hover:border-red-400/40 transition-all group relative"
              >
                <div className="aspect-square rounded-xl bg-black/40 border border-white/5 mb-4 flex items-center justify-center overflow-hidden">
                  {fav.component?.type?.includes("Image") ? (
                    <img src={fav.component.imageId} alt={fav.name} className="w-1/2 h-1/2 object-contain" />
                  ) : (
                    <div className="text-[10px] text-gray-500 font-bold uppercase">{fav.component?.type || "Component"}</div>
                  )}
                </div>
                <div className="font-bold text-white mb-1 truncate">{fav.name}</div>
                <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">{fav.component?.type}</div>
                
                <button 
                  onClick={() => handleDeleteFavorite(fav.id)}
                  className="absolute top-3 right-3 p-2 rounded-lg bg-red-500/10 text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
