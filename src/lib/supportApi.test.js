import { authedFetch } from "./billing";
import {
  addSupportInternalNote,
  createSupportTicket,
  getSupportTicket,
  markSupportTicketRead,
} from "./supportApi";

jest.mock("./billing", () => ({
  authedFetch: jest.fn(),
}));

function response(payload, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    json: jest.fn().mockResolvedValue(payload),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  window.sessionStorage.clear();
});

test("reuses the idempotency key when ticket creation is retried", async () => {
  authedFetch
    .mockResolvedValueOnce(response({ message: "Try again" }, { ok: false, status: 503 }))
    .mockResolvedValueOnce(response({ ticket: { id: "ticket-1" } }));

  const input = {
    category: "technical",
    subject: "Studio error",
    message: "The plugin disconnected",
    browserSuppliedUid: "must-not-be-sent",
  };

  await expect(createSupportTicket(input)).rejects.toMatchObject({ status: 503 });
  await expect(createSupportTicket(input)).resolves.toEqual({ ticket: { id: "ticket-1" } });

  const firstRequest = authedFetch.mock.calls[0][1];
  const secondRequest = authedFetch.mock.calls[1][1];
  expect(firstRequest.headers["Idempotency-Key"]).toBe(secondRequest.headers["Idempotency-Key"]);
  expect(JSON.parse(secondRequest.body)).toEqual({
    category: "technical",
    subject: "Studio error",
    message: "The plugin disconnected",
  });
});

test("encodes ticket identifiers in customer and staff routes", async () => {
  authedFetch.mockResolvedValue(response({ ticket: {} }));

  await getSupportTicket("ticket/with spaces");
  await addSupportInternalNote("ticket/with spaces", "Customer cannot see this");

  expect(authedFetch.mock.calls[0][0]).toBe("/api/support/tickets/ticket%2Fwith%20spaces");
  expect(authedFetch.mock.calls[1][0]).toBe("/api/admin/support/tickets/ticket%2Fwith%20spaces/internal-notes");
});

test("announces unread-count changes after a read acknowledgement", async () => {
  authedFetch.mockResolvedValue(response({ ticket: { id: "ticket-1" } }));
  const listener = jest.fn();
  window.addEventListener("nexusrbx:support-unread-changed", listener);

  await markSupportTicketRead("ticket-1");

  expect(listener).toHaveBeenCalledTimes(1);
  window.removeEventListener("nexusrbx:support-unread-changed", listener);
});
