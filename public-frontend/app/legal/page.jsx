import DocsExplorer from "../../components/DocsExplorer";
import StructuredData from "../../components/StructuredData";
import {
  DEFAULT_LEGAL_SLUG,
  DOC_PAGES,
  LEGAL_CATEGORIES,
  LEGAL_PAGES,
  getAdjacentPage,
  getLegalPage,
} from "../../data/docsContent";
import {
  PUBLIC_SITE_ORIGIN,
  SITE_NAME,
  buildPublicMetadata,
  canonicalUrl,
} from "../../../src/lib/seo";

const page = getLegalPage(DEFAULT_LEGAL_SLUG);

export const metadata = buildPublicMetadata({
  title: page.metaTitle,
  description: page.description,
  path: page.path,
});

function legalStructuredData(page) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: page.title,
    headline: page.title,
    description: page.description,
    url: canonicalUrl(page.path),
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: PUBLIC_SITE_ORIGIN,
    },
  };
}

export default function LegalPage() {
  const { previousPage, nextPage } = getAdjacentPage(LEGAL_PAGES, page.slug);

  return (
    <>
      <DocsExplorer
        mode="legal"
        page={page}
        pages={LEGAL_PAGES}
        categories={LEGAL_CATEGORIES}
        legalPages={DOC_PAGES}
        previousPage={previousPage}
        nextPage={nextPage}
      />
      <StructuredData data={legalStructuredData(page)} />
    </>
  );
}
