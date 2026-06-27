import LandingPrompt from "./LandingPrompt";
import LandingAnalyticsLink from "./LandingAnalyticsLink";
import ExamplePromptButton from "./ExamplePromptButton";
import StructuredData from "./StructuredData";
import { canonicalUrl, SITE_NAME } from "../../src/lib/seo";

function SectionList({ title, items }) {
  return (
    <section className="landing-section">
      <h2>{title}</h2>
      <ul className="bullet-list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

function landingStructuredData(page) {
  return [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: `${SITE_NAME} ${page.eyebrow}`,
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Web",
      url: canonicalUrl(`/${page.slug}`),
      description: page.description,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: page.faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    },
  ];
}

export default function SearchLandingPage({ page, allPages }) {
  const adjacentPages = allPages.filter((item) => item.slug !== page.slug).slice(0, 4);

  return (
    <>
      <main>
        <section className="landing-hero">
          <div className="section-inner">
            <span className="eyebrow">{page.eyebrow}</span>
            <h1>{page.h1}</h1>
            <p className="hero-copy">{page.intro}</p>
            <LandingPrompt
              slug={page.slug}
              category={page.category}
              mode={page.mode}
              modeLabel={page.modeLabel}
              cta={page.cta}
              placeholder={page.promptPlaceholder}
            />
          </div>
        </section>

        <section className="section-band">
          <div className="section-inner">
            <div className="landing-grid">
              <section className="landing-section landing-section-wide">
                <h2>Example prompts and outputs</h2>
                <div className="example-grid">
                  {page.examples.map((example) => (
                    <article className="example-card" key={example.title}>
                      <h3>{example.title}</h3>
                      <p className="example-prompt">{example.prompt}</p>
                      <p><strong>Likely output:</strong> {example.output}</p>
                      <ExamplePromptButton
                        prompt={example.prompt}
                        title={example.title}
                        slug={page.slug}
                        category={page.category}
                      />
                    </article>
                  ))}
                </div>
              </section>

              <SectionList title="Supported request types" items={page.supported} />
              <SectionList title="Roblox Studio installation guidance" items={page.studio} />
              <SectionList title="Common mistakes" items={page.mistakes} />
              <SectionList title="Debugging guidance" items={page.debugging} />
              <SectionList title="Limitations" items={page.limitations} />
              <SectionList title="Safety and responsible use" items={page.safety} />

              <section className="landing-section landing-section-wide">
                <h2>FAQs</h2>
                <div className="faq-grid">
                  {page.faqs.map((faq) => (
                    <article className="faq-card" key={faq.question}>
                      <h3>{faq.question}</h3>
                      <p>{faq.answer}</p>
                    </article>
                  ))}
                </div>
              </section>

              <section className="landing-section">
                <h2>Relevant documentation</h2>
                <div className="link-list">
                  {page.docsLinks.map((link) => (
                    <LandingAnalyticsLink
                      key={link.href}
                      href={link.href}
                      label={link.label}
                      slug={page.slug}
                      category={page.category}
                    />
                  ))}
                </div>
              </section>

              <section className="landing-section">
                <h2>Adjacent NexusRBX tools</h2>
                <div className="link-list">
                  {page.toolLinks.map((link) => (
                    <LandingAnalyticsLink
                      key={link.href}
                      href={link.href}
                      label={link.label}
                      slug={page.slug}
                      category={page.category}
                    />
                  ))}
                </div>
              </section>

              <section className="landing-section landing-section-wide">
                <h2>Related scripting and UI pages</h2>
                <div className="related-grid">
                  {adjacentPages.map((item) => (
                    <LandingAnalyticsLink
                      key={item.slug}
                      href={`/${item.slug}`}
                      label={item.h1}
                      slug={page.slug}
                      category={page.category}
                      className="related-card"
                    />
                  ))}
                </div>
              </section>
            </div>
          </div>
        </section>
      </main>
      {landingStructuredData(page).map((data, index) => (
        <StructuredData key={index} data={data} />
      ))}
    </>
  );
}
