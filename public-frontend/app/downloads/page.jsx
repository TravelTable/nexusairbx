import DownloadsContent from "../../../src/components/downloads/DownloadsContent";
import HomepageFooter from "../../../src/components/homepage/HomepageFooter";
import { buildPublicMetadata } from "../../../src/lib/seo";
import PublicHeader from "../../components/PublicHeader";
import styles from "../../components/PublicEditorial.module.css";

export const metadata = buildPublicMetadata({
  title: "NexusRBX Ai Studio Plugin",
  description: "Install the NexusRBX Ai plugin from the Roblox Creator Store and open it beside your place in Roblox Studio.",
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
