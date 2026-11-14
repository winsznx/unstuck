import type { DocHeading } from "@/lib/docs/markdown";

function TocList({ headings }: { headings: readonly DocHeading[] }) {
  return (
    <ul className="doc-toc-list">
      {headings.map((heading) => (
        <li key={heading.id} data-depth={heading.depth}>
          <a href={`#${heading.id}`}>{heading.text}</a>
        </li>
      ))}
    </ul>
  );
}

/** The table of contents folded into a details, under the lead, below 1280 px. */
export function DocTocDisclosure({ headings }: { headings: readonly DocHeading[] }) {
  return (
    <details className="doc-disclosure mt-8 xl:hidden">
      <summary>On this page</summary>
      <TocList headings={headings} />
    </details>
  );
}

/** The table of contents beside the article from 1280 px, held under the header while the page scrolls. The caller hides it below that. */
export function DocTocRail({ headings }: { headings: readonly DocHeading[] }) {
  return (
    <nav aria-label="On this page" className="sticky top-[calc(var(--header-height)+2.5rem)] max-h-[calc(100dvh-var(--header-height)-5rem)] overflow-y-auto">
      <p className="mb-2.5 text-small font-semibold text-ink-muted">On this page</p>
      <TocList headings={headings} />
    </nav>
  );
}
