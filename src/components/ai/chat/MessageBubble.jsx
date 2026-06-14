import React from "react";
import { UserAvatar } from "../AiComponents";
import AssistantBubble from "./AssistantBubble";

export default function MessageBubble({
  message: m,
  user,
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
      <div className="flex justify-end gap-3.5 group animate-fade-in-up">
        <div className="max-w-[70%] md:max-w-[60%] order-1">
          <div className="px-4 py-3 md:px-5 md:py-4 rounded-2xl2 rounded-tr-md bg-gradient-to-br from-white/[0.09] to-white/[0.03] border border-white/10 backdrop-blur-xl shadow-panel">
            <div className="text-[15px] md:text-[16px] whitespace-pre-wrap leading-relaxed text-white font-medium">
              {m.content}
            </div>
          </div>
        </div>
        <UserAvatar email={user?.email} />
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
