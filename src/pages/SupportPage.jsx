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
    return <main className="min-h-[70vh] bg-[#07090d] grid place-items-center text-sm text-slate-400">Loading support…</main>;
  }

  if (!user) {
    return (
      <main className="min-h-[70vh] bg-[#07090d] px-4 py-20 text-white">
        <section className="mx-auto max-w-2xl border-t border-white/15 pt-10">
          <p className="text-sm font-semibold text-cyan-300">Your support desk</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">Sign in to see your requests.</h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-400">
            Support conversations are private to your verified NexusRBX account. You can still read self-service guidance or prepare a request before signing in.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/signin" state={{ from: { pathname: location.pathname } }} className="rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-black hover:bg-slate-200">Sign in</Link>
            <Link to="/contact" className="rounded-md border border-white/15 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/[0.05]">Prepare a request</Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#07090d] px-4 py-12 text-white sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-6 border-b border-white/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <p className="text-sm font-semibold text-cyan-300">Support</p>
              {unread > 0 && <span className="rounded-full bg-cyan-300 px-2 py-0.5 text-xs font-bold text-slate-950">{unread} unread</span>}
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Your requests</h1>
            <p className="mt-3 text-sm leading-6 text-slate-400">Replies stay attached to your account and are visible only to you and NexusRBX support staff.</p>
          </div>
          <Link to="/contact" className="inline-flex h-10 items-center justify-center rounded-md bg-cyan-300 px-4 text-sm font-semibold text-slate-950 hover:bg-cyan-200">New request</Link>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label htmlFor="support-filter" className="text-sm font-medium text-slate-300">Filter requests</label>
          <select id="support-filter" value={filter} onChange={(event) => setFilter(event.target.value)} className="h-10 rounded-md border border-white/15 bg-[#0d1118] px-3 text-sm text-white focus:border-cyan-300 focus:outline-none">
            {FILTERS.map((item) => <option key={item.value || "all"} value={item.value}>{item.label}</option>)}
          </select>
        </div>

        {state.error && <div role="alert" className="mt-6 border-l-2 border-red-400 bg-red-400/5 px-4 py-3 text-sm text-red-200">{state.error}</div>}

        <div className="mt-6 divide-y divide-white/10 border-y border-white/10">
          {state.loading ? (
            <p className="py-12 text-center text-sm text-slate-400">Loading requests…</p>
          ) : state.tickets.length === 0 ? (
            <div className="py-14 text-center">
              <h2 className="text-lg font-semibold">No requests here</h2>
              <p className="mt-2 text-sm text-slate-400">If self-service guidance does not solve the issue, start a structured request.</p>
              <Link to="/contact" className="mt-5 inline-block text-sm font-semibold text-cyan-300 hover:text-cyan-200">Open the contact form →</Link>
            </div>
          ) : state.tickets.map((ticket) => (
            <Link key={ticket.id} to={`/support/${ticket.id}`} className="group grid gap-4 py-5 outline-none transition hover:bg-white/[0.025] focus-visible:bg-white/[0.04] sm:grid-cols-[minmax(0,1fr)_auto] sm:px-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate font-semibold text-white group-hover:text-cyan-200">{ticket.subject}</h2>
                  {ticket.customerUnreadCount > 0 && <span className="h-2 w-2 rounded-full bg-cyan-300" aria-label={`${ticket.customerUnreadCount} unread replies`} />}
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-slate-400">{ticket.lastMessage?.preview}</p>
                <p className="mt-2 text-xs text-slate-500">{supportCategoryLabel(ticket.category)} · Updated {formatSupportDate(ticket.updatedAt, { includeTime: true })}</p>
              </div>
              <span className={`h-fit w-fit rounded-full border px-2.5 py-1 text-xs font-medium ${supportStatusTone(ticket.status)}`}>{supportStatusLabel(ticket.status)}</span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
