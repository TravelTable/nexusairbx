// Curated quick-start templates for the NexusRBX workspace.
// Each template feeds the existing generation flow via handleQuickStart(prompt).
// Keep prompts detailed + opinionated so the first generation is high quality.
//
// Shape: { id, name, category, description, icon, prompt }
// `icon` is a lucide-react icon name (resolved by the gallery component).

export const TEMPLATE_CATEGORIES = ["Economy", "Player", "HUD", "Social", "Retention"];

export const UI_TEMPLATES = [
  {
    id: "shop-ui",
    name: "Shop UI",
    category: "Economy",
    description: "Item cards with prices, icons, and a buy flow.",
    icon: "ShoppingCart",
    prompt:
      "Build a polished Roblox shop UI as a centered modal with a title bar and close button. Show a scrolling grid of item cards, each with an icon, item name, a price chip with a currency icon, and a Buy button. Include a top tab row for categories (Featured, Weapons, Cosmetics) and a player balance display in the header. Use clean spacing, rounded corners, subtle drop shadows, and a dark theme with cyan accents. Wire up RemoteEvents for purchases and tab switching.",
  },
  {
    id: "inventory-ui",
    name: "Inventory",
    category: "Player",
    description: "Grid backpack with item slots and details panel.",
    icon: "Backpack",
    prompt:
      "Build a Roblox inventory UI as a full-screen panel with a left grid of item slots (6 columns, scrollable) and a right-side details panel showing the selected item's icon, name, rarity, description, and Equip / Drop buttons. Add a search box and rarity filter chips at the top. Use rounded item slots with rarity-colored borders, a dark theme, and cyan/purple accents. Wire RemoteEvents for selecting, equipping, and dropping items.",
  },
  {
    id: "settings-menu",
    name: "Settings Menu",
    category: "Player",
    description: "Tabbed settings with toggles and sliders.",
    icon: "Settings",
    prompt:
      "Build a Roblox settings menu as a centered modal with a left vertical tab list (Graphics, Audio, Controls, Account) and a right content pane. Include toggle switches (e.g. Fullscreen, Shadows), sliders (Master Volume, Music, SFX, Sensitivity), and a dropdown for quality presets. Add Save and Reset buttons in the footer. Use a dark theme with cyan accents, clear labels, and accessible tap targets. Wire RemoteEvents/local state for each control.",
  },
  {
    id: "combat-hud",
    name: "Combat HUD",
    category: "HUD",
    description: "Health, ammo, minimap, and ability bar overlay.",
    icon: "Crosshair",
    prompt:
      "Build a Roblox combat HUD overlay (no full-screen background, anchored to screen edges). Bottom-left: a health bar and shield bar with numeric values. Bottom-center: an ability bar with 4 skill icons showing cooldown overlays and keybind labels. Bottom-right: an ammo counter and reload prompt. Top-right: a circular minimap placeholder and a kill-feed list. Use bold, readable text, glow accents, and respect the Roblox topbar inset. Wire RemoteEvents for updating health, ammo, and cooldowns.",
  },
  {
    id: "lobby-menu",
    name: "Lobby Menu",
    category: "Social",
    description: "Main menu with play, modes, and party.",
    icon: "Gamepad2",
    prompt:
      "Build a Roblox lobby / main menu UI as a full-screen layout. Center: a large game logo and a primary Play button with a glowing accent. Below it, a row of mode cards (Solo, Duo, Squad) that highlight on selection. Left side: a vertical nav rail with icon buttons (Play, Shop, Inventory, Settings). Bottom: a party bar showing player avatars and an invite button. Use a dark cinematic theme with cyan/purple gradients and strong hierarchy. Wire RemoteEvents for play, mode selection, and party invites.",
  },
  {
    id: "daily-rewards",
    name: "Daily Rewards",
    category: "Retention",
    description: "7-day reward track with claim states.",
    icon: "Gift",
    prompt:
      "Build a Roblox daily rewards UI as a centered modal titled 'Daily Rewards'. Show a horizontal track of 7 day cards; each card has a Day label, a reward icon, a reward amount, and a state (claimed = checkmark + dimmed, claimable = glowing + Claim button, locked = greyed with a lock). Highlight today's reward prominently. Add a streak counter in the header and a Claim button for the active day. Use a dark theme with gold/cyan accents and celebratory styling. Wire a RemoteEvent for claiming the daily reward.",
  },
  {
    id: "quest-tracker",
    name: "Quest Tracker",
    category: "Retention",
    description: "Active quests list with progress bars.",
    icon: "ScrollText",
    prompt:
      "Build a Roblox quest / mission tracker UI as a right-anchored panel. List active quests as cards, each with a title, short description, a progress bar with X/Y count, a reward chip, and a Claim button that enables when complete. Add tabs for Daily / Weekly / Story quests at the top. Use a dark theme with cyan accents, clear progress visuals, and good spacing. Wire RemoteEvents for refreshing quest progress and claiming rewards.",
  },
  {
    id: "leaderboard",
    name: "Leaderboard",
    category: "Social",
    description: "Ranked player list with podium top 3.",
    icon: "Trophy",
    prompt:
      "Build a Roblox leaderboard UI as a centered modal. Top: a podium highlighting the top 3 players with avatars, names, and scores. Below: a scrolling ranked list of remaining players showing rank number, avatar, name, and score, with the local player's row pinned and highlighted. Add tabs for Global / Friends / Weekly and a timeframe label. Use a dark theme with gold/cyan accents and strong typographic hierarchy. Wire RemoteEvents for loading leaderboard data and switching tabs.",
  },
];

export default UI_TEMPLATES;
