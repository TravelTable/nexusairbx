import UniversalHeaderFrame from "../../src/components/universal/UniversalHeaderFrame";
import SkipToMainContent from "../../src/components/site/SkipToMainContent";
import { universalPrimaryNavigation, universalSiteIndexSections } from "../../src/content/universalNavigation";
import { mapPublicNav, mapPublicNavSections } from "../lib/appHref";
import PublicAccountState, { PublicAccountProvider } from "./PublicAccountState";

export default function PublicHeader({ showSkipLink = true, homepage = false }) {
  return (
    <PublicAccountProvider>
      <UniversalHeaderFrame
        pathname={homepage ? "/" : ""}
        navigation={mapPublicNav(universalPrimaryNavigation)}
        siteIndexSections={mapPublicNavSections(universalSiteIndexSections)}
        accountSlot={<PublicAccountState />}
        mobileAccountSlot={<PublicAccountState mobile />}
        compactAccountSlot={<PublicAccountState compact />}
        before={showSkipLink ? <SkipToMainContent /> : null}
      />
    </PublicAccountProvider>
  );
}
        accountSlot={<PublicAccountState />}
        mobileAccountSlot={<PublicAccountState mobile />}
        compactAccountSlot={<PublicAccountState compact />}
        before={showSkipLink ? <SkipToMainContent /> : null}
      />
    </PublicAccountProvider>
  );
}
