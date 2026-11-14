import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { SITE_URL } from "../site";
import { DOC_PAGES, findDocPage, type IndexedDocPage } from "./manifest";
import { parseDoc, type ParsedDoc } from "./markdown";

export interface Doc extends IndexedDocPage, ParsedDoc {
  markdown: string;
}

/**
 * Read relative to the app, which is the working directory for `next dev` and `next build`. Every docs route is
 * static, so the standalone server never reads these files.
 */
const CONTENT_DIR = path.join(process.cwd(), "content", "docs");

/** Parsed pages keyed by slug, reparsed when the file changes so edits show up in `next dev`. */
const cache = new Map<string, { modified: number; doc: Doc }>();

export const docFilePath = (slug: string): string => path.join(CONTENT_DIR, `${slug}.md`);

/** Unknown slugs return undefined. A manifest page without its file throws, so a broken page can't ship. */
export function getDoc(slug: string): Doc | undefined {
  const page = findDocPage(slug);
  return page ? loadDoc(page) : undefined;
}

export function getAllDocs(): Doc[] {
  return DOC_PAGES.map(loadDoc);
}

function loadDoc(page: IndexedDocPage): Doc {
  const file = docFilePath(page.slug);
  const modified = statSync(file).mtimeMs;
  const cached = cache.get(page.slug);
  if (cached?.modified === modified) return cached.doc;
  const markdown = readFileSync(file, "utf8");
  const doc = { ...page, ...parseDoc(markdown), markdown };
  cache.set(page.slug, { modified, doc });
  return doc;
}

/** Site-relative links made absolute, so a page still works pasted into a chat or read from llms.txt. */
export const absoluteLinks = (markdown: string): string => markdown.replace(/\]\(\//g, `](${SITE_URL}/`);

/** One page as served to LLMs: title, summary and canonical URL first. */
export function docAsMarkdown(doc: Doc): string {
  return `# ${doc.title}\n\n> ${doc.description}\n\nSource: ${doc.url}\n\n${absoluteLinks(doc.markdown.trim())}\n`;
}
