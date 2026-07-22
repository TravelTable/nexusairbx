const asArray = (value) => (Array.isArray(value) ? value : value == null ? [] : [value]);

const slug = (value, fallback = "item") => {
  const normalized = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return normalized || fallback;
};

const textValue = (value) => {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (!value || typeof value !== "object") return "";
  return String(value.value ?? value.content ?? value.text ?? value.summary ?? value.details ?? "").trim();
};

const uniqueItemId = (item, index, prefix) =>
  String(item?.itemId || item?.id || item?.stepId || item?.key || `${prefix}-${index + 1}-${slug(textValue(item) || item?.title, "item")}`);

export const PLAN_SECTION_DEFINITIONS = Object.freeze([
  { id: "goal", label: "Goal", kind: "text", defaultOpen: true },
  { id: "userExperience", label: "User experience", kind: "list", defaultOpen: true },
  { id: "systemsAffected", label: "Systems affected", kind: "list" },
  { id: "objectsToCreate", label: "Objects and scripts to create", kind: "list" },
  { id: "objectsToModify", label: "Existing objects to modify", kind: "list" },
  { id: "assetsRequired", label: "Assets required", kind: "list" },
  { id: "implementationSteps", label: "Implementation steps", kind: "steps", defaultOpen: true },
  { id: "verificationSteps", label: "Verification steps", kind: "steps", defaultOpen: true },
  { id: "risksAndAssumptions", label: "Risks and assumptions", kind: "list" },
]);

export const PLAN_TEMPLATES = Object.freeze([
  {
    id: "complete_system",
    title: "Build a complete Roblox system",
    description: "Plan gameplay, server/client ownership, persistence, UI, and verification together.",
    starterPrompt: "Build a complete Roblox system that…",
  },
  {
    id: "ui_design",
    title: "Create or redesign a UI",
    description: "Inspect the current interface, preserve its contracts, and plan responsive Roblox UI changes.",
    starterPrompt: "Create or redesign the current Roblox UI so that…",
  },
  {
    id: "fix_bug",
    title: "Fix a script or bug",
    description: "Reproduce the issue, isolate the cause, apply a narrow fix, and verify regressions.",
    starterPrompt: "Find and fix this Roblox issue: …",
  },
  {
    id: "add_feature",
    title: "Add a feature to an existing game",
    description: "Fit a new feature into the current project without replacing working systems.",
    starterPrompt: "Add this feature to my existing Roblox game: …",
  },
  {
    id: "inspect_improve",
    title: "Inspect and improve a project",
    description: "Use Studio inspection to identify high-value reliability, UX, and performance improvements.",
    starterPrompt: "Inspect my current Roblox project and improve…",
  },
  {
    id: "generate_assets",
    title: "Generate and implement assets",
    description: "Plan generation, asset IDs, placement, fallbacks, and in-Studio verification.",
    starterPrompt: "Generate and implement these Roblox assets: …",
  },
  {
    id: "refactor_system",
    title: "Refactor an existing system",
    description: "Preserve behavior while improving ownership, structure, safety, and testability.",
    starterPrompt: "Refactor this existing Roblox system while preserving its behavior: …",
  },
]);

const SECTION_ALIASES = Object.freeze({
  goal: ["goal", "intendedOutcome", "outcome", "summary"],
  userExperience: ["userExperience", "ux", "experience"],
  systemsAffected: ["systemsAffected", "affectedSystems", "systems", "robloxSystems"],
  objectsToCreate: ["objectsToCreate", "objectsAndScriptsToCreate", "create", "newObjects"],
  objectsToModify: ["objectsToModify", "existingObjectsToModify", "modify", "modifiedObjects"],
  assetsRequired: ["assetsRequired", "requiredAssets", "assets"],
  implementationSteps: ["implementationSteps", "steps", "aiSteps"],
  verificationSteps: ["verificationSteps", "verification", "tests"],
  risksAndAssumptions: ["risksAndAssumptions", "assumptions", "risks", "aiAssumptions"],
});

function findSection(source, id) {
  const aliases = SECTION_ALIASES[id] || [id];
  const sections = source?.sections;
  if (Array.isArray(sections)) {
    const section = sections.find((entry) => (
      aliases.includes(entry?.sectionId) || aliases.includes(entry?.id) || aliases.includes(entry?.key)
    ));
    if (section) return section.items ?? section.value ?? section.content ?? section;
  } else if (sections && typeof sections === "object") {
    for (const alias of aliases) {
      if (sections[alias] != null) return sections[alias]?.items ?? sections[alias]?.value ?? sections[alias];
    }
  }
  for (const alias of aliases) {
    if (source?.[alias] != null) return source[alias];
  }
  return undefined;
}

export function normalizePlanItem(item, index = 0, prefix = "item") {
  if (typeof item === "string" || typeof item === "number") {
    const title = String(item).trim();
    const id = uniqueItemId({ title }, index, prefix);
    return { id, itemId: id, title, details: "" };
  }
  const value = item && typeof item === "object" ? item : {};
  const title = String(value.title ?? value.label ?? value.name ?? value.step ?? value.text ?? value.content ?? value.value ?? "").trim();
  const details = String(value.details ?? value.description ?? value.instructions ?? value.reason ?? value.notes ?? "").trim();
  const id = uniqueItemId(value, index, prefix);
  return { ...value, id, itemId: String(value.itemId || id), title, details };
}

function normalizeSection(source, definition, fallback) {
  const raw = findSection(source, definition.id);
  const resolved = raw == null ? fallback : raw;
  if (definition.kind === "text") return textValue(resolved);
  return asArray(resolved)
    .map((entry, index) => normalizePlanItem(entry, index, definition.id))
    .filter((entry) => entry.title || entry.details);
}

function unwrapPlan(input) {
  if (!input || typeof input !== "object") return {};
  return input.plan || input.data?.plan || input.structuredPlan || input;
}

function normalizeCapabilities(value) {
  return asArray(value)
    .map((capability, index) => {
      if (typeof capability === "string") {
        return { id: slug(capability, `capability-${index + 1}`), label: capability, available: true };
      }
      return {
        ...capability,
        id: String(capability?.id || capability?.capabilityId || capability?.key || `capability-${index + 1}`),
        label: String(capability?.label || capability?.name || capability?.capabilityId || capability?.id || "Capability"),
        available: capability?.available !== false && capability?.supported !== false,
      };
    })
    .filter((capability) => capability.label);
}

/**
 * Converts v2 chat-plan messages and v3 API plans to the one editor shape.
 * Unknown item fields are retained so execution metadata survives round trips.
 */
export function normalizeWorkflowPlan(input, fallbackMessage = null) {
  const envelope = input && typeof input === "object" ? input : {};
  const root = unwrapPlan(input);
  const structured = root.structuredPlan || root.plan || root;
  const fallback = fallbackMessage || input?.message || {};
  const sections = {};
  PLAN_SECTION_DEFINITIONS.forEach((definition) => {
    const legacyFallback = definition.id === "goal"
      ? fallback.aiSummary || fallback.planMarkdown || ""
      : definition.id === "implementationSteps"
        ? fallback.aiSteps || fallback.planSteps || []
        : definition.id === "risksAndAssumptions"
          ? fallback.aiAssumptions || []
          : [];
    sections[definition.id] = normalizeSection(structured, definition, legacyFallback);
  });

  const locksValue = root.locks || structured.locks || root.lockedSections || structured.lockedSectionIds || root.lockedSectionIds || {};
  const locks = Array.isArray(locksValue)
    ? Object.fromEntries(locksValue.map((id) => [String(id), true]))
    : { ...locksValue };

  return {
    ...root,
    planId: String(root.planId || root.id || fallback.planId || ""),
    version: Number(root.version ?? root.planVersion ?? fallback.version ?? fallback.planVersion ?? 1) || 1,
    hash: String(root.hash || root.planHash || fallback.hash || fallback.planHash || ""),
    status: String(root.status || fallback.stage || "draft"),
    templateId: root.templateId || structured.templateId || fallback.templateId || null,
    requiresStudio: Boolean(
      envelope.requiresStudio
      ?? envelope.studioRequired
      ?? root.requiresStudio
      ?? root.studioRequired
      ?? structured.requiresStudio
      ?? structured.studioRequired
      ?? root.studioAccessRequired
      ?? root.targeting?.studioRequired
      ?? structured.targeting?.studioRequired
      ?? fallback.studioRequired
    ),
    projectTargetRequired: Boolean(root.projectTargetRequired ?? structured.projectTargetRequired),
    sections,
    locks,
    targeting: {
      ...(fallback.targeting || {}),
      ...(root.targeting || structured.targeting || {}),
    },
    constraints: asArray(root.constraints || structured.constraints || fallback.constraints),
    assets: asArray(root.assets || structured.assets || fallback.assets || findSection(structured, "assetsRequired")),
    capabilities: normalizeCapabilities(
      root.capabilities
      || structured.capabilities
      || fallback.capabilities
      || root.requiredCapabilities
    ),
    clarificationAnswers: {
      ...(fallback.clarificationAnswers || {}),
      ...(root.clarificationAnswers || structured.clarificationAnswers || {}),
    },
    assumptions: asArray(root.assumptions || structured.assumptions || fallback.aiAssumptions),
    originalRequest: String(root.originalRequest || root.prompt || fallback.originPrompt || ""),
  };
}

export function findLatestPlanMessage(messages = []) {
  return [...messages]
    .reverse()
    .find((message) => message?.planId || ["plan", "plan_approved"].includes(message?.stage)) || null;
}

export function updatePlanSection(plan, sectionId, value) {
  return {
    ...plan,
    sections: { ...plan.sections, [sectionId]: value },
  };
}

export function updatePlanSectionItem(plan, sectionId, itemId, patch) {
  const items = asArray(plan?.sections?.[sectionId]);
  return updatePlanSection(plan, sectionId, items.map((item) => (
    (item.itemId || item.id) === itemId ? { ...item, ...patch } : item
  )));
}

export function addPlanSectionItem(plan, sectionId, item = {}) {
  const items = asArray(plan?.sections?.[sectionId]);
  const next = normalizePlanItem(item, items.length, sectionId);
  const itemId = `${sectionId}-${Date.now().toString(36)}-${items.length + 1}`;
  next.id = itemId;
  next.itemId = itemId;
  return updatePlanSection(plan, sectionId, [...items, next]);
}

export function removePlanSectionItem(plan, sectionId, itemId) {
  return updatePlanSection(
    plan,
    sectionId,
    asArray(plan?.sections?.[sectionId]).filter((item) => (item.itemId || item.id) !== itemId)
  );
}

export function reorderPlanSectionItem(plan, sectionId, itemId, direction) {
  const items = [...asArray(plan?.sections?.[sectionId])];
  const index = items.findIndex((item) => (item.itemId || item.id) === itemId);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= items.length) return plan;
  [items[index], items[target]] = [items[target], items[index]];
  return updatePlanSection(plan, sectionId, items);
}

export function setPlanSectionLock(plan, sectionId, locked) {
  return { ...plan, locks: { ...plan.locks, [sectionId]: Boolean(locked) } };
}

export function serializePlanSection(plan, sectionId) {
  const definition = PLAN_SECTION_DEFINITIONS.find((entry) => entry.id === sectionId);
  const value = plan?.sections?.[sectionId];
  if (definition?.kind === "text") return String(value || "");
  return asArray(value).map((item) => ({ ...item }));
}

export function createReplaceSectionOperation(plan, sectionId) {
  return { type: "replace_section", sectionId, value: serializePlanSection(plan, sectionId) };
}

/**
 * Rebuilds a complete, deterministic patch for a locally recovered dirty draft.
 * Local storage contains the edited plan rather than its original operation queue.
 */
export function createPlanSyncOperations(plan) {
  if (!plan) return [];
  return PLAN_SECTION_DEFINITIONS.flatMap(({ id }) => {
    const locked = Boolean(plan.locks?.[id]);
    const replace = createReplaceSectionOperation(plan, id);
    if (locked) {
      return [
        { type: "set_section_lock", sectionId: id, locked: false },
        replace,
        { type: "set_section_lock", sectionId: id, locked: true },
      ];
    }
    return [replace, { type: "set_section_lock", sectionId: id, locked: false }];
  });
}

export function normalizeReadiness(input, plan, context = {}) {
  const server = input?.readiness || input?.data?.readiness || input || {};
  const readinessStatuses = new Set(["unchecked", "stale", "checking", "checked", "error"]);
  const withSeverity = (issue, severity) => (
    issue && typeof issue === "object"
      ? { ...issue, severity: issue.severity || severity }
      : { message: String(issue || ""), severity }
  );
  const supplied = [
    ...asArray(server.issues),
    ...asArray(server.blockers).map((issue) => withSeverity(issue, "blocker")),
    ...asArray(server.warnings).map((issue) => withSeverity(issue, "warning")),
  ];
  const seen = new Set();
  const issues = supplied.map((issue, index) => {
    const id = String(issue?.id || issue?.code || `readiness-${index + 1}`);
    const rawFix = issue?.suggestedFix ?? issue?.fix ?? issue?.suggestedAction ?? issue?.action ?? "";
    const fixAction = typeof rawFix === "object"
      ? rawFix?.action
      : issue?.suggestedAction || issue?.action;
    const fixLabel = typeof rawFix === "object"
      ? rawFix?.label || rawFix?.action
      : rawFix;
    return {
      id,
      code: String(issue?.code || id),
      severity: String(issue?.severity || (issue?.blocking ? "blocker" : "warning")).toLowerCase(),
      title: String(issue?.title || issue?.message || "Plan needs attention"),
      message: String(issue?.message || issue?.description || issue?.title || ""),
      affectedStepIds: asArray(issue?.affectedStepIds).map(String),
      suggestedFix: {
        action: String(fixAction || "review_plan"),
        label: String(fixLabel || "Review this issue in the plan."),
      },
      sectionId: issue?.sectionId || null,
    };
  }).filter((issue) => {
    const key = `${issue.id}:${issue.severity}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (!supplied.length && plan) {
    if (plan.requiresStudio && !context.studioConnected) {
      issues.push({
        id: "studio-connection",
        code: "missing_studio_connection",
        severity: "blocker",
        title: "Connect Roblox Studio",
        message: "This plan includes Studio inspection or changes and cannot target a disconnected session.",
        affectedStepIds: [],
        suggestedFix: {
          action: "connect_studio",
          label: "Open the NexusRBX Studio bridge and reconnect this workspace.",
        },
        sectionId: null,
      });
    }
    const projectId = context.projectId || plan.targeting?.projectId || plan.targeting?.targetProjectId;
    if (plan.projectTargetRequired && !projectId) {
      issues.push({
        id: "project-target",
        code: "missing_project_target",
        severity: "blocker",
        title: "Choose a project target",
        message: "Execution could affect the wrong Roblox project without an explicit target.",
        affectedStepIds: [],
        suggestedFix: {
          action: "select_project",
          label: "Select the intended project in the workspace project picker.",
        },
        sectionId: null,
      });
    }
    if (!String(plan.sections?.goal || "").trim()) {
      issues.push({
        id: "missing-goal",
        code: "missing_goal",
        severity: "warning",
        title: "Add a clear goal",
        message: "The intended outcome is empty.",
        affectedStepIds: [],
        suggestedFix: {
          action: "edit_section",
          label: "Describe the player-facing result in the Goal section.",
        },
        sectionId: "goal",
      });
    }
    if (!asArray(plan.sections?.implementationSteps).length) {
      issues.push({
        id: "missing-steps",
        code: "missing_implementation_steps",
        severity: "warning",
        title: "Add implementation steps",
        message: "The agent has no ordered work checklist yet.",
        affectedStepIds: [],
        suggestedFix: {
          action: "edit_section",
          label: "Add at least one specific implementation step.",
        },
        sectionId: "implementationSteps",
      });
    }
  }

  const blockers = issues.filter((issue) => ["blocker", "error", "critical"].includes(issue.severity));
  const warnings = issues.filter((issue) => !["blocker", "error", "critical"].includes(issue.severity));
  const hasDecision = server.canExecute != null || server.ready != null;
  const hasReadinessPayload = hasDecision
    || ["issues", "blockers", "warnings", "checkedAt"].some((key) => Object.prototype.hasOwnProperty.call(server, key));
  const explicitStatus = readinessStatuses.has(server.status) ? server.status : null;
  const status = explicitStatus || (hasReadinessPayload ? "checked" : "unchecked");
  const decision = server.canExecute != null
    ? Boolean(server.canExecute)
    : server.ready != null
      ? Boolean(server.ready)
      : blockers.length === 0;
  const ready = status === "checked" && decision && blockers.length === 0;
  return {
    ...server,
    status,
    issues,
    blockers,
    warnings,
    ready,
    canExecute: ready,
    checkedAt: status === "checked" ? server.checkedAt || new Date().toISOString() : null,
  };
}

export function planDraftStorageKey({ userId = "guest", chatId = "chat", planId = "draft" } = {}) {
  return `nexusrbx.plan.${userId || "guest"}.${chatId || "chat"}.${planId || "draft"}`;
}

export function loadPlanDraft(key) {
  if (typeof window === "undefined" || !key) return null;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "null");
    return parsed?.plan ? parsed : null;
  } catch (_) {
    return null;
  }
}

export function savePlanDraft(key, plan, metadata = {}) {
  if (typeof window === "undefined" || !key) return;
  try {
    if (!plan) {
      window.localStorage.removeItem(key);
      return;
    }
    window.localStorage.setItem(key, JSON.stringify({
      plan,
      savedAt: new Date().toISOString(),
      ...metadata,
    }));
  } catch (_) {
    // Storage can be unavailable in private browsing; server persistence remains authoritative.
  }
}
