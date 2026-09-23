import { Helmet } from "react-helmet-async";

import DownloadsContent from "../components/downloads/DownloadsContent";
import HomepageFooter from "../components/homepage/HomepageFooter";
import { canonicalUrl } from "../lib/seo";

const title = "NexusRBX Ai Studio Plugin";
const description = "Install the NexusRBX Ai plugin from the Roblox Creator Store and open it beside your place in Roblox Studio.";

export default function DownloadsPage() {
  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonicalUrl("/downloads")} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonicalUrl("/downloads")} />
      </Helmet>
      <div className="bg-[var(--ds-bg-canvas)] text-[var(--ds-text)]">
        <DownloadsContent />
        <HomepageFooter />
      </div>
    </>
  );
}
