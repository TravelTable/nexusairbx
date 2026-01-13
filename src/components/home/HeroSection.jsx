import React from "react";
import { motion } from "framer-motion";
import { Loader, ChevronRight } from "lucide-react";
import FloatingToolCard from "./FloatingToolCard";

export default function HeroSection({
  advertisedTools,
  randomUsers,
  handleSubmit,
  inputValue,
  handleInputChange,
  loading,
  error
}) {
  return (
    <section className="min-h-[80vh] flex items-center justify-center py-20 px-4 relative z-10 overflow-visible">
      <div className="max-w-6xl mx-auto relative w-full">
        {/* Floating Advertisement Boxes */}
        {advertisedTools.map((tool) => (
          <FloatingToolCard key={tool.id} tool={tool} />
        ))}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center space-y-8 relative z-10"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-[#00f5d4] mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00f5d4] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00f5d4]"></span>
            </span>
            Nexus-5 (GPT-5.2) Engine Now Live
          </div>

          <h1 className="text-4xl md:text-7xl font-bold tracking-tight bg-gradient-to-r from-[#9b5de5] via-[#f15bb5] to-[#00f5d4] text-transparent bg-clip-text leading-tight">
            The Ultimate AI UI Builder <br className="hidden md:block" /> & Script Generator
          </h1>
          <p className="text-lg md:text-2xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
            Design stunning interfaces and complex game logic in seconds. NexusRBX turns your ideas into production-ready <a href="/ai" className="underline decoration-[#9b5de5]/60 hover:decoration-[#9b5de5] text-white">Lua code</a> for Roblox Studio.
          </p>

          {/* Social Proof Spot */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col items-center gap-4 pt-4"
          >
            <div className="flex -space-x-3">
              {randomUsers.map((u, i) => (
                <div key={i} className={`w-10 h-10 rounded-full border-2 border-[#0D0D0D] bg-gradient-to-br ${u.color} flex items-center justify-center text-xs font-bold shadow-lg`}>
                  {u.letter}
                </div>
              ))}
              <div className="w-10 h-10 rounded-full border-2 border-[#0D0D0D] bg-gray-800 flex items-center justify-center text-[10px] font-bold text-gray-400 shadow-lg">
                +5k
              </div>
            </div>
            <p className="text-sm font-medium text-gray-400">
              Helping <span className="text-white font-bold">5,000+</span> Roblox Developers
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="max-w-4xl mx-auto mt-12 relative group"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
            <img
              src="/ai-preview.png"
              alt="AI Generation Preview"
              className="relative w-full rounded-2xl border border-white/10 shadow-2xl"
            />
          </motion.div>
          <form
            onSubmit={handleSubmit}
            className="mt-12 flex flex-col md:flex-row gap-3 max-w-2xl mx-auto relative z-20"
          >
            <input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              placeholder="Describe a UI or script idea..."
              className="flex-grow px-4 py-3 rounded-lg bg-gray-900/60 border border-gray-700 focus:border-[#9b5de5] focus:outline-none focus:ring-2 focus:ring-[#9b5de5]/50 transition-all duration-300"
              disabled={loading}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                }
              }}
              aria-label="Type your Roblox UI or script idea"
              autoComplete="off"
              name="roblox-idea"
            />
            <button
              type="submit"
              className="px-6 py-3 rounded-lg bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-white font-medium hover:shadow-lg hover:shadow-[#9b5de5]/20 transform hover:translate-y-[-2px] transition-all duration-300 flex items-center justify-center"
              disabled={!inputValue.trim() || loading}
              aria-label="Generate with AI"
            >
              {loading ? (
                <>
                  <Loader className="mr-2 h-5 w-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  Generate with AI
                  <ChevronRight className="ml-2 h-5 w-5" />
                </>
              )}
            </button>
          </form>
          {error && (
            <div className="text-red-400 mt-2" role="alert">{error}</div>
          )}
          <div className="text-sm text-gray-500 mt-2">
            <span>Describe your idea and press <b>Enter</b> or click "Generate with AI"</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
