import { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Info,
  Shield,
  Code,
  Zap,
  MessageSquare,
  X,
} from "lucide-react";

// Main Onboarding Modal Container
export default function OnboardingContainer() {
  const [currentStep, setCurrentStep] = useState(1);
  const [show, setShow] = useState(false);
  const totalSteps = 5;

  // Show onboarding only if not completed
  useEffect(() => {
    const completed = localStorage.getItem("nexusrbx:onboardingComplete");
    if (!completed || completed === "false") setShow(true);
  }, []);

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
    setTimeout(() => window.location.reload(), 300); // Give time for modal to fade out
  };

  const handleClose = () => {
    localStorage.setItem("nexusrbx:onboardingComplete", "true");
    setShow(false);
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
          {currentStep === 1 && <WelcomeStep />}
          {currentStep === 2 && <PromptingTipsStep />}
          {currentStep === 3 && <EditCustomizeStep />}
          {currentStep === 4 && <PrivacyStep />}
          {currentStep === 5 && <FinalStep />}

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
        <div className="bg-blue-900 bg-opacity-50 p-2 rounded-lg">
          <Info className="w-6 h-6 text-blue-400" />
        </div>
        <h2 className="text-2xl font-bold text-white">
          Step 1: Welcome to NexusRBX AI Console (Beta)
        </h2>
      </div>

      <h3 className="text-xl font-semibold text-blue-300">Welcome to NexusRBX!</h3>

      <p className="text-gray-300">
        You're about to experience the next generation of Roblox scripting. NexusRBX AI Console is your personal AI assistant for generating, editing, and improving Roblox scripts—no advanced coding skills required.
      </p>

      <div className="bg-yellow-900 bg-opacity-30 border-l-4 border-yellow-600 p-4 rounded-r-lg">
        <h4 className="font-semibold text-yellow-400">Beta Notice:</h4>
        <p className="text-yellow-200">
          This platform is currently in Beta. That means you may encounter bugs, unfinished features, or unexpected results. We're working hard to improve every day, and your feedback is invaluable.
        </p>
      </div>

      <div className="bg-blue-900 bg-opacity-30 p-4 rounded-lg flex items-start">
        <div className="text-blue-400 mr-3 mt-1">
          <MessageSquare className="w-5 h-5" />
        </div>
        <p className="text-blue-300">
          <span className="font-semibold">Tip:</span> If you have suggestions or run into issues, please let us know through the feedback button or our Discord community.
        </p>
      </div>
    </div>
  );
}

// Step 2: Prompting Tips
function PromptingTipsStep() {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <div className="bg-purple-900 bg-opacity-50 p-2 rounded-lg">
          <MessageSquare className="w-6 h-6 text-purple-400" />
        </div>
        <h2 className="text-2xl font-bold text-white">
          Step 2: Script Quality & Prompting Tips
        </h2>
      </div>

      <h3 className="text-xl font-semibold text-purple-300">
        Get the best results with clear prompts!
      </h3>

      <p className="text-gray-300">
        The AI does its best to understand your request, but the more details you provide, the better your script will be.
      </p>

      <div className="space-y-3">
        <p className="text-gray-300">If your script doesn't work as expected, try:</p>
        <ul className="list-disc pl-6 space-y-2 text-gray-300">
          <li>Rephrasing your prompt</li>
          <li>
            Adding more context (e.g., "Make a script for a Roblox part that changes color when touched, and only works for players with a certain badge.")
          </li>
          <li>Specifying what you want the script to do, step by step</li>
        </ul>
      </div>

      <p className="text-gray-300">
        Some scripts may need manual tweaks or debugging—don't hesitate to ask the AI for help fixing errors!
      </p>

      <div className="bg-blue-900 bg-opacity-30 p-4 rounded-lg">
        <p className="text-blue-300 font-semibold">
          Remember: AI is a powerful tool, but it's not perfect. Experiment, iterate, and have fun!
        </p>
      </div>
    </div>
  );
}

// Step 3: Edit & Customize
function EditCustomizeStep() {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <div className="bg-green-900 bg-opacity-50 p-2 rounded-lg">
          <Code className="w-6 h-6 text-green-400" />
        </div>
        <h2 className="text-2xl font-bold text-white">
          Step 3: Edit & Customize with AI
        </h2>
      </div>

      <h3 className="text-xl font-semibold text-green-300">
        You're in control—edit, improve, and build on your scripts!
      </h3>

      <div className="space-y-3">
        <p className="text-gray-300">
          You can use the AI to add new features, fix bugs, or change how your script works.
        </p>
        <p className="text-gray-300">
          Paste your existing code and describe what you want to change.
        </p>
      </div>

      <div className="space-y-3">
        <p className="text-gray-300">The AI can help you:</p>
        <ul className="list-disc pl-6 space-y-2 text-gray-300">
          <li>Add new functionality ("Add a leaderboard to this script")</li>
          <li>Fix errors ("Fix the bug where the script doesn't reset the timer")</li>
          <li>Refactor or optimize code ("Make this script more efficient and readable")</li>
        </ul>
      </div>

      <p className="text-gray-300">
        You can repeat this process as many times as you like—iterate until your script is just right!
      </p>

      <div className="bg-blue-900 bg-opacity-30 p-4 rounded-lg flex items-start">
        <div className="text-blue-400 mr-3 mt-1">
          <MessageSquare className="w-5 h-5" />
        </div>
        <p className="text-blue-300">
          <span className="font-semibold">Tip:</span> The more specific your instructions, the better the AI can help.
        </p>
      </div>
    </div>
  );
}

// Step 4: Privacy & Safety
function PrivacyStep() {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <div className="bg-red-900 bg-opacity-50 p-2 rounded-lg">
          <Shield className="w-6 h-6 text-red-400" />
        </div>
        <h2 className="text-2xl font-bold text-white">
          Step 4: Privacy & Safety
        </h2>
      </div>

      <h3 className="text-xl font-semibold text-red-300">
        Your security and privacy matter.
      </h3>

      <ul className="space-y-4">
        <li className="flex items-start">
          <div className="bg-gray-800 p-1 rounded-full mr-3 mt-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
          </div>
          <p className="text-gray-300">
            Your prompts and generated scripts are stored securely and are only visible to you.
          </p>
        </li>

        <li className="flex items-start">
          <div className="bg-gray-800 p-1 rounded-full mr-3 mt-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
          </div>
          <p className="text-gray-300">
            Never share sensitive personal information (like passwords, emails, or private game data) in your prompts.
          </p>
        </li>

        <li className="flex items-start">
          <div className="bg-gray-800 p-1 rounded-full mr-3 mt-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
          </div>
          <p className="text-gray-300">
            Always review and test scripts before using them in your Roblox games—especially if you're sharing them with others.
          </p>
        </li>

        <li className="flex items-start">
          <div className="bg-gray-800 p-1 rounded-full mr-3 mt-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
          </div>
          <p className="text-gray-300">
            If you see anything suspicious or unsafe, please report it immediately.
          </p>
        </li>
      </ul>

      <div className="bg-red-900 bg-opacity-30 p-4 rounded-lg">
        <p className="text-red-300 font-semibold">
          Stay safe, and help us keep NexusRBX a positive, creative space!
        </p>
      </div>
    </div>
  );
}

// Step 5: Final Step
function FinalStep() {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <div className="bg-yellow-900 bg-opacity-50 p-2 rounded-lg">
          <Zap className="w-6 h-6 text-yellow-400" />
        </div>
        <h2 className="text-2xl font-bold text-white">Step 5: Happy Hacking!</h2>
      </div>

      <h3 className="text-xl font-semibold text-yellow-300">
        You're ready to create!
      </h3>

      <p className="text-gray-300">
        NexusRBX AI Console is here to help you bring your Roblox ideas to life—whether you're a beginner or a pro.
      </p>

      <ul className="list-disc pl-6 space-y-2 text-gray-300">
        <li>Generate new scripts</li>
        <li>Edit and improve existing ones</li>
        <li>Experiment, learn, and have fun</li>
      </ul>

      <div className="bg-gradient-to-r from-blue-900 to-purple-900 p-6 rounded-lg text-center border border-blue-700">
        <h3 className="text-white text-xl font-bold mb-2">Happy hacking!</h3>
        <p className="text-blue-200">Click Finish to get started.</p>
      </div>

      <p className="text-sm text-gray-500 italic">
        (You won't see this onboarding again, but you can revisit it anytime from the settings menu.)
      </p>
    </div>
  );
}
