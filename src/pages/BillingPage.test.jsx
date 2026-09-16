import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import BillingPage from "./BillingPage";
import { getEntitlements } from "../lib/billing";
import fs from "fs";
import path from "path";

jest.mock("firebase/auth", () => ({
  getAuth: () => ({ currentUser: { uid: "u1" } }),
  onAuthStateChanged: (auth, callback) => { callback({ uid:"u1" }); return jest.fn(); },
}));
jest.mock("../lib/billing",()=>({getEntitlements:jest.fn(),openPortal:jest.fn(),startCreditPackCheckout:jest.fn()}));
jest.mock("../components/billing/TeamBillingPanel",()=>()=>null);
jest.mock("../lib/productAnalytics",()=>({trackProductEvent:jest.fn()}));

function source() {
  return fs.readFileSync(path.join(__dirname, "BillingPage.jsx"), "utf8");
}

test("v2 billing shows balances and packs, not a duplicate plan catalog",async()=>{
  getEntitlements.mockResolvedValue({catalogVersion:"v2",plan:"PRO",
    includedCredits:{limitMicros:9e6,remainingMicros:6e6},purchasedCredits:{remainingMicros:22e6},
    totalAvailableCreditsMicros:28e6,refreshAt:"2026-10-01",warningLevel:70,
    subscription:{status:"active",interval:"year",currentPeriodEnd:"2027-09-01"}});
  const { container } = render(<BillingPage/>);
  expect(await screen.findByText("666.67 remaining of 1,000")).toBeInTheDocument();
  expect(screen.getByText("2,444.44 · no expiration")).toBeInTheDocument();
  expect(screen.getByText("3,111.11 Nexus Credits")).toBeInTheDocument();
  expect(screen.getByRole("button",{name:"Extra · 1,000 credits · $14.99"})).toBeInTheDocument();
  expect(screen.getByRole("button",{name:"Builder · 2,444.44 credits · $34.99"})).toBeInTheDocument();
  expect(screen.getByRole("button",{name:"Studio · 5,000 credits · $69.99"})).toBeInTheDocument();
  expect(screen.queryByText("Choose the plan that fits your build.")).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Billing and credits" })).toBeInTheDocument();
  expect(screen.getByLabelText("Current plan")).toHaveTextContent(/Pro/);
  expect(screen.getByRole("link", { name: "View plans" })).toHaveAttribute("href", "/pricing");
  expect(screen.getByRole("button", { name: /Payment details, invoices, and cancellation/ })).toBeInTheDocument();
  expect(screen.getByText(/How credits work/i)).toBeInTheDocument();
  expect(screen.queryByText(/How far do Nexus Credits go/i)).not.toBeInTheDocument();
  expect(container.querySelector("[class*='account-ledger']")).toBeNull();
});

test("legacy balance remains visible and cannot buy retired top-ups",async()=>{
  getEntitlements.mockResolvedValue({plan:"PRO",grandfathered:true,premiumBalance:{balanceMicros:18420000}});
  render(<BillingPage/>);
  expect(await screen.findByText("Pro · existing plan")).toBeInTheDocument();
  expect(screen.getByText("$18.42 · preserved")).toBeInTheDocument();
  expect(screen.queryByRole("button",{name:/Add \$10/})).not.toBeInTheDocument();
});

test("payment recovery and cancellation dates are explicit",async()=>{
  getEntitlements.mockResolvedValue({catalogVersion:"v2",plan:"PRO",subscription:{
    status:"past_due",graceEndsAt:"2026-09-08",cancelAtPeriodEnd:true,currentPeriodEnd:"2026-10-01"}});
  render(<BillingPage/>);
  expect(await screen.findByRole("alert")).toHaveTextContent("Payment needs attention");
  expect(screen.getByText(/Canceled for renewal/)).toBeInTheDocument();
});

test("billing page does not import the public pricing stylesheet or ledger chrome", () => {
  const page = source();
  expect(page).not.toMatch(/FinancialPlans\.module\.css/);
  expect(page).not.toMatch(/AccountLedger\.css/);
  expect(page).not.toMatch(/account-ledger-/);
  expect(page).not.toMatch(/CreditExplainer/);
});
