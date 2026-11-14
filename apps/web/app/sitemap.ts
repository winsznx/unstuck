import type { MetadataRoute } from "next";
import { desc, eq } from "drizzle-orm";
import { replays } from "@unstuck/db";
import { db } from "@/lib/db";
import { DOC_PAGES, INTRODUCTION_SLUG } from "@/lib/docs/manifest";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

/** Enough for every run so far, with room before the sitemap needs splitting at 50,000. */
const RUN_LIMIT = 5000;

const PAGES: { path: string; changeFrequency: "daily" | "weekly" | "monthly"; priority: number }[] = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/start", changeFrequency: "monthly", priority: 0.8 },
  { path: "/study", changeFrequency: "daily", priority: 0.7 },
  { path: "/runs", changeFrequency: "daily", priority: 0.6 },
  { path: "/agents", changeFrequency: "monthly", priority: 0.5 },
];

/** Finished runs only: a queued or running record changes under the crawler. A failed read still lists the static pages. */
async function finishedRuns(): Promise<MetadataRoute.Sitemap> {
  try {
    const rows = await db()
      .select({ id: replays.id, finishedAt: replays.finishedAt })
      .from(replays)
      .where(eq(replays.status, "finished"))
      .orderBy(desc(replays.finishedAt))
      .limit(RUN_LIMIT);
    return rows.map((row) => ({ url: absoluteUrl(`/runs/${row.id}`), lastModified: row.finishedAt ?? undefined, changeFrequency: "yearly", priority: 0.4 }));
  } catch (error) {
    console.error("sitemap: couldn't read finished runs", error);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return [
    ...PAGES.map((page) => ({ url: absoluteUrl(page.path), changeFrequency: page.changeFrequency, priority: page.priority })),
    ...DOC_PAGES.map((page) => ({ url: page.url, changeFrequency: "weekly" as const, priority: page.slug === INTRODUCTION_SLUG ? 0.8 : 0.6 })),
    ...(await finishedRuns()),
  ];
}
