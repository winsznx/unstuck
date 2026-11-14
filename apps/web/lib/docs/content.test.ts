import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { DOC_PAGES, docPath } from "./manifest";
import { parseDoc } from "./markdown";

// The loader reads relative to the app, which is next's working directory. The root vitest run starts elsewhere.
vi.spyOn(process, "cwd").mockReturnValue(path.resolve(import.meta.dirname, "../.."));
const { docFilePath, getAllDocs } = await import("./content");
const { buildLlmsTxt } = await import("./llms");

const docs = () => getAllDocs();

describe("docs content", () => {
  it("has a markdown file for every manifest page", () => {
    for (const page of DOC_PAGES) expect(existsSync(docFilePath(page.slug)), page.slug).toBe(true);
  });

  it("keeps slugs unique and descriptions short enough for a search snippet", () => {
    expect(new Set(DOC_PAGES.map((p) => p.slug)).size).toBe(DOC_PAGES.length);
    for (const page of DOC_PAGES) expect(page.description.length, page.slug).toBeLessThanOrEqual(170);
  });

  it("leaves the page title to the layout, so no page starts its own h1", () => {
    for (const doc of docs()) expect(doc.markdown, doc.slug).not.toMatch(/^# /m);
  });

  it("links only to docs pages and headings that exist", () => {
    const anchors = new Map(docs().map((doc) => [docPath(doc.slug), new Set(parseDoc(doc.markdown).headings.map((h) => h.id))]));
    for (const doc of docs()) {
      for (const [, target] of doc.markdown.matchAll(/\]\((\/docs[^)\s]*)\)/g)) {
        const [path, hash] = target!.split("#");
        expect(anchors.has(path!), `${doc.slug} links to ${target}`).toBe(true);
        if (hash) expect(anchors.get(path!)?.has(hash), `${doc.slug} links to ${target}`).toBe(true);
      }
    }
  });

  it("follows the house style: no em dashes", () => {
    for (const doc of docs()) expect(doc.markdown, doc.slug).not.toContain("—");
  });

  it("lists every page in llms.txt with its markdown URL", () => {
    const text = buildLlmsTxt(docs());
    for (const page of DOC_PAGES) expect(text).toContain(`/docs/${page.slug}.md): ${page.description}`);
  });
});
