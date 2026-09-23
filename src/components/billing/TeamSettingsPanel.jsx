import { useCallback, useEffect, useRef, useState } from "react";
import { authedFetch } from "../../lib/billing";
import { Button, EmptyState, Input } from "../ui";
import { Users } from "lib/icons";

async function read(path, options) {
  const response = await authedFetch(path, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || data.code || "Team request failed");
  return data;
}

export default function TeamSettingsPanel({ user, onChanged }) {
  const [teams, setTeams] = useState([]);
  const [selected, setSelected] = useState("");
  const [detail, setDetail] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [invite, setInvite] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const onChangedRef = useRef(onChanged);
  onChangedRef.current = onChanged;

  const load = useCallback(async () => {
    const data = await read("/api/user/teams", { noCache: true });
    const next = Array.isArray(data.teams) ? data.teams : [];
    setTeams(next);
    setSelected((current) => current || next[0]?.id || "");
    onChangedRef.current?.(next);
  }, []);

  useEffect(() => {
    if (!user) return;
    load().catch((error) => setMessage(error.message));
  }, [user, load]);

  useEffect(() => {
    if (!selected) {
      setDetail(null);
      return;
    }
    let active = true;
    read("/api/billing/teams/" + selected)
      .then((data) => {
        if (active) setDetail(data);
      })
      .catch((error) => setMessage(error.message));
    return () => {
      active = false;
    };
  }, [selected]);

  async function act(action) {
    setBusy(true);
    setMessage("");
    try {
      await action();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  const owned = teams.some((team) => team.ownerId === user?.uid);
  const canManage = detail && ["owner", "admin"].includes(detail.role);
  const atCap = detail && detail.seatUsed >= detail.seatCap;

  return (
    <div className="space-y-6">
      <section className="rounded-md border border-border p-4">
        <h2 className="text-lg font-semibold">Team workspace</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Collaboration is included on every plan. Each member spends their own credits. A Team subscription adds a pooled wallet and up to 50 seats.
        </p>
        {message ? <p className="mt-3 text-sm">{message}</p> : null}
        {!owned ? (
          <form
            className="mt-4 flex flex-col gap-3 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              void act(async () => {
                const created = await read("/api/user/teams", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ name }),
                });
                setName("");
                await load();
                setSelected(created.id);
              });
            }}
          >
            <div className="flex-1 space-y-2">
              <label htmlFor="teamName" className="text-sm font-medium">Team name</label>
              <Input id="teamName" value={name} onChange={(event) => setName(event.target.value)} placeholder="Creator group name" />
            </div>
            <Button type="submit" className="self-end" disabled={busy || !name.trim()}>Create team</Button>
          </form>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">You already own a team. Invite people into that workspace.</p>
        )}
        {teams.length === 0 ? (
          <div className="mt-6">
            <EmptyState icon={Users} title="No teams yet" description="Create a team to invite collaborators and share projects." />
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            {teams.map((team) => (
              <Button key={team.id} type="button" variant={team.id === selected ? "primary" : "secondary"} onClick={() => setSelected(team.id)}>
                {team.name || "Untitled team"}
              </Button>
            ))}
          </div>
        )}
      </section>

      {detail ? (
        <section className="rounded-md border border-border p-4 space-y-4">
          <div>
            <h3 className="font-semibold">{detail.name}</h3>
            <p className="text-sm text-muted-foreground">
              Your role: {detail.role}. Seats {detail.seatUsed} of {detail.seatCap}.
              {detail.pooled ? " This workspace uses a pooled Team wallet." : " Members use their own credits."}
            </p>
            {atCap ? (
              <p className="mt-2 text-sm">
                This team is at its seat cap. Pro includes 5 seats. Team adds a pooled wallet and up to 50 seats.
              </p>
            ) : null}
          </div>
          <ul className="space-y-2">
            {detail.members.map((member) => (
              <li key={member.uid} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>{member.uid} · {member.role}</span>
                {detail.role === "owner" && member.role !== "owner" ? (
                  <span className="flex gap-2">
                    <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={() => act(async () => {
                      await read("/api/billing/teams/" + selected + "/members/" + member.uid, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ role: member.role === "admin" ? "member" : "admin" }),
                      });
                      setDetail(await read("/api/billing/teams/" + selected));
                    })}>{member.role === "admin" ? "Make member" : "Make admin"}</Button>
                    <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => act(async () => {
                      await read("/api/billing/teams/" + selected + "/members/" + member.uid, { method: "DELETE" });
                      setDetail(await read("/api/billing/teams/" + selected));
                      await load();
                    })}>Remove</Button>
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
          {detail.pendingInvites?.length ? (
            <div>
              <h4 className="text-sm font-semibold">Pending invites</h4>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {detail.pendingInvites.map((item) => (
                  <li key={item.email}>{item.email} · {item.role}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {canManage ? (
            <form className="flex flex-col gap-3 sm:flex-row" onSubmit={(event) => {
              event.preventDefault();
              void act(async () => {
                const result = await read("/api/billing/teams/" + selected + "/invitations", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ email, role: "member" }),
                });
                setInvite(window.location.origin + "/billing?teamInvite=" + encodeURIComponent(result.token));
                setEmail("");
                setDetail(await read("/api/billing/teams/" + selected));
              });
            }}>
              <Input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Invite by email" aria-label="Invite by email" />
              <Button type="submit" disabled={busy || atCap}>Invite</Button>
            </form>
          ) : null}
          {invite ? <Input readOnly value={invite} aria-label="Invitation link" onFocus={(event) => event.target.select()} /> : null}
          <div>
            <h4 className="text-sm font-semibold">Shared projects</h4>
            {detail.projects?.length ? (
              <ul className="mt-2 space-y-1 text-sm">
                {detail.projects.map((project) => (
                  <li key={project.projectId}>{project.name || project.projectId}</li>
                ))}
              </ul>
            ) : <p className="mt-2 text-sm text-muted-foreground">No projects shared with this team yet.</p>}
          </div>
          {detail.role === "owner" ? (
            <Button type="button" variant="danger" disabled={busy} onClick={() => act(async () => {
              await read("/api/billing/teams/" + selected, { method: "DELETE" });
              setSelected("");
              setDetail(null);
              await load();
            })}>Delete team</Button>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
