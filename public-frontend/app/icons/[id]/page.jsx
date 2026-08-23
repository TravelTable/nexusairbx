import { notFound } from "next/navigation";
import PublicHeader from "../../../components/PublicHeader";
import styles from "../../../components/PublicEditorial.module.css";
import StructuredData from "../../../components/StructuredData";
import icons from "../../../data/generated/qualified-icons.json";
import { buildPublicMetadata, canonicalUrl, SITE_NAME } from "../../../../src/lib/seo";

const publishedIconPaths = new Map(icons.map((icon) => [String(icon.id), `/icons/${encodeURIComponent(icon.id)}`]));

function iconById(id) {
  return icons.find((icon) => icon.id === id) || null;
}

function publishedRelatedIcons(icon) {
  return (Array.isArray(icon.relatedIcons) ? icon.relatedIcons : [])
    .filter((related) => publishedIconPaths.has(String(related?.id || "")))
    .map((related) => ({
      ...related,
      path: publishedIconPaths.get(String(related.id)),
    }));
}

export function generateStaticParams() {
  return icons.map((icon) => ({ id: icon.id }));
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const icon = iconById(id);
  if (!icon) {
    return buildPublicMetadata({
      title: "Icon Not Found | NexusRBX",
      description: "This NexusRBX icon page is not available.",
      path: `/icons/${id}`,
      noindex: true,
    });
  }

  return buildPublicMetadata({
    title: `${icon.name} Roblox Icon | NexusRBX`,
    description: icon.description,
    path: `/icons/${icon.id}`,
    image: icon.imageUrl,
  });
}

function breadcrumbData(icon) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "NexusRBX",
        item: canonicalUrl("/"),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Creator Store",
        item: canonicalUrl("/icons-market"),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: icon.name,
        item: canonicalUrl(`/icons/${icon.id}`),
      },
    ],
  };
}

function imageObjectData(icon) {
  return {
    "@context": "https://schema.org",
    "@type": "ImageObject",
    name: icon.name,
    description: icon.description,
    contentUrl: icon.imageUrl,
    thumbnailUrl: icon.imageUrl,
    url: canonicalUrl(`/icons/${icon.id}`),
    creditText: SITE_NAME,
  };
}

export default async function IconPage({ params }) {
  const { id } = await params;
  const icon = iconById(id);
  if (!icon) notFound();

  return (
    <div className={`page-shell ${styles.iconPage}`}>
      <PublicHeader />
      <main id="main-content">
        <section className="icon-detail-hero">
          <div className="section-inner icon-detail-grid">
            <div>
              <nav className="breadcrumbs" aria-label="Breadcrumb">
                <a href="/">Home</a>
                <span aria-hidden="true">/</span>
                <a href="/icons-market">Creator Store</a>
                <span aria-hidden="true">/</span>
                <span>{icon.name}</span>
              </nav>
              <span className="eyebrow">{icon.category}</span>
              <h1>{icon.name} Roblox icon</h1>
              <p className="hero-copy">{icon.description}</p>
              <div className="icon-meta-list" aria-label="Icon details">
                <div><strong>Category</strong><span>{icon.category}</span></div>
                <div><strong>Style</strong><span>{icon.style}</span></div>
                <div><strong>Usage</strong><span>Roblox UI, HUD, menu, and inventory interfaces</span></div>
                <div><strong>License</strong><span>Use in NexusRBX-generated Roblox interface workflows; verify project licensing before redistribution.</span></div>
              </div>
              <p className="icon-actions">
                <a className="button button-primary" href="/tools/icon-generator">Generate related icon</a>
                <a className="button button-secondary" href="/icons-market">Browse Creator Store</a>
              </p>
            </div>
            <div className="icon-preview-panel">
              <img src={icon.imageUrl} alt={`${icon.name} ${icon.style} Roblox icon`} />
            </div>
          </div>
        </section>

        <section className="section-band">
          <div className="section-inner">
            <h2>Related icons</h2>
            <div className="related-icon-grid">
              {publishedRelatedIcons(icon).map((related) => (
                <a className="related-icon-card" href={related.path} key={related.id}>
                  <img src={related.imageUrl} alt="" aria-hidden="true" />
                  <span>{related.name}</span>
                </a>
              ))}
            </div>
          </div>
        </section>
      </main>
      <StructuredData data={breadcrumbData(icon)} />
      <StructuredData data={imageObjectData(icon)} />
    </div>
  );
}
