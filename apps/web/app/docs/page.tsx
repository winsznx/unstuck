import type { Metadata } from "next";
import { DocArticle } from "@/components/docs/doc-article";
import { DocsIndex } from "@/components/docs/docs-index";
import { getDoc } from "@/lib/docs/content";
import { INTRODUCTION_SLUG, markdownPath } from "@/lib/docs/manifest";
import { pageMetadata } from "@/lib/seo";

const DESCRIPTION = "How UNSTUCK checks a grant milestone review: asks, checks, reruns, run records, what it won't do and what it saves.";

const base = pageMetadata({ title: "Docs", shareTitle: "UNSTUCK Docs", description: DESCRIPTION, path: "/docs" });

export const metadata: Metadata = {
  ...base,
  title: { absolute: "UNSTUCK Docs" },
  alternates: { ...base.alternates, types: { "text/markdown": markdownPath(INTRODUCTION_SLUG) } },
};

export default function DocsHome() {
  const doc = getDoc(INTRODUCTION_SLUG);
  if (!doc) throw new Error("The introduction page is missing from the docs manifest.");
  return <DocArticle doc={doc} after={<DocsIndex />} />;
}
