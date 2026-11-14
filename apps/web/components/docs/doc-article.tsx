import Link from "next/link";
import type { ReactNode } from "react";
import type { Doc } from "@/lib/docs/content";
import { DOC_PAGES, markdownPath, type IndexedDocPage } from "@/lib/docs/manifest";
import { docStructuredData } from "@/lib/docs/structured-data";
import { DocTocDisclosure, DocTocRail } from "./doc-toc";

/** Past this many headings, long pages such as the FAQ and the glossary list only their `##` sections. */
const MAX_TOC_ENTRIES = 20;

function Pager({ previous, next }: { previous: IndexedDocPage | undefined; next: IndexedDocPage | undefined }) {
  if (!previous && !next) return null;
  const card = "flex min-h-11 flex-col gap-1 rounded-panel border border-border bg-surface px-4 py-3.5 transition-colors duration-(--duration-fast) hover:border-border-strong";
  return (
    <nav aria-label="Previous and next page" className="mt-14 grid gap-3 border-t border-border pt-8 sm:grid-cols-2">
      {previous && (
        <Link href={previous.path} className={card}>
          <span className="text-small text-ink-muted">Previous</span>
          <span className="font-semibold text-ink">{previous.title}</span>
        </Link>
      )}
      {next && (
        <Link href={next.path} className={`${card} sm:col-start-2 sm:text-right`}>
          <span className="text-small text-ink-muted">Next</span>
          <span className="font-semibold text-ink">{next.title}</span>
        </Link>
      )}
    </nav>
  );
}

/** One docs page: its section, title, lead, the Markdown copy, a table of contents, the prose and the pager. */
export function DocArticle({ doc, after }: { doc: Doc; after?: ReactNode }) {
  const index = DOC_PAGES.findIndex((page) => page.slug === doc.slug);
  const previous = index > 0 ? DOC_PAGES[index - 1] : undefined;
  const next = index >= 0 ? DOC_PAGES[index + 1] : undefined;
  const toc = doc.headings.length > MAX_TOC_ENTRIES ? doc.headings.filter((heading) => heading.depth === 2) : doc.headings;
  const isHome = doc.path === "/docs";

  return (
    <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_12.5rem] xl:gap-12">
      <article className="min-w-0">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: docStructuredData(doc) }} />
        <p className="flex flex-wrap items-center gap-x-1.5 text-small text-ink-muted">
          <Link href="/docs" aria-current={isHome ? "page" : undefined} className="font-semibold text-ink-secondary underline-offset-4 hover:text-ink hover:underline">
            Docs
          </Link>
          <svg aria-hidden viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 3.5 4.5 4.5L6 12.5" />
          </svg>
          <span>{doc.section}</span>
        </p>
        <h1 className="mt-3 max-w-[24ch] text-h1 font-semibold text-balance">{doc.title}</h1>
        <p className="mt-4 max-w-(--container-reading) text-lead text-ink-secondary">{doc.description}</p>
        <a
          href={markdownPath(doc.slug)}
          className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-control border border-border-strong bg-surface px-3.5 text-small font-semibold text-ink-secondary transition-colors duration-(--duration-fast) hover:border-ink-muted hover:text-ink"
        >
          <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
            <path d="M3.5 1.75h6l3 3v9.5h-9z" />
            <path d="M9.5 1.75v3h3" />
            <path d="M5.75 11.25V8l1.5 1.75L8.75 8v3.25M10.75 8v3.25" strokeLinecap="round" />
          </svg>
          View as Markdown
        </a>
        {toc.length > 0 && <DocTocDisclosure headings={toc} />}
        <div className="doc-prose mt-10" dangerouslySetInnerHTML={{ __html: doc.html }} />
        {after}
        <Pager previous={previous} next={next} />
      </article>
      {toc.length > 0 && (
        <div className="hidden pt-1 xl:block">
          <DocTocRail headings={toc} />
        </div>
      )}
    </div>
  );
}
