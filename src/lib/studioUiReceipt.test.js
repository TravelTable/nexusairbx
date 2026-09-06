import { readStudioUiReceipt } from "./studioUiReceipt";
test("only verified successful acknowledgments become UI receipts", () => {
  for (const status of ["queued", "pending_approval", "failed", "canceled"]) expect(readStudioUiReceipt({ status })).toBeNull();
  expect(() => readStudioUiReceipt({ status: "succeeded", result: {} })).toThrow("without a verified UI receipt");
  expect(readStudioUiReceipt({ status: "succeeded", result: { result: { uiRoots: [{ nodeCount: 3, treeHash: "hash" }], snapshots: ["snapshot"] } } }))
    .toEqual({ nodeCount: 3, treeHash: "hash", snapshotId: "snapshot" });
});
