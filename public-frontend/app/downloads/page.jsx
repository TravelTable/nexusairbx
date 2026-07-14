import DownloadsContent from "../../../src/components/downloads/DownloadsContent";
import HomepageFooter from "../../../src/components/homepage/HomepageFooter";
import { buildPublicMetadata } from "../../../src/lib/seo";
import PublicHeader from "../../components/PublicHeader";

export const metadata = buildPublicMetadata({
  title: "Download NexusRBX Connector for macOS and Windows",
  description: "Download the signed NexusRBX Connector for macOS Intel, Apple Silicon, or Windows 10 and 11.",
  path: "/downloads",
});

export default function DownloadsPage() {
  return (
    <>
      <PublicHeader />
      <div className="bg-[#07090f]">
        <DownloadsContent />
        <HomepageFooter />
      </div>
    </>
  );
}
