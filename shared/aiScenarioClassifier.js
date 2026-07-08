const { ACTION_LEVELS, BLOCKER_CODES, SCENARIO_IDS } = require("./aiConversationContract");

const DEFAULT_RESULT = Object.freeze({
  scenarioId: "workflow_guidance",
  intentConfidence: 0.35,
  clarificationRequired: true,
  studioRequired: false,
  recommendedActionLevel: "explain",
  blockerCode: "ambiguous_intent",
  routeMode: "ask",
  outcome: "partial",
});

const FEATURE_BUILD_PATTERN = /\b(add|build|create|implement|make|introduce|ship|launch|develop)\b/;
const EDIT_REQUEST_PATTERN = /\b(change|fix|rename|move|patch|update|edit|refactor|replace|remove|adjust|tweak|rewrite)\b/;
const PLANNING_PATTERN = /\b(plan|scope|break down|roadmap|road map|outline|decide implementation steps|sequence|prioritize|prioritise|milestone|milestones|stage the rollout|split a big feature|next three passes|rollout|phase|phases|proposal|strategy|order of work|implementation order|implementation sequence|help me decide the order)\b/;
const WORKFLOW_GUIDANCE_PATTERN = /\b(how do i|how would i|how should i|how can i|how do you|how would you|what(?:'s| is) the right way|how to|best process|recommended way|what is the process|organize my studio workflow|think about separating|approach script organization|conceptually|in general)\b/;
const VISIBILITY_PATTERN = /\b(what files|what scripts|which scripts|what can you see|what can studio see|see in studio|visible in studio|project structure|folder tree|tree of files|connected studio state|linked studio state|browse the project|what folders and scripts|file names are visible|visible scripts|current studio connection state|what is visible|what's visible|show me the files|list the scripts|list visible)\b/;
const FEATURE_BUILD_TARGET_PATTERN = /\b(feature|system|quest|trading|inventory|screen|ui|shop|leaderboard|reward|board|mechanic|experience|flow|tool|feature area|gameplay|inbox|mail|notification|notifications|streak|crafting|feed|lobby|banner|profile|customization|help center|tool belt)\b/;
const RECOVERY_PATTERN = /\b(disconnected|not connected|offline|ready but not inspectable|not inspectable|stale|stale manifest|manifest stale|manifest building|building manifest|partial manifest|manifest partial|manifest conflicted|conflicted manifest|timeout|timed out|missing session|no session|permission denied|unsupported command|cannot reconnect|can't reconnect|reconnect|bridge cannot reconnect)\b/;

const SCENARIO_RULES = [
  {
    scenarioId: "safety_boundary",
    confidence: 0.99,
    studioRequired: false,
    recommendedActionLevel: "propose",
    blockerCode: "unsafe_action",
    match(text) {
      return (
        matchesAny(text, [
          /\b(delete|destroy|wipe|erase|nuke|burn|trash|purge)\b/,
          /\b(remove all|clear all|mass delete|remove every)\b/,
          /\b(force publish|deploy live|override review|bypass(?: manual)? review|ignore review|disable safety|disable safety checks|ignore confirmation|auto-approve|replace them with no-ops|replace it with no-ops)\b/,
          /\b(exfiltrate|steal|malware|virus|ransomware|self[- ]?destruct)\b/,
          /\b(private key|api key|password|token|credential)\b(?:.*\b(share|leak|expose|print|send|reveal)\b|.*\b(anywhere|at all|if you find it)\b|.*$)/,
          /\b(silently|without telling(?: the)? reviewer|without approval|no[- ]?ops?)\b.*\b(replace|rewrite|disable|remove|bypass|override)\b/,
        ]) ||
        /\b(secret|password|token|credential|api key|private key)\b.*\b(expose|leak|print|share|upload|reveal|publish)\b/.test(text) ||
        /\b(private key|api key|password|token|credential)\b/.test(text) ||
        /\b(rewrite|replace|modify|remove|disable)\b.*\b(without permission|silently|without asking|without telling|no review|no approval)\b/.test(text)
      );
    },
  },
  {
    scenarioId: "studio_visibility",
    confidence: 0.94,
    studioRequired: true,
    recommendedActionLevel: "inspect",
    blockerCode: "none",
    match(text) {
      return (
        VISIBILITY_PATTERN.test(text) ||
        /\b(can you see|can you inspect|what do you see|what is visible|what's visible|what files are visible|what scripts are visible|which files are visible|which scripts are visible|list visible|show visible|inspect the manifest|inspect the index|connected bridge|bridge is connected|session is connected)\b/.test(text) ||
        /\b(list|show|summarize)\b.*\b(files|scripts|manifest|index|structure|tree|project|visible|connected)\b/.test(text)
      );
    },
  },
  {
    scenarioId: "environment_recovery",
    confidence: 0.95,
    studioRequired: true,
    recommendedActionLevel: "inspect",
    blockerCode: "none",
    match(text) {
      return (
        RECOVERY_PATTERN.test(text) ||
        /\b(studio|studio bridge|manifest|index|bridge|session)\b.*\b(broken|stuck|hung|stalled|missing|unavailable|out of date|expired|incomplete|partial|conflicted|building|reconnect|reconnecting)\b/.test(text) ||
        /\b(is the session|can you inspect|tell me when the project is inspectable|what can you safely inspect|why can(?:'t| not) you inspect)\b/.test(text)
      );
    },
  },
  {
    scenarioId: "feature_build_request",
    confidence: 0.88,
    studioRequired: true,
    recommendedActionLevel: "queue",
    blockerCode: "none",
    match(text) {
      return (
        FEATURE_BUILD_PATTERN.test(text) &&
        !PLANNING_PATTERN.test(text) &&
        (hasProjectTarget(text) || FEATURE_BUILD_TARGET_PATTERN.test(text) || text.split(" ").length <= 4)
      );
    },
  },
  {
    scenarioId: "project_planning",
    confidence: 0.84,
    studioRequired: false,
    recommendedActionLevel: "propose",
    blockerCode: "none",
    match(text) {
      return PLANNING_PATTERN.test(text) && !FEATURE_BUILD_PATTERN.test(text);
    },
  },
  {
    scenarioId: "search_and_compare",
    confidence: 0.9,
    studioRequired: true,
    recommendedActionLevel: "inspect",
    blockerCode: "none",
    match(text) {
      return (
        /\b(find|search|locate|identify|compare|which is best|best file|best module|candidate|candidates|difference between|best match|backup options|relevant modules|which module is better|which file is the best match|find the best file|best candidate|compare the candidates)\b/.test(text) ||
        /\b(where is|show me the files|find the script|search the project)\b/.test(text)
      );
    },
  },
  {
    scenarioId: "script_explanation",
    confidence: 0.93,
    studioRequired: true,
    recommendedActionLevel: "explain",
    blockerCode: "none",
    match(text) {
      return (
        /\b(what does|how does|why is this script|why does this file|why is this code|explain|describe|walk me through|summarize|dependency|depends on|where does .* come from|source of|behavior of|responsible for|interacts with|calls into it|line by line|what part|what causes it|what is this doing)\b/.test(text) &&
        (/\b(script|module|file|component|system|function|code|modulescript|localscript|serverscript)\b/.test(text) || /\b[a-z0-9_-]+\/[a-z0-9/_-]+\b/.test(text) || /\.[a-z]{2,4}\b/.test(text))
        && !/\b(how do i|how should i|how would i|best process|recommended way|what is the process)\b/.test(text)
      );
    },
  },
  {
    scenarioId: "targeted_edit_request",
    confidence: 0.88,
    studioRequired: true,
    recommendedActionLevel: "queue",
    blockerCode: "none",
    match(text) {
      return (
        EDIT_REQUEST_PATTERN.test(text) &&
        (hasProjectTarget(text) || /\b(file|script|module|component|ui|panel|drawer|screen|button|service|system|path|code path|this|that|it|close button|reward screen|shop ui)\b/.test(text))
      );
    },
  },
  {
    scenarioId: "bug_diagnosis",
    confidence: 0.9,
    studioRequired: true,
    recommendedActionLevel: "inspect",
    blockerCode: "none",
    match(text) {
      return (
        /\b(error|broken|fails?|failing|bug|warning|crash|crashes|crashing|runtime issue|not working|doesn't work|does not work|blank|stopped responding|stops responding|keeps happening|root cause|why is|why doesn't|why do(?:es)?|what's causing|what is causing)\b/.test(text) ||
        /\bwhy\b.*\b(work|working)\b/.test(text) ||
        /\b(button|ui|system|screen|feature).*\b(not working|broken|fails?|failing|crashing|crash)\b/.test(text) ||
        /\b(debug|diagnose|investigate|trace)\b.*\b(error|failure|issue|bug|warning|problem)\b/.test(text)
      );
    },
  },
  {
    scenarioId: "workflow_guidance",
    confidence: 0.88,
    studioRequired: false,
    recommendedActionLevel: "explain",
    blockerCode: "none",
    match(text) {
      return (
        WORKFLOW_GUIDANCE_PATTERN.test(text) &&
        !PLANNING_PATTERN.test(text) &&
        !FEATURE_BUILD_PATTERN.test(text) &&
        !EDIT_REQUEST_PATTERN.test(text) &&
        !/\b(manifest|index|bridge|files|scripts|project tree|visible)\b.*\b(show|list|see|inspect|visible|connected|stale|partial|session)\b/.test(text)
      );
    },
  },
];

function matchesAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

function normalizeText(prompt) {
  return String(prompt || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function hasProjectTarget(text) {
  return (
    /\b(script|module|file|component|ui|hud|menu|button|screen|page|system|service|tool|asset|shop|inventory|leaderboard|quest|reward|currency|weapon|weapon system|npc|backend|frontend|inbox|mail|notification|notifications|streak|crafting|feed|lobby|banner|profile|customization|help center|tool belt)\b/.test(text) ||
    /\b(src|shared|backend|roblox-plugin)\/[a-z0-9/_-]+\b/.test(text) ||
    /\b[a-z0-9_-]+\.(?:lua|js|jsx|ts|tsx)\b/.test(text)
  );
}

function isAmbiguousMutationPrompt(text, scenarioId) {
  if (!["targeted_edit_request", "feature_build_request"].includes(scenarioId)) return false;
  const hasMutationVerb = EDIT_REQUEST_PATTERN.test(text) || FEATURE_BUILD_PATTERN.test(text);
  return hasMutationVerb && !hasProjectTarget(text);
}

function classifyScenarioFromPrompt(prompt, metadata = {}) {
  const text = normalizeText(prompt);
  if (!text) {
    return DEFAULT_RESULT;
  }

  const matchedRule = SCENARIO_RULES.find((rule) => rule.match(text, metadata)) || DEFAULT_RESULT;
  const scenarioId = matchedRule.scenarioId || DEFAULT_RESULT.scenarioId;
  const ambiguous = isAmbiguousMutationPrompt(text, scenarioId);
  const safety = scenarioId === "safety_boundary";
  const routeMode = inferRouteMode(text, scenarioId);
  const outcome = inferOutcome(text, scenarioId, routeMode);
  const blockerCode = safety
    ? inferSafetyBlocker(text)
    : scenarioId === "environment_recovery"
      ? inferEnvironmentBlocker(text)
      : ambiguous
        ? "ambiguous_intent"
        : matchedRule.blockerCode || "none";
  const clarificationRequired = safety ? false : ambiguous || matchedRule.clarificationRequired === true;

  return Object.freeze({
    scenarioId,
    intentConfidence: ambiguous ? 0.56 : matchedRule.confidence || DEFAULT_RESULT.intentConfidence,
    clarificationRequired,
    studioRequired: matchedRule.studioRequired ?? DEFAULT_RESULT.studioRequired,
    recommendedActionLevel: matchedRule.recommendedActionLevel || DEFAULT_RESULT.recommendedActionLevel,
    blockerCode,
    routeMode,
    outcome,
  });
}

function inferRouteMode(text, scenarioId) {
  if (scenarioId === "project_planning") return "plan";
  if (scenarioId === "targeted_edit_request" || scenarioId === "feature_build_request") return "agent";
  return "ask";
}

function inferOutcome(text, scenarioId, routeMode) {
  if (scenarioId === "safety_boundary") return "refused";
  if (scenarioId === "environment_recovery") {
    if (/\b(disconnected|offline|missing session|permission denied|unsupported command|timed out|timeout|conflicted)\b/.test(text)) {
      return "blocked";
    }
    return "partial";
  }
  if (scenarioId === "targeted_edit_request" || scenarioId === "feature_build_request") return "partial";
  if (scenarioId === "project_planning") {
    return /\broadmap|milestone|sequence|step|steps|order|stage\b/.test(text) && /\b(big|broad|full|new|later|next|plan|rollout|split)\b/.test(text)
      ? "partial"
      : "success";
  }
  if (scenarioId === "search_and_compare") {
    return /\b(compare|candidate|candidates|best|relevant|which|difference|fallback|backup)\b/.test(text) ? "partial" : "success";
  }
  if (scenarioId === "script_explanation") {
    return /\b(line by line|dependency|depends on|what part|where does|responsible for|interacts with)\b/.test(text) ? "partial" : "success";
  }
  if (scenarioId === "bug_diagnosis") {
    return /\b(root cause|trace|diagnose|investigate|warning|error|broken|fails?|not working|why is)\b/.test(text) ? "partial" : "success";
  }
  if (scenarioId === "studio_visibility") {
    return /\b(partial|stale|incomplete|missing|disconnected|connected|inspect|can you see|what can you see)\b/.test(text) ? "partial" : "success";
  }
  if (scenarioId === "workflow_guidance") {
    return /\b(review|validate|safely|before i apply|before you change|handoff|decide|how should i|how do i)\b/.test(text) ? "success" : "partial";
  }
  return routeMode === "plan" ? "partial" : "success";
}

function inferSafetyBlocker(text) {
  if (/\b(private key|api key|password|token|credential)\b/.test(text)) return "unsafe_action";
  if (/\b(bypass|override|ignore|disable safety|disable safety checks|auto-approve|force publish|publish live)\b/.test(text)) return "unsafe_action";
  if (/\b(silently|without telling|without approval|without permission|no[- ]?ops?)\b/.test(text)) return "unsafe_action";
  if (/\b(delete|destroy|wipe|erase|nuke|purge)\b/.test(text)) return "unsafe_action";
  return "unsafe_action";
}

function inferEnvironmentBlocker(text) {
  if (/\b(missing session|session is missing|no session)\b/.test(text)) return "missing_session";
  if (/\b(permission denied)\b/.test(text)) return "permission_denied";
  if (/\b(unsupported command|not supported)\b/.test(text)) return "unsupported_command";
  if (/\b(timeout|timed out)\b/.test(text)) return "studio_timeout";
  if (/\b(conflicted|conflict)\b/.test(text)) return "manifest_conflicted";
  if (/\b(partial manifest|manifest partial|manifest is partial)\b/.test(text)) return "manifest_partial";
  if (/\b(stale manifest|manifest stale|stale)\b/.test(text)) return "manifest_stale";
  if (/\b(building manifest|manifest building|building)\b/.test(text)) return "manifest_building";
  if (/\b(disconnected|offline|not connected|bridge is offline|cannot reconnect|can't reconnect|bridge cannot reconnect|reconnect)\b/.test(text)) return "studio_not_connected";
  return "unknown_error";
}

function validateScenarioId(scenarioId) {
  if (!SCENARIO_IDS.includes(scenarioId)) {
    throw new TypeError(`Invalid scenarioId: ${scenarioId}`);
  }
}

function validateActionLevel(actionLevel) {
  if (!ACTION_LEVELS.includes(actionLevel)) {
    throw new TypeError(`Invalid actionLevel: ${actionLevel}`);
  }
}

function validateBlockerCode(blockerCode) {
  if (!BLOCKER_CODES.includes(blockerCode)) {
    throw new TypeError(`Invalid blockerCode: ${blockerCode}`);
  }
}

module.exports = {
  classifyScenarioFromPrompt,
  validateScenarioId,
  validateActionLevel,
  validateBlockerCode,
};
