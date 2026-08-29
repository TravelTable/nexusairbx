import React, { useId, useMemo, useState } from "react";
import { ChevronDown, Search } from "lib/icons";
import { Input } from "../shadcn/input";
import styles from "./UsageInsights.module.css";

const DAY_MS = 24 * 60 * 60 * 1000;

function numberValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

export function formatUsageNumber(value) {
  return new Intl.NumberFormat().format(Math.round(numberValue(value)));
}

function dateValue(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function filterUsageChart(data = [], days = 30, now = Date.now()) {
  const cutoff = now - Math.max(1, Number(days) || 30) * DAY_MS;
  return data.filter((entry) => {
    const date = dateValue(entry?.date);
    return date && date.getTime() >= cutoff;
  });
}

export function buildUsageSummary(data = [], availableTokens = 0, unlimited = false) {
  const values = data.map((entry) => numberValue(entry?.tokens));
  const total = values.reduce((sum, value) => sum + value, 0);
  const dates = data.map((entry) => dateValue(entry?.date)).filter(Boolean);
  const first = dates.length ? Math.min(...dates.map((date) => date.getTime())) : null;
  const last = dates.length ? Math.max(...dates.map((date) => date.getTime())) : null;
  const calendarDays = first != null && last != null ? Math.max(1, Math.round((last - first) / DAY_MS) + 1) : 0;
  const dailyAverage = calendarDays ? Math.round(total / calendarDays) : 0;
  const runwayDays = unlimited
    ? Infinity
    : dailyAverage > 0
      ? Math.floor(numberValue(availableTokens) / dailyAverage)
      : null;

  return {
    total,
    dailyAverage,
    peak: Math.max(0, ...values),
    activeDays: values.filter((value) => value > 0).length,
    calendarDays,
    runwayDays,
  };
}

export function groupUsageLogs(logs = []) {
  const groups = new Map();
  logs.forEach((log) => {
    const key = String(log?.requestType || log?.reason || "Other").trim() || "Other";
    groups.set(key, (groups.get(key) || 0) + numberValue(log?.chargedTokens ?? log?.tokens));
  });
  return [...groups.entries()]
    .map(([key, tokens]) => ({ key, tokens }))
    .sort((a, b) => b.tokens - a.tokens);
}

function humanize(value) {
  return String(value || "Other")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDateTime(value) {
  const date = dateValue(value);
  if (!date) return "Unknown time";
  return date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function UsageChart({ data }) {
  const titleId = useId();
  const descriptionId = useId();
  const width = 760;
  const height = 250;
  const padding = { top: 18, right: 14, bottom: 32, left: 54 };
  const values = data.map((entry) => numberValue(entry?.tokens));
  const maximum = Math.max(1, ...values);
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const points = values.map((value, index) => ({
    x: padding.left + (values.length === 1 ? 0.5 : index / (values.length - 1)) * plotWidth,
    y: padding.top + plotHeight - (value / maximum) * plotHeight,
  }));
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  const linePoints = points.map(({ x, y }) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const areaPath = points.length
    ? [
        `M ${firstPoint.x.toFixed(1)} ${(padding.top + plotHeight).toFixed(1)}`,
        ...points.map(({ x, y }) => `L ${x.toFixed(1)} ${y.toFixed(1)}`),
        `L ${lastPoint.x.toFixed(1)} ${(padding.top + plotHeight).toFixed(1)} Z`,
      ].join(" ")
    : "";

  if (!data.length) {
    return <div className={styles.chartEmpty}>No token activity in this period.</div>;
  }

  return (
    <div className={styles.chartWrap}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby={`${titleId} ${descriptionId}`}>
        <title id={titleId}>Token usage over time</title>
        <desc id={descriptionId}>Daily token usage ranges from zero to {formatUsageNumber(maximum)}.</desc>
        {[maximum, maximum / 2, 0].map((value, index) => {
          const y = padding.top + (index / 2) * plotHeight;
          return (
            <g key={`${index}-${value}`}>
              <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} className={styles.gridLine} />
              <text x={padding.left - 10} y={y + 4} textAnchor="end" className={styles.axisLabel}>
                {formatUsageNumber(value)}
              </text>
            </g>
          );
        })}
        <path d={areaPath} className={styles.area} />
        <polyline points={linePoints} className={styles.line} vectorEffect="non-scaling-stroke" />
        {points.map(({ x, y }, index) => (
          <circle key={`${data[index]?.date || index}-${values[index]}`} cx={x} cy={y} r="3.5" className={styles.point} vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      <div className={styles.chartDates} aria-hidden="true">
        <span>{data[0]?.date}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  );
}

function UsageActivity({ logs }) {
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const filteredLogs = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return logs.slice(0, 8);
    return logs.filter((log) => [log?.requestType, log?.reason, log?.model]
      .some((value) => String(value || "").toLowerCase().includes(normalized))).slice(0, 8);
  }, [logs, query]);

  return (
    <section className={styles.activityCard} aria-labelledby="usage-activity-title">
      <div className={styles.activityHeader}>
        <div>
          <h4 id="usage-activity-title">Recent usage</h4>
          <p>{logs.length} recorded {logs.length === 1 ? "event" : "events"}</p>
        </div>
        <label className={styles.searchField}>
          <Search aria-hidden="true" />
          <span className="sr-only">Search usage events</span>
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search activity" />
        </label>
      </div>
      {filteredLogs.length ? (
        <div className={styles.activityList}>
          {filteredLogs.map((log, index) => {
            const id = String(log?.id || `${log?.createdAt || "usage"}-${index}`);
            const expanded = expandedId === id;
            return (
              <div className={styles.activityItem} key={id}>
                <button type="button" onClick={() => setExpandedId(expanded ? null : id)} aria-expanded={expanded}>
                  <ChevronDown className={expanded ? styles.chevronOpen : ""} aria-hidden="true" />
                  <span className={styles.activityType}>{humanize(log?.requestType || log?.reason)}</span>
                  <span className={styles.activityModel}>{log?.model || "Automatic model"}</span>
                  <time>{formatDateTime(log?.createdAt)}</time>
                  <strong>{formatUsageNumber(log?.chargedTokens ?? log?.tokens)} tokens</strong>
                </button>
                {expanded ? (
                  <dl className={styles.activityDetails}>
                    <div><dt>Reason</dt><dd>{log?.reason || "Not recorded"}</dd></div>
                    <div><dt>Raw tokens</dt><dd>{formatUsageNumber(log?.rawTokens ?? log?.tokens)}</dd></div>
                    <div><dt>Cost tier</dt><dd>{log?.modelCostTierLabel || log?.modelCostTier || "Standard"}</dd></div>
                  </dl>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : <div className={styles.activityEmpty}>No usage events match your search.</div>}
    </section>
  );
}

export default function UsageInsights({ data = [], logs = [], billing = {}, compact = false }) {
  const [range, setRange] = useState(30);
  const filteredData = useMemo(() => filterUsageChart(data, range), [data, range]);
  const summary = useMemo(
    () => buildUsageSummary(filteredData, billing.totalRemaining, billing.unlimitedTokens),
    [billing.totalRemaining, billing.unlimitedTokens, filteredData],
  );
  const breakdown = useMemo(() => groupUsageLogs(logs).slice(0, 5), [logs]);
  const breakdownMaximum = Math.max(1, ...breakdown.map((item) => item.tokens));
  const limit = numberValue(billing.subLimit);
  const remaining = numberValue(billing.subRemaining);
  const percentUsed = billing.unlimitedTokens ? 0 : limit > 0 ? Math.min(100, Math.max(0, ((limit - remaining) / limit) * 100)) : 0;
  const runway = billing.unlimitedTokens
    ? "Unlimited"
    : summary.runwayDays == null
      ? "No forecast"
      : summary.runwayDays > 365
        ? "365+ days"
        : `${summary.runwayDays} days`;

  return (
    <div className={styles.root}>
      <section className={styles.primaryCard} aria-labelledby="usage-summary-title">
        <div className={styles.primaryHeader}>
          <div>
            <span className={styles.eyebrow}>Included usage</span>
            <h3 id="usage-summary-title">
              {billing.unlimitedTokens ? "Unlimited" : formatUsageNumber(billing.totalRemaining)}
              {!billing.unlimitedTokens ? <small> tokens available</small> : null}
            </h3>
          </div>
          <span className={styles.planBadge}>{billing.plan || "FREE"}</span>
        </div>
        <div className={styles.meterLabels}>
          <span>{Math.round(percentUsed)}% used</span>
          <span>{billing.resetsAt ? `Resets ${new Date(billing.resetsAt).toLocaleDateString()}` : "Reset unavailable"}</span>
        </div>
        <div className={styles.meterTrack} role="progressbar" aria-label="Included usage consumed" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(percentUsed)}>
          <span style={{ width: `${percentUsed}%` }} />
        </div>
      </section>

      <div className={styles.metricGrid}>
        <div><span>Tokens used</span><strong>{formatUsageNumber(summary.total)}</strong><small>selected period</small></div>
        <div><span>Daily average</span><strong>{formatUsageNumber(summary.dailyAverage)}</strong><small>calendar average</small></div>
        <div><span>Peak day</span><strong>{formatUsageNumber(summary.peak)}</strong><small>tokens</small></div>
        <div><span>Projected runway</span><strong>{runway}</strong><small>at current pace</small></div>
      </div>

      {!compact ? <section className={styles.chartCard} aria-labelledby="usage-history-title">
        <div className={styles.chartHeader}>
          <div><h4 id="usage-history-title">Usage history</h4><p>Daily charged tokens</p></div>
          <div className={styles.rangeTabs} aria-label="Usage date range">
            {[7, 30].map((days) => (
              <button key={days} type="button" aria-pressed={range === days} onClick={() => setRange(days)}>{days}d</button>
            ))}
          </div>
        </div>
        <UsageChart data={filteredData} />
      </section> : null}

      {!compact && breakdown.length ? (
        <section className={styles.breakdownCard} aria-labelledby="usage-breakdown-title">
          <div><h4 id="usage-breakdown-title">Usage by workflow</h4><p>Where tokens were consumed</p></div>
          <div className={styles.breakdownList}>
            {breakdown.map((item) => (
              <div key={item.key}>
                <div><span>{humanize(item.key)}</span><strong>{formatUsageNumber(item.tokens)}</strong></div>
                <span className={styles.breakdownTrack}><span style={{ width: `${Math.max(4, (item.tokens / breakdownMaximum) * 100)}%` }} /></span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {!compact && logs.length ? <UsageActivity logs={logs} /> : null}
    </div>
  );
}
