import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, X, Sparkles } from "lucide-react";

// Main Onboarding Modal Container
export default function OnboardingContainer({ forceShow = false, onComplete }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [show, setShow] = useState(forceShow);
  const totalSteps = 1; // Simplified for "Welcome" fallback

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
    // setTimeout(() => window.location.reload(), 300); // Removed reload for smoother flow
  };

  const handleClose = () => {
    localStorage.setItem("nexusrbx:onboardingComplete", "true");
    setShow(false);
    if (onComplete) onComplete();
  };

  // Listen for dev-panel trigger to show onboarding
  useEffect(() => {
    function onDevShowOnboarding() {
      setShow(true);
      setCurrentStep(1);
    }
    window.addEventListener("nexus:devShowOnboarding", onDevShowOnboarding);
    return () =>
      window.removeEventListener("nexus:devShowOnboarding", onDevShowOnboarding);
  }, []);

  if (!show) return null;

  return (
    <OnboardingFlow
      currentStep={currentStep}
      totalSteps={totalSteps}
      onNext={handleNext}
      onPrevious={handlePrevious}
      onFinish={handleFinish}
      onClose={handleClose}
    />
  );
}

// Onboarding Modal Flow
function OnboardingFlow({
  currentStep,
  totalSteps,
  onNext,
  onPrevious,
  onFinish,
  onClose,
}) {
  // Animate modal in/out
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setTimeout(() => setVisible(true), 10);
  }, []);

  // Prevent background scroll when modal is open (mobile-friendly)
  useEffect(() => {
    document.body.style.overflow = visible ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [visible]);

  return (
    <div
      className={`fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-2 sm:p-4 z-50 transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      aria-modal="true"
      role="dialog"
      style={{ overscrollBehavior: "contain" }}
    >
      <div
        className="bg-gray-900 rounded-xl shadow-2xl w-full max-w-3xl sm:max-w-2xl md:max-w-3xl overflow-hidden border border-gray-700 relative animate-fadeIn
        flex flex-col
        max-h-[95vh] sm:max-h-[90vh]
        "
        style={{
          width: "100%",
          maxWidth: "480px",
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-300 transition-colors z-10 p-2 rounded-full bg-gray-800 bg-opacity-60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          aria-label="Close onboarding"
        >
          <X className="w-6 h-6" />
        </button>
        {/* Progress bar */}
        <div className="w-full bg-gray-800 h-1">
          <div
            className="bg-gradient-to-r from-blue-500 to-purple-500 h-1 transition-all duration-300 ease-in-out"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          ></div>
        </div>

        <div className="p-4 sm:p-6 md:p-8 overflow-y-auto flex-1" style={{ maxHeight: "calc(95vh - 48px)" }}>
          {/* Step content */}
          <WelcomeStep />

          {/* Navigation buttons */}
          <div className="flex flex-col-reverse sm:flex-row justify-between mt-8 items-center gap-4 sm:gap-0">
            <div className="w-full sm:w-auto flex justify-start">
              {currentStep > 1 && (
                <button
                  onClick={onPrevious}
                  className="flex items-center text-gray-400 hover:text-blue-400 transition-colors font-medium px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <ChevronLeft className="w-5 h-5 mr-1" />
                  Back
                </button>
              )}
            </div>

            <div className="w-full sm:w-auto flex justify-center text-sm text-gray-500">
              Step {currentStep} of {totalSteps}
            </div>

            <div className="w-full sm:w-auto flex justify-end">
              {currentStep < totalSteps ? (
                <button
                  onClick={onNext}
                  className="flex items-center justify-center w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-5 py-2 rounded-lg transition-colors font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  Next
                  <ChevronRight className="w-5 h-5 ml-1" />
                </button>
              ) : (
                <button
                  onClick={onFinish}
                  className="flex items-center justify-center w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-5 py-2 rounded-lg transition-colors font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  Finish
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Step 1: Welcome
function WelcomeStep() {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <div className="bg-gradient-to-br from-[#9b5de5] to-[#00f5d4] p-2 rounded-lg">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white">
          Welcome to Nexus Console
        </h2>
      </div>

      <p className="text-gray-300 leading-relaxed">
        Nexus is your AI-powered Roblox development assistant. You can build full UIs, complex scripts, and get coding help instantly.
      </p>

      <div className="bg-[#9b5de5]/10 border-l-4 border-[#9b5de5] p-4 rounded-r-lg">
        <p className="text-gray-200 text-sm">
          Since you skipped the tour, remember you can always find the tutorial again in your <span className="text-[#00f5d4] font-bold">Settings</span> if you need a refresher.
        </p>
      </div>

      <div className="bg-gradient-to-r from-[#9b5de5]/20 to-[#00f5d4]/20 p-6 rounded-xl text-center border border-white/10">
        <h3 className="text-white text-xl font-bold mb-2">Happy hacking!</h3>
        <p className="text-gray-400 text-sm">Click Finish to get started.</p>
      </div>
    </div>
  );
}

// Legacy multi-step content is intentionally removed while onboarding is simplified
