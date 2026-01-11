import React from "react";
import { useNavigate } from "react-router-dom";
import PlanBadge from "./PlanBadge";

function PlanWelcomeCard({ isSubscriber, planKey, planInfo }) {
  const navigate = useNavigate();

  if (isSubscriber) {
    return (
      <div className="w-full max-w-2xl mx-auto bg-gray-900/80 border border-gray-800 rounded-2xl shadow-lg p-8 flex flex-col items-center text-center animate-fade-in">
        <div className="mb-2">
          <PlanBadge plan={planKey} />
        </div>
        <div className="text-2xl font-bold mb-2 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">
          {planInfo.welcome}
        </div>
        <div className="text-gray-300 mb-4">{planInfo.welcomeTokens}</div>
      </div>
    );
  }
  return (
    <div className="w-full max-w-2xl mx-auto bg-gray-900/80 border border-gray-800 rounded-2xl shadow-lg p-8 flex flex-col items-center text-center animate-fade-in">
      <div className="mb-2">
        <PlanBadge plan={planKey} />
      </div>
      <div className="text-2xl font-bold mb-2 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-transparent bg-clip-text">
        {planInfo.welcome}
      </div>
      <div className="text-gray-300 mb-4">{planInfo.welcomeTokens}</div>
      <button
        type="button"
        className="px-4 py-2 rounded bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] text-white font-semibold shadow hover:scale-105 transition-transform"
        onClick={() => navigate("/subscribe")}
      >
        {planInfo.welcomeCta}
      </button>
    </div>
  );
}

export default PlanWelcomeCard;
