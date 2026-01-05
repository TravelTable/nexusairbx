export function exportToRoblox({ canvasSize, items }) {
  const safeItems = Array.isArray(items) ? items : [];
  const lines = [];

  lines.push(`local ScreenGui = Instance.new("ScreenGui")`);
  lines.push(`ScreenGui.Name = "GeneratedUI"`);
  lines.push(`ScreenGui.ResetOnSpawn = false`);
  lines.push(`ScreenGui.Parent = game.Players.LocalPlayer:WaitForChild("PlayerGui")`);

  safeItems.forEach((it, idx) => {
    const name = (it?.name || `${it?.type || "Item"}_${idx}`).replace(/[^A-Za-z0-9_]/g, "_") || `Item_${idx}`;
    const type = it?.type || "Frame";
    lines.push("");
    lines.push(`local ${name} = Instance.new("${type}")`);
    lines.push(`${name}.Position = UDim2.fromOffset(${Number(it?.x) || 0}, ${Number(it?.y) || 0})`);
    lines.push(`${name}.Size = UDim2.fromOffset(${Number(it?.w) || 0}, ${Number(it?.h) || 0})`);

    if (it?.fill) lines.push(`${name}.BackgroundColor3 = Color3.fromHex("${it.fill}")`);
    if (it?.text) lines.push(`${name}.Text = [[${it.text}]]`);
    if (it?.textColor) lines.push(`${name}.TextColor3 = Color3.fromHex("${it.textColor}")`);
    if (it?.fontSize) lines.push(`${name}.TextSize = ${Number(it.fontSize) || 0}`);
    if (it?.imageId) lines.push(`${name}.Image = "${it.imageId}"`);

    lines.push(`${name}.Parent = ScreenGui`);
  });

  return lines.join("\n");
}

export default exportToRoblox;
