import HomepageLanding from "../../src/components/homepage/HomepageLanding";
import { homepageMetadata } from "../../src/content/homepageLanding";
import { buildPublicMetadata } from "../../src/lib/seo";
import PublicAccountState from "../components/PublicAccountState";

export const metadata = buildPublicMetadata({
  title: homepageMetadata.title,
  description: homepageMetadata.description,
  path: "/",
});

export default function HomePage() {
  return (
    <HomepageLanding
      surface="public_next_homepage"
      accountSlot={<PublicAccountState />}
    />
  );
}
