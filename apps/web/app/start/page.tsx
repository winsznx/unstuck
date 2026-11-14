import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/site";
import { readThread } from "./actions";
import { StartFlow } from "./start-flow";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Check a milestone review",
  description: "Paste the GitHub issue or pull request with your reviewer's comment, pick the asks, give each a check and rerun them on the commit they reviewed.",
  path: "/start",
});
export const dynamic = "force-dynamic";

export default async function StartPage({ searchParams }: { searchParams: Promise<{ url?: string }> }) {
  const { url } = await searchParams;
  const initial = url ? await readThread(url) : null;
  return (
    <>
      <SiteHeader />
      <main id="main-content" className="mx-auto max-w-(--container-content) px-4 pt-4 sm:px-6 sm:pt-8">
        <h1 className="text-display font-semibold">Start a milestone</h1>
        <p className="mt-3 max-w-(--container-reading) text-lead text-ink-secondary">
          Five steps, about three minutes. You end with your reviewer&apos;s checks rerun on the exact commit they reviewed, and a tag on every ask.
        </p>
        <StartFlow initialUrl={url ?? ""} initial={initial} />
      </main>
      <SiteFooter />
    </>
  );
}
