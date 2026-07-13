export default function StructuredData({ data }) {
  // JSON-LD is executable script context. Escaping "<" prevents values such as
  // "</script>" from terminating the element and becoming active markup.
  const serializedData = JSON.stringify(data).replace(/</g, "\\u003c");

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializedData }}
    />
  );
}
