import React from "react";
import { UserAvatar } from "../AiComponents";
import AssistantBubble from "./AssistantBubble";

export default function MessageBubble({
  message: m,
  user,
  profile,
  activeMode,
  onViewUi,
  onRefine,
  onFixUiAudit,
  onApprovePlan,
  onClarifySubmit,
  onEditPlan,
  notify,
  isBusy,
  onApproveStep,
  approvingStepId,
}) {
  if (m.role === "user") {
    return (
      <div className="flex justify-end gap-3.5 group motion-safe:animate-fade-in-up">
        <div className="order-1 max-w-[680px]">
          <div className="rounded-[22px] rounded-tr-lg border border-white/[0.08] bg-gradient-to-br from-white/[0.11] via-white/[0.065] to-[#00f5d4]/[0.045] px-4 py-3.5 shadow-[0_14px_36px_-26px_rgba(0,245,212,0.5)] backdrop-blur-xl">
            <div className="whitespace-pre-wrap text-[15px] font-medium leading-7 text-white">
              {m.content}
            </div>
          </div>
        </div>
        <UserAvatar
          email={user?.email}
          name={profile?.name || profile?.preferred_username || user?.displayName || ""}
          photoUrl={profile?.picture || user?.photoURL || ""}
        />
      </div>
    );
  }

  return (
    <AssistantBubble
      message={m}
      activeMode={activeMode}
      user={user}
      onViewUi={onViewUi}
      onRefine={onRefine}
      onFixUiAudit={onFixUiAudit}
      onApprovePlan={onApprovePlan}
      onClarifySubmit={onClarifySubmit}
      onEditPlan={onEditPlan}
      notify={notify}
      isBusy={isBusy}
      onApproveStep={onApproveStep}
      approvingStepId={approvingStepId}
    />
  );
}
