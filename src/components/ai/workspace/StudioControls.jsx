import React, { useMemo, useState } from "react";
import { ChevronRight, Loader2, Radio } from "lib/icons";
import { FEATURE_FLAGS } from "../../../lib/featureFlags";
import { normalizeStudioPreferences } from "../../../lib/studioPreferences";
import { getSupportedStudioCapabilities, resolveStudioControlAccess } from "./studioControlAccess";

const APPLY_OPTIONS = [
  { value: "ask_before_applying", label: "Ask before applying" },
  { value: "after_validation", label: "After validation", requiresMutation: true },
  { value: "after_playtest", label: "After playtest", requiresMutation: true, requiresPlaytest: true },
  { value: "never_automatically", label: "Never automatically" },
];

const VALIDATION_OPTIONS = [
  { value: "quick", label: "Quick" },
  { value: "standard", label: "Standard" },
  { value: "playtest", label: "Playtest", requiresPlaytest: true },
];

const SAFETY_OPTIONS = [
  { value: "review_destructive", label: "Review destructive changes" },
  { value: "auto_apply_verified", label: "Auto-apply verified changes", requiresMutation: true },
  { value: "developer_mode", label: "Developer mode", requiresMutation: true },
];

function commandAvailable(commands, command) {
  if (Array.isArray(commands)) return commands.includes(command);
  const detail = commands?.[command];
  return detail === true || detail?.available === true;
}

function providerName(connectionType) {
  return connectionType === "mcp_local" ? "Local MCP" : "Nexus Plugin";
}

function providerDescription(connectionType) {
  return connectionType === "mcp_local" ? "Studio automation" : "Project + Nexus tools";
}

function ControlRow({ label, value, options, onChange, disabled = false, help = "" }) {
  return (
    <label className="grid grid-cols-[minmax(0,1fr)_minmax(9.5rem,auto)] items-center gap-3 border-t border-[var(--ds-border-subtle)] py-3 first:border-t-0">
      <span>
        <span className="block text-xs font-semibold text-[var(--ds-text)]">{label}</span>
        {help ? <span className="mt-0.5 block text-[10px] leading-4 text-[var(--ds-text-muted)]">{help}</span> : null}
      </span>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="h-9 min-w-0 rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] px-2.5 text-xs font-medium text-[var(--ds-text)] transition-colors hover:border-[var(--ds-border-strong)] focus-visible:border-[var(--ds-accent-border)] focus-visible:ring-2 focus-visible:ring-[var(--ds-focus-ring)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={Boolean(option.disabled)}
            title={option.disabledReason || undefined}
          >
            {option.label}{option.disabled ? " — unavailable" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}

/** One logical Studio runtime with capability-routed providers. */
export default function StudioControls({
  connected = false,
  placeName = null,
  connectionType = null,
  connectionState = null,
  capabilities = null,
  loading = false,
  preferences = null,
  onPreferencesChange,
}) {
  const [saveError, setSaveError] = useState("");
  const normalized = normalizeStudioPreferences(preferences || {});
  const access = resolveStudioControlAccess({ connected, connectionType, connectionState, capabilities });
  const supportedCapabilities = getSupportedStudioCapabilities(capabilities);
  const commands = capabilities?.commands || {};
  const transports = Array.isArray(capabilities?.transports) ? capabilities.transports : [];
  const hasPlaytest = supportedCapabilities.includes("playtest")
    || commandAvailable(commands, "run_play_test");
  const providerTypes = [...new Set(
    transports.map((transport) => transport?.connectionType).filter(Boolean)
  )];
  const providerLabel = providerTypes.length > 1
    ? "Plugin + MCP"
    : providerTypes[0] === "mcp_local" || connectionType === "mcp_local"
      ? "Local MCP"
      : "Nexus Plugin";

  const applyOptions = useMemo(() => APPLY_OPTIONS.map((option) => {
    const disabledReason = option.requiresPlaytest && !hasPlaytest
      ? "No provider connected to this Studio target advertises Play Test."
      : option.requiresMutation && !access.canMutate
        ? "No provider connected to this Studio target advertises verified writes."
        : "";
    return { ...option, disabled: Boolean(disabledReason), disabledReason };
  }), [access.canMutate, hasPlaytest]);
  const validationOptions = useMemo(() => VALIDATION_OPTIONS.map((option) => ({
    ...option,
    disabled: Boolean(option.requiresPlaytest && !hasPlaytest),
    disabledReason: option.requiresPlaytest && !hasPlaytest
      ? "Connect a provider that advertises Play Test for this Studio target."
      : "",
  })), [hasPlaytest]);
  const safetyOptions = useMemo(() => SAFETY_OPTIONS.map((option) => ({
    ...option,
    disabled: Boolean(option.requiresMutation && !access.canMutate),
    disabledReason: option.requiresMutation && !access.canMutate
      ? "No provider connected to this Studio target advertises verified writes."
      : "",
  })), [access.canMutate]);

  if (!FEATURE_FLAGS.unifiedAgent) return null;

  const updatePreference = async (key, value) => {
    setSaveError("");
    try {
      const result = await onPreferencesChange?.({ [key]: value });
      if (result && result.ok === false) {
        setSaveError(result.error || "This Studio preference could not be saved.");
      }
    } catch (error) {
      setSaveError(error?.message || "This Studio preference could not be saved.");
    }
  };

  return (
    <section className="overflow-hidden rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-1)]" aria-label="Studio controls">
      <div className="flex items-start justify-between gap-3 px-3 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--ds-text-muted)]" aria-hidden="true" />
            ) : (
              <span className={`h-2 w-2 shrink-0 rounded-full ${connected && access.canUseAgent ? "bg-emerald-400" : "bg-[var(--ds-text-muted)]"}`} aria-hidden="true" />
            )}
            <h3 className="truncate text-xs font-semibold text-[var(--ds-text)]">
              {connected && access.canUseAgent
                ? `Connected${placeName ? ` — ${placeName}` : ""}`
                : loading
                  ? "Checking Studio"
                  : "Studio disconnected"}
            </h3>
          </div>
          <p className="mt-1 pl-4 text-[10px] text-[var(--ds-text-muted)]">
            {connected && access.canUseAgent ? `Automatic routing · ${providerLabel}` : access.statusTitle}
          </p>
        </div>
        <Radio className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ds-text-muted)]" aria-hidden="true" />
      </div>

      <div className="border-t border-[var(--ds-border-subtle)] px-3">
        <ControlRow
          label="Apply changes"
          value={normalized.applyPolicy}
          options={applyOptions}
          onChange={(value) => updatePreference("applyPolicy", value)}
          disabled={!connected || !access.canUseAgent}
          help={!access.canMutate && connected ? "Read-only until a provider advertises verified writes." : "Choose when verified changes may be applied."}
        />
        <ControlRow
          label="Validation"
          value={normalized.validationMode}
          options={validationOptions}
          onChange={(value) => updatePreference("validationMode", value)}
          disabled={!connected || !access.canUseAgent}
          help={!hasPlaytest ? "Playtest unlocks when a connected provider advertises it." : "Controls the verification depth before handoff."}
        />
        <ControlRow
          label="Safety"
          value={normalized.safetyMode}
          options={safetyOptions}
          onChange={(value) => updatePreference("safetyMode", value)}
          disabled={!connected || !access.canUseAgent}
          help="Destructive actions remain snapshot-aware and target scoped."
        />
      </div>

      {saveError ? (
        <p role="alert" className="border-t border-[var(--ds-border-subtle)] px-3 py-2 text-[10px] text-[var(--ds-danger)]">
          {saveError}
        </p>
      ) : null}

      <details className="group border-t border-[var(--ds-border-subtle)]">
        <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 px-3 text-xs font-semibold text-[var(--ds-text-secondary)] outline-none hover:bg-[var(--ds-fill-hover)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--ds-focus-ring)]">
          <span>Advanced</span>
          <ChevronRight className="h-3.5 w-3.5 transition-transform group-open:rotate-90" aria-hidden="true" />
        </summary>
        <div className="space-y-2 border-t border-[var(--ds-border-subtle)] px-3 py-3">
          <p className="text-[10px] leading-4 text-[var(--ds-text-muted)]">
            Provider diagnostics for this Studio target. Nexus routes each command to an advertised capability.
          </p>
          {transports.length ? transports.map((transport) => (
            <div key={`${transport.connectionType}:${transport.sessionId}`} className="flex items-center justify-between gap-3 rounded-lg bg-[var(--ds-fill-subtle)] px-2.5 py-2">
              <span className="min-w-0">
                <span className="block truncate text-[11px] font-semibold text-[var(--ds-text)]">{providerName(transport.connectionType)}</span>
                <span className="block text-[9px] text-[var(--ds-text-muted)]">{providerDescription(transport.connectionType)}</span>
              </span>
              <span className="shrink-0 text-[10px] font-medium text-[var(--ds-text-secondary)]">
                {transport.supportedCommands?.length || 0} commands
              </span>
            </div>
          )) : (
            <p className="rounded-lg bg-[var(--ds-fill-subtle)] px-2.5 py-2 text-[10px] text-[var(--ds-text-muted)]">
              Provider details will appear after Studio advertises its command catalog.
            </p>
          )}
        </div>
      </details>
    </section>
  );
}
