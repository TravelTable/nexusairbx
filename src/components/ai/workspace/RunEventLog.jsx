import React, { useMemo, useState } from "react";
import { Activity, ChevronDown, Search } from "lib/icons";

import styles from "./RunEventLog.module.css";

function firstText(...values) {
  return values.find((value) => typeof value === "string" && value.trim())?.trim() || "";
}

function humanize(value) {
  return String(value || "Progress update")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function timestampValue(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function eventTone(type, status, payload = {}) {
  const text = `${type} ${status} ${payload.level || ""}`.toLowerCase();
  if (/fail|error|blocked|timeout|conflict/.test(text)) return "danger";
  if (/warn|wait|pending|pause|approval/.test(text)) return "warning";
  if (/complete|success|succeed|applied|verified|passed/.test(text)) return "success";
  return "info";
}

function durationLabel(payload = {}, event = {}) {
  const milliseconds = Number(payload.durationMs ?? event.durationMs);
  if (Number.isFinite(milliseconds) && milliseconds >= 0) {
    return milliseconds < 1000 ? `${Math.round(milliseconds)}ms` : `${(milliseconds / 1000).toFixed(1)}s`;
  }
  return firstText(payload.duration, event.duration);
}

export function normalizeRunEvents(events = [], agents = []) {
  const normalizedEvents = (Array.isArray(events) ? events : []).map((event, index) => {
    const payload = event?.payload && typeof event.payload === "object" ? event.payload : {};
    const type = firstText(event?.type, event?.eventType, payload.type, payload.eventType, "progress_update");
    const status = firstText(payload.status, event?.status, payload.state);
    const message = firstText(
      payload.userMessage,
      payload.safeMessage,
      payload.progressMessage,
      payload.summary,
      payload.message,
      event?.message,
      humanize(type),
    );
    const timestamp = firstText(event?.createdAt, event?.timestamp, payload.createdAt, payload.timestamp);
    return {
      id: String(event?.id || event?.eventId || `${type}-${event?.sequence ?? index}`),
      source: "Task",
      type,
      label: humanize(type),
      message,
      status: status || humanize(type),
      tone: eventTone(type, status, payload),
      timestamp,
      duration: durationLabel(payload, event),
      sequence: event?.sequence ?? payload.sequence ?? null,
      stepId: firstText(payload.stepId, payload.planStepId, event?.stepId),
      runId: firstText(payload.runId, event?.runId),
    };
  });

  const seenRuns = new Set();
  const normalizedRuns = (Array.isArray(agents) ? agents : []).flatMap((agent) => {
    const runs = [...(agent?.currentRun ? [agent.currentRun] : []), ...(Array.isArray(agent?.runs) ? agent.runs : [])];
    return runs.flatMap((run, index) => {
      const runId = String(run?.runId || run?.id || "");
      if (!runId || seenRuns.has(runId)) return [];
      seenRuns.add(runId);
      const status = firstText(run?.status, run?.state, agent?.status, "running");
      return [{
        id: `agent-${runId}`,
        source: "Agent",
        type: "agent_run",
        label: "Agent run",
        message: `Run ${runId.slice(-8)}`,
        status: humanize(status),
        tone: eventTone("agent_run", status),
        timestamp: firstText(run?.updatedAt, run?.createdAt, agent?.updatedAt),
        duration: durationLabel(run, run),
        sequence: index,
        stepId: "",
        runId,
      }];
    });
  });

  return [...normalizedEvents, ...normalizedRuns].sort((left, right) => {
    const leftTime = timestampValue(left.timestamp)?.getTime() || 0;
    const rightTime = timestampValue(right.timestamp)?.getTime() || 0;
    if (leftTime !== rightTime) return rightTime - leftTime;
    return Number(right.sequence || 0) - Number(left.sequence || 0);
  });
}

export function filterRunEvents(events, query, tone) {
  const normalizedQuery = String(query || "").trim().toLowerCase();
  return events.filter((event) => {
    const matchesTone = tone === "all" || event.tone === tone;
    const matchesQuery = !normalizedQuery || [event.label, event.message, event.status, event.runId, event.stepId]
      .some((value) => String(value || "").toLowerCase().includes(normalizedQuery));
    return matchesTone && matchesQuery;
  });
}

function formatTime(value) {
  const date = timestampValue(value);
  if (!date) return "Now";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function RunEventLog({ events = [], agents = [] }) {
  const [query, setQuery] = useState("");
  const [tone, setTone] = useState("all");
  const [expandedId, setExpandedId] = useState(null);
  const normalized = useMemo(() => normalizeRunEvents(events, agents), [agents, events]);
  const filtered = useMemo(() => filterRunEvents(normalized, query, tone), [normalized, query, tone]);

  if (!normalized.length) return null;

  const attentionCount = normalized.filter((event) => ["danger", "warning"].includes(event.tone)).length;

  return (
    <section className={styles.root} aria-labelledby="run-event-log-title">
      <div className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Runtime evidence</span>
          <h3 id="run-event-log-title">Event log</h3>
          <p>{normalized.length} {normalized.length === 1 ? "event" : "events"}{attentionCount ? ` · ${attentionCount} need attention` : ""}</p>
        </div>
        <Activity aria-hidden="true" />
      </div>

      <div className={styles.tools}>
        <label className={styles.search}>
          <Search aria-hidden="true" />
          <span className="sr-only">Search run events</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search events" />
        </label>
        <div className={styles.filters} aria-label="Filter run events">
          {["all", "warning", "danger"].map((value) => (
            <button key={value} type="button" aria-pressed={tone === value} onClick={() => setTone(value)}>
              {value === "all" ? "All" : value === "warning" ? "Waiting" : "Errors"}
            </button>
          ))}
        </div>
      </div>

      {filtered.length ? (
        <div className={styles.list}>
          {filtered.map((event) => {
            const expanded = expandedId === event.id;
            return (
              <article key={event.id} className={styles.item} data-tone={event.tone}>
                <button type="button" onClick={() => setExpandedId(expanded ? null : event.id)} aria-expanded={expanded}>
                  <span className={styles.stateMark} aria-hidden="true" />
                  <span className={styles.eventCopy}>
                    <span><strong>{event.label}</strong><time>{formatTime(event.timestamp)}</time></span>
                    <small>{event.message}</small>
                  </span>
                  {event.duration ? <span className={styles.duration}>{event.duration}</span> : null}
                  <ChevronDown className={expanded ? styles.chevronOpen : ""} aria-hidden="true" />
                </button>
                {expanded ? (
                  <dl className={styles.details}>
                    <div><dt>Status</dt><dd>{event.status}</dd></div>
                    <div><dt>Source</dt><dd>{event.source}</dd></div>
                    {event.stepId ? <div><dt>Step</dt><dd>{event.stepId}</dd></div> : null}
                    {event.runId ? <div><dt>Run</dt><dd>{event.runId}</dd></div> : null}
                  </dl>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : <div className={styles.empty}>No runtime events match this filter.</div>}
    </section>
  );
}
