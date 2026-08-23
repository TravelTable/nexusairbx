import { useCallback, useEffect, useMemo, useState } from "react";

import {
  addSupportInternalNote,
  adminReplyToSupportTicket,
  getAdminSupportTicket,
  listAdminSupportTickets,
  setSupportAgentRole,
  updateSupportTicketPriority,
  updateSupportTicketStatus,
} from "../lib/supportApi";
import { SUPPORT_CATEGORIES } from "../lib/supportDraft";
import {
  formatSupportDate,
  SUPPORT_PRIORITIES,
  SUPPORT_STATUSES,
  supportCategoryLabel,
  supportStatusLabel,
} from "../lib/supportPresentation";
import "./AccountLedger.css";

const EMPTY_FILTERS = { search: "", category: "", status: "", priority: "" };

function eventDescription(event) {
  if (event.type === "status.changed") return `Status changed from ${supportStatusLabel(event.fromStatus)} to ${supportStatusLabel(event.toStatus)}`;
  if (event.type === "priority.changed") return `Priority changed from ${event.fromPriority || "unset"} to ${event.toPriority}`;
  if (event.type === "ticket.created") return "Request created";
  if (event.type === "message.customer") return "Customer replied";
  if (event.type === "message.agent") return "Public reply sent";
  if (event.type === "note.internal") return "Private note added";
  if (event.type === "customer.read") return "Customer read the conversation";
  if (event.type === "ticket.closed") return "Customer closed the request";
  if (event.type === "ticket.reopened") return "Customer reopened the request";
  return String(event.type || "Activity").replaceAll(".", " ");
}

export default function AdminSupportPage({ isAdmin = false }) {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [queue, setQueue] = useState({ loading: true, error: "", tickets: [] });
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState({ loading: false, error: "", ticket: null });
  const [composer, setComposer] = useState({ type: "reply", message: "" });
  const [busy, setBusy] = useState("");
  const [roleForm, setRoleForm] = useState({ uid: "", enabled: true, status: "", error: "" });

  const loadQueue = useCallback(async () => {
    setQueue((current) => ({ ...current, loading: true, error: "" }));
    try {
      const payload = await listAdminSupportTickets({ limit: 100 });
      setQueue({ loading: false, error: "", tickets: payload.tickets || [] });
    } catch (error) {
      setQueue({ loading: false, error: error.message, tickets: [] });
    }
  }, []);

  const loadDetail = useCallback(async (ticketId) => {
    if (!ticketId) return;
    setDetail((current) => ({ ...current, loading: true, error: "" }));
    try {
      const payload = await getAdminSupportTicket(ticketId);
      setDetail({ loading: false, error: "", ticket: payload.ticket });
    } catch (error) {
      setDetail({ loading: false, error: error.message, ticket: null });
    }
  }, []);

  useEffect(() => { void loadQueue(); }, [loadQueue]);
  useEffect(() => { if (selectedId) void loadDetail(selectedId); }, [loadDetail, selectedId]);

  const filteredTickets = useMemo(() => {
    const needle = filters.search.trim().toLowerCase();
    return queue.tickets.filter((ticket) => {
      if (filters.category && ticket.category !== filters.category) return false;
      if (filters.status && ticket.status !== filters.status) return false;
      if (filters.priority && ticket.priority !== filters.priority) return false;
      if (!needle) return true;
      return [ticket.subject, ticket.id, ticket.requester?.email, ticket.requester?.uid]
        .some((value) => String(value || "").toLowerCase().includes(needle));
    });
  }, [filters, queue.tickets]);

  async function sendComposer(event) {
    event.preventDefault();
    const message = composer.message.trim();
    if (!selectedId || !message) return;
    setBusy(composer.type);
    try {
      const payload = composer.type === "note"
        ? await addSupportInternalNote(selectedId, message)
        : await adminReplyToSupportTicket(selectedId, message);
      setDetail({ loading: false, error: "", ticket: payload.ticket });
      setComposer((current) => ({ ...current, message: "" }));
      await loadQueue();
    } catch (error) {
      setDetail((current) => ({ ...current, error: error.message }));
    } finally {
      setBusy("");
    }
  }

  async function mutateTicket(type, value) {
    if (!selectedId || !value) return;
    setBusy(type);
    try {
      const payload = type === "status"
        ? await updateSupportTicketStatus(selectedId, value)
        : await updateSupportTicketPriority(selectedId, value);
      setDetail({ loading: false, error: "", ticket: payload.ticket });
      await loadQueue();
    } catch (error) {
      setDetail((current) => ({ ...current, error: error.message }));
    } finally {
      setBusy("");
    }
  }

  async function changeSupportRole(event) {
    event.preventDefault();
    const uid = roleForm.uid.trim();
    if (!uid) return;
    setRoleForm((current) => ({ ...current, status: "Updating…", error: "" }));
    try {
      await setSupportAgentRole(uid, roleForm.enabled);
      setRoleForm((current) => ({ ...current, status: current.enabled ? "Support role granted." : "Support role revoked.", error: "" }));
    } catch (error) {
      setRoleForm((current) => ({ ...current, status: "", error: error.message }));
    }
  }

  const ticket = detail.ticket;

  return (
    <main id="main-content" className="account-ledger-page">
      <div className="account-ledger-wrap account-ledger-wrap--wide">
        <header className="account-ledger-header">
          <div>
            <p className="account-ledger-kicker">Staff support</p>
            <h1 className="account-ledger-title">Shared request queue</h1>
            <p className="account-ledger-intro">Public replies, private notes, and immutable activity history in one operational ledger.</p>
          </div>
          <div className="account-ledger-actions">
            <button type="button" onClick={() => void loadQueue()} className="account-ledger-button">Refresh queue</button>
          </div>
        </header>

        <section aria-label="Queue filters" className="account-ledger-filter-bar account-ledger-section">
          <div className="account-ledger-field-group">
            <label className="account-ledger-field-label" htmlFor="support-search">Search requests</label>
            <input id="support-search" type="search" value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Subject, email, request ID…" className="account-ledger-field" />
          </div>
          <QueueSelect label="Category" value={filters.category} onChange={(value) => setFilters((current) => ({ ...current, category: value }))} options={SUPPORT_CATEGORIES.map((item) => ({ value: item.id, label: item.label }))} />
          <QueueSelect label="Status" value={filters.status} onChange={(value) => setFilters((current) => ({ ...current, status: value }))} options={SUPPORT_STATUSES.map((value) => ({ value, label: supportStatusLabel(value) }))} />
          <QueueSelect label="Priority" value={filters.priority} onChange={(value) => setFilters((current) => ({ ...current, priority: value }))} options={SUPPORT_PRIORITIES.map((value) => ({ value, label: value.charAt(0).toUpperCase() + value.slice(1) }))} />
          <button type="button" onClick={() => setFilters(EMPTY_FILTERS)} className="account-ledger-button">Clear filters</button>
        </section>

        {(queue.error || detail.error) && <div role="alert" className="account-ledger-notice account-ledger-notice--danger">{queue.error || detail.error}</div>}

        <div className="account-ledger-queue-layout">
          <aside aria-label="Support queue" className="account-ledger-queue">
            <div className="account-ledger-queue-summary">
              <span>{filteredTickets.length} requests</span><span>{queue.loading ? "Updating…" : "Latest first"}</span>
            </div>
            <div className="account-ledger-queue-scroll">
              {queue.loading && filteredTickets.length === 0 && <p className="account-ledger-empty" role="status">Loading request queue…</p>}
              {filteredTickets.map((item) => (
                <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} aria-current={selectedId === item.id ? "true" : undefined} className="account-ledger-queue-item">
                  <div className="account-ledger-inline-actions">
                    <span className="account-ledger-ticket-subject">{item.subject}</span>
                    {item.staffUnreadCount > 0 && <span className="account-ledger-unread" aria-label={`${item.staffUnreadCount} unread`}>{item.staffUnreadCount} new</span>}
                  </div>
                  <p className="account-ledger-ticket-preview">{item.requester?.email || item.requester?.uid}</p>
                  <div className="account-ledger-queue-meta account-ledger-ticket-meta"><span>{supportCategoryLabel(item.category)} · {item.priority}</span><span>{formatSupportDate(item.updatedAt)}</span></div>
                </button>
              ))}
              {!queue.loading && filteredTickets.length === 0 && <p className="account-ledger-empty">No requests match these filters.</p>}
            </div>
          </aside>

          <section aria-label="Selected request" className="account-ledger-case">
            {!selectedId ? (
              <div className="account-ledger-case-state">Select a request to open the conversation.</div>
            ) : detail.loading && !ticket ? (
              <div className="account-ledger-case-state" role="status">Loading request…</div>
            ) : ticket ? (
              <div>
                <header className="account-ledger-case-head">
                  <div>
                    <p className="account-ledger-ticket-meta">{ticket.id} · {ticket.requester?.email || ticket.requester?.uid}</p>
                    <h2 className="account-ledger-case-title">{ticket.subject}</h2>
                    <p className="account-ledger-ticket-meta">{supportCategoryLabel(ticket.category)} · Opened {formatSupportDate(ticket.createdAt, { includeTime: true })}</p>
                  </div>
                  <div className="account-ledger-case-controls">
                    <div className="account-ledger-field-group">
                      <label className="account-ledger-field-label" htmlFor="ticket-status">Status</label>
                      <select id="ticket-status" value={ticket.status} disabled={Boolean(busy)} onChange={(event) => void mutateTicket("status", event.target.value)} className="account-ledger-select">{SUPPORT_STATUSES.map((value) => <option key={value} value={value}>{supportStatusLabel(value)}</option>)}</select>
                    </div>
                    <div className="account-ledger-field-group">
                      <label className="account-ledger-field-label" htmlFor="ticket-priority">Priority</label>
                      <select id="ticket-priority" value={ticket.priority} disabled={Boolean(busy)} onChange={(event) => void mutateTicket("priority", event.target.value)} className="account-ledger-select capitalize">{SUPPORT_PRIORITIES.map((value) => <option key={value} value={value}>{value}</option>)}</select>
                    </div>
                  </div>
                </header>

                <section className="account-ledger-conversation" aria-label="Request conversation">
                  {(ticket.messages || []).map((message) => (
                    <article key={message.id}>
                      <div><p className="account-ledger-message-author">{message.authorType === "customer" ? "Customer" : message.authorType === "system" ? "System" : "Support"}</p><p className="account-ledger-message-time">{formatSupportDate(message.createdAt, { includeTime: true })}</p></div>
                      <p className="account-ledger-message-body">{message.body}</p>
                    </article>
                  ))}
                </section>

                <form onSubmit={sendComposer} className={`account-ledger-composer ${composer.type === "note" ? "account-ledger-composer--private" : ""}`}>
                  <div className="account-ledger-composer-head">
                    <label className="account-ledger-radio-label"><input type="radio" name="composer-type" value="reply" checked={composer.type === "reply"} onChange={() => setComposer((current) => ({ ...current, type: "reply" }))} />Public reply</label>
                    <label className="account-ledger-radio-label account-ledger-radio-label--private"><input type="radio" name="composer-type" value="note" checked={composer.type === "note"} onChange={() => setComposer((current) => ({ ...current, type: "note" }))} />Private note</label>
                  </div>
                  <p className="account-ledger-detail">{composer.type === "note" ? "Visible only to support staff. It will never be returned by customer APIs." : "The customer will see this reply in their support desk."}</p>
                  <div className="account-ledger-field-group">
                    <label className="account-ledger-field-label" htmlFor="staff-support-composer">Message</label>
                    <textarea id="staff-support-composer" value={composer.message} onChange={(event) => setComposer((current) => ({ ...current, message: event.target.value }))} rows={5} maxLength={10000} required className="account-ledger-textarea" />
                  </div>
                  <div className="account-ledger-actions"><button type="submit" disabled={Boolean(busy) || !composer.message.trim()} className={`account-ledger-button ${composer.type === "note" ? "account-ledger-button--warning" : "account-ledger-button--primary"}`}>{busy === composer.type ? "Saving…" : composer.type === "note" ? "Add private note" : "Send public reply"}</button></div>
                </form>

                {(ticket.internalNotes || []).length > 0 && (
                  <section className="account-ledger-private-notes">
                    <h3>Private staff notes</h3>
                    <div>{ticket.internalNotes.map((note) => <article key={note.id} className="account-ledger-private-note"><p className="account-ledger-message-body">{note.body}</p><p className="account-ledger-message-time">{note.authorEmail || note.authorUid} · {formatSupportDate(note.createdAt, { includeTime: true })}</p></article>)}</div>
                  </section>
                )}

                <section className="account-ledger-section" aria-labelledby="activity-history-title">
                  <h3 id="activity-history-title" className="account-ledger-record-heading">Activity history</h3>
                  <ol className="account-ledger-activity">{(ticket.events || []).map((event) => <li key={event.id}><time>{formatSupportDate(event.createdAt, { includeTime: true })}</time><span>{eventDescription(event)} <span className="account-ledger-ticket-meta">by {event.actorEmail || event.actorType}</span></span></li>)}</ol>
                </section>
              </div>
            ) : null}
          </section>
        </div>

        {isAdmin && (
          <section className="account-ledger-section account-ledger-checkout-action" aria-labelledby="support-access-title">
            <p className="account-ledger-kicker">Admin only</p>
            <h2 id="support-access-title" className="account-ledger-section-title">Support staff access</h2>
            <p className="account-ledger-section-copy">Grant the least-privilege support role using a verified Firebase UID. This does not grant general admin access.</p>
            <form onSubmit={changeSupportRole} className="account-ledger-role-form">
              <div className="account-ledger-field-group">
                <label className="account-ledger-field-label" htmlFor="support-agent-uid">Firebase UID</label>
                <input id="support-agent-uid" value={roleForm.uid} onChange={(event) => setRoleForm((current) => ({ ...current, uid: event.target.value }))} placeholder="Verified Firebase UID" required className="account-ledger-field" />
              </div>
              <div className="account-ledger-field-group">
                <label className="account-ledger-field-label" htmlFor="support-role-action">Access action</label>
                <select id="support-role-action" value={roleForm.enabled ? "grant" : "revoke"} onChange={(event) => setRoleForm((current) => ({ ...current, enabled: event.target.value === "grant" }))} className="account-ledger-select"><option value="grant">Grant support role</option><option value="revoke">Revoke support role</option></select>
              </div>
              <button type="submit" className="account-ledger-button account-ledger-button--primary">Update access</button>
            </form>
            {(roleForm.status || roleForm.error) && <p role={roleForm.error ? "alert" : "status"} className={`account-ledger-notice ${roleForm.error ? "account-ledger-notice--danger" : "account-ledger-notice--success"}`}>{roleForm.error || roleForm.status}</p>}
          </section>
        )}
      </div>
    </main>
  );
}

function QueueSelect({ label, value, onChange, options }) {
  const id = `queue-${label.toLowerCase()}`;
  const plural = { Category: "categories", Status: "statuses", Priority: "priorities" }[label] || `${label.toLowerCase()}s`;
  return <div className="account-ledger-field-group"><label className="account-ledger-field-label" htmlFor={id}>{label}</label><select id={id} value={value} onChange={(event) => onChange(event.target.value)} className="account-ledger-select"><option value="">All {plural}</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>;
}
