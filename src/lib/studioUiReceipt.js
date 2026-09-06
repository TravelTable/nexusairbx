export function readStudioUiReceipt(command) {
  if (command?.status !== "succeeded") return null;
  const result = command.result?.result || command.result || {};
  const root = result.uiRoots?.[0];
  if (!root?.treeHash || !Number(root.nodeCount)) {
    throw new Error("Studio finished without a verified UI receipt. Check Studio activity before trying again.");
  }
  const snapshot = result.snapshots?.[0];
  return { nodeCount: Number(root.nodeCount), treeHash: root.treeHash, snapshotId: typeof snapshot === "string" ? snapshot : snapshot?.id || "" };
}
