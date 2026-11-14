"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * One page in the docs nav, marked when it's the page you're on. Following it folds the phone nav back up, since the
 * docs layout stays mounted across pages and would keep the details open.
 */
export function DocNavLink({ href, children }: { href: string; children: string }) {
  const current = usePathname() === href;
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className="doc-nav-link"
      onClick={(event) => {
        const details = event.currentTarget.closest("details");
        if (details) details.open = false;
      }}
    >
      {children}
    </Link>
  );
}
