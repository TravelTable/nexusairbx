import DocsExplorer from "../../components/DocsExplorer";
import StructuredData from "../../components/StructuredData";
import {
  DEFAULT_DOC_SLUG,
  DOC_CATEGORIES,
  DOC_PAGES,
  LEGAL_PAGES,
  getAdjacentPage,
  getDocPage,
} from "../../data/docsContent";
import { buildPublicMetadata, docsStructuredData } from "../../../src/lib/seo";

const page = getDocPage(DEFAULT_DOC_SLUG);

export const metadata = buildPublicMetadata({
  title: page.metaTitle,
  description: page.description,
  path: page.path,
});

export default function DocsPage() {
  const { previousPage, nextPage } = getAdjacentPage(DOC_PAGES, page.slug);

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
