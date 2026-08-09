import React from "react";
import { render, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";

import NoIndexMeta, { NOINDEX_CONTENT } from "./NoIndexMeta";

describe("NoIndexMeta", () => {
  afterEach(() => {
    document.head.querySelectorAll('meta[name="robots"]').forEach((meta) => meta.remove());
  });

  test("keeps an explicit noindex directive present after client head reconciliation", async () => {
    const rendered = render(
      <HelmetProvider>
        <NoIndexMeta title="Private route" />
      </HelmetProvider>,
    );

    await waitFor(() => {
      expect(document.head.querySelector('meta[name="robots"]')?.content).toBe(NOINDEX_CONTENT);
    });

    document.head.querySelector('meta[name="robots"]')?.remove();
    await waitFor(() => {
      expect(document.head.querySelector('meta[name="robots"]')?.content).toBe(NOINDEX_CONTENT);
    });

    rendered.unmount();
    expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
  });
});
