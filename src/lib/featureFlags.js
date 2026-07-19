export const FEATURE_FLAGS = Object.freeze({
  streamV2: process.env.REACT_APP_STREAM_V2 !== "false",
  systemOnlyPremium: process.env.REACT_APP_SYSTEM_ONLY_PREMIUM === "true",
  aiPageV2: process.env.REACT_APP_AI_PAGE_V2 !== "false",
  rawReasoning: process.env.REACT_APP_SHOW_RAW_REASONING === "true",
  /** Canonical durable task runtime and conversational progress surface. */
  newTaskRuntime: process.env.REACT_APP_NEW_TASK_RUNTIME === "true",
  /** Versioned/fenced Studio command delivery. */
  durableStudioCommands: process.env.REACT_APP_DURABLE_STUDIO_COMMANDS === "true",
  /** Server-assembled task context projection. */
  agentContextAssembler: process.env.REACT_APP_AGENT_CONTEXT_ASSEMBLER === "true",
  /** Server-snapshotted capability availability. */
  dynamicCapabilityLoading: process.env.REACT_APP_DYNAMIC_CAPABILITY_LOADING === "true",
  /** Explicit, revisable task-plan surface. */
  newPlanningMode: process.env.REACT_APP_NEW_PLANNING_MODE === "true",
  /** Conversational projection of durable task events. */
  conversationalTaskFeed: process.env.REACT_APP_CONVERSATIONAL_TASK_FEED === "true",
  /** Resume/retry controls backed by checkpoints. */
  taskRecovery: process.env.REACT_APP_TASK_RECOVERY === "true",
  /** Verified-completion evidence in task progress. */
  verifiedCompletion: process.env.REACT_APP_VERIFIED_COMPLETION === "true",
  /** Rollback adapter; disable only after canonical ownership is proven. */
  legacyAgentFallback: process.env.REACT_APP_LEGACY_AGENT_FALLBACK !== "false",
  /** Unified chat + Studio tool loop (inline steps; retires separate Studio Agent panel). */
  unifiedAgent:
    process.env.REACT_APP_UNIFIED_AGENT !== "false" &&
    process.env.REACT_APP_AI_PAGE_V2 !== "false",
  isDev: process.env.NODE_ENV === "development",
});

export default FEATURE_FLAGS;
