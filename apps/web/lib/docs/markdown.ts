import { Marked, Renderer, walkTokens, type Token, type Tokens } from "marked";

export interface DocHeading {
  id: string;
  text: string;
  depth: 2 | 3;
}

export interface ParsedDoc {
  html: string;
  /** The `##` and `###` headings, for the page's table of contents. */
  headings: DocHeading[];
}

export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const escapeHtml = (text: string): string =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const isExternal = (href: string): boolean => /^https?:\/\//.test(href);

/** Ids follow document order, so a repeated heading gets `-1`, `-2` suffixes the way GitHub does it. */
function headingIds(tokens: Token[]): WeakMap<Token, string> {
  const ids = new WeakMap<Token, string>();
  const used = new Map<string, number>();
  walkTokens(tokens, (token) => {
    if (token.type !== "heading") return;
    const base = slugifyHeading((token as Tokens.Heading).text) || "section";
    const count = used.get(base) ?? 0;
    used.set(base, count + 1);
    ids.set(token, count === 0 ? base : `${base}-${count}`);
  });
  return ids;
}

/**
 * Docs are written by us, but raw HTML in them is escaped anyway so a page can't carry markup the renderer didn't
 * make. `#` titles are left to the page, so the body starts at `##`.
 */
function renderer(ids: WeakMap<Token, string>): Marked {
  const r = new Renderer();
  r.heading = function (token) {
    const id = ids.get(token) ?? slugifyHeading(token.text);
    const inner = this.parser.parseInline(token.tokens);
    return `<h${token.depth} id="${id}"><a class="doc-anchor" href="#${id}">${inner}</a></h${token.depth}>\n`;
  };
  r.link = function (token) {
    const inner = this.parser.parseInline(token.tokens);
    const href = escapeHtml(token.href);
    const title = token.title ? ` title="${escapeHtml(token.title)}"` : "";
    return isExternal(token.href) ? `<a href="${href}"${title} rel="noreferrer">${inner}</a>` : `<a href="${href}"${title}>${inner}</a>`;
  };
  r.html = (token) => escapeHtml(token.text);
  r.table = function (token) {
    return `<div class="doc-table">${Renderer.prototype.table.call(this, token)}</div>`;
  };
  return new Marked({ gfm: true, renderer: r });
}

export function parseDoc(markdown: string): ParsedDoc {
  const marked = new Marked({ gfm: true });
  const tokens = marked.lexer(markdown);
  const ids = headingIds(tokens);
  const headings: DocHeading[] = [];
  for (const token of tokens) {
    if (token.type !== "heading") continue;
    const heading = token as Tokens.Heading;
    if (heading.depth === 2 || heading.depth === 3) headings.push({ id: ids.get(token) ?? "", text: heading.text.replace(/[*_`]/g, ""), depth: heading.depth });
  }
  const html = renderer(ids).parser(tokens);
  return { html, headings };
}
