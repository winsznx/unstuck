"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { PartLink, PartState } from "@/lib/fix-shared";

const BAR: Record<PartState, string> = {
  done: "bg-ink",
  current: "bg-open",
  later: "bg-border-strong",
  skipped: "bg-border",
};

/**
 * The five parts of one milestone as its navigation. Each cell is a page (fix, check, send) or a section of the
 * overview, and says in words where that part stands. The page you're on gets a solid underline.
 */
export function MilestoneRail({ parts }: { parts: PartLink[] }) {
  const pathname = usePathname();
  const overview = parts[0]?.href.split("#")[0] ?? "";
  const onPage = (href: string) => {
    const path = href.split("#")[0];
    return path === pathname && (path !== overview || href.endsWith("#part-1"));
  };

  return (
    <nav aria-label="The five parts of this milestone">
      <ol className="grid grid-cols-5 gap-1.5 sm:gap-3">
        {parts.map((part) => {
          const here = onPage(part.href);
          const quiet = part.state === "later" || part.state === "skipped";
          return (
            <li key={part.n} className="min-w-0">
              <Link
                href={part.href}
                aria-current={here ? "page" : undefined}
                className={`group block min-h-11 rounded-control pb-2 focus-visible:outline-offset-4 ${here ? "shadow-[inset_0_-2px_0_var(--color-ink)]" : ""}`}
              >
                <span aria-hidden="true" className={`block h-1 rounded-full ${BAR[part.state]}`} />
                <span className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-small text-ink-muted tabular-nums">{part.n}</span>
                  <span className={`truncate text-small font-semibold group-hover:underline ${quiet ? "text-ink-secondary" : "text-ink"}`}>{part.name}</span>
                </span>
                <span className="mt-0.5 hidden truncate text-small text-ink-secondary sm:block">{part.status}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
