import fs from "fs";
import path from "path";

test("coming-soon Team billing is a quiet empty state without ledger classes", () => {
  const source = fs.readFileSync(path.join(__dirname, "TeamBillingPanel.jsx"), "utf8");
  expect(source).not.toMatch(/account-ledger-/);
  expect(source).not.toMatch(/FinancialPlans\.module\.css/);
  expect(source).toMatch(/coming soon/i);
  expect(source).toMatch(/Existing personal plans are unchanged/i);
  expect(source).toMatch(/EmptyState/);
  expect(source).toMatch(/FormField/);
  expect(source).toMatch(/NexusSelect/);
});
