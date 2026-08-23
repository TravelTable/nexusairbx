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
} from "../lib/supportPresentation";
import { trackProductEvent } from "../lib/productAnalytics";
import "./AccountLedger.css";

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
    return <main id="main-content" className="account-ledger-page account-ledger-page--center" role="status">Loading request…</main>;
  }

  if (!user) {
    return (
      <main id="main-content" className="account-ledger-page account-ledger-page--center">
        <section className="account-ledger-center-state" aria-labelledby="ticket-sign-in-title">
          <p className="account-ledger-kicker">Private request</p>
          <h1 id="ticket-sign-in-title" className="account-ledger-title account-ledger-title--compact">Sign in to view this request.</h1>
          <p className="account-ledger-intro">Only the verified requester and NexusRBX support staff can open this conversation.</p>
          <Link to="/signin" state={{ from: { pathname: location.pathname } }} className="account-ledger-link account-ledger-link--primary">Sign in</Link>
        </section>
      </main>
    );
  }

  return (
    <main id="main-content" className="account-ledger-page">
      <div className="account-ledger-wrap account-ledger-wrap--narrow">
        <Link to="/support" className="account-ledger-back">← All requests</Link>

        {state.error && <div role="alert" className="account-ledger-notice account-ledger-notice--danger">{state.error}</div>}
        {state.loading ? (
          <p className="account-ledger-empty" role="status">Loading conversation…</p>
        ) : !state.ticket ? (
          <section className="account-ledger-empty">
            <h1>Request unavailable</h1>
            <p className="account-ledger-section-copy">It may not exist, or it belongs to a different account.</p>
          </section>
        ) : (
          <>
            <header className="account-ledger-header">
              <div>
                <p className="account-ledger-kicker">{supportCategoryLabel(state.ticket.category)}</p>
                <h1 className="account-ledger-title account-ledger-title--compact">{state.ticket.subject}</h1>
                <dl className="account-ledger-meta">
                  <div>
                    <dt>Opened</dt>
                    <dd>{formatSupportDate(state.ticket.createdAt, { includeTime: true })}</dd>
                  </div>
                  <div>
                    <dt>Request</dt>
                    <dd>{state.ticket.id}</dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd><span className="account-ledger-state" data-status={state.ticket.status}>{supportStatusLabel(state.ticket.status)}</span></dd>
                  </div>
                </dl>
              </div>
            </header>

            <section aria-label="Support conversation" className="account-ledger-conversation">
              {(state.ticket.messages || []).map((message) => {
                const fromCustomer = message.authorType === "customer";
                return (
                  <article key={message.id}>
                    <div>
                      <p className="account-ledger-message-author">{fromCustomer ? "You" : message.authorType === "system" ? "NexusRBX" : "Support"}</p>
                      <time className="account-ledger-message-time" dateTime={message.createdAt || undefined}>{formatSupportDate(message.createdAt, { includeTime: true })}</time>
                    </div>
                    <p className="account-ledger-message-body">{message.body}</p>
                  </article>
                );
              })}
            </section>

            {!["closed", "resolved"].includes(state.ticket.status) && (
              <form onSubmit={submitReply} className="account-ledger-composer">
                <div className="account-ledger-field-group">
                  <label htmlFor="support-reply" className="account-ledger-field-label">Reply</label>
                  <textarea id="support-reply" value={reply} onChange={(event) => setReply(event.target.value)} rows={6} maxLength={10000} required className="account-ledger-textarea" placeholder="Add the details support needs to continue…" />
                  <p className="account-ledger-detail">Do not include passwords, API keys, card numbers, or recovery codes.</p>
                </div>
                <div className="account-ledger-section-head">
                  <button type="button" disabled={Boolean(busy)} onClick={changeOpenState} className="account-ledger-button">{busy === "close" ? "Closing…" : "Close request"}</button>
                  <button type="submit" disabled={Boolean(busy) || !reply.trim()} className="account-ledger-button account-ledger-button--primary">{busy === "reply" ? "Sending…" : "Send reply"}</button>
                </div>
              </form>
            )}

            {["closed", "resolved"].includes(state.ticket.status) && (
              <div className="account-ledger-composer account-ledger-section-head">
                <p className="account-ledger-section-copy">This request is {state.ticket.status}. Reopen it if the same issue still needs attention.</p>
                <button type="button" disabled={Boolean(busy)} onClick={changeOpenState} className="account-ledger-button">{busy === "reopen" ? "Reopening…" : "Reopen request"}</button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
