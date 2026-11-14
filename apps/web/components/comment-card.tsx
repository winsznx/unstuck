import { Fragment, type ReactNode } from "react";
import { day } from "@/lib/format";
import { firstVisible, parseComment, segment, visibleSpans, type Block, type Inline, type Span } from "@/lib/markdown";
import { PunchTag, type TagVerdict } from "./tag";

export interface CommentMark {
  start: number;
  length: number;
  verdict: TagVerdict;
  note?: ReactNode;
  /** Number shown on the pin and tag. Defaults to the mark's position in the comment. */
  n?: number;
}

interface PlacedMark {
  start: number;
  end: number;
  verdict: TagVerdict;
  n: number;
  note?: ReactNode;
}

interface PinnedMark extends PlacedMark {
  /** The first visible character, where the pin is drawn. */
  pinAt: number | null;
}

const pinMarks = (marks: PlacedMark[], spans: readonly Span[]): PinnedMark[] =>
  marks.map((mark) => ({ ...mark, pinAt: firstVisible(spans, mark) }));

function placeMarks(marks: CommentMark[]): PlacedMark[] {
  const sorted = [...marks].sort((a, b) => a.start - b.start);
  const placed: PlacedMark[] = [];
  for (const mark of sorted) {
    const previous = placed[placed.length - 1];
    if (previous && mark.start < previous.end) continue;
    placed.push({
      start: mark.start,
      end: mark.start + mark.length,
      verdict: mark.verdict,
      n: mark.n ?? placed.length + 1,
      ...(mark.note ? { note: mark.note } : {}),
    });
  }
  return placed;
}

const SAFE_HREF = /^(https?:\/\/|#|\/)/;

function CommentText({ body, start, end, marks }: { body: string; start: number; end: number; marks: PinnedMark[] }) {
  return (
    <>
      {segment(start, end, marks).map((piece) =>
        piece.mark ? (
          <mark key={piece.start} className="ask-mark" data-verdict={piece.mark.verdict}>
            {piece.start === piece.mark.pinAt && (
              <>
                <span className="ask-pin" data-verdict={piece.mark.verdict} aria-hidden>
                  {piece.mark.n}
                </span>
                <span className="sr-only">{`Ask ${piece.mark.n}: `}</span>
              </>
            )}
            {body.slice(piece.start, piece.end)}
          </mark>
        ) : (
          body.slice(piece.start, piece.end)
        ),
      )}
    </>
  );
}

/** `preview` renders links and mentions as plain text, for a cropped comment whose hidden links mustn't take focus. */
function Inlines({ body, nodes, marks, preview }: { body: string; nodes: Inline[]; marks: PinnedMark[]; preview: boolean }) {
  return (
    <>
      {nodes.map((node, i) => {
        switch (node.kind) {
          case "text":
            return <CommentText key={i} body={body} start={node.start} end={node.end} marks={marks} />;
          case "code":
            return (
              <code key={i}>
                <CommentText body={body} start={node.start} end={node.end} marks={marks} />
              </code>
            );
          case "mention":
            return preview ? (
              <span key={i} className="comment-mention">
                <CommentText body={body} start={node.start} end={node.end} marks={marks} />
              </span>
            ) : (
              <a key={i} className="comment-mention" href={`https://github.com/${node.login}`} rel="nofollow noreferrer">
                <CommentText body={body} start={node.start} end={node.end} marks={marks} />
              </a>
            );
          case "break":
            return <br key={i} />;
          case "strong":
            return (
              <strong key={i} className="font-semibold">
                <Inlines body={body} nodes={node.children} marks={marks} preview={preview} />
              </strong>
            );
          case "em":
            return (
              <em key={i}>
                <Inlines body={body} nodes={node.children} marks={marks} preview={preview} />
              </em>
            );
          case "strike":
            return (
              <s key={i}>
                <Inlines body={body} nodes={node.children} marks={marks} preview={preview} />
              </s>
            );
          case "link": {
            const text = node.children.length ? <Inlines body={body} nodes={node.children} marks={marks} preview={preview} /> : "image";
            if (preview) return <Fragment key={i}>{text}</Fragment>;
            return SAFE_HREF.test(node.href) ? (
              <a key={i} href={node.href} rel="nofollow noreferrer ugc">
                {text}
              </a>
            ) : (
              <Inlines key={i} body={body} nodes={node.children} marks={marks} preview={false} />
            );
          }
        }
      })}
    </>
  );
}

function Blocks({ body, blocks, marks, preview }: { body: string; blocks: Block[]; marks: PinnedMark[]; preview: boolean }) {
  return (
    <>
      {blocks.map((block, i) => {
        switch (block.kind) {
          case "paragraph":
            return (
              <p key={i}>
                <Inlines body={body} nodes={block.children} marks={marks} preview={preview} />
              </p>
            );
          case "heading":
            return (
              <h3 key={i}>
                <Inlines body={body} nodes={block.children} marks={marks} preview={preview} />
              </h3>
            );
          case "quote":
            return (
              <blockquote key={i}>
                {block.lines.map((line, j) => (
                  <span key={j} className="block">
                    <Inlines body={body} nodes={line} marks={marks} preview={preview} />
                  </span>
                ))}
              </blockquote>
            );
          case "code":
            return (
              <pre key={i}>
                <code>
                  <CommentText body={body} start={block.start} end={block.end} marks={marks} />
                </code>
              </pre>
            );
          case "rule":
            return <hr key={i} />;
          case "list": {
            const items = block.items.map((item, j) => (
              <li key={j} style={item.depth ? { marginLeft: `${item.depth * 1.25}em` } : undefined}>
                {item.task && (
                  <span aria-label={item.task === "done" ? "Done:" : "To do:"} className="mr-1.5 font-sans text-small">
                    {item.task === "done" ? "☑" : "☐"}
                  </span>
                )}
                <Inlines body={body} nodes={item.children} marks={marks} preview={preview} />
              </li>
            ));
            return block.ordered ? (
              <ol key={i} start={block.startAt}>
                {items}
              </ol>
            ) : (
              <ul key={i}>{items}</ul>
            );
          }
        }
      })}
    </>
  );
}

/**
 * The reviewer's comment, rendered from GitHub markdown with each ask struck on its exact characters. `preview` keeps
 * its links and mentions as plain text, for a comment cut to its first lines.
 */
export function RichComment({
  body,
  marks = [],
  preview = false,
  className = "",
}: {
  body: string;
  marks?: CommentMark[];
  preview?: boolean;
  className?: string;
}) {
  const blocks = parseComment(body);
  return (
    <div className={`comment-prose ${className}`}>
      <Blocks body={body} blocks={blocks} marks={pinMarks(placeMarks(marks), visibleSpans(blocks))} preview={preview} />
    </div>
  );
}

function initials(login: string): string {
  const parts = login.replace(/[^A-Za-z0-9]+/g, " ").trim().split(" ");
  return ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")).toUpperCase();
}

/**
 * A cropped body sits on its bottom edge, so its last lines stay in view, and never gets shorter than three lines.
 * How its cut top fades is .comment-cut's (app/globals.css).
 */
const CROPPED_BODY = "comment-cut min-h-[calc(var(--text-comment)*var(--text-comment--line-height)*3+var(--spacing)*10)]";

export function CommentCard({
  author,
  createdAt,
  url,
  body,
  marks,
  caption,
  source,
  list = false,
  clampOnSmall = false,
  preview = false,
  crop = false,
  className = "",
}: {
  author: string;
  createdAt?: string | Date | null;
  url: string;
  body: string;
  marks: CommentMark[];
  caption?: ReactNode;
  /** Where the comment lives, for example the program name. Shown in the header. */
  source?: ReactNode;
  /** Show the numbered punch list under the comment even for asks without a note. */
  list?: boolean;
  /** On phones, cut a long comment to its first screen and link to the rest on GitHub. */
  clampOnSmall?: boolean;
  /** The body is cut to its first lines, so its links stay plain text and On GitHub is the way to the rest. */
  preview?: boolean;
  /**
   * The card is a column that gives up body height to fit a parent's height or its own max-h, keeping the body's last
   * lines. Pair it with `preview`, since links cut off at the top can't take focus.
   */
  crop?: boolean;
  className?: string;
}) {
  const placed = placeMarks(marks);
  const rows = list ? placed : placed.filter((m) => m.note);
  const bodyBox = clampOnSmall ? "relative max-sm:max-h-[26rem] max-sm:overflow-hidden" : crop ? "flex min-h-0 flex-col" : undefined;

  return (
    <figure className={`m-0 min-w-0 overflow-hidden rounded-sheet border border-border bg-surface shadow-sheet ${crop ? "flex min-h-0 flex-col " : ""}${className}`}>
      <header className="flex items-center gap-3 border-b border-border bg-surface-muted px-5 py-3">
        <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-ink text-tag font-bold text-on-action">
          {initials(author)}
        </span>
        <p className="min-w-0 flex-1 text-small leading-tight text-ink-secondary">
          <span className="font-semibold text-ink">{author}</span> commented{createdAt ? ` on ${day(createdAt)}` : ""}
          {source && <span className="block text-pretty text-ink-muted">{source}</span>}
        </p>
        <a
          className="-my-3 inline-flex min-h-11 shrink-0 items-center text-small font-medium text-ink-secondary underline-offset-4 hover:text-ink hover:underline"
          href={url}
          rel="nofollow noreferrer"
        >
          On GitHub
        </a>
      </header>
      <div className={bodyBox}>
        <blockquote cite={url} className={`m-0 px-5 py-5 sm:px-6${crop ? ` ${CROPPED_BODY}` : ""}`}>
          <RichComment body={body} marks={marks} preview={preview} />
        </blockquote>
        {clampOnSmall && (
          <p className="absolute inset-x-0 bottom-0 flex h-24 items-end bg-linear-to-t from-surface from-45% to-transparent px-5 pb-4 sm:hidden">
            <a className="text-small font-semibold underline underline-offset-4" href={url} rel="nofollow noreferrer">
              Read the whole comment on GitHub
            </a>
          </p>
        )}
      </div>
      {rows.length > 0 && (
        <ol aria-label="Punch list" className="divide-y divide-border border-t border-border">
          {rows.map((mark) => (
            <li key={mark.n} className="space-y-3 px-5 py-4 sm:px-6">
              <PunchTag verdict={mark.verdict} n={mark.n} />
              {mark.note}
            </li>
          ))}
        </ol>
      )}
      {caption && <figcaption className="border-t border-border px-5 py-3 text-small text-ink-muted sm:px-6">{caption}</figcaption>}
    </figure>
  );
}
