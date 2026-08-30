import { applyPreviewActions, resolveUiNodeRect, rgbaFromHex } from "./robloxUiPreview";

test("resolves Roblox scale, offset, and anchors against the selected device", () => {
  const rect = resolveUiNodeRect({
    props: {
      position: { x: { scale: 0.5, offset: 10 }, y: { scale: 0.5, offset: -5 } },
      size: { x: { scale: 0, offset: 200 }, y: { scale: 0.25, offset: 0 } },
      anchorPoint: { x: 0.5, y: 1 },
    },
  }, 1280, 720);
  expect(rect).toEqual({ x: 550, y: 175, width: 200, height: 180 });
});

test("maps transparency without applying opacity to child content", () => {
  expect(rgbaFromHex("#ff0000", 0.25)).toBe("rgba(255, 0, 0, 0.75)");
});

test("runs only declarative browser-preview actions", () => {
  const document = { screens: [{ nodes: [{ id: "modal", parentId: null, props: { visible: false } }] }] };
  const next = applyPreviewActions({}, [
    { type: "openModal", targetId: "modal" },
    { type: "setState", key: "tab", value: "shop" },
    { type: "emitHook", hook: "buyItem" },
  ], document);
  expect(next.modal.visible).toBe(true);
  expect(next.__state.tab).toBe("shop");
  expect(next.__lastHook).toBe("buyItem");
});
