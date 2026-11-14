import { sentencesOf, type Sentence } from "@unstuck/pipeline/sentences";
import { Button } from "@/components/button";
import { CommentCard, RichComment } from "@/components/comment-card";
import { PunchTag } from "@/components/tag";
import type { ThreadComment } from "./actions";
import type { PickedAsk } from "./flow-state";
import { StepActions } from "./ui";

export function AsksStep({
  comment,
  asks,
  onToggle,
  onNext,
  onBack,
}: {
  comment: ThreadComment;
  asks: PickedAsk[];
  onToggle: (sentence: Sentence) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const sentences = sentencesOf(comment.body);
  const picked = new Map(asks.map((a, i) => [a.start, i + 1]));

  return (
    <>
      <CommentCard
        author={comment.author}
        createdAt={comment.createdAt}
        url={comment.url}
        body={comment.body}
        marks={asks.map((a, i) => ({ start: a.start, length: a.text.length, verdict: "open", n: i + 1 }))}
        clampOnSmall
        className="shadow-none"
      />

      {sentences.length === 0 ? (
        <p className="mt-6 rounded-panel bg-surface-muted px-4 py-3">
          This comment has no full sentences to pick, only links or short notes. Go back to step 1 and pick the comment where your reviewer says what&apos;s
          missing.
        </p>
      ) : (
        <fieldset className="mt-8">
          <legend className="font-semibold">Which of these sentences ask for something?</legend>
          <p className="mt-1 text-small text-ink-secondary">
            Skip greetings, context and lists of links. Each one you pick is marked in the comment above and kept word for word. It&apos;s checked against
            GitHub again before the run.
          </p>
          <ul className="mt-4 space-y-2">
            {sentences.map((s) => {
              const n = picked.get(s.start);
              const on = n !== undefined;
              return (
                <li key={s.start}>
                  <label
                    className={`flex cursor-pointer items-start gap-3 rounded-panel border px-4 py-3 transition-colors duration-(--duration-fast) ${on ? "border-open-edge bg-open-soft" : "border-border bg-surface hover:border-border-strong"}`}
                  >
                    <input type="checkbox" className="mt-1.5 size-4 shrink-0" checked={on} onChange={() => onToggle(s)} />
                    <span className="min-w-0 flex-1">
                      {on && (
                        <span className="mb-1.5 block sm:hidden">
                          <PunchTag verdict="open" n={n} />
                        </span>
                      )}
                      <RichComment body={s.text} className="text-body leading-relaxed" />
                    </span>
                    {on && (
                      <span className="mt-0.5 hidden shrink-0 sm:block">
                        <PunchTag verdict="open" n={n} />
                      </span>
                    )}
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>
      )}

      <StepActions
        note={asks.length ? `${asks.length} ${asks.length === 1 ? "ask" : "asks"} picked. Each one gets its own check next.` : "Pick at least one sentence."}
        back={
          <Button type="button" variant="quiet" onClick={onBack}>
            Back
          </Button>
        }
      >
        <Button type="button" disabled={asks.length === 0} onClick={onNext}>
          {asks.length > 1 ? `Use these ${asks.length} asks` : "Use this ask"}
        </Button>
      </StepActions>
    </>
  );
}
