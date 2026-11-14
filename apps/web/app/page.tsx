import type { Metadata } from "next";
import { LANDING_SECTIONS, LandingSection, loadLanding } from "@/components/landing/sections";
import { SiteFooter, SiteHeader } from "@/components/site";
import { jsonLd, pageMetadata } from "@/lib/seo";
import { SITE_NAME, SITE_SUMMARY, SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  ...pageMetadata({
    title: "UNSTUCK | Get a stuck grant milestone review closed",
    shareTitle: "Your reviewer left one comment. UNSTUCK gets it closed.",
    description: "Your reviewer left one comment. UNSTUCK reruns their steps on the commit they reviewed and shows what still fails, with the log line behind every tag.",
    path: "/",
  }),
  title: { absolute: "UNSTUCK | Get a stuck grant milestone review closed" },
};

const STRUCTURED_DATA = jsonLd({
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "WebSite", "@id": `${SITE_URL}/#website`, name: SITE_NAME, url: SITE_URL, inLanguage: "en" },
    {
      "@type": "WebApplication",
      name: SITE_NAME,
      url: SITE_URL,
      description: SITE_SUMMARY,
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Web",
      isPartOf: { "@id": `${SITE_URL}/#website` },
    },
  ],
});

/**
 * The landing in one screen per idea (docs/DESIGN.md 7.2): what UNSTUCK is, why payments stall, how it works today,
 * the proof a reviewer can open, the fix that's coming, who it's for, then questions and the link field again.
 * The scenes read the first showcase milestone; the problem section reads one public review on GitHub and the study's
 * live counts. `main.landing` gives the header and footer the sections' column (app/landing.css).
 */
export default async function Landing() {
  const data = await loadLanding();
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: STRUCTURED_DATA }} />
      <SiteHeader />
      <main id="main-content" className="landing">
        {LANDING_SECTIONS.map((section) => (
          <LandingSection key={section} section={section} data={data} />
        ))}
      </main>
      <SiteFooter />
    </>
  );
}
