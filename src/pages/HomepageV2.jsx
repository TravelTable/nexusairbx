import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";

import { canonicalUrl } from "../lib/seo";
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
      </Helmet>

      <HomepageV2Content surface="homepage" navigate={navigate} />
    </>
  );
}
