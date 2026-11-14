import { describe, expect, it } from "vitest";
import { firstVisible, parseComment, parseInline, plainText, segment, visibleSpans, type Inline } from "./markdown";

const CANTON = [
  "A Major Gap I have seen in evidence is it has missing information for self verification by commitee. @Eunoia-cym",
  "",
  "For everyone's ref, since repos are not given here, I am giving them here:",
  "- docs: https://github.com/ChainSafe/canton-erc20/tree/main/docs",
  "- Metamask snap: https://github.com/ChainSafe/canton-snap",
].join("\n");

const textOf = (body: string, nodes: Inline[]) => plainText(body, [{ kind: "paragraph", children: nodes }]);

describe("parseComment", () => {
  it("splits paragraphs and a dash list that follows a paragraph line", () => {
    const blocks = parseComment(CANTON);
    expect(blocks.map((b) => b.kind)).toEqual(["paragraph", "paragraph", "list"]);
    const list = blocks[2]!;
    if (list.kind !== "list") throw new Error("expected list");
    expect(list.items).toHaveLength(2);
    expect(textOf(CANTON, list.items[0]!.children)).toBe("docs: https://github.com/ChainSafe/canton-erc20/tree/main/docs");
  });

  it("turns bare URLs and mentions into links without changing their offsets", () => {
    const [first] = parseComment(CANTON);
    if (first?.kind !== "paragraph") throw new Error("expected paragraph");
    const mention = first.children.find((n) => n.kind === "mention");
    expect(mention).toMatchObject({ kind: "mention", login: "Eunoia-cym" });
    if (mention?.kind !== "mention") throw new Error("expected mention");
    expect(CANTON.slice(mention.start, mention.end)).toBe("@Eunoia-cym");

    const list = parseComment(CANTON)[2];
    if (list?.kind !== "list") throw new Error("expected list");
    const link = list.items[0]!.children.find((n) => n.kind === "link");
    expect(link).toMatchObject({ href: "https://github.com/ChainSafe/canton-erc20/tree/main/docs" });
  });

  it("keeps every visible character addressable in the original body", () => {
    const body = "Run `pnpm test` and **fix** the [docs](https://x.dev/a).\n\n```sh\nnpm run build\n```\n\n> quoted line\n\n1. first\n2. [x] second";
    const blocks = parseComment(body);
    expect(blocks.map((b) => b.kind)).toEqual(["paragraph", "code", "quote", "list"]);
    expect(plainText(body, blocks)).toBe("Run pnpm test and fix the docs.\n\nnpm run build\n\nquoted line\n\nfirst\nsecond");
    const list = blocks[3];
    if (list?.kind !== "list") throw new Error("expected list");
    expect(list.ordered).toBe(true);
    expect(list.items[1]!.task).toBe("done");
  });

  it("strips trailing punctuation from bare URLs", () => {
    const body = "See https://example.com/a.";
    const nodes = parseInline(body, 0, body.length);
    expect(nodes.at(-2)).toMatchObject({ kind: "link", href: "https://example.com/a" });
    expect(textOf(body, nodes)).toBe(body);
  });

  it("leaves snake_case and lone asterisks alone", () => {
    const body = "set max_retry_count to 3 * 2";
    expect(parseInline(body, 0, body.length)).toEqual([{ kind: "text", start: 0, end: body.length }]);
  });

  it("does not treat emails as mentions", () => {
    const body = "mail dev@example.com";
    expect(parseInline(body, 0, body.length).some((n) => n.kind === "mention")).toBe(false);
  });

  it("handles headings, rules and an unclosed fence", () => {
    const body = "## Evaluation\n\n---\n\n```\nnever closed";
    expect(parseComment(body).map((b) => b.kind)).toEqual(["heading", "rule", "code"]);
    expect(plainText(body, parseComment(body))).toBe("Evaluation\n\n\n\nnever closed");
  });
});

describe("segment", () => {
  const marks = [
    { start: 5, end: 10, id: "a" },
    { start: 12, end: 20, id: "b" },
  ];

  it("splits a text run at mark boundaries", () => {
    expect(segment(0, 15, marks).map((p) => [p.start, p.end, p.mark?.id ?? null])).toEqual([
      [0, 5, null],
      [5, 10, "a"],
      [10, 12, null],
      [12, 15, "b"],
    ]);
  });

  it("clips a mark that started in an earlier run", () => {
    expect(segment(15, 25, marks).map((p) => [p.start, p.end, p.mark?.id ?? null])).toEqual([
      [15, 20, "b"],
      [20, 25, null],
    ]);
  });
});

describe("firstVisible", () => {
  it("puts the pin on the first character inside a code span when the quote starts on its backtick", () => {
    // #given an ask quoted from the opening backtick, the way sentence picking stores it
    const body = "Please make `pnpm test` pass before the next review.";
    const mark = { start: body.indexOf("`"), end: body.indexOf(".") + 1 };
    // #when
    const pinAt = firstVisible(visibleSpans(parseComment(body)), mark);
    // #then the backtick never renders, so the pin goes on the "p" of pnpm
    expect(pinAt).toBe(body.indexOf("pnpm"));
  });

  it("keeps the pin at the mark's start when that character is visible", () => {
    const body = "Add a hosted docs page. Thanks!";
    expect(firstVisible(visibleSpans(parseComment(body)), { start: 0, end: 22 })).toBe(0);
  });

  it("returns null when nothing in the mark renders", () => {
    const body = "Run `x` now";
    const tick = body.indexOf("`");
    expect(firstVisible(visibleSpans(parseComment(body)), { start: tick, end: tick + 1 })).toBeNull();
  });
});
