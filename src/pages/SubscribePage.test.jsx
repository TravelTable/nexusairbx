import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SubscribePage from "./SubscribePage";

jest.mock("firebase/auth", () => ({
  getAuth: () => ({ currentUser: null }),
  onAuthStateChanged: (auth, cb) => {
    cb(null);
    return jest.fn();
  },
}));

jest.mock("firebase/firestore", () => ({
  getFirestore: jest.fn(),
  doc: jest.fn(),
  onSnapshot: jest.fn(),
}));

jest.mock("../lib/billing", () => ({
  getEntitlements: jest.fn(),
  openPortal: jest.fn(),
  startSubscriptionCheckout: jest.fn(),
}));

jest.mock("../components/NexusRBXHeader", () => function Header() {
  return <div data-testid="header" />;
});

jest.mock("../components/NexusRBXFooter", () => function Footer() {
  return <div data-testid="footer" />;
});

function renderPage() {
  return render(
    <MemoryRouter>
      <SubscribePage />
    </MemoryRouter>
  );
}

test("renders current monthly prices without token quantities", () => {
  renderPage();

  expect(screen.getByText("$19.99")).toBeInTheDocument();
  expect(screen.getByText("$39.99")).toBeInTheDocument();
  expect(screen.getByText("$29")).toBeInTheDocument();
  expect(screen.getByText("Daily AI usage")).toBeInTheDocument();
  expect(screen.queryByText(/500k|1\.5M|tokens/i)).not.toBeInTheDocument();
});

test("renders yearly prices and accurate savings label", () => {
  renderPage();
  fireEvent.click(screen.getByRole("button", { name: /yearly/i }));

  expect(screen.getByText("$199")).toBeInTheDocument();
  expect(screen.getByText("$399")).toBeInTheDocument();
  expect(screen.getByText("$290")).toBeInTheDocument();
  expect(screen.getByText(/Save 17%/i)).toBeInTheDocument();
});

test("shows Pro+ as recommended and Team starts at two seats", () => {
  renderPage();

  expect(screen.getByText("Pro+")).toBeInTheDocument();
  expect(screen.getByText("Recommended")).toBeInTheDocument();
  const seatInput = screen.getByLabelText(/Seats: 2 - 50/i);
  expect(seatInput).toHaveValue(2);
  expect(screen.getByText("$58/month")).toBeInTheDocument();

  fireEvent.change(seatInput, { target: { value: "5" } });
  expect(screen.getByText("$145/month")).toBeInTheDocument();
});
