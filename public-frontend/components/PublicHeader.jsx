import UniversalHeaderFrame from "../../src/components/universal/UniversalHeaderFrame";
import SkipToMainContent from "../../src/components/site/SkipToMainContent";
import { universalPrimaryNavigation, universalSiteIndexSections } from "../../src/content/universalNavigation";
import PublicAccountState, { PublicAccountProvider } from "./PublicAccountState";

export default function PublicHeader({ showSkipLink = true, homepage = false }) {
  return (
    <PublicAccountProvider>
      <UniversalHeaderFrame
        pathname={homepage ? "/" : ""}
        navigation={universalPrimaryNavigation}
        siteIndexSections={universalSiteIndexSections}
        accountSlot={<PublicAccountState />}
        mobileAccountSlot={<PublicAccountState mobile />}
        before={showSkipLink ? <SkipToMainContent /> : null}
      />
    </PublicAccountProvider>
  );
}
