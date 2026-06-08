import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Monitor, Tablet, Smartphone, Loader2, AlertTriangle, ArrowRight, Eye } from "lucide-react";
import LuaPreviewRenderer, { PREVIEW_DEVICES } from "../preview/LuaPreviewRenderer";
import { BACKEND_URL } from "../config";

const DEVICE_ICONS = {
  Monitor,
  Tablet,
  Smartphone,
};

export default function SharePreviewPage() {
  const { id } = useParams();
  const [status, setStatus] = useState("loading"); // loading | ready | notfound | error
  const [share, setShare] = useState(null);
  const [device, setDevice] = useState("pc");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStatus("loading");
      try {
        const res = await fetch(`${BACKEND_URL}/api/share/ui/${encodeURIComponent(id)}`);
        if (res.status === 404) {
          if (!cancelled) setStatus("notfound");
          return;
        }
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const data = await res.json();
        if (cancelled) return;
        setShare(data?.share || null);
        setStatus(data?.share ? "ready" : "notfound");
      } catch (err) {
        if (!cancelled) setStatus("error");
      }
    }

    if (id) load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const deviceEntries = useMemo(() => Object.entries(PREVIEW_DEVICES), []);

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col font-sans">
      <header className="flex items-center justify-between gap-4 px-4 sm:px-6 py-4 border-b border-white/5 bg-black/40 backdrop-blur-md">
        <Link to="/" className="flex items-center gap-2 group">
          <span className="text-lg font-black tracking-tight">
            <span className="text-[#00f5d4]">Nexus</span>
            <span className="text-[#9b5de5]">RBX</span>
          </span>
          <span className="hidden sm:inline text-[10px] uppercase tracking-widest text-gray-500 font-bold border-l border-white/10 pl-2">
            Shared Preview
          </span>
        </Link>

        <Link
          to="/ai"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#00f5d4] text-black text-xs font-black uppercase tracking-widest hover:bg-[#00f5d4]/90 transition-all"
        >
          Build your own
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </header>

      <main className="flex-1 flex flex-col min-h-0">
        {status === "loading" && (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3">
            <Loader2 className="w-7 h-7 animate-spin text-[#00f5d4]" />
            <span className="text-sm font-medium">Loading shared preview…</span>
          </div>
        )}

        {status === "notfound" && (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 px-6">
            <div className="p-3 rounded-2xl bg-white/5 text-gray-400">
              <Eye className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-black">This preview isn&apos;t available</h1>
            <p className="text-sm text-gray-400 max-w-sm">
              The share link may be invalid or the preview was removed.
            </p>
            <Link
              to="/ai"
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-all"
            >
              Open NexusRBX
            </Link>
          </div>
        )}

        {status === "error" && (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 px-6">
            <div className="p-3 rounded-2xl bg-red-500/10 text-red-400">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-black">Couldn&apos;t load this preview</h1>
            <p className="text-sm text-gray-400 max-w-sm">Please check your connection and try again.</p>
          </div>
        )}

        {status === "ready" && share && (
          <>
            <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-white/5 bg-black/20">
              <div className="min-w-0">
                <div className="text-sm font-bold text-white truncate">{share.title}</div>
                <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">
                  Read-only preview
                </div>
              </div>

              <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-full p-1">
                {deviceEntries.map(([key, cfg]) => {
                  const Icon = DEVICE_ICONS[cfg.icon] || Monitor;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setDevice(key)}
                      className={`p-2 rounded-full transition-all ${
                        device === key ? "bg-[#00f5d4] text-black" : "text-gray-400 hover:text-white"
                      }`}
                      title={cfg.name}
                      aria-label={cfg.name}
                      aria-pressed={device === key}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex-1 min-h-0 p-3 sm:p-6">
              <div className="w-full h-full min-h-[60vh] rounded-2xl overflow-hidden border border-white/5 bg-black">
                <LuaPreviewRenderer
                  boardState={share.boardState || null}
                  lua={share.uiModuleLua || ""}
                  device={device}
                  interactive={false}
                  showSafeArea
                />
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
