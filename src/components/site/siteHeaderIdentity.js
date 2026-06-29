function titleCasePlan(plan) {
  return String(plan || "FREE")
    .toLowerCase()
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getRobloxProfileFromStatus(status) {
  return status?.connection?.profile || status?.profile || status?.user || null;
}

export function getRobloxUsername(profile) {
  return (
    profile?.preferred_username ||
    profile?.username ||
    profile?.name ||
    profile?.displayName ||
    profile?.display_name ||
    ""
  );
}

export function getInitials({ displayName, email, robloxName } = {}) {
  if (!robloxName && !displayName && !email) return "NX";
  const value = robloxName || displayName || email;
  const source = String(value).trim();
  if (!source) return "NX";
  const words = source.includes("@")
    ? [source.split("@")[0]]
    : source.split(/\s+/).filter(Boolean);
  const initials = words.length > 1
    ? `${words[0][0] || ""}${words[1][0] || ""}`
    : source.slice(0, 2);
  return initials.toUpperCase();
}

export function selectHeaderAvatar({ user, robloxProfile } = {}) {
  const robloxName = getRobloxUsername(robloxProfile);
  const robloxPicture =
    robloxProfile?.picture ||
    robloxProfile?.avatarUrl ||
    robloxProfile?.avatarURL ||
    robloxProfile?.imageUrl ||
    robloxProfile?.image_url ||
    "";
  const firebasePicture = user?.photoURL || "";
  const fallback = getInitials({
    robloxName,
    displayName: user?.displayName,
    email: user?.email,
  });

  if (robloxPicture) {
    return { src: robloxPicture, source: "roblox", fallback };
  }
  if (firebasePicture) {
    return { src: firebasePicture, source: "firebase", fallback };
  }
  return { src: "", source: "initials", fallback };
}

export function getHeaderVariantForPath(pathname = "/") {
  if (pathname === "/ai" || pathname.startsWith("/ai/")) return "workspace";
  if (pathname === "/signin" || pathname === "/signup") return "auth";
  if (
    pathname === "/settings" ||
    pathname === "/billing" ||
    pathname === "/subscribe" ||
    pathname.startsWith("/debug/entitlements")
  ) {
    return "account";
  }
  if (pathname === "/contact" || pathname === "/privacy" || pathname === "/terms") return "legal";
  if (
    pathname.startsWith("/tools/") ||
    pathname === "/icons-market" ||
    pathname.startsWith("/script/") ||
    pathname.startsWith("/icons/")
  ) {
    return "tools";
  }
  return "marketing";
}

export function formatHeaderPlan(plan) {
  return titleCasePlan(plan);
}
