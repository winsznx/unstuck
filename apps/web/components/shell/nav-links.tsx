"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PLACES, placeFor } from "./nav";

/** The header's places. The one you're in wears the graphite punch tag. */
export function NavLinks() {
  const current = placeFor(usePathname() ?? "/");
  return (
    <nav aria-label="Main" className="hidden items-center gap-0.5 lg:flex">
      {PLACES.map((place) => (
        <span key={place.href} className="nav-tag-wrap">
          <Link href={place.href} className="nav-tag" aria-current={current?.href === place.href ? "page" : undefined}>
            {place.label}
          </Link>
        </span>
      ))}
    </nav>
  );
}

/** On a phone the menu button names where you are, so the header still answers "where am I". */
export function useCurrentLabel(): string | null {
  return placeFor(usePathname() ?? "/")?.label ?? null;
}
