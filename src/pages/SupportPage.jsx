import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { useBilling } from "../context/BillingContext";
import { listSupportTickets } from "../lib/supportApi";
import {
  formatSupportDate,
  supportCategoryLabel,
  supportStatusLabel,
  supportStatusTone,
} from "../lib/supportPresentation";

const FILTERS = [
  { value: "", label: "All requests" },
  { value: "open", label: "Open" },
  { value: "waiting_on_support", label: "Waiting on support" },
  { value: "waiting_on_customer", label: "Waiting on you" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

export default function SupportPage() {
  const { user, authReady } = useBilling();
  const location = useLocation();
  const [filter, setFilter] = useState("");
  const [state, setState] = useState({ loading: false, error: "", tickets: [] });

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setState((current) => ({ ...current, loading: true, error: "" }));
    listSupportTickets(filter ? { status: filter, limit: 100 } : { limit: 100 })
      .then((payload) => {
        if (!cancelled) setState({ loading: false, error: "", tickets: payload.tickets || [] });
      })
      .catch((error) => {
        if (!cancelled) setState({ loading: false, error: error.message, tickets: [] });
      });
    return () => { cancelled = true; };
  }, [filter, user]);

  const unread = useMemo(
    () => state.tickets.reduce((count, ticket) => count + Number(ticket.customerUnreadCount || 0), 0),
    [state.tickets]
  );

  if (!authReady) {
    return <main className="grid min-h-[70vh] place-items-center bg-[var(--ds-bg-canvas)] text-sm text-[var(--ds-text-muted)]">Loading support…</main>;
  }

  if (!user) {
    return (
      <main className="min-h-[70vh] bg-[var(--ds-bg-canvas)] px-4 py-20 text-[var(--ds-text)]">
        <section className="mx-auto max-w-2xl rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-1)] p-8 sm:p-10">
          <p className="text-sm font-semibold text-[var(--ds-accent)]">Your support desk</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.03em]">Sign in to see your requests.</h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-[var(--ds-text-muted)]">
            Support conversations are private to your verified NexusRBX account. You can still read self-service guidance or prepare a request before signing in.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/signin" state={{ from: { pathname: location.pathname } }} className="inline-flex min-h-11 items-center rounded-[10px] bg-[var(--ds-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--ds-accent-foreground)] hover:bg-[var(--ds-accent-hover)] active:scale-[0.985]">Sign in</Link>
            <Link to="/contact" className="inline-flex min-h-11 items-center rounded-[10px] border border-[var(--ds-border)] bg-[var(--ds-fill-subtle)] px-5 py-2.5 text-sm font-semibold text-[var(--ds-text)] hover:bg-[var(--ds-fill-hover)]">Prepare a request</Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[var(--ds-bg-canvas)] px-4 py-12 text-[var(--ds-text)] sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-6 border-b border-[var(--ds-border-subtle)] pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <p className="text-sm font-semibold text-[var(--ds-accent)]">Support</p>
              {unread > 0 && <span className="rounded-full bg-[var(--ds-accent)] px-2 py-0.5 text-xs font-bold text-[var(--ds-accent-foreground)]">{unread} unread</span>}
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Your requests</h1>
            <p className="mt-3 text-sm leading-6 text-[var(--ds-text-muted)]">Replies stay attached to your account and are visible only to you and NexusRBX support staff.</p>
          </div>
          <Link to="/contact" className="inline-flex min-h-11 items-center justify-center rounded-[10px] bg-[var(--ds-accent)] px-4 text-sm font-semibold text-[var(--ds-accent-foreground)] hover:bg-[var(--ds-accent-hover)] active:scale-[0.985]">New request</Link>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label htmlFor="support-filter" className="text-sm font-medium text-[var(--ds-text-secondary)]">Filter requests</label>
          <select id="support-filter" value={filter} onChange={(event) => setFilter(event.target.value)} className="min-h-11 rounded-[10px] border border-[var(--ds-border)] bg-[var(--ds-surface-2)] px-3 text-sm text-[var(--ds-text)] focus:border-[var(--ds-accent-border)] focus:outline-none focus:ring-2 focus:ring-[var(--ds-accent-soft)]">
            {FILTERS.map((item) => <option key={item.value || "all"} value={item.value}>{item.label}</option>)}
          </select>
        </div>

        {state.error && <div role="alert" className="mt-6 rounded-lg border border-[color-mix(in_srgb,var(--ds-danger)_30%,transparent)] bg-[color-mix(in_srgb,var(--ds-danger)_8%,transparent)] px-4 py-3 text-sm text-[var(--ds-danger)]">{state.error}</div>}

        <div className="mt-6 divide-y divide-[var(--ds-border-subtle)] border-y border-[var(--ds-border-subtle)]">
          {state.loading ? (
            <p className="py-12 text-center text-sm text-[var(--ds-text-muted)]">Loading requests…</p>
          ) : state.tickets.length === 0 ? (
            <div className="py-14 text-center">
              <h2 className="text-lg font-semibold">No requests here</h2>
              <p className="mt-2 text-sm text-[var(--ds-text-muted)]">If self-service guidance does not solve the issue, start a structured request.</p>
              <Link to="/contact" className="mt-5 inline-block min-h-11 rounded-lg px-2 py-3 text-sm font-semibold text-[var(--ds-accent)] hover:text-[var(--ds-accent-hover)]">Open the contact form →</Link>
            </div>
          ) : state.tickets.map((ticket) => (
            <Link key={ticket.id} to={`/support/${ticket.id}`} className="group grid gap-4 py-5 outline-none transition-colors hover:bg-[var(--ds-fill-hover)] focus-visible:bg-[var(--ds-fill-active)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--ds-accent)] sm:grid-cols-[minmax(0,1fr)_auto] sm:px-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate font-semibold text-[var(--ds-text)] group-hover:text-[var(--ds-accent)]">{ticket.subject}</h2>
                  {ticket.customerUnreadCount > 0 && <span className="h-2 w-2 rounded-full bg-[var(--ds-accent)]" aria-label={`${ticket.customerUnreadCount} unread replies`} />}
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-[var(--ds-text-secondary)]">{ticket.lastMessage?.preview}</p>
                <p className="mt-2 text-xs text-[var(--ds-text-muted)]">{supportCategoryLabel(ticket.category)} · Updated {formatSupportDate(ticket.updatedAt, { includeTime: true })}</p>
              </div>
              <span className={`h-fit w-fit rounded-full border px-2.5 py-1 text-xs font-medium ${supportStatusTone(ticket.status)}`}>{supportStatusLabel(ticket.status)}</span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
