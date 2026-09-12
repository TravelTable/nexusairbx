import React, { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "../../lib/utils";
import {
  CopyStateIcon,
  DownloadStateIcon,
  EyeStateIcon,
  LockStateIcon,
  MenuCloseStateIcon,
  PlayPauseStateIcon,
  SendStateIcon,
  SuccessStateIcon,
  VolumeStateIcon,
} from "./animated-state-icons";
import {
  NEXUS_ICON_COMPONENTS,
  NEXUS_ICON_SIZES,
  resolveNexusIconName,
} from "./nexusIconMap";

function parseSize(size, className) {
  if (typeof size === "number" && Number.isFinite(size)) return size;
  if (typeof size === "string" && NEXUS_ICON_SIZES[size]) return NEXUS_ICON_SIZES[size];
  if (typeof size === "string" && /^\d+$/.test(size)) return Number(size);
  const match = String(className || "").match(/\b(?:w|h|size)-(\d+(?:\.\d+)?)\b/);
  if (match) return Number(match[1]) * 4;
  return NEXUS_ICON_SIZES.control;
}

function StateGlyph({ name, size, className, success, loading, active, open, hidden, playing, muted, unlocked, sent }) {
  switch (name) {
    case "copy":
      return <CopyStateIcon size={size} className={className} copied={Boolean(success)} />;
    case "download":
      return <DownloadStateIcon size={size} className={className} done={Boolean(success)} />;
    case "send":
      return <SendStateIcon size={size} className={className} sent={Boolean(sent || success)} />;
    case "menu":
      return <MenuCloseStateIcon size={size} className={className} open={Boolean(open)} />;
    case "preview":
    case "preview-hidden":
      return <EyeStateIcon size={size} className={className} hidden={Boolean(hidden || name === "preview-hidden")} />;
    case "play":
    case "pause":
      return <PlayPauseStateIcon size={size} className={className} playing={Boolean(playing || name === "pause")} />;
    case "volume":
    case "muted":
      return <VolumeStateIcon size={size} className={className} muted={Boolean(muted || name === "muted")} />;
    case "lock":
    case "unlock":
      return <LockStateIcon size={size} className={className} unlocked={Boolean(unlocked || name === "unlock")} />;
    case "success":
      return <SuccessStateIcon size={size} className={className} done={Boolean(success) && !loading} />;
    default:
      return null;
  }
}

const STATE_DRIVEN = new Set([
  "copy",
  "download",
  "send",
  "menu",
  "preview",
  "preview-hidden",
  "play",
  "pause",
  "volume",
  "muted",
  "lock",
  "unlock",
]);

/**
 * Shared Nexus animated icon.
 *
 * @example
 * <NexusAnimatedIcon name="refresh" loading={refreshing} size={16} />
 * <NexusAnimatedIcon name="copy" success={copied} size={16} />
 * <NexusAnimatedIcon name="ai" size="nav" />
 */
export const NexusAnimatedIcon = React.forwardRef(function NexusAnimatedIcon(
  {
    name = "ai",
    size = "control",
    active = false,
    loading = false,
    success = false,
    disabled = false,
    open,
    hidden,
    playing,
    muted,
    unlocked,
    sent,
    className = "",
    decorative = true,
    "aria-label": ariaLabel,
    "aria-hidden": ariaHidden,
    ...rest
  },
  ref
) {
  const reduceMotion = useReducedMotion();
  const resolved = resolveNexusIconName(name);
  const px = parseSize(size, className);
  const iconRef = useRef(null);
  const prevActive = useRef(active);

  useEffect(() => {
    const handle = iconRef.current;
    if (!handle || reduceMotion) return undefined;

    if (loading) {
      let cancelled = false;
      const tick = () => {
        if (cancelled) return;
        handle.startAnimation?.();
        window.setTimeout(() => {
          if (!cancelled) handle.stopAnimation?.();
        }, 220);
      };
      tick();
      const id = window.setInterval(tick, 480);
      return () => {
        cancelled = true;
        window.clearInterval(id);
        handle.stopAnimation?.();
      };
    }

    if (active && !prevActive.current) {
      handle.startAnimation?.();
      const t = window.setTimeout(() => handle.stopAnimation?.(), 280);
      prevActive.current = active;
      return () => window.clearTimeout(t);
    }
    prevActive.current = active;
    return undefined;
  }, [active, loading, reduceMotion, resolved]);

  const sharedProps = {
    className: cn(
      "inline-flex shrink-0 text-current",
      disabled && "opacity-50",
      loading && !reduceMotion && "nx-icon-is-loading",
      className
    ),
    "aria-hidden": decorative || ariaHidden === true ? true : ariaHidden,
    "aria-label": decorative ? undefined : ariaLabel,
    role: decorative ? undefined : "img",
    ...rest,
  };

  if (STATE_DRIVEN.has(resolved) || (resolved === "success" && (loading || success))) {
    return (
      <span ref={ref} {...sharedProps}>
        <StateGlyph
          name={resolved}
          size={px}
          success={success}
          loading={loading}
          active={active}
          open={open}
          hidden={hidden}
          playing={playing}
          muted={muted}
          unlocked={unlocked}
          sent={sent}
        />
      </span>
    );
  }

  const Icon = NEXUS_ICON_COMPONENTS[resolved] || NEXUS_ICON_COMPONENTS.ai;

  const handleMouseEnter = (event) => {
    if (!reduceMotion && !disabled && !loading) {
      iconRef.current?.startAnimation?.();
    }
    rest.onMouseEnter?.(event);
  };

  const handleMouseLeave = (event) => {
    if (!loading) {
      iconRef.current?.stopAnimation?.();
    }
    rest.onMouseLeave?.(event);
  };

  return (
    <motion.span
      ref={ref}
      {...sharedProps}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      whileTap={reduceMotion || disabled ? undefined : { scale: 0.96 }}
      transition={{ duration: 0.12 }}
    >
      <Icon ref={iconRef} size={px} className="block" />
    </motion.span>
  );
});

/** Drop-in component factories for nav maps that expect `icon: SomeComponent`. */
export function createNexusIcon(name, defaultSize = "control") {
  const Comp = React.forwardRef(function MappedNexusIcon(props, ref) {
    const { size, className, ...rest } = props;
    return (
      <NexusAnimatedIcon
        ref={ref}
        name={name}
        size={size ?? defaultSize}
        className={className}
        {...rest}
      />
    );
  });
  Comp.displayName = `NexusIcon(${name})`;
  return Comp;
}

export const NexusIcons = {
  Home: createNexusIcon("home", "nav"),
  Ai: createNexusIcon("ai", "nav"),
  Ui: createNexusIcon("ui", "nav"),
  Assets: createNexusIcon("assets", "nav"),
  Scripts: createNexusIcon("scripts", "nav"),
  Settings: createNexusIcon("settings", "nav"),
  Billing: createNexusIcon("billing", "nav"),
  Usage: createNexusIcon("usage", "nav"),
  Support: createNexusIcon("support", "nav"),
  History: createNexusIcon("history", "nav"),
  Search: createNexusIcon("search", "nav"),
  Account: createNexusIcon("account", "nav"),
  Notifications: createNexusIcon("notifications", "nav"),
  Help: createNexusIcon("help", "nav"),
  Security: createNexusIcon("security", "nav"),
  Plus: createNexusIcon("plus"),
  Refresh: createNexusIcon("refresh"),
  Copy: createNexusIcon("copy"),
  Send: createNexusIcon("send"),
  Attach: createNexusIcon("attach"),
  Stop: createNexusIcon("stop"),
  Close: createNexusIcon("close"),
  Menu: createNexusIcon("menu"),
  Link: createNexusIcon("link"),
  LinkSlash: createNexusIcon("link-slash"),
  ApplyStudio: createNexusIcon("apply-studio"),
  Preview: createNexusIcon("preview"),
  Code: createNexusIcon("code"),
  Folder: createNexusIcon("folder"),
  Document: createNexusIcon("document"),
  Photo: createNexusIcon("photo"),
  Trash: createNexusIcon("delete"),
  More: createNexusIcon("more"),
  SignIn: createNexusIcon("sign-in"),
  SignOut: createNexusIcon("sign-out"),
  Success: createNexusIcon("success"),
  Warning: createNexusIcon("warning"),
  Error: createNexusIcon("error"),
  Info: createNexusIcon("info"),
};

export default NexusAnimatedIcon;
