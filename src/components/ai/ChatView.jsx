import React from "react";
import { useBilling } from "../../context/BillingContext";
import { CHAT_MODES } from "./chatConstants";
import ChatEmptyState from "./chat/ChatEmptyState";
import MessageList from "./chat/MessageList";
import TeamShareModal from "./chat/TeamShareModal";

export { CHAT_MODES };

export default function ChatView({
  messages,
  pendingMessage,
  generationStage,
  user,
  activeMode = "general",
  customModes = [],
  onModeChange,
  onCreateCustomMode,
  onEditCustomMode,
  onInstallCommunityMode,
  onViewUi,
  onQuickStart,
  onRefine,
  onToggleActMode,
  onPlanUI,
  onPlanSystem,
  onExecuteTask,
  onPushToStudio,
  onFixUiAudit,
  onShareWithTeam,
  teams = [],
  currentTaskId,
  chatEndRef,
}) {
  const { entitlements } = useBilling();
  const isPremium = entitlements?.includes("pro") || entitlements?.includes("team");
  const [modeTab, setModeTab] = React.useState("official");
  const [communityModes, setCommunityModes] = React.useState([]);
  const [loadingCommunity, setLoadingCommunity] = React.useState(false);
  const [copiedId, setCopiedId] = React.useState(null);
  const [sharingId, setSharingId] = React.useState(null);

  const fetchCommunityModes = React.useCallback(async () => {
    setLoadingCommunity(true);
    try {
      const { collection, getDocs, query, limit, orderBy } = await import("firebase/firestore");
      const { db } = await import("../../firebase");
      const q = query(
        collection(db, "community_modes"),
        orderBy("updatedAt", "desc"),
        limit(20)
      );
      const snap = await getDocs(q);
      setCommunityModes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Failed to fetch community modes:", err);
    } finally {
      setLoadingCommunity(false);
    }
  }, []);

  const handleShareWithTeam = (artifactId, type, teamId) => {
    onShareWithTeam?.(artifactId, type, teamId);
    setSharingId(null);
  };

  const showEmpty = messages.length === 0 && !pendingMessage;

  return (
    <div className="w-full max-w-5xl mx-auto h-full flex flex-col">
      {showEmpty ? (
        <ChatEmptyState
          activeMode={activeMode}
          modeTab={modeTab}
          setModeTab={setModeTab}
          onModeChange={onModeChange}
          customModes={customModes}
          onCreateCustomMode={onCreateCustomMode}
          onEditCustomMode={onEditCustomMode}
          onInstallCommunityMode={onInstallCommunityMode}
          onToggleActMode={onToggleActMode}
          onPlanUI={onPlanUI}
          onPlanSystem={onPlanSystem}
          communityModes={communityModes}
          loadingCommunity={loadingCommunity}
          fetchCommunityModes={fetchCommunityModes}
          user={user}
          isPremium={isPremium}
        />
      ) : (
        <MessageList
          messages={messages}
          pendingMessage={pendingMessage}
          user={user}
          activeMode={activeMode}
          generationStage={generationStage}
          currentTaskId={currentTaskId}
          chatEndRef={chatEndRef}
          copiedId={copiedId}
          setCopiedId={setCopiedId}
          setSharingId={setSharingId}
          onModeChange={onModeChange}
          onToggleActMode={onToggleActMode}
          onExecuteTask={onExecuteTask}
          onViewUi={onViewUi}
          onQuickStart={onQuickStart}
          onRefine={onRefine}
          onPushToStudio={onPushToStudio}
          onFixUiAudit={onFixUiAudit}
        />
      )}

      <TeamShareModal
        sharingId={sharingId}
        onClose={() => setSharingId(null)}
        messages={messages}
        teams={teams}
        onShareWithTeam={handleShareWithTeam}
      />
    </div>
  );
}
