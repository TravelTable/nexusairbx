import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle,
  CreditCard,
  HelpCircle,
  Loader2,
  MessageSquare,
  Shield,
  Wrench,
} from "lib/icons";

import { useBilling } from "../context/BillingContext";
import { createSupportTicket } from "../lib/supportApi";
import {
  clearSupportDraft,
  readSupportDraft,
  saveSupportDraft,
  SUPPORT_CATEGORIES,
  supportDraftFromSearchParams,
} from "../lib/supportDraft";
import { trackProductEvent } from "../lib/productAnalytics";

const EMPTY_FORM = {
  category: "technical",
  subject: "",
  message: "",
  errorMessage: "",
  reproductionSteps: "",
  studioVersion: "",
  pluginVersion: "",
  invoiceReference: "",
  privacyRequestType: "",
  articleUrl: "",
};

const FIELD_CLASS =
  "mt-2 w-full rounded-md border border-white/15 bg-[#0a0d13] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00f5d4] focus:ring-2 focus:ring-[#00f5d4]/20";

function buildTicketMessage(form) {
  const details = [];
  if (form.articleUrl) details.push(`Docs article: ${form.articleUrl}`);
  if (form.errorMessage) details.push(`Error shown:\n${form.errorMessage}`);
  if (form.reproductionSteps) details.push(`Steps to reproduce:\n${form.reproductionSteps}`);
  if (form.studioVersion) details.push(`Roblox Studio version: ${form.studioVersion}`);
  if (form.pluginVersion) details.push(`NexusRBX plugin version: ${form.pluginVersion}`);
  if (form.invoiceReference) details.push(`Invoice reference: ${form.invoiceReference}`);
  if (form.privacyRequestType) details.push(`Request type: ${form.privacyRequestType}`);
  return [form.message.trim(), ...details].filter(Boolean).join("\n\n").slice(0, 10_000);
}

function Field({ label, hint, children }) {
  return (
    <label className="block text-sm font-medium text-gray-200">
      {label}
      {hint && <span className="ml-2 font-normal text-gray-500">{hint}</span>}
      {children}
    </label>
  );
}

function SelfServiceLink({ href, icon: Icon, title, body, internal = false }) {
  const content = (
    <>
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[#00f5d4]" />
      <span>
        <span className="block font-semibold text-white">{title}</span>
        <span className="mt-1 block text-sm leading-6 text-gray-400">{body}</span>
      </span>
    </>
  );
  const className =
    "flex gap-3 border-b border-white/10 py-4 text-left transition first:pt-0 last:border-0 last:pb-0 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00f5d4]";
  return internal ? (
    <Link to={href} className={className}>{content}</Link>
  ) : (
    <a href={href} className={className}>{content}</a>
  );
}

export default function ContactPage() {
  const { user, authReady } = useBilling();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_FORM);
  const [status, setStatus] = useState({ state: "idle", message: "" });

  useEffect(() => {
    const queryDraft = supportDraftFromSearchParams(searchParams);
    const storedDraft = readSupportDraft();
    const restored = queryDraft || storedDraft;
    if (restored) {
      setForm((current) => ({ ...current, ...restored }));
      if (queryDraft?.articleUrl) {
        void trackProductEvent("support_handoff_started", {
          landing_page: "/docs",
          support_category: "technical",
        });
      }
    }
  }, [searchParams]);

  const categoryLabel = useMemo(
    () => SUPPORT_CATEGORIES.find((item) => item.id === form.category)?.label || "Support",
    [form.category]
  );

  function update(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
    if (status.state !== "idle") setStatus({ state: "idle", message: "" });
  }

  async function submit(event) {
    event.preventDefault();
    if (form.subject.trim().length < 5 || form.message.trim().length < 1) {
      setStatus({ state: "error", message: "Add a subject of at least 5 characters and describe what happened." });
      return;
    }
    const draft = saveSupportDraft(form);
    if (!draft) {
      setStatus({ state: "error", message: "Please check the form and try again." });
      return;
    }
    if (!user) {
      navigate("/signin", {
        state: { from: { pathname: location.pathname, search: location.search } },
      });
      return;
    }
    setStatus({ state: "submitting", message: "Creating your request…" });
    try {
      const payload = await createSupportTicket({
        category: draft.category,
        subject: draft.subject,
        message: buildTicketMessage(draft),
      });
      const ticket = payload?.ticket;
      if (!ticket?.id) throw new Error("The request was saved but could not be opened.");
      clearSupportDraft();
      void trackProductEvent("support_ticket_created", {
        support_category: draft.category,
        support_status: ticket.status || "open",
      });
      navigate(`/support/${encodeURIComponent(ticket.id)}`, { replace: true });
    } catch (error) {
      setStatus({ state: "error", message: error?.message || "Could not create your request." });
    }
  }

  const technical = form.category === "technical";
  const billing = form.category === "billing";
  const security = form.category === "security_privacy";

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#07090d] text-white">
      <section className="border-b border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#00f5d4]">Contact NexusRBX</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Tell us what happened. Keep the details in one place.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-gray-400 sm:text-lg">
            You can read the form and prepare a request without an account. Sign in only when you are ready to send it and receive replies.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-12 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:px-8 lg:py-16">
        <form onSubmit={submit} className="min-w-0" noValidate>
          <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-6">
            <div>
              <h2 className="text-2xl font-semibold">New support request</h2>
              <p className="mt-2 text-sm leading-6 text-gray-400">
                Requests are private to the signed-in account that creates them.
              </p>
            </div>
            {user && (
              <span className="max-w-[220px] truncate text-xs text-gray-500" title={user.email || ""}>
                {user.email}
              </span>
            )}
          </div>

          <div className="mt-7 grid gap-6">
            <Field label="Category">
              <select
                className={FIELD_CLASS}
                value={form.category}
                onChange={(event) => update("category", event.target.value)}
              >
                {SUPPORT_CATEGORIES.map((category) => (
                  <option key={category.id} value={category.id}>{category.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Subject" hint="Required">
              <input
                className={FIELD_CLASS}
                value={form.subject}
                minLength={5}
                maxLength={120}
                required
                onChange={(event) => update("subject", event.target.value)}
                placeholder={`Short summary for ${categoryLabel.toLowerCase()}`}
              />
            </Field>

            <Field label="What do you need help with?" hint="Required">
              <textarea
                className={FIELD_CLASS}
                rows={6}
                maxLength={10000}
                required
                value={form.message}
                onChange={(event) => update("message", event.target.value)}
                placeholder="Describe the result you expected and what happened instead."
              />
            </Field>

            {technical && (
              <fieldset className="grid gap-5 border-l-2 border-white/10 pl-5">
                <legend className="mb-4 text-sm font-semibold text-white">Technical details</legend>
                <Field label="Error shown" hint="Optional">
                  <textarea className={FIELD_CLASS} rows={3} value={form.errorMessage} onChange={(event) => update("errorMessage", event.target.value)} />
                </Field>
                <Field label="Steps to reproduce" hint="Optional">
                  <textarea className={FIELD_CLASS} rows={4} value={form.reproductionSteps} onChange={(event) => update("reproductionSteps", event.target.value)} />
                </Field>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Roblox Studio version" hint="Optional">
                    <input className={FIELD_CLASS} value={form.studioVersion} onChange={(event) => update("studioVersion", event.target.value)} />
                  </Field>
                  <Field label="NexusRBX plugin version" hint="Optional">
                    <input className={FIELD_CLASS} value={form.pluginVersion} onChange={(event) => update("pluginVersion", event.target.value)} />
                  </Field>
                </div>
              </fieldset>
            )}

            {billing && (
              <Field label="Invoice reference" hint="Optional — never include a card number">
                <input className={FIELD_CLASS} value={form.invoiceReference} maxLength={160} onChange={(event) => update("invoiceReference", event.target.value)} />
              </Field>
            )}

            {security && (
              <Field label="Security or privacy request type">
                <select className={FIELD_CLASS} value={form.privacyRequestType} onChange={(event) => update("privacyRequestType", event.target.value)}>
                  <option value="">Select a request type</option>
                  <option value="Security report">Security report</option>
                  <option value="Access my data">Access my data</option>
                  <option value="Delete my account data">Delete my account data</option>
                  <option value="Correct my data">Correct my data</option>
                  <option value="Other privacy request">Other privacy request</option>
                </select>
              </Field>
            )}

            <div className="flex gap-3 border border-amber-400/25 bg-amber-400/[0.06] p-4 text-sm leading-6 text-amber-100">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <p>Do not include passwords, API keys, login codes, card numbers, or Roblox credentials. NexusRBX staff will not ask for them in a ticket.</p>
            </div>

            {status.state === "error" && (
              <div role="alert" className="border border-red-400/30 bg-red-400/[0.07] px-4 py-3 text-sm text-red-100">
                {status.message}
              </div>
            )}

            <div className="flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-500">
                {user ? `Replies will go to the verified account ${user.email}.` : "Your draft is kept in this tab while you sign in."}
              </p>
              <button
                type="submit"
                disabled={status.state === "submitting" || !authReady || form.subject.trim().length < 5 || !form.message.trim()}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#00f5d4] px-5 text-sm font-semibold text-black transition hover:bg-[#20e5cc] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {status.state === "submitting" ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                {user ? "Create request" : "Sign in to send"}
              </button>
            </div>
          </div>
        </form>

        <aside className="space-y-10">
          <section>
            <h2 className="text-base font-semibold">Try these first</h2>
            <div className="mt-5">
              <SelfServiceLink href="/docs" icon={BookOpen} title="Documentation" body="Install the plugin, connect Studio, and resolve common errors." />
              <SelfServiceLink href="/support" icon={HelpCircle} title="Your requests" body="Read replies and continue an existing request." internal />
              <SelfServiceLink href="/billing" icon={CreditCard} title="Billing settings" body="View your current plan and manage an active subscription." internal />
              <SelfServiceLink href="/ai" icon={Wrench} title="Open the workspace" body="Return to your projects, prompts, and Studio connection." internal />
            </div>
          </section>

          <section className="border-t border-white/10 pt-8">
            <h2 className="text-base font-semibold">What happens next</h2>
            <ol className="mt-5 space-y-5 text-sm leading-6 text-gray-400">
              <li className="flex gap-3"><CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#00f5d4]" /><span>Your request appears immediately in <strong className="font-medium text-gray-200">Your requests</strong>.</span></li>
              <li className="flex gap-3"><Shield className="mt-0.5 h-5 w-5 shrink-0 text-[#00f5d4]" /><span>Only you and authorized NexusRBX support staff can read the conversation.</span></li>
              <li className="flex gap-3"><MessageSquare className="mt-0.5 h-5 w-5 shrink-0 text-[#00f5d4]" /><span>Return to the ticket to read and reply. You can close it when the issue is finished.</span></li>
            </ol>
          </section>
        </aside>
      </section>
    </main>
  );
}
