import type { Metadata } from "next";
import { ButtonLink } from "@/components/button";
import { SiteFooter, SiteHeader } from "@/components/site";
import { RememberedMilestones } from "./remembered";
import { PRIVATE_PAGE } from "@/lib/seo";

export const metadata: Metadata = { title: "Your milestones", robots: PRIVATE_PAGE };

export default function MilestonesPage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" className="mx-auto w-full max-w-(--container-content) px-4 pt-10 pb-16 sm:px-6">
        <header className="mb-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-(--container-reading)">
            <h1 className="text-section font-semibold text-balance">Your milestones</h1>
            <p className="mt-3 text-lead text-ink-secondary">
              Every held payment you&apos;ve opened in this browser, with the ones that need you first. The list stays on this device. There are no accounts and nobody else sees it.
            </p>
          </div>
          <ButtonLink href="/start" className="self-start md:self-auto">
            Start a milestone
          </ButtonLink>
        </header>
        <RememberedMilestones />
      </main>
      <SiteFooter />
    </>
  );
}
