import { useEffect, useState } from "react";
import { authedFetch } from "../../../lib/billing";

async function read(path, options) {
  const response = await authedFetch(path, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || data.code || "Team request failed");
  return data;
}

export default function TeamCollaboration({ user, projectId, onOpenSharedChat }) {
  const [people, setPeople] = useState([]);
  const [shared, setShared] = useState([]);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!user || !projectId) {
      setPeople([]);
      return undefined;
    }
    let active = true;
    const displayName = user.displayName || user.email || "Member";
    const beat = () => {
      read("/api/teams/projects/" + encodeURIComponent(projectId) + "/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName }),
      }).catch(() => {});
    };
    const pull = () => {
      read("/api/teams/projects/" + encodeURIComponent(projectId) + "/presence")
        .then((data) => {
          if (active) setPeople(Array.isArray(data.members) ? data.members : []);
        })
        .catch(() => {});
    };
    beat();
    pull();
    const heartbeat = setInterval(beat, 20000);
    const poll = setInterval(pull, 10000);
    return () => {
      active = false;
      clearInterval(heartbeat);
      clearInterval(poll);
    };
  }, [user, projectId]);

  useEffect(() => {
    if (!user || !open) return undefined;
    let active = true;
    read("/api/teams/shared-projects")
      .then((data) => {
        if (active) setShared(Array.isArray(data.projects) ? data.projects : []);
      })
      .catch((error) => setMessage(error.message));
    return () => {
      active = false;
    };
  }, [user, open]);

  async function share() {
    setMessage("");
    try {
      const listed = await read("/api/user/teams");
      const team = (listed.teams || []).find((item) => item.ownerId === user?.uid) || listed.teams?.[0];
      if (!team) {
        setMessage("Create a team in Settings first.");
        return;
      }
      await read("/api/teams/projects/" + encodeURIComponent(projectId) + "/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: team.id }),
      });
      setMessage("Project shared with " + (team.name || "your team") + ".");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function openShared(project) {
    const session = await read("/api/teams/projects/" + encodeURIComponent(project.projectId || project.id) + "/session");
    if (!session.chatId) {
      setMessage("That shared project has no chat yet.");
      return;
    }
    onOpenSharedChat?.(session);
  }

  if (!user) return null;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center" aria-label="People in this project">
        {people.map((person) => (
          <span
            key={person.uid}
            title={person.displayName || person.role}
            className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border bg-muted text-[10px]"
          >
            {(person.displayName || person.role || "?").slice(0, 1).toUpperCase()}
          </span>
        ))}
      </div>
      {projectId ? (
        <button type="button" className="text-xs underline" onClick={share}>Share</button>
      ) : null}
      <button type="button" className="text-xs underline" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        Shared
      </button>
      {open ? (
        <div className="absolute right-4 top-12 z-20 w-64 rounded-md border border-border bg-background p-3 text-sm shadow">
          {shared.length ? shared.map((project) => (
            <button
              key={project.projectId || project.id}
              type="button"
              className="block w-full truncate py-1 text-left"
              onClick={() => openShared(project)}
            >
              {project.name || project.title || project.projectId}
            </button>
          )) : <p>No projects shared with you yet.</p>}
          {message ? <p className="mt-2 text-xs">{message}</p> : null}
        </div>
      ) : null}
      {!open && message ? <span className="text-xs">{message}</span> : null}
    </div>
  );
}
