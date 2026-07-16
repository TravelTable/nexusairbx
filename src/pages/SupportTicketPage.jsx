import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";

import { useBilling } from "../context/BillingContext";
import {
  closeSupportTicket,
  getSupportTicket,
  markSupportTicketRead,
  reopenSupportTicket,
  replyToSupportTicket,
} from "../lib/supportApi";
import {
  formatSupportDate,
  supportCategoryLabel,
  supportStatusLabel,
  supportStatusTone,
} from "../lib/supportPresentation";
import { trackProductEvent } from "../lib/productAnalytics";

export default function SupportTicketPage() {
  const { ticketId } = useParams();
  const { user, authReady } = useBilling();
  const location = useLocation();
  const [state, setState] = useState({ loading: true, error: "", ticket: null });
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState("");

  const loadTicket = useCallback(async ({ markRead = true } = {}) => {
    if (!user || !ticketId) return;
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const payload = await getSupportTicket(ticketId);
      setState({ loading: false, error: "", ticket: payload.ticket });
      if (markRead && Number(payload.ticket?.customerUnreadCount || 0) > 0) {
        try {
          await markSupportTicketRead(ticketId);
          setState((current) => ({
            ...current,
            ticket: current.ticket ? { ...current.ticket, customerUnreadCount: 0 } : current.ticket,
          }));
        } catch (_) {
          // Reading the conversation should not fail just because the secondary
          // unread acknowledgement could not be persisted.
        }
      }
    } catch (error) {
      setState({ loading: false, error: error.message, ticket: null });
    }
  }, [ticketId, user]);

  useEffect(() => { void loadTicket(); }, [loadTicket]);

  async function submitReply(event) {
    event.preventDefault();
    const message = reply.trim();
    if (!message || !ticketId) return;
    setBusy("reply");
    setState((current) => ({ ...current, error: "" }));
    try {
      const payload = await replyToSupportTicket(ticketId, message);
      setReply("");
      setState({ loading: false, error: "", ticket: payload.ticket });
      void trackProductEvent("support_reply_sent", { support_status: payload.ticket?.status || "unknown" });
    } catch (error) {
      setState((current) => ({ ...current, error: error.message }));
    } finally {
      setBusy("");
    }
  }

  async function changeOpenState() {
    if (!state.ticket || !ticketId) return;
    const shouldReopen = state.ticket.status === "closed" || state.ticket.status === "resolved";
    setBusy(shouldReopen ? "reopen" : "close");
    setState((current) => ({ ...current, error: "" }));
    try {
      const payload = shouldReopen
        ? await reopenSupportTicket(ticketId)
        : await closeSupportTicket(ticketId);
      setState({ loading: false, error: "", ticket: payload.ticket });
      if (!shouldReopen) {
        void trackProductEvent("support_ticket_resolved", { support_status: payload.ticket?.status || "closed" });
      }
    } catch (error) {
      setState((current) => ({ ...current, error: error.message }));
    } finally {
      setBusy("");
    }
  }

  if (!authReady) {
    return <main className="min-h-[70vh] bg-[#07090d] grid place-items-center text-sm text-slate-400">Loading request…</main>;
  }

  if (!user) {
    return (
      <main className="min-h-[70vh] bg-[#07090d] px-4 py-20 text-white">
        <div className="mx-auto max-w-xl border-t border-white/15 pt-10">
          <h1 className="text-3xl font-semibold">Sign in to view this request.</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">Only the verified requester and NexusRBX support staff can open this conversation.</p>
          <Link to="/signin" state={{ from: { pathname: location.pathname } }} className="mt-7 inline-flex rounded-md bg-white px-4 py-2.5 text-sm font-semibold text-black">Sign in</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#07090d] px-4 py-10 text-white sm:px-6">
      <div className="mx-auto max-w-4xl">
        <Link to="/support" className="text-sm font-medium text-slate-400 hover:text-white">← All requests</Link>

        {state.error && <div role="alert" className="mt-6 border-l-2 border-red-400 bg-red-400/5 px-4 py-3 text-sm text-red-200">{state.error}</div>}
        {state.loading ? (
          <p className="py-16 text-center text-sm text-slate-400">Loading conversation…</p>
        ) : !state.ticket ? (
          <section className="mt-8 border-t border-white/10 pt-8">
            <h1 className="text-2xl font-semibold">Request unavailable</h1>
            <p className="mt-3 text-sm text-slate-400">It may not exist, or it belongs to a different account.</p>
          </section>
        ) : (
          <>
            <header className="mt-6 border-b border-white/10 pb-7">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">{supportCategoryLabel(state.ticket.category)}</p>
                  <h1 className="mt-2 break-words text-3xl font-semibold tracking-tight">{state.ticket.subject}</h1>
                  <p className="mt-2 text-xs text-slate-500">Opened {formatSupportDate(state.ticket.createdAt, { includeTime: true })} · Request {state.ticket.id}</p>
                </div>
                <span className={`w-fit rounded-full border px-2.5 py-1 text-xs font-medium ${supportStatusTone(state.ticket.status)}`}>{supportStatusLabel(state.ticket.status)}</span>
              </div>
            </header>

            <section aria-label="Support conversation" className="divide-y divide-white/10">
              {(state.ticket.messages || []).map((message) => {
                const fromCustomer = message.authorType === "customer";
                return (
                  <article key={message.id} className="grid gap-3 py-6 sm:grid-cols-[150px_minmax(0,1fr)]">
                    <div>
                      <p className="text-sm font-semibold text-white">{fromCustomer ? "You" : message.authorType === "system" ? "NexusRBX" : "Support"}</p>
                      <time className="mt-1 block text-xs text-slate-500" dateTime={message.createdAt || undefined}>{formatSupportDate(message.createdAt, { includeTime: true })}</time>
                    </div>
                    <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-300">{message.body}</p>
                  </article>
                );
              })}
            </section>

            {!["closed", "resolved"].includes(state.ticket.status) && (
              <form onSubmit={submitReply} className="border-t border-white/10 pt-6">
                <label htmlFor="support-reply" className="text-sm font-semibold">Reply</label>
                <textarea id="support-reply" value={reply} onChange={(event) => setReply(event.target.value)} rows={6} maxLength={10000} required className="mt-3 w-full resize-y rounded-md border border-white/15 bg-[#0d1118] px-3 py-3 text-sm leading-6 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300" placeholder="Add the details support needs to continue…" />
                <p className="mt-2 text-xs text-slate-500">Do not include passwords, API keys, card numbers, or recovery codes.</p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <button type="button" disabled={Boolean(busy)} onClick={changeOpenState} className="rounded-md border border-white/15 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/[0.05] disabled:opacity-50">{busy === "close" ? "Closing…" : "Close request"}</button>
                  <button type="submit" disabled={Boolean(busy) || !reply.trim()} className="rounded-md bg-cyan-300 px-5 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50">{busy === "reply" ? "Sending…" : "Send reply"}</button>
                </div>
              </form>
            )}

            {["closed", "resolved"].includes(state.ticket.status) && (
              <div className="flex flex-col gap-4 border-t border-white/10 py-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-400">This request is {state.ticket.status}. Reopen it if the same issue still needs attention.</p>
                <button type="button" disabled={Boolean(busy)} onClick={changeOpenState} className="rounded-md border border-white/15 px-4 py-2 text-sm font-semibold hover:bg-white/[0.05]">{busy === "reopen" ? "Reopening…" : "Reopen request"}</button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
