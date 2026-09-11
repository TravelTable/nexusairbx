import DownloadsContent from "../../../src/components/downloads/DownloadsContent";
import HomepageFooter from "../../../src/components/homepage/HomepageFooter";
import { buildPublicMetadata } from "../../../src/lib/seo";
import PublicHeader from "../../components/PublicHeader";
import styles from "../../components/PublicEditorial.module.css";

export const metadata = buildPublicMetadata({
  title: "Connect NexusRBX to Roblox Studio | Plugin and Connector",
  description: "Install the recommended NexusRBX Studio Plugin, or download NexusRBX Connector for advanced local Studio MCP workflows on macOS and Windows.",
  path: "/downloads",
});

export default function DownloadsPage() {
  return (
    <>
      <PublicHeader />
      <div className={styles.downloadPage}>
        <DownloadsContent />
      </div>
      <HomepageFooter />
    </>
  );
}
