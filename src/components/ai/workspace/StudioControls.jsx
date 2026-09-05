import React, { useMemo, useState } from "react";
import { ChevronRight, Loader2, Radio } from "lib/icons";
import { FEATURE_FLAGS } from "../../../lib/featureFlags";
import { normalizeStudioPreferences } from "../../../lib/studioPreferences";
import { getSupportedStudioCapabilities, resolveStudioControlAccess } from "./studioControlAccess";

const APPLY_OPTIONS = [
  { value: "ask_before_applying", label: "Review first" },
  { value: "after_validation", label: "Automatic", requiresMutation: true },
  { value: "after_playtest", label: "After playtest (legacy)", requiresMutation: true, requiresPlaytest: true },
  { value: "never_automatically", label: "Manual" },
];

const VALIDATION_OPTIONS = [
  { value: "quick", label: "Quick" },
  { value: "standard", label: "Standard" },
  { value: "playtest", label: "Playtest", requiresPlaytest: true },
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
    <label className="grid grid-cols-1 items-start gap-2 border-t border-[var(--ds-border-subtle)] py-3 first:border-t-0">
      <span>
        <span className="block text-xs font-semibold text-[var(--ds-text)]">{label}</span>
        {help ? <span className="mt-0.5 block text-[10px] leading-4 text-[var(--ds-text-muted)]">{help}</span> : null}
      </span>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="h-10 w-full min-w-0 rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-fill-subtle)] px-2.5 text-xs font-medium text-[var(--ds-text)] transition-colors hover:border-[var(--ds-border-strong)] focus-visible:border-[var(--ds-accent-border)] focus-visible:ring-2 focus-visible:ring-[var(--ds-focus-ring)] disabled:cursor-not-allowed disabled:opacity-50"
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
  onConnectionOpen,
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

  const applyOptions = useMemo(() => APPLY_OPTIONS.filter(option => option.value !== "after_playtest" || normalized.applyPolicy === "after_playtest").map((option) => {
    const disabledReason = option.requiresPlaytest && !hasPlaytest
      ? "No provider connected to this Studio target advertises Play Test."
      : option.requiresMutation && connected && !access.canMutate
        ? "No provider connected to this Studio target advertises verified writes."
        : "";
    return { ...option, disabled: Boolean(disabledReason), disabledReason };
  }), [access.canMutate, connected, hasPlaytest, normalized.applyPolicy]);
  const validationOptions = useMemo(() => VALIDATION_OPTIONS.map((option) => ({
    ...option,
    disabled: Boolean(option.requiresPlaytest && !hasPlaytest),
    disabledReason: option.requiresPlaytest && !hasPlaytest
      ? "Connect a provider that advertises Play Test for this Studio target."
      : "",
  })), [hasPlaytest]);

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
            {connected && access.canUseAgent ? `Automatic routing · ${providerLabel}` : 'Inspect and download files here. Connect Studio to apply changes.'}
          </p>
        </div>
        {onConnectionOpen ? <button type="button" onClick={onConnectionOpen} className="rounded-md px-2 py-1 text-xs text-[var(--ds-text-secondary)] hover:bg-[var(--ds-fill-hover)] focus-ring">{connected ? 'Manage' : 'Connect Studio'}</button> : <Radio className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ds-text-muted)]" aria-hidden="true" />}
      </div>

      <div className="border-t border-[var(--ds-border-subtle)] px-3">
        <ControlRow
          label="Apply changes"
          value={normalized.applyPolicy}
          options={applyOptions}
          onChange={(value) => updatePreference("applyPolicy", value)}
          disabled={false}
          help={!access.canMutate && connected ? "Connect Studio with write access to apply changes." : "Automatic carries out requested changes. Review first prepares changes for your approval."}
        />
        <ControlRow
          label="Checks"
          value={normalized.validationMode}
          options={validationOptions}
          onChange={(value) => updatePreference("validationMode", value)}
          disabled={false}
          help={!hasPlaytest ? "Playtest needs a compatible Studio connection." : "Standard verifies changes. Playtest also tests them in Studio."}
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
          <label className="flex items-center justify-between gap-3 text-xs text-[var(--ds-text)]">
            Review destructive changes
            <input type="checkbox" checked={normalized.safetyMode !== 'developer_mode'} onChange={event => updatePreference('safetyMode', event.target.checked ? 'auto_apply_verified' : 'developer_mode')} className="h-4 w-4 accent-[var(--ds-accent)] focus-ring" />
          </label>
          <p className="text-[10px] leading-4 text-[var(--ds-text-muted)]">Snapshots are required before destructive changes, even when review is off.</p>
          {normalized.safetyMode === 'review_destructive' && <p className="text-xs text-[var(--ds-text-muted)]">Your previous review policy is preserved. Change this control to use the new behavior.</p>}
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
