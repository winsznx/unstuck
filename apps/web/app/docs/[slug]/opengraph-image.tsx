import { DOC_PAGES, findDocPage, INTRODUCTION_SLUG } from "@/lib/docs/manifest";
import { renderOgCard } from "@/lib/og/card";

export const alt = "A page of the UNSTUCK Docs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams(): { slug: string }[] {
  return DOC_PAGES.filter((page) => page.slug !== INTRODUCTION_SLUG).map((page) => ({ slug: page.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const page = findDocPage((await params).slug);
  if (!page) return new Response("Not found", { status: 404 });
  return renderOgCard({ title: page.title, description: page.description, label: "Docs", path: page.path, note: page.section });
}
