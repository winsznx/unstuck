import type { MilestoneView } from "@/lib/queries";
import { CommentCard, type CommentMark } from "./comment-card";
import { LogPanel } from "./log-panel";
import { programOf } from "@/lib/programs";
import { tagFor } from "./tag";

export function marksFor(view: MilestoneView, withNotes: boolean): CommentMark[] {
  return view.asks
    .map((ask, i) => ({ ask, n: i + 1 }))
    .filter(({ ask }) => ask.quoteStart !== null)
    .map(({ ask, n }) => ({
      n,
      start: ask.quoteStart ?? 0,
      length: ask.quote.length,
      verdict: tagFor(ask.verdict),
      ...(withNotes && ask.failure
        ? {
            note: (
              <div className="space-y-2">
                <p className="text-small text-ink-secondary">
                  Step {ask.failure.step}, {ask.failure.name}, {ask.failure.timedOut ? "ran out of time" : `exited ${ask.failure.exitCode}`}:
                </p>
                <LogPanel output={ask.failure.line ?? ""} highlight={ask.failure.line} label={`Failing line from step ${ask.failure.step}`} />
              </div>
            ),
          }
        : {}),
    }));
}

export function MilestoneComment({ view, withNotes = false, caption }: { view: MilestoneView; withNotes?: boolean; caption?: React.ReactNode }) {
  const { milestone } = view;
  return (
    <CommentCard
      author={milestone.reviewerLogin ?? "reviewer"}
      createdAt={milestone.reviewerCommentAt}
      url={milestone.reviewerCommentUrl ?? milestone.threadUrl}
      body={milestone.reviewerCommentBody ?? ""}
      marks={marksFor(view, withNotes)}
      caption={caption}
      source={programOf(milestone.threadRepo)}
    />
  );
}
