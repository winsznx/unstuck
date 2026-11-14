import Link from "next/link";
import { DOC_SECTIONS, docPath } from "@/lib/docs/manifest";

/** Every docs page by section with its one-line description, under the introduction on /docs. */
export function DocsIndex() {
  return (
    <section aria-labelledby="all-docs" className="mt-14 border-t border-border pt-8">
      <h2 id="all-docs" className="text-h2 font-semibold">
        All docs
      </h2>
      <div className="mt-6 grid gap-x-10 gap-y-8 md:grid-cols-2">
        {DOC_SECTIONS.map((section) => (
          <div key={section.title} className="min-w-0">
            <h3 className="text-small font-semibold text-ink-muted">{section.title}</h3>
            <ul className="mt-2 divide-y divide-border border-y border-border">
              {section.pages.map((page) => (
                <li key={page.slug}>
                  <Link href={docPath(page.slug)} className="group block py-3">
                    <span className="font-semibold text-ink underline-offset-4 group-hover:underline">{page.title}</span>
                    <span className="mt-0.5 block text-small text-ink-secondary">{page.description}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
