import { sentencesOf, type Sentence } from "@unstuck/pipeline/sentences";
import { Button } from "@/components/button";
import { CommentCard, RichComment } from "@/components/comment-card";
import { PunchTag } from "@/components/tag";
import type { ThreadComment } from "./actions";
import type { AskHelp, PickedAsk } from "./flow-state";
import { StepActions } from "./ui";

export function AsksStep({
  comment,
  asks,
  help,
  onToggle,
  onNext,
  onBack,
}: {
  comment: ThreadComment;
  asks: PickedAsk[];
  help: AskHelp | null;
  onToggle: (sentence: Sentence) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const sentences = sentencesOf(comment.body);
  const picked = new Map(asks.map((a, i) => [a.start, i + 1]));
  const reasons = new Map(help?.status === "ready" ? help.asks.map((a) => [a.start, a.reason]) : []);

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
          <NearAiNote help={help} />
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
                      {reasons.has(s.start) && (
                        <span className="mt-1.5 block text-small text-ink-secondary">
                          <span className="font-medium text-ink">NEAR AI:</span> {reasons.get(s.start)}
                        </span>
                      )}
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

function NearAiNote({ help }: { help: AskHelp | null }) {
  if (!help || help.status === "off") return null;
  const text =
    help.status === "loading"
      ? "NEAR AI is reading the comment for asks. You can start picking while it works."
      : help.status === "failed"
        ? help.error
        : help.asks.length === 0
          ? "NEAR AI found no asks in this comment. Pick any it missed."
          : help.asks.length === 1
            ? "NEAR AI suggested 1 ask, marked below. Untick it if it isn't one, and tick any it missed."
            : `NEAR AI suggested ${help.asks.length} asks, marked below. Untick any that aren't asks, and tick any it missed.`;
  return (
    <p role="status" aria-live="polite" className="mt-4 rounded-panel bg-surface-muted px-4 py-3 text-small text-ink-secondary">
      {text}
      {help.status === "ready" && <span className="block text-ink-muted">Model: {help.model}, on NEAR AI Cloud. It only picks from these sentences, word for word.</span>}
    </p>
  );
}
