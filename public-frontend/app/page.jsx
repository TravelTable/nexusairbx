import { homepageV2Metadata } from "../../src/content/homepageV2";
import { buildPublicMetadata } from "../../src/lib/seo";
import HomepageV2Client from "../components/HomepageV2Client";

export const metadata = buildPublicMetadata({
  title: homepageV2Metadata.title,
  description: homepageV2Metadata.description,
  path: "/",
});

export default function HomePage() {
  return <HomepageV2Client />;
}
