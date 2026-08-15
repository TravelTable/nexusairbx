import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";

import { canonicalUrl, DEFAULT_OG_IMAGE } from "../lib/seo";
import HomepageV2Content from "../components/homepage/HomepageV2Content";
import { homepageV2Metadata } from "../content/homepageV2";

export default function HomepageV2() {
  const navigate = useNavigate();

  return (
    <>
      <Helmet>
        <title>{homepageV2Metadata.title}</title>
        <meta name="description" content={homepageV2Metadata.description} />
        <link rel="canonical" href={canonicalUrl("/")} />
        <meta property="og:title" content={homepageV2Metadata.title} />
        <meta property="og:description" content={homepageV2Metadata.description} />
        <meta property="og:url" content={canonicalUrl("/")} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={DEFAULT_OG_IMAGE} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="NexusRBX project journey from sketch to a finished 2D Roblox world" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content={DEFAULT_OG_IMAGE} />
      </Helmet>

      <HomepageV2Content
        surface="homepage"
        navigate={navigate}
      />
    </>
  );
}
