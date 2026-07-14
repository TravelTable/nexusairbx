import { Helmet } from "react-helmet-async";

import DownloadsContent from "../components/downloads/DownloadsContent";
import HomepageFooter from "../components/homepage/HomepageFooter";
import { canonicalUrl } from "../lib/seo";

const title = "Download NexusRBX Connector for macOS and Windows";
const description = "Download the signed NexusRBX Connector for macOS Intel, Apple Silicon, or Windows 10 and 11.";

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
      <div className="bg-[#07090f]">
        <DownloadsContent />
        <HomepageFooter />
      </div>
    </>
  );
}
