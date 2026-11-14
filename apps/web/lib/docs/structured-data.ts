import { jsonLd } from "../seo";
import { SITE_NAME, SITE_URL } from "../site";
import type { IndexedDocPage } from "./manifest";

/** TechArticle plus its breadcrumb trail, for one docs page. */
export function docStructuredData(page: IndexedDocPage): string {
  const docsHome = `${SITE_URL}/docs`;
  const crumbs = [
    { name: SITE_NAME, url: SITE_URL },
    { name: "Docs", url: docsHome },
    ...(page.url === docsHome ? [] : [{ name: page.title, url: page.url }]),
  ];
  return jsonLd({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "TechArticle",
        headline: page.title,
        description: page.description,
        url: page.url,
        articleSection: page.section,
        inLanguage: "en",
        isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: crumbs.map((crumb, i) => ({ "@type": "ListItem", position: i + 1, name: crumb.name, item: crumb.url })),
      },
    ],
  });
}
