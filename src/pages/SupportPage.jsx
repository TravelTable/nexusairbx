import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { useBilling } from "../context/BillingContext";
import { listSupportTickets } from "../lib/supportApi";
import {
  formatSupportDate,
  supportCategoryLabel,
  supportStatusLabel,
} from "../lib/supportPresentation";
import "./AccountLedger.css";

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
    return <main id="main-content" className="account-ledger-page account-ledger-page--center" role="status">Loading support…</main>;
  }

  if (!user) {
    return (
      <main id="main-content" className="account-ledger-page account-ledger-page--center">
        <section className="account-ledger-center-state" aria-labelledby="support-sign-in-title">
          <p className="account-ledger-kicker">Your support desk</p>
          <h1 id="support-sign-in-title" className="account-ledger-title account-ledger-title--compact">Sign in to see your requests.</h1>
          <p className="account-ledger-intro">
            Support conversations are private to your verified NexusRBX account. You can still read self-service guidance or prepare a request before signing in.
          </p>
          <div className="account-ledger-inline-actions">
            <Link to="/signin" state={{ from: { pathname: location.pathname } }} className="account-ledger-link account-ledger-link--primary">Sign in</Link>
            <Link to="/contact" className="account-ledger-link">Prepare a request</Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main id="main-content" className="account-ledger-page">
      <div className="account-ledger-wrap account-ledger-wrap--narrow">
        <header className="account-ledger-header">
          <div>
            <div className="account-ledger-inline-actions">
              <p className="account-ledger-kicker">Support ledger</p>
              {unread > 0 && <span className="account-ledger-unread">{unread} unread</span>}
            </div>
            <h1 className="account-ledger-title">Your requests</h1>
            <p className="account-ledger-intro">Replies stay attached to your account and are visible only to you and NexusRBX support staff.</p>
          </div>
          <div className="account-ledger-actions">
            <Link to="/contact" className="account-ledger-link account-ledger-link--primary">New request</Link>
          </div>
        </header>

        <div className="account-ledger-section-head account-ledger-section">
          <div className="account-ledger-field-group">
          <label htmlFor="support-filter" className="account-ledger-field-label">Filter requests</label>
          <select id="support-filter" value={filter} onChange={(event) => setFilter(event.target.value)} className="account-ledger-select">
            {FILTERS.map((item) => <option key={item.value || "all"} value={item.value}>{item.label}</option>)}
          </select>
          </div>
        </div>

        {state.error && <div role="alert" className="account-ledger-notice account-ledger-notice--danger">{state.error}</div>}

        <section className="account-ledger-ticket-list" aria-label="Support requests">
          {state.loading ? (
            <p className="account-ledger-empty" role="status">Loading requests…</p>
          ) : state.tickets.length === 0 ? (
            <div className="account-ledger-empty">
              <h2>No requests here</h2>
              <p className="account-ledger-section-copy">If self-service guidance does not solve the issue, start a structured request.</p>
              <Link to="/contact" className="account-ledger-link">Open the contact form →</Link>
            </div>
          ) : state.tickets.map((ticket) => (
            <Link key={ticket.id} to={`/support/${ticket.id}`} className="account-ledger-ticket-row">
              <div className="min-w-0">
                <div className="account-ledger-inline-actions">
                  <h2 className="account-ledger-ticket-subject">{ticket.subject}</h2>
                  {ticket.customerUnreadCount > 0 && <span className="account-ledger-unread" aria-label={`${ticket.customerUnreadCount} unread replies`}>{ticket.customerUnreadCount} new</span>}
                </div>
                <p className="account-ledger-ticket-preview">{ticket.lastMessage?.preview}</p>
              </div>
              <p className="account-ledger-ticket-meta">{supportCategoryLabel(ticket.category)}<br />Updated {formatSupportDate(ticket.updatedAt, { includeTime: true })}</p>
              <span className="account-ledger-state" data-status={ticket.status}>{supportStatusLabel(ticket.status)}</span>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
