import React from "react";
import { motion } from "framer-motion";
import { Sparkles, Star, Loader } from "lucide-react";

export default function WelcomeCard({
  setPrompt,
  promptTemplates,
  userPromptTemplates,
  setShowPromptTemplateModal,
  promptSuggestions,
  promptSuggestionLoading
}) {
  return (
    <motion.div
      key="welcome-card"
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      transition={{ duration: 0.5 }}
      className="mx-auto max-w-xl mt-24 flex flex-col items-center justify-center bg-gray-900/70 border border-gray-800 rounded-2xl shadow-2xl p-10"
    >
      <Sparkles className="h-12 w-12 text-[#9b5de5] mb-4" />
      <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">
        Welcome to NexusRBX AI
      </h2>
      <p className="text-gray-300 mb-4 text-center">
        Describe the Roblox mod you want to create and I'll generate the code for you.<br />
        <span className="text-[#00f5d4]">Try a prompt below to get started!</span>
      </p>
      <div className="flex flex-col gap-2 w-full">
        {userPromptTemplates.length > 0 && (
          <>
            <div className="flex items-center mb-1">
              <Star className="h-4 w-4 text-[#fbbf24] mr-2" />
              <span className="text-xs text-gray-400">Your Templates</span>
              <button
                className="ml-auto px-2 py-1 rounded bg-[#9b5de5]/20 hover:bg-[#9b5de5]/40 text-[#9b5de5] text-xs font-bold"
                onClick={() => setShowPromptTemplateModal(true)}
              >
                Add
              </button>
            </div>
            {userPromptTemplates.map((tpl, i) => (
              <button
                key={i}
                type="button"
                className="w-full p-3 text-left text-base rounded-lg bg-gray-900/30 hover:bg-gray-800/50 transition-colors duration-300 focus:ring-2 focus:ring-[#9b5de5] outline-none"
                onClick={() => setPrompt(tpl)}
              >
                {tpl}
              </button>
            ))}
          </>
        )}
        {promptTemplates.length > 0 && (
          <>
            <div className="flex items-center mb-1 mt-2">
              <Sparkles className="h-4 w-4 text-[#00f5d4] mr-2" />
              <span className="text-xs text-gray-400">Trending Prompts</span>
            </div>
            {promptTemplates.map((tpl, i) => (
              <button
                key={i}
                type="button"
                className="w-full p-3 text-left text-base rounded-lg bg-gray-900/30 hover:bg-gray-800/50 transition-colors duration-300 focus:ring-2 focus:ring-[#9b5de5] outline-none"
                onClick={() => setPrompt(tpl)}
              >
                {tpl}
              </button>
            ))}
          </>
        )}
        {promptSuggestionLoading && (
          <div className="flex items-center text-gray-400 text-sm mt-2">
            <Loader className="h-4 w-4 animate-spin mr-2" />
            Loading suggestions...
          </div>
        )}
      </div>
    </motion.div>
  );
}