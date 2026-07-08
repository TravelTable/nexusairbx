import {
  dismissStarterPromo,
  isStarterPromoSnoozed,
  filterChatsByRetention,
  countHiddenChats,
  getChatRetentionDays,
} from "./starterPromo";

describe("starterPromo helpers", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("snoozes promo for 24h on short dismiss", () => {
    dismissStarterPromo("short");
    expect(isStarterPromoSnoozed({ now: Date.now() + 1000 })).toBe(true);
    expect(isStarterPromoSnoozed({ now: Date.now() + 25 * 60 * 60 * 1000 })).toBe(false);
  });

  test("filters chats by retention window", () => {
    const now = Date.parse("2026-07-09T12:00:00.000Z");
    const chats = [
      { id: "a", updatedAt: now - 2 * 24 * 60 * 60 * 1000 },
      { id: "b", updatedAt: now - 10 * 24 * 60 * 60 * 1000 },
    ];
    expect(filterChatsByRetention(chats, 7, now).map((c) => c.id)).toEqual(["a"]);
    expect(countHiddenChats(chats, 7, now)).toBe(1);
    expect(filterChatsByRetention(chats, null, now)).toHaveLength(2);
  });

  test("resolves chat retention days by plan", () => {
    expect(getChatRetentionDays("FREE")).toBe(7);
    expect(getChatRetentionDays("STARTER")).toBe(30);
    expect(getChatRetentionDays("PRO")).toBeNull();
  });
});
