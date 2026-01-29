import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, X, Sparkles, Layout, Zap, Library, MousePointer2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Main Onboarding Modal Container
export default function OnboardingContainer({ forceShow = false, onComplete }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [show, setShow] = useState(false);
  const totalSteps = 4;

  // Show onboarding only if not completed
  useEffect(() => {
    if (forceShow) {
      setShow(true);
      return;
    }
    const completed = localStorage.getItem("nexusrbx:onboardingComplete");
    if (!completed || completed === "false") setShow(true);
  }, [forceShow]);

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = () => {
    localStorage.setItem("nexusrbx:onboardingComplete", "true");
    setShow(false);
    if (onComplete) onComplete();
  };

  const handleClose = () => {
    localStorage.setItem("nexusrbx:onboardingComplete", "true");
    setShow(false);
    if (onComplete) onComplete();
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-2xl bg-[#0D0D0D] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-white/5">
          <motion.div 
            className="h-full bg-gradient-to-r from-[#9b5de5] to-[#00f5d4]"
            initial={{ width: "0%" }}
            animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>

        {/* Close Button */}
        <button 
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/5 text-gray-500 hover:text-white transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex-1 overflow-y-auto p-8 md:p-12 scrollbar-hide">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {currentStep === 1 && <WelcomeStep />}
              {currentStep === 2 && <WorkspaceStep />}
              {currentStep === 3 && <ExpertsStep />}
              {currentStep === 4 && <PreviewStep />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer Navigation */}
        <div className="p-6 bg-white/5 border-t border-white/5 flex items-center justify-between">
          <button 
            onClick={handlePrevious}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${currentStep > 1 ? 'text-gray-400 hover:text-white' : 'opacity-0 pointer-events-none'}`}
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          <div className="flex gap-1.5">
            {[...Array(totalSteps)].map((_, i) => (
              <div 
                key={i} 
                className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${currentStep === i + 1 ? 'w-4 bg-[#00f5d4]' : 'bg-white/10'}`}
              />
            ))}
          </div>

          <button 
            onClick={handleNext}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-white text-sm font-black uppercase tracking-widest hover:shadow-[0_0_20px_rgba(0,245,212,0.3)] transition-all active:scale-95"
          >
            {currentStep === totalSteps ? "Get Started" : "Next"}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function WelcomeStep() {
  return (
    <div className="space-y-6 text-center">
      <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-[#9b5de5] to-[#00f5d4] mb-4">
        <Sparkles className="w-10 h-10 text-white" />
      </div>
      <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">
        Welcome to the New Nexus
      </h2>
      <p className="text-gray-400 text-lg leading-relaxed max-w-md mx-auto">
        We've completely redesigned the AI experience to be faster, more powerful, and more intuitive.
      </p>
      <div className="grid grid-cols-3 gap-4 pt-8">
        <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
          <Zap className="w-6 h-6 text-[#00f5d4] mx-auto mb-2" />
          <div className="text-[10px] font-black text-gray-500 uppercase">Faster</div>
        </div>
        <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
          <Layout className="w-6 h-6 text-[#9b5de5] mx-auto mb-2" />
          <div className="text-[10px] font-black text-gray-500 uppercase">Sleeker</div>
        </div>
        <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
          <Sparkles className="w-6 h-6 text-[#00bbf9] mx-auto mb-2" />
          <div className="text-[10px] font-black text-gray-500 uppercase">Smarter</div>
        </div>
      </div>
    </div>
  );
}

function WorkspaceStep() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 rounded-xl bg-[#9b5de5]/20 text-[#9b5de5]">
          <Library className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-xl font-black text-white uppercase tracking-tight">Your Workspace</h3>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Everything in one place</p>
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
          <div className="mt-1 p-1.5 rounded-lg bg-white/5 text-gray-400">
            <MousePointer2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">Unified Sidebar</div>
            <p className="text-xs text-gray-400 leading-relaxed">Access your chat history, generated scripts, and saved library items instantly from the left panel.</p>
          </div>
        </div>
        <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
          <div className="mt-1 p-1.5 rounded-lg bg-white/5 text-gray-400">
            <Layout className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">Project Context</div>
            <p className="text-xs text-gray-400 leading-relaxed">Nexus now understands your entire Roblox project. Sync your Studio context to get hyper-relevant code.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExpertsStep() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 rounded-xl bg-[#00f5d4]/20 text-[#00f5d4]">
          <Zap className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-xl font-black text-white uppercase tracking-tight">AI Experts</h3>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Specialized for your needs</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl bg-[#00f5d4]/5 border border-[#00f5d4]/10">
          <div className="text-[#00f5d4] font-black text-[10px] uppercase mb-1">UI Specialist</div>
          <p className="text-[11px] text-gray-400">Builds stunning, responsive Roblox interfaces in seconds.</p>
        </div>
        <div className="p-4 rounded-2xl bg-[#9b5de5]/5 border border-[#9b5de5]/10">
          <div className="text-[#9b5de5] font-black text-[10px] uppercase mb-1">Logic Master</div>
          <p className="text-[11px] text-gray-400">Handles complex game systems, math, and data structures.</p>
        </div>
        <div className="p-4 rounded-2xl bg-[#ff006e]/5 border border-[#ff006e]/10">
          <div className="text-[#ff006e] font-black text-[10px] uppercase mb-1">Security Auditor</div>
          <p className="text-[11px] text-gray-400">Finds vulnerabilities in your remotes and scripts.</p>
        </div>
        <div className="p-4 rounded-2xl bg-[#00bbf9]/5 border border-[#00bbf9]/10">
          <div className="text-[#00bbf9] font-black text-[10px] uppercase mb-1">System Architect</div>
          <p className="text-[11px] text-gray-400">Designs scalable frameworks and modular components.</p>
        </div>
      </div>
    </div>
  );
}

function PreviewStep() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 rounded-xl bg-[#00bbf9]/20 text-[#00bbf9]">
          <Layout className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-xl font-black text-white uppercase tracking-tight">Live Preview</h3>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">See it before you ship it</p>
        </div>
      </div>

      <div className="relative aspect-video rounded-2xl bg-black/40 border border-white/10 overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-[#9b5de5]/10 to-[#00f5d4]/10" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center space-y-2">
            <Layout className="w-12 h-12 text-white/20 mx-auto" />
            <div className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]">Interactive Preview</div>
          </div>
        </div>
        <div className="absolute bottom-4 left-4 right-4 p-3 rounded-xl bg-black/60 backdrop-blur-md border border-white/5">
          <p className="text-[11px] text-gray-300 leading-relaxed">
            The new side-by-side view lets you interact with your generated UI and inspect the Luau code simultaneously.
          </p>
        </div>
      </div>
      
      <div className="bg-[#00f5d4]/10 border-l-4 border-[#00f5d4] p-4 rounded-r-xl">
        <p className="text-xs text-gray-300">
          <span className="text-[#00f5d4] font-bold">Pro Tip:</span> Use the "Act" mode to let Nexus automatically execute multi-step plans for you.
        </p>
      </div>
    </div>
  );
}
