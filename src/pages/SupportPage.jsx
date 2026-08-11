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
import {
  editorialDisplayClass,
  editorialGutterClass,
  editorialPanelClass,
  editorialPrimaryButtonClass,
  editorialSecondaryButtonClass,
} from "../components/site/editorialUi";

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
      <main className={`${editorialGutterClass} min-h-[70vh] bg-[var(--ds-bg-canvas)] py-20 text-[var(--ds-text)] sm:py-28`}>
        <section className={`${editorialPanelClass} mx-auto max-w-2xl p-8 sm:p-12`}>
          <p className="text-sm font-semibold text-[var(--ds-accent)]">Your support desk</p>
          <h1 className={`${editorialDisplayClass} mt-4 text-5xl sm:text-6xl`}>Sign in to see your requests.</h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-[var(--ds-text-muted)]">
            Support conversations are private to your verified NexusRBX account. You can still read self-service guidance or prepare a request before signing in.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/signin" state={{ from: { pathname: location.pathname } }} className={editorialPrimaryButtonClass}>Sign in</Link>
            <Link to="/contact" className={editorialSecondaryButtonClass}>Prepare a request</Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className={`${editorialGutterClass} min-h-[calc(100vh-4rem)] bg-[var(--ds-bg-canvas)] py-16 text-[var(--ds-text)] sm:py-20`}>
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-8 pb-10 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <p className="text-sm font-semibold text-[var(--ds-accent)]">Support</p>
              {unread > 0 && <span className="rounded-full bg-[var(--ds-accent)] px-2 py-0.5 text-xs font-bold text-[var(--ds-accent-foreground)]">{unread} unread</span>}
            </div>
            <h1 className={`${editorialDisplayClass} mt-3 text-5xl sm:text-6xl`}>Your requests</h1>
            <p className="mt-3 text-sm leading-6 text-[var(--ds-text-muted)]">Replies stay attached to your account and are visible only to you and NexusRBX support staff.</p>
          </div>
          <Link to="/contact" className={editorialPrimaryButtonClass}>New request</Link>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label htmlFor="support-filter" className="text-sm font-medium text-[var(--ds-text-secondary)]">Filter requests</label>
          <select id="support-filter" value={filter} onChange={(event) => setFilter(event.target.value)} className="min-h-12 rounded-[10px] border border-[var(--ds-border)] bg-[var(--ds-surface-2)] px-4 text-sm text-[var(--ds-text)] focus:border-[var(--ds-accent-border)] focus:outline-none focus:ring-2 focus:ring-[var(--ds-focus-ring)]">
            {FILTERS.map((item) => <option key={item.value || "all"} value={item.value}>{item.label}</option>)}
          </select>
        </div>

        {state.error && <div role="alert" className="mt-6 rounded-lg border border-[color-mix(in_srgb,var(--ds-danger)_30%,transparent)] bg-[color-mix(in_srgb,var(--ds-danger)_8%,transparent)] px-4 py-3 text-sm text-[var(--ds-danger)]">{state.error}</div>}

        <div className="mt-8 divide-y divide-[var(--ds-border-subtle)] border-y border-[var(--ds-border-subtle)]">
          {state.loading ? (
            <p className="py-12 text-center text-sm text-[var(--ds-text-muted)]">Loading requests…</p>
          ) : state.tickets.length === 0 ? (
            <div className="py-14 text-center">
              <h2 className="text-lg font-semibold">No requests here</h2>
              <p className="mt-2 text-sm text-[var(--ds-text-muted)]">If self-service guidance does not solve the issue, start a structured request.</p>
              <Link to="/contact" className="mt-5 inline-block min-h-11 rounded-lg px-2 py-3 text-sm font-semibold text-[var(--ds-accent)] hover:text-[var(--ds-accent-hover)]">Open the contact form →</Link>
            </div>
          ) : state.tickets.map((ticket) => (
            <Link key={ticket.id} to={`/support/${ticket.id}`} className="group grid gap-4 rounded-[12px] py-6 outline-none transition-colors hover:bg-[var(--ds-fill-hover)] focus-visible:bg-[var(--ds-fill-active)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--ds-focus-ring)] sm:grid-cols-[minmax(0,1fr)_auto] sm:px-4">
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
