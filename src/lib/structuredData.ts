// Structured-data (schema.org JSON-LD) builders, kept as pure functions so they
// can be unit-tested in isolation — the writing post page renders through the
// content layer, which the test container doesn't hydrate, so the page itself
// can't be render-tested for its JSON-LD. Testing the builder here guards the
// shape instead.

export interface ArticleLdInput {
  title: string;
  description: string;
  pubDate: Date;
  tags?: string[];
  slug: string;
  authorName: string;
  siteUrl: string; // origin, no trailing slash (e.g. https://vikenparikh.com)
}

/**
 * Build a BlogPosting JSON-LD object for a writing post. On a personal blog the
 * author is also the publisher. Canonical URL is derived from siteUrl + slug so
 * it matches the page's <link rel="canonical"> exactly.
 */
export function buildArticleLd(input: ArticleLdInput): Record<string, unknown> {
  const canonical = `${input.siteUrl}/writing/${input.slug}/`;
  const ld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: input.title,
    description: input.description,
    datePublished: input.pubDate.toISOString(),
    author: { "@type": "Person", name: input.authorName, url: input.siteUrl },
    publisher: { "@type": "Person", name: input.authorName, url: input.siteUrl },
    image: `${input.siteUrl}/images/og-card.png`,
    url: canonical,
    mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
    inLanguage: "en-US",
  };
  if (input.tags && input.tags.length > 0) ld.keywords = input.tags.join(", ");
  return ld;
}
