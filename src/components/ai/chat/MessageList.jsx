import React, { useMemo } from "react";
import { NexusRBXAvatar, SkeletonArtifact } from "../AiComponents";
import MarkdownMessage from "./MarkdownMessage";
import { stripTags } from "./stripTags";
import MessageBubble from "./MessageBubble";
import LiveWorkStream from "./LiveWorkStream";
import ReasoningPanel from "./ReasoningPanel";
import { parsePendingStreamContent } from "../../../lib/streaming";
import { Separator } from "../../shadcn/separator";
import { RotateCcw } from "lib/icons";
import { getAssistantTurnIdentity, reconcileAssistantTurns } from "../../../lib/assistantTurnIdentity";
import AnimatedStatusText from "./AnimatedStatusText";
import RunContextBar from "./RunContextBar";
import "./ChatMotion.css";

export function groupMessagesByRole(messages = []) {
  return messages.reduce((groups, message) => {
    const role = message?.role === "user" ? "user" : "assistant";
    const lastGroup = groups[groups.length - 1];
    if (lastGroup?.role === role) {
      lastGroup.messages.push(message);
    } else {
      groups.push({ role, messages: [message] });
    }
    return groups;
  }, []);
}

function AssistantIdentity({ activeMode, working = false }) {
  return (
    <div className="flex h-7 items-center gap-2.5">
      <NexusRBXAvatar compact isThinking={working} mode={activeMode} />
      <span className="text-[13px] font-semibold text-gray-300">Nexus</span>
    </div>
  );
}

function resolveActivityStage(pendingMessage, generationStage, parsed) {
  const stage = pendingMessage?.stage || generationStage || "";
  if (stage) return stage;
  if (parsed?.code) return "Writing code...";
  if (parsed?.explanation || pendingMessage?.streamState?.hasVisibleOutput) return "Generating response...";
  return "Understanding your task...";
}

/**
 * Compact, live status header shown while the agent works. The actual progress
 * (thoughts, commands/actions, and text/code) streams in below this header via
 * the thinking disclosure, the agent step log, and the content block — so this
 * header only reflects the current live stage, not a fixed checklist.
 */
function LiveActivityHeader({ pendingMessage, generationStage, parsed, embedded = false }) {
  const stage = resolveActivityStage(pendingMessage, generationStage, parsed);
  const isRecovering = String(stage).toLowerCase().includes("recovering");

  return (
    <div className={embedded ? "flex items-center gap-2 px-4 py-2.5" : "flex min-h-7 items-center gap-2"}>
      <span className="sr-only">Nexus is working</span>
      <span className="shrink-0 text-sm text-[#00f5d4]" aria-hidden="true">
        {isRecovering ? <RotateCcw className="h-3.5 w-3.5 animate-spin" /> : "◌"}
      </span>
      <AnimatedStatusText
        value={stage}
        className="min-w-0 break-words text-sm text-gray-300"
      />
    </div>
  );
}

function SingleMessageList({
  messages,
  pendingMessage: pendingMessageProp,
  user,
  profile,
  activeMode,
  generationStage,
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
  onSelectStudioTarget,
  selectingStudioTargetId,
  onEditMessage,
  onRetryMessage,
  hideMessages = false,
  arrivalMessageId = null,
}) {
  // Firestore can publish the completed assistant message one render before the
  // orchestration cleanup runs. This remains a local guard for call sites that
  // render a single pending row outside the normalized list below.
  const pendingMessage = useMemo(() => {
    const pendingKey = getAssistantTurnIdentity(pendingMessageProp);
    if (!pendingKey) return pendingMessageProp;
    const hasCompletedResponse = messages.some(
      (message) =>
        message.role === "assistant" &&
        !message.pending &&
        getAssistantTurnIdentity(message) === pendingKey
    );
    return hasCompletedResponse ? null : pendingMessageProp;
  }, [messages, pendingMessageProp]);
  const pendingParsed = parsePendingStreamContent(pendingMessage?.content || "");
  const showLiveWorkStream = Boolean(
    pendingMessage?.targetSelection ||
    pendingMessage?.streamState ||
    (Array.isArray(pendingMessage?.files) && pendingMessage.files.length) ||
    (Array.isArray(pendingMessage?.steps) && pendingMessage.steps.length)
  );
  // Real output = files/steps or non-thinking activity. Used to auto-collapse the
  // reasoning stream once the model starts producing results.
  const streamState = pendingMessage?.streamState;
  const hasStreamOutput = Boolean(
    (Array.isArray(streamState?.files) && streamState.files.length) ||
    (Array.isArray(pendingMessage?.files) && pendingMessage.files.length) ||
    (Array.isArray(pendingMessage?.steps) && pendingMessage.steps.length) ||
    (Array.isArray(streamState?.activity) &&
      streamState.activity.some((a) => a?.type && a.type !== "thinking"))
  );
  const hasRawReasoning = Boolean(String(streamState?.rawReasoning || "").trim());
  const reasoningStreaming = Boolean(pendingMessage) && !hasStreamOutput;
  const visibleMessages = useMemo(
    () => hideMessages
      ? []
      :
      getAssistantTurnIdentity(pendingMessage)
        ? messages.filter((m) => !(
          m.pending &&
          getAssistantTurnIdentity(m) === getAssistantTurnIdentity(pendingMessage)
        ))
        : messages,
    [hideMessages, messages, pendingMessage]
  );
  const messageGroups = useMemo(() => {
    let retryPrompt = "";
    let retrySourceMessage = null;
    return groupMessagesByRole(visibleMessages).map((group) => {
      if (group.role === "user") {
        retrySourceMessage = group.messages[group.messages.length - 1] || null;
        retryPrompt = String(retrySourceMessage?.content || "").trim();
      }
      return { ...group, retryPrompt, retrySourceMessage };
    });
  }, [visibleMessages]);

  // Generation pending carries `prompt` for instant feedback before Firestore syncs.
  // Once the persisted user message arrives, hide the optimistic bubble to avoid doubles.
  const showOptimisticUserPrompt = useMemo(() => {
    const prompt = String(pendingMessage?.prompt || "").trim();
    if (!prompt) return false;
    if (
      pendingMessage?.requestId &&
      messages.some((m) => m.role === "user" && m.requestId === pendingMessage.requestId)
    ) {
      return false;
    }
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (lastUser && String(lastUser.content || "").trim() === prompt) return false;
    return true;
  }, [messages, pendingMessage?.prompt, pendingMessage?.requestId]);

  return (
    <div className="space-y-5">
      {messageGroups.map((group, groupIndex) => (
        <div
          key={`${group.role}-${group.messages[0]?.id || groupIndex}`}
          className={[
            group.role === "user"
              ? "mx-auto w-full max-w-[840px]"
              : "mx-auto w-full max-w-[1080px]",
            group.messages.some((message) => String(message?.id || "") === arrivalMessageId)
              ? "nexus-message-arrival"
              : "",
          ].filter(Boolean).join(" ")}
          data-message-group={group.role}
        >
          {group.role === "assistant" ? (
            <div className="mb-2 w-full max-w-[840px]">
              <AssistantIdentity activeMode={activeMode} />
            </div>
          ) : null}
          <div className={group.role === "assistant" ? "space-y-1.5 pl-9" : "space-y-1.5"}>
            {group.messages.map((m) => (
              <React.Fragment key={m.id}>
                {group.role === "assistant" && m.decision ? (
                  <RunContextBar decision={m.decision} />
                ) : null}
                <MessageBubble
                  message={m}
                  user={user}
                  profile={profile}
                  activeMode={activeMode}
                  grouped={group.role === "assistant"}
                  retryPrompt={group.retryPrompt}
                  retrySourceMessage={group.retrySourceMessage}
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
                  onEditMessage={onEditMessage}
                  onRetryMessage={onRetryMessage}
                />
              </React.Fragment>
            ))}
          </div>
        </div>
      ))}

      {pendingMessage && (
        <>
          {showOptimisticUserPrompt ? (
            <div className="nexus-message-arrival mx-auto w-full max-w-[840px]">
              <MessageBubble
                message={{
                  id: `optimistic-${pendingMessage.requestId || "message"}`,
                  role: "user",
                  content: String(pendingMessage.prompt || "").trim(),
                  attachments: pendingMessage.attachments,
                }}
                onEditMessage={onEditMessage}
                onRetryMessage={onRetryMessage}
              />
            </div>
          ) : null}

          <div className="nexus-message-arrival mx-auto w-full max-w-[1080px]">
            <AssistantIdentity activeMode={activeMode} working />
            <div className="mt-2 space-y-3 pl-9">
              {pendingMessage.decision ? (
                <RunContextBar decision={pendingMessage.decision} />
              ) : null}
              {showLiveWorkStream ? (
                <div className="w-full max-w-[840px] overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.025]">
                  <div className="px-4 pt-3">
                    <ReasoningPanel
                      text={streamState?.rawReasoning}
                      isStreaming={reasoningStreaming}
                      requireRawReasoningFlag
                    />
                  </div>
                  {hasRawReasoning ? <Separator className="bg-white/10" /> : null}
                  <LiveWorkStream
                    pendingMessage={pendingMessage}
                    generationStage={generationStage}
                    onApproveStep={onApproveStep}
                    approvingStepId={approvingStepId}
                    onSelectStudioTarget={onSelectStudioTarget}
                    selectingStudioTargetId={selectingStudioTargetId}
                    embedded
                    hideThinkingRows={hasRawReasoning}
                  />
                </div>
              ) : (
                <>
                  <ReasoningPanel
                    text={streamState?.rawReasoning}
                    isStreaming={reasoningStreaming}
                    requireRawReasoningFlag
                  />
                  <LiveActivityHeader
                    pendingMessage={pendingMessage}
                    generationStage={generationStage}
                    parsed={pendingParsed}
                  />
                </>
              )}

              {pendingMessage.content && !showLiveWorkStream ? (
                <div className="nexus-streaming-caret w-full max-w-[840px] space-y-4">
                  {pendingParsed.hasStructured ? (
                    <div className="space-y-4">
                      {pendingParsed.code && (
                        <div className="rounded-2xl border border-white/10 bg-black/40 overflow-hidden">
                          <div className="px-3 py-2 border-b border-white/5 text-[10px] font-black uppercase tracking-widest text-gray-500">
                            Streaming Code
                          </div>
                          <pre className="p-4 text-[12px] leading-relaxed text-gray-300 whitespace-pre overflow-x-auto scrollbar-subtle">
                            {pendingParsed.code}
                          </pre>
                        </div>
                      )}
                      {pendingParsed.plain && (
                        <MarkdownMessage text={pendingParsed.plain} className="text-gray-300" />
                      )}
                    </div>
                  ) : (
                    <MarkdownMessage text={stripTags(pendingMessage.content)} />
                  )}
                  {pendingMessage.type === "ui" && <SkeletonArtifact type="ui" />}
                  {pendingMessage.type === "chat" &&
                    (pendingMessage.content?.includes("```") || pendingParsed.code) && (
                      <SkeletonArtifact type="code" />
                    )}
                </div>
              ) : null}
              {pendingMessage.type === "ui" && !pendingMessage.content && !showLiveWorkStream && <SkeletonArtifact type="ui" />}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function MessageList({ pendingMessage, pendingMessages, messages = [], ...props }) {
  const keylessRenderKeys = React.useRef(new WeakMap());
  const keylessRenderSequence = React.useRef(0);
  const knownMessageIdsRef = React.useRef(
    new Set(messages.map((message) => String(message?.id || "")).filter(Boolean))
  );
  const [arrivalMessageId, setArrivalMessageId] = React.useState(null);
  const normalizedPendingMessages = useMemo(() => reconcileAssistantTurns([
    ...(Array.isArray(pendingMessages) ? pendingMessages : []),
    ...(pendingMessage ? [pendingMessage] : []),
  ]), [pendingMessage, pendingMessages]);
  const completedAssistantTurnKeys = useMemo(() => new Set(
    messages
      .filter((message) => message.role === "assistant" && !message.pending)
      .map(getAssistantTurnIdentity)
      .filter(Boolean)
  ), [messages]);
  const activePendingAssistantTurnKeys = useMemo(() => new Set(
    normalizedPendingMessages.map(getAssistantTurnIdentity).filter(Boolean)
  ), [normalizedPendingMessages]);
  const visibleMessages = useMemo(() => messages.filter((message) => {
    const key = getAssistantTurnIdentity(message);
    return !(
      message.role === "assistant" &&
      message.pending &&
      key &&
      activePendingAssistantTurnKeys.has(key)
    );
  }), [activePendingAssistantTurnKeys, messages]);
  const visiblePendingMessages = useMemo(() => normalizedPendingMessages.filter((message) => {
    const key = getAssistantTurnIdentity(message);
    return !key || !completedAssistantTurnKeys.has(key);
  }), [completedAssistantTurnKeys, normalizedPendingMessages]);

  React.useEffect(() => {
    const currentIds = messages
      .map((message) => String(message?.id || ""))
      .filter(Boolean);
    const additions = currentIds.filter((id) => !knownMessageIdsRef.current.has(id));
    knownMessageIdsRef.current = new Set(currentIds);

    if (!additions.length) return undefined;
    setArrivalMessageId(additions[additions.length - 1]);
    const timer = window.setTimeout(() => setArrivalMessageId(null), 200);
    return () => window.clearTimeout(timer);
  }, [messages]);

  const pendingRenderKey = (message) => {
    const identity = getAssistantTurnIdentity(message);
    if (identity) return identity;
    if (!keylessRenderKeys.current.has(message)) {
      keylessRenderSequence.current += 1;
      keylessRenderKeys.current.set(message, `keyless-pending:${keylessRenderSequence.current}`);
    }
    return keylessRenderKeys.current.get(message);
  };

  return (
    <div className="space-y-5">
      <SingleMessageList
        {...props}
        messages={visibleMessages}
        pendingMessage={null}
        arrivalMessageId={arrivalMessageId}
      />
      {visiblePendingMessages.map((message) => (
        <SingleMessageList
          {...props}
          key={pendingRenderKey(message)}
          messages={visibleMessages}
          hideMessages
          pendingMessage={message}
        />
      ))}
    </div>
  );
}
