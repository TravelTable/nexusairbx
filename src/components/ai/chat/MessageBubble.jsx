import React from "react";
import AssistantBubble from "./AssistantBubble";
import MessageActions from "./MessageActions";

function MessageAttachments({ attachments }) {
  if (!Array.isArray(attachments) || attachments.length === 0) return null;

  return (
    <div className="mb-2 flex flex-wrap justify-end gap-1.5">
      {attachments.map((attachment, index) => {
        const name = attachment?.name || `Attachment ${index + 1}`;
        const source = attachment?.data || attachment?.url || "";
        if (attachment?.isImage && source) {
          return (
            <img
              key={`${name}-${index}`}
              src={source}
              alt={name}
              className="h-20 max-w-40 rounded-lg border border-[var(--ds-border-subtle)] object-cover"
            />
          );
        }
        return (
          <span
            key={`${name}-${index}`}
            className="max-w-52 truncate rounded-md border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] px-2 py-1 text-[11px] text-[var(--ds-text-secondary)]"
            title={name}
          >
            {name}
          </span>
        );
      })}
    </div>
  );
}

export default function MessageBubble({
  message: m,
  activeMode,
  grouped = false,
  retryPrompt = "",
  retrySourceMessage = null,
  retryRunId = null,
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
  onEditMessage,
  onRetryMessage,
}) {
  if (m.role === "user") {
    return (
      <div className="group/message flex w-full justify-end">
        <div className="max-w-[88%] sm:max-w-[68%]">
          <MessageAttachments attachments={m.attachments} />
          <div className="rounded-[12px_12px_4px_12px] border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-hover)] px-3.5 py-[11px]">
            <div className="whitespace-pre-wrap text-[15px] font-normal leading-relaxed text-[var(--ds-text)]">
              {m.content}
            </div>
          </div>
          <MessageActions
            role="user"
            text={m.content}
            message={m}
            retryPrompt={m.content}
            retrySourceMessage={m}
            retryRunId={retryRunId}
            onEdit={onEditMessage}
            onRetry={onRetryMessage}
          />
        </div>
      </div>
    );
  }

  return (
    <AssistantBubble
      message={m}
      activeMode={activeMode}
      grouped={grouped}
      retryPrompt={retryPrompt}
      retrySourceMessage={retrySourceMessage}
      retryRunId={retryRunId}
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
      onRetryMessage={onRetryMessage}
    />
  );
}
