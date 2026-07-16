import { notFound } from "next/navigation";
import DocsExplorer from "../../../components/DocsExplorer";
import StructuredData from "../../../components/StructuredData";
import {
  DEFAULT_DOC_SLUG,
  DOC_CATEGORIES,
  DOC_PAGES,
  LEGAL_PAGES,
  getAdjacentPage,
  getDocPage,
  getPagesInCategoryOrder,
} from "../../../data/docsContent";
import { buildPublicMetadata, docsStructuredData } from "../../../../src/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return DOC_PAGES
    .filter((page) => page.slug !== DEFAULT_DOC_SLUG)
    .map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const page = slug === DEFAULT_DOC_SLUG ? null : getDocPage(slug);
  if (!page) notFound();

  return buildPublicMetadata({
    title: page.metaTitle,
    description: page.description,
    path: page.path,
  });
}

export default async function DocsSlugPage({ params }) {
  const { slug } = await params;
  const page = slug === DEFAULT_DOC_SLUG ? null : getDocPage(slug);
  if (!page) notFound();
  const orderedPages = getPagesInCategoryOrder(DOC_PAGES, DOC_CATEGORIES);
  const { previousPage, nextPage } = getAdjacentPage(orderedPages, page.slug);

  return (
    <>
      <DocsExplorer
        mode="docs"
        page={page}
        pages={DOC_PAGES}
        categories={DOC_CATEGORIES}
        legalPages={LEGAL_PAGES}
        previousPage={previousPage}
        nextPage={nextPage}
      />
      <StructuredData data={docsStructuredData({ path: page.path, title: page.title })} />
    </>
  );
}
