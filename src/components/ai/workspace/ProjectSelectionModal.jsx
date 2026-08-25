import React, { useMemo, useRef, useState } from "react";
import { Gamepad2, Loader, RefreshCw, Search } from "lib/icons";
import Modal from "../../Modal";
import "./ProjectSelectionModal.css";

function ProjectThumbnail({ experience }) {
  const [failed, setFailed] = useState(false);
  if (!experience.thumbnailUrl || failed) {
    return (
      <div className="project-selection__thumbnail project-selection__thumbnail--fallback">
        <Gamepad2 aria-hidden="true" />
      </div>
    );
  }
  return (
    <img
      className="project-selection__thumbnail"
      src={experience.thumbnailUrl}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

function EmptyState({ icon, title, description, action, role }) {
  return (
    <div className="project-selection__empty" role={role}>
      <span className="project-selection__empty-icon" aria-hidden="true">
        {icon}
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}

export default function ProjectSelectionModal({
  open,
  canClose = false,
  connected = false,
  loading = false,
  authorizationLoading = false,
  error = "",
  errorCode = "",
  gameAccessGranted = false,
  authorization = null,
  partial = false,
  warnings = [],
  experiences = [],
  selectingUniverseId = "",
  onClose,
  onConnect,
  onChangeAccess,
  onRetry,
  onSelect,
}) {
  const [query, setQuery] = useState("");
  const searchRef = useRef(null);
  const accessRequired = !gameAccessGranted
    || errorCode === "ROBLOX_EXPERIENCE_READ_REAUTHORIZATION_REQUIRED";
  const authorizedUniverseCount = Number(authorization?.authorizedUniverseCount || 0);
  const showSearch = experiences.length > 8;
  const filteredExperiences = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return experiences;
    return experiences.filter((experience) =>
      [experience.name, experience.creator?.name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle))
    );
  }, [experiences, query]);

  return (
    <Modal
      isOpen={open}
      onClose={canClose ? onClose : undefined}
      title="Choose a game to work on"
      showCloseButton={canClose}
      closeOnEscape={canClose}
      closeOnBackdrop={canClose}
      initialFocusRef={showSearch ? searchRef : undefined}
      panelClassName="project-selection__panel"
      titleClassName="project-selection__title"
      bodyClassName="project-selection__body"
      overlayClassName="project-selection__overlay"
    >
      <div className="project-selection__intro-row">
        <p className="project-selection__intro">
          Nexus keeps chats, plans, and Studio actions attached to the game you select.
        </p>
        {connected && gameAccessGranted && !loading ? (
          <button
            type="button"
            className="project-selection__access"
            onClick={onChangeAccess}
            disabled={authorizationLoading}
          >
            {authorizationLoading ? "Opening Roblox…" : "Change Roblox access"}
          </button>
        ) : null}
      </div>

      {partial && warnings.length ? (
        <div className="project-selection__warning" role="status">
          {warnings[0].message}
        </div>
      ) : null}

      {showSearch && connected && !accessRequired && !loading && !error ? (
        <label className="project-selection__search">
          <Search aria-hidden="true" />
          <span className="sr-only">Search games</span>
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search games"
          />
        </label>
      ) : null}

      {loading ? (
        <div className="project-selection__loading" role="status" aria-live="polite">
          <Loader aria-hidden="true" />
          <span>Loading your Roblox games…</span>
        </div>
      ) : !connected ? (
        <EmptyState
          icon={<Gamepad2 />}
          title="Connect Roblox"
          description="Use your existing Nexus Roblox connection to find the experiences you can work on."
          action={
            <button
              type="button"
              className="project-selection__primary"
              onClick={onConnect}
              disabled={authorizationLoading}
            >
              {authorizationLoading ? "Opening Roblox…" : "Connect Roblox"}
            </button>
          }
        />
      ) : accessRequired ? (
        <EmptyState
          icon={<Gamepad2 />}
          title="Grant game access"
          description="Allow Nexus to find the published and private Roblox games you choose. This is read-only access."
          action={
            <button
              type="button"
              className="project-selection__primary"
              onClick={onConnect}
              disabled={authorizationLoading}
            >
              {authorizationLoading ? "Opening Roblox…" : "Grant game access"}
            </button>
          }
        />
      ) : error ? (
        <EmptyState
          icon={<RefreshCw />}
          title="Games could not be loaded"
          description={error}
          role="alert"
          action={
            <button type="button" className="project-selection__primary" onClick={onRetry}>
              Try again
            </button>
          }
        />
      ) : experiences.length === 0 && authorizedUniverseCount === 0 ? (
        <EmptyState
          icon={<Gamepad2 />}
          title="No games shared with Nexus"
          description="Choose which Roblox games Nexus can see, including private or unpublished experiences."
          action={
            <button
              type="button"
              className="project-selection__primary"
              onClick={onChangeAccess}
              disabled={authorizationLoading}
            >
              {authorizationLoading ? "Opening Roblox…" : "Choose Roblox games"}
            </button>
          }
        />
      ) : experiences.length === 0 ? (
        <EmptyState
          icon={<RefreshCw />}
          title="Game details are unavailable"
          description="Roblox shared your game access, but its project details could not be loaded yet."
          action={
            <button type="button" className="project-selection__secondary" onClick={onRetry}>
              Try again
            </button>
          }
        />
      ) : filteredExperiences.length === 0 ? (
        <EmptyState icon={<Search />} title="No matching games" description="Try another title or creator name." />
      ) : (
        <div className="project-selection__grid" aria-label="Roblox games">
          {filteredExperiences.map((experience) => {
            const selecting = selectingUniverseId === experience.universeId;
            return (
              <button
                key={experience.universeId}
                type="button"
                className="project-selection__card focus-ring"
                onClick={() => onSelect(experience)}
                disabled={Boolean(selectingUniverseId)}
                aria-label={`Work on ${experience.name}${experience.creator?.name ? ` by ${experience.creator.name}` : ""}`}
              >
                <ProjectThumbnail experience={experience} />
                <span className="project-selection__copy">
                  <strong>{experience.name}</strong>
                  <span className="project-selection__meta">
                    {experience.creator?.name ? <span>{experience.creator.name}</span> : null}
                    {experience.visibility === "private" ? (
                      <span className="project-selection__privacy">Private</span>
                    ) : null}
                  </span>
                </span>
                {selecting ? <Loader className="project-selection__spinner" aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
