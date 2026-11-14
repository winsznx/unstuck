import { useState } from "react";
import { Button } from "@/components/button";
import { RichComment } from "@/components/comment-card";
import { day } from "@/lib/format";
import type { ThreadComment, ThreadRead } from "./actions";
import { parseLink } from "./link";
import { Hint, inputCls, Problem, Reading, StepActions } from "./ui";

export const EXAMPLE_URL = "https://github.com/canton-foundation/canton-dev-fund/issues/887#issuecomment-6312277707";

const ROLE: Record<string, string> = {
  OWNER: "Owns the repo",
  MEMBER: "Member of the org",
  COLLABORATOR: "Collaborator",
  CONTRIBUTOR: "Contributor",
};

function suggestedWhy(thread: ThreadRead): string {
  return thread.suggestedBecause === "link"
    ? "Suggested because your link points to it."
    : `Suggested because it's the latest comment from someone other than ${thread.author}, who opened the thread.`;
}

function CommentChoice({ comment, thread, picked, onPick }: { comment: ThreadComment; thread: ThreadRead; picked: boolean; onPick: () => void }) {
  const [open, setOpen] = useState(false);
  const suggested = comment.id === thread.suggestedCommentId;
  const long = comment.body.length > 420;
  return (
    <li className={`rounded-panel border bg-surface transition-colors duration-(--duration-fast) ${picked ? "border-ink ring-1 ring-ink" : "border-border hover:border-border-strong"}`}>
      <label className="flex cursor-pointer items-start gap-3 px-4 pt-3.5">
        <input type="radio" name="comment" className="mt-1 size-4 shrink-0" checked={picked} onChange={onPick} />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-small">
            <span className="font-semibold text-ink">{comment.author}</span>
            {ROLE[comment.association] && <span className="text-ink-secondary">{ROLE[comment.association]}</span>}
            <span className="text-ink-muted">
              {comment.kind === "review" ? "reviewed" : "commented"} on {day(comment.createdAt)}
            </span>
          </span>
          {suggested && <span className="mt-1 block text-small text-ink-secondary">{suggestedWhy(thread)}</span>}
        </span>
      </label>
      <div className={`relative px-4 pt-2 pb-3.5 pl-11 ${long && !open ? "max-h-44 overflow-hidden" : ""}`}>
        <RichComment body={comment.body} className="text-body text-ink-secondary" />
        {long && !open && <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-surface to-transparent" />}
      </div>
      {long && (
        <div className="border-t border-border px-4 py-2 pl-11">
          <button type="button" className="text-small font-medium text-ink-secondary underline-offset-4 hover:text-ink hover:underline" onClick={() => setOpen(!open)} aria-expanded={open}>
            {open ? "Show less" : "Read the whole comment"}
          </button>
        </div>
      )}
    </li>
  );
}

export function CommentStep({
  initialUrl,
  thread,
  commentId,
  pending,
  error,
  onRead,
  onPick,
}: {
  initialUrl: string;
  thread: ThreadRead | null;
  commentId: string | null;
  pending: boolean;
  error: string | null;
  onRead: (url: string) => void;
  onPick: (id: string) => void;
}) {
  const [url, setUrl] = useState(initialUrl || thread?.threadUrl || "");
  const [picked, setPicked] = useState(commentId);
  const [showAll, setShowAll] = useState(false);
  const target = parseLink(url);

  const ordered = thread
    ? [
        ...thread.comments.filter((c) => c.id === thread.suggestedCommentId),
        ...[...thread.comments].reverse().filter((c) => c.id !== thread.suggestedCommentId),
      ]
    : [];
  const shown = showAll ? ordered : ordered.slice(0, 4);

  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onRead(url.trim());
        }}
      >
        <label htmlFor="thread-url" className="font-semibold">
          Link to your reviewer&apos;s comment
        </label>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <input
            id="thread-url"
            type="url"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://github.com/org/repo/issues/12#issuecomment-…"
            aria-invalid={Boolean(error && !thread)}
            aria-describedby="thread-url-hint"
            className={inputCls}
          />
          <Button type="submit" variant={thread ? "secondary" : "primary"} disabled={pending || !url.trim()} aria-busy={pending} className="shrink-0">
            {pending ? "Reading the thread" : thread ? "Read again" : "Read the thread"}
          </Button>
        </div>
        <p id="thread-url-hint" className="mt-2 text-small text-ink-secondary">
          {target
            ? `${target.kind === "pull" ? "Pull request" : "Issue"} #${target.number} in ${target.repo}${target.comment ? ", one comment linked" : ""}.`
            : "A GitHub issue or pull request. On GitHub, open the comment's menu and choose Copy link."}
        </p>
      </form>

      {!thread && !pending && !error && (
        <div className="mt-6 rounded-panel border border-dashed border-border-strong px-4 py-4">
          <p className="font-semibold">No link to hand?</p>
          <p className="mt-1 text-ink-secondary">
            Try a real review from the Canton Dev Fund, where a reviewer asked for one hosted docs page before releasing the milestone.
          </p>
          <Button
            type="button"
            variant="secondary"
            className="mt-3"
            onClick={() => {
              setUrl(EXAMPLE_URL);
              onRead(EXAMPLE_URL);
            }}
          >
            Use the Canton #887 review
          </Button>
        </div>
      )}

      {pending && (
        <div className="mt-6">
          <Reading
            label={target ? `Reading ${target.repo}#${target.number} from GitHub` : "Reading the thread from GitHub"}
            lines={["The opening post and its title", "Every comment and review, oldest first", "Repos linked anywhere in the thread"]}
          />
        </div>
      )}

      {error && !pending && (
        <div className="mt-6">
          <Problem title="The thread wasn't read">{error}</Problem>
        </div>
      )}

      {thread && !pending && (
        <div className="mt-8">
          <div className="rounded-panel bg-surface-muted px-4 py-3.5">
            <p className="text-small text-ink-secondary">
              {thread.kind === "pull" ? "Pull request" : "Issue"} in {thread.repo}, opened by {thread.author}, {thread.state}
            </p>
            <p className="mt-0.5 font-semibold wrap-anywhere">{thread.title}</p>
            <p className="mt-1 text-small text-ink-secondary">
              {thread.comments.length === 0
                ? "No comments yet."
                : `${thread.comments.length} ${thread.comments.length === 1 ? "comment" : "comments"} from ${new Set(thread.comments.map((c) => c.author)).size} people. Bots are left out.`}
            </p>
          </div>

          {thread.comments.length === 0 ? (
            <div className="mt-4">
              <Problem title="Nobody has commented on this thread yet">
                UNSTUCK needs the comment that&apos;s holding your payment. Paste the link to the thread where your reviewer wrote back.
              </Problem>
            </div>
          ) : (
            <fieldset className="mt-6">
              <legend className="font-semibold">Which comment is holding your payment?</legend>
              <Hint>Pick the one where your reviewer says what&apos;s missing. You choose the exact sentences in step 3.</Hint>
              <ul className="mt-4 space-y-3">
                {shown.map((c) => (
                  <CommentChoice key={c.id} comment={c} thread={thread} picked={picked === c.id} onPick={() => setPicked(c.id)} />
                ))}
              </ul>
              {ordered.length > shown.length && (
                <Button type="button" variant="quiet" className="mt-3" onClick={() => setShowAll(true)}>
                  Show {ordered.length - shown.length} more {ordered.length - shown.length === 1 ? "comment" : "comments"}
                </Button>
              )}
            </fieldset>
          )}
        </div>
      )}

      {thread && thread.comments.length > 0 && (
        <StepActions note={picked ? `${thread.comments.find((c) => c.id === picked)?.author}'s comment picked` : "Pick a comment to go on"}>
          <Button type="button" disabled={!picked || pending} onClick={() => picked && onPick(picked)}>
            Use this comment
          </Button>
        </StepActions>
      )}
    </>
  );
}
