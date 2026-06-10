import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
  doc,
} from "firebase/firestore";

import { auth, db } from "../../firebase";
import { useBilling } from "../../context/BillingContext";
import { useSettings } from "../../context/SettingsContext";
import { useUnifiedChat } from "../../hooks/useUnifiedChat";
import { useGameProfile } from "../../hooks/useGameProfile";
import { useAiScripts } from "../../hooks/useAiScripts";
import { CHAT_MODES } from "../../components/ai/chatConstants";
import { AI_PAGE_V2_ENABLED } from "../../config";
import { BACKEND_URL } from "../../lib/uiBuilderApi";
import { AI_EVENTS, emitAiEvent, onAiEvent } from "../../lib/aiEvents";
import { createAiTelemetryClient } from "../../lib/aiTelemetry";
import { useAiNotifications } from "./useAiNotifications";

const IS_AI_PAGE_V2_ENABLED = AI_PAGE_V2_ENABLED;

const MODE_COLORS = {
  general: { primary: "#9b5de5", secondary: "#00f5d4" },
  ui: { primary: "#00f5d4", secondary: "#9b5de5" },
  logic: { primary: "#9b5de5", secondary: "#f15bb5" },
  system: { primary: "#00bbf9", secondary: "#00f5d4" },
  animator: { primary: "#f15bb5", secondary: "#fee440" },
  data: { primary: "#fee440", secondary: "#00f5d4" },
  performance: { primary: "#00f5d4", secondary: "#00bbf9" },
  security: { primary: "#ff006e", secondary: "#8338ec" },
};

export function useAiWorkspaceController() {
  const { plan, totalRemaining, subRemaining, paygRemaining, subLimit, resetsAt, refresh: refreshBilling, entitlements } = useBilling();
  const { settings, updateSettings } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState(null);
  const [scripts, setScripts] = useState([]);
  const [scriptsLimit] = useState(50);
  const [activeTab, setActiveTab] = useState("chat");
  const [mobileTab, setMobileTab] = useState("chat");
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth < 1024 : false);
  const [sidebarOpen, setSidebarOpen] = useState(typeof window !== "undefined" ? window.innerWidth > 1024 : true);

  const [prompt, setPrompt] = useState("");
  const [isImproving, setIsImproving] = useState(false);
  const [refineTarget, setRefineTarget] = useState(null);
  const [showSignInNudge, setShowSignInNudge] = useState(false);
  const [showProNudge, setShowProNudge] = useState(false);
  const [proNudgeReason, setProNudgeReason] = useState("");
  const [projectContext, setProjectContext] = useState(null);
  const [architecturePanelOpen, setArchitecturePanelOpen] = useState(false);
  const [teams, setTeams] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [codeDrawerOpen, setCodeDrawerOpen] = useState(false);
  const [codeDrawerData, setCodeDrawerData] = useState({ code: "", title: "", explanation: "" });
  const [templateGalleryOpen, setTemplateGalleryOpen] = useState(false);

  const chatEndRef = useRef(null);
  const pageViewTrackedRef = useRef(false);
  const lastArtifactTrackedRef = useRef(null);
  const telemetryRef = useRef(null);

  const {
    notify: queueNotify,
    toasts,
    currentToast,
    dismissToast,
  } = useAiNotifications();

  const notify = useCallback((payload) => {
    queueNotify(payload || {});
  }, [queueNotify]);

  const isPremium = entitlements?.includes("pro") || entitlements?.includes("team");
  const planKey = plan?.toLowerCase() || "free";

  const handleSidebarTabChange = useCallback(() => {
    setActiveTab("chat");
  }, []);

  const handleSuggestAssets = useCallback(
    async (promptContext, uiRef) => {
      if (!user) return;
      try {
        const token = await user.getIdToken();
        const res = await fetch(`${BACKEND_URL}/api/ui-builder/ai/suggest-image-queries`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            items: uiRef?.activeUi?.boardState?.items || [],
            boardPrompt: promptContext,
          }),
        });
        if (!res.ok) throw new Error("Asset suggestion request failed");

        const out = await res.json();
        const msg =
          out?.suggestions?.length > 0
            ? out.suggestions.map((s) => `${s.itemId}: ${s.queries.join(", ")}`).join(" | ")
            : "No suggestions returned.";
        notify({ message: msg, type: "info" });
      } catch (err) {
        notify({ message: "Asset suggestion failed", type: "error" });
      }
    },
    [user, notify]
  );

  const handleUiAudit = useCallback(
    async (uiRef) => {
      if (!user) return;
      try {
        const token = await user.getIdToken();
        const res = await fetch(`${BACKEND_URL}/api/ui-builder/ai/audit`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ boardState: uiRef?.activeUi?.boardState || null }),
        });
        if (!res.ok) throw new Error("Audit request failed");

        const out = await res.json();
        const msg =
          out?.audit?.score !== undefined
            ? `Audit score: ${out.audit.score}. Issues: ${out.audit.issues.map((i) => i.message).join(" | ")}`
            : "Audit returned no score.";
        notify({ message: msg, type: "info" });
      } catch (err) {
        notify({ message: "Audit failed", type: "error" });
      }
    },
    [user, notify]
  );

  const unified = useUnifiedChat(user, settings, refreshBilling, notify, {
    onSignInNudge: () => setShowSignInNudge(true),
    isPremium,
  });

  const chat = unified;
  const ui = unified.ui;
  const game = useGameProfile(settings, updateSettings);
  const scriptManager = useAiScripts(user, notify);

  const activeModeData = useMemo(
    () => CHAT_MODES.find((m) => m.id === chat.activeMode) || CHAT_MODES[0],
    [chat.activeMode]
  );

  const currentTheme = useMemo(
    () => MODE_COLORS[chat.activeMode] || MODE_COLORS.general,
    [chat.activeMode]
  );

  const track = useCallback((event, metadata = {}) => {
    telemetryRef.current?.track({
      event,
      chatId: chat.currentChatId || undefined,
      mode: chat.activeMode,
      surface: "ai_page",
      metadata,
    });
  }, [chat.activeMode, chat.currentChatId]);

  useEffect(() => {
    telemetryRef.current?.destroy?.();
    telemetryRef.current = createAiTelemetryClient({
      enabled: IS_AI_PAGE_V2_ENABLED,
      getToken: async () => {
        if (!user) return null;
        return user.getIdToken();
      },
    });

    return () => {
      telemetryRef.current?.destroy?.();
      telemetryRef.current = null;
    };
  }, [user]);

  useEffect(() => {
    if (pageViewTrackedRef.current) return;
    pageViewTrackedRef.current = true;
    track("ai_page_view", { route: "/ai" });
  }, [track]);

  useEffect(() => {
    const last = [...chat.messages].reverse().find(
      (m) =>
        m.role === "assistant" &&
        (m.projectId || m.artifactId || m.code || m.uiModuleLua)
    );
    if (!last || last.id === lastArtifactTrackedRef.current) return;

    lastArtifactTrackedRef.current = last.id;
    track("artifact_generated", {
      artifactType: last.metadata?.type || (last.projectId ? "ui" : "code"),
      hasQaReport: !!last.metadata?.qaReport,
    });
  }, [chat.messages, track]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) setMobileTab("chat");
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser || null);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setScripts([]);
      return;
    }

    const q = query(
      collection(db, "users", user.uid, "scripts"),
      orderBy("updatedAt", "desc"),
      limit(scriptsLimit)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          updatedAt: d.data().updatedAt?.toMillis?.() || Date.now(),
          createdAt: d.data().createdAt?.toMillis?.() || Date.now(),
        }));
        setScripts(list);
      },
      (err) => {
        notify({ message: "Failed to sync scripts library", type: "error" });
      }
    );

    return () => unsub();
  }, [user, scriptsLimit, notify]);

  useEffect(() => {
    if (location?.state?.initialPrompt) {
      setPrompt(location.state.initialPrompt);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  useEffect(() => {
    const unbindStartDraft = onAiEvent(AI_EVENTS.START_DRAFT, () => {
      chat.startNewChat();
      setActiveTab("chat");
    });

    const unbindOpenCodeDrawer = onAiEvent(AI_EVENTS.OPEN_CODE_DRAWER, (e) => {
      const { code, title, explanation } = e.detail || {};
      setCodeDrawerData({ code: code || "", title: title || "", explanation: explanation || "" });
      setCodeDrawerOpen(true);
    });

    const unbindSaveScript = onAiEvent(AI_EVENTS.SAVE_SCRIPT, async (e) => {
      if (!isPremium) {
        setProNudgeReason("Saved Scripts Library");
        setShowProNudge(true);
        return;
      }

      const { name, code } = e.detail || {};
      await scriptManager.handleCreateScript(name, code, "logic");
      notify({ message: `Saved ${name} to library`, type: "success" });
      track("artifact_action_used", { action: "save_script" });
    });

    return () => {
      unbindStartDraft();
      unbindOpenCodeDrawer();
      unbindSaveScript();
    };
  }, [chat, isPremium, notify, scriptManager, track]);

  // Review stage: auto-open the preview when a UI artifact finishes generating.
  useEffect(() => {
    const unbind = onAiEvent(AI_EVENTS.UI_GENERATED, () => {
      ui.setUiDrawerOpen(true);
      if (typeof window !== "undefined" && window.innerWidth < 1024) setMobileTab("preview");
    });
    return () => unbind();
  }, [ui]);

  useEffect(() => {
    if (!user) return;

    const unsubUser = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) {
        setProjectContext(snap.data().projectContext || null);
      }
    });

    const fetchTeams = async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch(`${BACKEND_URL}/api/user/teams`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        setTeams(data.teams || []);
      } catch (e) {
        // best-effort
      }
    };

    fetchTeams();
    return () => unsubUser();
  }, [user]);

  const handlePromptSubmit = useCallback(async (e, overridePrompt = null) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault();

    const currentPrompt = (overridePrompt ?? prompt).trim();
    const currentAttachments = [...attachments];

    if (!currentPrompt && currentAttachments.length === 0) return;

    if (activeTab !== "chat") setActiveTab("chat");
    setPrompt("");
    setAttachments([]);

    // Refine loop: if a refine target is active, regenerate that artifact directly
    // instead of starting a new orchestration turn.
    if (refineTarget) {
      const target = refineTarget;
      setRefineTarget(null);
      track("artifact_action_used", { action: "refine_submit" });
      await unified.refineArtifact(target, currentPrompt);
      return;
    }

    track("prompt_submitted", {
      attachments: currentAttachments.length,
      length: currentPrompt.length,
    });

    await unified.handleSubmit(currentPrompt, currentAttachments);
  }, [
    prompt,
    attachments,
    activeTab,
    refineTarget,
    unified,
    track,
  ]);

  const handleStartRefine = useCallback((message) => {
    setRefineTarget(message || null);
    setActiveTab("chat");
  }, []);

  const cancelRefine = useCallback(() => setRefineTarget(null), []);

  const handleImprovePrompt = useCallback(async () => {
    const current = prompt.trim();
    if (!current) {
      notify({ message: "Type a prompt first to improve it", type: "info" });
      return;
    }
    if (!user) {
      setShowSignInNudge(true);
      return;
    }
    if (isImproving) return;

    setIsImproving(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${BACKEND_URL}/api/ai/improve-prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ prompt: current, gameSpec: settings?.gameSpec || "" }),
      });
      if (!res.ok) throw new Error("Improve prompt request failed");
      const data = await res.json();
      const improved = (data?.improvedPrompt || "").trim();
      if (improved && improved !== current) {
        setPrompt(improved);
        notify({ message: "Prompt improved — review and edit before sending", type: "success" });
        track("prompt_improved", { fromLength: current.length, toLength: improved.length });
      } else {
        notify({ message: "Prompt already looks good", type: "info" });
      }
    } catch (err) {
      notify({ message: "Couldn't improve prompt, try again", type: "error" });
    } finally {
      setIsImproving(false);
    }
  }, [prompt, user, isImproving, settings, notify, track]);

  const handleQuickStart = useCallback(async (item) => {
    const promptText = typeof item === "string" ? item : item?.prompt || "";
    track("quickstart_clicked", { length: promptText.length });
    await handlePromptSubmit(null, promptText);
  }, [handlePromptSubmit, track]);

  const handleSelectTemplate = useCallback(async (template) => {
    setTemplateGalleryOpen(false);
    if (!template?.prompt) return;
    track("template_selected", { id: template.id, category: template.category });
    await handleQuickStart(template.prompt);
  }, [handleQuickStart, track]);

  const handleEditPlan = useCallback((message) => {
    setPrompt(message?.originPrompt || "");
  }, []);

  const handleFileUpload = useCallback((e) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachments((prev) => [
          ...prev,
          {
            name: file.name,
            type: file.type,
            size: file.size,
            data: reader.result,
            isImage: file.type.startsWith("image/"),
          },
        ]);
      };

      if (file.type.startsWith("image/")) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
    });
  }, []);

  const handleOpenScript = useCallback(async (script) => {
    if (!isPremium) {
      setProNudgeReason("Saved Scripts Library");
      setShowProNudge(true);
      return;
    }

    if (script.type === "ui") {
      setActiveTab("chat");
      const uid = user?.uid;
      if (!uid) return;

      const snap = await getDocs(
        query(
          collection(db, "users", uid, "scripts", script.id, "versions"),
          orderBy("versionNumber", "desc"),
          limit(1)
        )
      );

      if (!snap.empty) {
        const data = snap.docs[0].data();
        ui.setActiveUiId(script.id);
        ui.setUiGenerations((prev) =>
          prev.some((g) => g.id === script.id)
            ? prev
            : [
                {
                  id: script.id,
                  uiModuleLua: data.uiModuleLua || data.code,
                  systemsLua: data.systemsLua || "",
                  files: Array.isArray(data.files) ? data.files : [],
                  boardState: data.boardState || null,
                  prompt: script.title,
                  createdAt: Date.now(),
                },
                ...prev,
              ]
        );
        ui.setUiDrawerOpen(true);
      }
    } else {
      setActiveTab("chat");
      notify({ message: "Opening script", type: "info" });
    }
  }, [isPremium, notify, ui, user]);

  const handleOpenPreview = useCallback(() => {
    if (!ui.activeUi && !ui.uiGenerations.length) {
      notify({ message: "Generate or open a UI first to use preview", type: "info" });
      return;
    }
    ui.setUiDrawerOpen(true);
    if (isMobile) setMobileTab("preview");
    track("artifact_action_used", { action: "open_preview" });
  }, [isMobile, notify, track, ui]);

  const handleClosePreview = useCallback(() => {
    ui.setUiDrawerOpen(false);
    if (isMobile) setMobileTab("chat");
  }, [isMobile, ui]);

  const handlePreviewToggle = useCallback(() => {
    if (ui.uiDrawerOpen) {
      handleClosePreview();
      return;
    }
    handleOpenPreview();
  }, [handleClosePreview, handleOpenPreview, ui.uiDrawerOpen]);

  const [isSharing, setIsSharing] = useState(false);

  // Create an unlisted, read-only share link for the active UI and copy it to
  // the clipboard. Anyone with the link can view the preview (no auth needed).
  const handleCreateShareLink = useCallback(async () => {
    const activeUi = ui.activeUi;
    if (!activeUi || (!activeUi.boardState && !activeUi.uiModuleLua && !activeUi.lua)) {
      notify({ message: "Generate or open a UI first to share it", type: "info" });
      return;
    }
    if (!user) {
      setShowSignInNudge(true);
      return;
    }
    if (isSharing) return;

    setIsSharing(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${BACKEND_URL}/api/share/ui`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: activeUi.prompt || "Generated UI",
          boardState: activeUi.boardState || null,
          uiModuleLua: activeUi.uiModuleLua || activeUi.lua || "",
          systemsLua: activeUi.systemsLua || "",
        }),
      });
      if (!res.ok) throw new Error("Share request failed");
      const data = await res.json();
      const shareId = data?.shareId;
      if (!shareId) throw new Error("No share id returned");

      const shareUrl = `${window.location.origin}/preview/${shareId}`;
      try {
        await navigator.clipboard.writeText(shareUrl);
        notify({ message: "Share link copied to clipboard", type: "success" });
      } catch (clipErr) {
        notify({ message: `Share link: ${shareUrl}`, type: "info" });
      }
      track("artifact_action_used", { action: "share_ui" });
    } catch (err) {
      notify({ message: "Couldn't create share link, try again", type: "error" });
    } finally {
      setIsSharing(false);
    }
  }, [ui.activeUi, user, isSharing, notify, track]);

  return {
    billing: {
      plan,
      planKey,
      totalRemaining,
      subRemaining,
      paygRemaining,
      subLimit,
      resetsAt,
      isPremium,
      entitlements,
    },
    navigation: {
      navigate,
      location,
    },
    uiState: {
      user,
      isMobile,
      sidebarOpen,
      activeTab,
      mobileTab,
      prompt,
      isImproving,
      refineTarget,
      attachments,
      scripts,
      projectContext,
      architecturePanelOpen,
      teams,
      showSignInNudge,
      showProNudge,
      proNudgeReason,
      codeDrawerOpen,
      codeDrawerData,
      templateGalleryOpen,
      isSharing,
      currentTheme,
      activeModeData,
      currentToast,
      toasts,
    },
    refs: {
      chatEndRef,
    },
    modules: {
      chat,
      ui,
      game,
      scriptManager,
      unified,
      settings,
    },
    handlers: {
      setSidebarOpen,
      setActiveTab,
      setMobileTab,
      setPrompt,
      setAttachments,
      setArchitecturePanelOpen,
      setShowSignInNudge,
      setShowProNudge,
      setProNudgeReason,
      setCodeDrawerOpen,
      setTemplateGalleryOpen,
      dismissToast,
      updateSettings,

      handleSidebarTabChange,
      handlePromptSubmit,
      onApprovePlan: unified.approvePlan,
      onClarifySubmit: unified.submitClarifyAnswers,
      onRefineArtifact: unified.refineArtifact,
      handleStartRefine,
      cancelRefine,
      handleImprovePrompt,
      handleEditPlan,
      handleFileUpload,
      handleOpenScript,
      handleQuickStart,
      handleSelectTemplate,
      handleCreateShareLink,
      handleOpenPreview,
      handleClosePreview,
      handlePreviewToggle,
      handleUiAudit,
      handleSuggestAssets,
      track,
      notify,
      emitAiEvent,
    },
  };
}

export default useAiWorkspaceController;
