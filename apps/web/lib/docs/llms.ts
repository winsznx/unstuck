import { SITE_SUMMARY, SITE_URL } from "../site";
import { docAsMarkdown, type Doc } from "./content";
import { DOC_SECTIONS, markdownPath } from "./manifest";

/** The llms.txt index described at https://llmstxt.org: a summary, then one linked list per docs section. */
export function buildLlmsTxt(docs: readonly Doc[]): string {
  const bySlug = new Map(docs.map((doc) => [doc.slug, doc]));
  const sections = DOC_SECTIONS.map((section) => {
    const lines = section.pages.flatMap((page) => {
      const doc = bySlug.get(page.slug);
      return doc ? [`- [${doc.title}](${SITE_URL}${markdownPath(doc.slug)}): ${doc.description}`] : [];
    });
    return `## ${section.title}\n\n${lines.join("\n")}`;
  });
  return (
    [
      "# UNSTUCK",
      `> ${SITE_SUMMARY}`,
      `Every page below is plain Markdown. The same docs are on the web at ${SITE_URL}/docs, and all in one file at ${SITE_URL}/llms-full.txt.`,
      ...sections,
      `## Optional\n\n- [All docs in one file](${SITE_URL}/llms-full.txt): every page above, in order\n- [Recorded runs](${SITE_URL}/runs): every rerun, each with a public record\n- [Study](${SITE_URL}/study): what rerunning public grant milestone reviews turned up`,
    ].join("\n\n") + "\n"
  );
}

export function buildLlmsFullTxt(docs: readonly Doc[]): string {
  return [`# UNSTUCK documentation\n\n> ${SITE_SUMMARY}\n`, ...docs.map(docAsMarkdown)].join("\n---\n\n");
}
