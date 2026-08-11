import DownloadsContent from "../../../src/components/downloads/DownloadsContent";
import HomepageFooter from "../../../src/components/homepage/HomepageFooter";
import { buildPublicMetadata } from "../../../src/lib/seo";
import PublicHeader from "../../components/PublicHeader";
import styles from "../../components/PublicEditorial.module.css";

export const metadata = buildPublicMetadata({
  title: "Download NexusRBX Connector for macOS and Windows",
  description: "Download the NexusRBX Connector for macOS (Developer ID signed and notarized) or Windows 10 and 11 (currently unsigned).",
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
