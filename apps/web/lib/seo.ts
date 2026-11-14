import type { Metadata } from "next";
import { absoluteUrl, SITE_NAME } from "./site";

interface PageSeo {
  /** The `<title>` text before the root template adds " | UNSTUCK". */
  title: string;
  /** The share title, used as-is. Defaults to `title`. */
  shareTitle?: string;
  description: string;
  path: string;
  type?: "website" | "article";
}

/**
 * Canonical URL, Open Graph and Twitter tags for one page. A child segment's `openGraph` replaces its parent's
 * instead of merging, so every page sets the whole set. The image comes from the nearest opengraph-image file.
 */
export function pageMetadata({ title, shareTitle, description, path, type = "website" }: PageSeo): Metadata {
  const share = shareTitle ?? `${title} | ${SITE_NAME}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title: share, description, url: absoluteUrl(path), siteName: SITE_NAME, type, locale: "en_US" },
    twitter: { card: "summary_large_image", title: share, description },
  };
}

/** For pages that belong to one person's milestone: reachable by link, kept out of search. */
export const PRIVATE_PAGE: Metadata["robots"] = { index: false, follow: false };

/** JSON-LD as a string that's safe inside a script tag. */
export const jsonLd = (data: object): string => JSON.stringify(data).replace(/</g, "\\u003c");
