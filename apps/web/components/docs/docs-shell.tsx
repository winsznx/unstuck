import type { ReactNode } from "react";
import { DOC_SECTIONS, docPath } from "@/lib/docs/manifest";
import { DocNavLink } from "./doc-nav-link";

/** Every docs page by section. Rendered twice, beside the article and in the phone's details, so it carries no ids. */
function DocSections() {
  return DOC_SECTIONS.map((section) => (
    <div key={section.title} className="doc-nav-section">
      <p className="doc-nav-heading">{section.title}</p>
      <ul aria-label={section.title} className="space-y-0.5">
        {section.pages.map((page) => (
          <li key={page.slug} className="doc-nav-item">
            <DocNavLink href={docPath(page.slug)}>{page.title}</DocNavLink>
          </li>
        ))}
      </ul>
    </div>
  ));
}

/**
 * The frame every docs page sits in: the section nav on the left from 1024 px, folded into an "All docs" details above
 * the article below that.
 */
export function DocsShell({ children }: { children: ReactNode }) {
  return (
    <main id="main-content" className="mx-auto max-w-(--container-content) px-4 sm:px-6 lg:grid lg:grid-cols-[14.5rem_minmax(0,1fr)] lg:gap-12">
      <nav aria-label="Docs" className="docs-sidebar hidden lg:block">
        <DocSections />
      </nav>
      <div className="min-w-0 pt-5 pb-4 lg:pt-10">
        <details className="doc-disclosure mb-8 lg:hidden">
          <summary>All docs</summary>
          <nav aria-label="Docs" className="px-2 pt-3 pb-4">
            <DocSections />
          </nav>
        </details>
        {children}
      </div>
    </main>
  );
}
