import { SiteHeader } from "@/components/site";

/** Shown while a page reads its data: the words for what's happening, over the outline of what's coming. No shimmer. */
export default function Loading() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" aria-busy="true" className="mx-auto max-w-(--container-content) px-4 pt-8 sm:px-6 sm:pt-12">
        <p role="status" className="flex items-center gap-2.5 text-small font-medium text-ink-secondary">
          <span aria-hidden className="size-2 rounded-full bg-open-edge" />
          Reading the stored record for this page
        </p>
        <div aria-hidden className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="h-72 rounded-sheet border border-dashed border-border-strong" />
          <div className="h-72 rounded-sheet border border-dashed border-border-strong" />
        </div>
      </main>
    </>
  );
}
