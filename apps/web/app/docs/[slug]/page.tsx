import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocArticle } from "@/components/docs/doc-article";
import { getDoc } from "@/lib/docs/content";
import { DOC_PAGES, findDocPage, INTRODUCTION_SLUG, markdownPath } from "@/lib/docs/manifest";
import { pageMetadata } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams(): { slug: string }[] {
  return DOC_PAGES.filter((page) => page.slug !== INTRODUCTION_SLUG).map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const page = findDocPage((await params).slug);
  if (!page) return {};
  const title = `${page.title} | UNSTUCK Docs`;
  const metadata = pageMetadata({ title, shareTitle: title, description: page.description, path: page.path, type: "article" });
  return { ...metadata, title: { absolute: title }, alternates: { ...metadata.alternates, types: { "text/markdown": markdownPath(page.slug) } } };
}

export default async function DocPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = slug === INTRODUCTION_SLUG ? undefined : getDoc(slug);
  if (!doc) notFound();
  return <DocArticle doc={doc} />;
}
