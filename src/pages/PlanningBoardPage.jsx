import React, { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import LuaPreviewRenderer from "../preview/LuaPreviewRenderer";
import { auth } from "./firebase";

export default function PlanningBoardPage() {
  const [prompt, setPrompt] = useState("");
  const [lua, setLua] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");

  const API_BASE = useMemo(() => {
    const envBase = process.env.REACT_APP_BACKEND_URL || process.env.REACT_APP_API_ORIGIN;
    if (envBase && envBase.trim()) return envBase.replace(/\/+$/, "");
    return "https://nexusrbx-backend-production.up.railway.app";
  }, []);

  async function handleResponse(res) {
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }
    if (!res.ok) {
      const msg = data?.error || data?.message || `Request failed (${res.status})`;
      const err = new Error(msg);
      err.status = res.status;
      throw err;
    }
    return data;
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u || null));
    return () => unsub();
  }, []);

  async function getToken() {
    const token = await user?.getIdToken?.();
    if (!token) throw new Error("Sign in to generate UI");
    return token;
  }

  async function generate() {
    if (!prompt.trim()) {
      setError("Describe the UI you want first.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const token = await getToken();

      // Step 1: ask AI to build boardState JSON
      const genRes = await fetch(`${API_BASE}/api/ui-builder/ai/generate-board`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ prompt }),
      });
      const genJson = await handleResponse(genRes);

      const boardState = genJson.boardState || genJson;
      if (!boardState) throw new Error("No boardState returned from AI");

      // Step 2: finalize into Lua + systems
      const finRes = await fetch(`${API_BASE}/api/ui-builder/ai/finalize-lua`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ boardState, prompt }),
      });
      const finJson = await handleResponse(finRes);

      setLua(finJson.lua || "");
    } catch (e) {
      console.error(e);
      setError(e.message || "Failed to generate");
    } finally {
      setLoading(false);
    }
  }

  async function refine(refinement) {
    if (!lua) return;
    setLoading(true);
    setError("");
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/ui-builder/ai/refine-lua`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          lua,
          instruction: refinement,
        }),
      });

      const json = await handleResponse(res);
      setLua(json.lua || lua);
    } catch (e) {
      console.error(e);
      setError(e.message || "Refine failed");
    } finally {
      setLoading(false);
    }
  }

  function downloadLua() {
    if (!lua) return;
    const blob = new Blob([lua], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "generated_ui.lua";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="h-screen grid grid-cols-[420px_1fr] bg-black text-zinc-100">
      {/* LEFT: AI CONTROL */}
      <div className="border-r border-zinc-800 p-4 flex flex-col gap-3">
        <h1 className="text-lg font-bold">AI → Lua → Preview</h1>
        <textarea
          className="w-full h-40 bg-zinc-900 text-zinc-100 p-2 rounded border border-zinc-800"
          placeholder="Describe the UI you want..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={loading}
        />

        <button
          onClick={generate}
          disabled={loading || !user}
          className="bg-indigo-600 rounded px-4 py-2 font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? "Generating..." : "Generate UI"}
        </button>

        <button
          onClick={() => refine("Make it more compact and modern")}
          disabled={!lua || loading || !user}
          className="bg-zinc-800 rounded px-4 py-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          Refine: Compact
        </button>

        <button
          onClick={() => refine("Increase readability and contrast")}
          disabled={!lua || loading || !user}
          className="bg-zinc-800 rounded px-4 py-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          Refine: Readability
        </button>

        <button
          onClick={downloadLua}
          disabled={!lua}
          className="bg-emerald-600 rounded px-4 py-2 font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
        >
          Download Lua
        </button>

        {error ? <div className="text-sm text-red-400">{error}</div> : null}
        {!user ? (
          <div className="text-sm text-amber-400">
            Sign in to call AI endpoints.
          </div>
        ) : null}
      </div>

      {/* RIGHT: LUA-DRIVEN PREVIEW */}
      <div className="bg-black flex items-center justify-center overflow-auto p-4">
        <LuaPreviewRenderer lua={lua} />
      </div>
    </div>
  );
}
