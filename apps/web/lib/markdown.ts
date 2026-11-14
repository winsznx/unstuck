// A small GitHub-comment markdown reader that never rewrites the reviewer's words.
// Every visible character is addressed by its offset in the original body, so ask
// highlights stored as (quoteStart, length) land on exactly the text the reviewer typed.

export type Inline =
  | { kind: "text"; start: number; end: number }
  | { kind: "code"; start: number; end: number }
  | { kind: "strong" | "em" | "strike"; children: Inline[] }
  | { kind: "link"; href: string; children: Inline[] }
  | { kind: "mention"; login: string; start: number; end: number }
  | { kind: "break" };

export interface ListItem {
  depth: number;
  task: "done" | "todo" | null;
  children: Inline[];
}

export type Block =
  | { kind: "paragraph"; children: Inline[] }
  | { kind: "heading"; level: number; children: Inline[] }
  | { kind: "quote"; lines: Inline[][] }
  | { kind: "list"; ordered: boolean; startAt: number; items: ListItem[] }
  | { kind: "code"; lang: string; start: number; end: number }
  | { kind: "rule" };

interface Line {
  start: number;
  end: number;
  text: string;
}

const FENCE = /^ {0,3}(`{3,}|~{3,})\s*([\w+-]*)/;
const HEADING = /^ {0,3}(#{1,6})[ \t]+/;
const QUOTE = /^ {0,3}> ?/;
const LIST = /^([ \t]*)([-*+]|(\d{1,9})[.)])[ \t]+/;
const TASK = /^\[([ xX])\][ \t]+/;
const RULE = /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/;
const URL_START = /^https?:\/\/[^\s<>]+/;
const MENTION = /^@([A-Za-z0-9](?:[A-Za-z0-9-]{0,38}))(?![A-Za-z0-9/-])/;
const LINK = /^\[([^\]\n]+)\]\(\s*(https?:\/\/[^\s)]+|#[^\s)]*|\/[^\s)]*)(?:\s+"[^"]*")?\s*\)/;
const IMAGE = /^!\[([^\]\n]*)\]\(\s*(https?:\/\/[^\s)]+)(?:\s+"[^"]*")?\s*\)/;
const HTML_BREAK = /^<br\s*\/?>/i;

function linesOf(body: string): Line[] {
  const lines: Line[] = [];
  let start = 0;
  for (const raw of body.split("\n")) {
    const end = start + raw.length;
    const trimmedEnd = raw.endsWith("\r") ? end - 1 : end;
    lines.push({ start, end: trimmedEnd, text: body.slice(start, trimmedEnd) });
    start = end + 1;
  }
  return lines;
}

const isBlank = (line: Line) => line.text.trim() === "";
const startsBlock = (line: Line) =>
  FENCE.test(line.text) || HEADING.test(line.text) || QUOTE.test(line.text) || LIST.test(line.text) || RULE.test(line.text);

export function parseComment(body: string): Block[] {
  const lines = linesOf(body);
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i]!;
    if (isBlank(line)) {
      i++;
      continue;
    }

    const fence = FENCE.exec(line.text);
    if (fence) {
      const marker = fence[1]!;
      let j = i + 1;
      while (j < lines.length && !lines[j]!.text.trimStart().startsWith(marker)) j++;
      const first = lines[i + 1];
      const last = lines[Math.min(j, lines.length) - 1];
      const start = first && j > i + 1 ? first.start : line.end;
      const end = last && j > i + 1 ? last.end : line.end;
      blocks.push({ kind: "code", lang: fence[2] ?? "", start, end });
      i = j + 1;
      continue;
    }

    if (RULE.test(line.text)) {
      blocks.push({ kind: "rule" });
      i++;
      continue;
    }

    const heading = HEADING.exec(line.text);
    if (heading) {
      const from = line.start + heading[0].length;
      const to = line.start + line.text.replace(/[ \t]+#*[ \t]*$/, "").length;
      blocks.push({ kind: "heading", level: heading[1]!.length, children: parseInline(body, from, Math.max(from, to)) });
      i++;
      continue;
    }

    if (QUOTE.test(line.text)) {
      const quoted: Inline[][] = [];
      while (i < lines.length && QUOTE.test(lines[i]!.text)) {
        const current = lines[i]!;
        const prefix = QUOTE.exec(current.text)![0].length;
        quoted.push(parseInline(body, current.start + prefix, current.end));
        i++;
      }
      blocks.push({ kind: "quote", lines: quoted });
      continue;
    }

    const list = LIST.exec(line.text);
    if (list) {
      const ordered = list[3] !== undefined;
      const items: ListItem[] = [];
      const baseIndent = list[1]!.replace(/\t/g, "  ").length;
      while (i < lines.length) {
        const current = lines[i]!;
        const match = LIST.exec(current.text);
        if (!match || (match[3] !== undefined) !== ordered) {
          if (match) break;
          if (isBlank(current) || startsBlock(current) || items.length === 0) break;
          const last = items[items.length - 1]!;
          const indentLength = current.text.length - current.text.trimStart().length;
          last.children.push({ kind: "break" }, ...parseInline(body, current.start + indentLength, current.end));
          i++;
          continue;
        }
        const indent = match[1]!.replace(/\t/g, "  ").length;
        let from = current.start + match[0].length;
        const task = TASK.exec(body.slice(from, current.end));
        if (task) from += task[0].length;
        items.push({
          depth: Math.max(0, Math.min(3, Math.floor((indent - baseIndent) / 2))),
          task: task ? (task[1] === " " ? "todo" : "done") : null,
          children: parseInline(body, from, current.end),
        });
        i++;
      }
      blocks.push({ kind: "list", ordered, startAt: ordered ? Number(list[3]) : 1, items });
      continue;
    }

    const first = i;
    while (i < lines.length && !isBlank(lines[i]!) && (i === first || !startsBlock(lines[i]!))) i++;
    blocks.push({ kind: "paragraph", children: parseInline(body, lines[first]!.start, lines[i - 1]!.end) });
  }

  return blocks;
}

const trailingPunctuation = /[.,;:!?)\]'"]+$/;

function closingIndex(body: string, from: number, end: number, marker: string): number {
  let at = body.indexOf(marker, from);
  while (at !== -1 && at + marker.length <= end) {
    const before = body[at - 1];
    if (before && !/\s/.test(before) && at > from) return at;
    at = body.indexOf(marker, at + 1);
  }
  return -1;
}

export function parseInline(body: string, start: number, end: number): Inline[] {
  const out: Inline[] = [];
  let textStart = start;
  let i = start;

  const flush = (to: number) => {
    if (to > textStart) out.push({ kind: "text", start: textStart, end: to });
  };

  while (i < end) {
    const ch = body[i]!;
    const prev = i > start ? body[i - 1] : undefined;
    const rest = body.slice(i, end);

    if (ch === "\n") {
      flush(i);
      out.push({ kind: "break" });
      i++;
      textStart = i;
      continue;
    }

    if (ch === "\\" && i + 1 < end && /[\\`*_{}[\]()#+\-.!@~>|]/.test(body[i + 1]!)) {
      flush(i);
      textStart = i + 1;
      i += 2;
      continue;
    }

    if (ch === "`") {
      const close = body.indexOf("`", i + 1);
      if (close !== -1 && close < end && body.slice(i + 1, close).indexOf("\n") === -1) {
        flush(i);
        out.push({ kind: "code", start: i + 1, end: close });
        i = close + 1;
        textStart = i;
        continue;
      }
    }

    if ((ch === "*" || ch === "_" || ch === "~") && body[i + 1] === ch && body[i + 2] && !/\s/.test(body[i + 2]!)) {
      const marker = ch + ch;
      const close = closingIndex(body, i + 2, end, marker);
      if (close !== -1) {
        flush(i);
        out.push({ kind: ch === "~" ? "strike" : "strong", children: parseInline(body, i + 2, close) });
        i = close + 2;
        textStart = i;
        continue;
      }
    }

    if ((ch === "*" || ch === "_") && body[i + 1] && !/\s/.test(body[i + 1]!) && (ch === "*" || !prev || !/\w/.test(prev))) {
      const close = closingIndex(body, i + 1, end, ch);
      const after = close !== -1 ? body[close + 1] : undefined;
      if (close !== -1 && body[close + 1] !== ch && (ch === "*" || !after || !/\w/.test(after))) {
        flush(i);
        out.push({ kind: "em", children: parseInline(body, i + 1, close) });
        i = close + 1;
        textStart = i;
        continue;
      }
    }

    if (ch === "!" && body[i + 1] === "[") {
      const image = IMAGE.exec(rest);
      if (image) {
        flush(i);
        const altStart = i + 2;
        const altEnd = altStart + image[1]!.length;
        out.push({ kind: "link", href: image[2]!, children: altEnd > altStart ? [{ kind: "text", start: altStart, end: altEnd }] : [] });
        i += image[0].length;
        textStart = i;
        continue;
      }
    }

    if (ch === "[") {
      const link = LINK.exec(rest);
      if (link) {
        flush(i);
        out.push({ kind: "link", href: link[2]!, children: parseInline(body, i + 1, i + 1 + link[1]!.length) });
        i += link[0].length;
        textStart = i;
        continue;
      }
    }

    if (ch === "h" && (!prev || /[\s(<]/.test(prev))) {
      const url = URL_START.exec(rest);
      if (url) {
        const href = url[0].replace(trailingPunctuation, "");
        flush(i);
        out.push({ kind: "link", href, children: [{ kind: "text", start: i, end: i + href.length }] });
        i += href.length;
        textStart = i;
        continue;
      }
    }

    if (ch === "<") {
      const br = HTML_BREAK.exec(rest);
      if (br) {
        flush(i);
        out.push({ kind: "break" });
        i += br[0].length;
        textStart = i;
        continue;
      }
      const angled = /^<(https?:\/\/[^\s>]+)>/.exec(rest);
      if (angled) {
        flush(i);
        out.push({ kind: "link", href: angled[1]!, children: [{ kind: "text", start: i + 1, end: i + 1 + angled[1]!.length }] });
        i += angled[0].length;
        textStart = i;
        continue;
      }
    }

    if (ch === "@" && (!prev || !/[\w.@/]/.test(prev))) {
      const mention = MENTION.exec(rest);
      if (mention) {
        flush(i);
        out.push({ kind: "mention", login: mention[1]!, start: i, end: i + mention[0].length });
        i += mention[0].length;
        textStart = i;
        continue;
      }
    }

    i++;
  }

  flush(end);
  return out;
}

export interface Span {
  start: number;
  end: number;
}

/** Splits [start, end) at every mark boundary so each piece is either fully inside one mark or outside all of them. */
export function segment<M extends Span>(start: number, end: number, marks: readonly M[]): { start: number; end: number; mark: M | null }[] {
  const pieces: { start: number; end: number; mark: M | null }[] = [];
  let cursor = start;
  for (const mark of marks) {
    if (mark.end <= cursor || mark.start >= end) continue;
    const from = Math.max(mark.start, cursor);
    if (from > cursor) pieces.push({ start: cursor, end: from, mark: null });
    const to = Math.min(mark.end, end);
    pieces.push({ start: from, end: to, mark });
    cursor = to;
  }
  if (cursor < end) pieces.push({ start: cursor, end, mark: null });
  return pieces;
}

/** Every span of the body that renders as text, in reading order. Syntax characters (backticks, brackets) fall between them. */
export function visibleSpans(blocks: Block[]): Span[] {
  const inline = (nodes: Inline[]): Span[] =>
    nodes.flatMap((n) => {
      switch (n.kind) {
        case "text":
        case "code":
        case "mention":
          return [{ start: n.start, end: n.end }];
        case "break":
          return [];
        default:
          return inline(n.children);
      }
    });
  return blocks.flatMap((b) => {
    switch (b.kind) {
      case "paragraph":
      case "heading":
        return inline(b.children);
      case "quote":
        return b.lines.flatMap(inline);
      case "list":
        return b.items.flatMap((it) => inline(it.children));
      case "code":
        return [{ start: b.start, end: b.end }];
      case "rule":
        return [];
    }
  });
}

/**
 * Where a mark's pin goes: its first visible character. A quote can start on syntax that never renders, such as the
 * backtick of a code span, so the pin can't simply sit at the mark's start. Null when nothing in the mark is visible.
 */
export function firstVisible(spans: readonly Span[], mark: Span): number | null {
  for (const span of spans) {
    const from = Math.max(span.start, mark.start);
    if (from < Math.min(span.end, mark.end)) return from;
  }
  return null;
}

/** The visible text of a parsed body, for tests and accessible summaries. */
export function plainText(body: string, blocks: Block[]): string {
  const inline = (nodes: Inline[]): string =>
    nodes
      .map((n) => {
        switch (n.kind) {
          case "text":
          case "code":
          case "mention":
            return body.slice(n.start, n.end);
          case "break":
            return "\n";
          default:
            return inline(n.children);
        }
      })
      .join("");
  return blocks
    .map((b) => {
      switch (b.kind) {
        case "paragraph":
        case "heading":
          return inline(b.children);
        case "quote":
          return b.lines.map(inline).join("\n");
        case "list":
          return b.items.map((it) => inline(it.children)).join("\n");
        case "code":
          return body.slice(b.start, b.end);
        case "rule":
          return "";
      }
    })
    .join("\n\n");
}
