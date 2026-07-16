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
  supportStatusTone,
} from "../lib/supportPresentation";

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
    <main className="min-h-[calc(100vh-4rem)] bg-[#07090d] px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-[1500px]">
        <header className="flex flex-col gap-5 border-b border-white/10 pb-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-cyan-300">Staff support</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Shared request queue</h1>
            <p className="mt-2 text-sm text-slate-400">Public replies, private notes, and immutable activity history in one place.</p>
          </div>
          <button type="button" onClick={() => void loadQueue()} className="w-fit rounded-md border border-white/15 px-4 py-2 text-sm font-medium hover:bg-white/[0.05]">Refresh queue</button>
        </header>

        <section aria-label="Queue filters" className="grid gap-3 border-b border-white/10 py-5 sm:grid-cols-2 xl:grid-cols-[minmax(240px,1fr)_repeat(3,190px)_auto]">
          <label className="sr-only" htmlFor="support-search">Search requests</label>
          <input id="support-search" type="search" value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Search subject, email, request ID…" className="h-10 rounded-md border border-white/15 bg-[#0d1118] px-3 text-sm outline-none focus:border-cyan-300" />
          <QueueSelect label="Category" value={filters.category} onChange={(value) => setFilters((current) => ({ ...current, category: value }))} options={SUPPORT_CATEGORIES.map((item) => ({ value: item.id, label: item.label }))} />
          <QueueSelect label="Status" value={filters.status} onChange={(value) => setFilters((current) => ({ ...current, status: value }))} options={SUPPORT_STATUSES.map((value) => ({ value, label: supportStatusLabel(value) }))} />
          <QueueSelect label="Priority" value={filters.priority} onChange={(value) => setFilters((current) => ({ ...current, priority: value }))} options={SUPPORT_PRIORITIES.map((value) => ({ value, label: value.charAt(0).toUpperCase() + value.slice(1) }))} />
          <button type="button" onClick={() => setFilters(EMPTY_FILTERS)} className="h-10 rounded-md border border-white/15 px-4 text-sm text-slate-300 hover:bg-white/[0.05]">Clear</button>
        </section>

        {(queue.error || detail.error) && <div role="alert" className="my-4 border-l-2 border-red-400 bg-red-400/5 px-4 py-3 text-sm text-red-200">{queue.error || detail.error}</div>}

        <div className="grid min-h-[650px] border-b border-white/10 lg:grid-cols-[380px_minmax(0,1fr)]">
          <aside aria-label="Support queue" className="border-b border-white/10 lg:border-b-0 lg:border-r">
            <div className="flex items-center justify-between border-b border-white/10 px-3 py-3 text-xs text-slate-500">
              <span>{filteredTickets.length} requests</span><span>{queue.loading ? "Updating…" : "Latest first"}</span>
            </div>
            <div className="max-h-[760px] overflow-y-auto">
              {filteredTickets.map((item) => (
                <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} className={`block w-full border-b border-white/10 px-3 py-4 text-left outline-none hover:bg-white/[0.04] focus-visible:bg-white/[0.06] ${selectedId === item.id ? "bg-white/[0.06]" : ""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <span className="line-clamp-2 text-sm font-semibold text-white">{item.subject}</span>
                    {item.staffUnreadCount > 0 && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-cyan-300" aria-label={`${item.staffUnreadCount} unread`} />}
                  </div>
                  <p className="mt-1 truncate text-xs text-slate-400">{item.requester?.email || item.requester?.uid}</p>
                  <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-500"><span>{supportCategoryLabel(item.category)} · {item.priority}</span><span>{formatSupportDate(item.updatedAt)}</span></div>
                </button>
              ))}
              {!queue.loading && filteredTickets.length === 0 && <p className="px-4 py-12 text-center text-sm text-slate-500">No requests match these filters.</p>}
            </div>
          </aside>

          <section aria-label="Selected request" className="min-w-0 lg:px-7">
            {!selectedId ? (
              <div className="grid min-h-[500px] place-items-center text-sm text-slate-500">Select a request to open the conversation.</div>
            ) : detail.loading && !ticket ? (
              <div className="grid min-h-[500px] place-items-center text-sm text-slate-500">Loading request…</div>
            ) : ticket ? (
              <div className="py-6">
                <div className="flex flex-col gap-5 border-b border-white/10 pb-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500">{ticket.id} · {ticket.requester?.email || ticket.requester?.uid}</p>
                    <h2 className="mt-2 break-words text-2xl font-semibold">{ticket.subject}</h2>
                    <p className="mt-2 text-xs text-slate-500">{supportCategoryLabel(ticket.category)} · Opened {formatSupportDate(ticket.createdAt, { includeTime: true })}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <label className="sr-only" htmlFor="ticket-status">Ticket status</label>
                    <select id="ticket-status" value={ticket.status} disabled={Boolean(busy)} onChange={(event) => void mutateTicket("status", event.target.value)} className={`h-9 rounded-md border px-2 text-xs outline-none ${supportStatusTone(ticket.status)}`}>{SUPPORT_STATUSES.map((value) => <option className="bg-[#0d1118] text-white" key={value} value={value}>{supportStatusLabel(value)}</option>)}</select>
                    <label className="sr-only" htmlFor="ticket-priority">Ticket priority</label>
                    <select id="ticket-priority" value={ticket.priority} disabled={Boolean(busy)} onChange={(event) => void mutateTicket("priority", event.target.value)} className="h-9 rounded-md border border-white/15 bg-[#0d1118] px-2 text-xs capitalize outline-none">{SUPPORT_PRIORITIES.map((value) => <option key={value} value={value}>{value}</option>)}</select>
                  </div>
                </div>

                <div className="divide-y divide-white/10">
                  {(ticket.messages || []).map((message) => (
                    <article key={message.id} className="grid gap-2 py-5 sm:grid-cols-[140px_minmax(0,1fr)]">
                      <div><p className="text-sm font-semibold">{message.authorType === "customer" ? "Customer" : message.authorType === "system" ? "System" : "Support"}</p><p className="mt-1 text-xs text-slate-500">{formatSupportDate(message.createdAt, { includeTime: true })}</p></div>
                      <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-300">{message.body}</p>
                    </article>
                  ))}
                </div>

                <form onSubmit={sendComposer} className={`border-t px-4 py-5 ${composer.type === "note" ? "border-amber-300/25 bg-amber-300/[0.06]" : "border-white/10 bg-white/[0.025]"}`}>
                  <div className="flex items-center gap-4">
                    <label className="text-sm font-semibold"><input type="radio" name="composer-type" value="reply" checked={composer.type === "reply"} onChange={() => setComposer((current) => ({ ...current, type: "reply" }))} className="mr-2" />Public reply</label>
                    <label className="text-sm font-semibold text-amber-200"><input type="radio" name="composer-type" value="note" checked={composer.type === "note"} onChange={() => setComposer((current) => ({ ...current, type: "note" }))} className="mr-2" />Private note</label>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{composer.type === "note" ? "Visible only to support staff. It will never be returned by customer APIs." : "The customer will see this reply in their support desk."}</p>
                  <textarea value={composer.message} onChange={(event) => setComposer((current) => ({ ...current, message: event.target.value }))} rows={5} maxLength={10000} required className="mt-3 w-full resize-y rounded-md border border-white/15 bg-[#0a0d12] px-3 py-3 text-sm leading-6 outline-none focus:border-cyan-300" />
                  <div className="mt-3 flex justify-end"><button type="submit" disabled={Boolean(busy) || !composer.message.trim()} className={`rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-50 ${composer.type === "note" ? "bg-amber-200 text-slate-950" : "bg-cyan-300 text-slate-950"}`}>{busy === composer.type ? "Saving…" : composer.type === "note" ? "Add private note" : "Send public reply"}</button></div>
                </form>

                {(ticket.internalNotes || []).length > 0 && (
                  <section className="mt-7 border-l-2 border-amber-300/40 pl-4">
                    <h3 className="text-sm font-semibold text-amber-200">Private staff notes</h3>
                    <div className="mt-3 space-y-4">{ticket.internalNotes.map((note) => <article key={note.id}><p className="whitespace-pre-wrap text-sm leading-6 text-slate-300">{note.body}</p><p className="mt-1 text-xs text-slate-500">{note.authorEmail || note.authorUid} · {formatSupportDate(note.createdAt, { includeTime: true })}</p></article>)}</div>
                  </section>
                )}

                <section className="mt-8 border-t border-white/10 pt-5">
                  <h3 className="text-sm font-semibold">Activity history</h3>
                  <ol className="mt-3 space-y-3">{(ticket.events || []).map((event) => <li key={event.id} className="grid gap-1 text-xs sm:grid-cols-[180px_minmax(0,1fr)]"><time className="text-slate-500">{formatSupportDate(event.createdAt, { includeTime: true })}</time><span className="text-slate-300">{eventDescription(event)} <span className="text-slate-600">by {event.actorEmail || event.actorType}</span></span></li>)}</ol>
                </section>
              </div>
            ) : null}
          </section>
        </div>

        {isAdmin && (
          <section className="mt-8 max-w-2xl border-t border-white/10 pt-7">
            <p className="text-sm font-semibold text-cyan-300">Admin only</p>
            <h2 className="mt-2 text-xl font-semibold">Support staff access</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">Grant the least-privilege support role using a verified Firebase UID. This does not grant general admin access.</p>
            <form onSubmit={changeSupportRole} className="mt-5 flex flex-col gap-3 sm:flex-row">
              <label className="sr-only" htmlFor="support-agent-uid">Firebase UID</label>
              <input id="support-agent-uid" value={roleForm.uid} onChange={(event) => setRoleForm((current) => ({ ...current, uid: event.target.value }))} placeholder="Firebase UID" required className="h-10 min-w-0 flex-1 rounded-md border border-white/15 bg-[#0d1118] px-3 text-sm outline-none focus:border-cyan-300" />
              <select aria-label="Support role action" value={roleForm.enabled ? "grant" : "revoke"} onChange={(event) => setRoleForm((current) => ({ ...current, enabled: event.target.value === "grant" }))} className="h-10 rounded-md border border-white/15 bg-[#0d1118] px-3 text-sm"><option value="grant">Grant support role</option><option value="revoke">Revoke support role</option></select>
              <button type="submit" className="h-10 rounded-md bg-white px-4 text-sm font-semibold text-black">Update access</button>
            </form>
            {(roleForm.status || roleForm.error) && <p role="status" className={`mt-3 text-sm ${roleForm.error ? "text-red-300" : "text-emerald-300"}`}>{roleForm.error || roleForm.status}</p>}
          </section>
        )}
      </div>
    </main>
  );
}

function QueueSelect({ label, value, onChange, options }) {
  const id = `queue-${label.toLowerCase()}`;
  const plural = { Category: "categories", Status: "statuses", Priority: "priorities" }[label] || `${label.toLowerCase()}s`;
  return <><label className="sr-only" htmlFor={id}>{label}</label><select id={id} value={value} onChange={(event) => onChange(event.target.value)} className="h-10 rounded-md border border-white/15 bg-[#0d1118] px-3 text-sm outline-none focus:border-cyan-300"><option value="">All {plural}</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></>;
}
