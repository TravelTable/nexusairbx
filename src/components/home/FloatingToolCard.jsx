import React from "react";
import { motion } from "framer-motion";

const FloatingToolCard = ({ tool }) => (
  <motion.div
    initial={{ opacity: 0, x: tool.position.includes('-left') ? -40 : 40 }}
    animate={{ 
      opacity: 1, 
      x: 0,
      y: [0, -15, 0],
    }}
    transition={{ 
      opacity: { duration: 0.6, delay: tool.delay },
      x: { duration: 0.6, delay: tool.delay },
      y: {
        duration: 5,
        repeat: Infinity,
        ease: "easeInOut",
        delay: tool.delay
      }
    }}
    className={`absolute ${tool.position} hidden lg:flex flex-col gap-3 p-4 rounded-xl bg-white/[0.02] backdrop-blur-xl border border-white/10 w-56 xl:w-64 z-20 hover:border-[#00f5d4]/40 transition-colors group shadow-2xl`}
  >
    <div className="flex items-center gap-3">
      <div className="p-2 rounded-lg bg-gradient-to-br from-[#9b5de5]/10 to-[#00f5d4]/10 group-hover:from-[#9b5de5]/20 group-hover:to-[#00f5d4]/20 transition-colors">
        <tool.icon className="h-4 w-4 xl:h-5 xl:w-5 text-[#00f5d4]" />
      </div>
      <h3 className="font-bold text-xs xl:text-sm text-white tracking-tight">{tool.title}</h3>
    </div>
    <p className="text-[10px] xl:text-[11px] text-gray-400 leading-relaxed">
      {tool.description}
    </p>
    <div className="absolute -bottom-px left-4 right-4 h-px bg-gradient-to-r from-transparent via-[#00f5d4]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
  </motion.div>
);

export default FloatingToolCard;
