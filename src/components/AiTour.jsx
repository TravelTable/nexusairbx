import React, { useState, useCallback, useLayoutEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, X, Sparkles } from "lucide-react";

const TOUR_STEPS = [
  {
    target: "tour-mode-toggle",
    title: "Choose Your Tool",
    content: "Switch between UI Builder to create visual interfaces and Chat Mode for game logic and general scripting help. Each mode is optimized for different tasks!",
    position: "bottom"
  },
  {
    target: "tour-sidebar",
    title: "Your Workspace",
    content: "Access your history here. Scripts shows your generated code, Chats keeps track of your conversations, and Saved is for your favorite snippets.",
    position: "right"
  },
  {
    target: "tour-token-bar",
    title: "Powering Your AI",
    content: "This bar shows your remaining Tokens. Each generation uses tokens based on complexity. Pro and Team plans get higher limits and faster resets!",
    position: "top"
  },
  {
    target: "tour-prompt-box",
    title: "Describe Your Vision",
    content: "Type your request here. Be as detailed as possible! Mention colors, themes, and specific features you want the AI to include in your Roblox project.",
    position: "top"
  },
  {
    target: "tour-generate-button",
    title: "Bring it to Life",
    content: "Click here to start the generation. Nexus will analyze your request and build your Luau code in seconds. Ready to build something amazing?",
    position: "top"
  }
];

export default function AiTour({ onComplete, onSkip }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const tooltipRef = React.useRef(null);
  const [adjustedPos, setAdjustedPos] = useState({ top: 0, left: 0, actualPosition: "top" });

  const updateCoords = useCallback(() => {
    const step = TOUR_STEPS[currentStep];
    const element = document.getElementById(step.target);
    if (element && element.offsetParent !== null) {
      const rect = element.getBoundingClientRect();
      // Use viewport-relative coordinates since the container is fixed inset-0
      setCoords({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      });
      setIsVisible(true);
    } else {
      setIsVisible(false);
      // If element is missing, try to skip to next step after a short delay
      // to prevent getting stuck behind the overlay
      const timer = setTimeout(() => {
        if (currentStep < TOUR_STEPS.length - 1) {
          setCurrentStep(prev => prev + 1);
        } else {
          onComplete();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [currentStep, onComplete]);

  useLayoutEffect(() => {
    updateCoords();
    window.addEventListener("resize", updateCoords);
    window.addEventListener("scroll", updateCoords);
    return () => {
      window.removeEventListener("resize", updateCoords);
      window.removeEventListener("scroll", updateCoords);
    };
  }, [updateCoords]);

  // Calculate adjusted position based on viewport boundaries
  useLayoutEffect(() => {
    if (!isVisible || !coords.width) return;

    const step = TOUR_STEPS[currentStep];
    const padding = 20;
    const tooltipWidth = tooltipRef.current?.offsetWidth || 320;
    const tooltipHeight = tooltipRef.current?.offsetHeight || 200;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let top = 0;
    let left = 0;
    let actualPosition = step.position;

    // Initial positioning based on preferred position
    if (step.position === "bottom") {
      top = coords.top + coords.height + padding;
      left = coords.left + coords.width / 2;
      // Flip to top if not enough room at bottom
      if (top + tooltipHeight > viewportHeight - padding) {
        top = coords.top - padding - tooltipHeight;
        actualPosition = "top";
      }
    } else if (step.position === "top") {
      top = coords.top - padding - tooltipHeight;
      left = coords.left + coords.width / 2;
      // Flip to bottom if not enough room at top
      if (top < padding) {
        top = coords.top + coords.height + padding;
        actualPosition = "bottom";
      }
    } else if (step.position === "right") {
      top = coords.top + coords.height / 2 - tooltipHeight / 2;
      left = coords.left + coords.width + padding;
      // Flip to left if not enough room at right (though we don't have "left" logic yet, we can just center it)
      if (left + tooltipWidth > viewportWidth - padding) {
        left = viewportWidth - tooltipWidth - padding;
      }
    }

    // Horizontal clamping
    const halfWidth = tooltipWidth / 2;
    if (actualPosition === "top" || actualPosition === "bottom") {
      if (left - halfWidth < padding) {
        left = halfWidth + padding;
      } else if (left + halfWidth > viewportWidth - padding) {
        left = viewportWidth - halfWidth - padding;
      }
    }

    // Vertical clamping
    if (top < padding) top = padding;
    if (top + tooltipHeight > viewportHeight - padding) {
      top = viewportHeight - tooltipHeight - padding;
    }

    setAdjustedPos({ top, left, actualPosition });
  }, [isVisible, coords, currentStep]);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const step = TOUR_STEPS[currentStep];

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Spotlight Overlay - Only show if tooltip is visible */}
      <AnimatePresence>
        {isVisible && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 pointer-events-auto" 
            style={{
              clipPath: `polygon(0% 0%, 0% 100%, ${coords.left}px 100%, ${coords.left}px ${coords.top}px, ${coords.left + coords.width}px ${coords.top}px, ${coords.left + coords.width}px ${coords.top + coords.height}px, ${coords.left}px ${coords.top + coords.height}px, ${coords.left}px 100%, 100% 100%, 100% 0%)`
            }} 
          />
        )}
      </AnimatePresence>

      {/* Tooltip */}
      <AnimatePresence mode="wait">
        {isVisible && (
          <motion.div
            key={currentStep}
            ref={tooltipRef}
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="absolute pointer-events-auto z-[101] w-[calc(100vw-40px)] max-w-[320px]"
            style={{
              top: adjustedPos.top,
              left: adjustedPos.left,
              transform: (adjustedPos.actualPosition === "top" || adjustedPos.actualPosition === "bottom") 
                ? "translateX(-50%)" 
                : "none"
            }}
          >
            <div className="bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-[0_0_40px_rgba(0,0,0,0.5)] relative overflow-hidden group">
              {/* Animated Border Gradient */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#9b5de5]/20 to-[#00f5d4]/20 opacity-50" />
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-gradient-to-br from-[#9b5de5] to-[#00f5d4]">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Step {currentStep + 1} of {TOUR_STEPS.length}
                    </span>
                  </div>
                  <button onClick={onSkip} className="text-gray-500 hover:text-white transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
                <p className="text-sm text-gray-300 leading-relaxed mb-6">
                  {step.content}
                </p>

                <div className="flex items-center justify-between">
                  <button 
                    onClick={onSkip}
                    className="text-xs font-medium text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    Skip Tour
                  </button>
                  <button
                    onClick={handleNext}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-white text-sm font-bold hover:shadow-[0_0_20px_rgba(0,245,212,0.3)] transition-all active:scale-95"
                  >
                    {currentStep === TOUR_STEPS.length - 1 ? "Finish" : "Next"}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Arrow */}
            <div className={`absolute w-4 h-4 bg-gray-900 border-white/10 rotate-45 z-0 ${
              adjustedPos.actualPosition === "bottom" ? "-top-2 left-1/2 -translate-x-1/2 border-t border-l" :
              adjustedPos.actualPosition === "top" ? "-bottom-2 left-1/2 -translate-x-1/2 border-b border-r" :
              adjustedPos.actualPosition === "right" ? "top-1/2 -left-2 -translate-y-1/2 border-b border-l" : ""
            }`} 
            style={{
              left: adjustedPos.actualPosition === "right" 
                ? "-8px" 
                : `clamp(20px, calc(50% + ${coords.left + coords.width/2 - adjustedPos.left}px), calc(100% - 20px))`
            }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes pulse-highlight {
          0% { box-shadow: 0 0 0 0 rgba(0, 245, 212, 0.4); }
          70% { box-shadow: 0 0 0 15px rgba(0, 245, 212, 0); }
          100% { box-shadow: 0 0 0 0 rgba(0, 245, 212, 0); }
        }
        .tour-highlight {
          animation: pulse-highlight 2s infinite;
          border-radius: 8px;
        }
      `}</style>
    </div>
  );
}
