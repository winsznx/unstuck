import { describe, expect, it } from "vitest";
import { parseDoc, slugifyHeading } from "./markdown";

describe("parseDoc", () => {
  it("gives headings GitHub-style ids and lists them for the table of contents", () => {
    const { headings, html } = parseDoc("Intro.\n\n## What it runs\n\n### Exit codes\n\n## What it runs\n");
    expect(headings).toEqual([
      { id: "what-it-runs", text: "What it runs", depth: 2 },
      { id: "exit-codes", text: "Exit codes", depth: 3 },
      { id: "what-it-runs-1", text: "What it runs", depth: 2 },
    ]);
    expect(html).toContain('<h2 id="what-it-runs-1">');
  });

  it("escapes raw HTML instead of passing it through", () => {
    const { html } = parseDoc('<script>alert(1)</script>\n\nText <b onclick="x">bold</b>');
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<b ");
  });

  it("marks external links and wraps tables so they can scroll", () => {
    const { html } = parseDoc("[GitHub](https://github.com) and [runs](/runs)\n\n| a | b |\n| - | - |\n| 1 | 2 |\n");
    expect(html).toContain('<a href="https://github.com" rel="noreferrer">GitHub</a>');
    expect(html).toContain('<a href="/runs">runs</a>');
    expect(html).toContain('<div class="doc-table"><table>');
  });
});

describe("slugifyHeading", () => {
  it("lowercases and joins words with hyphens", () => {
    expect(slugifyHeading("What UNSTUCK won't do")).toBe("what-unstuck-won-t-do");
  });
});
