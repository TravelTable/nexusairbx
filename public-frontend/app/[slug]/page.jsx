import { notFound } from "next/navigation";
import PublicHeader from "../../components/PublicHeader";
import SearchLandingPage from "../../components/SearchLandingPage";
import { getSearchLandingPage, searchLandingPages } from "../../data/searchLandingPages";
import { buildPublicMetadata } from "../../../src/lib/seo";

export function generateStaticParams() {
  return searchLandingPages.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const page = getSearchLandingPage(slug);
  if (!page) {
    return buildPublicMetadata({
      title: "Page Not Found | NexusRBX",
      description: "This NexusRBX public page is not available.",
      path: `/${slug}`,
      noindex: true,
    });
  }

  return buildPublicMetadata({
    title: page.title,
    description: page.description,
    path: `/${page.slug}`,
  });
}

export default async function LandingPage({ params }) {
  const { slug } = await params;
  const page = getSearchLandingPage(slug);
  if (!page) notFound();

  return (
    <div className="page-shell">
      <PublicHeader />
      <SearchLandingPage page={page} allPages={searchLandingPages} />
    </div>
  );
}
