import type { MetadataRoute } from "next";
import { INDEXABLE, SITE_URL } from "@/lib/site";

/**
 * Milestones, the account and the connect flow stay crawlable on purpose: they carry noindex, and a crawler that's
 * refused the page never reads that and may index the bare URL anyway. /dev is a 404 in production.
 */
const DISALLOW = ["/dev"];

export default function robots(): MetadataRoute.Robots {
  if (!INDEXABLE) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: DISALLOW }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
