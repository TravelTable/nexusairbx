import NexusSelect from "../ui/NexusSelect";
import React, { useEffect, useState } from "react";
import { authedFetch, startCreditPackCheckout } from "../../lib/billing";
import { CREDIT_PACKS, formatMoney, getPublicPlan } from "../../lib/planCatalog";
import { formatNexusCredits } from "../../lib/creditDenomination";
import { Alert, Button, EmptyState, FormField } from "../ui";
import { Users } from "lib/icons";
import "../../pages/BillingPage.css";

const requestKeys = new Map();

async function request(path, body, method = "POST") {
  const fingerprint = JSON.stringify([path, body, method]);
  if (!requestKeys.has(fingerprint)) requestKeys.set(fingerprint, "team-" + crypto.randomUUID());
  const response = await authedFetch("/api/billing/teams" + path, {
    method,
    headers: { "Content-Type": "application/json", "Idempotency-Key": requestKeys.get(fingerprint) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || data.code || "Team request failed");
  return data;
}

function Panel({ title, description, children }) {
  return (
    <section className="billing-panel" aria-labelledby={title ? "team-billing-heading" : undefined}>
      <header className="billing-panel-header">
        <div>
          {title ? <h2 id="team-billing-heading">{title}</h2> : null}
          {description ? <p>{description}</p> : null}
        </div>
      </header>
      <div className="billing-panel-body">{children}</div>
    </section>
  );
}

export default function TeamBillingPanel() {
  const [enabled, setEnabled] = useState(false);
  const [teams, setTeams] = useState([]);
  const [selected, setSelected] = useState("");
  const [team, setTeam] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [seats, setSeats] = useState(2);
  const [project, setProject] = useState("");
  const [invite, setInvite] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const token = new URLSearchParams(window.location.search).get("teamInvite");

  async function list() {
    setTeams((await request("", null, "GET")).teams);
  }

  useEffect(() => {
    let active = true;
    authedFetch("/api/billing/catalog")
      .then((r) => r.json())
      .then((data) => {
        if (active && data.teamEnabled) {
          setEnabled(true);
          void list().catch((e) => setMessage(e.message));
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selected) {
      setTeam(null);
      return;
    }
    let active = true;
    request("/" + selected, null, "GET")
      .then((data) => {
        if (active) {
          setTeam(data);
          setSeats(Math.max(2, data.members.length));
        }
      })
      .catch((e) => setMessage(e.message));
    return () => {
      active = false;
    };
  }, [selected]);

  async function act(action, success) {
    setBusy(true);
    setMessage("");
    try {
      await action();
      if (success) setMessage(success);
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (!enabled) {
    return (
      <Panel title="Team workspaces">
        <EmptyState
          icon={Users}
          description="Team billing is coming soon. Existing personal plans are unchanged."
        />
      </Panel>
    );
  }

  const canManage = team && ["owner", "admin"].includes(team.role);

  return (
    <Panel title="Team workspace billing" description="Shared seats, pooled credits, and project billing for a studio workspace.">
      {message ? <Alert tone="info">{message}</Alert> : null}
      {token ? (
        <Button
          type="button"
          disabled={busy}
          onClick={() =>
            act(async () => {
              const result = await request("/accept", { token });
              await list();
              setSelected(result.teamId);
            }, "Invitation accepted.")
          }
        >
          Accept your Team invitation
        </Button>
      ) : null}

      <form
        className="billing-form"
        onSubmit={(e) => {
          e.preventDefault();
          void act(async () => {
            const created = await request("", { name });
            await list();
            setSelected(created.id);
            setName("");
          }, "Workspace created. Review a Team subscription before inviting members.");
        }}
      >
        <FormField id="new-workspace-name" label="New workspace name" required>
          <input
            id="new-workspace-name"
            required
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </FormField>
        <Button type="submit" disabled={busy}>
          Create workspace
        </Button>
      </form>

      <FormField id="team-workspace" label="Workspace">
        <NexusSelect id="team-workspace" value={selected} onChange={(e) => setSelected(e.target.value)}>
          <option value="">Choose a workspace</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </NexusSelect>
      </FormField>

      {team ? (
        <>
          <p className="billing-note">
            {team.name} · your role: {team.role} · {formatNexusCredits(team.credits.totalAvailableCreditsMicros)} pooled
            Nexus Credits available
          </p>
          <ul className="billing-members">
            {team.members.map((member) => (
              <li key={member.uid}>
                <span>
                  {member.uid} · {member.role}
                </span>
                {canManage && member.role !== "owner" ? (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={busy}
                    onClick={() =>
                      act(async () => {
                        await request("/" + selected + "/members/" + member.uid, null, "DELETE");
                        setTeam(await request("/" + selected, null, "GET"));
                      }, "Member removed. Seat quantity is unchanged.")
                    }
                  >
                    Remove member
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
          {canManage ? (
            <>
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() =>
                  act(async () => {
                    const response = await authedFetch("/api/portal", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ teamId: selected }),
                    });
                    const result = await response.json();
                    if (!response.ok || !result.url) throw new Error(result.code || "Team portal unavailable");
                    window.location.assign(result.url);
                  })
                }
              >
                Team invoices and payment details
              </Button>
              <FormField id="paid-seats" label="Paid seats">
                <input
                  id="paid-seats"
                  type="number"
                  min={2}
                  max={50}
                  step={1}
                  value={seats}
                  onChange={(e) => setSeats(Number(e.target.value))}
                />
              </FormField>
              <p className="billing-note">
                Team is {formatMoney(getPublicPlan("TEAM").monthly)} per seat monthly, with{" "}
                {getPublicPlan("TEAM").displayCreditsLabel} credits per seat pooled. Seat changes may add prorated
                charges.
              </p>
              <a className="nx-control nx-text-action" href={"/subscribe?plan=TEAM&interval=month&seats=" + seats + "&teamId=" + encodeURIComponent(selected)}>
                Review a new Team subscription
              </a>
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() =>
                  act(() => request("/" + selected + "/seats", { seatCount: seats }), "Seat change submitted. Payment may need confirmation.")
                }
              >
                Update existing subscription seats
              </Button>
              <form
                className="billing-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void act(async () => {
                    const result = await request("/" + selected + "/invitations", { email, role: "member" });
                    setInvite(window.location.origin + "/billing?teamInvite=" + encodeURIComponent(result.token));
                    setEmail("");
                  }, "Invitation prepared. Send this link privately to the invited email address.");
                }}
              >
                <FormField id="invite-email" label="Invite email" required>
                  <input
                    id="invite-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </FormField>
                <Button type="submit" disabled={busy}>
                  Prepare invitation
                </Button>
              </form>
              {invite ? (
                <FormField id="invite-link" label="Private invitation link">
                  <input id="invite-link" readOnly value={invite} onFocus={(e) => e.target.select()} />
                </FormField>
              ) : null}
              <form
                className="billing-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void act(
                    () => request("/" + selected + "/projects/" + encodeURIComponent(project), {}),
                    "This project now bills the Team pool. Project file sharing is managed separately."
                  );
                }}
              >
                <FormField id="project-billing-id" label="Project ID to bill to this workspace" required>
                  <input
                    id="project-billing-id"
                    required
                    value={project}
                    onChange={(e) => setProject(e.target.value)}
                  />
                </FormField>
                <Button type="submit" disabled={busy}>
                  Assign project billing
                </Button>
              </form>
              <p className="billing-note">
                Assigning a project authorizes future AI work in that project to use this workspace’s pooled credits.
              </p>
              <div className="billing-packs">
                {CREDIT_PACKS.map((pack) => (
                  <Button
                    key={pack.id}
                    type="button"
                    variant="secondary"
                    disabled={busy}
                    onClick={() =>
                      act(async () => {
                        const result = await startCreditPackCheckout({ creditPack: pack.id, teamId: selected });
                        window.location.assign(result.url);
                      })
                    }
                  >
                    {pack.name} · {pack.displayCreditsLabel} Team credits · {formatMoney(pack.price)}
                  </Button>
                ))}
              </div>
            </>
          ) : null}
        </>
      ) : null}
    </Panel>
  );
}
