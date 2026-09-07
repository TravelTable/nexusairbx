import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import BillingPage from "./BillingPage";
import { getEntitlements } from "../lib/billing";
jest.mock("firebase/auth", () => ({
  getAuth: () => ({ currentUser: { uid: "u1" } }),
  onAuthStateChanged: (auth, callback) => { callback({ uid:"u1" }); return jest.fn(); },
}));
jest.mock("../lib/billing",()=>({getEntitlements:jest.fn(),openPortal:jest.fn(),startCreditPackCheckout:jest.fn()}));
jest.mock("../components/billing/TeamBillingPanel",()=>()=>null);
jest.mock("../lib/productAnalytics",()=>({trackProductEvent:jest.fn()}));
test("v2 billing shows balances and packs, not a duplicate plan catalog",async()=>{
  getEntitlements.mockResolvedValue({catalogVersion:"v2",plan:"PRO",
    includedCredits:{limitMicros:9e6,remainingMicros:6e6},purchasedCredits:{remainingMicros:22e6},
    totalAvailableCreditsMicros:28e6,refreshAt:"2026-10-01",warningLevel:70,
    subscription:{status:"active",interval:"year",currentPeriodEnd:"2027-09-01"}});
  render(<BillingPage/>);
  expect(await screen.findByText("6 remaining of 9")).toBeInTheDocument();
  expect(screen.getByText("22 · no expiration")).toBeInTheDocument();
  expect(screen.getByText("28 Nexus Credits")).toBeInTheDocument();
  expect(screen.getByRole("button",{name:"Extra · 9 credits · $14.99"})).toBeInTheDocument();
  expect(screen.getByRole("button",{name:"Builder · 22 credits · $34.99"})).toBeInTheDocument();
  expect(screen.getByRole("button",{name:"Studio · 45 credits · $69.99"})).toBeInTheDocument();
  expect(screen.queryByText("Choose the plan that fits your build.")).not.toBeInTheDocument();
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
