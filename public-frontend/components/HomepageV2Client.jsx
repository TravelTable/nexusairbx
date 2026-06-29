"use client";

import HomepageV2Content from "../../src/components/homepage/HomepageV2Content";
import PublicAccountState from "./PublicAccountState";

export default function HomepageV2Client() {
  const navigate = (to) => {
    if (typeof window !== "undefined") window.location.assign(to);
  };

  return (
    <HomepageV2Content
      surface="public_next_homepage"
      navigate={navigate}
      accountSlot={<PublicAccountState />}
    />
  );
}
