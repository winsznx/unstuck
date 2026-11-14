import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLandingSection, LandingSection, loadLanding } from "@/components/landing/sections";
import { SiteHeader } from "@/components/site";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ section: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { section } = await params;
  return { title: `Landing, ${section}` };
}

/**
 * One landing section alone under the site header, with the landing's own data and props, so a section can be
 * measured and screenshotted at any viewport without the others around it. /dev/landing/hero to /dev/landing/questions.
 */
export default async function LandingSectionPreview({ params }: Params) {
  const { section } = await params;
  if (!isLandingSection(section)) notFound();
  const data = await loadLanding();
  return (
    <>
      <SiteHeader />
      <main id="main-content" className="landing">
        <LandingSection section={section} data={data} />
      </main>
    </>
  );
}
