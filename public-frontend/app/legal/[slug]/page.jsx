import { notFound } from "next/navigation";
import DocsExplorer from "../../../components/DocsExplorer";
import StructuredData from "../../../components/StructuredData";
import {
  DEFAULT_LEGAL_SLUG,
  DOC_PAGES,
  LEGAL_CATEGORIES,
  LEGAL_PAGES,
  getAdjacentPage,
  getLegalPage,
} from "../../../data/docsContent";
import {
  PUBLIC_SITE_ORIGIN,
  SITE_NAME,
  buildPublicMetadata,
  canonicalUrl,
} from "../../../../src/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return LEGAL_PAGES
    .filter((page) => page.slug !== DEFAULT_LEGAL_SLUG)
    .map((page) => ({ slug: page.slug }));
}

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

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const page = slug === DEFAULT_LEGAL_SLUG ? null : getLegalPage(slug);
  if (!page) notFound();

  return buildPublicMetadata({
    title: page.metaTitle,
    description: page.description,
    path: page.path,
  });
}

export default async function LegalSlugPage({ params }) {
  const { slug } = await params;
  const page = slug === DEFAULT_LEGAL_SLUG ? null : getLegalPage(slug);
  if (!page) notFound();
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
